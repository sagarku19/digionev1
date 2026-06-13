---
noteId: "4dbcd0705df011f1a1752dcb7411a93a"
tags: []

---

# DigiOne — Database Rebuild Runbook

How to recreate the entire Supabase database from scratch — on the same project
(reset) or a brand-new project (migrate). Designed so this takes minutes, not a day.

> ⚠️ **Partially superseded (2026-06-13).** The rebuild source of truth is now
> `supabase/migrations/` applied via the Supabase CLI (`supabase db reset` / `db push`),
> not the hand-rolled `pg_dump` + `storage-and-auth.sql` flow described below. The
> `exports/*` snapshots and `full-schema.sql` / `storage-schema.sql` dumps referenced
> in this runbook were **removed** on 2026-06-13 (stale, pre-RLS) — see
> [CLEANUP-2026-06-13.md](./CLEANUP-2026-06-13.md). Treat the sections below that apply
> those files as historical; apply the numbered `migrations/` in order instead. This
> runbook needs a full rewrite around the CLI flow (tracked in the cleanup record).
>
> Live-state reference: `.claude/todo-later/5-2026-06-13-db-production-audit.md`.

---

## TL;DR

```powershell
# From repo root. PG tools live here; the pooler hangs, so always use the DIRECT host.
$PG  = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$HOST_DB = "db.<NEW_PROJECT_REF>.supabase.co"
$env:PGPASSWORD = "<NEW_DB_PASSWORD>"

& $PG -h $HOST_DB -p 5432 -U postgres -d postgres -f supabase/migrations/00000000000000_baseline.sql
& $PG -h $HOST_DB -p 5432 -U postgres -d postgres -f supabase/migrations/20260418_insta_autodm.sql   # optional, pending feature
& $PG -h $HOST_DB -p 5432 -U postgres -d postgres -f supabase/migrations/20260602000000_rls_policies.sql   # RLS — test first, see RLS-TEST-CHECKLIST.md
& $PG -h $HOST_DB -p 5432 -U postgres -d postgres -f supabase/seed.sql
& $PG -h $HOST_DB -p 5432 -U postgres -d postgres -f supabase/exports/storage-and-auth.sql

Remove-Item Env:\PGPASSWORD
npm run update-types
```

Then update env vars (step 7) and you're live.

---

## What's in this folder

| File | Role |
|---|---|
| `migrations/00000000000000_baseline.sql` | **The whole public schema** — 59 tables, 21 enums, 6 functions, all indexes/constraints/triggers/sequence. Generated from live DB. |
| `migrations/20260416_marketing_tables.sql` | Historical. Already inside baseline. Safe no-op. |
| `migrations/20260418_insta_autodm.sql` | **Pending feature** — never applied to prod. Run only if you want Instagram auto-DM tables. |
| `migrations/20260602000000_rls_policies.sql` | **RLS for all 59 tables.** Test first (`exports/RLS-TEST-CHECKLIST.md`). |
| `seed.sql` | Reference data: 3 subscription_plans + 10 public_images. Idempotent. |
| `exports/storage-and-auth.sql` | Storage buckets, storage RLS, **auth.users triggers** (signup wiring). |
| `exports/INVENTORY.md` | Full read-only audit of the live DB. |
| `exports/RLS-POLICIES.md` | Per-table RLS design + rationale. |
| `exports/RLS-TEST-CHECKLIST.md` | Pre-prod verification steps for the RLS migration. |
| `exports/rls-policies.txt`, `indexes.txt`, `rls-status.txt` | Human-readable reference snapshots. |
| `full-schema.sql`, `storage-schema.sql` | Raw pg_dump output (public + storage). Source of truth for regeneration. |

---

## Apply order (and why)

1. **baseline** — creates everything in `public`. Run on an EMPTY public schema.
2. **20260418_insta_autodm.sql** — optional; pending feature. Idempotent (`IF NOT EXISTS`).
3. **20260602000000_rls_policies.sql** — RLS for all tables. Needs the schema from
   step 1 (and `profiles` for the `current_profile_id()` helper). Test first.
4. **seed.sql** — reference rows. Needs tables from step 1.
5. **storage-and-auth.sql** — buckets + storage RLS + auth triggers. Auth triggers
   need `handle_new_user()` from step 1 to already exist.

Skip step 5 and **signup breaks** — no `public.users` / `public.profiles` rows get
created when a user signs up, because those triggers live on `auth.users`.

---

## Full procedure

### 1. Create / choose the target project
- **Same project (reset):** Supabase Dashboard → Settings → General → "Reset"/recreate,
  OR drop the public schema (see "Resetting an existing DB" below).
- **New project:** create it, note the new project ref and DB password.

### 2. Point your tools at it
```powershell
$PG  = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$PD  = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
$HOST_DB = "db.<NEW_PROJECT_REF>.supabase.co"   # DIRECT host — NOT the pooler
$env:PGPASSWORD = "<NEW_DB_PASSWORD>"
```

### 3. Apply the baseline migration
```powershell
& $PG -h $HOST_DB -p 5432 -U postgres -d postgres -f supabase/migrations/00000000000000_baseline.sql
```

### 4. (Optional) Apply the pending autodm migration
Only if you want the Instagram auto-DM feature schema.
```powershell
& $PG -h $HOST_DB -p 5432 -U postgres -d postgres -f supabase/migrations/20260418_insta_autodm.sql
```

### 4b. Apply RLS policies
**Test on a throwaway project first** — see [exports/RLS-TEST-CHECKLIST.md](./exports/RLS-TEST-CHECKLIST.md).
```powershell
& $PG -h $HOST_DB -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/migrations/20260602000000_rls_policies.sql
```
Deny-by-default. Relies on Supabase's default table GRANTs for `anon`/`authenticated`
(present on any real Supabase project). If you hit `permission denied for table`, see
[exports/RLS-POLICIES.md](./exports/RLS-POLICIES.md) → Production prerequisites.

### 5. Seed reference data
```powershell
& $PG -h $HOST_DB -p 5432 -U postgres -d postgres -f supabase/seed.sql
```
> ⚠️ One `public_images` row points at the OLD project's storage URL
> (`.../public-asset/supaimg-1.jpeg`). On a new project that image 404s until you
> re-upload it to the `public-asset` bucket. The other 9 are external Unsplash URLs.

### 6. Restore storage buckets, storage RLS, and auth triggers
```powershell
& $PG -h $HOST_DB -p 5432 -U postgres -d postgres -f supabase/exports/storage-and-auth.sql
```
This creates the 3 buckets (`public-asset`, `uploads`, `user_files`), their 11
policies, and the two `auth.users` triggers. **Actual file contents are NOT migrated**
— only the bucket definitions. Re-upload any assets you need.

### 7. Configure Auth providers (Dashboard, one-time)
Per [.claude/rules/google-oauth-reference.md](../.claude/rules/google-oauth-reference.md):
- Authentication → Providers → Google → enable, paste Client ID + Secret.
- Authentication → URL Configuration → set Site URL + Redirect URLs
  (`https://<your-domain>/api/auth/callback`, `http://localhost:3000/api/auth/callback`).
- Google Cloud Console → add `https://<NEW_PROJECT_REF>.supabase.co/auth/v1/callback`
  to Authorized redirect URIs.

### 8. Regenerate TypeScript types
The `package.json` script is pinned to the old ref. For a new project, run with the
new ref (don't commit a permanent change unless you're fully migrating):
```powershell
npx supabase gen types typescript --project-id <NEW_PROJECT_REF> > types/database.types.ts
```
If you're staying on the same project: `npm run update-types`.

### 9. Update environment variables
Per [.claude/rules/env-vars.md](../.claude/rules/env-vars.md). For a new project, update
in `.env.local` (and Vercel):

| Var | New value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<NEW_PROJECT_REF>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | new project anon key |
| `SUPABASE_SERVICE_KEY` | new project service-role key |
| `SUPABASE_SERVICE_ROLE_KEY` | same as `SUPABASE_SERVICE_KEY` (legacy fallback) |

Cashfree, app URL, and root-domain vars are unrelated to the DB swap — leave them.

### 10. Verify
```powershell
& $PG -h $HOST_DB -p 5432 -U postgres -d postgres -t -A -c "select count(*) from information_schema.tables where table_schema='public';"   # expect 59 (or 69 with autodm)
& $PG -h $HOST_DB -p 5432 -U postgres -d postgres -t -A -c "select count(*) from public.subscription_plans;"                                # expect 3
& $PG -h $HOST_DB -p 5432 -U postgres -d postgres -t -A -c "select tgname from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal;"  # expect on_auth_user_created, on_auth_user_updated
Remove-Item Env:\PGPASSWORD
```
Then `npm run dev`, sign up a test user, confirm a `public.profiles` row appears.

---

## Resetting an existing DB (destructive)

To wipe and re-apply on the SAME project — **this deletes all data**:
```sql
-- Run in SQL Editor or via psql. DESTROYS all public data.
drop schema public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres;
```
Then run steps 3–6 above. (The `auth.users` triggers survive a public-schema drop
only if their functions survive — they don't, since functions live in public — so
re-running `storage-and-auth.sql` in step 6 is required.)

---

## Regenerating these files from a live DB

If the schema drifts and you need a fresh baseline (always use the DIRECT host):
```powershell
$env:PGPASSWORD = "<DB_PASSWORD>"
$PD = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
$HOST_DB = "db.<PROJECT_REF>.supabase.co"

# Public schema (the baseline source)
& $PD -h $HOST_DB -p 5432 -U postgres -d postgres --schema-only --schema=public --no-owner --no-privileges --no-comments -f supabase/full-schema.sql
# Storage schema
& $PD -h $HOST_DB -p 5432 -U postgres -d postgres --schema-only --schema=storage --no-owner --no-privileges -f supabase/storage-schema.sql
# Reference data for seed
& $PD -h $HOST_DB -p 5432 -U postgres -d postgres --data-only --inserts -t public.subscription_plans -t public.site_templates -t public.public_images -f supabase/exports/_seed-data-raw.sql
Remove-Item Env:\PGPASSWORD
```
Then strip the `\restrict`/`\unrestrict` lines and the `CREATE SCHEMA public;` line
from `full-schema.sql` to refresh the baseline (the build scripts in `exports/` do this).
Re-run the audit queries in `export-everything.sql` to refresh INVENTORY.md.

---

## RLS — status & history

**RESOLVED 2026-06-02.** Complete RLS policies for all 59 public tables now live in
`migrations/20260602000000_rls_policies.sql` (design: `exports/RLS-POLICIES.md`,
validation: `exports/RLS-TEST-CHECKLIST.md`). It's included in the apply order above.

> ⚠️ The RLS migration is deny-by-default and the browser client reads ~28 tables
> directly. **Run it on a throwaway project first** and walk the smoke test in
> `exports/RLS-TEST-CHECKLIST.md` before applying to prod.

### Historical gap (pre-2026-06-02)

Before the migration above, the live DB had RLS on **only** `public_images` while
`.claude/rules/security-model.md` claimed ~20 protected tables. Recorded here so an
older DB snapshot can be identified:

- RLS was enabled on exactly ONE public table: `public_images` (public SELECT).
- RLS was DISABLED on every other table, including all revenue tables.
- `storage.objects` already had RLS (11 policies) — that part was always fine.

**Tables that were unprotected before the migration:**

**Tables `security-model.md` claims are RLS-protected but currently are NOT:**

| Table | Doc claims | Live reality |
|---|---|---|
| `orders` | buyer/creator scoped reads, service-only writes | **RLS off** |
| `creator_balances` | creator reads own, service-only writes | **RLS off** |
| `transaction_ledger` | creator reads own, service-only writes | **RLS off** |
| `creator_payouts` | creator reads/inserts own | **RLS off** |
| `creator_kyc` | creator reads/updates own | **RLS off** |
| `products` | creator owns; public read when published | **RLS off** |
| `coupons` | creator owns | **RLS off** |
| `sites`, `site_main`, `site_singlepage`, `linkinbio_pages`, `site_sections_config`, `site_design_tokens`, `site_navigation` | owner-scoped, public read when active | **RLS off** |
| `lead_form`, `linkinbio_analytics` | creator reads via site ownership | **RLS off** |

**What protected the data before:** nothing in Postgres — only (a) the service-role
key staying server-side, and (b) API routes doing their own `getUser()` checks. The
`20260602000000_rls_policies.sql` migration closes this by adding defense-in-depth at
the database layer.
