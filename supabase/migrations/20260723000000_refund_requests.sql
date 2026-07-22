-- Refund requests — creator asks, super_admin approves (2026-07-23)
-- Creators no longer self-serve refunds. A request FREEZES the clawback immediately
-- (reconcile-safe via wallet_frozen_logs, exactly like begin_refund) and waits for a
-- super_admin. Approval runs the existing refund engine (begin_refund → Cashfree) and
-- releases the request-time hold; rejection releases the hold. Idempotent DDL.

-- ── 1. refund_requests ───────────────────────────────────────────────────────
create table if not exists public.refund_requests (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id),
  creator_id    uuid not null references public.profiles(id),
  amount        numeric not null check (amount > 0),      -- resolved refund amount
  fee_reversed  numeric not null default 0 check (fee_reversed >= 0),
  net_clawback  numeric not null check (net_clawback >= 0),
  reason        text not null,                            -- why the creator wants the refund (required)
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  frozen_log_id uuid references public.wallet_frozen_logs(id),  -- the request-time hold
  refund_id     uuid references public.refunds(id),       -- set on approval
  review_reason text,                                     -- admin note (typically on reject)
  reviewed_by   uuid,                                     -- admin auth user id (audit)
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_refund_requests_creator on public.refund_requests (creator_id, created_at desc);
create index if not exists idx_refund_requests_status  on public.refund_requests (status) where status = 'pending';
create index if not exists idx_refund_requests_order   on public.refund_requests (order_id);
-- One in-flight request per order — DB-level double-submit dedupe.
create unique index if not exists uq_refund_requests_one_pending_per_order
  on public.refund_requests (order_id) where status = 'pending';

alter table public.refund_requests enable row level security;
drop policy if exists refund_requests_select_own on public.refund_requests;
create policy refund_requests_select_own on public.refund_requests
  for select to authenticated
  using (creator_id = (select public.current_profile_id()) or (select public.is_super_admin()));
-- No INSERT/UPDATE/DELETE policies: writes go through the service-role RPCs below.

-- ── 2. create_refund_request() — validate → freeze → record (atomic) ─────────
-- Mirrors begin_refund's validation + freeze, but does NOT create a refunds row or
-- touch the gateway. The clawback is held now; the actual refund is created later at
-- admin approval. Raises 'refundreq:*' markers the route maps to HTTP codes.
create or replace function public.create_refund_request(
  p_order_id uuid,
  p_amount numeric default null,   -- null = full remaining
  p_reason text default null,
  p_creator_id uuid default null   -- requesting creator; must own the order
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_fee numeric;
  v_prior_amount numeric;
  v_prior_fee numeric;
  v_remaining numeric;
  v_amount numeric;
  v_fee_reversed numeric;
  v_net numeric;
  v_req_id uuid := gen_random_uuid();
  v_log_id uuid;
begin
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'refundreq:reason_required';
  end if;

  select id, creator_id, total_amount, status, gateway_order_id, gateway_payment_id
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if v_order.id is null then raise exception 'refundreq:order_not_found'; end if;
  if p_creator_id is not null and v_order.creator_id <> p_creator_id then raise exception 'refundreq:not_owner'; end if;
  if v_order.status <> 'completed' then raise exception 'refundreq:order_not_completed'; end if;
  if v_order.gateway_payment_id is null or v_order.gateway_order_id is null then raise exception 'refundreq:order_not_paid'; end if;
  if v_order.creator_id is null then raise exception 'refundreq:order_missing_creator'; end if;

  if exists (select 1 from public.refund_requests where order_id = p_order_id and status = 'pending') then
    raise exception 'refundreq:already_pending';
  end if;
  if exists (select 1 from public.refunds where order_id = p_order_id and status = 'processing') then
    raise exception 'refundreq:refund_in_flight';
  end if;

  select (meta->>'platform_fee')::numeric into v_fee
    from public.transaction_ledger
   where order_id = p_order_id and tx_type = 'sale' and direction = 'credit'
   order by created_at asc
   limit 1;
  if v_fee is null then raise exception 'refundreq:sale_ledger_missing'; end if;

  select coalesce(sum(amount), 0), coalesce(sum(fee_reversed), 0)
    into v_prior_amount, v_prior_fee
    from public.refunds
   where order_id = p_order_id and status in ('processing','success');

  v_remaining := v_order.total_amount - v_prior_amount;
  v_amount := coalesce(p_amount, v_remaining);
  if v_amount < 1 then raise exception 'refundreq:amount_too_small'; end if;
  if v_amount > v_remaining then raise exception 'refundreq:over_refund'; end if;

  if v_prior_amount + v_amount = v_order.total_amount then
    v_fee_reversed := v_fee - v_prior_fee;   -- completing refund zeroes the fee exactly
  else
    v_fee_reversed := round(v_fee * v_amount / v_order.total_amount, 2);
  end if;
  if v_fee_reversed < 0 or v_fee_reversed > v_amount then raise exception 'refundreq:fee_split_anomaly'; end if;
  v_net := v_amount - v_fee_reversed;

  -- Freeze the clawback now (reconcile-safe: frozen_balance == sum(frozen logs)).
  insert into public.creator_balances
    (creator_id, total_earnings, total_platform_fees, total_paid_out, pending_payout, frozen_balance)
  values (v_order.creator_id, 0, 0, 0, 0, v_net)
  on conflict (creator_id) do update
    set frozen_balance = creator_balances.frozen_balance + excluded.frozen_balance;

  insert into public.wallet_frozen_logs
    (creator_id, amount, reason, status, source, created_by)
  values
    (v_order.creator_id, v_net, coalesce(p_reason, 'refund request hold'), 'frozen', 'refund', p_creator_id)
  returning id into v_log_id;

  insert into public.refund_requests
    (id, order_id, creator_id, amount, fee_reversed, net_clawback, reason, status, frozen_log_id)
  values
    (v_req_id, p_order_id, v_order.creator_id, v_amount, v_fee_reversed, v_net, p_reason, 'pending', v_log_id);

  return jsonb_build_object(
    'request_id', v_req_id,
    'amount', v_amount,
    'fee_reversed', v_fee_reversed,
    'net_clawback', v_net
  );
end;
$$;
revoke execute on function public.create_refund_request(uuid, numeric, text, uuid) from public, anon, authenticated;

-- ── 3. approve_refund_request() — release the request hold, link the refund ──
-- Called AFTER the route has run initiateRefund (which placed its own hold via
-- begin_refund). Releasing the request-time hold here leaves exactly the refund's
-- hold in place — never under-frozen. Claim on status='pending' makes it idempotent.
create or replace function public.approve_refund_request(
  p_request_id uuid,
  p_reviewer uuid,
  p_refund_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req record;
begin
  update public.refund_requests
     set status = 'approved', reviewed_by = p_reviewer, reviewed_at = now(), refund_id = p_refund_id
   where id = p_request_id and status = 'pending'
   returning creator_id, net_clawback, frozen_log_id into v_req;
  if v_req.creator_id is null then return false; end if;

  update public.wallet_frozen_logs
     set status = 'released', released_at = now(), release_note = 'refund request approved'
   where id = v_req.frozen_log_id and status = 'frozen';
  if found then
    update public.creator_balances
       set frozen_balance = frozen_balance - v_req.net_clawback
     where creator_id = v_req.creator_id;
  end if;
  return true;
end;
$$;
revoke execute on function public.approve_refund_request(uuid, uuid, uuid) from public, anon, authenticated;

-- ── 4. reject_refund_request() — release the hold, record the reason ─────────
create or replace function public.reject_refund_request(
  p_request_id uuid,
  p_reviewer uuid,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req record;
begin
  update public.refund_requests
     set status = 'rejected', reviewed_by = p_reviewer, reviewed_at = now(), review_reason = p_reason
   where id = p_request_id and status = 'pending'
   returning creator_id, net_clawback, frozen_log_id into v_req;
  if v_req.creator_id is null then return false; end if;

  update public.wallet_frozen_logs
     set status = 'released', released_at = now(),
         release_note = coalesce('rejected: ' || p_reason, 'refund request rejected')
   where id = v_req.frozen_log_id and status = 'frozen';
  if found then
    update public.creator_balances
       set frozen_balance = frozen_balance - v_req.net_clawback
     where creator_id = v_req.creator_id;
  end if;
  return true;
end;
$$;
revoke execute on function public.reject_refund_request(uuid, uuid, text) from public, anon, authenticated;
