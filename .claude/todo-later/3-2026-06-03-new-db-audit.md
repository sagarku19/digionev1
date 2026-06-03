---
noteId: "06b2b8305f3411f1b5532decc08dd652"
tags: []

---

# DigiOne DB Audit — Consolidated Roadmap

**Captured:** 2026-06-03
**Project:** `qcendfisvyjnwmefruba` (Postgres 17.6, 59 public tables)
**Status when captured:** DB is fully exposed (RLS off on 58/59), one payout bug active, several frontend hooks pointing at non-existent tables, migration history desynced.
**Why this file exists:** Hold the full picture so it can be worked through *after* frontend changes settle. Order of operations below is intentional.

> Companion analytical report: [`2-2026-06-03-db-audit.md`](./2-2026-06-03-db-audit.md) — has the full live-state inventory, advisor output, and per-table reads/writes mapping. This file is the **plan**; that one is the **evidence**.

---

## Execution order (do not reorder casually)

```
Stage 0 → Frontend changes settle (you are here)
Stage 1 → Schema structure: renames, dedup, missing constraints, enum conversions
Stage 2 → Code ↔ schema reconciliation: dead-table hooks, payout bug, defensive fallbacks
Stage 3 → RLS rollout (the big security gate)
Stage 4 → Security hardening: SECURITY DEFINER, sensitive columns, bucket policies, auth
Stage 5 → Performance: duplicate indexes, missing FK indexes, hot-path indexes
Stage 6 → Migration history reconciliation
Stage 7 → Nice-to-have / backlog
```

Reasoning for the order:
- **Schema first**, because renames/constraints invalidate types and the RLS migration must reference current names.
- **Code reconciliation second**, because RLS will instantly break any client calls that target wrong tables (the silent failures in prod become loud failures under RLS).
- **RLS third**, because every later layer trusts it.
- **Security hardening after RLS**, because some advisor items disappear once RLS is on (the `rls_disabled_in_public` cluster) and the remaining ones need clean policies in place to revoke against.
- **Performance last**, because it's the safest set of changes and the live row counts are tiny (orders=14) — no rush.

---

## Stage 1 — Schema structure

### 1.1 Pick one model per overlapping concept

DigiOne has "two of everything" in a few places. Decide, then keep one set and drop the other.

| Concept | Live (keep) | Empty siblings (decide) |
|---|---|---|
| Payouts | `creator_payouts` | `creator_payout_methods`, `creator_payout_requests`, `creator_payout_request_items` |
| Money ledger | `transaction_ledger` (creator side) | `user_wallets`, `user_wallet_transactions`, `creator_revenue_shares` |
| Subscriptions | `subscription_plans` + `subscriptions` | `creator_subscription_orders` (relationship unclear) |
| Analytics events | (none populated) | `site_page_views`, `product_view_events`, `conversion_events`, planned `linkinbio_analytics` |
| Form schema vs submissions | `forms` (schema), `lead_form` (submissions) | naming inverted — rename `lead_form` → `form_submissions` |

**Action:** for each row, either delete the unused tables (and their FKs/indexes), or commit to building them and wire the writers. Don't leave a third year of half-built schemas.

### 1.2 Rename for symmetry within the site family

| Today | Suggested |
|---|---|
| `payment_requests` (payment-site extension) | `site_payment` (matches `site_main`, `site_singlepage`) |
| `linkinbio_pages` | `site_linkinbio` |
| `lead_form` | `form_submissions` |
| `linkinbio_blocks` / `linkinbio_items` | leave alone if `site_linkinbio` becomes parent — they FK through |

Renames invalidate `database.types.ts` and every hook/route. Coordinate with the Stage-2 code sweep — do them in the same PR.

### 1.3 Add missing constraints

| Table | Constraint | Reason |
|---|---|---|
| `transaction_ledger` | `record_hash` UNIQUE | Make double-credit physically impossible. Also switch the hash input from `order_id + Date.now()` to `order_id + cf_payment_id` so it's deterministic across webhook retries. |
| `orders` | `gateway_order_id` partial UNIQUE `WHERE gateway_order_id IS NOT NULL` | Webhook lookup key. Today nothing prevents two orders sharing one Cashfree session ID. |
| `orders` | `creator_id` NOT NULL (after backfill) | Currently nullable + duplicated in `metadata.creator_profile_id`. |
| `orders` | `CHECK (total_amount >= 0)` | Trivial integrity. |
| `creator_balances` | `CHECK (total_earnings >= 0 AND total_platform_fees >= 0 AND total_paid_out >= 0 AND pending_payout >= 0)` | Same. |
| `creator_payouts` | `CHECK (amount > 0)` | Same. |
| `users` | `CHECK (phone !~ '^0+$')` or drop the `'0000000000'` checkout fallback | Today `/api/checkout/create:137` writes `'0000000000'` as a phone placeholder; `users.phone` is UNIQUE — eventual collision waiting to happen. |

### 1.4 Convert text status columns to enums

21 enums declared in the schema. Several status columns ignore them:

| Column | Today | Switch to |
|---|---|---|
| `orders.status` | `text` | `order_status` enum |
| `creator_payouts.status` | `text` | `payout_status` enum |
| `subscriptions.status` | `text` | (define enum, e.g. `subscription_status`) |
| `creator_kyc.status` | `text` | `kyc_status` enum |
| `products.category` | `text` | decide if categorisation is closed-set or freeform first |

Enums give free CHECK enforcement and remove any chance of `'Completed'` vs `'completed'` casing bugs. Cost: `ALTER TYPE … ADD VALUE` to add variants.

**Drop unused enums** (declared but unreferenced): `ab_test_status`, `font_source_type`, `layout_role_type`, `storage_provider_type`. Confirm with `\dT+` before dropping.

### 1.5 Audit / lifecycle columns

- `products.deleted_at` and `sites.deleted_at` exist; `coupons`, `services`, `upsell_pages`, `linkinbio_pages` lack soft-delete. Pick one convention.
- `updated_at` triggers exist on `linkinbio_blocks`, `linkinbio_items`, `linkinbio_pages` only. Extend `update_updated_at_column()` triggers to every table with an `updated_at` column — or drop the linkinbio ones for consistency.
- No `created_by` / `updated_by` columns. For money tables (`orders`, `coupons`, `creator_payouts`, `creator_kyc`), consider adding them or enabling `pgaudit` (extension is installed; not active).

### 1.6 Smaller column-level cleanups

| Table.column | Action | Why |
|---|---|---|
| `orders.gateway_signature` | Drop | Webhook never writes it (signature is verified, not stored). |
| `orders.payment_method` | Drop or populate | Always empty today. |
| `orders.origin_site_id` | Rename to `origin_site_id_at_purchase` or document as denormalized | Make snapshot intent obvious; `order_items.origin_site_id` duplicates it. |
| `users.phone_verified`, `users.email_verified` vs `profiles.email_verified` | Pick canonical | Two tables track same identity flags. |
| `storage_files.public_url` (`GENERATED ALWAYS AS (cdn_url)`) | Drop the generated column or make `cdn_url` NOT NULL | Today it's a passthrough on a nullable source. |
| `product_files.creator_id` | Drop (denormalized) or add CHECK trigger | Risks drift vs `products.creator_id`. |

---

## Stage 2 — Code ↔ schema reconciliation

These are code bugs surfaced by the structural audit. They have to land before RLS, because RLS will turn silent-write failures into loud 403s.

### 2.1 Payout API uses the wrong `creator_id` (P0)

**File:** `app/api/payouts/request/route.ts`
**Lines:** `:27`, `:38`, `:60`, `:72`

`creator_kyc.creator_id`, `creator_balances.creator_id`, `creator_payouts.creator_id` all FK to `profiles.id`. The route filters/inserts with `user.id` (= `auth.users.id`). Different UUIDs. **No creator can withdraw via this route today.**

Fix pattern: resolve `user.id → profile.id` server-side first (mirror `useEarnings.ts:16`, which calls `getCreatorProfileId()`). `lib/getCreatorProfileId.ts` is browser-only today; either lift it to a shared helper or use the 3-hop pattern from `lib/auth-resolve.ts` / `app/api/sites/create/route.ts:75-114`.

Add an integration test before merging — this is the money path.

### 2.2 Four code paths target non-existent tables/RPCs

| Reference | File | Action |
|---|---|---|
| `ab_tests` | `src/hooks/useAbTests.ts` | Delete hook + any consumers, OR add table + types and wire it up. |
| `site_config` | `src/hooks/useSiteConfig.ts`, `src/hooks/useStorefront.ts:27` | Same call. Likely a stale name for `site_design_tokens` + `site_sections_config`. |
| `payout_requests` | `src/hooks/usePayoutRequests.ts` | Delete — `useEarnings` already returns `creator_payouts` rows under `payouts`. |
| `linkinbio_analytics` table + `increment_link_click_count` RPC | `app/api/linkinbio/track/route.ts` | Add the table + RPC (the route's design is correct), OR remove the route. Today every track call silently no-ops. |

All four hide behind `(supabase as any)` casts — TypeScript compiles, runtime throws or no-ops.

### 2.3 Webhook `creator_id` resolution

**File:** `app/api/webhook/cashfree/route.ts:70`
Reads `creator_id` from `order.metadata.creator_profile_id`. Switch to `order.creator_id` directly (column exists, FK exists). Drop the metadata fallback once `orders.creator_id` is `NOT NULL` (Stage 1.3).

### 2.4 Remove dead defensive fallbacks

**Files:** `app/api/checkout/create/route.ts:89-96, 111-115`, `app/api/webhook/cashfree/route.ts:62-66`

The retry-without-`creator_id` and retry-without-`payment_verified_at` paths are dead — both columns exist in the live schema and in types. They silence type errors with `as any` and obscure the real shape.

### 2.5 Single-quoted table strings audit

Search for `'table_name' as any` patterns. Each one is a TypeScript bypass. After Stage 1 renames + Stage 2.2 cleanup, regenerate types (`npm run update-types`, or MCP fallback per `supabase-reference.md`) and remove every `as any` cast that still exists.

---

## Stage 3 — RLS rollout

### 3.1 The situation

`supabase/migrations/20260602000000_rls_policies.sql` exists in the repo, was load-tested in a throwaway PG18 cluster (see `supabase/exports/RLS-POLICIES.md` validation table), and was **never applied** to the live project. Live `rls-status.txt` shows `t` only on `public_images`; everything else is `f`. The Supabase advisor flags all 58 as `rls_disabled_in_public` ERROR.

Operational impact today: anyone with the anon key can SELECT/INSERT/UPDATE/DELETE every public table, including `orders`, `creator_balances`, `transaction_ledger`, `creator_kyc` (bank/Aadhaar fields), `product_licenses` (license keys), `users`, `profiles`. The "service-role-writes-only" rule in `.claude/rules/security-model.md` is *convention enforced by API code*, not by the database.

### 3.2 Rollout plan

1. **Branch first.** Create a Supabase branch (or new throwaway project) and apply the migration there. Validate against `supabase/exports/RLS-TEST-CHECKLIST.md`.
2. **Verify GRANTs.** Standard Supabase projects have `grant usage on schema public to anon, authenticated, service_role` + table-level grants. A branch may not — see `RLS-POLICIES.md` § "Production prerequisites". If you see `permission denied for table X` instead of empty results, it's a missing GRANT, not a policy bug.
3. **Apply Stage 1 + Stage 2 first.** Renamed tables need their new names in the RLS migration. Bug-fix the payout API first or it'll 403 the moment RLS lands.
4. **Smoke test from anon key:** confirm storefront still renders, signup still creates `users`+`profiles` (the `handle_new_user` trigger runs as SECURITY DEFINER, so should be unaffected), discover still lists products, checkout still creates orders.
5. **Smoke test from authenticated session:** dashboard reads, product create, site edit, payout request, KYC upsert.
6. **Apply to prod** once branch is green. Save a re-export of `rls-status.txt` and update `INVENTORY.md` (which currently says "all 59 tables" — that's the design, not the live state).

### 3.3 Post-RLS verification

Run `mcp__plugin_supabase_supabase__get_advisors` with `type: "security"` — the 52 `rls_disabled_in_public` errors should disappear. Anything remaining is a real residual finding for Stage 4.

---

## Stage 4 — Security hardening

These are the items that survive RLS rollout, or that RLS doesn't address.

### 4.1 Revoke EXECUTE on SECURITY DEFINER functions

Three `SECURITY DEFINER` functions are callable by `anon` and `authenticated` via `/rest/v1/rpc/…`:

| Function | Intended use | Action |
|---|---|---|
| `handle_new_user()` | Trigger on `auth.users.INSERT` | `REVOKE EXECUTE … FROM anon, authenticated, PUBLIC;` — trigger still fires. |
| `handle_user_email_confirmed()` | Trigger on `auth.users.UPDATE` | Same. |
| `sum_bucket_bytes_for_prefix(text, text)` | Called by `/api/upload` for quota | Revoke from `anon, authenticated`; keep `service_role` execute. (Otherwise anon can probe per-creator storage totals by guessing prefixes.) |

Also set `search_path` explicitly on the four advisor-flagged functions (`function_search_path_mutable` WARN): `update_projects_updated_at_column`, `update_product_search_vector`, `update_blog_post_search_vector`, `update_updated_at_column`. Add `SET search_path = pg_catalog, public` to each definition.

### 4.2 Sensitive-column policies (additive on top of base RLS)

Even with table-level RLS, the per-column exposure advisor still flags:

| Table | Column | Mitigation |
|---|---|---|
| `creator_payout_methods` | `account_number` | Encrypt at rest with `pgsodium` (extension installed). Or store only last-4 + a token. |
| `product_licenses` | `license_key` | Generate/sign per delivery rather than storing in DB. |
| `creator_kyc` | `bank_account_enc`, `aadhaar_last4`, etc. | Column-level GRANT revoke from `authenticated` for raw fields; expose via a view. |
| `conversion_events`, `product_view_events`, `site_page_views` | `session_id` | Hash on insert (already do this for `linkinbio_analytics.ip_hash` pattern). |

### 4.3 Storage bucket policies

- **`public-asset` allows listing** (advisor `public_bucket_allows_listing`). Public buckets don't need a broad SELECT — direct object URLs still work. Drop the `FULL Control` SELECT policy, keep narrower per-prefix policies if you have them.
- Confirm `creator-content` and `creator-private` policies match the `/api/upload` route's path layout (per `.claude/rules/api-routes.md` § Storage). They should be owner-only.
- Migrate any remaining `public-asset/linkinbio/...` reads to `creator-public/{creator_id}/linkinbio/...` per the 2026-06-03 forward-only migration noted in `api-routes.md`.

### 4.4 Auth settings

- Enable Supabase Auth → Password Settings → "Leaked password protection" (HaveIBeenPwned check). Advisor: `auth_leaked_password_protection` WARN.
- Consider enabling MFA enforcement for `super_admin` role once you have admins.

### 4.5 API hardening (compounds with RLS)

These are in the existing storage followups (`.claude/todo-later/2026-06-03-storage-followups.md`) but called out here for execution order:

- Add per-IP / per-creator rate limiting on the public POST endpoints: `/api/checkout/create`, `/api/checkout/payment-link`, `/api/leads`, `/api/upload`, `/api/coupons/validate`. Today only `/api/linkinbio/track` self-throttles.
- `/api/coupons/validate` lets anyone enumerate creator coupon codes. Either require a buyer session or rate-limit per IP.

---

## Stage 5 — Performance

Cheap, safe, last. All `CREATE INDEX` should use `CONCURRENTLY` to avoid lock contention; can't run inside a transaction.

### 5.1 Drop duplicate indexes

| Table | Drop | Keep |
|---|---|---|
| `order_items` | `idx_order_items_order` | `idx_order_items_order_id` |
| `profiles` | `idx_profiles_user_id` | `profiles_user_id_key` (UNIQUE) |
| `sites` | `idx_sites_type` | `idx_sites_creator_type` |
| `users` | `idx_users_auth_provider` | `users_auth_provider_id_key` (UNIQUE) |
| `linkinbio_pages` | `idx_linkinbio_pages_site_id` | `linkinbio_pages_site_id_key` (UNIQUE) |
| `sites` | `idx_sites_slug` (partial) | `uq_sites_slug` (full unique) — or vice versa, document the choice |

### 5.2 Add covering indexes for unindexed FKs

Advisor flagged 38. The hot ones first:

```sql
CREATE INDEX CONCURRENTLY idx_order_items_product ON order_items(product_id);
CREATE INDEX CONCURRENTLY idx_lead_form_form ON lead_form(form_id);
CREATE INDEX CONCURRENTLY idx_lead_form_site ON lead_form(site_id);
CREATE INDEX CONCURRENTLY idx_payment_submissions_request ON payment_submissions(request_id);
CREATE INDEX CONCURRENTLY idx_site_singlepage_product ON site_singlepage(product_id);
CREATE INDEX CONCURRENTLY idx_site_design_tokens_creator ON site_design_tokens(creator_id);
CREATE INDEX CONCURRENTLY idx_forms_site ON forms(site_id);
CREATE INDEX CONCURRENTLY idx_transaction_ledger_user ON transaction_ledger(user_id);
CREATE INDEX CONCURRENTLY idx_upsell_pages_primary_product ON upsell_pages(primary_product_id);
CREATE INDEX CONCURRENTLY idx_user_carts_product ON user_carts(product_id);
CREATE INDEX CONCURRENTLY idx_user_wishlist_product ON user_wishlist(product_id);
```

Remaining 27 FKs from the advisor list are on lower-traffic tables (affiliates, community, email_events, etc.). Batch them in a follow-up.

### 5.3 Add hot-path indexes the advisor can't infer

```sql
-- Webhook lookup path (single biggest hot read)
CREATE INDEX CONCURRENTLY idx_orders_gateway_order_id
  ON orders(gateway_order_id) WHERE gateway_order_id IS NOT NULL;

-- Coupon code lookup at checkout (today only (creator_id, code) UNIQUE exists)
CREATE INDEX CONCURRENTLY idx_coupons_code_active
  ON coupons(code) WHERE is_active = true;
```

### 5.4 Drop genuinely unused indexes — but only after observability

Advisor lists 28 `unused_index` INFOs. Many are zero-stats artifacts of empty tables (everything on `media_library`, `storage_files`, `product_licenses`, `creator_revenue_shares`). Don't drop those — they'll be used the moment those features come online.

Safer drops (after 30 days of real traffic in `pg_stat_user_indexes`):
- `idx_orders_creator` (the non-`_id` variant — duplicates `idx_orders_creator_id`)
- `idx_sites_type` (already in §5.1)
- `idx_products_search` and `gin_products_images` if you confirm search isn't using them

### 5.5 Materialised view / reconciliation job (optional)

`creator_balances` totals are maintained imperatively in `/api/webhook/cashfree`. A periodic reconciliation against `transaction_ledger` + `creator_payouts` would catch drift. `pg_cron` extension is installed. Stage-7 candidate, not urgent.

---

## Stage 6 — Migration history reconciliation

MCP `list_migrations` returns 4 entries (storage migrations only). `supabase/migrations/` has 9 files. The baseline + RLS + marketing + insta + drop-legacy-buckets migrations were applied out-of-band (probably SQL editor) and aren't tracked.

| File | Live? | Registered? |
|---|---|---|
| `00000000000000_baseline.sql` | yes | no |
| `20260416_marketing_tables.sql` | yes (community_posts, services, etc. exist) | no |
| `20260418_insta_autodm.sql` | **no** (no `insta_*` tables in DB) | no |
| `20260602000000_rls_policies.sql` | **no** (RLS off everywhere except public_images) | no |
| `20260603000000_create_products_bucket.sql` | yes | yes (as `20260602202507`) |
| `20260604000000_create_private_storage_buckets.sql` | yes | yes (as `20260602202523`) |
| `20260605000000_merge_products_into_creator_public.sql` | likely | maybe (`20260602204922`) |
| `20260605100000_drop_legacy_storage_buckets.sql` | yes (buckets gone) | no |
| `20260605200000_add_sum_bucket_bytes_for_prefix_rpc.sql` | yes | yes (as `20260602232546`) |

**Actions:**
1. Backfill `supabase_migrations.schema_migrations` with rows for the files that are live-but-unregistered (baseline, marketing, drop-legacy-buckets, and — after applying — RLS).
2. Decide on `20260418_insta_autodm.sql`: apply it or delete it. Today it's a phantom feature.
3. Re-sequence timestamps so they match what's in the migration table (the 2026-06-03/04/05 filenames don't match the `20260602202507`-style entries actually registered).
4. After reconciliation, `supabase db diff` should return clean.
5. Update `supabase/exports/INVENTORY.md` and `supabase/exports/rls-status.txt` — both currently describe state that's stale (lists legacy buckets, claims all 59 tables have RLS).

---

## Stage 7 — Backlog / nice-to-have

| Item | Why it's not urgent |
|---|---|
| Lift platform fee out of `app/api/webhook/cashfree/route.ts:75` (hardcoded 10%) into `subscription_plans` or config table | Only matters when tiered pricing arrives. |
| Wire `storage_files` + `storage_file_usages` as an internal CDN index | Useful for cross-references and quota reporting; today `/api/upload` writes straight to Supabase Storage. |
| `transaction_ledger.record_hash` — switch input to deterministic `(order_id + cf_payment_id)` | Covered by Stage 1.3 constraint; revisit if cross-replay dedup is needed. |
| Drop the four unused enums (`ab_test_status`, `font_source_type`, `layout_role_type`, `storage_provider_type`) | Cleanup, no behavioural impact. |
| Add `pgaudit` for `created_by` / `updated_by` audit trails on money tables | Required if compliance asks; the extension is installed. |
| Periodic balance reconciliation via `pg_cron` | Only matters at meaningful transaction volume. |
| `INVENTORY.md`, `RLS-POLICIES.md`, `rls-status.txt`, `indexes.txt` re-export | Do after each stage lands so the snapshot stays current. |
| Re-run `get_advisors` security + performance after each stage and diff against this file | Tracks progress objectively. |

---

## Snapshot of the current bad-state numbers

Captured 2026-06-03 — use these to measure progress against later runs.

| Metric | Today |
|---|---|
| Tables with RLS enabled | 1 / 59 |
| Security advisor ERRORs | 53 (52 RLS + 5 sensitive-column overlap) |
| Security advisor WARNs | 9 (function search_path × 4, SECURITY DEFINER × 3, bucket listing × 1, leaked password × 1) |
| Performance advisor INFOs (unindexed FK) | 38 |
| Performance advisor INFOs (unused index) | 28 |
| Performance advisor WARNs (duplicate index) | 4 |
| Tables with rows | 23 / 59 |
| Orders rows | 14 (all test/dev) |
| Migration files in repo | 9 |
| Migrations registered in Supabase | 4 |
| Code paths targeting missing DB objects | 5 (4 tables + 1 RPC) |
| Active P0 code bugs surfaced by audit | 1 (`/api/payouts/request` wrong creator_id) |

---

## How to use this file

- Don't start Stage N until Stage N-1 is fully green.
- After each stage, re-run `mcp__plugin_supabase_supabase__get_advisors` (both types) and `list_migrations`, and update the "Snapshot" table above.
- If you discover something during execution that doesn't fit, add it under Stage 7 with a short rationale.
- The companion file [`2-2026-06-03-db-audit.md`](./2-2026-06-03-db-audit.md) has the evidence/reasoning for everything here — keep it for reference but don't edit it; this file is the working plan.
- The unrelated storage followups in [`1-2026-06-03-storage-followups.md`](./1-2026-06-03-storage-followups.md) overlap with Stage 4.5 — fold them in when you get there.
