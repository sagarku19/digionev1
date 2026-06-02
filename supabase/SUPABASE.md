---
noteId: "66b83b005df011f1a1752dcb7411a93a"
tags: []

---

# DigiOne — Supabase Master Record

The single source of truth for this project's database. Start here. Keep it current
whenever the schema changes.

> **Project ref:** `qcendfisvyjnwmefruba`
> **DB:** PostgreSQL 17.6 · **Region host (direct):** `db.qcendfisvyjnwmefruba.supabase.co`
> **Last full sync:** 2026-06-02

---

## 🗂 File map — what each file is for

| File | Purpose | Regenerate from |
|---|---|---|
| **[SUPABASE.md](./SUPABASE.md)** | This index. Read first. | hand-maintained |
| **[REBUILD.md](./REBUILD.md)** | Step-by-step to reset / migrate / rebuild the DB | hand-maintained |
| **[migrations/00000000000000_baseline.sql](./migrations/00000000000000_baseline.sql)** | Entire `public` schema (the rebuild source) | `pg_dump --schema=public` |
| [migrations/20260416_marketing_tables.sql](./migrations/20260416_marketing_tables.sql) | Historical — already in baseline (no-op) | — |
| [migrations/20260418_insta_autodm.sql](./migrations/20260418_insta_autodm.sql) | **Pending** Instagram auto-DM feature (NOT applied to prod) | — |
| **[migrations/20260602000000_rls_policies.sql](./migrations/20260602000000_rls_policies.sql)** | **RLS for all 59 tables** + `current_profile_id()` helper | hand-maintained |
| [exports/RLS-POLICIES.md](./exports/RLS-POLICIES.md) | Per-table RLS design + rationale | hand-maintained |
| [exports/RLS-TEST-CHECKLIST.md](./exports/RLS-TEST-CHECKLIST.md) | Pre-prod RLS verification steps | hand-maintained |
| **[seed.sql](./seed.sql)** | Reference data (subscription_plans, public_images) | `pg_dump --data-only` |
| **[exports/storage-and-auth.sql](./exports/storage-and-auth.sql)** | Buckets, storage RLS, auth.users triggers | live audit |
| [exports/INVENTORY.md](./exports/INVENTORY.md) | Full read-only audit of the live DB | audit queries |
| [exports/rls-policies.txt](./exports/rls-policies.txt) | All RLS policies, readable | `pg_policies` |
| [exports/indexes.txt](./exports/indexes.txt) | All 55 indexes | `pg_indexes` |
| [exports/rls-status.txt](./exports/rls-status.txt) | RLS on/off per table | `pg_class` |
| [full-schema.sql](./full-schema.sql) | Raw public-schema dump | `pg_dump` |
| [storage-schema.sql](./storage-schema.sql) | Raw storage-schema dump | `pg_dump` |
| [export-everything.sql](./export-everything.sql) | Query pack to re-audit from SQL Editor | hand-maintained |
| `exports/_*.{sql,py}` | Intermediate build artifacts (safe to delete/regenerate) | scripts |

---

## 📊 At a glance

| Thing | Count |
|---|---|
| Schemas (ours) | `public` (full) + slices of `storage`, `auth` |
| Public tables | 59 |
| Enums | 21 |
| Functions | 6 |
| Triggers | 6 (2 on `auth.users`, 4 on public tables) |
| Indexes | 55 (141 incl. PK/unique) |
| Sequences | 1 |
| Storage buckets | 3 (`public-asset`, `uploads`, `user_files`) |
| RLS policies | all 59 public tables + 11 storage (see RLS migration) |
| Reference rows to seed | 13 (3 plans + 10 images) |

Full detail: [exports/INVENTORY.md](./exports/INVENTORY.md).

---

## 🔑 The 4 things that are NOT in a plain public-schema dump

These bite you on a rebuild. All handled by `exports/storage-and-auth.sql`:

1. **`auth.users` triggers** (`on_auth_user_created`, `on_auth_user_updated`) — wire
   signup → `public.users` + `public.profiles`. Outside `public`.
2. **Storage buckets** — definitions, not contents. Files must be re-uploaded.
3. **Storage RLS policies** — 11 policies on `storage.objects`.
4. **Auth provider config** (Google OAuth) — Dashboard-only, see REBUILD.md step 7.

---

## ⚠️ Known issues / decisions pending

| # | Issue | Status |
|---|---|---|
| 1 | **RLS gap** — was: only `public_images` had RLS despite docs claiming ~20 tables. | **Resolved 2026-06-02** via `migrations/20260602000000_rls_policies.sql` (all 59 tables). ⚠️ Test on a throwaway project before prod — see RLS-TEST-CHECKLIST.md. |
| 2 | `20260418_insta_autodm.sql` never applied to prod | Intentional — pending feature |
| 3 | 1 `public_images` seed row points at old project's storage URL | Will 404 on new project until re-uploaded |
| 4 | `site_templates` table empty | Nothing to seed |
| 5 | Pooler host hangs for pg_dump/psql | Always use direct host `db.<ref>.supabase.co` |
| 6 | DB password was exposed in a chat session (2026-06-02) | **Rotate** in Dashboard → Settings → Database |

---

## 🔁 Routine: after any schema change

1. Make the change (via a new timestamped migration in `migrations/`, or Dashboard).
2. Regenerate the baseline + exports (commands in REBUILD.md → "Regenerating these files").
3. `npm run update-types` to refresh `types/database.types.ts`.
4. Update counts in this file + INVENTORY.md if tables/enums/functions changed.
5. If you added a reference/lookup table, add its data to `seed.sql`.
6. Commit. The DB is now reproducible again.

---

## 🚀 Rebuild in one breath

New/empty project: run baseline → (optional autodm) → seed → storage-and-auth →
set auth providers → `update-types` → update env. Full commands: [REBUILD.md](./REBUILD.md).
