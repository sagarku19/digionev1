---
noteId: "2fafddf0675211f1bffb2f446ab401a4"
tags: []

---

# DigiOne — DB + Code Production-Readiness Fixes — Design

**Date:** 2026-06-13
**Source of findings:** `.claude/todo-later/5(done)-2026-06-13-db-production-audit.md`
**Project:** Supabase `qcendfisvyjnwmefruba` · Postgres 17.6
**Packaging:** Approach 1 — one structural DB migration → grouped code changes → onboarding docs.

## Goal

Take the DB from "RLS-solid but with two live payout bugs, missing FK constraints, and two documented-but-unbuilt features" to **production-ready and easy to onboard a new developer into**. Three bodies of work in one spec:

- **A. Engineering fixes** — payout bugs, missing FKs/CHECKs, `gateway_order_id` UNIQUE, function `search_path`, RLS `initplan` perf.
- **B. Product features** — referral attribution + **platform-fee-funded** commission payout; read-everything `super_admin` via RLS.
- **C. Onboarding kit** — ERD, schema reference, money-path guide, updated rules.

## Decisions locked in brainstorming

| Decision | Choice |
|---|---|
| Scope | A + B + C in one spec |
| Referral system | Full: attribution at checkout + commission settled at fulfillment |
| Commission funding | **Platform fee** — seller proceeds unchanged; commission comes out of the platform's cut |
| Commission cap | `min(reward_percent × total, platform_fee)` — silent cap (platform never goes negative) |
| Admin model | Read-everything via RLS (`is_super_admin()` + SELECT policies); **writes stay service-role only** |
| Payout status lifecycle | `pending → initiated → processed → failed` |
| Onboarding | Full kit (ERD + schema reference + money-path guide + updated `.claude/rules`) |

## Non-goals (YAGNI)

- No admin **write** RLS policies (no admin UI consumes them yet).
- No squash/deletion of migrations; no touching `20260418_insta_autodm` (separately tracked).
- No conversion of text status columns to PG enums (CHECKs are sufficient now).
- No new referral *UI surface* beyond surfacing redemptions/commission in the existing `useReferrals` dashboard.

---

## Section 1 — Structural DB migration (one file, 4 layers)

Iterate with `execute_sql`; commit as a single migration once green (per Supabase skill — do **not** `apply_migration` while iterating). `CREATE INDEX CONCURRENTLY` statements ship separately (cannot run inside a transaction).

### Layer A — Integrity

**A.1 Missing FK constraints** (audit §2 + §2.1). Run an **orphan scan first**; clean or block orphans before each `ADD CONSTRAINT` so the migration cannot fail mid-apply. Add a covering index for each FK (ties §3 of the audit).

| Table.column → target | ON DELETE |
|---|---|
| `creator_payouts.creator_id → profiles(id)` | SET NULL |
| `coupons.creator_id → profiles(id)` | CASCADE |
| `referral_codes.owner_creator_id → profiles(id)` | CASCADE |
| `referral_codes.owner_user_id → users(id)` | SET NULL |
| `site_navigation.site_id → sites(id)` | CASCADE |
| `site_sections_config.site_id → sites(id)` | CASCADE |
| `site_product_assignments.site_id → sites(id)` | CASCADE |
| `site_product_assignments.product_id → products(id)` | CASCADE |
| `user_product_access.order_id → orders(id)` | CASCADE |
| `user_product_access.product_id → products(id)` | CASCADE |
| `user_product_access.user_id → users(id)` | CASCADE |
| `user_product_access.order_item_id → order_items(id)` | SET NULL |
| `order_referrals.referral_code_id → referral_codes(id)` | CASCADE |
| `user_referrals.referral_code_id → referral_codes(id)` | CASCADE |
| `user_referrals.referrer_user_id → users(id)` / `referrer_creator_id → profiles(id)` / `referred_user_id → users(id)` | SET NULL |
| `product_licenses.{order_id,product_id,user_id}` → orders/products/users | CASCADE |

**A.2 Constraints**
- `creator_payouts_status_check` → `CHECK (status IN ('pending','initiated','processed','failed'))` — **fixes the payout blocker**.
- `orders` → `CHECK (total_amount >= 0)`.
- `creator_balances` → `CHECK (total_earnings >= 0 AND total_platform_fees >= 0 AND total_paid_out >= 0 AND pending_payout >= 0)`.
- `creator_payouts` → `CHECK (amount > 0)`.
- `orders` → `CREATE UNIQUE INDEX CONCURRENTLY uq_orders_gateway_order_id ON orders(gateway_order_id) WHERE gateway_order_id IS NOT NULL`.

### Layer B — Functions / RLS performance
- Pin `search_path = pg_catalog, public` on `update_updated_at_column`, `update_product_search_vector`, `update_blog_post_search_vector`, `update_projects_updated_at_column`.
- **Drop** `update_projects_updated_at_column` (no `projects` table) — clears one search_path warning too.
- Rewrite the 54 RLS policies that call `current_profile_id()` / `auth.uid()` to wrap them in a scalar subquery `(select …)` → clears the 20 `auth_rls_initplan` warnings. Mechanical drop-and-recreate per policy.

### Layer C — Admin (read-everything via RLS)
- `is_super_admin()` — `STABLE SECURITY DEFINER`, `search_path` pinned, body: `select coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') = 'super_admin'`. `GRANT EXECUTE` to `authenticated` (RLS evaluates it in the caller's role).
- Additional permissive **SELECT** policies `USING ((select is_super_admin()))` on: `orders`, `creator_balances`, `transaction_ledger`, `creator_payouts`, `creator_kyc`, `profiles`, `users`, `products`, `sites`, `coupons`, `order_referrals`, `referral_codes`. **No INSERT/UPDATE/DELETE admin policies.**

### Layer D — Referral attribution
- Ensure `order_referrals` columns: `order_id, referral_code_id, referrer_creator_id, commission_amount (numeric default 0), status (default 'pending', CHECK IN ('pending','settled'))`. FKs from Layer A.
- Attribution is a **pending `order_referrals` row written at checkout**, settled at fulfillment (Section 2.3).

---

## Section 2 — Code fixes

### 2.1 Payout route — `app/api/payouts/request/route.ts`
- `status:'pending'` now satisfies the fixed CHECK.
- **Concurrency fix:** the conditional `pending_payout` update must confirm a row actually changed. Add `.select()` to the update and treat `data.length !== 1` as a collision → `409`. (Today a 0-row update returns no error, so the guard never fires — audit §8 HIGH.)

### 2.2 Checkout referral capture — `app/api/checkout/create/route.ts` + `src/lib/server/referrals.ts` (new)
- Accept optional `referralCode` in the request body.
- New `validateReferral(code, { buyerUserId, sellingCreatorId })` (mirrors `src/lib/server/coupons.ts`): code exists + active + not expired; **reject self-referral** (referrer ≠ buyer and referrer ≠ selling creator); returns `{ referralCodeId, referrerCreatorId, rewardPercent }` or null.
- On a valid referral, write a **pending `order_referrals`** row linked to the new order.
- **Referrer must be a creator in v1.** Commission credits `creator_balances`, which only exists for creators (`profiles.id`). A code is commission-eligible only when `owner_creator_id` is set; codes with only `owner_user_id` are still recorded for attribution/tracking but pay **no** commission (`commission_amount = 0`, settled immediately). This keeps the money path keyed on `referrer_creator_id` and never credits a balance row that doesn't exist.
- Storefront: capture `?ref=CODE` (persist for the session) and pass it into the checkout call. (Frontend wiring is part of the plan.)

### 2.3 Fulfillment commission — `src/lib/server/fulfillment.ts` (`fulfillOrder`, new step 7)
Runs after coupon redemption, before/after notify (order-independent). Platform-fee-funded, idempotent:
```
row = pending order_referrals for orderId
if row and total > 0:
  commission = round(total * rewardPercent/100, 2)
  commission = min(commission, platformFee)          # platform-funded → never negative
  claimed = UPDATE order_referrals
              SET status='settled', commission_amount=commission
            WHERE order_id=orderId AND status='pending'  RETURNING *
  if claimed:
    credit_creator_balance(referrerCreatorId, commission, 0)
    transaction_ledger insert:
       tx_type='referral_commission', direction='credit', amount=commission,
       creator_id=referrerCreatorId, order_id=orderId,
       record_hash = sha256(orderId + ':ref:' + paymentId)   # deterministic, replay-safe
    notifications insert for referrer
```
- Seller proceeds (`total − platformFee`) are **unchanged**; commission is drawn from the platform's share. The platform's implicit net = Σfees − Σcommissions (visible in the ledger).
- Skip when: total = 0 (free), no pending referral row, or the claim returns 0 rows (already settled — idempotent).
- `fulfillPaymentLinkSubmission` is **not** in scope for referrals (payment links have no cart/referral context).

### 2.4 Admin
- RLS does the gating. Update `.claude/rules/security-model.md` to describe the real model: read-admin via `is_super_admin()`, writes service-role only. No route changes required now.

### 2.5 Referral dashboard
- `useReferrals` already reads `order_referrals`; with real rows it now shows redemptions + `commission_amount`. Surface a small "commission earned" stat. No new page.

---

## Section 3 — Onboarding kit

- **`docs/db/ERD.md`** — mermaid ER diagram of the corrected schema (every FK now real). Grouped by domain: identity, storefront/sites, catalog, money, referral, analytics.
- **`docs/db/schema-reference.md`** — per-table one-liner: purpose · owner column · key columns · RLS summary · primary writer (API route / hook / trigger).
- **`docs/db/money-path.md`** — the single end-to-end narrative: `checkout/create → Cashfree → webhook → fulfillOrder → creator_balances → payout request → referral commission`, covering idempotency (atomic claims, deterministic `record_hash`), the platform-fee funding model, and the service-role-only write boundary.
- **Rules updates:** `security-model.md` (admin RLS, referral commission, payout status), `api-routes.md` (checkout `referralCode`, payout `status` lifecycle), `supabase-reference.md` (proxy reads `app_metadata`), `supabase/SUPABASE.md` (counts), and tick resolved items in audit #5.

---

## Section 4 — Testing

Closes the audit's "zero money-path tests" gap. Integration tests (route handlers against a Supabase test schema / service client):
- **Payout:** happy path (verified KYC + sufficient balance → row inserted with `status='pending'`); concurrency collision → `409`; insufficient balance → `400`; unverified KYC → `403`.
- **Referral:** commission settled once (idempotent on replay); fee cap applied when `reward_percent` is high; self-referral rejected at checkout; free order skipped.
- **FK integrity:** deleting a `site` cascades its `site_navigation`/`sections`/`assignments`; orphan insert rejected.

Verify: `npx tsc --noEmit`, `npm run lint`, and `get_advisors` (security + performance) before/after — the 20 `auth_rls_initplan` + 4 `function_search_path_mutable` warnings should drop to ~0.

---

## Section 5 — Migration & rollout safety

1. Orphan scan (read-only) → report any rows that would violate the new FKs.
2. Apply Layer A constraints + Layer B/C/D DDL via `execute_sql`, iterating until clean.
3. `CREATE INDEX CONCURRENTLY` for FK indexes + the `gateway_order_id` unique index — run **outside** the transaction.
4. Re-run `get_advisors`; confirm warning drop.
5. Commit the whole thing as **one** migration file (`supabase db pull <name>` style) so history stays reconciled.
6. `npm run update-types` (or MCP fallback on Windows) so `database.types.ts` reflects the new columns/constraints — required before the TS code compiles against `order_referrals`/`referralCode`.

## Risk notes

- **Money path** (payout fix + referral commission) is the highest-risk surface — gated by the Section 4 integration tests; ship behind them.
- **RLS policy rewrite** is mechanical but touches 54 policies — validate a sampling of creator/buyer/anon reads still return correct rows after the `(select …)` wrapping.
- **Commission cap is silent** by decision — a creator setting `reward_percent` above the platform fee rate gets capped without warning. Acceptable for v1; a checkout-time validation that rejects over-fee codes is a future enhancement.

## File-touch summary

| Area | Files |
|---|---|
| DB | one new `supabase/migrations/<ts>_production_fixes.sql` (+ concurrent-index companion) |
| Code | `app/api/payouts/request/route.ts`, `app/api/checkout/create/route.ts`, `src/lib/server/referrals.ts` (new), `src/lib/server/fulfillment.ts`, storefront checkout caller(s), `src/hooks/useReferrals.ts` (stat), `types/database.types.ts` (regen) |
| Docs | `docs/db/{ERD,schema-reference,money-path}.md`, `.claude/rules/{security-model,api-routes,supabase-reference}.md`, `supabase/SUPABASE.md`, audit #5 |
| Tests | payout + referral + FK integration tests |
