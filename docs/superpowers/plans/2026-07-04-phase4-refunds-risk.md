---
noteId: "95dba880779111f193a7f790bf9449ed"
tags: []

---

# Phase 4 — Refunds + Frozen Balance + Risk Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the refund engine (freeze → Cashfree PG refund → webhook-settled clawback), activate `frozen_balance`, add the agreed risk controls (one-in-flight payout, manual dispute freeze, `TRANSFER_REVERSED` clawback), and fix the gross-earnings fee double-count — per the approved spec `docs/superpowers/specs/2026-07-04-phase4-refunds-risk-design.md`.

**Architecture:** Mirrors the proven payout pattern: an atomic `begin_refund` RPC freezes the creator's net clawback and records a `processing` refund; the Cashfree `REFUND_STATUS_WEBHOOK` (same endpoint + HMAC gate as payments) calls an atomic `settle_refund` RPC that reverses balances, writes the ledger debit, flips the order, and revokes access — all claim-idempotent. Admin actions are terminal-script interim.

**Tech Stack:** Next.js 16 route handlers, Supabase (Postgres RPCs via MCP migrations), Cashfree PG REST v2023-08-01, TanStack Query v5, Vitest.

**Execution notes (read first):**
- Work directly on `main` (user preference). Commit after every task with the message given.
- DB changes are applied **live** via the Supabase MCP (`mcp__plugin_supabase_supabase__apply_migration`, project_id `qcendfisvyjnwmefruba`). The Windows `supabase` CLI is broken — never run `npx supabase db push`. Load MCP tools via ToolSearch first (e.g. `select:mcp__plugin_supabase_supabase__apply_migration,mcp__plugin_supabase_supabase__execute_sql`).
- Type regen on Windows uses the MCP fallback documented in `.claude/rules/supabase-reference.md` → "Regenerating types".
- **Verified Cashfree contract (2026-07-04, docs.cashfree.com):** `POST {base}/orders/{order_id}/refunds` body `{ refund_id (3–40 chars, required), refund_amount (required), refund_note (3–100 chars, optional), refund_speed (optional, default STANDARD) }`; response includes `cf_refund_id`, `refund_id`, `refund_status`. `GET {base}/orders/{order_id}/refunds/{refund_id}` returns the same entity. `refund_status ∈ {SUCCESS, PENDING, CANCELLED, ONHOLD, FAILED}`. Webhook `type: "REFUND_STATUS_WEBHOOK"` with `data.refund.{cf_refund_id, refund_id, order_id, refund_status, refund_amount, status_description, …}`, same `x-webhook-signature` gate as payment webhooks (same endpoint, already live). Mapping: `SUCCESS → settle 'success'`; `CANCELLED | FAILED → settle 'failed'`; `PENDING | ONHOLD → no-op`.

**File structure (what's created/modified):**

| File | Responsibility |
|---|---|
| `supabase/migrations/20260704000000_phase4_refunds_risk.sql` (new) | `refunds` + `wallet_frozen_logs` tables, RLS, indexes, 5 RPCs, payout `'reversed'` status, reconcile v2 |
| `supabase/migrations/20260704000001_gross_earnings_backfill.sql` (new) | Ledger-derived net→gross conversion, drift-logged, idempotent |
| `src/lib/shared/refund-math.ts` (new) | Pure isomorphic `computeRefundSplit` (server RPC re-computes authoritatively; client uses for preview) |
| `src/lib/shared/refund-math.test.ts` (new) | Unit tests for the split math |
| `src/lib/server/cashfree-refunds.ts` (new) | Thin PG refund REST client (`createRefund`, `getRefund`) — server only |
| `src/lib/server/refunds.ts` (new) | `initiateRefund` (RPC → gateway → reject-settle), `syncProcessingRefunds`, `RefundError` |
| `src/lib/server/fulfillment.ts` | Credit **gross** into `total_earnings` (2 call sites) |
| `src/lib/server/rate-limit.ts` | Add key-based `rateLimitKey` (profile-scoped limits) |
| `app/api/refunds/create/route.ts` (new) | Creator-initiated refunds |
| `app/api/webhook/cashfree/route.ts` | Type-aware routing: refund branch; unknown envelope → 200 |
| `app/api/webhook/cashfree-payout/route.ts` | `TRANSFER_REVERSED` branch |
| `app/api/payouts/request/route.ts` | One-in-flight payout guard |
| `scripts/refund-admin.ts` (new) | view / refund / sync / freeze / unfreeze |
| `src/hooks/commerce/useOrders.ts` | `useRefundOrder` mutation + `useOrderRefundInfo` preview query |
| `src/hooks/commerce/useEarnings.ts` | `frozen_balance: 0` in the empty-balance fallback |
| `app/dashboard/orders/page.tsx` | Refund panel in the order drawer |
| `app/dashboard/earnings/page.tsx` | Frozen line in Balance Breakdown |
| `types/database.types.ts` | Regenerated (never hand-edited) |
| Docs: `.claude/rules/api-routes.md`, `.claude/rules/security-model.md`, `.claude/rules/hooks-reference.md`, `.claude/rules/env-vars.md`, `docs/db/money-path.md`, `docs/reference/dashboard-map.md`, blueprint `11(half)` §0 | Same change-set |

---

### Task 1: Migration — refunds schema, frozen logs, RPCs, reconcile v2

**Files:**
- Create: `supabase/migrations/20260704000000_phase4_refunds_risk.sql`

- [ ] **Step 1: Write the migration file**

Write exactly this content to `supabase/migrations/20260704000000_phase4_refunds_risk.sql`:

```sql
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
```

- [ ] **Step 2: Apply the migration live via the Supabase MCP**

Load the MCP tools (`ToolSearch` query `select:mcp__plugin_supabase_supabase__apply_migration,mcp__plugin_supabase_supabase__execute_sql`), then call `apply_migration` with `project_id: "qcendfisvyjnwmefruba"`, `name: "phase4_refunds_risk"`, and `query` = the full file content above.
Expected: success (no error). Note: `reconcile_creator_balances` v2 note — pre-existing ledger drift (historical rows whose ledger insert failed, plus the not-yet-backfilled net-shape earnings) may now be flagged; that is expected until Task 4+5 land.

- [ ] **Step 3: Verify the objects exist**

Call `execute_sql` with:
```sql
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in ('begin_refund','settle_refund','freeze_creator_funds','release_frozen_funds','reverse_settled_payout')
order by proname;
```
Expected: 5 rows. Then:
```sql
select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and relname in ('refunds','wallet_frozen_logs');
```
Expected: 2 rows, both `relrowsecurity = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260704000000_phase4_refunds_risk.sql
git commit -m "feat(db): phase4 refunds schema — refunds + wallet_frozen_logs + settle RPCs + reconcile v2" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Regenerate Supabase types

**Files:**
- Modify: `types/database.types.ts` (regenerated, never hand-edited)

- [ ] **Step 1: Regenerate via the MCP fallback**

`npm run update-types` fails on Windows (no win32 binary). Use the MCP fallback from `.claude/rules/supabase-reference.md`: call `mcp__plugin_supabase_supabase__generate_typescript_types` (`project_id: "qcendfisvyjnwmefruba"`); the output lands in a tool-results `.txt` as `{"types":"…"}`. Strip the envelope:

```bash
python3 - <<'PY'
import json
src = r"<path-printed-by-the-tool-call>"
dst = r"types\database.types.ts"
with open(src, 'r', encoding='utf-8') as f:
    payload = json.load(f)
with open(dst, 'w', encoding='utf-8', newline='\n') as f:
    f.write(payload['types'])
PY
```

- [ ] **Step 2: Verify the new objects are in the types**

Run: `grep -n "begin_refund\|settle_refund\|wallet_frozen_logs\|reverse_settled_payout" types/database.types.ts | head -10` (or Grep tool).
Expected: matches for the `refunds` table, `wallet_frozen_logs` table, and all new RPC names.

- [ ] **Step 3: Compile check**

Run: `npx tsc --noEmit`
Expected: exit 0 (no code references the new types yet).

- [ ] **Step 4: Commit**

```bash
git add types/database.types.ts
git commit -m "chore(types): regen for phase4 refunds schema" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Pure refund split math (TDD)

**Files:**
- Create: `src/lib/shared/refund-math.ts`
- Test: `src/lib/shared/refund-math.test.ts`

Isomorphic (client preview + tests); the `begin_refund` RPC re-computes authoritatively in SQL — this module must implement the **same** rules (§3 of the spec).

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { computeRefundSplit } from './refund-math';

describe('computeRefundSplit', () => {
  it('full refund reverses the full fee (order nets to zero)', () => {
    expect(computeRefundSplit(1000, 100, 1000)).toEqual({
      amount: 1000, feeReversed: 100, netClawback: 900, completes: true,
    });
  });

  it('partial refund reverses the fee proportionally', () => {
    expect(computeRefundSplit(1000, 100, 400)).toEqual({
      amount: 400, feeReversed: 40, netClawback: 360, completes: false,
    });
  });

  it('rounds proportional fee to 2dp', () => {
    // fee 100 on 333 of 1000 → 33.3
    expect(computeRefundSplit(1000, 100, 333).feeReversed).toBe(33.3);
  });

  it('completing refund takes the fee remainder exactly (no paisa residue)', () => {
    const first = computeRefundSplit(1000, 100, 333);           // 33.3
    const second = computeRefundSplit(1000, 100, 667, 333, first.feeReversed);
    expect(second.completes).toBe(true);
    expect(first.feeReversed + second.feeReversed).toBe(100);   // 33.3 + 66.7
  });

  it('sums of partials never exceed the original fee', () => {
    const a = computeRefundSplit(999, 99.9, 500);
    const b = computeRefundSplit(999, 99.9, 499, 500, a.feeReversed);
    expect(b.completes).toBe(true);
    expect(Math.round((a.feeReversed + b.feeReversed) * 100) / 100).toBe(99.9);
  });

  it('rejects amounts below ₹1', () => {
    expect(() => computeRefundSplit(1000, 100, 0.5)).toThrow(RangeError);
    expect(() => computeRefundSplit(1000, 100, 0)).toThrow(RangeError);
    expect(() => computeRefundSplit(1000, 100, -5)).toThrow(RangeError);
  });

  it('rejects over-refund past the remaining amount', () => {
    expect(() => computeRefundSplit(1000, 100, 601, 400)).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/shared/refund-math.test.ts`
Expected: FAIL — cannot resolve `./refund-math`.

- [ ] **Step 3: Write the implementation**

```typescript
// Pure refund split math — isomorphic (client preview + unit tests).
// AUTHORITATIVE computation lives in the begin_refund Postgres RPC; this module
// implements the identical rules for UI previews. Proportional fee reversal:
// the platform returns its fee on the refunded portion; the completing refund
// takes the exact fee remainder so a fully refunded order nets to zero.

export interface RefundSplit {
  amount: number;
  feeReversed: number;
  netClawback: number;
  completes: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeRefundSplit(
  total: number,
  feeOriginal: number,
  amount: number,
  priorAmount = 0,
  priorFeeReversed = 0
): RefundSplit {
  const remaining = round2(total - priorAmount);
  if (!(amount >= 1)) throw new RangeError('Refund amount must be at least ₹1');
  if (amount > remaining) throw new RangeError('Refund amount exceeds the remaining refundable amount');

  const completes = round2(priorAmount + amount) === round2(total);
  const feeReversed = completes
    ? round2(feeOriginal - priorFeeReversed)
    : round2((feeOriginal * amount) / total);
  const netClawback = round2(amount - feeReversed);

  return { amount, feeReversed, netClawback, completes };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/shared/refund-math.test.ts`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shared/refund-math.ts src/lib/shared/refund-math.test.ts
git commit -m "feat(refunds): pure proportional split math (shared, unit-tested)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Fulfillment credits gross (fee double-count fix)

**Files:**
- Modify: `src/lib/server/fulfillment.ts:46-56` and `:256-266`

`total_earnings` must hold **gross** (the formula subtracts `total_platform_fees`; the earnings UI labels it "Lifetime gross revenue"). Today both fulfill paths credit net, under-reporting available by the fee.

- [ ] **Step 1: Fix `fulfillOrder`**

In `src/lib/server/fulfillment.ts`, find (around line 46):

```typescript
  const total = Number(claimed.total_amount) || 0;
  const feeRate = await getPlatformFeeRate(creatorId);
  const platformFee = total * feeRate;
  const creatorProceeds = total - platformFee;

  // 2. Credit creator (atomic RPC — no read-modify-write race)
  if (creatorId) {
    const { error: creditErr } = await db.rpc('credit_creator_balance', {
      p_creator_id: creatorId,
      p_earnings_delta: creatorProceeds,
      p_fees_delta: platformFee,
    });
```

Replace with:

```typescript
  const total = Number(claimed.total_amount) || 0;
  const feeRate = await getPlatformFeeRate(creatorId);
  const platformFee = total * feeRate;
  const creatorProceeds = total - platformFee;

  // 2. Credit creator (atomic RPC — no read-modify-write race).
  // total_earnings holds GROSS; availableBalance() subtracts total_platform_fees.
  if (creatorId) {
    const { error: creditErr } = await db.rpc('credit_creator_balance', {
      p_creator_id: creatorId,
      p_earnings_delta: total,
      p_fees_delta: platformFee,
    });
```

- [ ] **Step 2: Fix `fulfillPaymentLinkSubmission`**

Find (around line 256):

```typescript
  const amount = Number(claimed.amount) || 0;
  const feeRate = await getPlatformFeeRate(creatorId);
  const platformFee = amount * feeRate;
  const creatorProceeds = amount - platformFee;

  if (creatorId) {
    const { error: creditErr } = await db.rpc('credit_creator_balance', {
      p_creator_id: creatorId,
      p_earnings_delta: creatorProceeds,
      p_fees_delta: platformFee,
    });
```

Replace with:

```typescript
  const amount = Number(claimed.amount) || 0;
  const feeRate = await getPlatformFeeRate(creatorId);
  const platformFee = amount * feeRate;
  const creatorProceeds = amount - platformFee;

  if (creatorId) {
    // total_earnings holds GROSS; availableBalance() subtracts total_platform_fees.
    const { error: creditErr } = await db.rpc('credit_creator_balance', {
      p_creator_id: creatorId,
      p_earnings_delta: amount,
      p_fees_delta: platformFee,
    });
```

(`creatorProceeds` stays — the referral cap, notifications, and ledger `meta.net_amount` still use it.)

- [ ] **Step 3: Compile + test**

Run: `npx tsc --noEmit` → exit 0. Run: `npm test` → all pass (referrals + balance + refund-math suites).

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/fulfillment.ts
git commit -m "fix(money): credit gross into total_earnings — fee was double-counted in available balance" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Gross-earnings backfill migration

**Files:**
- Create: `supabase/migrations/20260704000001_gross_earnings_backfill.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Phase 4 — one-time net→gross conversion of creator_balances.total_earnings (2026-07-04)
-- Spec §2/§4.4: docs/superpowers/specs/2026-07-04-phase4-refunds-risk-design.md
-- Ledger-derived and shape-matched: converts ONLY rows still in the old net shape
-- (earnings == ledger_gross − ledger_fees). Idempotent — a converted row no longer
-- matches, so re-runs are no-ops. Rows matching neither shape are logged for manual
-- review, never guessed (money never silently rewrites itself).
-- Run AFTER the fulfillment gross-credit code change is deployed.

with ledger_sums as (
  select creator_id,
         coalesce(sum(amount), 0) as gross,
         coalesce(sum((meta->>'platform_fee')::numeric), 0) as fees
    from public.transaction_ledger
   where direction = 'credit'
     and tx_type in ('sale','payment_link','referral_commission')
     and creator_id is not null
   group by creator_id
)
update public.creator_balances cb
   set total_earnings = ls.gross
  from ledger_sums ls
 where cb.creator_id = ls.creator_id
   and cb.total_earnings = ls.gross - ls.fees   -- old net shape only
   and cb.total_earnings <> ls.gross;           -- skip when fees are 0 (already correct)

-- Log anything still not in gross shape (neither net nor gross → pre-existing drift).
with ledger_sums as (
  select creator_id,
         coalesce(sum(amount), 0) as gross
    from public.transaction_ledger
   where direction = 'credit'
     and tx_type in ('sale','payment_link','referral_commission')
     and creator_id is not null
   group by creator_id
)
insert into public.balance_reconciliation_log (creator_id, field, cached_value, expected_value, drift)
select cb.creator_id, 'total_earnings', cb.total_earnings,
       coalesce(ls.gross, 0), cb.total_earnings - coalesce(ls.gross, 0)
  from public.creator_balances cb
  left join ledger_sums ls on ls.creator_id = cb.creator_id
 where cb.total_earnings <> coalesce(ls.gross, 0);
```

- [ ] **Step 2: Apply via MCP + verify idempotence**

Call `apply_migration` (`project_id: "qcendfisvyjnwmefruba"`, `name: "gross_earnings_backfill"`, `query` = file content). Then verify with `execute_sql`:

```sql
select cb.creator_id, cb.total_earnings, cb.total_platform_fees,
       (select coalesce(sum(amount),0) from transaction_ledger tl
         where tl.creator_id = cb.creator_id and tl.direction = 'credit'
           and tl.tx_type in ('sale','payment_link','referral_commission')) as ledger_gross
  from creator_balances cb;
```
Expected: for converted rows `total_earnings = ledger_gross`. Rows logged to `balance_reconciliation_log` (if any) are pre-existing drift — report them to the user, do not "fix" them.
Then run the UPDATE statement once more via `execute_sql` (paste the first CTE statement only): expected `UPDATE 0` — idempotence proven.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260704000001_gross_earnings_backfill.sql
git commit -m "fix(db): backfill total_earnings net->gross from ledger (shape-matched, idempotent)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Cashfree PG refund client

**Files:**
- Create: `src/lib/server/cashfree-refunds.ts`

- [ ] **Step 1: Write the client**

```typescript
// Cashfree PG refunds client (v2023-08-01) — SERVER ONLY. Never import client-side.
// Same PG credentials + base URL convention as /api/checkout/create.
// Contract verified 2026-07-04: POST /orders/{order_id}/refunds { refund_id, refund_amount,
// refund_note? } → { cf_refund_id, refund_status, ... }; GET returns the same entity.
// refund_status ∈ SUCCESS | PENDING | CANCELLED | ONHOLD | FAILED.

const CASHFREE_ENV = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

function headers() {
  return {
    'Content-Type': 'application/json',
    'x-api-version': '2023-08-01',
    'x-client-id': process.env.CASHFREE_CLIENT_ID!,
    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET!,
  };
}

export interface CreateRefundInput {
  gatewayOrderId: string;   // orders.gateway_order_id (Cashfree order_id)
  refundId: string;         // our refunds.merchant_refund_id (idempotency key at Cashfree)
  amount: number;
  note?: string | null;
}

export async function createRefund(input: CreateRefundInput): Promise<{
  accepted: boolean;
  cfRefundId: string | null;
  httpStatus: number;
  raw: unknown;
}> {
  const note = input.note?.trim();
  const body: Record<string, unknown> = {
    refund_id: input.refundId,
    refund_amount: input.amount,
    // refund_note must be 3–100 chars when present
    ...(note && note.length >= 3 ? { refund_note: note.slice(0, 100) } : {}),
  };
  const res = await fetch(
    `${CASHFREE_ENV}/orders/${encodeURIComponent(input.gatewayOrderId)}/refunds`,
    { method: 'POST', headers: headers(), body: JSON.stringify(body), cache: 'no-store' }
  );
  const raw = await res.json().catch(() => ({}));
  const msg = JSON.stringify(raw).toLowerCase();
  // A duplicate refund_id means our earlier attempt reached Cashfree — treat as accepted
  // (the webhook/sync settles it), mirroring the payouts already-exists handling.
  const accepted = res.ok || msg.includes('already exist');
  const cfRefundId = (raw as { cf_refund_id?: string | number })?.cf_refund_id != null
    ? String((raw as { cf_refund_id?: string | number }).cf_refund_id)
    : null;
  return { accepted, cfRefundId, httpStatus: res.status, raw };
}

export async function getRefund(gatewayOrderId: string, refundId: string): Promise<{
  status: string | null;    // SUCCESS | PENDING | CANCELLED | ONHOLD | FAILED
  cfRefundId: string | null;
  httpStatus: number;
  raw: unknown;
}> {
  const res = await fetch(
    `${CASHFREE_ENV}/orders/${encodeURIComponent(gatewayOrderId)}/refunds/${encodeURIComponent(refundId)}`,
    { headers: headers(), cache: 'no-store' }
  );
  const raw = await res.json().catch(() => ({}));
  const entity = raw as { refund_status?: string; cf_refund_id?: string | number };
  return {
    status: entity?.refund_status ?? null,
    cfRefundId: entity?.cf_refund_id != null ? String(entity.cf_refund_id) : null,
    httpStatus: res.status,
    raw,
  };
}
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/cashfree-refunds.ts
git commit -m "feat(refunds): cashfree PG refund client (create/get, v2023-08-01)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Refund server lib — initiate + sync

**Files:**
- Create: `src/lib/server/refunds.ts`

- [ ] **Step 1: Write the lib**

```typescript
// Refund engine — SERVER ONLY. Single initiation path shared by the creator route
// and scripts/refund-admin.ts. Architecture (spec §5): begin_refund RPC freezes the
// clawback atomically → Cashfree create → gateway reject settles 'failed' immediately
// (freeze released). Terminal states arrive via the PG webhook or syncProcessingRefunds.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database.types';
import { createRefund, getRefund } from './cashfree-refunds';

type Db = SupabaseClient<Database>;

export type RefundErrorCode =
  | 'not_found' | 'invalid_state' | 'over_refund' | 'missing_ledger' | 'gateway' | 'internal';

export class RefundError extends Error {
  constructor(public code: RefundErrorCode, message: string) {
    super(message);
    this.name = 'RefundError';
  }
}

// begin_refund raises 'refund:<marker>' — map markers to app-level error codes.
const RPC_ERROR_MAP: Array<{ marker: string; code: RefundErrorCode; message: string }> = [
  { marker: 'refund:order_not_found', code: 'not_found', message: 'Order not found.' },
  { marker: 'refund:order_not_completed', code: 'invalid_state', message: 'Only completed orders can be refunded.' },
  { marker: 'refund:order_not_paid', code: 'invalid_state', message: 'This order has no gateway payment to refund.' },
  { marker: 'refund:order_missing_creator', code: 'invalid_state', message: 'Order has no creator attached.' },
  { marker: 'refund:sale_ledger_missing', code: 'missing_ledger', message: 'Order is missing its sale ledger record — contact support.' },
  { marker: 'refund:amount_too_small', code: 'over_refund', message: 'Minimum refund is ₹1.' },
  { marker: 'refund:over_refund', code: 'over_refund', message: 'Amount exceeds the remaining refundable amount.' },
  { marker: 'refund:fee_split_anomaly', code: 'internal', message: 'Refund split anomaly — contact support.' },
  // Unique partial index uq_refunds_one_processing_per_order (Task 11 migration): only one
  // in-flight refund per order — double-submit dedupe at the DB level.
  { marker: 'uq_refunds_one_processing_per_order', code: 'invalid_state', message: 'A refund for this order is already processing.' },
];

export interface InitiateRefundInput {
  orderId: string;
  amount?: number | null;     // null/undefined = full remaining
  reason?: string | null;
  initiatedBy: 'creator' | 'admin';
  initiatorId?: string | null;
}

export interface InitiatedRefund {
  refundId: string;
  merchantRefundId: string;
  amount: number;
  feeReversed: number;
  netClawback: number;
  creatorId: string;
}

interface BeginRefundResult {
  refund_id: string;
  merchant_refund_id: string;
  gateway_order_id: string;
  creator_id: string;
  amount: number;
  fee_reversed: number;
  net_clawback: number;
}

export async function initiateRefund(db: Db, input: InitiateRefundInput): Promise<InitiatedRefund> {
  const { data, error } = await db.rpc('begin_refund', {
    p_order_id: input.orderId,
    p_amount: input.amount ?? undefined,
    p_reason: input.reason ?? undefined,
    p_initiated_by: input.initiatedBy,
    p_initiator_id: input.initiatorId ?? undefined,
  });

  if (error) {
    const hit = RPC_ERROR_MAP.find((m) => error.message.includes(m.marker));
    if (hit) throw new RefundError(hit.code, hit.message);
    throw new RefundError('internal', `Refund initiation failed: ${error.message}`);
  }

  const begun = data as unknown as BeginRefundResult;

  const cf = await createRefund({
    gatewayOrderId: begun.gateway_order_id,
    refundId: begun.merchant_refund_id,
    amount: begun.amount,
    note: input.reason,
  });

  if (!cf.accepted) {
    // Release the hold immediately — no money moved. Idempotent (status claim).
    await db.rpc('settle_refund', {
      p_refund_id: begun.refund_id,
      p_terminal: 'failed',
      p_failure_reason: 'gateway_reject',
      p_gateway_metadata: { stage: 'create_reject', http_status: cf.httpStatus } as Json,
    });
    throw new RefundError('gateway', 'Payment gateway rejected the refund. The hold was released — try again later.');
  }

  if (cf.cfRefundId) {
    await db.from('refunds').update({ gateway_refund_id: cf.cfRefundId }).eq('id', begun.refund_id);
  }

  return {
    refundId: begun.refund_id,
    merchantRefundId: begun.merchant_refund_id,
    amount: begun.amount,
    feeReversed: begun.fee_reversed,
    netClawback: begun.net_clawback,
    creatorId: begun.creator_id,
  };
}

const SYNC_STALE_MINUTES = 15;  // matches /api/admin/payouts/sync

// Reconcile stuck 'processing' refunds by polling Cashfree. Terminal map is the
// verified contract: SUCCESS → success; CANCELLED/FAILED → failed; PENDING/ONHOLD →
// leave processing. Confirmed 404 past the stale cutoff = the refund never reached
// Cashfree (create failed after begin_refund) → settle failed, releasing the hold.
export async function syncProcessingRefunds(db: Db): Promise<{ checked: number; settled: number }> {
  const cutoff = new Date(Date.now() - SYNC_STALE_MINUTES * 60_000).toISOString();
  const { data: stuck } = await db
    .from('refunds')
    .select('id, merchant_refund_id, created_at, orders(gateway_order_id)')
    .eq('status', 'processing')
    .lt('created_at', cutoff)
    .limit(50);

  let settled = 0;
  for (const r of stuck ?? []) {
    const order = Array.isArray(r.orders) ? r.orders[0] : r.orders;
    if (!order?.gateway_order_id) continue;
    const { status, cfRefundId, httpStatus } = await getRefund(order.gateway_order_id, r.merchant_refund_id);
    const s = (status ?? '').toUpperCase();
    if (s === 'SUCCESS') {
      await db.rpc('settle_refund', {
        p_refund_id: r.id, p_terminal: 'success', p_gateway_refund_id: cfRefundId ?? undefined,
        p_gateway_metadata: { synced: true, status: s } as Json,
      });
      settled++;
    } else if (s === 'CANCELLED' || s === 'FAILED') {
      await db.rpc('settle_refund', {
        p_refund_id: r.id, p_terminal: 'failed', p_gateway_refund_id: cfRefundId ?? undefined,
        p_gateway_metadata: { synced: true, status: s } as Json, p_failure_reason: `synced_${s}`,
      });
      settled++;
    } else if (httpStatus === 404) {
      await db.rpc('settle_refund', {
        p_refund_id: r.id, p_terminal: 'failed',
        p_gateway_metadata: { synced: true, not_found: true } as Json, p_failure_reason: 'refund_not_found',
      });
      settled++;
    }
    // else PENDING/ONHOLD → leave processing.
  }
  return { checked: stuck?.length ?? 0, settled };
}
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit` → exit 0. (If the generated `begin_refund` arg types demand `null` instead of `undefined` for optional params, pass `null` — match the generated signature.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/refunds.ts
git commit -m "feat(refunds): initiateRefund + syncProcessingRefunds engine lib" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: PG webhook — type-aware routing + refund branch

**Files:**
- Modify: `app/api/webhook/cashfree/route.ts`

- [ ] **Step 1: Add the refund branch and fix the unknown-envelope 400**

After the `const payload = JSON.parse(rawBody);` line and the existing field reads, restructure the top of the handler body. Replace this block:

```typescript
    const payload = JSON.parse(rawBody);
    const gatewayOrderId: string | undefined = payload.data?.order?.order_id;
    const cfStatus: string | undefined = payload.data?.payment?.payment_status;
    const gatewayPaymentId: string | undefined =
      payload.data?.payment?.cf_payment_id != null
        ? String(payload.data.payment.cf_payment_id)
        : undefined;

    if (!gatewayOrderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    const db = createServiceClient();
```

with:

```typescript
    const payload = JSON.parse(rawBody);
    const db = createServiceClient();

    // ── Refund webhooks (REFUND_STATUS_WEBHOOK: data.refund envelope) ──
    // Same endpoint + signature gate as payment webhooks. SUCCESS settles the
    // clawback; CANCELLED/FAILED releases the hold; PENDING/ONHOLD are no-ops.
    if (payload.type === 'REFUND_STATUS_WEBHOOK' || payload.data?.refund) {
      const r = payload.data?.refund ?? {};
      const merchantRefundId: string | undefined = r.refund_id;
      const cfRefundId = r.cf_refund_id != null ? String(r.cf_refund_id) : undefined;
      const refundStatus = String(r.refund_status ?? '').toUpperCase();

      if (!merchantRefundId) return NextResponse.json({ received: true });

      const { data: refund } = await db
        .from('refunds')
        .select('id, creator_id, amount')
        .eq('merchant_refund_id', merchantRefundId)
        .maybeSingle();
      if (!refund) {
        console.warn('[webhook/cashfree] Refund not found for refund_id:', merchantRefundId);
        return NextResponse.json({ received: true }); // stray/test event — no retry storms
      }

      if (refundStatus === 'SUCCESS' || refundStatus === 'CANCELLED' || refundStatus === 'FAILED') {
        const terminal = refundStatus === 'SUCCESS' ? 'success' : 'failed';
        const { data: settled, error: settleErr } = await db.rpc('settle_refund', {
          p_refund_id: refund.id,
          p_terminal: terminal,
          p_gateway_refund_id: cfRefundId,
          p_gateway_metadata: {
            refund_status: refundStatus,
            status_description: r.status_description ?? null,
          },
          p_failure_reason: terminal === 'failed' ? `gateway_${refundStatus}` : undefined,
        });
        // Real DB failure → 500 so Cashfree retries (claim makes retries safe no-ops).
        if (settleErr) {
          console.error('[webhook/cashfree] settle_refund failed', settleErr.message);
          return NextResponse.json({ error: 'processing failed' }, { status: 500 });
        }
        if (settled === true && terminal === 'success' && refund.creator_id) {
          await db.from('notifications').insert({
            recipient_creator_id: refund.creator_id,
            title: 'Refund processed',
            message: `₹${Number(refund.amount).toFixed(0)} was refunded to a buyer and deducted from your balance`,
            type: 'refund',
          });
        }
      }
      // PENDING / ONHOLD → acknowledge without action.
      return NextResponse.json({ received: true });
    }

    // ── Payment webhooks ──
    const gatewayOrderId: string | undefined = payload.data?.order?.order_id;
    const cfStatus: string | undefined = payload.data?.payment?.payment_status;
    const gatewayPaymentId: string | undefined =
      payload.data?.payment?.cf_payment_id != null
        ? String(payload.data.payment.cf_payment_id)
        : undefined;

    // Unknown envelope (no order, no refund) → ack. A 400 here caused Cashfree
    // retry storms for any non-payment event type.
    if (!gatewayOrderId) {
      return NextResponse.json({ received: true });
    }
```

(The rest of the handler — `pl_` routing and product orders — is unchanged and keeps using the `db` now created at the top. The old `const db = createServiceClient();` line was part of the replaced block, so no duplicate remains.)

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit` → exit 0. Verify there is exactly one `createServiceClient()` call in the file: `grep -c "createServiceClient()" app/api/webhook/cashfree/route.ts` → 1.

- [ ] **Step 3: Commit**

```bash
git add app/api/webhook/cashfree/route.ts
git commit -m "feat(webhook): REFUND_STATUS_WEBHOOK settles refunds; unknown envelopes ack 200" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Payout webhook — TRANSFER_REVERSED clawback

**Files:**
- Modify: `app/api/webhook/cashfree-payout/route.ts`

- [ ] **Step 1: Add the branch**

Replace this block:

```typescript
    let settleErr: { message: string } | null = null;
    if (event === 'TRANSFER_SUCCESS') {
      ({ error: settleErr } = await db.rpc('settle_payout', { p_payout_id: transferId, p_terminal: 'success', p_gateway_payout_id: params.referenceId, p_gateway_metadata: params as Json }));
    } else if (event === 'TRANSFER_FAILED') {
      ({ error: settleErr } = await db.rpc('settle_payout', { p_payout_id: transferId, p_terminal: 'failed', p_gateway_payout_id: params.referenceId, p_gateway_metadata: params as Json, p_failure_reason: params.reason ?? 'transfer_failed' }));
    }
```

with:

```typescript
    let settleErr: { message: string } | null = null;
    if (event === 'TRANSFER_SUCCESS') {
      ({ error: settleErr } = await db.rpc('settle_payout', { p_payout_id: transferId, p_terminal: 'success', p_gateway_payout_id: params.referenceId, p_gateway_metadata: params as Json }));
    } else if (event === 'TRANSFER_FAILED') {
      ({ error: settleErr } = await db.rpc('settle_payout', { p_payout_id: transferId, p_terminal: 'failed', p_gateway_payout_id: params.referenceId, p_gateway_metadata: params as Json, p_failure_reason: params.reason ?? 'transfer_failed' }));
    } else if (event === 'TRANSFER_REVERSED') {
      // In-flight reversal = failure (releases the hold). Post-success reversal =
      // clawback: money came back, total_paid_out shrinks, ledger gets a credit.
      const { data: failedInFlight, error: e1 } = await db.rpc('settle_payout', {
        p_payout_id: transferId, p_terminal: 'failed', p_gateway_payout_id: params.referenceId,
        p_gateway_metadata: params as Json, p_failure_reason: 'transfer_reversed', p_expect_status: 'processing',
      });
      if (e1) {
        settleErr = e1;
      } else if (failedInFlight !== true) {
        ({ error: settleErr } = await db.rpc('reverse_settled_payout', {
          p_payout_id: transferId, p_reason: 'transfer_reversed', p_gateway_metadata: params as Json,
        }));
      }
    }
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/api/webhook/cashfree-payout/route.ts
git commit -m "feat(payouts): TRANSFER_REVERSED — in-flight fails, settled payouts claw back via reverse_settled_payout" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: One-in-flight payout guard

**Files:**
- Modify: `app/api/payouts/request/route.ts`

- [ ] **Step 1: Add the guard**

In `app/api/payouts/request/route.ts`, directly after the KYC check block (after the `if (!kyc || kyc.status !== 'verified') { … 403 … }` statement) and before the `// 2. Lock and Check Balance` comment, insert:

```typescript
    // Risk control: one in-flight payout at a time. Belt-and-braces with the
    // optimistic pending_payout guard below (racers lose the .eq match anyway).
    const { data: inflight } = await supabaseAdmin
      .from('creator_payouts')
      .select('id')
      .eq('creator_id', profileId)
      .in('status', ['pending', 'processing'])
      .limit(1);
    if (inflight && inflight.length > 0) {
      return NextResponse.json(
        { error: 'You already have a payout in progress. Wait for it to complete before requesting another.' },
        { status: 409 }
      );
    }
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/api/payouts/request/route.ts
git commit -m "feat(payouts): one-in-flight payout guard (409 while pending/processing exists)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Key-based rate limit + creator refund route

**Files:**
- Create: `supabase/migrations/20260704000002_one_processing_refund_per_order.sql`
- Modify: `src/lib/server/rate-limit.ts`
- Create: `app/api/refunds/create/route.ts`

- [ ] **Step 0: Double-submit dedupe migration (Task 1 quality-review follow-up)**

`begin_refund` legitimately allows multiple partials, so a rapid double-submit of the same refund would fire twice. Enforce one in-flight refund per order at the DB level. Create `supabase/migrations/20260704000002_one_processing_refund_per_order.sql`:

```sql
-- Phase 4 follow-up — double-submit dedupe (Task 1 quality review):
-- at most ONE in-flight ('processing') refund per order. Sequential partials still
-- work (wait for the previous to settle). A concurrent second begin_refund insert
-- fails with a unique violation naming this index; src/lib/server/refunds.ts maps
-- it to a friendly 'already processing' error.
create unique index if not exists uq_refunds_one_processing_per_order
  on public.refunds (order_id) where status = 'processing';
```

Apply via MCP `apply_migration` (`project_id: "qcendfisvyjnwmefruba"`, `name: "one_processing_refund_per_order"`). Verify with `execute_sql`: `select indexname from pg_indexes where tablename = 'refunds' and indexname = 'uq_refunds_one_processing_per_order';` → 1 row. (The `RPC_ERROR_MAP` entry for this index name is already in Task 7's `refunds.ts`.)

- [ ] **Step 1: Add `rateLimitKey` and refactor `rateLimit` onto it**

Replace the whole body of `src/lib/server/rate-limit.ts` below the `RateLimitOptions` interface with:

```typescript
export async function rateLimitKey(key: string, opts: RateLimitOptions): Promise<boolean> {
  try {
    const db = createServiceClient();
    const { data, error } = await db.rpc('check_rate_limit', {
      p_key: key,
      p_max: opts.max,
      p_window_seconds: opts.windowSeconds,
    });
    if (error) {
      console.error('[rate-limit]', key, error.message);
      return true; // fail open
    }
    return data === true;
  } catch (err) {
    console.error('[rate-limit]', key, err);
    return true; // fail open
  }
}

export async function rateLimit(
  req: Request,
  routeName: string,
  opts: RateLimitOptions
): Promise<boolean> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 32);
  return rateLimitKey(`${routeName}:${ipHash}`, opts);
}
```

(Keep the file-top comment, imports, and the `RateLimitOptions` interface unchanged.)

- [ ] **Step 2: Write the route**

Create `app/api/refunds/create/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { rateLimitKey } from '@/lib/server/rate-limit';
import { initiateRefund, RefundError } from '@/lib/server/refunds';

const ERROR_STATUS: Record<string, number> = {
  not_found: 404,
  invalid_state: 409,
  over_refund: 400,
  missing_ledger: 409,
  gateway: 502,
  internal: 500,
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { orderId?: string; amount?: number; reason?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const orderId = typeof body.orderId === 'string' ? body.orderId : '';
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
      return NextResponse.json({ error: 'Invalid orderId.' }, { status: 400 });
    }
    const amount = body.amount == null ? null : Number(body.amount);
    if (amount != null && (!Number.isFinite(amount) || amount < 1)) {
      return NextResponse.json({ error: 'Refund amount must be at least ₹1.' }, { status: 400 });
    }
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null;

    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) {
      return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });
    }

    const allowed = await rateLimitKey(`refund:${profileId}`, { max: 5, windowSeconds: 60 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many refund requests. Try again in a minute.' }, { status: 429 });
    }

    const db = createServiceClient();
    const { data: order } = await db
      .from('orders')
      .select('id, creator_id')
      .eq('id', orderId)
      .maybeSingle();
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    if (order.creator_id !== profileId) {
      return NextResponse.json({ error: 'You can only refund your own orders.' }, { status: 403 });
    }

    const refund = await initiateRefund(db, {
      orderId,
      amount,
      reason,
      initiatedBy: 'creator',
      initiatorId: profileId,
    });

    return NextResponse.json({ success: true, refund });
  } catch (e) {
    if (e instanceof RefundError) {
      return NextResponse.json({ error: e.message }, { status: ERROR_STATUS[e.code] ?? 500 });
    }
    console.error('[refunds/create]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Compile + lint**

Run: `npx tsc --noEmit` → exit 0. Run: `npm run lint` → no new errors in the touched files.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/rate-limit.ts app/api/refunds/create/route.ts
git commit -m "feat(refunds): creator-initiated POST /api/refunds/create (own-order, 5/min, profile-keyed limit)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12: Terminal admin script

**Files:**
- Create: `scripts/refund-admin.ts`

- [ ] **Step 1: Write the script**

```typescript
// Terminal admin for refunds + balance freezes (interim until the admin app). Service-role.
//   npx tsx --env-file=.env.local scripts/refund-admin.ts view     <orderId|creatorId>
//   npx tsx --env-file=.env.local scripts/refund-admin.ts refund   <orderId> [amount] [--reason "..."]
//   npx tsx --env-file=.env.local scripts/refund-admin.ts sync
//   npx tsx --env-file=.env.local scripts/refund-admin.ts freeze   <creatorId> <amount> --reason "..." [--source dispute|manual]
//   npx tsx --env-file=.env.local scripts/refund-admin.ts unfreeze <logId> [--note "..."]
import { createServiceClient } from '../lib/supabase/service';
import { initiateRefund, syncProcessingRefunds, RefundError } from '../src/lib/server/refunds';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const [cmd, target, third] = process.argv.slice(2);
  const db = createServiceClient();

  if (cmd === 'view') {
    if (!target) throw new Error('usage: refund-admin view <orderId|creatorId>');
    const { data: byOrder } = await db.from('refunds')
      .select('id, order_id, amount, fee_reversed, net_clawback, status, initiated_by, failure_reason, created_at, processed_at')
      .eq('order_id', target).order('created_at', { ascending: false });
    const { data: byCreator } = await db.from('refunds')
      .select('id, order_id, amount, fee_reversed, net_clawback, status, initiated_by, failure_reason, created_at, processed_at')
      .eq('creator_id', target).order('created_at', { ascending: false }).limit(20);
    const refunds = (byOrder?.length ? byOrder : byCreator) ?? [];
    console.log('refunds:', refunds.length ? refunds : '(none)');
    const { data: logs } = await db.from('wallet_frozen_logs')
      .select('id, amount, reason, status, source, refund_id, created_at, released_at')
      .eq('creator_id', target).order('created_at', { ascending: false }).limit(20);
    if (logs?.length) console.log('frozen logs:', logs);
    const { data: bal } = await db.from('creator_balances')
      .select('total_earnings, total_platform_fees, total_paid_out, pending_payout, frozen_balance')
      .eq('creator_id', target).maybeSingle();
    if (bal) console.log('balance:', bal);
  } else if (cmd === 'refund') {
    if (!target) throw new Error('usage: refund-admin refund <orderId> [amount] [--reason "..."]');
    const amount = third && !third.startsWith('--') ? Number(third) : null;
    const refund = await initiateRefund(db, {
      orderId: target, amount, reason: arg('--reason') ?? null,
      initiatedBy: 'admin', initiatorId: null,
    });
    console.log('refund initiated (processing):', refund);
  } else if (cmd === 'sync') {
    const res = await syncProcessingRefunds(db);
    console.log(`checked ${res.checked} processing refunds, settled ${res.settled}`);
  } else if (cmd === 'freeze') {
    const amount = Number(third);
    const reason = arg('--reason');
    if (!target || !Number.isFinite(amount) || amount <= 0 || !reason) {
      throw new Error('usage: refund-admin freeze <creatorId> <amount> --reason "..." [--source dispute|manual]');
    }
    const source = arg('--source') === 'dispute' ? 'dispute' : 'manual';
    const { data, error } = await db.rpc('freeze_creator_funds', {
      p_creator_id: target, p_amount: amount, p_reason: reason, p_source: source,
    });
    if (error) throw new Error(error.message);
    console.log(`froze ₹${amount} for ${target} (log ${data})`);
  } else if (cmd === 'unfreeze') {
    if (!target) throw new Error('usage: refund-admin unfreeze <logId> [--note "..."]');
    const { data, error } = await db.rpc('release_frozen_funds', {
      p_log_id: target, p_note: arg('--note') ?? undefined,
    });
    if (error) throw new Error(error.message);
    console.log(data === true ? `released log ${target}` : `log ${target} not frozen (already released?)`);
  } else {
    throw new Error('usage: refund-admin <view|refund|sync|freeze|unfreeze> ...');
  }
}

main().then(() => process.exit(0)).catch((e) => {
  const msg = e instanceof RefundError ? `${e.code}: ${e.message}` : e.message;
  console.error('refund-admin FAILED:', msg);
  process.exit(1);
});
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/refund-admin.ts
git commit -m "feat(refunds): terminal refund-admin — view/refund/sync/freeze/unfreeze" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 13: Hooks — refund mutation + preview info + frozen fallback

**Files:**
- Modify: `src/hooks/commerce/useOrders.ts`
- Modify: `src/hooks/commerce/useEarnings.ts:31`

- [ ] **Step 1: Add the mutation + preview query to `useOrders.ts`**

Append at the end of `src/hooks/commerce/useOrders.ts` (and extend the imports at the top: `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';`):

```typescript
export function useRefundOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orderId: string; amount?: number; reason?: string }) => {
      const res = await fetch('/api/refunds/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Refund failed.');
      return data as { success: true; refund: { refundId: string; amount: number; netClawback: number } };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
    },
  });
}

// Data the refund dialog needs for its clawback preview: the order's original
// platform fee (sale ledger row — RLS select-own) and prior refunds on the order.
export function useOrderRefundInfo(orderId: string | null) {
  return useQuery({
    queryKey: ['orders', 'refund-info', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const [ledgerRes, refundsRes] = await Promise.all([
        supabase
          .from('transaction_ledger')
          .select('meta')
          .eq('order_id', orderId!)
          .eq('tx_type', 'sale')
          .eq('direction', 'credit')
          .limit(1),
        supabase
          .from('refunds')
          .select('amount, fee_reversed, status')
          .eq('order_id', orderId!)
          .in('status', ['processing', 'success']),
      ]);
      const meta = (ledgerRes.data?.[0]?.meta ?? {}) as { platform_fee?: number };
      const rows = refundsRes.data ?? [];
      return {
        fee: Number(meta.platform_fee ?? 0),
        hasLedger: (ledgerRes.data ?? []).length > 0,
        priorAmount: rows.reduce((s, r) => s + Number(r.amount), 0),
        priorFeeReversed: rows.reduce((s, r) => s + Number(r.fee_reversed), 0),
        hasProcessing: rows.some((r) => r.status === 'processing'),
      };
    },
  });
}
```

- [ ] **Step 2: Add `frozen_balance` to the `useEarnings` empty fallback**

In `src/hooks/commerce/useEarnings.ts` line 31, change:

```typescript
          : { available_balance: 0, pending_payout: 0, total_earnings: 0, total_platform_fees: 0, total_paid_out: 0 };
```

to:

```typescript
          : { available_balance: 0, pending_payout: 0, total_earnings: 0, total_platform_fees: 0, total_paid_out: 0, frozen_balance: 0 };
```

- [ ] **Step 3: Compile check**

Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/commerce/useOrders.ts src/hooks/commerce/useEarnings.ts
git commit -m "feat(hooks): useRefundOrder + useOrderRefundInfo; frozen_balance in earnings fallback" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 14: Orders page — refund panel in the drawer

**Files:**
- Modify: `app/dashboard/orders/page.tsx`

- [ ] **Step 1: Wire imports**

At the top of `app/dashboard/orders/page.tsx`:
- Extend the hook import: `import { useOrders, useRefundOrder, useOrderRefundInfo, type Order } from '@/hooks/commerce/useOrders';`
- Add: `import { ConfirmDialog } from '@/components/ui/ConfirmDialog';`
- Add: `import { computeRefundSplit } from '@/lib/shared/refund-math';`
- Add `RotateCcw` is already imported (STATUS_CONFIG uses it).

- [ ] **Step 2: Add the `RefundPanel` sub-component**

Add this component at the bottom of the file (per the component-patterns rule — sub-components live in the same file), above `OrderDrawer`'s usage is fine anywhere below imports; place it directly above `function OrderDrawer`:

```typescript
function RefundPanel({ order, onClose }: { order: Order; onClose: () => void }) {
  const { data: info, isLoading } = useOrderRefundInfo(order.id);
  const refundOrder = useRefundOrder();
  const [amountStr, setAmountStr] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const total = Number(order.total_amount);
  const remaining = info ? Math.round((total - info.priorAmount) * 100) / 100 : total;
  const amount = amountStr === '' ? remaining : Number(amountStr);

  let preview: { netClawback: number; feeReversed: number } | null = null;
  let previewError = '';
  if (info?.hasLedger && Number.isFinite(amount)) {
    try {
      preview = computeRefundSplit(total, info.fee, amount, info.priorAmount, info.priorFeeReversed);
    } catch (e) {
      previewError = e instanceof Error ? e.message : 'Invalid amount';
    }
  }

  const blocked = isLoading || !info?.hasLedger || info?.hasProcessing || remaining < 1;
  const blockedMessage = !isLoading && info
    ? !info.hasLedger
      ? 'This order is missing its sale record — contact support to refund it.'
      : info.hasProcessing
        ? 'A refund for this order is already processing.'
        : remaining < 1
          ? 'This order is fully refunded.'
          : ''
    : '';

  const submit = async () => {
    setError('');
    try {
      await refundOrder.mutateAsync({
        orderId: order.id,
        ...(amountStr === '' ? {} : { amount }),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refund failed.');
    }
  };

  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface-muted)] p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">Refund this order</p>
      {blocked ? (
        <p className="text-sm text-[var(--text-secondary)]">{isLoading ? 'Loading…' : blockedMessage}</p>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Amount (max {formatINR(remaining)})
            </label>
            <input
              type="number"
              min={1}
              max={remaining}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder={String(remaining)}
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being refunded?"
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow"
            />
          </div>
          {preview && (
            <p className="text-xs text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--danger)]">{formatINR(preview.netClawback)}</span> will be
              deducted from your balance. The {formatINR(preview.feeReversed)} platform fee on this portion is returned.
            </p>
          )}
          {previewError && <p className="text-xs text-[var(--danger)]">{previewError}</p>}
          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!preview || refundOrder.isPending}
            className="w-full py-2.5 bg-[var(--danger)] hover:opacity-90 text-[var(--text-on-brand)] font-semibold rounded-[var(--radius-sm)] transition text-sm disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            {refundOrder.isPending ? 'Processing…' : `Refund ${Number.isFinite(amount) ? formatINR(amount) : ''}`}
          </button>
          <ConfirmDialog
            isOpen={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={submit}
            title="Refund this order?"
            description={`The buyer gets ${Number.isFinite(amount) ? formatINR(amount) : ''} back to their original payment method (5–7 days). ${preview ? `${formatINR(preview.netClawback)} will be deducted from your balance and held until the refund completes.` : ''} This cannot be undone.`}
            confirmLabel="Refund"
            isDestructive
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Mount the panel in `OrderDrawer`**

Inside `OrderDrawer`, add local state at the top of the component:

```typescript
  const [showRefund, setShowRefund] = useState(false);
```

(`useState` is already imported in this file.) Then replace the footer block:

```typescript
        {/* Footer actions */}
        {order.status === 'completed' && (
          <div className="sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] p-4">
            <a
              href={receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] font-semibold rounded-[var(--radius-sm)] transition text-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <Download className="w-4 h-4" />
              Download Receipt
            </a>
          </div>
        )}
```

with:

```typescript
        {/* Footer actions */}
        {order.status === 'completed' && (
          <div className="sticky bottom-0 bg-[var(--surface)]">
            {showRefund && <RefundPanel order={order} onClose={onClose} />}
            <div className="border-t border-[var(--border)] p-4 space-y-2">
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] font-semibold rounded-[var(--radius-sm)] transition text-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <Download className="w-4 h-4" />
                Download Receipt
              </a>
              {order.gateway_payment_id && (
                <button
                  onClick={() => setShowRefund((v) => !v)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 border border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger-bg)] font-semibold rounded-[var(--radius-sm)] transition text-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <RotateCcw className="w-4 h-4" />
                  {showRefund ? 'Hide refund' : 'Refund order'}
                </button>
              )}
            </div>
          </div>
        )}
```

- [ ] **Step 4: Add `refunded` to the status filter row**

In the filter buttons array (`{['all', 'completed', 'pending', 'failed'].map(s => (`), change the array to `['all', 'completed', 'pending', 'failed', 'refunded']`.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` → exit 0. Run: `npm run lint` → no new errors. Run the residual color grep from `dashboard-design.md`:
```bash
grep -nE "bg-(white|gray|zinc|emerald|red|amber|yellow|blue|indigo|purple|pink|violet|sky|rose|fuchsia)|text-(gray|zinc|emerald|red|amber|yellow|blue|indigo|purple|pink|violet|sky|rose|fuchsia)" app/dashboard/orders/page.tsx
```
Expected: zero hits.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/orders/page.tsx
git commit -m "feat(orders): refund panel in order drawer — amount, reason, clawback preview, destructive confirm" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 15: Earnings page — frozen line

**Files:**
- Modify: `app/dashboard/earnings/page.tsx`

- [ ] **Step 1: Read `frozen_balance` and add the breakdown line**

Near the other derived values (around line 37, after `const platformFees = …`), add:

```typescript
  const frozen = Number((creatorBalances as { frozen_balance?: number } | undefined)?.frozen_balance ?? 0);
```

(If Task 2's type regen makes `frozen_balance` a known field on the row, drop the cast and use `creatorBalances?.frozen_balance ?? 0` — prefer the typed form.)

In the "Ledger Breakdown" card's array (`{ label: 'Pending Clearance', amount: -pending, … }` is the last entry), append conditionally by changing the array literal to:

```typescript
              {[
                { label: 'Gross Earnings', amount: totalEarnings, color: 'bg-[var(--success)]', icon: IndianRupee },
                { label: 'Platform Fees', amount: -platformFees, color: 'bg-[var(--danger)]', icon: CreditCard },
                { label: 'Total Paid Out', amount: -totalPaidOut, color: 'bg-[var(--info)]', icon: Banknote },
                { label: 'Pending Clearance', amount: -pending, color: 'bg-[var(--warning)]', icon: Clock },
                ...(frozen > 0 ? [{ label: 'Frozen (refunds/disputes)', amount: -frozen, color: 'bg-[var(--danger)]', icon: Snowflake }] : []),
              ].map(({ label, amount, color, icon: Icon }) => (
```

Add `Snowflake` to the existing `lucide-react` import list at the top of the file.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` → exit 0. Run: `npm run lint` → clean for this file.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/earnings/page.tsx
git commit -m "feat(earnings): show frozen balance line in breakdown when > 0" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 16: Docs sweep (same change-set rule)

**Files:**
- Modify: `.claude/rules/api-routes.md`, `.claude/rules/security-model.md`, `.claude/rules/hooks-reference.md`, `.claude/rules/env-vars.md`, `docs/db/money-path.md`, `docs/reference/dashboard-map.md`

- [ ] **Step 1: `api-routes.md`**

In the "At a glance" table add:

```markdown
| POST | `/api/refunds/create` | cookie session | server + service role | `refunds`, `wallet_frozen_logs`, `creator_balances.frozen_balance` (via `begin_refund`); Cashfree PG refund create |
```

Update the `/api/webhook/cashfree` row's "Writes to" to append: `refunds` + `settle_refund` (REFUND_STATUS_WEBHOOK). Update `/api/webhook/cashfree-payout` row to mention `TRANSFER_REVERSED` → `settle_payout('failed')` in-flight / `reverse_settled_payout` post-success. Update the `/api/payouts/request` row notes to mention the one-in-flight 409 guard.

Then add a "### `POST /api/refunds/create` (auth required)" section under Money, documenting: body `{ orderId, amount?, reason? }` (amount omitted = full remaining, min ₹1), guards in order (auth → profile → 5/min profile-keyed rate limit → own-order → `begin_refund` state checks), the freeze-at-initiation model, and the error table (400 over-refund/amount, 401, 403 not-owner, 404, 409 invalid state/missing sale ledger/already processing, 429, 502 gateway reject with hold released).

Also update the `/api/webhook/cashfree` section: routing is now type-aware — `REFUND_STATUS_WEBHOOK`/`data.refund` envelope settles refunds (`SUCCESS → settle_refund('success')`, `CANCELLED|FAILED → settle_refund('failed')`, `PENDING|ONHOLD → no-op`), unknown envelopes return `200 { received: true }` (previously 400).

- [ ] **Step 2: `security-model.md`**

In "RLS — what's protected" table add rows:

```markdown
| `refunds` | Creator reads their own. **Writes: service role only** (begin_refund/settle_refund RPCs). |
| `wallet_frozen_logs` | Creator reads their own. **Writes: service role only** (freeze/release RPCs). |
```

In "Revenue integrity rules" append:

```markdown
10. **Refunds are freeze-then-settle.** `begin_refund` (atomic RPC: order row lock → over-refund check → `frozen_balance` hold) runs before any gateway call; only `settle_refund` (claim-idempotent, webhook/sync-driven) reverses `total_earnings`/`total_platform_fees`, writes the ledger `refund` debit (`record_hash = sha256('refund:' + refundId)`), flips fully-refunded orders to `refunded`, and revokes access. Fee reversal is proportional. No code path outside these RPCs may mutate `frozen_balance`.
11. **`total_earnings` is GROSS.** Fulfillment credits the gross sale amount; `availableBalance()` subtracts `total_platform_fees`. (Fixed 2026-07-04 — it previously credited net, double-counting the fee.)
```

- [ ] **Step 3: `hooks-reference.md`**

In the `commerce/` row of the folder table, append `useRefundOrder` + `useOrderRefundInfo` (both in `useOrders.ts`). In the normalized query-key table add: `useOrderRefundInfo(orderId)` → `['orders','refund-info', orderId]`.

- [ ] **Step 4: `env-vars.md`**

In the Cashfree table, extend the "Used in" cells for `CASHFREE_ENVIRONMENT`, `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET` to include `src/lib/server/cashfree-refunds.ts`.

- [ ] **Step 5: `docs/db/money-path.md`**

Add a new "## 8. Refunds" section documenting: the freeze → gateway → webhook-settle flow, the proportional split (worked ₹1000/10% example: full refund → creator loses ₹900, platform gives up ₹100, order nets to zero), the `SUCCESS|CANCELLED|FAILED|PENDING|ONHOLD` mapping, sync via `refund-admin.ts sync`, the one-processing-refund-per-order invariant (`uq_refunds_one_processing_per_order`), and this **deployment precondition** (Task 1 quality review): refund surfaces must not be enabled in any environment until the gross-earnings fulfillment fix and the backfill migration have both been applied there — settling a refund against a net-shaped `total_earnings` trips `chk_creator_balances_nonneg` and wedges the refund in `processing`. Then append to the smoke checklist (§7 → renumber or extend):

```markdown
### (d) Refund flow
13. Refund a completed sandbox order: orders page → drawer → Refund (or `npx tsx --env-file=.env.local scripts/refund-admin.ts refund <orderId>`).
14. Confirm: `refunds` row `processing`; `creator_balances.frozen_balance` increased by `net_clawback`; a payout request for more than the new available 400s.
15. Deliver the REFUND_STATUS_WEBHOOK (Cashfree dashboard test event) or run `refund-admin.ts sync`.
16. Confirm: refund `success`; `total_earnings` −= amount; `total_platform_fees` −= fee_reversed; `frozen_balance` released; ledger `refund` debit exists; order `refunded` (full refunds); `user_product_access` rows for the order gone; `/api/deliverables/[productId]` now 403 for that buyer.
17. `select public.reconcile_creator_balances();` → 0 new drift rows.
```

- [ ] **Step 6: `docs/reference/dashboard-map.md`**

Update the orders page entry: drawer now includes a refund panel (completed paid orders; amount/reason/clawback preview; `useRefundOrder`/`useOrderRefundInfo`); status filter includes `refunded`. Update the earnings page entry: breakdown shows a Frozen line when `frozen_balance > 0`.

- [ ] **Step 7: Commit**

```bash
git add .claude/rules/api-routes.md .claude/rules/security-model.md .claude/rules/hooks-reference.md .claude/rules/env-vars.md docs/db/money-path.md docs/reference/dashboard-map.md
git commit -m "docs(phase4): refund route/webhook/RLS/hooks/money-path/dashboard-map updates" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 17: Final verification + blueprint state

**Files:**
- Modify: `.claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md` (§0 table + "Next planned phase")

- [ ] **Step 1: Full local gauntlet**

Run each; all must pass before the blueprint is updated:
- `npx tsc --noEmit` → exit 0
- `npm run lint` → no new errors
- `npm test` → all suites pass (referrals, balance, kyc-crypto, platform-fee, refund-math)

- [ ] **Step 2: Live sanity checks via MCP `execute_sql`**

```sql
select public.reconcile_creator_balances();
```
Expected: `0` (or only pre-existing drift rows already reported in Task 5 — compare against `balance_reconciliation_log` timestamps; report any NEW rows to the user).

```sql
select count(*) from public.refunds; select count(*) from public.wallet_frozen_logs;
```
Expected: both 0 (nothing initiated yet).

- [ ] **Step 3: Update the blueprint §0**

In `.claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md`: set Phase 4's row to **BUILT** with spec/plan links (`docs/superpowers/specs/2026-07-04-phase4-refunds-risk-design.md` · `docs/superpowers/plans/2026-07-04-phase4-refunds-risk.md`), note the gross-earnings fix + backfill landed, note the Phase 1 `TRANSFER_REVERSED` deferral is now closed, and change "Next planned phase" to Phase 5 (GST/TDS/TCS tax engine). Record remaining Phase 4 deferrals in the row: sandbox e2e of the refund webhook (needs a real sandbox payment), payment-link refunds, dispute-webhook automation, referral-commission clawback.

- [ ] **Step 4: Commit**

```bash
git add ".claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md"
git commit -m "docs(blueprint): phase4 refunds+risk BUILT; next phase 5 (tax engine)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Out of scope (spec non-goals — do NOT build)

Payment-link (`pl_`) refunds · free-order access revocation · referral-commission clawback · Cashfree dispute-webhook automation · buyer-facing refund UI/emails · any `/api/admin/refunds/*` route or admin app UI · coupon-use decrement on refund.

## References

- Spec: `docs/superpowers/specs/2026-07-04-phase4-refunds-risk-design.md`
- Cashfree create refund: https://www.cashfree.com/docs/api-reference/payments/latest/refunds/create
- Cashfree refund webhook: https://www.cashfree.com/docs/api-reference/payments/latest/refunds/webhooks
- Cashfree webhook setup/signature: https://www.cashfree.com/docs/payments/webhooks
- Patterns mirrored: `settle_payout` (`supabase/migrations/20260701000001_…`), payout sync (`app/api/admin/payouts/sync/route.ts`), payout webhook (`app/api/webhook/cashfree-payout/route.ts`), terminal admin (`scripts/subscription-admin.ts`)
