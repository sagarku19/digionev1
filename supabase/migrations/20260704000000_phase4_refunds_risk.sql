-- Phase 4 — Refunds + frozen balance + risk controls (2026-07-04)
-- Spec: docs/superpowers/specs/2026-07-04-phase4-refunds-risk-design.md
-- Idempotent: safe to re-run. Apply live via the Supabase MCP, then regenerate types.

-- ── 1. refunds ──────────────────────────────────────────────────────────────
create table if not exists public.refunds (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders(id),
  creator_id         uuid not null references public.profiles(id),
  amount             numeric not null check (amount > 0),
  fee_reversed       numeric not null default 0 check (fee_reversed >= 0),
  net_clawback       numeric not null check (net_clawback >= 0),
  reason             text,
  status             text not null default 'processing'
                       check (status in ('processing','success','failed')),
  initiated_by       text not null check (initiated_by in ('creator','admin')),
  initiator_id       uuid,
  merchant_refund_id text not null unique,
  gateway_refund_id  text,
  gateway_metadata   jsonb,
  failure_reason     text,
  created_at         timestamptz not null default now(),
  processed_at       timestamptz
);
create index if not exists idx_refunds_creator    on public.refunds (creator_id, created_at desc);
create index if not exists idx_refunds_order      on public.refunds (order_id);
create index if not exists idx_refunds_processing on public.refunds (status) where status = 'processing';

alter table public.refunds enable row level security;
drop policy if exists refunds_select_own on public.refunds;
create policy refunds_select_own on public.refunds
  for select to authenticated
  using (creator_id = (select public.current_profile_id()) or (select public.is_super_admin()));
-- No INSERT/UPDATE/DELETE policies: writes are service-role only.

-- ── 2. wallet_frozen_logs ───────────────────────────────────────────────────
create table if not exists public.wallet_frozen_logs (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references public.profiles(id),
  amount       numeric not null check (amount > 0),
  reason       text not null,
  status       text not null default 'frozen' check (status in ('frozen','released')),
  source       text not null check (source in ('refund','dispute','manual')),
  refund_id    uuid references public.refunds(id),
  created_by   uuid,
  release_note text,
  released_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_frozen_logs_creator on public.wallet_frozen_logs (creator_id, status);

alter table public.wallet_frozen_logs enable row level security;
drop policy if exists wallet_frozen_logs_select_own on public.wallet_frozen_logs;
create policy wallet_frozen_logs_select_own on public.wallet_frozen_logs
  for select to authenticated
  using (creator_id = (select public.current_profile_id()) or (select public.is_super_admin()));

-- ── 3. creator_payouts status vocabulary += 'reversed' ─────────────────────
alter table public.creator_payouts drop constraint if exists creator_payouts_status_check;
alter table public.creator_payouts add constraint creator_payouts_status_check
  check (status in ('pending','processing','success','failed','reversed'));

-- ── 4. begin_refund() — atomic initiation: validate → insert → freeze ──────
-- Lock order: orders row FOR UPDATE serializes concurrent refunds per order AND
-- establishes the lock order (orders → creator_balances) shared with settle_refund
-- so the two can never deadlock. Raises 'refund:*' messages the app maps to HTTP codes.
create or replace function public.begin_refund(
  p_order_id uuid,
  p_amount numeric default null,        -- null = full remaining
  p_reason text default null,
  p_initiated_by text default 'admin',  -- 'creator' | 'admin'
  p_initiator_id uuid default null
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
  v_id uuid := gen_random_uuid();
  v_merchant text;
begin
  if p_initiated_by not in ('creator','admin') then
    raise exception 'refund:bad_initiator';
  end if;

  select id, creator_id, total_amount, status, gateway_order_id, gateway_payment_id
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if v_order.id is null then raise exception 'refund:order_not_found'; end if;
  if v_order.status <> 'completed' then raise exception 'refund:order_not_completed'; end if;
  if v_order.gateway_payment_id is null or v_order.gateway_order_id is null then
    raise exception 'refund:order_not_paid';
  end if;
  if v_order.creator_id is null then raise exception 'refund:order_missing_creator'; end if;

  -- Original platform fee from the sale ledger row — refuse to guess if absent.
  select (meta->>'platform_fee')::numeric into v_fee
    from public.transaction_ledger
   where order_id = p_order_id and tx_type = 'sale' and direction = 'credit'
   order by created_at asc
   limit 1;
  if v_fee is null then raise exception 'refund:sale_ledger_missing'; end if;

  select coalesce(sum(amount), 0), coalesce(sum(fee_reversed), 0)
    into v_prior_amount, v_prior_fee
    from public.refunds
   where order_id = p_order_id and status in ('processing','success');

  v_remaining := v_order.total_amount - v_prior_amount;
  v_amount := coalesce(p_amount, v_remaining);
  if v_amount < 1 then raise exception 'refund:amount_too_small'; end if;
  if v_amount > v_remaining then raise exception 'refund:over_refund'; end if;

  if v_prior_amount + v_amount = v_order.total_amount then
    v_fee_reversed := v_fee - v_prior_fee;   -- completing refund zeroes the fee exactly
  else
    v_fee_reversed := round(v_fee * v_amount / v_order.total_amount, 2);
  end if;
  if v_fee_reversed < 0 or v_fee_reversed > v_amount then
    raise exception 'refund:fee_split_anomaly';
  end if;
  v_net := v_amount - v_fee_reversed;

  v_merchant := 'rfnd_' || replace(v_id::text, '-', '');

  insert into public.refunds
    (id, order_id, creator_id, amount, fee_reversed, net_clawback,
     reason, status, initiated_by, initiator_id, merchant_refund_id)
  values
    (v_id, p_order_id, v_order.creator_id, v_amount, v_fee_reversed, v_net,
     p_reason, 'processing', p_initiated_by, p_initiator_id, v_merchant);

  insert into public.creator_balances
    (creator_id, total_earnings, total_platform_fees, total_paid_out, pending_payout, frozen_balance)
  values (v_order.creator_id, 0, 0, 0, 0, v_net)
  on conflict (creator_id) do update
    set frozen_balance = creator_balances.frozen_balance + excluded.frozen_balance;

  insert into public.wallet_frozen_logs
    (creator_id, amount, reason, status, source, refund_id, created_by)
  values
    (v_order.creator_id, v_net, coalesce(p_reason, 'refund clawback hold'),
     'frozen', 'refund', v_id, p_initiator_id);

  return jsonb_build_object(
    'refund_id', v_id,
    'merchant_refund_id', v_merchant,
    'gateway_order_id', v_order.gateway_order_id,
    'creator_id', v_order.creator_id,
    'amount', v_amount,
    'fee_reversed', v_fee_reversed,
    'net_clawback', v_net
  );
end;
$$;
revoke execute on function public.begin_refund(uuid, numeric, text, text, uuid) from public, anon, authenticated;

-- ── 5. settle_refund() — atomic finalization (mirror of settle_payout) ─────
-- Claim gates side effects; ledger record_hash UNIQUE is the second guard.
-- NO greatest(...,0) clamps: a CHECK violation here means corrupted books and must fail loudly.
-- Lock order acquired BEFORE the balance write (same orders → creator_balances order as begin_refund).
create or replace function public.settle_refund(
  p_refund_id uuid,
  p_terminal text,                      -- 'success' | 'failed'
  p_gateway_refund_id text default null,
  p_gateway_metadata jsonb default null,
  p_failure_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r record;
  v_total numeric;
  v_refunded numeric;
begin
  if p_terminal not in ('success','failed') then
    raise exception 'settle_refund: invalid terminal status %', p_terminal;
  end if;

  update public.refunds
     set status            = p_terminal,
         gateway_refund_id = coalesce(p_gateway_refund_id, gateway_refund_id),
         gateway_metadata  = coalesce(p_gateway_metadata, gateway_metadata),
         failure_reason    = case when p_terminal = 'failed' then p_failure_reason else failure_reason end,
         processed_at      = now()
   where id = p_refund_id
     and status = 'processing'
   returning id, order_id, creator_id, amount, fee_reversed, net_clawback into v_r;

  if v_r.id is null then
    return false;  -- already settled / not found → idempotent no-op
  end if;

  if p_terminal = 'success' then
    -- Lock the order row first (consistent lock order with begin_refund; also
    -- serializes two completing partials so the full-refund flip can't be missed).
    select total_amount into v_total
      from public.orders where id = v_r.order_id for update;

    update public.creator_balances
       set total_earnings      = total_earnings      - v_r.amount,
           total_platform_fees = total_platform_fees - v_r.fee_reversed,
           frozen_balance      = frozen_balance      - v_r.net_clawback
     where creator_id = v_r.creator_id;

    insert into public.transaction_ledger
      (creator_id, order_id, amount, direction, tx_type, currency, record_hash, meta)
    values
      (v_r.creator_id, v_r.order_id, v_r.amount, 'debit', 'refund', 'INR',
       convert_to(encode(sha256(convert_to('refund:' || p_refund_id::text, 'UTF8')), 'hex'), 'UTF8'),
       jsonb_build_object('refund_id', p_refund_id, 'fee_reversed', v_r.fee_reversed,
                          'net_clawback', v_r.net_clawback, 'gateway_refund_id', p_gateway_refund_id))
    on conflict (record_hash) do nothing;

    select coalesce(sum(amount), 0) into v_refunded
      from public.refunds
     where order_id = v_r.order_id and status = 'success';

    if v_refunded >= v_total then
      update public.orders set status = 'refunded' where id = v_r.order_id;
      -- Full refund revokes access atomically with the money reversal.
      delete from public.user_product_access where order_id = v_r.order_id;
      delete from public.guest_entitlements  where order_id = v_r.order_id;
    end if;
  else
    update public.creator_balances
       set frozen_balance = frozen_balance - v_r.net_clawback
     where creator_id = v_r.creator_id;
  end if;

  update public.wallet_frozen_logs
     set status       = 'released',
         released_at  = now(),
         release_note = case when p_terminal = 'success' then 'refund settled'
                             else coalesce(p_failure_reason, 'refund failed') end
   where refund_id = p_refund_id and status = 'frozen';

  return true;
end;
$$;
revoke execute on function public.settle_refund(uuid, text, text, jsonb, text) from public, anon, authenticated;

-- ── 6. Manual freeze / release (dispute + admin holds) ─────────────────────
create or replace function public.freeze_creator_funds(
  p_creator_id uuid,
  p_amount numeric,
  p_reason text,
  p_source text default 'manual',       -- 'dispute' | 'manual'
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'freeze: amount must be > 0'; end if;
  if p_source not in ('dispute','manual') then raise exception 'freeze: bad source %', p_source; end if;

  insert into public.creator_balances
    (creator_id, total_earnings, total_platform_fees, total_paid_out, pending_payout, frozen_balance)
  values (p_creator_id, 0, 0, 0, 0, p_amount)
  on conflict (creator_id) do update
    set frozen_balance = creator_balances.frozen_balance + excluded.frozen_balance;

  insert into public.wallet_frozen_logs (creator_id, amount, reason, status, source, created_by)
  values (p_creator_id, p_amount, p_reason, 'frozen', p_source, p_created_by)
  returning id into v_id;

  return v_id;
end;
$$;
revoke execute on function public.freeze_creator_funds(uuid, numeric, text, text, uuid) from public, anon, authenticated;

create or replace function public.release_frozen_funds(
  p_log_id uuid,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log record;
begin
  update public.wallet_frozen_logs
     set status = 'released', released_at = now(), release_note = coalesce(p_note, 'released')
   where id = p_log_id and status = 'frozen'
   returning creator_id, amount into v_log;

  if v_log.creator_id is null then
    return false;  -- already released / not found
  end if;

  update public.creator_balances
     set frozen_balance = frozen_balance - v_log.amount
   where creator_id = v_log.creator_id;

  return true;
end;
$$;
revoke execute on function public.release_frozen_funds(uuid, text) from public, anon, authenticated;

-- ── 7. reverse_settled_payout() — TRANSFER_REVERSED after success ──────────
-- The transfer bounced after we settled it: money returned to the platform, so the
-- creator's paid-out counter shrinks (available rises). Ledger gets a CREDIT.
create or replace function public.reverse_settled_payout(
  p_payout_id uuid,
  p_reason text default null,
  p_gateway_metadata jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator_id uuid;
  v_amount numeric;
begin
  update public.creator_payouts
     set status           = 'reversed',
         failure_reason   = coalesce(p_reason, failure_reason),
         gateway_metadata = coalesce(p_gateway_metadata, gateway_metadata),
         processed_at     = now()
   where id = p_payout_id
     and status = 'success'
   returning creator_id, amount into v_creator_id, v_amount;

  if v_creator_id is null then
    return false;  -- not a settled payout → no-op (in-flight reversals go through settle_payout)
  end if;

  update public.creator_balances
     set total_paid_out = total_paid_out - v_amount
   where creator_id = v_creator_id;

  insert into public.transaction_ledger
    (creator_id, payout_id, amount, direction, tx_type, currency, record_hash, meta)
  values
    (v_creator_id, p_payout_id, v_amount, 'credit', 'payout_reversal', 'INR',
     convert_to(encode(sha256(convert_to('payout-rev:' || p_payout_id::text, 'UTF8')), 'hex'), 'UTF8'),
     jsonb_build_object('payout_id', p_payout_id, 'reason', p_reason))
  on conflict (record_hash) do nothing;

  return true;
end;
$$;
revoke execute on function public.reverse_settled_payout(uuid, text, jsonb) from public, anon, authenticated;

-- ── 8. reconcile_creator_balances() v2 — earnings/fees/frozen coverage ─────
-- Still alert-only: logs drift, never auto-corrects.
create or replace function public.reconcile_creator_balances()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_expected_paid numeric;
  v_expected_pending numeric;
  v_expected_earnings numeric;
  v_expected_fees numeric;
  v_expected_frozen numeric;
  v_drift_count integer := 0;
begin
  for r in select creator_id, total_earnings, total_platform_fees, total_paid_out,
                  pending_payout, frozen_balance
             from public.creator_balances loop

    select coalesce(sum(amount) filter (where status = 'success'), 0),
           coalesce(sum(amount) filter (where status in ('pending','processing')), 0)
      into v_expected_paid, v_expected_pending
      from public.creator_payouts
     where creator_id = r.creator_id;

    select coalesce(sum(amount) filter (where direction = 'credit'
             and tx_type in ('sale','payment_link','referral_commission')), 0)
         - coalesce(sum(amount) filter (where direction = 'debit' and tx_type = 'refund'), 0),
           coalesce(sum((meta->>'platform_fee')::numeric) filter (where direction = 'credit'
             and tx_type in ('sale','payment_link','referral_commission')), 0)
         - coalesce(sum((meta->>'fee_reversed')::numeric) filter (where direction = 'debit'
             and tx_type = 'refund'), 0)
      into v_expected_earnings, v_expected_fees
      from public.transaction_ledger
     where creator_id = r.creator_id;

    select coalesce(sum(amount), 0)
      into v_expected_frozen
      from public.wallet_frozen_logs
     where creator_id = r.creator_id and status = 'frozen';

    if r.total_paid_out <> v_expected_paid then
      insert into public.balance_reconciliation_log (creator_id, field, cached_value, expected_value, drift)
      values (r.creator_id, 'total_paid_out', r.total_paid_out, v_expected_paid, r.total_paid_out - v_expected_paid);
      v_drift_count := v_drift_count + 1;
    end if;
    if r.pending_payout <> v_expected_pending then
      insert into public.balance_reconciliation_log (creator_id, field, cached_value, expected_value, drift)
      values (r.creator_id, 'pending_payout', r.pending_payout, v_expected_pending, r.pending_payout - v_expected_pending);
      v_drift_count := v_drift_count + 1;
    end if;
    if r.total_earnings <> v_expected_earnings then
      insert into public.balance_reconciliation_log (creator_id, field, cached_value, expected_value, drift)
      values (r.creator_id, 'total_earnings', r.total_earnings, v_expected_earnings, r.total_earnings - v_expected_earnings);
      v_drift_count := v_drift_count + 1;
    end if;
    if r.total_platform_fees <> v_expected_fees then
      insert into public.balance_reconciliation_log (creator_id, field, cached_value, expected_value, drift)
      values (r.creator_id, 'total_platform_fees', r.total_platform_fees, v_expected_fees, r.total_platform_fees - v_expected_fees);
      v_drift_count := v_drift_count + 1;
    end if;
    if r.frozen_balance <> v_expected_frozen then
      insert into public.balance_reconciliation_log (creator_id, field, cached_value, expected_value, drift)
      values (r.creator_id, 'frozen_balance', r.frozen_balance, v_expected_frozen, r.frozen_balance - v_expected_frozen);
      v_drift_count := v_drift_count + 1;
    end if;
  end loop;
  return v_drift_count;
end;
$$;
revoke execute on function public.reconcile_creator_balances() from public, anon, authenticated;
