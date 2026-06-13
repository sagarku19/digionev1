---
noteId: "fc86ddc066ca11f1bffb2f446ab401a4"
tags: []

---

# Production-Readiness Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 27 production-readiness findings from the 2026-06-12 audit plus the DB/RLS/index work — money-loop integrity, identity/authz bugs, rate limiting, proxy hardening, dead-code removal, and hook hygiene.

**Architecture:** A single shared fulfillment module (`src/lib/server/fulfillment.ts`) with an atomic DB claim becomes the only writer of "order completed" side effects, called by both the Cashfree webhook and the payment-status page. Postgres-based rate limiting (`rate_limits` table + `check_rate_limit` RPC). Roles move from `user_metadata` to `app_metadata`. Seven migrations applied live to Supabase project `qcendfisvyjnwmefruba` via MCP, then types regenerated.

**Tech Stack:** Next.js 16 App Router · TypeScript 5 strict · Supabase (`@supabase/ssr`, service-role client at `lib/supabase/service.ts`) · Cashfree PG REST v2023-08-01 · TanStack Query v5 · Supabase MCP tools (`apply_migration`, `execute_sql`, `get_advisors`, `generate_typescript_types`, `list_migrations`)

**Spec:** `docs/superpowers/specs/2026-06-12-production-readiness-fixes-design.md`

---

## Ground rules for the executor (read before Task 1)

1. **NO COMMITS during implementation.** The spec's commit protocol (section 7) overrides the usual commit-per-task flow. Do not run `git add` or `git commit` at any point. At the end (Task 24), present the full diff summary + verification results and wait for user approval of one commit batch.
2. **No test framework exists** in this project (see `.claude/rules/verification.md` — Lane 2 is not in place). Verification per task is: `npx tsc --noEmit` for code, `mcp__plugin_supabase_supabase__execute_sql` probes for DB work, and the final manual smoke pass in Task 24. Do not add a test framework.
3. **Supabase MCP tools are deferred.** Before the first DB task, load them: `ToolSearch` with query `select:mcp__plugin_supabase_supabase__apply_migration,mcp__plugin_supabase_supabase__execute_sql,mcp__plugin_supabase_supabase__list_migrations,mcp__plugin_supabase_supabase__get_advisors,mcp__plugin_supabase_supabase__generate_typescript_types`. Project id is always `qcendfisvyjnwmefruba`.
4. **Path aliases:** `@/*` maps to both `./*` and `./src/*` (tsconfig). The Supabase clients live at root `lib/supabase/{client,server,service}.ts` (import as `@/lib/supabase/service`). New server modules in this plan go in `src/lib/server/` (import as `@/lib/server/fulfillment`).
5. **Migration protocol (Tasks 1–7):** For each new migration: (a) apply live via `apply_migration` with a short name (e.g. `function_hardening`); (b) call `list_migrations` to read the version the MCP recorded; (c) save the identical SQL to `supabase/migrations/<version>_<name>.sql` so the local file matches live history. Exception: Task 1 applies a pre-existing file (`20260602000000_rls_policies.sql`) via `execute_sql` and Task 2 backfills its history row under its original version.
6. **Zero `any` in new code.** Files touched get their edited lines fixed; do not do drive-by cleanup of untouched lines (the 445-error lint chore is out of scope).
7. After Task 8 (types regen), `npx tsc --noEmit` must pass at the end of **every** subsequent task.

---

## Phase 1 — Database (live + migration files)

### Task 1: M1 — Apply the RLS policies migration to live

RLS is currently OFF on 58/59 live tables. The policy file already exists; it has never been applied to the live project.

**Files:**
- Read (no edits): `supabase/migrations/20260602000000_rls_policies.sql`
- Reference: `supabase/exports/RLS-TEST-CHECKLIST.md`, `supabase/exports/RLS-POLICIES.md`

- [ ] **Step 1: Load MCP tools** via ToolSearch (see ground rule 3).

- [ ] **Step 2: Pre-flight — confirm RLS is currently off.**

Run via `execute_sql`:
```sql
select count(*) filter (where rowsecurity) as rls_on,
       count(*) filter (where not rowsecurity) as rls_off
from pg_tables where schemaname = 'public';
```
Expected: `rls_off` ≈ 58.

- [ ] **Step 3: Read the migration file** (`supabase/migrations/20260602000000_rls_policies.sql`) and apply its full content **unmodified** via `execute_sql` (not `apply_migration` — Task 2 registers it under its original version `20260602000000`). If the file exceeds one call comfortably, split on statement boundaries (`;` at top level) and run sequentially.

- [ ] **Step 4: Verify RLS is on.** Re-run the Step 2 query. Expected: `rls_off` ≤ 1 (only tables the policy file intentionally skips).

- [ ] **Step 5: Run the smoke checklist.** Open `supabase/exports/RLS-TEST-CHECKLIST.md` and execute each check it defines via `execute_sql` (the checklist uses `set role anon` / `set role authenticated` style probes). Record pass/fail per check. Fix forward: if a policy errors (e.g. references a missing column), correct it with a follow-up `execute_sql` and note the delta — do NOT roll back RLS.

- [ ] **Step 6: Run advisors.** `mcp__plugin_supabase_supabase__get_advisors` with `type: "security"`. Expected: the ~53 "RLS disabled" errors drop to ~0. Save the remaining findings — Task 3 and Task 24 reference them.

### Task 2: M2 — Migration-history backfill

Five applied-but-untracked local files (plus the just-applied RLS file) need rows in `supabase_migrations.schema_migrations`.

- [ ] **Step 1: Inspect the history table shape.**

```sql
select column_name, data_type from information_schema.columns
where table_schema = 'supabase_migrations' and table_name = 'schema_migrations'
order by ordinal_position;
```
Expected columns: `version`, `statements`, `name` (statements may be `text[]`).

- [ ] **Step 2: Diff local files vs live history.**

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```
Compare against the files in `supabase/migrations/`:
`00000000000000_baseline`, `20260416_marketing_tables`, `20260418_insta_autodm`, `20260602000000_rls_policies`, `20260603000000_create_products_bucket`, `20260604000000_create_private_storage_buckets`, `20260605000000_merge_products_into_creator_public`, `20260605100000_drop_legacy_storage_buckets`, `20260605200000_add_sum_bucket_bytes_for_prefix_rpc`.

- [ ] **Step 3: Insert the missing rows.** For each local file whose version is absent from live history (this includes `20260602000000_rls_policies` applied in Task 1):

```sql
insert into supabase_migrations.schema_migrations (version, name)
values
  ('<version>', '<name>')
on conflict (version) do nothing;
```
(One multi-row insert is fine. If the table requires `statements not null`, pass `'{}'::text[]`.)

- [ ] **Step 4: Verify.** Re-run the Step 2 query — every local filename's version must now appear. Save this SQL as a migration file is NOT needed (history fix, not schema); note it in the Task 24 summary instead.

### Task 3: M3 — Function hardening

- [ ] **Step 1: Confirm exact function signatures.**

```sql
select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('handle_new_user', 'handle_user_email_confirmed', 'sum_bucket_bytes_for_prefix');
```

- [ ] **Step 2: Apply via `apply_migration`** with name `function_hardening` (substitute the exact argument lists from Step 1):

```sql
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_confirmed() from public, anon, authenticated;
revoke execute on function public.sum_bucket_bytes_for_prefix(text, text) from public, anon, authenticated;
```

- [ ] **Step 3: Save the local file** per ground rule 5 (`supabase/migrations/<version>_function_hardening.sql`).

- [ ] **Step 4: Note the manual dashboard task** in the Task 24 summary: *"Enable leaked-password protection: Supabase Dashboard → Authentication → Providers → Email → Password security."* This cannot be done via SQL.

### Task 4: M4 — Missing tables the code already calls

`linkinbio_analytics` and `ab_tests` are queried by live code (`app/api/linkinbio/track/route.ts`, `src/hooks/useAbTests.ts`) but don't exist in the DB.

- [ ] **Step 1: Pre-flight checks.**

```sql
select to_regclass('public.linkinbio_analytics') as a,
       to_regclass('public.ab_tests') as b,
       to_regclass('public.linkinbio_items') as items;
select exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname='public' and p.proname='current_profile_id') as helper;
select column_name from information_schema.columns
where table_schema='public' and table_name='linkinbio_items' and column_name='click_count';
```
Expected: `a` and `b` null, `items` non-null, `helper` true, `click_count` exists. If `linkinbio_items` has no `click_count` column, add `click_count int not null default 0` in the migration below.

- [ ] **Step 2: Apply via `apply_migration`** with name `linkinbio_analytics_and_ab_tests`:

```sql
-- linkinbio_analytics: written by /api/linkinbio/track (service role), read by site owner
create table public.linkinbio_analytics (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  link_id uuid references public.linkinbio_items(id) on delete set null,
  event_type text not null check (event_type in ('page_view','link_click','product_click','social_click')),
  referrer_url text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index idx_linkinbio_analytics_site_created
  on public.linkinbio_analytics (site_id, created_at desc);
create index idx_linkinbio_analytics_dedupe
  on public.linkinbio_analytics (site_id, link_id, ip_hash, created_at);

alter table public.linkinbio_analytics enable row level security;

create policy linkinbio_analytics_select_owner
  on public.linkinbio_analytics for select to authenticated
  using (exists (
    select 1 from public.sites s
    where s.id = linkinbio_analytics.site_id
      and s.creator_id = public.current_profile_id()
  ));
-- no insert/update/delete policies: service-role writes only

create or replace function public.increment_link_click_count(p_link_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.linkinbio_items
  set click_count = coalesce(click_count, 0) + 1
  where id = p_link_id;
$$;
revoke execute on function public.increment_link_click_count(uuid) from public, anon, authenticated;

-- ab_tests: minimal shape matching src/hooks/useAbTests.ts (creator-owned)
create table public.ab_tests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  variant_a jsonb,
  variant_b jsonb,
  created_at timestamptz not null default now()
);

create index idx_ab_tests_creator on public.ab_tests (creator_id);

alter table public.ab_tests enable row level security;

create policy ab_tests_owner_all
  on public.ab_tests for all to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());
```

- [ ] **Step 3: Save the local file** per ground rule 5.

- [ ] **Step 4: Fix `useAbTests` to match reality.** The hook queries `.eq('creator_id', user.id)` (auth uid — wrong identity, same bug class as finding #5) and embeds `products(title)` — but `products` has `name`, not `title`. Replace `src/hooks/useAbTests.ts` content:

```typescript
"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export function useAbTests() {
  const { data: tests = [], isLoading, error } = useQuery({
    queryKey: ['ab-tests', 'list'],
    queryFn: async () => {
      const creatorId = await getCreatorProfileId();

      const { data, error } = await supabase
        .from('ab_tests')
        .select('*, products(name)')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  return { tests, isLoading, error };
}
```
Note: until Task 8 regenerates types, `from('ab_tests')` will not typecheck — leave the existing `(supabase as any)` cast in place for now if tsc fails, and remove it in Task 8. (Run `npx tsc --noEmit` to find out.)

### Task 5: M5 — Money RPCs

- [ ] **Step 1: Verify `creator_balances` has a unique key on `creator_id`** (required for `on conflict`):

```sql
select indexname, indexdef from pg_indexes
where schemaname = 'public' and tablename = 'creator_balances';
```
If no `UNIQUE` index/PK on `(creator_id)` exists, prepend `create unique index uq_creator_balances_creator_id on public.creator_balances (creator_id);` to the migration below. Also confirm `coupons.current_uses` exists:
```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='coupons' and column_name in ('current_uses','max_uses');
```

- [ ] **Step 2: Apply via `apply_migration`** with name `money_rpcs`:

```sql
-- Atomic balance credit — kills the read-modify-write race in the webhook (finding #9)
create or replace function public.credit_creator_balance(
  p_creator_id uuid,
  p_earnings_delta numeric,
  p_fees_delta numeric
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.creator_balances (creator_id, total_earnings, total_platform_fees, total_paid_out, pending_payout)
  values (p_creator_id, p_earnings_delta, p_fees_delta, 0, 0)
  on conflict (creator_id) do update set
    total_earnings      = creator_balances.total_earnings      + excluded.total_earnings,
    total_platform_fees = creator_balances.total_platform_fees + excluded.total_platform_fees;
$$;
revoke execute on function public.credit_creator_balance(uuid, numeric, numeric) from public, anon, authenticated;

-- Atomic coupon redemption counter (finding #4)
create or replace function public.increment_coupon_uses(p_coupon_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.coupons
  set current_uses = coalesce(current_uses, 0) + 1
  where id = p_coupon_id;
$$;
revoke execute on function public.increment_coupon_uses(uuid) from public, anon, authenticated;
```

- [ ] **Step 3: Save the local file** per ground rule 5.

- [ ] **Step 4: Probe.** Pick any existing `profiles.id` (`select id from profiles limit 1;`), then:

```sql
select public.credit_creator_balance('<profile-id>', 0, 0);
select creator_id, total_earnings from public.creator_balances where creator_id = '<profile-id>';
```
Expected: no error; row exists (possibly freshly inserted with 0/0).

### Task 6: M6 — Money integrity constraints

- [ ] **Step 1: Pre-flight.**

```sql
select count(*) as null_creator from public.orders
where creator_id is null and metadata->>'creator_profile_id' is not null;
select count(*) as ledger_rows from public.transaction_ledger;
select gateway_order_id, count(*) from public.orders
where gateway_order_id is not null group by 1 having count(*) > 1;
select order_id, product_id, count(*) from public.user_product_access
group by 1, 2 having count(*) > 1;
```
Expected: ledger_rows = 0 (audit said 0 live rows); no duplicate gateway_order_ids; no duplicate access pairs. If duplicates exist, report them to the user before applying — do not silently delete data.

- [ ] **Step 2: Apply via `apply_migration`** with name `money_integrity`:

```sql
-- Backfill orders.creator_id from metadata (finding #14)
update public.orders
set creator_id = (metadata->>'creator_profile_id')::uuid
where creator_id is null
  and metadata->>'creator_profile_id' is not null;

-- One Cashfree order id maps to at most one order
create unique index if not exists uq_orders_gateway_order_id
  on public.orders (gateway_order_id)
  where gateway_order_id is not null;

-- Deterministic record_hash becomes replay-detecting (fulfillment relies on this)
alter table public.transaction_ledger
  add constraint uq_transaction_ledger_record_hash unique (record_hash);

-- Idempotent access grants (finding #2)
alter table public.user_product_access
  add constraint uq_user_product_access_order_product unique (order_id, product_id);
```

- [ ] **Step 3: Save the local file** per ground rule 5.

- [ ] **Step 4: Verify.** Re-run the Step 1 first query — expected `null_creator` = 0. And `\d`-style check:
```sql
select conname from pg_constraint where conname in
  ('uq_transaction_ledger_record_hash', 'uq_user_product_access_order_product');
```
Expected: both rows present.

### Task 7: M7 — Index pass + rate_limits infrastructure

- [ ] **Step 1: Confirm the FK column names and duplicate-index names before dropping** (the audit may predate renames):

```sql
select indexname from pg_indexes where schemaname='public'
and indexname in ('idx_order_items_order','idx_profiles_user_id','idx_sites_type','idx_users_auth_provider');
select column_name from information_schema.columns
where table_schema='public' and table_name='payment_submissions' and column_name like '%request%';
```
Note: the spec table says `payment_submissions(request_id)` but the live column is `payment_request_id` (the checkout code inserts `payment_request_id`). Use the real column.

- [ ] **Step 2: Apply via `apply_migration`** with name `index_pass_and_rate_limits` (drop only the duplicate indexes Step 1 confirmed exist):

```sql
-- FK indexes that were missing
create index if not exists idx_order_items_product_id      on public.order_items (product_id);
create index if not exists idx_lead_form_site_id           on public.lead_form (site_id);
create index if not exists idx_lead_form_form_id           on public.lead_form (form_id);
create index if not exists idx_payment_submissions_request on public.payment_submissions (payment_request_id);
create index if not exists idx_site_singlepage_product_id  on public.site_singlepage (product_id);
create index if not exists idx_forms_site_id               on public.forms (site_id);
create index if not exists idx_site_design_tokens_creator  on public.site_design_tokens (creator_id);

-- Duplicate indexes (each shadows an identical one)
drop index if exists public.idx_order_items_order;
drop index if exists public.idx_profiles_user_id;
drop index if exists public.idx_sites_type;
drop index if exists public.idx_users_auth_provider;

-- Rate limiting: fixed-window counters, service-role only
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;
-- no policies: service-role access only

create or replace function public.check_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  -- clear this key's expired windows
  delete from rate_limits
  where key = p_key
    and window_start < now() - make_interval(secs => p_window_seconds * 2);

  insert into rate_limits (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set count = rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_max;
end;
$$;
revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
```

- [ ] **Step 3: Save the local file** per ground rule 5.

- [ ] **Step 4: Probe the RPC.**

```sql
select public.check_rate_limit('test:probe', 2, 60);  -- true
select public.check_rate_limit('test:probe', 2, 60);  -- true
select public.check_rate_limit('test:probe', 2, 60);  -- false (3rd call > max 2)
delete from public.rate_limits where key = 'test:probe';
```

### Task 8: Role backfill + types regeneration

- [ ] **Step 1: One-time `app_metadata.role` backfill** via `execute_sql` (data fix, not a migration file):

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object(
       'role',
       case
         when raw_user_meta_data->>'role' in ('creator', 'super_admin') then raw_user_meta_data->>'role'
         else 'buyer'  -- legacy 'user', 'buyer', or absent all map to buyer
       end
     )
where raw_app_meta_data->>'role' is null;
```

- [ ] **Step 2: Verify.**

```sql
select raw_app_meta_data->>'role' as role, count(*)
from auth.users group by 1;
```
Expected: every row has a role; values only `creator`, `buyer`, `super_admin`.

- [ ] **Step 3: Regenerate `types/database.types.ts`** using the Windows MCP fallback documented in `.claude/rules/supabase-reference.md` → "Regenerating types": call `mcp__plugin_supabase_supabase__generate_typescript_types` (project_id `qcendfisvyjnwmefruba`), then strip the JSON envelope with the documented Python snippet and write to `types/database.types.ts`.

- [ ] **Step 4: Verify the new types contain the new objects.**

Run: `grep -n "linkinbio_analytics\|ab_tests\|rate_limits\|credit_creator_balance\|increment_coupon_uses\|check_rate_limit\|increment_link_click_count" types/database.types.ts`
Expected: all seven names appear.

- [ ] **Step 5: Remove now-unneeded casts in `src/hooks/useAbTests.ts`** (if Task 4 left one) and in `app/api/linkinbio/track/route.ts` (the `'linkinbio_analytics' as any` / `(db as any).rpc(...)` casts at lines 44, 58, 65, 69 — replace with plain typed calls):

```typescript
      const { data: recent } = await db
        .from('linkinbio_analytics')
        .select('id')
        .eq('site_id', site_id)
        .eq('link_id', link_id)
        .eq('ip_hash', ipHash)
        .gte('created_at', thirtySecondsAgo)
        .limit(1);
```
```typescript
    await db.from('linkinbio_analytics').insert({
      site_id,
      link_id: link_id || null,
      event_type,
      referrer_url: referrer,
      user_agent: userAgent,
      ip_hash: ipHash,
    });
```
```typescript
      await db.rpc('increment_link_click_count', { p_link_id: link_id });
```
(Also delete the dead "Fallback if RPC doesn't exist" comment at lines 71–72.)

- [ ] **Step 6: Run** `npx tsc --noEmit`. Expected: same error count as the pre-change baseline or lower (record the baseline count now — it gates every later task).

---

## Phase 2 — Shared server libraries

### Task 9: Platform fee + profile resolution helpers

**Files:**
- Create: `src/lib/server/platform-fee.ts`
- Create: `src/lib/server/resolve-profile.ts`

- [ ] **Step 1: Create `src/lib/server/platform-fee.ts`:**

```typescript
// Platform fee policy — the single extension point for future tiered fees
// (per subscription / offer / creator). Server-only.

const DEFAULT_PLATFORM_FEE_RATE = 0.10;

export async function getPlatformFeeRate(creatorId: string | null): Promise<number> {
  void creatorId; // reserved for per-creator tiers
  return DEFAULT_PLATFORM_FEE_RATE;
}
```

- [ ] **Step 2: Create `src/lib/server/resolve-profile.ts`** (the 3-hop `auth.users → users → profiles` proven in `/api/sites/create`, with the same email fallback):

```typescript
// Resolves a Supabase auth user id to the profiles.id used as creator_id
// across the schema. Server-only (service role — RLS blocks cross-user reads).

import { createServiceClient } from '@/lib/supabase/service';

export async function resolveProfileId(
  authUserId: string,
  email?: string | null
): Promise<string | null> {
  const db = createServiceClient();

  let publicUserId: string | null = null;

  const { data: byAuthId, error: authIdErr } = await db
    .from('users')
    .select('id')
    .eq('auth_provider_id', authUserId)
    .maybeSingle();

  if (authIdErr) {
    console.error('[resolve-profile] users lookup failed:', authIdErr.message);
    return null;
  }

  publicUserId = byAuthId?.id ?? null;

  if (!publicUserId && email) {
    const { data: byEmail } = await db
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    publicUserId = byEmail?.id ?? null;
  }

  if (!publicUserId) return null;

  const { data: profile, error: profileErr } = await db
    .from('profiles')
    .select('id')
    .eq('user_id', publicUserId)
    .maybeSingle();

  if (profileErr) {
    console.error('[resolve-profile] profiles lookup failed:', profileErr.message);
    return null;
  }

  return profile?.id ?? null;
}
```

- [ ] **Step 3: Run** `npx tsc --noEmit`. Expected: no new errors.

### Task 10: Shared coupon validation

**Files:**
- Create: `src/lib/server/coupons.ts`
- Modify: `app/api/coupons/validate/route.ts`

- [ ] **Step 1: Create `src/lib/server/coupons.ts`** (extracted from `/api/coupons/validate`):

```typescript
// Shared coupon validation — used by /api/coupons/validate and /api/checkout/create.
// Server-only (service-role client passed in by the caller).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export type CouponValidation =
  | {
      valid: true;
      coupon: { id: string; code: string };
      discountAmount: number;
      finalPrice: number;
    }
  | { valid: false; reason: string; status: number };

export async function validateCoupon(
  db: SupabaseClient<Database>,
  code: string,
  creatorId: string,
  cartAmount: number
): Promise<CouponValidation> {
  const { data: coupon, error } = await db
    .from('coupons')
    .select('id, code, discount_type, discount_value, is_active, valid_from, valid_until, max_uses, current_uses')
    .eq('code', code.toUpperCase())
    .eq('creator_id', creatorId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !coupon) {
    return { valid: false, reason: 'Invalid coupon', status: 404 };
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
    return { valid: false, reason: 'Coupon expired', status: 400 };
  }
  if (coupon.valid_from && new Date(coupon.valid_from) > new Date()) {
    return { valid: false, reason: 'Coupon not yet active', status: 400 };
  }
  if (coupon.max_uses != null && (coupon.current_uses ?? 0) >= coupon.max_uses) {
    return { valid: false, reason: 'Coupon usage limit reached', status: 400 };
  }

  let discountAmount = 0;
  if (coupon.discount_type === 'percentage') {
    discountAmount = (cartAmount * coupon.discount_value) / 100;
  } else if (coupon.discount_type === 'fixed') {
    discountAmount = Math.min(coupon.discount_value, cartAmount);
  }

  return {
    valid: true,
    coupon: { id: coupon.id, code: coupon.code },
    discountAmount,
    finalPrice: cartAmount - discountAmount,
  };
}
```
(If `coupons` column names differ from this select, check `types/database.types.ts` and match them — do not use `select('*')`.)

- [ ] **Step 2: Rewrite `app/api/coupons/validate/route.ts`** to delegate (also removes the module-scope service client, which throws at import when env is missing):

```typescript
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { validateCoupon } from '@/lib/server/coupons';

export async function POST(req: Request) {
  try {
    const { code, cartAmount, creatorId } = await req.json();

    if (!code || !cartAmount || !creatorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = createServiceClient();
    const result = await validateCoupon(db, String(code), String(creatorId), Number(cartAmount));

    if (!result.valid) {
      return NextResponse.json({ error: result.reason }, { status: result.status });
    }

    return NextResponse.json({
      valid: true,
      discount_amount: result.discountAmount,
      final_price: result.finalPrice,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```
(Rate limiting is added to this route in Task 18 — don't add it here.)

- [ ] **Step 3: Run** `npx tsc --noEmit`. Expected: no new errors.

### Task 11: The fulfillment module (heart of the money loop)

**Files:**
- Create: `src/lib/server/fulfillment.ts`

- [ ] **Step 1: Create `src/lib/server/fulfillment.ts`:**

```typescript
// Single shared fulfillment for paid/free orders and payment-link submissions.
// The atomic status claim (pending → completed) is the idempotency mechanism:
// whoever wins the claim (webhook or status page) runs the side effects exactly once.
// Server-only (service role).

import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { getPlatformFeeRate } from './platform-fee';

export interface FulfillResult {
  fulfilled: boolean;
  alreadyFulfilled: boolean;
}

export async function fulfillOrder(
  orderId: string,
  opts?: { gatewayPaymentId?: string }
): Promise<FulfillResult> {
  const db = createServiceClient();

  // 1. Atomic claim — only one caller flips pending → completed
  const { data: claimed, error: claimErr } = await db
    .from('orders')
    .update({
      status: 'completed',
      gateway_payment_id: opts?.gatewayPaymentId ?? null,
      payment_verified_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('id, user_id, total_amount, creator_id, metadata')
    .maybeSingle();

  if (claimErr) throw claimErr;
  if (!claimed) return { fulfilled: false, alreadyFulfilled: true };

  const metadata = (claimed.metadata ?? {}) as Record<string, unknown>;
  const creatorId =
    claimed.creator_id ??
    (typeof metadata.creator_profile_id === 'string' ? metadata.creator_profile_id : null);

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
    if (creditErr) {
      console.error('[fulfillment] credit_creator_balance failed for order', orderId, creditErr.message);
    }
  } else {
    console.error('[fulfillment] order has no creator_id and no metadata.creator_profile_id — needs reconciliation:', orderId);
  }

  // 3. Ledger row — deterministic hash makes replays unique-violation no-ops
  const recordHash = crypto
    .createHash('sha256')
    .update(`${orderId}:${opts?.gatewayPaymentId ?? 'free'}`)
    .digest('hex');

  const { error: ledgerErr } = await db.from('transaction_ledger').insert({
    creator_id: creatorId,
    order_id: orderId,
    amount: total,
    direction: 'credit',
    tx_type: 'sale',
    currency: 'INR',
    record_hash: recordHash,
    meta: {
      platform_fee: platformFee,
      net_amount: creatorProceeds,
      ...(creatorId ? {} : { needs_reconciliation: true }),
    },
  });
  if (ledgerErr) {
    console.error('[fulfillment] ledger insert failed for order', orderId, ledgerErr.message);
  }

  // 4. Grant durable access for logged-in buyers (guests keep status-page links)
  if (claimed.user_id) {
    const { data: items, error: itemsErr } = await db
      .from('order_items')
      .select('product_id, price_at_purchase, products(name, product_link)')
      .eq('order_id', orderId);

    if (itemsErr) {
      console.error('[fulfillment] order_items read failed for order', orderId, itemsErr.message);
    }

    for (const item of items ?? []) {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const { error: accessErr } = await db.from('user_product_access').upsert(
        {
          user_id: claimed.user_id,
          order_id: orderId,
          product_id: item.product_id,
          product_name: product?.name ?? 'Product',
          product_link: product?.product_link ?? '',
          product_price: Number(item.price_at_purchase) || 0,
        },
        { onConflict: 'order_id,product_id', ignoreDuplicates: true }
      );
      if (accessErr) {
        console.error('[fulfillment] access grant failed for order', orderId, 'product', item.product_id, accessErr.message);
      }
    }
  }

  // 5. Coupon redemption
  const couponId = typeof metadata.coupon_id === 'string' ? metadata.coupon_id : null;
  if (couponId) {
    const { error: couponErr } = await db.rpc('increment_coupon_uses', { p_coupon_id: couponId });
    if (couponErr) {
      console.error('[fulfillment] coupon increment failed for order', orderId, couponErr.message);
    }
  }

  // 6. Notify the creator
  if (creatorId) {
    const { error: notifyErr } = await db.from('notifications').insert({
      recipient_creator_id: creatorId,
      title: 'New Sale!',
      message: `You earned ₹${creatorProceeds.toFixed(0)} from a new order`,
      type: 'sale',
    });
    if (notifyErr) {
      console.error('[fulfillment] notification insert failed for order', orderId, notifyErr.message);
    }
  }

  return { fulfilled: true, alreadyFulfilled: false };
}

export async function fulfillPaymentLinkSubmission(
  submissionId: string,
  gatewayPaymentId?: string
): Promise<FulfillResult> {
  const db = createServiceClient();

  // 1. Atomic claim on payment_submissions
  const { data: claimed, error: claimErr } = await db
    .from('payment_submissions')
    .update({ payment_status: 'completed' })
    .eq('id', submissionId)
    .eq('payment_status', 'pending')
    .select('id, amount, payment_request_id')
    .maybeSingle();

  if (claimErr) throw claimErr;
  if (!claimed) return { fulfilled: false, alreadyFulfilled: true };

  // 2. Resolve creator: payment_requests → sites.creator_id
  let creatorId: string | null = null;
  const { data: payRequest } = await db
    .from('payment_requests')
    .select('site_id')
    .eq('id', claimed.payment_request_id)
    .maybeSingle();
  if (payRequest?.site_id) {
    const { data: site } = await db
      .from('sites')
      .select('creator_id')
      .eq('id', payRequest.site_id)
      .maybeSingle();
    creatorId = site?.creator_id ?? null;
  }

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
    if (creditErr) {
      console.error('[fulfillment] credit_creator_balance failed for submission', submissionId, creditErr.message);
    }
  } else {
    console.error('[fulfillment] payment-link submission has no resolvable creator — needs reconciliation:', submissionId);
  }

  const recordHash = crypto
    .createHash('sha256')
    .update(`pl:${submissionId}:${gatewayPaymentId ?? ''}`)
    .digest('hex');

  const { error: ledgerErr } = await db.from('transaction_ledger').insert({
    creator_id: creatorId,
    order_id: null,
    amount,
    direction: 'credit',
    tx_type: 'payment_link',
    currency: 'INR',
    record_hash: recordHash,
    meta: {
      submission_id: submissionId,
      platform_fee: platformFee,
      net_amount: creatorProceeds,
      ...(creatorId ? {} : { needs_reconciliation: true }),
    },
  });
  if (ledgerErr) {
    console.error('[fulfillment] ledger insert failed for submission', submissionId, ledgerErr.message);
  }

  if (creatorId) {
    const { error: notifyErr } = await db.from('notifications').insert({
      recipient_creator_id: creatorId,
      title: 'Payment received!',
      message: `You received ₹${creatorProceeds.toFixed(0)} via a payment link`,
      type: 'sale',
    });
    if (notifyErr) {
      console.error('[fulfillment] notification insert failed for submission', submissionId, notifyErr.message);
    }
  }

  return { fulfilled: true, alreadyFulfilled: false };
}
```
If PostgREST's nested-relation typing makes `item.products` resolve to an awkward type, check `types/database.types.ts` for the FK name and adjust the embed (e.g. `products!order_items_product_id_fkey(name, product_link)`); do not fall back to `any`.

- [ ] **Step 2: Run** `npx tsc --noEmit`. Expected: no new errors.

### Task 12: Rate-limit helper + URL/CSS sanitizers

**Files:**
- Create: `src/lib/server/rate-limit.ts`
- Create: `src/lib/safe-redirect.ts`
- Create: `src/lib/safe-css.ts`

- [ ] **Step 1: Create `src/lib/server/rate-limit.ts`:**

```typescript
// Postgres-backed fixed-window rate limiting via the check_rate_limit RPC.
// Fail-open: if the RPC errors, allow the request (availability over strictness).
// Server-only.

import { createHash } from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';

export interface RateLimitOptions {
  max: number;
  windowSeconds: number;
}

export async function rateLimit(
  req: Request,
  routeName: string,
  opts: RateLimitOptions
): Promise<boolean> {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 32);

    const db = createServiceClient();
    const { data, error } = await db.rpc('check_rate_limit', {
      p_key: `${routeName}:${ipHash}`,
      p_max: opts.max,
      p_window_seconds: opts.windowSeconds,
    });

    if (error) {
      console.error('[rate-limit]', routeName, error.message);
      return true; // fail open
    }
    return data === true;
  } catch (err) {
    console.error('[rate-limit]', routeName, err);
    return true; // fail open
  }
}
```

- [ ] **Step 2: Create `src/lib/safe-redirect.ts`:**

```typescript
// Guards against open redirects (findings #6, #7).
// A safe path is same-origin relative: starts with exactly one '/',
// no protocol-relative '//', no backslash tricks.

export function isSafeInternalPath(p: string | null | undefined): p is string {
  return (
    typeof p === 'string' &&
    p.startsWith('/') &&
    !p.startsWith('//') &&
    !p.includes('\\')
  );
}
```

- [ ] **Step 3: Create `src/lib/safe-css.ts`:**

```typescript
// Sanitizes creator-supplied values interpolated into <style> tags (finding #8).
// Invalid values fall back to the existing defaults — never throw.

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;
const COLOR_FUNCTION = /^(rgb|rgba|hsl|hsla)\(\s*[\d.\s,%/]+\)$/;
const NAMED_COLOR = /^[a-zA-Z]+$/;
const FONT_FAMILY = /^[\w\s,'-]+$/;

export function safeCssColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  if (HEX_COLOR.test(v) || COLOR_FUNCTION.test(v) || NAMED_COLOR.test(v)) return v;
  return fallback;
}

export function safeFontFamily(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  return FONT_FAMILY.test(v) ? v : fallback;
}
```

- [ ] **Step 4: Run** `npx tsc --noEmit`. Expected: no new errors.

---

## Phase 3 — Money-loop callers

### Task 13: Webhook rewrite

**Files:**
- Modify: `app/api/webhook/cashfree/route.ts` (full rewrite)

- [ ] **Step 1: Replace the file content with:**

```typescript
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { fulfillOrder, fulfillPaymentLinkSubmission } from '@/lib/server/fulfillment';

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-webhook-signature');
    const rawBody = await req.text();

    const secret = process.env.CASHFREE_CLIENT_SECRET;
    if (!secret) {
      console.error('[webhook/cashfree] CASHFREE_CLIENT_SECRET is not configured');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // HMAC over the exact raw bytes, compared in constant time (finding #13)
    const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
    const sigBuf = Buffer.from(signature ?? '', 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    const signatureValid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

    if (!signatureValid) {
      console.warn('[webhook/cashfree] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

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

    // ── Payment-link submissions (gateway ids are prefixed pl_) ── (finding #10)
    if (gatewayOrderId.startsWith('pl_')) {
      const { data: submission } = await db
        .from('payment_submissions')
        .select('id, payment_status')
        .eq('gateway_order_id', gatewayOrderId)
        .maybeSingle();

      if (!submission) {
        console.warn('[webhook/cashfree] Submission not found for gateway_order_id:', gatewayOrderId);
        return NextResponse.json({ received: true }); // acknowledge to avoid retry storms
      }
      if (submission.payment_status === 'completed' || submission.payment_status === 'refunded') {
        return NextResponse.json({ received: true });
      }

      if (cfStatus === 'SUCCESS') {
        await fulfillPaymentLinkSubmission(submission.id, gatewayPaymentId);
      } else if (cfStatus === 'FAILED' || cfStatus === 'USER_DROPPED') {
        await db
          .from('payment_submissions')
          .update({ payment_status: 'failed' })
          .eq('id', submission.id)
          .eq('payment_status', 'pending');
      }
      return NextResponse.json({ received: true });
    }

    // ── Product orders ──
    const { data: order } = await db
      .from('orders')
      .select('id, status')
      .eq('gateway_order_id', gatewayOrderId)
      .maybeSingle();

    if (!order) {
      console.warn('[webhook/cashfree] Order not found for gateway_order_id:', gatewayOrderId);
      return NextResponse.json({ received: true });
    }
    // Fast-path early exit; correctness no longer depends on it (the claim does)
    if (order.status === 'completed' || order.status === 'refunded') {
      return NextResponse.json({ received: true });
    }

    if (cfStatus === 'SUCCESS') {
      await fulfillOrder(order.id, { gatewayPaymentId });
    } else if (cfStatus === 'FAILED' || cfStatus === 'USER_DROPPED') {
      await db
        .from('orders')
        .update({ status: 'failed' })
        .eq('id', order.id)
        .eq('status', 'pending');
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[webhook/cashfree]', error);
    const msg = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Run** `npx tsc --noEmit`. Expected: no new errors. Confirm the file has zero `as any` left (`grep -n "as any" app/api/webhook/cashfree/route.ts` → no hits).

### Task 14: Checkout-create rewrite

**Files:**
- Modify: `app/api/checkout/create/route.ts`

- [ ] **Step 1: Update imports** (top of file):

```typescript
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { validateCoupon } from '@/lib/server/coupons';
import { fulfillOrder } from '@/lib/server/fulfillment';
import { rateLimit } from '@/lib/server/rate-limit';
```

- [ ] **Step 2: Add rate limiting** as the first statement inside `POST`'s `try`:

```typescript
    if (!(await rateLimit(req, 'checkout-create', { max: 10, windowSeconds: 60 }))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
```

- [ ] **Step 3: Replace the raw coupon block** (current lines 46–56, the `if (couponCode)` block that ignores expiry/usage caps — finding #4) with the shared validator:

```typescript
    let discount = 0;
    let couponId: string | null = null;
    if (couponCode && creatorProfileId) {
      const couponResult = await validateCoupon(supabase, String(couponCode), creatorProfileId, subtotal);
      if (!couponResult.valid) {
        return NextResponse.json({ error: couponResult.reason }, { status: couponResult.status });
      }
      discount = couponResult.discountAmount;
      couponId = couponResult.coupon.id;
    }
```

- [ ] **Step 4: Store the coupon in order metadata** (replace the current `orderMeta` line ~73):

```typescript
    const orderMeta = {
      creator_profile_id: creatorProfileId,
      ...(couponId ? { coupon_id: couponId, discount_amount: discount } : {}),
      ...(upsellPageId ? { upsell_page_id: upsellPageId } : {}),
    };
```

- [ ] **Step 5: Delete the retry-without-column insert fallback** (finding #18; current lines 75–98). The live schema has `creator_id` and `payment_verified_at` (verified in `types/database.types.ts`). Replace with one typed insert:

```typescript
    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      gateway_order_id: gatewayOrderId,
      user_id: buyerId ?? null,
      creator_id: creatorProfileId,
      origin_site_id: originSiteId,
      total_amount: total,
      status: 'pending',
      customer_name: contact?.name ?? null,
      customer_email: contact?.email ?? null,
      customer_phone: contact?.phone ?? null,
      metadata: orderMeta,
    });
    if (orderError) throw orderError;
```

- [ ] **Step 6: Type the remaining casts on edited lines.** The `site_singlepage` lookup (lines 61–66) and `order_items` insert (line 107) lose their `as any` (both tables are in `database.types.ts`):

```typescript
    const { data: siteRow } = await supabase
      .from('site_singlepage')
      .select('site_id')
      .eq('product_id', dbProducts[0].id)
      .maybeSingle();
    const originSiteId = siteRow?.site_id ?? null;
```
```typescript
    await supabase.from('order_items').insert(orderItems);
```

- [ ] **Step 7: Replace the free-order inline completion** (current lines 110–117) so free orders also grant access and redeem coupons:

```typescript
    if (total === 0) {
      await fulfillOrder(orderId);
      return NextResponse.json({ orderId, amount: 0, status: 'completed' });
    }
```

- [ ] **Step 8: Fix the cleanup update on Cashfree failure** (line 151) to a typed call: `await supabase.from('orders').update({ status: 'failed' }).eq('id', orderId);`. Also change `catch (error: any)` at line 165 to `catch (error)` with `const msg = error instanceof Error ? error.message : 'Internal error';`. Same for `items.map((i: any) => i.id)` at line 19 → `items.map((i: { id: string }) => i.id)`.

- [ ] **Step 9: Run** `npx tsc --noEmit` and `grep -n "as any" app/api/checkout/create/route.ts` (expected: no hits). 

### Task 15: Payment-link route hardening

**Files:**
- Modify: `app/api/checkout/payment-link/route.ts`

- [ ] **Step 1: Add rate limiting** (import `rateLimit` from `@/lib/server/rate-limit`; first statement inside `try`):

```typescript
    if (!(await rateLimit(req, 'checkout-payment-link', { max: 10, windowSeconds: 60 }))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
```

- [ ] **Step 2: Close the auto-create hole.** Before the `payment_requests` lookup (insert after the amount validation at line 48), verify the site is real, active, and a payment site:

```typescript
    // Auto-creating payment_requests for arbitrary siteIds was an abuse hole —
    // the site must exist, be active, and actually be a payment site.
    const { data: site } = await supabase
      .from('sites')
      .select('id, is_active, site_type')
      .eq('id', siteId)
      .maybeSingle();

    if (!site || !site.is_active || site.site_type !== 'payment') {
      return NextResponse.json({ error: 'Payment page not found' }, { status: 404 });
    }
```
(If `sites.is_active` or `sites.site_type` have different names in `types/database.types.ts`, match the real columns.)

- [ ] **Step 3: Run** `npx tsc --noEmit`. Expected: no new errors.

### Task 16: Payment status + receipt pages become thin callers

**Files:**
- Modify: `app/payment/status/page.tsx` (data logic only, lines 1–176; rendering below line 178 is untouched)
- Modify: `app/payment/receipt/page.tsx` (client swap only)

- [ ] **Step 1: In `app/payment/status/page.tsx`, replace the imports and module-scope client** (lines 7–19):

```typescript
import { createServiceClient } from '@/lib/supabase/service';
import { fulfillOrder, fulfillPaymentLinkSubmission } from '@/lib/server/fulfillment';
```
Delete the `const supabase = createClient(...)` module-scope block. Keep the lucide imports, `Link`, and `CartClearer`.

- [ ] **Step 2: Instantiate the client inside the page component** (after the `if (!order_id)` guard):

```typescript
  const supabase = createServiceClient();
```

- [ ] **Step 3: Rewrite the payment-link branch** (lines 93–119) — DB status first, Cashfree only when still pending, fulfillment via the shared function:

```typescript
  if (sub) {
    // ═══ Payment Link flow ═══
    const { data: submission } = await supabase
      .from('payment_submissions')
      .select('*, payment_requests(title)')
      .eq('id', sub)
      .single();

    if (submission) {
      if (submission.payment_status === 'completed') {
        status = 'completed';
      } else if (submission.payment_status === 'failed' || submission.payment_status === 'refunded') {
        status = 'failed';
      } else {
        // Still pending in our DB — reconcile against Cashfree (finding #27)
        const cfStatus = await getCashfreeStatus(submission.gateway_order_id || order_id);
        status = cfToDbStatus(cfStatus);
        if (status === 'completed') {
          await fulfillPaymentLinkSubmission(submission.id);
        }
        // 'failed' is display-only here; the webhook owns failure transitions
      }

      amount = submission.amount ?? 0;
      customerName = submission.customer_name || 'Customer';
      customerEmail = submission.customer_email || '';
      const pr = Array.isArray(submission.payment_requests)
        ? submission.payment_requests[0]
        : submission.payment_requests;
      itemName = pr?.title || 'Payment';
      receiptUrl = `/payment/receipt?order_id=${order_id}&sub=${sub}`;
    }
  }
```

- [ ] **Step 4: Rewrite the product-order branch** (lines 120–176) the same way:

```typescript
  else {
    // ═══ Product checkout flow ═══
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order_id);
    const col = isUUID ? 'id' : 'gateway_order_id';

    const { data: order } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          price_at_purchase,
          products(name, thumbnail_url, product_link, post_purchase_url, post_purchase_instructions)
        )
      `)
      .eq(col, order_id)
      .single();

    if (order) {
      internalOrderId = order.id;

      if (order.status === 'completed') {
        status = 'completed';
      } else if (order.status === 'failed' || order.status === 'refunded') {
        status = 'failed';
      } else {
        // Still pending in our DB — reconcile against Cashfree (finding #27)
        const cfStatus = await getCashfreeStatus(order.gateway_order_id || order_id);
        status = cfToDbStatus(cfStatus);
        if (status === 'completed') {
          await fulfillOrder(order.id); // shared claim — no raw writes here (finding #1)
        }
        // 'failed' is display-only here; the webhook owns failure transitions
      }

      amount = order.total_amount ?? 0;
      customerName = order.customer_name || 'Customer';
      customerEmail = order.customer_email || '';
      receiptUrl = `/payment/receipt?order_id=${internalOrderId}`;

      products = (order.order_items ?? [])
        .map((item) => {
          const p = Array.isArray(item.products) ? item.products[0] : item.products;
          return p
            ? {
                name: p.name,
                thumbnail_url: p.thumbnail_url,
                product_link: p.product_link,
                post_purchase_url: p.post_purchase_url,
                post_purchase_instructions: p.post_purchase_instructions,
                price: Number(item.price_at_purchase) || 0,
              }
            : null;
        })
        .filter((p): p is ProductAccess => p !== null);

      const names = products.map((p) => p.name);
      itemName = names.length ? names.join(', ') : 'Digital Products';
    }
  }
```
If the nested embed select doesn't typecheck cleanly, check the FK alias in `types/database.types.ts`; only as a last resort keep one narrowly-scoped cast on the select with a one-line comment.

- [ ] **Step 5: In `app/payment/receipt/page.tsx`, swap the client** (finding #19). Replace lines 1 and 8–11:

```typescript
import { createServiceClient } from '@/lib/supabase/service';
```
Delete the module-scope `const supabase = createClient(...)` and add inside the component, before the first query:
```typescript
  const supabase = createServiceClient();
```

- [ ] **Step 6: Run** `npx tsc --noEmit`. Then `grep -rn "SUPABASE_SERVICE_KEY" app/payment/` — expected: no hits.

---

## Phase 4 — Identity & authorization

### Task 17: Payout identity fix + sites/create adopts the shared resolver

**Files:**
- Modify: `app/api/payouts/request/route.ts`
- Modify: `app/api/sites/create/route.ts:63-130`

- [ ] **Step 1: In `app/api/payouts/request/route.ts`**, add the import and resolve the profile after the auth check (finding #3 — `creator_kyc`/`creator_balances`/`creator_payouts` key off `profiles.id`, not `auth.users.id`; **no creator has ever been able to request a payout**):

```typescript
import { resolveProfileId } from '@/lib/server/resolve-profile';
```
After the `if (!user)` guard and amount validation:
```typescript
    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) {
      return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });
    }
```

- [ ] **Step 2: Replace all four `user.id` keys with `profileId`:** the `creator_kyc` select (line 27 `.eq('creator_id', user.id)`), the `creator_balances` select (line 38), the `creator_balances` update (line 60), and the `creator_payouts` insert (line 72 `creator_id: user.id`). All become `profileId`.

- [ ] **Step 3: Fix the edited error handler:** `catch (error: any)` at line 86 → `catch (error)` (the body doesn't use `error.message`, only logs it — keep `console.error('Payout Request Error:', error)`).

- [ ] **Step 4: In `app/api/sites/create/route.ts`**, replace the inline 3-hop block (lines 73–125, from `// Resolve auth user → public users → profiles` through the second `return await createSite(...)`) with:

```typescript
    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) {
      return NextResponse.json(
        { error: 'User record not found. Please complete your profile setup.' },
        { status: 404 }
      );
    }

    return await createSite(req, db, profileId);
```
Add the import `import { resolveProfileId } from '@/lib/server/resolve-profile';`.

- [ ] **Step 5: Run** `npx tsc --noEmit`. Expected: no new errors.

### Task 18: `useCoupons` identity fix

**Files:**
- Modify: `src/hooks/useCoupons.ts`

- [ ] **Step 1: Replace `user.id` with the resolved profile id** (finding #5 — coupons key off `profiles.id`; the dashboard list has always been empty and inserts have carried the wrong id). New file content:

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import { Database } from '@/types/database.types';

type CouponInsert = Database['public']['Tables']['coupons']['Insert'];

export function useCoupons() {
  const queryClient = useQueryClient();

  const { data: coupons = [], isLoading, error } = useQuery({
    queryKey: ['coupons', 'list'],
    queryFn: async () => {
      const creatorId = await getCreatorProfileId();

      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newCoupon: Omit<CouponInsert, 'creator_id'>) => {
      const creatorId = await getCreatorProfileId();

      const { data, error } = await supabase
        .from('coupons')
        .insert({ ...newCoupon, creator_id: creatorId } as CouponInsert)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    }
  });

  return {
    coupons,
    isLoading,
    error,
    createCoupon: createMutation.mutateAsync,
    isCreating: createMutation.isPending
  };
}
```
(The query key also picks up its Task 22 normalization here — `['coupons','list']` — so this file is only touched once. The `invalidateQueries({ queryKey: ['coupons'] })` prefix-matches and stays.)

- [ ] **Step 2: Run** `npx tsc --noEmit`. Expected: no new errors.

### Task 19: Safe redirects + role storage

**Files:**
- Modify: `app/api/auth/callback/route.ts` (full rewrite)
- Modify: `app/(auth)/login/page.tsx:46-50, 87-91`
- Modify: `app/(auth)/signup/page.tsx:37, 123`

- [ ] **Step 1: Rewrite `app/api/auth/callback/route.ts`** (findings #6 — open redirect via `?next=` — and #11 — role promotion into `app_metadata`):

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isSafeInternalPath } from '@/lib/safe-redirect';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next');
  const next = isSafeInternalPath(nextParam) ? nextParam : '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Promote the signup-requested role into server-controlled app_metadata.
      // user_metadata is client-editable and must never open the dashboard gate.
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.app_metadata?.role) {
        const requested = user.user_metadata?.role;
        const role = requested === 'creator' ? 'creator' : 'buyer'; // 'user'/absent → buyer
        try {
          const admin = createServiceClient();
          await admin.auth.admin.updateUserById(user.id, { app_metadata: { role } });
          // Re-mint the JWT so proxy.ts sees the new app_metadata immediately
          await supabase.auth.refreshSession();
        } catch (promoteErr) {
          console.error('[auth/callback] role promotion failed:', promoteErr);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('Callback error exchanging code:', error);
  }

  return NextResponse.redirect(
    `${origin}/login?error=Could not verify email. Try signing up again or disabling Email Confirmations locally.`
  );
}
```

- [ ] **Step 2: Guard both `returnUrl` consumers in `app/(auth)/login/page.tsx`** (finding #7). Add `import { isSafeInternalPath } from '@/lib/safe-redirect';` and change both blocks (lines 46–50 and 87–91) from `if (returnUrl) {` to:

```typescript
      const returnUrl = searchParams.get('returnUrl');
      if (isSafeInternalPath(returnUrl)) {
        window.location.replace(returnUrl);   // line 48 variant; line 89 uses window.location.href
        return;
      }
```
The unsafe-returnUrl case now falls through to the existing role-based default redirect that already follows each block — no other changes there.

- [ ] **Step 3: In `app/(auth)/signup/page.tsx`** (finding #21), change the role state and toggle values from `'user'` to `'buyer'`:
  - Line 37: `useState<'creator' | 'user'>('creator')` → `useState<'creator' | 'buyer'>('creator')`
  - Line 123: `['user', 'Buyer', ShoppingBag, 'Buy products']` → `['buyer', 'Buyer', ShoppingBag, 'Buy products']`
  - Run `grep -n "'user'" "app/(auth)/signup/page.tsx"` to catch any other occurrence of the literal.

The `signUp(options.data: { full_name, role })` call at line 66–69 stays — the role in `user_metadata` is now only a *request* that the callback promotes.

- [ ] **Step 4: Run** `npx tsc --noEmit`. Expected: no new errors.

### Task 20: CSS-injection guards on storefront theming

**Files:**
- Modify: `src/lib/storefront-theme.ts`
- Modify: `app/(storefront)/site/[slug]/layout.tsx`
- Modify: `app/(storefront)/store/[slug]/layout.tsx`
- Modify: `app/(storefront)/link/[username]/layout.tsx`
- Modify: `app/(storefront)/upsells/[slug]/layout.tsx`

All five interpolate creator-controlled JSON into `<style>` tags (finding #8). Apply `safeCssColor` at **every** interpolation point; the existing per-file defaults stay as the fallbacks.

- [ ] **Step 1: `src/lib/storefront-theme.ts`** — add `import { safeCssColor } from '@/lib/safe-css';` and replace the `themeCSS` template (lines 20–30):

```typescript
  const themeCSS = `
    :root {
      --creator-primary: ${safeCssColor(palette.primary, '#6366F1')};
      --creator-secondary: ${safeCssColor(palette.secondary, '#8B5CF6')};
      --creator-accent: ${safeCssColor(palette.accent, '#EC4899')};
      --creator-surface: ${safeCssColor(palette.surface, '#FFFFFF')};
      --creator-text: ${safeCssColor(palette.text, '#0F172A')};
      --creator-text-muted: ${safeCssColor(palette.muted, '#64748B')};
      --creator-bg: ${safeCssColor(palette.background, '#FFFFFF')};
    }
  `;
```
Also fix the edited line's type: `const palette = (tokens?.color_palette as any) || {...}` → 
```typescript
  const palette: Record<string, unknown> =
    (tokens?.color_palette as Record<string, unknown> | null) ?? {};
```
(with the literal defaults now living in the `safeCssColor` fallbacks instead of the default object).

- [ ] **Step 2: Apply the same transformation to the three storefront layouts.** Each has an identical `themeCSS` block — wrap every `palette.X` with `safeCssColor(palette.X, '<that file's existing default>')`. Defaults per file: `site/[slug]` and `link/[username]` use primary `#EC4899`, secondary `#8B5CF6`, accent `#F59E0B`; `store/[slug]` uses primary `#6366F1`, secondary `#8B5CF6`, accent `#EC4899`; all use surface `#FFFFFF`, text `#0F172A`, muted `#64748B`, background `#FFFFFF`. Also wrap the inline `style={{ backgroundColor: palette.background || '#FFFFFF' }}` usages: `style={{ backgroundColor: safeCssColor(palette.background, '#FFFFFF') }}`.

- [ ] **Step 3: `app/(storefront)/upsells/[slug]/layout.tsx`** — sanitize at assignment (lines 26–28), so the derived `${textColor}99` strings inherit safety:

```typescript
  const primaryColor = safeCssColor(theme.primary_color, '#6366F1');
  const bgColor = safeCssColor(theme.bg_color, '#FFFFFF');
  const textColor = safeCssColor(theme.text_color, '#0F172A');
```

- [ ] **Step 4: Check for font interpolation.** Run `grep -rn "font-family: \${" app/ src/`. If any hit interpolates creator data, wrap it with `safeFontFamily(value, 'inherit')`. (As of plan-writing, `typography` is fetched but never interpolated — `safeFontFamily` exists for the day it is.)

- [ ] **Step 5: Run** `npx tsc --noEmit`. Expected: no new errors.

---

## Phase 5 — Platform hardening

### Task 21: Proxy rewrite

**Files:**
- Modify: `proxy.ts` (full rewrite)

Fixes findings #15 (substring host matching — `evil-digione.ai.attacker.com` contains `digione.ai`) and #22 (a `getUser()` network call on every request including marketing/storefront traffic). Role gate moves to `app_metadata.role` (finding #11).

- [ ] **Step 1: Replace the file content with:**

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

const GUARDED_PREFIXES = ['/dashboard', '/account'];

function isMainHost(hostHeader: string): boolean {
  const host = hostHeader.toLowerCase().split(':')[0];
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000')
    .toLowerCase()
    .split(':')[0];

  if (host === root || host.endsWith(`.${root}`)) return true;
  if (host === 'digione.ai' || host.endsWith('.digione.ai')) return true;
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.vercel.app')) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

export default async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // 1. Custom-domain rewrite — exact host matching, no Supabase client
  if (!isMainHost(hostname)) {
    url.pathname = `/_custom/${hostname}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // 2. Unguarded paths (marketing, storefronts, discover, checkout) — zero auth work
  const isGuarded = GUARDED_PREFIXES.some((p) => url.pathname.startsWith(p));
  if (!isGuarded) {
    return NextResponse.next();
  }

  // 3. Guarded path, no Supabase auth cookie — redirect without a network call
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'));
  if (!hasAuthCookie) {
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('returnUrl', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // 4. Guarded path with a cookie — verify the JWT and refresh the session
  let supabaseResponse = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('returnUrl', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (url.pathname.startsWith('/dashboard')) {
    // Server-controlled app_metadata only — user_metadata is client-editable
    const role = user.app_metadata?.role;
    if (role !== 'creator' && role !== 'super_admin') {
      url.pathname = '/account/library';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Everything except: /api/* (routes do their own auth and return 401 inline),
     * Next.js internals, and static assets.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```
Note: the old code exempted `/api` paths from the custom-domain rewrite inside the function; with `/api` excluded from the matcher, those requests never reach the proxy at all — same net behavior, zero middleware cost.

- [ ] **Step 2: Run** `npx tsc --noEmit`. Expected: no new errors.

- [ ] **Step 3: Behavioral probe** (needs the dev server: `npm run dev`):
  - `http://localhost:3000/` loads with no auth redirect.
  - `http://localhost:3000/dashboard` (logged out / incognito) → redirects to `/login?returnUrl=%2Fdashboard`.
  - Log in as a creator → `/dashboard` loads (the Task 8 backfill gave existing users `app_metadata.role`).

### Task 22: Rate limiting on the remaining public routes

**Files:**
- Modify: `app/api/leads/route.ts`
- Modify: `app/api/coupons/validate/route.ts`
- Modify: `app/api/products/search/route.ts`
- Modify: `app/api/linkinbio/track/route.ts`

(`checkout/create` and `checkout/payment-link` got theirs in Tasks 14–15.)

- [ ] **Step 1: Add to each route** — `import { rateLimit } from '@/lib/server/rate-limit';` and as the first statement inside the handler's `try`:

| File | Call |
|---|---|
| `app/api/leads/route.ts` | `if (!(await rateLimit(req, 'leads', { max: 5, windowSeconds: 60 }))) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });` |
| `app/api/coupons/validate/route.ts` | `if (!(await rateLimit(req, 'coupons-validate', { max: 10, windowSeconds: 60 }))) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });` |
| `app/api/products/search/route.ts` | `if (!(await rateLimit(req, 'products-search', { max: 30, windowSeconds: 60 }))) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });` |
| `app/api/linkinbio/track/route.ts` | `if (!(await rateLimit(req, 'linkinbio-track', { max: 60, windowSeconds: 60 }))) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });` |

`linkinbio/track` keeps its existing 30-second dedupe logic — the rate limit sits in front of it. (Spec note: this route normally always returns 2xx; the 429 is the one deliberate exception, added for abuse pressure — fire-and-forget clients ignore it.)

- [ ] **Step 2: Run** `npx tsc --noEmit`. Expected: no new errors.

- [ ] **Step 3: Burst probe** (dev server running). PowerShell:

```powershell
1..7 | ForEach-Object { try { (Invoke-WebRequest -Uri 'http://localhost:3000/api/leads' -Method POST -ContentType 'application/json' -Body '{}' -UseBasicParsing).StatusCode } catch { $_.Exception.Response.StatusCode.value__ } }
```
Expected: five `400`s (missing fields — but they passed the limiter) followed by `429`s.

---

## Phase 6 — Dead code, discover, hook hygiene

### Task 23: Dead code removal + discover inlining

**Files:**
- Delete: `src/hooks/usePayoutRequests.ts` (zero consumers; targets a nonexistent table)
- Delete: `src/hooks/useSiteConfig.ts` (zero consumers; `site_config` table doesn't exist)
- Delete: `src/hooks/useDiscoverProduct.ts`
- Delete: `app/api/discover/route.ts`
- Delete: `app/api/discover/[productId]/route.ts`
- Modify: `src/hooks/useStorefront.ts`
- Modify: `app/(marketing)/discover/page.tsx`
- Modify: `app/(marketing)/discover/[productId]/page.tsx`

> **Spec deviation, documented:** the spec says "inline equivalent RLS-public queries into the discover Server Components", but both discover pages are interactive Client Components (debounced search, category filters, image carousel state). Converting them to Server Components is a redesign, not a fix. Instead: delete the routes and the hook, and query Supabase **directly from the browser client** (RLS `products_select_published` + `profiles_select_public` allow anon reads — verified in `.claude/todo-later/4-2026-06-04-discover-routes-removal.md`). This removes the HTTP hop and the over-privileged service-role client, which is the point of the finding.

- [ ] **Step 1: Confirm zero consumers, then delete the two dead hooks.**

Run: `grep -rn "usePayoutRequests\|useSiteConfig" app/ src/ --include="*.ts" --include="*.tsx"`
Expected: only the two definition files. Delete `src/hooks/usePayoutRequests.ts` and `src/hooks/useSiteConfig.ts`.

- [ ] **Step 2: Remove the dead `site_config` read from `useStorefront`** (the table doesn't exist; the query has been silently failing). New `src/hooks/useStorefront.ts`:

```typescript
"use client";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useStorefront(slug: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['storefront', 'detail', slug],
    queryFn: async () => {
      const { data: site, error: siteErr } = await supabase
        .from('sites')
        .select('creator_id')
        .eq('slug', slug)
        .single();

      if (siteErr || !site) throw new Error('Storefront not found');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', site.creator_id)
        .single();

      return { profile };
    },
    staleTime: 1000 * 60 * 5, // public store data — 5 min is fine
  });
}
```
(The key also picks up its Task 22→24 normalization — `['storefront','detail', slug]`. Confirm no consumer destructures `config` from this hook: `grep -rn "useStorefront" app/ src/ --include="*.tsx"` — as of plan-writing there are zero call sites.)

- [ ] **Step 3: Rework `app/(marketing)/discover/page.tsx`** — replace the `useEffect` fetch (lines 54–81) with a debounced TanStack query against the browser client:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
```
Replace the `products`/`loading` state and the fetch effect with:
```typescript
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'price_low' | 'price_high'>('latest');
  const [showFilters, setShowFilters] = useState(false);

  // debounce the search input (UI logic, not data fetching)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: products = [], isLoading: loading } = useQuery({
    queryKey: ['discover', 'list', debouncedSearch, activeCategory],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase
        .from('products')
        .select(`
          id, name, description, price, category, thumbnail_url, images, created_at,
          creator_id,
          profiles!fk_products_creator ( id, full_name, avatar_url )
        `)
        .eq('is_published', true)
        .eq('is_on_discover_page', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (debouncedSearch) query = query.ilike('name', `%${debouncedSearch}%`);
      if (activeCategory !== 'all') query = query.eq('category', activeCategory);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
```
Everything below (`sortedProducts`, `groupedByCategory`, rendering) is unchanged.

- [ ] **Step 4: Rework `app/(marketing)/discover/[productId]/page.tsx`** — delete the `useDiscoverProduct` import and inline the three queries from the old route (preserving its exact filters, including the `.or()` related-products logic and the creator-list's deliberate omission of `is_on_discover_page`):

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
```
```typescript
  const { productId } = useParams<{ productId: string }>();
  const { data, isLoading: loading, isError } = useQuery({
    queryKey: ['discover', 'product', productId ?? null],
    enabled: !!productId,
    queryFn: async () => {
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          id, name, description, price, category, thumbnail_url, images,
          content, creator_id, is_published, is_on_discover_page,
          post_purchase_instructions, created_at,
          profiles!fk_products_creator ( id, full_name, avatar_url, email )
        `)
        .eq('id', productId!)
        .eq('is_published', true)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      if (!product) throw new Error('Product not found');

      const { data: related } = await supabase
        .from('products')
        .select(`
          id, name, price, category, thumbnail_url, creator_id,
          profiles!fk_products_creator ( id, full_name, avatar_url )
        `)
        .eq('is_published', true)
        .eq('is_on_discover_page', true)
        .is('deleted_at', null)
        .neq('id', productId!)
        .or(`category.eq.${product.category},creator_id.eq.${product.creator_id}`)
        .limit(8);

      const { data: creatorProducts } = await supabase
        .from('products')
        .select('id, name, price, category, thumbnail_url, creator_id')
        .eq('creator_id', product.creator_id)
        .eq('is_published', true)
        .is('deleted_at', null)
        .neq('id', productId!)
        .limit(4);

      return {
        product,
        related: related ?? [],
        creatorProducts: creatorProducts ?? [],
      };
    },
  });
  const product = data?.product ?? null;
  const related = data?.related ?? [];
  const creatorProducts = data?.creatorProducts ?? [];
```
The page's local `Creator`/`RelatedProduct` interfaces (lines 13–28) stay and keep typing the render code. If field-type mismatches surface against the inferred Supabase row types, adjust the local interfaces to match the queried columns rather than casting.

- [ ] **Step 5: Delete** `app/api/discover/route.ts`, `app/api/discover/[productId]/route.ts`, and `src/hooks/useDiscoverProduct.ts`.

- [ ] **Step 6: Run** `npx tsc --noEmit` and verify `/discover` + a product detail page render in the browser (dev server, products must exist with `is_on_discover_page = true`).

### Task 24: Hook hygiene — query keys, polling, select discipline

**Files:**
- Modify: `app/providers.tsx` (verify only)
- Modify: `src/hooks/useNotifications.ts`
- Modify: the hooks listed in the key table below
- Modify: invalidation call sites listed in Step 4

- [ ] **Step 1: Verify the global `staleTime` already exists** (spec #20). `app/providers.tsx:7-14` already sets `staleTime: 60 * 1000` and `refetchOnWindowFocus: false`. No change needed — confirm and move on.

- [ ] **Step 2: `useNotifications` poll interval** (spec #23): in `src/hooks/useNotifications.ts:27`, change `refetchInterval: 30_000` → `refetchInterval: 120_000` (comment: `// poll every 2 min — notifications are not chat`). While in the file, normalize its keys (Step 3 table) and type the `(n: any)` filter at line 54: with the Task 8 types, `notifications.filter((n) => !n.is_read)`.

- [ ] **Step 3: Normalize query keys.** For each hook, change the `queryKey` arrays exactly as follows (spec table; `useAbTests`, `useCoupons`, `useStorefront` were already done in Tasks 4/18/23):

| File | Old key(s) | New key(s) |
|---|---|---|
| `src/hooks/useAnalytics.ts` | `['analytics', start, end]` | `['analytics','range', start, end]` |
| `src/hooks/useAffiliates.ts` | `['affiliates']` | `['affiliates','list']` |
| `src/hooks/useCreator.ts` | `['creator-profile']` | `['creator','profile']` |
| `src/hooks/useCustomers.ts` | `['customers']` | `['customers','list']` |
| `src/hooks/useEarnings.ts` | `['creator-earnings']` | `['earnings','summary']` |
| `src/hooks/useGuestLeads.ts` | `['guest-leads', siteId]` | `['leads','list', siteId]` |
| `src/hooks/useLibrary.ts` | `['library']` | `['library','list']` |
| `src/hooks/useNotifications.ts` | `['notifications']` | `['notifications','list']` |
| `src/hooks/useOrders.ts` | `['creator-orders']` | `['orders','list']` |
| `src/hooks/useProductPage.ts` | `['product', creatorId, slug]` | `['products','page', creatorId, slug]` |
| `src/hooks/useProducts.ts` | `['products']` / `['product', id]` | `['products','list']` / `['products','detail', id]` |
| `src/hooks/useSites.ts` | `['creator-sites']` | `['sites','list']` |
| `src/hooks/useStoreProducts.ts` | `['store-products', creatorId]` | `['products','store', creatorId]` |
| `src/hooks/useUpsellPages.ts` | `['upsell-pages']` / `['upsell-page', id]` | `['upsells','list']` / `['upsells','detail', id]` |

Already compliant (do not touch): `useAuthSession`, `useCommunity`, `useMarketingStats`, `useProfile`, `useReferrals`, `useServices`, `useSiteEdit`, `useLinkInBioSite`, `useSinglePageSite`.

- [ ] **Step 4: Update every invalidation/setQueryData call site in the same pass.** Known sites as of plan-writing (re-grep to be safe: `grep -rn "invalidateQueries\|setQueryData" app/ src/ --include="*.ts" --include="*.tsx"`):

| Location | Change |
|---|---|
| `src/hooks/useAffiliates.ts:46,60,68` | `['affiliates']` → `['affiliates','list']` |
| `src/hooks/useCreator.ts:53` | `['creator-profile']` → `['creator','profile']` |
| `src/hooks/useEarnings.ts:56` | `['creator-earnings']` → `['earnings','summary']` |
| `src/hooks/useNotifications.ts:38,51` | `['notifications']` → `['notifications','list']` |
| `src/hooks/useProducts.ts:54,75,77` | `['products']` stays (prefix-matches both new keys); `['product', data.id]` → `['products','detail', data.id]` |
| `src/hooks/useSites.ts:82,93` | `['creator-sites']` → `['sites','list']` |
| `src/hooks/useUpsellPages.ts:85,105,106,123` | `['upsell-pages']` → `['upsells','list']`; `['upsell-page', data.id]` → `['upsells','detail', data.id]` |
| `app/dashboard/marketing/coupons/page.tsx:78,85` | `['coupons']` stays (prefix-matches `['coupons','list']`) — verify, no change |
| `src/hooks/useGuestLeads.ts` (its own invalidations, if any) | `['guest-leads', ...]` → `['leads','list', ...]` |
| Already-correct sites (`useAuthSession:92`, `useCommunity:71`, `useServices:68-110`, `useReferrals:57`, `useProfile:42-43`, `useSiteEdit:85`, `MarketingNav:95`, `SiteVisualEditor:223`, `SiteEditShell:214`, site-edit pages under `app/dashboard/sites/edit/*`) | no change |

Rule: an `invalidateQueries({ queryKey: ['domain'] })` call **survives** any rename that keeps the same first segment (prefix matching). Only calls whose first segment changed (`creator-profile`, `creator-earnings`, `creator-orders`, `creator-sites`, `guest-leads`, `store-products`, `upsell-pages`, `product`) must be rewritten.

- [ ] **Step 5: `select('*')` discipline on the hooks touched in Step 3 only.** For each hook file edited: if the hook's consumers use a known narrow set of columns, list them explicitly; if the full typed row is genuinely consumed wholesale (typical for dashboard tables), keep `select('*')` and add a one-line justification comment above it, e.g. `// full row: rendered wholesale by the orders DataTable`. Do not refactor hooks not already being edited.

- [ ] **Step 6: Run** `npx tsc --noEmit` and `npm run lint`. Expected: type-clean; zero new lint errors vs baseline. Then a behavioral spot-check in the dev server: dashboard → products page loads, create/edit a product, list refreshes (proves invalidation still works after the rename).

---

## Phase 7 — Docs + final verification

### Task 25: Documentation corrections (same change-set)

**Files:**
- Modify: `.claude/rules/api-routes.md`
- Modify: `.claude/rules/security-model.md`
- Modify: `.claude/rules/cashfree-reference.md`
- Modify: `.claude/rules/hooks-reference.md`
- Modify: `.claude/todo-later/2-2026-06-03-db-audit.md`, `.claude/todo-later/3-2026-06-03-new-db-audit.md`, `.claude/todo-later/4-2026-06-04-discover-routes-removal.md`

- [ ] **Step 1: `api-routes.md`:**
  - Remove the two `/api/discover*` rows from the at-a-glance table and their dedicated sections.
  - `/api/payouts/request`: correct the preconditions to say all four operations key on the **resolved `profiles.id`** (the doc previously described behavior the code never had — now it's true; note the route 404s when no profile resolves).
  - `/api/webhook/cashfree`: document the `pl_` branch (payment-link fulfillment + failure flips), constant-time HMAC compare, and that side effects now run through `src/lib/server/fulfillment.ts` with an atomic claim; the side-effects list gains "grant `user_product_access` rows (logged-in buyers)" and "redeem coupon via `increment_coupon_uses`".
  - `/api/checkout/create`: note coupon validation now shares `src/lib/server/coupons.ts` (full expiry/usage checks), `coupon_id`/`discount_amount` ride in `orders.metadata`, free orders run through `fulfillOrder`, and the route is rate-limited 10/min/IP.
  - `/api/checkout/payment-link`: the auto-create now 404s unless the site exists, is active, and `site_type = 'payment'`; rate-limited 10/min/IP.
  - Add rate-limit notes to `/api/leads` (5/min), `/api/coupons/validate` (10/min), `/api/products/search` (30/min), `/api/linkinbio/track` (60/min + existing dedupe).
- [ ] **Step 2: `security-model.md`:**
  - "Public endpoints — abuse surface" table: replace the "no rate limit" gaps with the new per-route limits; remove the stale `/api/upload` "no auth" row claim (it already documents the 2026-06-03 hardening elsewhere); note the payment-link auto-create hole is closed.
  - Roles section: roles now live in `app_metadata.role` (server-controlled); `proxy.ts` reads only that; signup's `user_metadata.role` is a request promoted by `/api/auth/callback`; document the dev-only edge (confirmations disabled locally → no `app_metadata.role` until first confirmed/OAuth login).
  - Revenue integrity rules: point rules 2/4/7 at `src/lib/server/fulfillment.ts` (atomic claim = idempotency), `getPlatformFeeRate()` in `src/lib/server/platform-fee.ts` (no longer hardcoded in the webhook), deterministic `record_hash = sha256(order_id + cf_payment_id)` with a UNIQUE constraint, and `credit_creator_balance` RPC (no read-modify-write).
  - Middleware section: update the description to the new four-step proxy (exact host match → unguarded fast-path → cookie check → `getUser()`); matcher now excludes `/api/*`.
- [ ] **Step 3: `cashfree-reference.md`:** webhook section — signature check uses `crypto.timingSafeEqual`; side effects 1–4 are executed by `fulfillOrder` (atomic claim), platform fee comes from `getPlatformFeeRate()`; `/payment/status` now checks DB status first and calls Cashfree only when still pending, and on PAID calls the shared fulfillment functions ("read-side reconciliation" paragraph updated); `pl_` order ids route to `fulfillPaymentLinkSubmission`.
- [ ] **Step 4: `hooks-reference.md`:** remove `usePayoutRequests`, `useSiteConfig`, `useDiscoverProduct` rows; update `useCoupons` (profile-resolved), `useStorefront` (returns `{ profile }` only), `useAbTests` (profile-resolved, `products(name)`); update every renamed query key shown in the key-convention examples to the Task 24 table.
- [ ] **Step 5: Annotate todo-later files.** At the top of `2-…-db-audit.md` and `3-…-new-db-audit.md`, add a dated note listing which items this change-set completed (RLS apply, history backfill, function hardening, missing tables, money RPCs/constraints, index pass, payout identity fix). Mark `4-…-discover-routes-removal.md` as **done 2026-06-13** with a one-line note about the client-component deviation.
- [ ] **Step 6:** Re-read `CLAUDE.md`'s API-routes table summary (the `14+ routes` partial list) — remove `discover` from the route enumeration on the `app/api/` line.

### Task 26: Final verification + commit-approval handoff

- [ ] **Step 1:** `npx tsc --noEmit` — must be clean (or match the recorded pre-change baseline exactly).
- [ ] **Step 2:** `npm run lint` — zero **new** errors vs the pre-change baseline (445 errors / 172 warnings).
- [ ] **Step 3:** `get_advisors` (security) via MCP — RLS errors ~0; no new findings introduced by the migrations. Compare against the Task 1 Step 6 snapshot.
- [ ] **Step 4: Manual smoke pass** (dev server + sandbox Cashfree):
  1. Email login and Google login both land correctly (creator → `/dashboard`, buyer → `/account/library`).
  2. Fresh signup as Buyer (label sends `'buyer'`) → confirm email → callback promotes `app_metadata.role` → correct landing.
  3. Dashboard pages load with data (products, orders, earnings, customers, coupons list shows rows — finding #5 regression check).
  4. Storefront `/store/[slug]`, `/site/[slug]`, `/link/[username]` render with creator theme (CSS sanitizer didn't break valid palettes).
  5. Sandbox checkout end-to-end: order → webhook → `orders.status = 'completed'`, `creator_balances` credited once, `transaction_ledger` row with deterministic hash, `user_product_access` row exists (logged-in buyer), `/api/deliverables/[productId]` returns 200.
  6. Refresh `/payment/status` repeatedly after payment — balance credited exactly once (claim idempotency).
  7. Free-order checkout grants access + redeems coupon (`current_uses` incremented once).
  8. Payout request succeeds for a verified-KYC creator (finding #3 regression check) — confirm a `creator_payouts` row keyed on `profiles.id`.
  9. Coupon create from dashboard, then redemption increments `current_uses`.
  10. Rate limit: burst 11 POSTs to `/api/checkout/create` → 429 on the 11th.
- [ ] **Step 5: Present the commit batch.** Produce: full `git status` + per-area diff summary (DB migrations, money loop, identity, proxy, rate limiting, cleanup, hooks, docs), verification results from Steps 1–4, the list of live DB changes already applied (migrations + role backfill — note these are **already live** regardless of the commit), and the one manual dashboard task (leaked-password protection). **Wait for user approval, then commit everything (including the spec and this plan file) as one batch.**

---

## Self-review notes (already applied)

- **Spec coverage check:** §1 money loop → Tasks 5, 6, 10, 11, 13, 14, 16 (findings #1 #2 #4 #9 #10 #13 #14 #18 #19 #27). §2 identity → Tasks 8, 17, 18, 19, 20, 21 (#3 #5 #6 #7 #8 #11 #21). §3 hardening/cost → Tasks 7, 12, 14, 15, 21, 22, 23, 24 (#12 #15 #16 #17 #20 #22 #23 #24 #25 #26). §4 DB → Tasks 1–8 (M1–M7 + backfill + types). §5 verification → Task 26. §7 commit protocol → ground rule 1 + Task 26 Step 5.
- **Known deviations from spec wording (intentional):** (a) discover pages stay Client Components with direct anon-RLS browser queries instead of Server Components — same security/cost outcome, no page redesign; (b) `payment_submissions` FK index uses the real column `payment_request_id`, not the spec's `request_id`; (c) M2 history backfill is a data fix via `execute_sql`, not a migration file; (d) spec item #20 (global `staleTime`) is already implemented in `app/providers.tsx` — verify-only.
- **Type-consistency check:** `fulfillOrder(orderId, opts?)` / `fulfillPaymentLinkSubmission(submissionId, gatewayPaymentId?)` signatures match across Tasks 11, 13, 14, 16. `validateCoupon(db, code, creatorId, cartAmount)` matches Tasks 10 and 14. `rateLimit(req, routeName, { max, windowSeconds })` matches Tasks 12, 14, 15, 22. `resolveProfileId(authUserId, email?)` matches Tasks 9 and 17. `isSafeInternalPath` / `safeCssColor` / `safeFontFamily` match Tasks 12, 19, 20.
