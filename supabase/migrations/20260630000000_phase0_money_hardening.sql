-- Phase 0 — Money-path hardening (2026-06-30)
-- Spec: docs/superpowers/specs/2026-06-30-phase0-money-hardening-design.md
-- Idempotent: safe to re-run. Apply live via the Supabase MCP, then regenerate types (MCP fallback on Windows).

-- ── 1. KYC write-lockdown ──────────────────────────────────────────────────
-- Creator self-attesting status/*_verified was a payout-gate bypass. Drop client INSERT/UPDATE;
-- keep SELECT-own. Writes are service-role only (POST /api/kyc/submit forces status='pending').
drop policy if exists creator_kyc_insert_own on public.creator_kyc;
drop policy if exists creator_kyc_update_own on public.creator_kyc;
comment on table public.creator_kyc is
  'KYC profile. Creators may only SELECT their own row. All writes go through service-role POST /api/kyc/submit (forces status=pending, never accepts *_verified from the client). Admin verification flips status/*_verified via a service-role admin route (Phase 2).';

-- Ensure a unique target for the route''s upsert(onConflict: creator_id).
do $$
begin
  if not exists (
    select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'creator_kyc' and c.contype = 'u'
      and pg_get_constraintdef(c.oid) ilike '%(creator_id)%'
  ) then
    alter table public.creator_kyc add constraint uq_creator_kyc_creator_id unique (creator_id);
  end if;
end $$;

-- ── 2. creator_balances.frozen_balance ─────────────────────────────────────
alter table public.creator_balances
  add column if not exists frozen_balance numeric not null default 0;
alter table public.creator_balances drop constraint if exists chk_creator_balances_nonneg;
alter table public.creator_balances add constraint chk_creator_balances_nonneg
  check (total_earnings >= 0 and total_platform_fees >= 0 and total_paid_out >= 0
         and pending_payout >= 0 and frozen_balance >= 0);

-- ── 3. creator_payouts.status vocabulary ───────────────────────────────────
-- Lifecycle: pending → processing → success → failed. (Table empty; sole writer inserts 'pending'.)
alter table public.creator_payouts drop constraint if exists creator_payouts_status_check;
alter table public.creator_payouts add constraint creator_payouts_status_check
  check (status in ('pending','processing','success','failed'));

-- ── 4. settle_payout() — atomic payout finalization ────────────────────────
-- Idempotency: the status claim (WHERE status in ('pending','processing')) gates side effects;
-- the ledger record_hash UNIQUE constraint is a second guard. record_hash is bytea and must
-- match fulfillment.ts's convention: the ASCII bytes of the lowercase hex SHA-256 (built-in
-- sha256(), no pgcrypto). Returns true iff it transitioned a row.
create or replace function public.settle_payout(
  p_payout_id uuid,
  p_terminal text,                       -- 'success' | 'failed'
  p_gateway_payout_id text default null,
  p_gateway_metadata jsonb default null,
  p_failure_reason text default null
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
  if p_terminal not in ('success','failed') then
    raise exception 'settle_payout: invalid terminal status %', p_terminal;
  end if;

  update public.creator_payouts
     set status            = p_terminal,
         gateway_payout_id = coalesce(p_gateway_payout_id, gateway_payout_id),
         gateway_metadata  = coalesce(p_gateway_metadata, gateway_metadata),
         failure_reason    = case when p_terminal = 'failed' then p_failure_reason else failure_reason end
   where id = p_payout_id
     and status in ('pending','processing')
   returning creator_id, amount into v_creator_id, v_amount;

  if v_creator_id is null then
    return false;  -- already settled / not found → no-op
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
  else
    update public.creator_balances
       set pending_payout = greatest(pending_payout - v_amount, 0)
     where creator_id = v_creator_id;
  end if;

  return true;
end;
$$;
revoke execute on function public.settle_payout(uuid, text, text, jsonb, text) from public, anon, authenticated;

-- ── 5. Reconciliation (alert-only; unscheduled — scheduler deferred to Phase 1) ──
create table if not exists public.balance_reconciliation_log (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade,
  field text not null,                 -- 'total_paid_out' | 'pending_payout'
  cached_value numeric not null,
  expected_value numeric not null,
  drift numeric not null,
  created_at timestamptz not null default now()
);
alter table public.balance_reconciliation_log enable row level security;
drop policy if exists balance_reconciliation_log_admin_select on public.balance_reconciliation_log;
create policy balance_reconciliation_log_admin_select on public.balance_reconciliation_log
  for select to authenticated using ((select public.is_super_admin()));

-- Compares cached creator_balances against authoritative creator_payouts sums; logs drift.
-- NEVER auto-corrects (money never silently rewrites itself). Run manually via MCP for now;
-- a scheduler (Vercel Cron or pg_cron) is chosen in Phase 1 when payouts start moving money.
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
  v_drift_count integer := 0;
begin
  for r in select creator_id, total_paid_out, pending_payout from public.creator_balances loop
    select coalesce(sum(amount) filter (where status = 'success'), 0),
           coalesce(sum(amount) filter (where status in ('pending','processing')), 0)
      into v_expected_paid, v_expected_pending
      from public.creator_payouts
     where creator_id = r.creator_id;

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
  end loop;
  return v_drift_count;
end;
$$;
revoke execute on function public.reconcile_creator_balances() from public, anon, authenticated;
