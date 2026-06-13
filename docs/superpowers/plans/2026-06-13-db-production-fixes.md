---
noteId: "1d713160675311f1bffb2f446ab401a4"
tags: []

---

# DB + Code Production-Readiness Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the live payout bugs, add the missing FK/CHECK/UNIQUE constraints, harden functions, flatten RLS `initplan` perf, add read-everything `super_admin` RLS, build platform-fee-funded referral commission, and ship an onboarding doc kit — taking the DB to production-ready.

**Architecture:** One structural DB migration (applied to the live project via MCP, since the Windows Supabase CLI has no binary and there is no staging project) → grouped code changes → onboarding docs. Money-path logic is extracted into pure helpers so it is unit-testable without a DB; DB changes are verified with SQL assertions + `get_advisors`.

**Tech Stack:** Next.js 16 / TypeScript, Supabase Postgres 17.6 (project `qcendfisvyjnwmefruba`), Supabase MCP (`execute_sql`, `apply_migration`, `get_advisors`, `generate_typescript_types`), Vitest (added in Phase 0).

**Spec:** `docs/superpowers/specs/2026-06-13-db-production-fixes-design.md`

---

## ⚠️ Execution preconditions (read before Task 1)

- **All DB DDL targets the LIVE project** `qcendfisvyjnwmefruba` (no branch/staging; CLI broken on Windows). Live data is small/test (14 orders) but treat every step as production: verify immediately after each apply.
- **All DDL in this plan is idempotent** (`drop ... if exists` then add, `create or replace`, `if not exists`). Iterate with `execute_sql`; the same SQL is re-run once via `apply_migration` in Task 7 to register migration history.
- **`CREATE INDEX CONCURRENTLY` cannot run inside a transaction** — those statements are applied via `execute_sql` individually (Task 2b), never inside `apply_migration`.
- After any schema change, regenerate types before compiling TS (Task 7, Step 4).

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `supabase/migrations/<ts>_production_fixes.sql` | The one structural migration (FKs, CHECKs, UNIQUE, status fix, search_path, admin RLS, initplan rewrite) | Create |
| `src/lib/server/referrals.ts` | Referral validation (`validateReferral`) + pure commission math (`computeReferralCommission`) | Create |
| `src/lib/server/referrals.test.ts` | Unit tests for the pure helpers | Create |
| `app/api/payouts/request/route.ts` | Payout concurrency fix | Modify |
| `app/api/checkout/create/route.ts` | Accept `referralCode`, write pending `order_referrals` | Modify |
| `src/lib/server/fulfillment.ts` | `fulfillOrder` step 7 — settle commission | Modify |
| `app/(buyer)/checkout/page.tsx` (+ any Buy callers) | Capture `?ref=CODE`, pass to checkout | Modify |
| `src/hooks/useReferrals.ts` | Surface commission-earned stat | Modify |
| `types/database.types.ts` | Regenerated after migration | Modify (generated) |
| `docs/db/{ERD,schema-reference,money-path}.md` | Onboarding kit | Create |
| `.claude/rules/{security-model,api-routes,supabase-reference}.md`, `supabase/SUPABASE.md`, audit #5 | Reality sync | Modify |
| `vitest.config.ts`, `package.json` | Test runner | Create/Modify |

---

## Phase 0 — Test tooling

### Task 0: Add Vitest

> **APPROVAL GATE:** This adds dev dependencies (`vitest`). CLAUDE.md forbids new packages without asking. Confirm with the user before this task. If declined, skip Phase 0 and the `.test.ts` steps; verify the pure helpers by reasoning + the manual money-path checklist in Task 14.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`
Expected: `vitest` appears in `devDependencies`.

- [ ] **Step 2: Add config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
```

- [ ] **Step 3: Add script**

In `package.json` `"scripts"`, add: `"test": "vitest run"`.

- [ ] **Step 4: Smoke test**

Run: `npm test`
Expected: "No test files found" (exit 0) — runner works.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest test runner"
```

---

## Phase 1 — Structural DB migration

> Build the migration SQL incrementally with `execute_sql`, verifying each layer, then register the whole file in Task 7. Keep a running copy of every statement in `supabase/migrations/<ts>_production_fixes.sql` as you go (`<ts>` = current UTC `YYYYMMDDHHMMSS`).

### Task 1: Orphan scan (read-only gate)

**Files:** none (verification only)

- [ ] **Step 1: Scan for rows that would violate the new FKs**

Run via `execute_sql` on `qcendfisvyjnwmefruba`:
```sql
select 'site_navigation' t, count(*) orphans from site_navigation n where site_id is not null and not exists (select 1 from sites s where s.id=n.site_id)
union all select 'site_sections_config', count(*) from site_sections_config x where site_id is not null and not exists (select 1 from sites s where s.id=x.site_id)
union all select 'site_product_assignments(site)', count(*) from site_product_assignments x where site_id is not null and not exists (select 1 from sites s where s.id=x.site_id)
union all select 'site_product_assignments(product)', count(*) from site_product_assignments x where product_id is not null and not exists (select 1 from products p where p.id=x.product_id)
union all select 'coupons', count(*) from coupons c where creator_id is not null and not exists (select 1 from profiles p where p.id=c.creator_id)
union all select 'referral_codes(creator)', count(*) from referral_codes r where owner_creator_id is not null and not exists (select 1 from profiles p where p.id=r.owner_creator_id)
union all select 'user_product_access(order)', count(*) from user_product_access u where order_id is not null and not exists (select 1 from orders o where o.id=u.order_id)
union all select 'order_referrals(code)', count(*) from order_referrals o where referral_code_id is not null and not exists (select 1 from referral_codes r where r.id=o.referral_code_id);
```
Expected: every `orphans` = 0.

- [ ] **Step 2: If any orphans exist, STOP and report.** Decide per table whether to delete the orphan rows or relax the FK. Do not proceed to Task 2 until the scan is clean.

### Task 2: FK constraints

**Files:** append to `supabase/migrations/<ts>_production_fixes.sql`

- [ ] **Step 1: Apply FK constraints (idempotent) via `execute_sql`**

```sql
-- creator_payouts.creator_id
alter table creator_payouts drop constraint if exists fk_creator_payouts_creator;
alter table creator_payouts add constraint fk_creator_payouts_creator foreign key (creator_id) references profiles(id) on delete set null;
-- coupons
alter table coupons drop constraint if exists fk_coupons_creator;
alter table coupons add constraint fk_coupons_creator foreign key (creator_id) references profiles(id) on delete cascade;
-- referral_codes
alter table referral_codes drop constraint if exists fk_referral_codes_owner_creator;
alter table referral_codes add constraint fk_referral_codes_owner_creator foreign key (owner_creator_id) references profiles(id) on delete cascade;
alter table referral_codes drop constraint if exists fk_referral_codes_owner_user;
alter table referral_codes add constraint fk_referral_codes_owner_user foreign key (owner_user_id) references users(id) on delete set null;
-- site_* config
alter table site_navigation drop constraint if exists fk_site_navigation_site;
alter table site_navigation add constraint fk_site_navigation_site foreign key (site_id) references sites(id) on delete cascade;
alter table site_sections_config drop constraint if exists fk_site_sections_config_site;
alter table site_sections_config add constraint fk_site_sections_config_site foreign key (site_id) references sites(id) on delete cascade;
alter table site_product_assignments drop constraint if exists fk_spa_site;
alter table site_product_assignments add constraint fk_spa_site foreign key (site_id) references sites(id) on delete cascade;
alter table site_product_assignments drop constraint if exists fk_spa_product;
alter table site_product_assignments add constraint fk_spa_product foreign key (product_id) references products(id) on delete cascade;
-- user_product_access
alter table user_product_access drop constraint if exists fk_upa_order;
alter table user_product_access add constraint fk_upa_order foreign key (order_id) references orders(id) on delete cascade;
alter table user_product_access drop constraint if exists fk_upa_product;
alter table user_product_access add constraint fk_upa_product foreign key (product_id) references products(id) on delete cascade;
alter table user_product_access drop constraint if exists fk_upa_user;
alter table user_product_access add constraint fk_upa_user foreign key (user_id) references users(id) on delete cascade;
-- referral linkage
alter table order_referrals drop constraint if exists fk_order_referrals_code;
alter table order_referrals add constraint fk_order_referrals_code foreign key (referral_code_id) references referral_codes(id) on delete cascade;
```

- [ ] **Step 2: Verify all FKs exist**

```sql
select conname from pg_constraint where contype='f' and conname in
('fk_creator_payouts_creator','fk_coupons_creator','fk_referral_codes_owner_creator','fk_referral_codes_owner_user',
 'fk_site_navigation_site','fk_site_sections_config_site','fk_spa_site','fk_spa_product',
 'fk_upa_order','fk_upa_product','fk_upa_user','fk_order_referrals_code') order by conname;
```
Expected: 12 rows.

### Task 2b: FK covering indexes (CONCURRENTLY)

**Files:** record in a companion note `supabase/migrations/<ts>_production_fixes_indexes.sql` (applied outside the migration txn)

- [ ] **Step 1: Create one index per new FK via `execute_sql` (run each statement separately)**

```sql
create index concurrently if not exists idx_creator_payouts_creator on creator_payouts(creator_id);
create index concurrently if not exists idx_coupons_creator on coupons(creator_id);
create index concurrently if not exists idx_referral_codes_owner_creator on referral_codes(owner_creator_id);
create index concurrently if not exists idx_site_navigation_site on site_navigation(site_id);
create index concurrently if not exists idx_site_sections_config_site on site_sections_config(site_id);
create index concurrently if not exists idx_spa_site on site_product_assignments(site_id);
create index concurrently if not exists idx_spa_product on site_product_assignments(product_id);
create index concurrently if not exists idx_upa_order on user_product_access(order_id);
create index concurrently if not exists idx_upa_product on user_product_access(product_id);
create index concurrently if not exists idx_upa_user on user_product_access(user_id);
create index concurrently if not exists idx_order_referrals_code on order_referrals(referral_code_id);
```

- [ ] **Step 2: Verify**

```sql
select count(*) from pg_indexes where schemaname='public' and indexname like 'idx_%' and indexname in
('idx_creator_payouts_creator','idx_coupons_creator','idx_referral_codes_owner_creator','idx_site_navigation_site',
 'idx_site_sections_config_site','idx_spa_site','idx_spa_product','idx_upa_order','idx_upa_product','idx_upa_user','idx_order_referrals_code');
```
Expected: 11.

### Task 3: CHECK constraints + gateway UNIQUE + payout status fix

**Files:** append to `supabase/migrations/<ts>_production_fixes.sql`

- [ ] **Step 1: Apply (idempotent) via `execute_sql`**

```sql
-- payout status blocker fix: allow the lifecycle the API uses
alter table creator_payouts drop constraint if exists creator_payouts_status_check;
alter table creator_payouts add constraint creator_payouts_status_check check (status in ('pending','initiated','processed','failed'));
-- non-negative money + positive amounts
alter table orders drop constraint if exists chk_orders_total_nonneg;
alter table orders add constraint chk_orders_total_nonneg check (total_amount >= 0);
alter table creator_balances drop constraint if exists chk_creator_balances_nonneg;
alter table creator_balances add constraint chk_creator_balances_nonneg check (total_earnings >= 0 and total_platform_fees >= 0 and total_paid_out >= 0 and pending_payout >= 0);
alter table creator_payouts drop constraint if exists chk_creator_payouts_amount_pos;
alter table creator_payouts add constraint chk_creator_payouts_amount_pos check (amount > 0);
```

- [ ] **Step 2: gateway_order_id partial UNIQUE (CONCURRENTLY, separate, in the indexes companion)**

```sql
create unique index concurrently if not exists uq_orders_gateway_order_id on orders(gateway_order_id) where gateway_order_id is not null;
```

- [ ] **Step 3: Verify**

```sql
select conname, pg_get_constraintdef(oid) from pg_constraint
where conname in ('creator_payouts_status_check','chk_orders_total_nonneg','chk_creator_balances_nonneg','chk_creator_payouts_amount_pos') order by conname;
select indexname from pg_indexes where indexname='uq_orders_gateway_order_id';
```
Expected: 4 constraint rows (status check now lists `pending`), 1 index row.

### Task 4: Function search_path + drop dead function

**Files:** append to `supabase/migrations/<ts>_production_fixes.sql`

- [ ] **Step 1: Pin search_path on the 4 trigger functions; drop the dead one via `execute_sql`**

```sql
alter function public.update_updated_at_column() set search_path = pg_catalog, public;
alter function public.update_product_search_vector() set search_path = pg_catalog, public;
alter function public.update_blog_post_search_vector() set search_path = pg_catalog, public;
drop function if exists public.update_projects_updated_at_column() cascade;  -- no projects table
```

- [ ] **Step 2: Verify**

```sql
select proname, proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname in ('update_updated_at_column','update_product_search_vector','update_blog_post_search_vector','update_projects_updated_at_column') order by proname;
```
Expected: 3 rows, each `proconfig` includes `search_path=pg_catalog, public`; `update_projects_updated_at_column` absent.

### Task 5: Admin read-RLS

**Files:** append to `supabase/migrations/<ts>_production_fixes.sql`

- [ ] **Step 1: Create `is_super_admin()` + admin SELECT policies via `execute_sql`**

```sql
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'super_admin';
$$;
revoke execute on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['orders','creator_balances','transaction_ledger','creator_payouts','creator_kyc',
                           'profiles','users','products','sites','coupons','order_referrals','referral_codes']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_admin_select', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.is_super_admin()))', t||'_admin_select', t);
  end loop;
end $$;
```

- [ ] **Step 2: Verify**

```sql
select count(*) admin_policies from pg_policies where schemaname='public' and policyname like '%_admin_select';
```
Expected: 12.

### Task 6: RLS initplan rewrite

**Files:** append to `supabase/migrations/<ts>_production_fixes.sql`

> Each existing owner policy calls `current_profile_id()` / `auth.uid()` un-wrapped. Recreate each with the call wrapped in `(select …)`. Below are the revenue/referral/identity policies (the hot ones); apply the same pattern to the remaining flagged policies surfaced by the advisor in Step 3.

- [ ] **Step 1: Rewrite the core policies via `execute_sql`**

```sql
-- orders
drop policy if exists orders_select_buyer on public.orders;
create policy orders_select_buyer on public.orders for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists orders_select_creator on public.orders;
create policy orders_select_creator on public.orders for select to authenticated using (creator_id = (select public.current_profile_id()));
-- creator_balances / transaction_ledger / creator_payouts
drop policy if exists creator_balances_select_own on public.creator_balances;
create policy creator_balances_select_own on public.creator_balances for select to authenticated using (creator_id = (select public.current_profile_id()));
drop policy if exists transaction_ledger_select_own on public.transaction_ledger;
create policy transaction_ledger_select_own on public.transaction_ledger for select to authenticated using (creator_id = (select public.current_profile_id()));
drop policy if exists creator_payouts_select_own on public.creator_payouts;
create policy creator_payouts_select_own on public.creator_payouts for select to authenticated using (creator_id = (select public.current_profile_id()));
-- creator_kyc (3)
drop policy if exists creator_kyc_select_own on public.creator_kyc;
create policy creator_kyc_select_own on public.creator_kyc for select to authenticated using (creator_id = (select public.current_profile_id()));
drop policy if exists creator_kyc_insert_own on public.creator_kyc;
create policy creator_kyc_insert_own on public.creator_kyc for insert to authenticated with check (creator_id = (select public.current_profile_id()));
drop policy if exists creator_kyc_update_own on public.creator_kyc;
create policy creator_kyc_update_own on public.creator_kyc for update to authenticated using (creator_id = (select public.current_profile_id())) with check (creator_id = (select public.current_profile_id()));
-- referral
drop policy if exists order_referrals_select_own on public.order_referrals;
create policy order_referrals_select_own on public.order_referrals for select to authenticated using (referrer_creator_id = (select public.current_profile_id()));
drop policy if exists user_referrals_select_own on public.user_referrals;
create policy user_referrals_select_own on public.user_referrals for select to authenticated using ((referrer_user_id = (select auth.uid())) or (referrer_creator_id = (select public.current_profile_id())));
drop policy if exists referral_codes_all_own on public.referral_codes;
create policy referral_codes_all_own on public.referral_codes for all to authenticated
  using ((owner_creator_id = (select public.current_profile_id())) or (owner_user_id = (select auth.uid())))
  with check ((owner_creator_id = (select public.current_profile_id())) or (owner_user_id = (select auth.uid())));
-- user_roles
drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own on public.user_roles for select to authenticated using (user_id = (select auth.uid()));
```

- [ ] **Step 2: Rewrite remaining flagged policies**

Run `execute_sql`:
```sql
select tablename, policyname from pg_policies
where schemaname='public'
and (coalesce(qual,'') ~ 'current_profile_id\(\)' or coalesce(qual,'') ~ '[^.]auth\.uid\(\)'
     or coalesce(with_check,'') ~ 'current_profile_id\(\)' or coalesce(with_check,'') ~ '[^.]auth\.uid\(\)')
order by tablename, policyname;
```
For each row still using an un-wrapped call, drop + recreate it with the call wrapped in `(select …)`, preserving its exact `cmd`, `roles`, `qual`, and `with_check` (read the current definition first: `select pg_get_expr(...)` or the `pg_policies` columns). Repeat until this query returns 0 rows.

- [ ] **Step 3: Verify via advisor**

Run `get_advisors` type `performance`. Expected: `auth_rls_initplan` count drops from 20 to 0 (or near-0; any remainder must be a policy you haven't wrapped — go back to Step 2).

### Task 7: Register migration + regenerate types

**Files:**
- Create: `supabase/migrations/<ts>_production_fixes.sql` (the accumulated idempotent SQL from Tasks 2–6, excluding the CONCURRENTLY index statements)
- Modify: `types/database.types.ts`

- [ ] **Step 1: Assemble the migration file** from every non-CONCURRENTLY statement applied in Tasks 2–6, in order. Keep all `drop ... if exists` guards so it is safe to re-run.

- [ ] **Step 2: Register it** via `apply_migration` (name `production_fixes`) with that file's contents. Because every statement is idempotent, re-running it over the already-applied schema is a no-op that records the migration in history.

- [ ] **Step 3: Confirm registration**

Run `list_migrations`. Expected: a new `..._production_fixes` entry at the tail.

- [ ] **Step 4: Regenerate types** (Windows CLI broken → MCP). Call `generate_typescript_types` for the project; strip the JSON envelope and write to `types/database.types.ts` per the procedure in `.claude/rules/supabase-reference.md` → "Windows fallback".

- [ ] **Step 5: Confirm compile**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/ types/database.types.ts
git commit -m "feat(db): production-readiness migration — FKs, CHECKs, payout status, admin RLS, initplan"
```

---

## Phase 2 — Payout concurrency fix

### Task 8: Make the optimistic-concurrency guard real

**Files:**
- Modify: `app/api/payouts/request/route.ts:62-73`

- [ ] **Step 1: Replace the deduction update + guard**

Replace the block at lines 62–73 (the `.update({ pending_payout })` … `if (deductionError)`) with:
```ts
    const { data: updatedRows, error: deductionError } = await supabaseAdmin
      .from('creator_balances')
      .update({ pending_payout: newPending })
      .eq('creator_id', profileId)
      // Optimistic concurrency: only update if pending_payout still matches what we read
      .eq('pending_payout', balanceData.pending_payout)
      .select('id');

    if (deductionError || !updatedRows || updatedRows.length !== 1) {
      return NextResponse.json({ error: 'Transaction collision. Please try again.' }, { status: 409 });
    }
```

- [ ] **Step 2: Confirm compile**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Manual verification** (status fix from Task 3 is required for this to pass)

With a verified-KYC creator that has a positive balance, POST `/api/payouts/request` `{ "amount": <≤ available> }`. Expected: `200 { success: true, payout: { status: 'pending', ... } }` and a `creator_payouts` row. Re-confirm via `execute_sql`: `select status from creator_payouts order by created_at desc limit 1;` → `pending`.

- [ ] **Step 4: Commit**

```bash
git add app/api/payouts/request/route.ts
git commit -m "fix(payouts): real optimistic-concurrency guard (0-row update is a collision)"
```

---

## Phase 3 — Referral attribution + platform-fee commission

### Task 9: Pure commission helper + tests

**Files:**
- Create: `src/lib/server/referrals.ts`
- Create: `src/lib/server/referrals.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/server/referrals.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeReferralCommission } from './referrals';

describe('computeReferralCommission', () => {
  it('is reward_percent of total, rounded to 2dp', () => {
    expect(computeReferralCommission(1000, 10, 100)).toBe(100);   // 10% of 1000 = 100, fee 100
  });
  it('caps at the platform fee (platform-funded, never negative)', () => {
    expect(computeReferralCommission(1000, 20, 100)).toBe(100);   // 20% = 200 but fee is 100 → 100
  });
  it('returns 0 for free orders', () => {
    expect(computeReferralCommission(0, 10, 0)).toBe(0);
  });
  it('returns 0 when reward_percent is 0', () => {
    expect(computeReferralCommission(1000, 0, 100)).toBe(0);
  });
  it('rounds to 2 decimals', () => {
    expect(computeReferralCommission(333, 10, 100)).toBe(33.3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `computeReferralCommission` is not exported.

- [ ] **Step 3: Implement the helper file**

Create `src/lib/server/referrals.ts`:
```ts
// Shared referral validation + commission math — used by /api/checkout/create
// and src/lib/server/fulfillment.ts. Server-only (service-role client passed in).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/** Platform-fee-funded commission: reward_percent of total, capped at the platform fee. */
export function computeReferralCommission(total: number, rewardPercent: number, platformFee: number): number {
  if (total <= 0 || rewardPercent <= 0) return 0;
  const raw = Math.round(((total * rewardPercent) / 100) * 100) / 100;
  return Math.min(raw, platformFee);
}

export type ReferralValidation = {
  referralCodeId: string;
  referrerCreatorId: string | null;  // null → tracked but no commission (user-owned code)
  rewardPercent: number;
} | null;

/**
 * Validate a referral code at checkout. Returns attribution info, or null if the
 * code is invalid/inactive or a self-referral. v1: only owner_creator_id codes pay
 * commission; owner_user_id-only codes are tracked (referrerCreatorId = null).
 */
export async function validateReferral(
  db: SupabaseClient<Database>,
  code: string,
  ctx: { buyerUserId: string | null; sellingCreatorId: string | null }
): Promise<ReferralValidation> {
  const { data: rc, error } = await db
    .from('referral_codes')
    .select('id, owner_creator_id, owner_user_id, is_active, metadata')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !rc) return null;

  // Reject self-referral: referrer is the buyer, or the selling creator.
  if (rc.owner_creator_id && rc.owner_creator_id === ctx.sellingCreatorId) return null;
  if (rc.owner_user_id && ctx.buyerUserId && rc.owner_user_id === ctx.buyerUserId) return null;

  const rewardPercent = Number((rc.metadata as { reward_percent?: number } | null)?.reward_percent ?? 0);
  return {
    referralCodeId: rc.id,
    referrerCreatorId: rc.owner_creator_id ?? null,
    rewardPercent: rc.owner_creator_id ? rewardPercent : 0,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/referrals.ts src/lib/server/referrals.test.ts
git commit -m "feat(referrals): validateReferral + computeReferralCommission helpers"
```

### Task 10: Capture referral at checkout

**Files:**
- Modify: `app/api/checkout/create/route.ts`

- [ ] **Step 1: Import + read `referralCode` from the body**

At line 4 add: `import { validateReferral } from '@/lib/server/referrals';`
At line 19 change the destructure to include `referralCode`:
```ts
    const { items, buyerId, couponCode, contact, upsellPageId, referralCode } = await req.json();
```

- [ ] **Step 2: Validate the referral after coupon validation (after line 63)**

Insert after the coupon block (right after line 63's closing `}`):
```ts
    // ── Referral attribution (pending; settled at fulfillment) ──
    let referral: Awaited<ReturnType<typeof validateReferral>> = null;
    if (referralCode && creatorProfileId) {
      referral = await validateReferral(supabase, String(referralCode), {
        buyerUserId: buyerId ?? null,
        sellingCreatorId: creatorProfileId,
      });
    }
```

- [ ] **Step 3: Write the pending order_referrals row after order_items insert (after line 107)**

Insert after `await supabase.from('order_items').insert(orderItems);`:
```ts
    if (referral) {
      await supabase.from('order_referrals').insert({
        order_id: orderId,
        referral_code_id: referral.referralCodeId,
        referrer_creator_id: referral.referrerCreatorId,
        referred_user_id: buyerId ?? null,
        status: 'pending',
        metadata: { reward_percent: referral.rewardPercent },
      });
    }
```

- [ ] **Step 4: Confirm compile**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/api/checkout/create/route.ts
git commit -m "feat(checkout): capture referral code as pending order_referrals row"
```

### Task 11: Settle commission in fulfillment

**Files:**
- Modify: `src/lib/server/fulfillment.ts`

- [ ] **Step 1: Import the helper**

At line 8 (after the `getPlatformFeeRate` import) add:
```ts
import { computeReferralCommission } from './referrals';
```

- [ ] **Step 2: Add step 7 in `fulfillOrder`, immediately before the `return { fulfilled: true, alreadyFulfilled: false };` at the end of the function (after the coupon block, after the notify block ~line 137)**

```ts
  // 7. Referral commission — platform-fee-funded, idempotent via status claim
  if (creatorId && total > 0) {
    const { data: settled } = await db
      .from('order_referrals')
      .update({ status: 'settled' })
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .select('referrer_creator_id, metadata')
      .maybeSingle();

    if (settled?.referrer_creator_id) {
      const rewardPercent = Number((settled.metadata as { reward_percent?: number } | null)?.reward_percent ?? 0);
      const commission = computeReferralCommission(total, rewardPercent, platformFee);
      if (commission > 0) {
        await db.from('order_referrals').update({ commission_amount: commission }).eq('order_id', orderId);
        const { error: refCreditErr } = await db.rpc('credit_creator_balance', {
          p_creator_id: settled.referrer_creator_id,
          p_earnings_delta: commission,
          p_fees_delta: 0,
        });
        if (refCreditErr) console.error('[fulfillment] referral credit failed for order', orderId, refCreditErr.message);

        const refHash = crypto.createHash('sha256').update(`${orderId}:ref:${opts?.gatewayPaymentId ?? 'free'}`).digest('hex');
        const { error: refLedgerErr } = await db.from('transaction_ledger').insert({
          creator_id: settled.referrer_creator_id,
          order_id: orderId,
          amount: commission,
          direction: 'credit',
          tx_type: 'referral_commission',
          currency: 'INR',
          record_hash: refHash,
          meta: { source_order: orderId, reward_percent: rewardPercent },
        });
        if (refLedgerErr) console.error('[fulfillment] referral ledger failed for order', orderId, refLedgerErr.message);

        await db.from('notifications').insert({
          recipient_creator_id: settled.referrer_creator_id,
          title: 'Referral commission earned!',
          message: `You earned ₹${commission.toFixed(0)} from a referral`,
          type: 'sale',
        });
      }
    }
  }
```

- [ ] **Step 3: Confirm compile**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Manual idempotency check**

In `execute_sql`, seed a creator-owned referral code (`metadata:{reward_percent:10}`), create a pending order + matching `order_referrals` row, then call the fulfillment path twice (e.g. via `/payment/status` re-check, or a small script). Expected: `order_referrals.status='settled'`, exactly **one** `transaction_ledger` row with `tx_type='referral_commission'` (the deterministic `record_hash` UNIQUE blocks the duplicate), and the referrer's `creator_balances.total_earnings` increased by the commission once.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/fulfillment.ts
git commit -m "feat(fulfillment): settle platform-fee-funded referral commission (idempotent)"
```

### Task 12: Storefront referral capture

**Files:**
- Modify: `app/(buyer)/checkout/page.tsx` (and any other Buy callers that POST `/api/checkout/create`)

- [ ] **Step 1: Read `?ref=` and include it in the checkout POST body**

In the checkout page, read the referral code from the URL once on mount and add it to the `/api/checkout/create` body. Minimal pattern:
```ts
// near other state / derived values
const referralCode = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('ref')
  : null;
```
Then in the existing `fetch('/api/checkout/create', { ... body: JSON.stringify({ ... }) })`, add `referralCode` to the JSON object alongside `items`/`contact`.

- [ ] **Step 2: Confirm compile**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add "app/(buyer)/checkout/page.tsx"
git commit -m "feat(checkout-ui): forward ?ref code to checkout API"
```

### Task 13: Surface commission in the referrals dashboard

**Files:**
- Modify: `src/hooks/useReferrals.ts`

- [ ] **Step 1: Add a derived `totalCommission` to the hook return**

In `useReferrals`, after `redemptions` is built, compute and return the sum:
```ts
  const totalCommission = (query.data?.redemptions ?? [])
    .reduce((sum, r) => sum + (Number((r as { commission_amount?: number }).commission_amount) || 0), 0);
```
Add `totalCommission` to the returned object.

- [ ] **Step 2: Confirm compile**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useReferrals.ts
git commit -m "feat(referrals-ui): expose totalCommission from useReferrals"
```

---

## Phase 4 — Onboarding docs

### Task 14: Money-path guide (incl. the manual money-path checklist)

**Files:**
- Create: `docs/db/money-path.md`

- [ ] **Step 1: Write the guide.** Sections, in order, each a short narrative with the real file/function references:
  1. **Checkout** — `app/api/checkout/create/route.ts`: server-side price re-verify, single-creator cart, coupon + referral capture, pending `orders` row, free-order short-circuit.
  2. **Cashfree** — order body, `payment_session_id`, return/notify URLs (`.claude/rules/cashfree-reference.md`).
  3. **Webhook** — `app/api/webhook/cashfree/route.ts`: HMAC verify, routing by `order_id` prefix.
  4. **Fulfillment** — `src/lib/server/fulfillment.ts`: atomic status claim (idempotency), `credit_creator_balance`, deterministic `record_hash`, access grants, coupon redeem, **referral commission (step 7)**.
  5. **Balance & payout** — `creator_balances` math (`available = earnings − fees − paid_out − pending`), `app/api/payouts/request/route.ts` (KYC gate, optimistic concurrency, status lifecycle `pending→initiated→processed→failed`).
  6. **Referral funding model** — commission = `min(reward_percent×total, platform_fee)`, drawn from the platform's cut; seller proceeds unchanged; creators-only in v1.
  7. **Manual money-path checklist** — the verification steps from Tasks 8 & 11 collected as a runnable smoke test for the next dev.

- [ ] **Step 2: Commit**

```bash
git add docs/db/money-path.md
git commit -m "docs(db): money-path onboarding guide"
```

### Task 15: ERD + schema reference

**Files:**
- Create: `docs/db/ERD.md`, `docs/db/schema-reference.md`

- [ ] **Step 1: Generate the FK list from the live DB** (for an accurate ERD) via `execute_sql`:
```sql
select conrelid::regclass::text as child, a.attname as col, confrelid::regclass::text as parent
from pg_constraint c join lateral unnest(c.conkey) k(attnum) on true
join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum
where c.contype='f' and connamespace='public'::regnamespace order by 1,2;
```

- [ ] **Step 2: Write `docs/db/ERD.md`** as a mermaid `erDiagram` built from that FK list, grouped by domain (identity: users/profiles/user_roles; storefront: sites/site_*; catalog: products/order_items; money: orders/creator_balances/transaction_ledger/creator_payouts/creator_kyc; referral: referral_codes/order_referrals/user_referrals).

- [ ] **Step 3: Write `docs/db/schema-reference.md`** — one row per public table: purpose · owner column · key columns · RLS summary · primary writer (API route / hook / trigger). Source the table list from `list_tables` and RLS from `pg_policies`.

- [ ] **Step 4: Commit**

```bash
git add docs/db/ERD.md docs/db/schema-reference.md
git commit -m "docs(db): ERD + per-table schema reference"
```

### Task 16: Sync rules + audit

**Files:**
- Modify: `.claude/rules/security-model.md`, `.claude/rules/api-routes.md`, `.claude/rules/supabase-reference.md`, `supabase/SUPABASE.md`, `.claude/todo-later/5(done)-2026-06-13-db-production-audit.md`

- [ ] **Step 1: `security-model.md`** — document: admin = read-everything via `is_super_admin()` RLS + writes service-role only; referral commission is a service-role fulfillment write funded from platform fee; payout status lifecycle.

- [ ] **Step 2: `api-routes.md`** — `/api/checkout/create` now accepts `referralCode` and writes `order_referrals`; `/api/payouts/request` inserts `status:'pending'` (lifecycle documented); note `order_referrals` is written here.

- [ ] **Step 3: `supabase-reference.md`** — fix the stale line that says proxy reads `user_metadata.role` (it reads `app_metadata.role`).

- [ ] **Step 4: `SUPABASE.md`** — refresh counts (functions now include `is_super_admin`; policy count up by ~12 admin + unchanged owner policies); remove the payout/admin "Open" known-issues rows now resolved.

- [ ] **Step 5: Audit #5** — tick the resolved punch-list items (1, 2, 3, 3b, 6, 7, 8 partial, 9) with a short "resolved 2026-06-13 (plan)" note; leave genuinely-open items.

- [ ] **Step 6: Commit**

```bash
git add .claude/rules/ supabase/SUPABASE.md .claude/todo-later/5(done)-2026-06-13-db-production-audit.md
git commit -m "docs: sync rules + audit with production-fixes changes"
```

---

## Phase 5 — Final verification

### Task 17: Full gauntlet

**Files:** none

- [ ] **Step 1:** Run `npx tsc --noEmit` → exit 0.
- [ ] **Step 2:** Run `npm run lint` → no new errors.
- [ ] **Step 3:** Run `npm test` → all pass.
- [ ] **Step 4:** Run `get_advisors` (security) → 0 ERROR; `auth_rls_initplan` gone from performance; the 3 remaining trigger-function `search_path` WARNs cleared (one function dropped, three pinned). `current_profile_id`/`is_super_admin` anon/auth-executable WARNs are expected (by design — note in `security-model.md`).
- [ ] **Step 5:** Run `list_migrations` → `production_fixes` registered.
- [ ] **Step 6:** Manual smoke (the Task 14 checklist): a referral checkout → webhook/status → referrer credited once; a payout request returns 200 with `status:'pending'`.
- [ ] **Step 7: Final commit** if any docs/verification tweaks remain.

---

## Self-review notes

- **Spec coverage:** §1 Layers A–D → Tasks 1–7; §2.1 payout → Task 8; §2.2 checkout → Tasks 9–10, 12; §2.3 fulfillment → Task 11; §2.4 admin → Task 5 + Task 16.1; §2.5 dashboard → Task 13; §3 onboarding → Tasks 14–16; §4 testing → Tasks 0, 9, 8/11 manual, 17; §5 migration safety → Tasks 1, 2b, 7. All covered.
- **No test runner pre-exists** (verification.md): Phase 0 adds Vitest behind an approval gate; DB verified via SQL + advisors; money-path orchestration verified manually (documented checklists), pure logic unit-tested.
- **Type names consistent:** `computeReferralCommission(total, rewardPercent, platformFee)` and `validateReferral(db, code, {buyerUserId, sellingCreatorId})` used identically in Tasks 9–11. `order_referrals` columns match the live schema (`referral_code_id` NOT NULL, `referrer_creator_id`, `commission_amount`, `status`).
- **Live-DB caveat** is called out up front; every DB task self-verifies.
