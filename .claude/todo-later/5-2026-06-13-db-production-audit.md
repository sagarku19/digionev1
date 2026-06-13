---
noteId: "db-prod-audit-20260613"
tags: []
---

# DigiOne Supabase — Production-Readiness Audit (delta)

**Captured:** 2026-06-13
**Project ref:** `qcendfisvyjnwmefruba` · Postgres 17.6 · schema `public`
**Audit type:** READ-ONLY. No migration, ALTER, CREATE, DROP, or `apply_migration` was run. No app code or `database.types.ts` edited. Evidence is from live MCP queries (`get_advisors`, `execute_sql` on `pg_*`/`information_schema`, `list_migrations`, `list_extensions`) cross-checked against the repo.

> **Context.** This file is the *delta* against the prior 2026-06-03 audits (now removed — they captured the pre-RLS bad state and were superseded once this change-set landed; see `supabase/CLEANUP-2026-06-13.md`). The production-readiness change-set (commit `ffdbabc`) landed Stages 1–6 of that roadmap. The headline P0 — RLS off on 58/59 tables — is **fixed**. This pass verifies what is actually live now and finds what the change-set introduced or missed. The prior files' "all done" claims were accurate on RLS but **overstated completion on payouts and function hardening** (see §5, §8).

---

## TL;DR — what changed and what's still open

| Area | 2026-06-03 | 2026-06-13 (live) |
|---|---|---|
| Tables with RLS | 1 / 59 | **62 / 62** ✅ |
| RLS policies | ~1 | **87** ✅ |
| Security advisor ERRORs | 53 | **0** ✅ |
| Security advisor WARN/INFO | 9 | **8 WARN + 1 INFO** |
| Migrations registered | 4 (history desynced) | **14, reconciled** ✅ |
| Money integrity constraints | none | UNIQUE `record_hash`, UNIQUE `(order_id,product_id)`, status CHECKs ✅ |
| Money RPCs | none | `credit_creator_balance`, `increment_coupon_uses`, `check_rate_limit`, `increment_link_click_count` ✅ |
| Payout identity bug (`user.id` vs `profile.id`) | active | **fixed** (`resolveProfileId`) ✅ |
| **Payout still works end-to-end?** | no (identity bug) | **NO — new `status` CHECK mismatch (BLOCKER, §5.1)** ❌ |
| Admin / `super_admin` RLS | n/a | **none exist — documented but unenforced (§9)** ❌ |
| Referral redemption/rewards | half-built | **still half-built — no writer (§7)** ❌ |
| Perf advisor | 38 FK + 28 unused + 4 dup | 32 FK + 40 unused + **20 `auth_rls_initplan` + 21 multi-policy (new, RLS-induced)** |

**The five to fix first:** (1) payout `status` CHECK mismatch — blocker; (2) payout optimistic-concurrency check is a no-op; (3) `creator_payouts.creator_id` missing FK; (4) decide referral redemption/rewards — build or remove; (5) decide the `super_admin` story — add admin RLS or document that admin = service-role only.

---

## 1. Table structure

62 public tables (was 59). Net-new since the prior audit: **`linkinbio_analytics`, `ab_tests`, `rate_limits`** (migration `20260613021247` + `..1546`) — these close the "code targets missing table" gap from finding #4 of the old audit.

`OBJECT → ISSUE → SEVERITY → EVIDENCE → FIX → FUTURE-PROOF`

- **Dead/empty-but-shipped tables** → ~23 tables still have 0 rows and no writer (payout-v2 trio, wallets, `creator_revenue_shares`, `subscriptions`, `media_library`, `product_licenses`, `storage_files/_usages`, analytics-event tables, `user_carts`, `user_wishlist`). → **LOW** → row-count query: `creator_payouts=0, transaction_ledger=0, user_referrals=0, order_referrals=0, user_roles=0`. → Decide per-table: keep (and wire a writer) or drop. Stage 1.1 of the roadmap is **not done**. → A schema where half the tables are unreachable is hard to reason about; carry an explicit "planned vs dead" annotation in `INVENTORY.md`.
- **Text status columns not converted to enums** (`orders.status`, `creator_payouts.status`, `creator_kyc.status`) → **LOW** → they use CHECK constraints instead of the 21 declared enums. CHECKs work but drift from the `order_status`/`kyc_status` enums that exist unused. → Either adopt the enums or delete the unused enum types. Stage 1.4 **not done**. → Pick one mechanism so a reader isn't unsure which is authoritative.
- **`update_projects_updated_at_column()` exists but there is no `projects` table** → **LOW** → function list shows it; no matching table. → Drop the dead function (also clears one search_path WARN, §8).

---

## 2. Foreign keys

- **`creator_payouts.creator_id` has NO foreign key** → **MEDIUM** → `select count(*) … pg_constraint where conrelid='creator_payouts' and contype='f' and conkey contains creator_id` → **0**. Every other money table (`creator_balances`, `transaction_ledger`, `orders`) correctly FKs `creator_id → profiles(id)`. → `ALTER TABLE creator_payouts ADD CONSTRAINT fk_creator_payouts_creator FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE SET NULL;` → A payout row can outlive/mismatch its creator silently; the FK makes that impossible.
- **`ON DELETE` behavior is sane** → `creator_balances` CASCADE, `orders`/`transaction_ledger`/`order_referrals` SET NULL on creator delete, `order_referrals.order_id` CASCADE. → No action.
- **`creator_payouts.payout_request_id → creator_payout_requests(id)`** FK exists (`fk_payout_request`, SET NULL) → so the "payout-v2" tables are referenced by FK even though they have no writer. Decide before dropping them (§1).

### 2.1 FK-isolated tables (no FK in either direction)

**14 of 62 tables have no foreign key at all** — not as a child, not as a parent. Evidence: `pg_constraint contype='f'` join against `pg_class`. Most are isolated not because they're standalone but because **FK constraints they should have are missing** — so the DB cannot prevent orphan rows (e.g. deleting a `site` leaves dangling `site_navigation`/`site_sections_config`/`site_product_assignments` rows).

**Genuinely standalone (correct — no action):** `public_images` (10 rows, reference data), `rate_limits` (0, infra table), `site_templates` (0, catalog) — none have `_id` columns.

**Missing FK constraints (integrity gaps):**

| Table | Rows | `_id` columns that should be FKs | Severity |
|---|---|---|---|
| `user_product_access` | 0 | `user_id`→users, `order_id`→orders, `order_item_id`→order_items, `product_id`→products | **HIGH** — buyer entitlement/access table; has UNIQUE(`order_id,product_id`) but zero FKs |
| `site_navigation` | 14 | `site_id`→sites | **MEDIUM** — populated, every storefront |
| `site_sections_config` | 11 | `site_id`→sites | **MEDIUM** — populated |
| `site_product_assignments` | 1 | `site_id`→sites, `product_id`→products | **MEDIUM** — populated |
| `coupons` | 1 | `creator_id`→profiles | **MEDIUM** — read at checkout |
| `referral_codes` | 1 | `owner_creator_id`→profiles, `owner_user_id`→users | **MEDIUM** |
| `user_referrals` | 0 | `referral_code_id`→referral_codes, `referrer/referred_*`→users/profiles | **LOW** — half-built (§7) |
| `product_licenses` | 0 | `order_id`,`order_item_id`,`user_id`,`product_id` | **LOW** — unused feature |

**Analytics event logs — judgment call, not a clear bug:** `conversion_events`, `product_view_events`, `site_page_views` (all 0 rows) carry `site_id`/`product_id`/`order_id`/`session_id` with no FKs. High-volume append-only event tables are *often* left FK-less on purpose (avoid FK write overhead; retain events after the parent is deleted). Add FKs or leave them — a deliberate choice, not a defect.

**FIX (sketch — not applied):** one migration adding the missing FKs, with delete behavior chosen per relationship:
```sql
-- site config tables: orphans are useless once the site is gone → CASCADE
ALTER TABLE site_navigation         ADD CONSTRAINT fk_site_navigation_site         FOREIGN KEY (site_id)    REFERENCES sites(id)    ON DELETE CASCADE;
ALTER TABLE site_sections_config    ADD CONSTRAINT fk_site_sections_config_site    FOREIGN KEY (site_id)    REFERENCES sites(id)    ON DELETE CASCADE;
ALTER TABLE site_product_assignments ADD CONSTRAINT fk_spa_site                    FOREIGN KEY (site_id)    REFERENCES sites(id)    ON DELETE CASCADE;
ALTER TABLE site_product_assignments ADD CONSTRAINT fk_spa_product                 FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
-- entitlement: keep the access row, null the references → use SET NULL or CASCADE per product policy
ALTER TABLE user_product_access     ADD CONSTRAINT fk_upa_order                    FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE;
ALTER TABLE user_product_access     ADD CONSTRAINT fk_upa_product                  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
-- coupons / referral_codes → profiles, users
ALTER TABLE coupons                 ADD CONSTRAINT fk_coupons_creator             FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;
-- (referral_codes dual ownership: add both, ON DELETE CASCADE on profiles, SET NULL on users)
```
Validate each `ON DELETE` against product intent before applying; add the matching FK index in the same migration (ties into §3). → **FUTURE-PROOF:** without these, a creator/site/product delete silently strands rows that the app then reads as live config. The FK is the only structural guarantee.

---

## 3. Indexes

- **Index-pass landed** → `orders.gateway_order_id` is now indexed (the webhook hot path); FK-index count dropped 38→32. → **resolved (partial).**
- **`orders.gateway_order_id` is indexed but NOT unique** → **MEDIUM** → no `UNIQUE`/partial-unique constraint on it (constraint dump shows only PK + status CHECK + FKs). → `CREATE UNIQUE INDEX CONCURRENTLY uq_orders_gateway_order_id ON orders(gateway_order_id) WHERE gateway_order_id IS NOT NULL;` → Nothing structurally prevents two orders sharing one Cashfree session id; the webhook's correctness leans on app logic alone.
- **32 unindexed FKs remain** (perf advisor INFO). Lower-traffic tables. → **LOW** → batch `CREATE INDEX CONCURRENTLY` per the roadmap §5.2 list. → Cheap; do during a quiet window.
- **40 unused indexes** (perf advisor INFO, up from 28) → **LOW** → mostly zero-stat artifacts on empty tables + indexes added in the index pass that haven't seen traffic. → Do **not** drop yet; re-evaluate after 30 days of real `pg_stat_user_indexes`. → Premature drops on a low-traffic DB read as "unused" but aren't.

---

## 4. RLS policies

**The big win.** `select count(*) filter (where rowsecurity)` → **62/62** tables have RLS enabled; **87 policies** total; **0** `rls_disabled_in_public` errors.

Revenue-table model verified correct (read-only for creators, writes via service-role only):

| Table | Policies present | Write policy? |
|---|---|---|
| `orders` | `select_buyer (user_id=auth.uid())`, `select_creator (creator_id=current_profile_id())` | none → service-role only ✅ |
| `creator_balances` | `select_own` | none ✅ |
| `transaction_ledger` | `select_own` | none ✅ |
| `creator_payouts` | `select_own` | none ✅ (writes via API service-role) |
| `creator_kyc` | `select/insert/update_own` | client upsert allowed by design ✅ |
| `referral_codes` | `all_own (owner_creator_id=current_profile_id() OR owner_user_id=auth.uid())` | client CRUD allowed ✅ |

Findings:

- **`rate_limits` has RLS enabled but zero policies** → **INFO / by-design** → advisor `rls_enabled_no_policy`. Intentional: it's written only by the `check_rate_limit` SECURITY DEFINER RPC. → Leave as-is, but add a one-line comment/migration note so a future reader doesn't "fix" it by adding a permissive policy. → Document the intent.
- **20 `auth_rls_initplan` WARNs** → **MEDIUM (perf, latent)** → 54 policies call `current_profile_id()`/`auth.uid()` un-wrapped, so Postgres re-evaluates them **per row**. → Wrap in a scalar subquery: `(creator_id = (select current_profile_id()))`. → Negligible at 14 orders; real cost once a creator has thousands of rows. Fix once, repo-wide, in the policy migration. [linter 0003]
- **21 `multiple_permissive_policies` WARNs** → **LOW** → tables with both a public-read and an owner-read policy for the same `{role, cmd}` (e.g. `products`, `orders`) → Postgres ORs all permissive policies, evaluating each. → Where possible merge into one policy or split by role; otherwise accept — it's a correctness-neutral micro-cost.

---

## 5. Functions & triggers

12 functions live. The money/util RPCs are **properly hardened**: `SECURITY DEFINER`, `SET search_path`, and `EXECUTE` granted **only** to `postgres` + `service_role` (anon/authenticated revoked):

| Function | secdef | search_path | EXECUTE acl |
|---|---|---|---|
| `credit_creator_balance` | ✅ | `public` | postgres, service_role only ✅ |
| `increment_coupon_uses` | ✅ | `public` | service_role only ✅ |
| `check_rate_limit` | ✅ | `public` | service_role only ✅ |
| `increment_link_click_count` | ✅ | `public` | service_role only ✅ |
| `sum_bucket_bytes_for_prefix` | ✅ | `public, storage` | service_role only ✅ |
| `handle_new_user` / `handle_user_email_confirmed` | ✅ | `public, auth` | service_role only (triggers still fire) ✅ |
| `current_profile_id` | ✅ | `public` | **anon + authenticated** (advisor WARN ×2) |

`credit_creator_balance` is a clean atomic upsert (`insert … on conflict (creator_id) do update set total_earnings += …, total_platform_fees += …`) — no read-modify-write race. ✅

- **`current_profile_id()` executable by anon/authenticated** → **WARN / by-design, document it** → advisors 0028/0029. This is *required*: 54 RLS policies reference it, and policy expressions evaluate in the caller's role, so the caller needs `EXECUTE`. It takes no args and returns only the caller's own `profiles.id`, so the exposure is benign. → Leave the grant; add a comment in the function body explaining why, so it isn't "remediated" into breaking every policy. → A future dev seeing the advisor WARN will be tempted to revoke it — that would break all RLS reads.
- **4 trigger functions still have mutable `search_path`** → **WARN** → `update_updated_at_column`, `update_product_search_vector`, `update_blog_post_search_vector`, `update_projects_updated_at_column` show `config=(none)`. The `function_hardening` migration pinned the SECURITY DEFINER funcs but skipped these `SECURITY INVOKER` trigger funcs. → `ALTER FUNCTION … SET search_path = pg_catalog, public;` on each. → Low risk (invoker context) but it's the last 4 security WARNs; close them for a clean advisor run.
- **Triggers** → auth `on_auth_user_created`/`on_auth_user_updated` ✅; `trg_product_search_vector` ✅; `updated_at` triggers exist **only** on `linkinbio_{blocks,items,pages}`. → **LOW** → many tables with an `updated_at` column have no trigger maintaining it. → Either extend the trigger to all such tables or drop the column where it's never updated. Pick one convention.

---

## 6. Authentication flow

Verified end-to-end against the code — **solid.**

- `app/api/auth/callback/route.ts:18-30` → after `exchangeCodeForSession`, promotes `user_metadata.role` → **`app_metadata.role`** via `admin.auth.admin.updateUserById` + `refreshSession()`. Defaults absent/`'user'` → `'buyer'`. Uses `isSafeInternalPath()` on `?next`. ✅
- `proxy.ts:77-85` → `/dashboard` gate reads **`user.app_metadata?.role`** only (not `user_metadata`); allows `'creator'` and `'super_admin'`; everything else → `/account/library`. Cookie fast-path + exact-host custom-domain rewrite intact. ✅
- **One residual** → **LOW** → comment in `supabase-reference.md` still says proxy reads `user_metadata.role`; the code reads `app_metadata`. Doc drift, not a bug. → Update the rule file (it's already corrected in `security-model.md`).

No auth-flow blockers. The `auth_leaked_password_protection` WARN (§9) is the only auth-layer item.

---

## 7. Referral system

Schema is integrity-clean but the feature is **half-built**.

- **Tables & constraints OK** → `referral_codes` UNIQUE(`code`); `order_referrals` FK→orders (CASCADE) + FK→profiles (SET NULL) + status CHECK(`pending|settled`); `user_referrals` reward_status CHECK(`pending|rewarded`). RLS: `referral_codes_all_own` (dual ownership `owner_creator_id`/`owner_user_id`), `order_referrals_select_own`, `user_referrals_select_own`.
- **No writer for `order_referrals` or `user_referrals`** → **MEDIUM (functional gap)** → `useReferrals.ts` only **reads** `order_referrals` and does CRUD on `referral_codes`; grep across `app/**` + `src/**` finds **no** `.from('order_referrals')`/`.from('user_referrals')` insert anywhere. Live rows: `order_referrals=0`, `user_referrals=0`. → Either (a) wire referral attribution into `/api/checkout/create` + commission settlement into `fulfillOrder` (writing `order_referrals` with `referrer_creator_id`, `commission_amount`), or (b) hide the referrals UI and drop `user_referrals`. → As-is, a creator can mint a referral code that can never produce a redemption or a reward — silent dead-end.
- **RLS read mismatch (latent)** → **LOW** → `useReferrals` reads `order_referrals` by `referral_code_id`, but the SELECT policy filters on `referrer_creator_id = current_profile_id()`. Once rows exist, any row whose `referrer_creator_id` wasn't set will be invisible to its code's owner. → When you build the writer, always set `referrer_creator_id`. → Get this right at insert time or redemptions vanish under RLS.

---

## 8. Rewards / payout logic

- **BLOCKER — `creator_payouts.status` CHECK rejects what the API inserts.** → **BLOCKER** → DB: `creator_payouts_status_check = CHECK (status = ANY (ARRAY['initiated','processed','failed']))`. App: `app/api/payouts/request/route.ts:82` inserts `status: 'pending'`. `'pending'` ∉ the allowed set → the insert throws → route returns **500 "Failed to record payout ledger."** on *every* payout request. (`creator_payouts=0` rows masks it; no successful payout has ever been written.) → Align the two: either add `'pending'` to the CHECK **or** change the insert to `'initiated'`. Pick the vocabulary the dashboard `useEarnings` payouts list renders, then make DB + API + UI agree. → This is the same "payout is broken" outcome as the old identity bug, relocated one layer down. Add an integration test that actually inserts a payout.
- **HIGH — optimistic-concurrency guard is a no-op.** → **HIGH** → `route.ts:62-73` updates `creator_balances.pending_payout` with `.eq('pending_payout', balanceData.pending_payout)` and treats a non-null `deductionError` as a collision (409). But supabase-js returns **no error when 0 rows match** — a lost update is silent. Two concurrent requests both read `pending_payout=X`, one wins the conditional update, the other matches 0 rows (no error) **and still proceeds to insert a payout row** at step 4. → After the update, check rows affected: chain `.select()` and assert one row returned, else 409. → Real double-spend window on the money path; the only thing saving you today is the blocker above making the route 500 first.
- **Identity fix verified** → `resolveProfileId(user.id, user.email)` now keys all four ops on `profiles.id` (`route.ts:25`). ✅ Old P0 closed.
- **Ledger replay-safety verified** → `transaction_ledger`: UNIQUE(`record_hash`) + CHECK(`amount > 0`). `user_product_access`: UNIQUE(`order_id, product_id`). ✅ Per `security-model.md`, `record_hash = sha256(orderId + ':' + cf_payment_id)` is now deterministic, so the UNIQUE constraint genuinely blocks double-credit.
- **Missing non-negative CHECKs** → **LOW** → no `CHECK (… >= 0)` on `creator_balances` columns, no `CHECK (amount > 0)` on `creator_payouts`, no `CHECK (total_amount >= 0)` on `orders`. Roadmap Stage 1.3 partially done. → Add them; trivial integrity floor on money columns.
- **Platform fee** → still sourced from `getPlatformFeeRate()` (0.10) per the rules; fine as a single extension point.

---

## 9. Admin permissions

- **No admin/super_admin authorization exists at the database layer.** → **MEDIUM (enforced-vs-assumed gap)** → live counts: policies referencing `super_admin` = **0**, referencing `app_metadata` = **0**, referencing `user_roles` = **0**. The `user_roles` table exists (UNIQUE `(user_id, role)`, FK→users, RLS on) but has only a `select_own` policy and **0 rows**. `proxy.ts:80` lets `super_admin` into `/dashboard`, but there is no admin UI and no table grants `super_admin` elevated read/write. → Decide the model explicitly: **(a)** admin = "service-role scripts/endpoints only" → then *document* that `super_admin` confers nothing at the DB layer and remove the implication in `security-model.md` that admin tables are "RLS-gated"; or **(b)** build real admin RLS — add `super_admin`-aware policies (read `app_metadata.role` via a `is_super_admin()` SECURITY DEFINER helper, mirroring `current_profile_id()`), and populate `user_roles` or rely on JWT claims. → Today the docs describe an admin tier that the database doesn't implement. That's the single biggest "looks done but isn't" item for anyone trusting the rules files.

---

## 10. Storage & auth settings (carried-over WARNs)

- **`public-asset` bucket allows listing** → **WARN** → advisor `public_bucket_allows_listing` (policy `FULL Control 1pl33po_0`). → Drop the broad SELECT; object URLs still resolve. (Also relates to the `public-asset` ownership tighten-up noted in `api-routes.md`.)
- **Auth leaked-password protection disabled** → **WARN** → enable HaveIBeenPwned check in Supabase Auth → Password Settings. One toggle.

---

## Production-readiness verdict

**Not yet production-ready — but close, and for a small, well-scoped set of reasons.** The structural and security foundation is now genuinely solid: RLS is on across all 62 tables with a correct read-only-revenue model, money integrity is enforced by UNIQUE/CHECK constraints, the fulfillment path is replay-safe, the auth/role flow is server-controlled and correct, and migration history is reconciled. The remaining blockers are **not** infrastructure — they are two live bugs on the payout write path (status CHECK mismatch + a no-op concurrency guard) and two "documented but unbuilt" features (referral rewards, admin permissions). None require schema rewrites; all are local fixes plus a few decisions.

## Prioritized punch-list

> **✅ RESOLVED 2026-06-14** (migration `production_fixes` + code commits `4f73ece`→`fc7662e`; spec `docs/superpowers/specs/2026-06-13-db-production-fixes-design.md`, plan `docs/superpowers/plans/2026-06-13-db-production-fixes.md`):
> Items **1, 2, 3, 3b, 5, 6, 7, 8, 9** are done — payout status CHECK now allows `pending`; payout concurrency guard fixed (`.select()` + row-count → 409); 12 missing FKs added; `is_super_admin()` read-RLS; 66 policies wrapped (`auth_rls_initplan` → 0); `gateway_order_id` UNIQUE; 4 trigger fns hardened + dead fn dropped; non-negative money CHECKs. **Referral commission** (item 4) built end-to-end (platform-fee-funded). Onboarding kit in `docs/db/`.
> **Still open:** item 10 (enum conversions, dead-table pruning, `updated_at` trigger coverage) and item 11 (`public-asset` bucket listing, leaked-password protection toggle) — low priority, deferred. Note: a coupon with a `creator_id` set to a `users.id` (not `profiles.id`) was found + repointed during the FK orphan scan — **audit the coupon-create path** for the same identity-bug class.

| # | Severity | Item | Where |
|---|---|---|---|
| 1 | **BLOCKER** ✅ | Payout `status` mismatch — API inserts `'pending'`, CHECK allows `'initiated'/'processed'/'failed'` → 500 on every payout | `app/api/payouts/request/route.ts:82` ↔ `creator_payouts_status_check` |
| 2 | **HIGH** | Optimistic-concurrency check never fires (0-row update ≠ error) → double-spend window | `app/api/payouts/request/route.ts:62-73` |
| 3 | **MEDIUM** | `creator_payouts.creator_id` has no FK to `profiles` | migration |
| 3b | **HIGH / MED** | 14 FK-isolated tables (§2.1) — missing FK constraints: `user_product_access` (HIGH), `site_navigation`/`site_sections_config`/`site_product_assignments`/`coupons`/`referral_codes` (MED) → orphan-row risk | migration |
| 4 | **MEDIUM** | Referral redemption/rewards unbuilt — no writer for `order_referrals`/`user_referrals`; decide build-or-remove | checkout/fulfillment + `useReferrals.ts` |
| 5 | **MEDIUM** | No `super_admin` DB authorization despite documented model — decide + document or build | RLS + `security-model.md` |
| 6 | **MEDIUM** | 20 `auth_rls_initplan` — wrap `current_profile_id()`/`auth.uid()` in `(select …)` in 54 policies | RLS migration |
| 7 | **LOW** | `orders.gateway_order_id` not UNIQUE (indexed only) | migration |
| 8 | **LOW** | 4 trigger functions: pin `search_path`; drop dead `update_projects_updated_at_column` | migration |
| 9 | **LOW** | Missing non-negative CHECKs on `creator_balances`/`creator_payouts`/`orders` | migration |
| 10 | **LOW** | Enums vs text status; 23 dead/empty tables; `updated_at` trigger coverage — Stage 1 cleanups | migration |
| 11 | **LOW** | `public-asset` listing policy; enable leaked-password protection; doc drift in `supabase-reference.md` | storage / dashboard / docs |

> **Maintainability note for the next pass.** Items 1–3, 7–9 are a single tight migration + one route edit and should ship together with an integration test on the payout path (the one money flow with two live bugs and zero successful rows). Items 4–5 are product decisions, not code — answer them before writing anything. Item 6 is a one-time repo-wide policy rewrite worth doing while you're in the RLS migration. After the migration, re-run `get_advisors` (both types) and refresh the Snapshot table in this file.
