---
noteId: "66b83b005df011f1a1752dcb7411a93a"
tags: []

---

# DigiOne — Supabase Master Record

The single source of truth for this project's database. Start here. Keep it current
whenever the schema changes.

> **Project ref:** `qcendfisvyjnwmefruba`
> **DB:** PostgreSQL 17.6 · **Region host (direct):** `db.qcendfisvyjnwmefruba.supabase.co`
> **Last full sync:** 2026-06-13 (RLS rollout + money/index hardening landed; stale snapshot exports removed — see `CLEANUP-2026-06-13.md`)

---

## 🗂 File map — what each file is for

The `supabase/migrations/` folder is the **single rebuild source of truth** and matches the live DB's registered migration history. The point-in-time `exports/` snapshots and raw `*-schema.sql` dumps were removed on 2026-06-13 (they captured pre-RLS state and had gone stale). To re-audit the live DB, query it directly via the Supabase MCP or run `export-everything.sql` in the SQL Editor.

| File | Purpose | Regenerate from |
|---|---|---|
| **[SUPABASE.md](./SUPABASE.md)** | This index. Read first. | hand-maintained |
| **[REBUILD.md](./REBUILD.md)** | Step-by-step to reset / migrate / rebuild the DB | hand-maintained |
| **[migrations/](./migrations/)** | **The rebuild source.** 14 migrations, registered in the live DB. `00000000000000_baseline.sql` is the full `public` schema + auth.users triggers; later files layer RLS, storage buckets, function hardening, money RPCs, money-integrity constraints, indexes. | `supabase db pull` |
| [migrations/20260418_insta_autodm.sql](./migrations/20260418_insta_autodm.sql) | Instagram auto-DM feature — registered in history; tables not confirmed live. Decide: apply or drop. | — |
| **[seed.sql](./seed.sql)** | Reference data (subscription_plans, public_images) | `pg_dump --data-only` |
| [export-everything.sql](./export-everything.sql) | Read-only query pack to re-audit from the SQL Editor (regenerates what the deleted exports held) | hand-maintained |
| [CLEANUP-2026-06-13.md](./CLEANUP-2026-06-13.md) | Record of the 2026-06-13 stale-file cleanup | hand-maintained |

> Authoritative live-state reference (replaces the deleted `exports/` audit docs): `.claude/todo-later/5(done)-2026-06-13-db-production-audit.md`.

---

## 📊 At a glance (live, 2026-06-13)

| Thing | Count |
|---|---|
| Schemas (ours) | `public` (full) + slices of `storage`, `auth` |
| Public tables | 62 |
| Enums | 21 |
| Functions | 12 |
| Triggers | 6 (2 on `auth.users`, 4 on public tables) |
| Storage buckets | 4 (`public-asset`, `creator-public`, `creator-content`, `creator-private`) |
| RLS | enabled on 62/62 tables · 87 policies |
| Reference rows to seed | 13 (3 plans + 10 images) |

Full detail: `.claude/todo-later/5(done)-2026-06-13-db-production-audit.md`.

---

## 🔑 The 4 things that are NOT in a plain public-schema dump

These bite you on a rebuild. Auth.users triggers are captured in `migrations/00000000000000_baseline.sql`; storage buckets in the `migrations/*storage*` / bucket migrations. Storage `storage.objects` RLS policies are only thinly captured in migrations — **capture them into a dedicated migration as a follow-up** (tracked in `CLEANUP-2026-06-13.md`):

1. **`auth.users` triggers** (`on_auth_user_created`, `on_auth_user_updated`) — wire
   signup → `public.users` + `public.profiles`. Outside `public`.
2. **Storage buckets** — definitions, not contents. Files must be re-uploaded.
3. **Storage RLS policies** — 11 policies on `storage.objects`.
4. **Auth provider config** (Google OAuth) — Dashboard-only, see REBUILD.md step 7.

---

## ⚠️ Known issues / decisions pending

| # | Issue | Status |
|---|---|---|
| 1 | **RLS gap** — was: only `public_images` had RLS. | **Resolved** — RLS rolled out live to 62/62 tables (87 policies). |
| 2 | `20260418_insta_autodm.sql` registered in history; tables not confirmed live | Decide: apply or drop |
| 7 | Payout write path — API inserts `status:'pending'` | **Resolved 2026-06-14** — CHECK now allows `pending/initiated/processed/failed` (migration `production_fixes`); concurrency guard fixed |
| 8 | Admin `super_admin` RLS + referral commission | **Resolved 2026-06-14** — `is_super_admin()` read RLS added; referral attribution + platform-fee commission built (see `docs/db/money-path.md`) |
| 9 | FK-isolated tables (missing FK constraints) | **Resolved 2026-06-14** — 12 FKs added in `production_fixes` |
| 3 | 1 `public_images` seed row points at old project's storage URL | Will 404 on new project until re-uploaded |
| 4 | `site_templates` table empty | Nothing to seed |
| 5 | Pooler host hangs for pg_dump/psql | Always use direct host `db.<ref>.supabase.co` |
| 6 | DB password was exposed in a chat session (2026-06-02) | **Rotate** in Dashboard → Settings → Database |

---

## 🔁 Routine: after any schema change

1. Make the change as a new timestamped migration in `migrations/` (`supabase migration new …`), or via the Dashboard then `supabase db pull`.
2. `npm run update-types` to refresh `types/database.types.ts`.
3. Update the "At a glance" counts in this file if tables/enums/functions changed.
4. If you added a reference/lookup table, add its data to `seed.sql`.
5. Re-run `get_advisors` (security + performance) and reconcile against audit #5.
6. Commit. The DB is now reproducible from `migrations/` again.

---

## 🚀 Rebuild in one breath

New/empty project: run `migrations/` in order (baseline first) → seed → set auth
providers (Google OAuth, Dashboard-only) → `update-types` → update env. Full
commands: [REBUILD.md](./REBUILD.md). Auth.users triggers ship in the baseline;
storage `storage.objects` RLS policies need a dedicated migration (see CLEANUP record).
