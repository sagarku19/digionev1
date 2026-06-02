---
noteId: "7ae0aed05df211f1a1752dcb7411a93a"
tags: []

---

# RLS Test Checklist — run before applying to prod

Enabling RLS is deny-by-default. The browser (anon-key) client reads ~28 tables
directly, so a wrong policy = blank dashboard or broken checkout. Verify on a
throwaway Supabase project FIRST. Budget ~30 min.

Migration under test: [`migrations/20260602000000_rls_policies.sql`](../migrations/20260602000000_rls_policies.sql)
Policy reference: [RLS-POLICIES.md](./RLS-POLICIES.md)

---

## 0. Pre-flight

- [ ] Throwaway Supabase project created; note its ref + DB password.
- [ ] `db.<ref>.supabase.co` direct host reachable (pooler hangs).
- [ ] Baseline + seed + storage-and-auth already applied (see [REBUILD.md](../REBUILD.md)).

## 1. Apply the migration

```powershell
$PG = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$env:PGPASSWORD = "<TEST_DB_PASSWORD>"
& $PG -h db.<TEST_REF>.supabase.co -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 `
  -f supabase/migrations/20260602000000_rls_policies.sql
```
- [ ] Runs with **no errors** (ON_ERROR_STOP makes any failure abort).

## 2. Confirm RLS is on everywhere

```sql
select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;
```
- [ ] Returns **0** (every public table has RLS enabled).

```sql
select count(*) from pg_policies where schemaname='public';
```
- [ ] Returns a healthy count (~70+ policies).

## 3. Grants sanity (catches "permission denied for table")

```sql
select grantee, count(*) from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated')
group by grantee;
```
- [ ] Both `anon` and `authenticated` have grants on the tables. If missing, run the
      GRANT block in [RLS-POLICIES.md](./RLS-POLICIES.md) → Production prerequisites.

## 4. App smoke test (the real proof) — point the app at the test project

Update `.env.local` to the test project (URL + anon key + service key), `npm run dev`,
then exercise each surface. Tick only what actually works:

### Auth / dashboard (authenticated, anon key)
- [ ] Sign up a new creator → lands on dashboard, profile loads.
- [ ] Dashboard home renders (no blank widgets / console RLS errors).
- [ ] **Products** list shows your products (`useProducts`).
- [ ] **Earnings** page shows balance, payouts, KYC (`useEarnings` reads
      creator_balances + creator_payouts + creator_kyc).
- [ ] **Orders** list loads (`useOrders`).
- [ ] **Sites** list loads; open the site editor (site_main / tokens / sections).
- [ ] **Marketing**: coupons, affiliates, referrals, community all load.
- [ ] Create + edit a product, save a coupon, edit a site → writes succeed.
- [ ] Notifications bell shows unread count.

### Storefront (anon, logged out — use an incognito window)
- [ ] Open a creator store `/store/[slug]` → published products visible.
- [ ] A **draft / unpublished** product is NOT visible publicly.
- [ ] Link-in-bio `/link/[username]` renders blocks + items.
- [ ] Single page `/site/[slug]` renders with theme (design tokens).
- [ ] Discover page `/discover` lists published products.

### Checkout (anon buyer)
- [ ] Add to cart → checkout → `/api/checkout/create` succeeds (service-role insert).
- [ ] Sandbox pay → webhook flips order to completed, balance credited
      (service-role, RLS-exempt — must still work).
- [ ] `/payment/status` shows success.
- [ ] Lead form submit succeeds (`/api/leads`, service-role insert).

### Isolation (two creators)
- [ ] Create a 2nd creator. Confirm creator B cannot see creator A's orders,
      balance, products-in-dashboard, coupons, or leads.

## 5. Rollback plan (if something breaks)

RLS can be disabled per-table without dropping policies:
```sql
-- emergency: turn RLS off on one table to unblock
alter table public.<table> disable row level security;
```
Or full rollback (policies stay defined but inert):
```sql
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname='public'
  loop execute format('alter table public.%I disable row level security;', r.tablename); end loop;
end $$;
```

## 6. Promote to prod

Only after every box above is ticked on the test project:
- [ ] Apply the same migration to prod (direct host).
- [ ] Repeat section 4 smoke test against prod with a real test account.
- [ ] Update [SUPABASE.md](../SUPABASE.md) known-issues: mark RLS gap **resolved**.

```powershell
Remove-Item Env:\PGPASSWORD
```
