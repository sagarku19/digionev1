---
noteId: "phase5-tax-engine-plan-20260705"
tags: []
---

# Phase 5 — GST / TDS / TCS Tax Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Accrue GST-on-commission / TDS 194-O / TCS §52 per sale (immutable `tax_transactions`), withhold TDS/TCS at payout as settlement line items, and gate GST registration at the ₹20L turnover threshold — per the approved spec `docs/superpowers/specs/2026-07-05-phase5-tax-engine-design.md`.

**Architecture:** Mirrors the proven Phase 4 pattern. A per-sale `record_sale_tax` RPC snapshots the tax split + threshold-aware pending TDS/TCS at fulfillment (no balance change — the 10% commission is GST-inclusive). At payout, `begin_payout_tax` reserves the creator's unsettled pending tax (net of any refund reversals) and the transfer sends `net_amount = amount − tds − tcs`; `settle_payout`/`settle_refund` are extended to settle/release/reverse tax atomically. A ₹20L turnover gate blocks payout until a GSTIN is furnished via a dedicated route.

**Tech Stack:** Next.js 16 route handlers, Supabase (Postgres RPCs via MCP migrations), Cashfree Payouts, TanStack Query v5, Vitest.

**Execution notes (read first):**
- Work directly on `main` (user preference). Commit after every task with the message given.
- DB changes are applied **live** via the Supabase MCP (`mcp__plugin_supabase_supabase__apply_migration`, project_id `qcendfisvyjnwmefruba`). The Windows `supabase` CLI is broken — never run `npx supabase db push`. Load MCP tools via ToolSearch first (`select:mcp__plugin_supabase_supabase__apply_migration,mcp__plugin_supabase_supabase__execute_sql`).
- Type regen on Windows uses the MCP fallback in `.claude/rules/supabase-reference.md` → "Regenerating types".
- **Deployment precondition (carried from Phase 4):** this builds on the gross-earnings fix + backfill (already live). No further balance-formula change here.

**File structure (created/modified):**

| File | Responsibility |
|---|---|
| `supabase/migrations/20260705000000_phase5_tax_engine.sql` (new) | `tax_rules` + `tax_transactions`, KYC/payout columns, RPCs (`current_fy`, `fy_turnover`, `record_sale_tax`, `begin_payout_tax`, `gst_registration_required`, `get_payout_tax_preview`), extended `settle_payout`/`settle_refund`, RLS, seed |
| `src/lib/shared/tax-math.ts` (new) | Pure isomorphic tax math (executable spec; RPC re-computes authoritatively) |
| `src/lib/shared/tax-math.test.ts` (new) | Unit tests for the split/accrual/reversal math |
| `src/lib/shared/gstin.ts` (new) | GSTIN format + checksum validation |
| `src/lib/shared/gstin.test.ts` (new) | GSTIN validation tests |
| `src/lib/server/fulfillment.ts` | Call `record_sale_tax` after credit (2 paths) |
| `app/api/payouts/request/route.ts` | ₹20L GST gate + `begin_payout_tax` withholding |
| `app/api/admin/payouts/[id]/approve/route.ts` | Transfer `net_amount` |
| `app/api/kyc/gstin/route.ts` (new) | Creator GSTIN submit |
| `src/hooks/commerce/useTax.ts` (new) | `usePayoutTaxPreview`, `useTaxSummary`, `useAddGstin` |
| `app/dashboard/earnings/page.tsx` | Withdraw tax preview + ₹20L gate + GSTIN modal + Tax card + registration banner |
| `types/database.types.ts` | Regenerated (never hand-edited) |
| Docs: `.claude/rules/api-routes.md`, `security-model.md`, `hooks-reference.md`, `docs/db/money-path.md`, `docs/reference/dashboard-map.md`, blueprint `11(half)` §0 | Same change-set |

---

### Task 1: Migration — tax schema, RPCs, extended settle functions

**Files:**
- Create: `supabase/migrations/20260705000000_phase5_tax_engine.sql`

- [ ] **Step 1: Write the migration file**

Write exactly this to `supabase/migrations/20260705000000_phase5_tax_engine.sql`:

```sql
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
```

- [ ] **Step 2: Apply the migration live via the Supabase MCP**

Load the MCP tools (`ToolSearch` query `select:mcp__plugin_supabase_supabase__apply_migration,mcp__plugin_supabase_supabase__execute_sql`), then call `apply_migration` with `project_id: "qcendfisvyjnwmefruba"`, `name: "phase5_tax_engine"`, `query` = the full file content above. Expected: success.

- [ ] **Step 3: Verify objects exist**

Call `execute_sql`:
```sql
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and proname in
  ('current_fy','fy_turnover','gst_registration_required','record_sale_tax','begin_payout_tax','get_payout_tax_preview')
order by proname;
```
Expected: 6 rows. Then:
```sql
select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and relname in ('tax_rules','tax_transactions');
select count(*) as rules from public.tax_rules where is_active;
```
Expected: 2 tables both `relrowsecurity=true`; `rules = 1`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260705000000_phase5_tax_engine.sql
git commit -m "feat(db): phase5 tax engine — tax_rules + tax_transactions + accrual/withhold RPCs + settle extensions" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Regenerate Supabase types

**Files:**
- Modify: `types/database.types.ts` (regenerated)

- [ ] **Step 1: Regenerate via the MCP fallback**

`npm run update-types` fails on Windows. Use the MCP fallback from `.claude/rules/supabase-reference.md`: call `mcp__plugin_supabase_supabase__generate_typescript_types` (`project_id: "qcendfisvyjnwmefruba"`), then strip the JSON envelope:
```bash
python3 - <<'PY'
import json
src = r"<path-printed-by-the-tool-call>"
dst = r"types\database.types.ts"
with open(src, 'r', encoding='utf-8') as f: payload = json.load(f)
with open(dst, 'w', encoding='utf-8', newline='\n') as f: f.write(payload['types'])
PY
```

- [ ] **Step 2: Verify + compile**

Run (Grep tool): search `types/database.types.ts` for `tax_transactions`, `record_sale_tax`, `begin_payout_tax`, `get_payout_tax_preview` — expect matches. Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add types/database.types.ts
git commit -m "chore(types): regen for phase5 tax schema" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Pure tax-math module (TDD)

**Files:**
- Create: `src/lib/shared/tax-math.ts`
- Test: `src/lib/shared/tax-math.test.ts`

Isomorphic executable spec of the tax rules. The `record_sale_tax` RPC re-computes authoritatively — this module must implement the **same** rules (spec §1.1, §3).

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { splitCommission, accrueSaleTax } from './tax-math';

const RATES = {
  gstCommissionRate: 0.18, tdsRatePan: 0.001, tdsRateNoPan: 0.05,
  tcsRate: 0.005, tdsThresholdFy: 500000,
};

describe('splitCommission', () => {
  it('carves GST out of a GST-inclusive commission', () => {
    expect(splitCommission(100, 0.18)).toEqual({ commissionNet: 84.75, gstOnCommission: 15.25 });
  });
  it('rejects non-finite inputs', () => {
    expect(() => splitCommission(Number.NaN, 0.18)).toThrow(RangeError);
    expect(() => splitCommission(100, -1)).toThrow(RangeError);
  });
});

describe('accrueSaleTax', () => {
  it('no TDS below the ₹5L FY threshold (PAN present)', () => {
    expect(accrueSaleTax({ gross: 1000, fyGrossBefore: 0, panPresent: true, registered: false, rates: RATES }))
      .toEqual({ tdsAmount: 0, tcsAmount: 0 });
  });
  it('0.1% TDS once FY gross crosses ₹5L (PAN)', () => {
    expect(accrueSaleTax({ gross: 1000, fyGrossBefore: 600000, panPresent: true, registered: false, rates: RATES }))
      .toEqual({ tdsAmount: 1, tcsAmount: 0 });
  });
  it('the crossing sale is taxed on full gross', () => {
    expect(accrueSaleTax({ gross: 1000, fyGrossBefore: 499500, panPresent: true, registered: false, rates: RATES }).tdsAmount)
      .toBe(1);
  });
  it('5% TDS from ₹1 when no PAN (no threshold benefit)', () => {
    expect(accrueSaleTax({ gross: 1000, fyGrossBefore: 0, panPresent: false, registered: false, rates: RATES }).tdsAmount)
      .toBe(50);
  });
  it('unregistered creator accrues no TCS', () => {
    expect(accrueSaleTax({ gross: 1000, fyGrossBefore: 600000, panPresent: true, registered: false, rates: RATES }).tcsAmount)
      .toBe(0);
  });
  it('registered creator accrues 0.5% TCS', () => {
    expect(accrueSaleTax({ gross: 1000, fyGrossBefore: 600000, panPresent: true, registered: true, rates: RATES }))
      .toEqual({ tdsAmount: 1, tcsAmount: 5 });
  });
  it('rejects non-finite gross', () => {
    expect(() => accrueSaleTax({ gross: Number.NaN, fyGrossBefore: 0, panPresent: true, registered: false, rates: RATES }))
      .toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/lib/shared/tax-math.test.ts` → FAIL (cannot resolve `./tax-math`).

- [ ] **Step 3: Write the implementation**

```typescript
// Pure Indian e-commerce tax math — isomorphic executable spec of the rules the
// record_sale_tax Postgres RPC re-computes authoritatively (spec §1.1, §3).
// GST-on-commission is carved OUT of the GST-inclusive 10% fee (not added on top).

export interface TaxRates {
  gstCommissionRate: number;
  tdsRatePan: number;
  tdsRateNoPan: number;
  tcsRate: number;
  tdsThresholdFy: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const finite = (n: number) => Number.isFinite(n);

export function splitCommission(commissionGross: number, gstRate: number): {
  commissionNet: number;
  gstOnCommission: number;
} {
  if (!finite(commissionGross) || commissionGross < 0) throw new RangeError('commissionGross must be a non-negative finite number');
  if (!finite(gstRate) || gstRate < 0) throw new RangeError('gstRate must be a non-negative finite number');
  const gstOnCommission = round2((commissionGross * gstRate) / (1 + gstRate));
  return { commissionNet: round2(commissionGross - gstOnCommission), gstOnCommission };
}

export function accrueSaleTax(input: {
  gross: number;
  fyGrossBefore: number;
  panPresent: boolean;
  registered: boolean;
  rates: TaxRates;
}): { tdsAmount: number; tcsAmount: number } {
  const { gross, fyGrossBefore, panPresent, registered, rates } = input;
  if (!finite(gross) || gross < 0) throw new RangeError('gross must be a non-negative finite number');
  if (!finite(fyGrossBefore) || fyGrossBefore < 0) throw new RangeError('fyGrossBefore must be a non-negative finite number');

  let tdsAmount = 0;
  if (!panPresent) {
    tdsAmount = round2(gross * rates.tdsRateNoPan);
  } else if (fyGrossBefore + gross > rates.tdsThresholdFy) {
    tdsAmount = round2(gross * rates.tdsRatePan);
  }
  const tcsAmount = registered ? round2(gross * rates.tcsRate) : 0;
  return { tdsAmount, tcsAmount };
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/lib/shared/tax-math.test.ts` → all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shared/tax-math.ts src/lib/shared/tax-math.test.ts
git commit -m "feat(tax): pure GST-inclusive split + threshold-aware TDS/TCS accrual math (TDD)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Fulfillment accrues per-sale tax

**Files:**
- Modify: `src/lib/server/fulfillment.ts`

- [ ] **Step 1: Add the accrual to `fulfillOrder`**

In `src/lib/server/fulfillment.ts`, immediately after the `fulfillOrder` ledger-insert block (the `if (ledgerErr) { console.error('[fulfillment] ledger insert failed for order', orderId, ledgerErr.message); }` closing brace, before the `// 4. Grant durable access` comment), insert:

```typescript
  // 3b. Phase 5 — accrue immutable per-sale tax (no balance change; RPC is idempotent). Non-fatal.
  if (creatorId) {
    const { error: taxErr } = await db.rpc('record_sale_tax', {
      p_creator_id: creatorId,
      p_gross: total,
      p_commission_gross: platformFee,
      p_order_id: orderId,
    });
    if (taxErr) console.error('[fulfillment] record_sale_tax failed for order', orderId, taxErr.message);
  }
```

- [ ] **Step 2: Add the accrual to `fulfillPaymentLinkSubmission`**

Immediately after the `fulfillPaymentLinkSubmission` ledger-insert block (the `if (ledgerErr) { console.error('[fulfillment] ledger insert failed for submission', submissionId, ledgerErr.message); }` closing brace, before the `if (creatorId) { ... notifications ... }` block), insert:

```typescript
  if (creatorId) {
    const { error: taxErr } = await db.rpc('record_sale_tax', {
      p_creator_id: creatorId,
      p_gross: amount,
      p_commission_gross: platformFee,
      p_submission_id: submissionId,
    });
    if (taxErr) console.error('[fulfillment] record_sale_tax failed for submission', submissionId, taxErr.message);
  }
```

- [ ] **Step 3: Compile + test**

Run: `npx tsc --noEmit` → exit 0. Run: `npm test` → all suites pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/fulfillment.ts
git commit -m "feat(tax): fulfillment accrues per-sale tax_transactions (order + payment-link)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Payout request — ₹20L GST gate + tax withholding

**Files:**
- Modify: `app/api/payouts/request/route.ts`

- [ ] **Step 1: Add the GST gate after the one-in-flight guard**

In `app/api/payouts/request/route.ts`, directly after the one-in-flight guard block (the `if (inflight && inflight.length > 0) { return ... 409 ... }` statement) and before the `// 2. Lock and Check Balance` comment, insert:

```typescript
    // Phase 5 risk control: block payout once GST registration is legally due (₹20L / ₹10L
    // special-category turnover) until the creator furnishes a GSTIN.
    const { data: gstGate } = await supabaseAdmin.rpc('gst_registration_required', { p_creator_id: profileId });
    if (gstGate === true) {
      return NextResponse.json(
        { error: 'Your sales have crossed the GST registration threshold. Add your GSTIN to withdraw.', code: 'gstin_required' },
        { status: 409 }
      );
    }
```

- [ ] **Step 2: Compute + persist the tax withholding after the payout row is inserted**

Find the payout-insert block that ends with:

```typescript
    if (payoutError) {
      return NextResponse.json({ error: 'Failed to record payout ledger.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, payout }, { status: 200 });
```

Replace it with:

```typescript
    if (payoutError || !payout) {
      return NextResponse.json({ error: 'Failed to record payout ledger.' }, { status: 500 });
    }

    // Phase 5: reserve the creator's unsettled pending tax against this payout and
    // record the withholding. net_amount is what the Cashfree transfer will send.
    const { data: taxData } = await supabaseAdmin.rpc('begin_payout_tax', {
      p_payout_id: payout.id,
      p_creator_id: profileId,
    });
    const tds = Number((taxData as { tds_withheld?: number } | null)?.tds_withheld ?? 0);
    const tcs = Number((taxData as { tcs_withheld?: number } | null)?.tcs_withheld ?? 0);
    const netAmount = Math.round((amount - tds - tcs) * 100) / 100;

    const { data: finalPayout } = await supabaseAdmin
      .from('creator_payouts')
      .update({ tds_withheld: tds, tcs_withheld: tcs, net_amount: netAmount })
      .eq('id', payout.id)
      .select()
      .single();

    return NextResponse.json({ success: true, payout: finalPayout ?? payout }, { status: 200 });
```

- [ ] **Step 3: Compile**

Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 4: Commit**

```bash
git add app/api/payouts/request/route.ts
git commit -m "feat(payouts): ₹20L GST gate (409 gstin_required) + TDS/TCS withholding on request" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Payout approve — transfer net_amount

**Files:**
- Modify: `app/api/admin/payouts/[id]/approve/route.ts`

- [ ] **Step 1: Select `net_amount`**

In `app/api/admin/payouts/[id]/approve/route.ts`, change the payout select:

```typescript
    const { data: payout } = await db.from('creator_payouts')
      .select('id, creator_id, amount, status, payout_method_id').eq('id', payoutId).maybeSingle();
```

to:

```typescript
    const { data: payout } = await db.from('creator_payouts')
      .select('id, creator_id, amount, net_amount, status, payout_method_id').eq('id', payoutId).maybeSingle();
```

- [ ] **Step 2: Transfer the net amount**

Change the transfer call:

```typescript
    const tr = await initiateTransfer({ transfer_id: payoutId, transfer_amount: Number(payout.amount), beneficiary_id: beneficiaryId, mode });
```

to:

```typescript
    // Phase 5: transfer net of TDS/TCS withheld at request time (falls back to amount for pre-Phase-5 payouts).
    const tr = await initiateTransfer({ transfer_id: payoutId, transfer_amount: Number(payout.net_amount ?? payout.amount), beneficiary_id: beneficiaryId, mode });
```

- [ ] **Step 3: Compile + commit**

Run: `npx tsc --noEmit` → exit 0.
```bash
git add app/api/admin/payouts/[id]/approve/route.ts
git commit -m "feat(payouts): approve transfers net_amount (post-withholding)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: GSTIN validation + `POST /api/kyc/gstin`

**Files:**
- Create: `src/lib/shared/gstin.ts`
- Test: `src/lib/shared/gstin.test.ts`
- Create: `app/api/kyc/gstin/route.ts`

- [ ] **Step 1: Write the failing GSTIN tests**

```typescript
import { describe, it, expect } from 'vitest';
import { isValidGstin } from './gstin';

describe('isValidGstin', () => {
  it('accepts a checksum-valid GSTIN', () => {
    expect(isValidGstin('27AAPFU0939F1ZV')).toBe(true);
  });
  it('rejects a wrong checksum digit', () => {
    expect(isValidGstin('27AAPFU0939F1ZX')).toBe(false);
  });
  it('rejects malformed strings', () => {
    expect(isValidGstin('')).toBe(false);
    expect(isValidGstin('27AAPFU0939F1Z')).toBe(false); // 14 chars
    expect(isValidGstin('27aapfu0939f1zv')).toBe(false); // lowercase
    expect(isValidGstin('ZZAAPFU0939F1ZV')).toBe(false); // non-digit state
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/lib/shared/gstin.test.ts` → FAIL.

- [ ] **Step 3: Write the implementation**

```typescript
// GSTIN format + checksum validation (offline). Format: 2-digit state, 10-char PAN,
// 1 entity char, 'Z', 1 checksum char. The 15th char is a mod-36 checksum over the first 14.

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function isValidGstin(gstin: string): boolean {
  if (typeof gstin !== 'string' || !GSTIN_RE.test(gstin)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = CHARS.indexOf(gstin[i]);
    const factor = i % 2 === 0 ? 1 : 2;
    const product = value * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }
  const checksum = (36 - (sum % 36)) % 36;
  return CHARS[checksum] === gstin[14];
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/lib/shared/gstin.test.ts` → all pass.

- [ ] **Step 5: Write the route**

Create `app/api/kyc/gstin/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { rateLimitKey } from '@/lib/server/rate-limit';
import { isValidGstin } from '@/lib/shared/gstin';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { gstin?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

    const gstin = typeof body.gstin === 'string' ? body.gstin.trim().toUpperCase() : '';
    if (!isValidGstin(gstin)) {
      return NextResponse.json({ error: 'Enter a valid 15-character GSTIN.' }, { status: 400 });
    }

    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });

    const allowed = await rateLimitKey(`gstin:${profileId}`, { max: 5, windowSeconds: 60 });
    if (!allowed) return NextResponse.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 });

    const db = createServiceClient();
    const { error } = await db
      .from('creator_kyc')
      .update({ gstin, gstin_verified: false, gstin_added_at: new Date().toISOString() })
      .eq('creator_id', profileId);
    if (error) return NextResponse.json({ error: 'Could not save GSTIN.' }, { status: 500 });

    return NextResponse.json({ ok: true, registered: true });
  } catch (e) {
    console.error('[kyc/gstin]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Compile + lint**

Run: `npx tsc --noEmit` → exit 0. Run: `npx eslint app/api/kyc/gstin/route.ts src/lib/shared/gstin.ts` → clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/shared/gstin.ts src/lib/shared/gstin.test.ts app/api/kyc/gstin/route.ts
git commit -m "feat(kyc): GSTIN validation (format+checksum) + POST /api/kyc/gstin" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Tax hooks

**Files:**
- Create: `src/hooks/commerce/useTax.ts`

- [ ] **Step 1: Write the hooks**

Create `src/hooks/commerce/useTax.ts`:

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export interface PayoutTaxPreview {
  tds: number;
  tcs: number;
  fy: string;
  fy_turnover: number;
  gstin_present: boolean;
  registration_required: boolean;
}

export function usePayoutTaxPreview() {
  return useQuery({
    queryKey: ['earnings', 'tax-preview'],
    queryFn: async (): Promise<PayoutTaxPreview> => {
      const { data, error } = await supabase.rpc('get_payout_tax_preview');
      if (error) throw error;
      return data as unknown as PayoutTaxPreview;
    },
  });
}

export interface TaxSummaryRow { fy: string; tds: number; tcs: number; gstOnCommission: number; gross: number; }

export function useTaxSummary() {
  return useQuery({
    queryKey: ['tax', 'summary'],
    queryFn: async (): Promise<TaxSummaryRow[]> => {
      const profileId = await getCreatorProfileId();
      const { data, error } = await supabase
        .from('tax_transactions')
        .select('fy, gross_amount, gst_on_commission, tds_amount, tcs_amount, status')
        .eq('creator_id', profileId);
      if (error) throw error;
      const byFy = new Map<string, TaxSummaryRow>();
      for (const r of data ?? []) {
        const sign = r.status === 'reversed' ? -1 : 1;
        const row = byFy.get(r.fy) ?? { fy: r.fy, tds: 0, tcs: 0, gstOnCommission: 0, gross: 0 };
        row.tds += sign * Number(r.tds_amount);
        row.tcs += sign * Number(r.tcs_amount);
        row.gstOnCommission += sign * Number(r.gst_on_commission);
        row.gross += sign * Number(r.gross_amount);
        byFy.set(r.fy, row);
      }
      return [...byFy.values()].sort((a, b) => b.fy.localeCompare(a.fy));
    },
  });
}

export function useAddGstin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gstin: string) => {
      const res = await fetch('/api/kyc/gstin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Could not save GSTIN.');
      return data as { ok: true; registered: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
      queryClient.invalidateQueries({ queryKey: ['tax'] });
    },
  });
}
```

- [ ] **Step 2: Compile**

Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/commerce/useTax.ts
git commit -m "feat(hooks): usePayoutTaxPreview + useTaxSummary + useAddGstin" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Earnings UI — withdraw tax preview + GST gate + GSTIN modal

**Files:**
- Modify: `app/dashboard/earnings/page.tsx`

The earnings page owns the withdraw `SideDrawer` and `ConfirmDialog`. Read the file first to locate the withdraw drawer body and the amount/confirm controls.

- [ ] **Step 1: Wire imports**

At the top of `app/dashboard/earnings/page.tsx` add:
```typescript
import { usePayoutTaxPreview, useAddGstin } from '@/hooks/commerce/useTax';
import { isValidGstin } from '@/lib/shared/gstin';
```
(The `lucide-react` `FileText` icon is added in Task 10, where the Tax card uses it — importing it now would trip `no-unused-vars` at this task's lint gate.)

- [ ] **Step 2: Read the preview + gate in the component**

Near the other `useEarnings()`-derived values (after `const frozen = …`), add:
```typescript
  const { data: taxPreview } = usePayoutTaxPreview();
  const addGstin = useAddGstin();
  const [gstinOpen, setGstinOpen] = useState(false);
  const [gstinValue, setGstinValue] = useState('');
  const [gstinError, setGstinError] = useState('');
  const registrationRequired = taxPreview?.registration_required ?? false;
  const previewTds = Number(taxPreview?.tds ?? 0);
  const previewTcs = Number(taxPreview?.tcs ?? 0);
```

- [ ] **Step 3: Add the tax preview + gate inside the withdraw drawer**

Inside the withdraw `SideDrawer`, directly above the drawer's submit/confirm button, insert this block (uses `drawerAmount` — the amount state already in the page — and `formatINR`):

```typescript
          {registrationRequired ? (
            <div className="rounded-[var(--radius-md)] bg-[var(--warning-bg)] border border-[var(--warning)]/20 p-3 space-y-2">
              <p className="text-sm font-semibold text-[var(--text-primary)]">GST registration required</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Your sales crossed the GST threshold. Add your GSTIN to continue withdrawing.
              </p>
              <button
                onClick={() => { setGstinOpen(true); }}
                className="w-full py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-semibold rounded-[var(--radius-sm)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                Add GSTIN
              </button>
            </div>
          ) : (previewTds > 0 || previewTcs > 0) ? (
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border)] p-3 text-xs space-y-1">
              <div className="flex justify-between text-[var(--text-secondary)]"><span>Amount</span><span>{formatINR(drawerAmount)}</span></div>
              {previewTds > 0 && <div className="flex justify-between text-[var(--text-secondary)]"><span>TDS withheld (194-O)</span><span>- {formatINR(previewTds)}</span></div>}
              {previewTcs > 0 && <div className="flex justify-between text-[var(--text-secondary)]"><span>TCS withheld (GST §52)</span><span>- {formatINR(previewTcs)}</span></div>}
              <div className="flex justify-between font-semibold text-[var(--text-primary)] pt-1 border-t border-[var(--border-subtle)]"><span>You receive</span><span>{formatINR(Math.max(drawerAmount - previewTds - previewTcs, 0))}</span></div>
            </div>
          ) : null}
```

Then make the drawer's submit button `disabled` when `registrationRequired` is true (add `|| registrationRequired` to the button's existing `disabled={…}` expression).

- [ ] **Step 4: Add the GSTIN modal**

Add this `ConfirmDialog`-style modal near the page's other overlays (e.g. right after the withdraw `ConfirmDialog`):

```typescript
      {gstinOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setGstinOpen(false)} />
          <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-sm p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Add your GSTIN</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Required to withdraw once your sales cross the GST registration threshold.</p>
            </div>
            <input
              value={gstinValue}
              onChange={(e) => { setGstinValue(e.target.value.toUpperCase()); setGstinError(''); }}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow font-mono tracking-wide"
            />
            {gstinError && <p className="text-xs text-[var(--danger)]">{gstinError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setGstinOpen(false)} className="flex-1 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] text-sm font-semibold rounded-[var(--radius-sm)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Cancel</button>
              <button
                onClick={async () => {
                  if (!isValidGstin(gstinValue)) { setGstinError('Enter a valid 15-character GSTIN.'); return; }
                  try { await addGstin.mutateAsync(gstinValue); setGstinOpen(false); }
                  catch (e) { setGstinError(e instanceof Error ? e.message : 'Could not save GSTIN.'); }
                }}
                disabled={addGstin.isPending}
                className="flex-1 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-semibold rounded-[var(--radius-sm)] transition disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                {addGstin.isPending ? 'Saving…' : 'Save GSTIN'}
              </button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` → exit 0. Run: `npx eslint app/dashboard/earnings/page.tsx` → no new errors. Run the color grep from `dashboard-design.md` against `app/dashboard/earnings/page.tsx` → zero hits.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/earnings/page.tsx
git commit -m "feat(earnings): withdraw TDS/TCS preview + ₹20L GST gate + GSTIN modal" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Earnings UI — Tax card + registration banner

**Files:**
- Modify: `app/dashboard/earnings/page.tsx`

- [ ] **Step 1: Read the summary**

Add near the other hooks in the component:
```typescript
  const { data: taxSummary } = useTaxSummary();
```
Extend the Task 8 import line to include `useTaxSummary`:
```typescript
import { usePayoutTaxPreview, useTaxSummary, useAddGstin } from '@/hooks/commerce/useTax';
```
Add `FileText` to the existing `lucide-react` import list (the Tax card in Step 3 uses it).

- [ ] **Step 2: Add the registration banner near the top of the page**

Directly under the `<PageHeader … />`, insert:
```typescript
      {registrationRequired && (
        <Card className="!bg-[var(--warning-bg)] !border-[var(--warning)]/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">GST registration required to withdraw</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Your FY sales crossed the ₹20L threshold. Add your GSTIN to continue.</p>
            </div>
            <button onClick={() => setGstinOpen(true)} className="shrink-0 px-3 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-semibold rounded-[var(--radius-sm)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Add GSTIN</button>
          </div>
        </Card>
      )}
```

- [ ] **Step 3: Add the Tax card**

After the "Balance Breakdown" `Card`, insert a Tax card (only when there's tax data for the current FY):
```typescript
      {!isLoading && (taxSummary?.length ?? 0) > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={14} className="text-[var(--text-tertiary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Tax withheld</h3>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mb-3">The 10% platform fee is GST-inclusive. TDS/TCS are withheld at withdrawal.</p>
          <div className="space-y-3">
            {taxSummary!.map((t) => (
              <div key={t.fy} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">FY {t.fy}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-[11px] text-[var(--text-tertiary)]">TDS 194-O</p><p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{formatINR(Math.max(t.tds, 0))}</p></div>
                  <div><p className="text-[11px] text-[var(--text-tertiary)]">TCS §52</p><p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{formatINR(Math.max(t.tcs, 0))}</p></div>
                  <div><p className="text-[11px] text-[var(--text-tertiary)]">GST on fee</p><p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{formatINR(Math.max(t.gstOnCommission, 0))}</p></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` → exit 0. Run: `npx eslint app/dashboard/earnings/page.tsx` → no new errors. Color grep → zero hits.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/earnings/page.tsx
git commit -m "feat(earnings): per-FY tax card + GST registration banner" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Docs sweep

**Files:**
- Modify: `.claude/rules/api-routes.md`, `.claude/rules/security-model.md`, `.claude/rules/hooks-reference.md`, `docs/db/money-path.md`, `docs/reference/dashboard-map.md`

- [ ] **Step 1: `api-routes.md`**

In the "At a glance" table add a row:
```markdown
| POST | `/api/kyc/gstin` | cookie session | server + service role | `creator_kyc` (gstin; format+checksum validated) |
```
Update the `/api/payouts/request` row's notes to add: "Phase 5 ₹20L GST gate → 409 `gstin_required`; computes + stores `tds_withheld`/`tcs_withheld`/`net_amount` via `begin_payout_tax`." Update the `/api/admin/payouts/[id]/approve` row to note the Cashfree transfer uses `net_amount`.
Add a `### POST /api/kyc/gstin (auth required)` section: body `{ gstin }`, format+checksum validation, 5/min profile-keyed rate limit, sets `creator_kyc.gstin` (+ `gstin_added_at`, `gstin_verified=false`); errors 400/401/404/429/500.

- [ ] **Step 2: `security-model.md`**

In "RLS — what's protected" add:
```markdown
| `tax_rules` | Readable by `authenticated` (rates/thresholds). **Writes: service role only.** |
| `tax_transactions` | Creator reads their own. **Writes: service role only** (record_sale_tax / settle_* RPCs). |
```
In "Revenue integrity rules" append:
```markdown
12. **Tax is accrue-per-sale / settle-at-payout.** `record_sale_tax` snapshots an immutable `tax_transactions` row at fulfillment (GST-inclusive commission split + threshold-aware pending TDS/TCS) — no balance change. `begin_payout_tax` reserves unsettled pending tax (net of `reversed` counter-rows) at payout; the transfer sends `net_amount`; `settle_payout` finalizes/releases and `settle_refund` writes the proportional reversal. Only these RPCs touch `tax_transactions`. `total_earnings`/`reconcile_creator_balances` are unaffected (a payout of ₹X counts as ₹X paid out regardless of the bank/govt split).
13. **GST registration gate.** `gst_registration_required` blocks payout (409) once FY turnover ≥ ₹20L (₹10L special-category states) until a GSTIN is furnished via `POST /api/kyc/gstin`.
```

- [ ] **Step 3: `hooks-reference.md`**

In the `commerce/` folder row append `useTax` (`usePayoutTaxPreview`, `useTaxSummary`, `useAddGstin`). In the normalized query-key table add:
```markdown
| `usePayoutTaxPreview()` | `['earnings','tax-preview']` |
| `useTaxSummary()` | `['tax','summary']` |
```

- [ ] **Step 4: `docs/db/money-path.md`**

Add a `## 9. Tax engine (GST/TDS/TCS)` section documenting: the three taxes + current rates, GST-inclusive commission split (₹1000 → fee ₹100 = ₹84.75 net + ₹15.25 GST), accrue-per-sale/settle-at-payout, the ₹5L TDS + ₹20L GST thresholds, the payout gate, refund reversal, and that the balance formula/reconcile are unchanged. Append a `### (e) Tax flow` smoke checklist: a sale writes `tax_transactions`; `fy_turnover` correct; crossing ₹5L starts TDS; a payout withholds + transfers `net_amount`; a refund writes a `reversed` row; `reconcile_creator_balances()` still 0 drift.

- [ ] **Step 5: `docs/reference/dashboard-map.md`**

Update the `/dashboard/earnings` entry: withdraw drawer now shows a TDS/TCS preview and a ₹20L GST gate + GSTIN modal; a per-FY Tax card and a registration banner; hooks `usePayoutTaxPreview`/`useTaxSummary`/`useAddGstin`; route `POST /api/kyc/gstin`.

- [ ] **Step 6: Commit**

```bash
git add .claude/rules/api-routes.md .claude/rules/security-model.md .claude/rules/hooks-reference.md docs/db/money-path.md docs/reference/dashboard-map.md
git commit -m "docs(phase5): tax route/RLS/rules/hooks/money-path/dashboard-map updates" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12: Final verification + blueprint state

**Files:**
- Modify: `.claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md`

- [ ] **Step 1: Full local gauntlet**

- `npx tsc --noEmit` → exit 0
- `npm run lint` → no new errors in Phase 5 files
- `npm test` → all suites pass (referrals, balance, kyc-crypto, platform-fee, refund-math, **tax-math**, **gstin**)

- [ ] **Step 2: Live sanity checks via MCP `execute_sql`**

```sql
select public.reconcile_creator_balances();               -- expect 0 (or only pre-existing drift)
select public.current_fy();                                -- expect current Indian FY label
select count(*) from public.tax_transactions;              -- expect 0 (nothing sold since deploy) or matches new sales
select public.get_payout_tax_preview();                    -- run as service role: returns {"error":"no_profile"} (no auth.uid) — OK
```

- [ ] **Step 3: Update the blueprint §0**

In `.claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md`: set Phase 5's row to **BUILT** with spec/plan links (`docs/superpowers/specs/2026-07-05-phase5-tax-engine-design.md` · `docs/superpowers/plans/2026-07-05-phase5-tax-engine.md`); note the accrue-per-sale/settle-at-payout model, the ₹20L GSTIN gate, and the GST-inclusive-commission decision; change "Next planned phase" to Phase 6 (invoices + statements/exports); record Phase 5 deferrals: documents/exports (Form 16A, GSTR-8/26Q/GSTR-1), live GSTIN/PAN verification, product-GST-rate capture, and the 4 CA-review flags from the spec §10.

- [ ] **Step 4: Commit**

```bash
git add ".claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md"
git commit -m "docs(blueprint): phase5 tax engine BUILT; next phase 6 (invoices/statements)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Out of scope (spec non-goals — do NOT build)

Form 16A / GSTR-8 / 26Q / GSTR-1 exports · PDF invoices · actual government remittance · live GSTIN/PAN API verification · product-level GST-rate capture · buyer-facing GST-on-sale pricing for registered creators · payment-link refund tax (pl_ refunds themselves are still deferred from Phase 4).

## References

- Spec: `docs/superpowers/specs/2026-07-05-phase5-tax-engine-design.md`
- Blueprint: `.claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md` §3, §7
- Patterns mirrored: Phase 4 refunds (`begin_refund`/`settle_refund`, freeze-then-settle), `settle_payout` (Phase 1), `refund-math` (pure TDD module)
