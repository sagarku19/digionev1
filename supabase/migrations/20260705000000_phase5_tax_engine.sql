-- Phase 5 — GST/TDS/TCS tax engine (2026-07-05)
-- Spec: docs/superpowers/specs/2026-07-05-phase5-tax-engine-design.md
-- Idempotent. Apply live via the Supabase MCP, then regenerate types.

-- ── 1. tax_rules (versioned config) ─────────────────────────────────────────
create table if not exists public.tax_rules (
  id                        uuid primary key default gen_random_uuid(),
  gst_commission_rate       numeric not null,
  tds_rate_pan              numeric not null,
  tds_rate_no_pan           numeric not null,
  tcs_rate                  numeric not null,
  tds_threshold_fy          numeric not null,
  gst_reg_threshold         numeric not null,
  gst_reg_threshold_special numeric not null,
  effective_from            timestamptz not null default now(),
  effective_to              timestamptz,
  is_active                 boolean not null default true,
  created_at                timestamptz not null default now()
);
alter table public.tax_rules enable row level security;
drop policy if exists tax_rules_read on public.tax_rules;
create policy tax_rules_read on public.tax_rules for select to authenticated using (true);

insert into public.tax_rules
  (gst_commission_rate, tds_rate_pan, tds_rate_no_pan, tcs_rate,
   tds_threshold_fy, gst_reg_threshold, gst_reg_threshold_special)
select 0.18, 0.001, 0.05, 0.005, 500000, 2000000, 1000000
where not exists (select 1 from public.tax_rules where is_active);

-- ── 2. creator_kyc / creator_payouts columns ────────────────────────────────
alter table public.creator_kyc     add column if not exists gstin           text;
alter table public.creator_kyc     add column if not exists gstin_verified  boolean not null default false;
alter table public.creator_kyc     add column if not exists gstin_added_at   timestamptz;
alter table public.creator_payouts add column if not exists tds_withheld     numeric not null default 0;
alter table public.creator_payouts add column if not exists tcs_withheld     numeric not null default 0;
alter table public.creator_payouts add column if not exists net_amount       numeric;

-- ── 3. tax_transactions (per-sale immutable accrual + audit) ─────────────────
create table if not exists public.tax_transactions (
  id                 uuid primary key default gen_random_uuid(),
  creator_id         uuid not null references public.profiles(id),
  fy                 text not null,
  order_id           uuid references public.orders(id),
  submission_id      uuid references public.payment_submissions(id),
  gross_amount       numeric not null,
  commission_gross   numeric not null,
  commission_net     numeric not null,
  gst_on_commission  numeric not null,
  creator_registered boolean not null default false,
  gstin              text,
  pan_present        boolean not null default false,
  tds_amount         numeric not null default 0,
  tcs_amount         numeric not null default 0,
  settled            boolean not null default false,
  settling_payout_id uuid references public.creator_payouts(id),
  rate_snapshot      jsonb,
  status             text not null default 'posted' check (status in ('posted','reversed')),
  reverses_id        uuid references public.tax_transactions(id),
  created_at         timestamptz not null default now(),
  constraint tax_tx_one_source check ((order_id is not null) <> (submission_id is not null))
);
create index if not exists idx_tax_tx_creator_fy on public.tax_transactions (creator_id, fy);
create index if not exists idx_tax_tx_unsettled  on public.tax_transactions (creator_id) where not settled and status = 'posted';
create index if not exists idx_tax_tx_created    on public.tax_transactions (created_at);
create unique index if not exists uq_tax_tx_order      on public.tax_transactions (order_id)      where status = 'posted' and order_id is not null;
create unique index if not exists uq_tax_tx_submission on public.tax_transactions (submission_id) where status = 'posted' and submission_id is not null;

alter table public.tax_transactions enable row level security;
drop policy if exists tax_tx_select_own on public.tax_transactions;
create policy tax_tx_select_own on public.tax_transactions for select to authenticated
  using (creator_id = (select public.current_profile_id()) or (select public.is_super_admin()));

-- ── 4. FY helpers ───────────────────────────────────────────────────────────
create or replace function public.current_fy()
returns text language sql stable set search_path = public as $$
  select case when extract(month from now()) >= 4
    then extract(year from now())::int::text || '-' || right((extract(year from now())::int + 1)::text, 2)
    else (extract(year from now())::int - 1)::text || '-' || right(extract(year from now())::int::text, 2)
  end;
$$;

create or replace function public.fy_turnover(p_creator_id uuid, p_fy text)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(gross_amount) filter (where status = 'posted'), 0)
       - coalesce(sum(gross_amount) filter (where status = 'reversed'), 0)
    from public.tax_transactions
   where creator_id = p_creator_id and fy = p_fy;
$$;
revoke execute on function public.fy_turnover(uuid, text) from public, anon, authenticated;

-- ── 5. gst_registration_required (₹20L gate; ₹10L special-category states) ──
create or replace function public.gst_registration_required(p_creator_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_gstin text; v_state text; v_rules record; v_special boolean; v_threshold numeric; v_turnover numeric;
begin
  select gstin, lower(coalesce(state, '')) into v_gstin, v_state
    from public.creator_kyc where creator_id = p_creator_id;
  if v_gstin is not null then return false; end if;
  select * into v_rules from public.tax_rules where is_active order by effective_from desc limit 1;
  if v_rules.id is null then return false; end if;
  v_special := v_state = any (array['arunachal pradesh','assam','manipur','meghalaya','mizoram',
    'nagaland','tripura','sikkim','uttarakhand','himachal pradesh','jammu and kashmir']);
  v_threshold := case when v_special then v_rules.gst_reg_threshold_special else v_rules.gst_reg_threshold end;
  v_turnover := public.fy_turnover(p_creator_id, public.current_fy());
  return v_turnover >= v_threshold;
end;
$$;
revoke execute on function public.gst_registration_required(uuid) from public, anon, authenticated;

-- ── 6. record_sale_tax (per-sale accrual — authoritative) ───────────────────
create or replace function public.record_sale_tax(
  p_creator_id uuid, p_gross numeric, p_commission_gross numeric,
  p_order_id uuid default null, p_submission_id uuid default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_rules public.tax_rules; v_fy text := public.current_fy();
  v_pan boolean; v_gstin text; v_registered boolean;
  v_turnover_before numeric; v_gst_on_comm numeric; v_comm_net numeric;
  v_tds numeric := 0; v_tcs numeric := 0; v_id uuid;
begin
  if (p_order_id is null) = (p_submission_id is null) then
    raise exception 'record_sale_tax: exactly one of order_id/submission_id required';
  end if;

  if p_order_id is not null then
    perform 1 from public.tax_transactions where order_id = p_order_id and status = 'posted';
    if found then return null; end if;
  else
    perform 1 from public.tax_transactions where submission_id = p_submission_id and status = 'posted';
    if found then return null; end if;
  end if;

  select * into v_rules from public.tax_rules where is_active order by effective_from desc limit 1;
  if v_rules.id is null then raise exception 'record_sale_tax: no active tax_rules'; end if;

  select (pan_last4 is not null), gstin into v_pan, v_gstin
    from public.creator_kyc where creator_id = p_creator_id;
  v_pan := coalesce(v_pan, false);
  v_registered := v_gstin is not null;
  v_turnover_before := public.fy_turnover(p_creator_id, v_fy);

  v_gst_on_comm := round(p_commission_gross * v_rules.gst_commission_rate / (1 + v_rules.gst_commission_rate), 2);
  v_comm_net    := round(p_commission_gross - v_gst_on_comm, 2);

  if not v_pan then
    v_tds := round(p_gross * v_rules.tds_rate_no_pan, 2);
  elsif (v_turnover_before + p_gross) > v_rules.tds_threshold_fy then
    v_tds := round(p_gross * v_rules.tds_rate_pan, 2);
  end if;
  if v_registered then
    v_tcs := round(p_gross * v_rules.tcs_rate, 2);
  end if;

  insert into public.tax_transactions
    (creator_id, fy, order_id, submission_id, gross_amount, commission_gross, commission_net,
     gst_on_commission, creator_registered, gstin, pan_present, tds_amount, tcs_amount, rate_snapshot, status)
  values
    (p_creator_id, v_fy, p_order_id, p_submission_id, p_gross, p_commission_gross, v_comm_net,
     v_gst_on_comm, v_registered, v_gstin, v_pan, v_tds, v_tcs, to_jsonb(v_rules), 'posted')
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.record_sale_tax(uuid, numeric, numeric, uuid, uuid) from public, anon, authenticated;

-- ── 7. begin_payout_tax (reserve unsettled pending, net of reversals) ───────
create or replace function public.begin_payout_tax(p_payout_id uuid, p_creator_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tds numeric; v_tcs numeric;
begin
  update public.tax_transactions
     set settling_payout_id = p_payout_id
   where creator_id = p_creator_id and status = 'posted' and not settled and settling_payout_id is null;

  with reserved as (
    select id, tds_amount, tcs_amount from public.tax_transactions
     where settling_payout_id = p_payout_id and status = 'posted' and not settled
  ),
  revs as (
    select reverses_id, coalesce(sum(tds_amount), 0) as rt, coalesce(sum(tcs_amount), 0) as rc
      from public.tax_transactions
     where status = 'reversed' and reverses_id in (select id from reserved)
     group by reverses_id
  )
  select coalesce(sum(greatest(r.tds_amount - coalesce(v.rt, 0), 0)), 0),
         coalesce(sum(greatest(r.tcs_amount - coalesce(v.rc, 0), 0)), 0)
    into v_tds, v_tcs
    from reserved r left join revs v on v.reverses_id = r.id;

  return jsonb_build_object('tds_withheld', coalesce(v_tds, 0), 'tcs_withheld', coalesce(v_tcs, 0));
end;
$$;
revoke execute on function public.begin_payout_tax(uuid, uuid) from public, anon, authenticated;

-- ── 8. get_payout_tax_preview (client-facing; resolves current profile) ─────
create or replace function public.get_payout_tax_preview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_creator uuid := public.current_profile_id();
  v_fy text := public.current_fy();
  v_tds numeric; v_tcs numeric; v_gstin text; v_turnover numeric;
begin
  if v_creator is null then return jsonb_build_object('error', 'no_profile'); end if;
  v_turnover := public.fy_turnover(v_creator, v_fy);
  select gstin into v_gstin from public.creator_kyc where creator_id = v_creator;

  with unsettled as (
    select id, tds_amount, tcs_amount from public.tax_transactions
     where creator_id = v_creator and status = 'posted' and not settled
  ),
  revs as (
    select reverses_id, coalesce(sum(tds_amount), 0) as rt, coalesce(sum(tcs_amount), 0) as rc
      from public.tax_transactions
     where status = 'reversed' and reverses_id in (select id from unsettled)
     group by reverses_id
  )
  select coalesce(sum(greatest(u.tds_amount - coalesce(v.rt, 0), 0)), 0),
         coalesce(sum(greatest(u.tcs_amount - coalesce(v.rc, 0), 0)), 0)
    into v_tds, v_tcs
    from unsettled u left join revs v on v.reverses_id = u.id;

  return jsonb_build_object(
    'tds', coalesce(v_tds, 0), 'tcs', coalesce(v_tcs, 0),
    'fy', v_fy, 'fy_turnover', v_turnover, 'gstin_present', v_gstin is not null,
    'registration_required', public.gst_registration_required(v_creator)
  );
end;
$$;
grant execute on function public.get_payout_tax_preview() to authenticated;

-- ── 9. settle_payout (extended: settle/release reserved tax) ────────────────
create or replace function public.settle_payout(
  p_payout_id uuid, p_terminal text, p_gateway_payout_id text default null,
  p_gateway_metadata jsonb default null, p_failure_reason text default null, p_expect_status text default null
)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_creator_id uuid; v_amount numeric;
begin
  if p_terminal not in ('success','failed') then
    raise exception 'settle_payout: invalid terminal status %', p_terminal;
  end if;

  update public.creator_payouts
     set status            = p_terminal,
         gateway_payout_id = coalesce(p_gateway_payout_id, gateway_payout_id),
         gateway_metadata  = coalesce(p_gateway_metadata, gateway_metadata),
         failure_reason    = case when p_terminal = 'failed' then p_failure_reason else failure_reason end,
         processed_at      = now()
   where id = p_payout_id
     and status in ('pending','processing')
     and (p_expect_status is null or status = p_expect_status)
   returning creator_id, amount into v_creator_id, v_amount;

  if v_creator_id is null then
    return false;
  end if;

  if p_terminal = 'success' then
    update public.creator_balances
       set total_paid_out = total_paid_out + v_amount,
           pending_payout = greatest(pending_payout - v_amount, 0)
     where creator_id = v_creator_id;

    insert into public.transaction_ledger
      (creator_id, payout_id, amount, direction, tx_type, currency, record_hash, meta)
    values
      (v_creator_id, p_payout_id, v_amount, 'debit', 'payout', 'INR',
       convert_to(encode(sha256(convert_to('payout:' || p_payout_id::text, 'UTF8')), 'hex'), 'UTF8'),
       jsonb_build_object('payout_id', p_payout_id, 'gateway_payout_id', p_gateway_payout_id))
    on conflict (record_hash) do nothing;

    -- Phase 5: finalize the tax reserved by begin_payout_tax
    update public.tax_transactions set settled = true
     where settling_payout_id = p_payout_id and not settled;
  else
    update public.creator_balances
       set pending_payout = greatest(pending_payout - v_amount, 0)
     where creator_id = v_creator_id;

    -- Phase 5: release the reservation so the tax returns to pending
    update public.tax_transactions set settling_payout_id = null
     where settling_payout_id = p_payout_id and not settled;
  end if;

  return true;
end;
$$;
revoke execute on function public.settle_payout(uuid, text, text, jsonb, text, text) from public, anon, authenticated;

-- ── 10. settle_refund (extended: reverse the sale's tax proportionally) ─────
create or replace function public.settle_refund(
  p_refund_id uuid, p_terminal text, p_gateway_refund_id text default null,
  p_gateway_metadata jsonb default null, p_failure_reason text default null
)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_r record; v_total numeric; v_refunded numeric;
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
   where id = p_refund_id and status = 'processing'
   returning id, order_id, creator_id, amount, fee_reversed, net_clawback into v_r;

  if v_r.id is null then
    return false;
  end if;

  if p_terminal = 'success' then
    select total_amount into v_total from public.orders where id = v_r.order_id for update;

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

    -- Phase 5: reverse the sale's tax proportionally (reporting + pending netting)
    insert into public.tax_transactions
      (creator_id, fy, order_id, submission_id, gross_amount, commission_gross, commission_net,
       gst_on_commission, creator_registered, gstin, pan_present, tds_amount, tcs_amount,
       settled, rate_snapshot, status, reverses_id)
    select o.creator_id, o.fy, o.order_id, o.submission_id,
           round(o.gross_amount * o.frac, 2), round(o.commission_gross * o.frac, 2),
           round(o.commission_net * o.frac, 2), round(o.gst_on_commission * o.frac, 2),
           o.creator_registered, o.gstin, o.pan_present,
           round(o.tds_amount * o.frac, 2), round(o.tcs_amount * o.frac, 2),
           false, o.rate_snapshot, 'reversed', o.id
      from (
        select t.*, least(v_r.amount / nullif(t.gross_amount, 0), 1) as frac
          from public.tax_transactions t
         where t.order_id = v_r.order_id and t.status = 'posted'
         limit 1
      ) o;

    select coalesce(sum(amount), 0) into v_refunded
      from public.refunds where order_id = v_r.order_id and status = 'success';

    if v_refunded >= v_total then
      update public.orders set status = 'refunded' where id = v_r.order_id;
      delete from public.user_product_access where order_id = v_r.order_id;
      delete from public.guest_entitlements  where order_id = v_r.order_id;
    end if;
  else
    update public.creator_balances
       set frozen_balance = frozen_balance - v_r.net_clawback
     where creator_id = v_r.creator_id;
  end if;

  update public.wallet_frozen_logs
     set status = 'released', released_at = now(),
         release_note = case when p_terminal = 'success' then 'refund settled'
                             else coalesce(p_failure_reason, 'refund failed') end
   where refund_id = p_refund_id and status = 'frozen';

  return true;
end;
$$;
revoke execute on function public.settle_refund(uuid, text, text, jsonb, text) from public, anon, authenticated;
