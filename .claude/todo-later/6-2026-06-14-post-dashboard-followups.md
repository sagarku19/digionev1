---
noteId: "post-dashboard-followups-20260614"
tags: []
---

# Post-dashboard follow-ups (DB hardening + maturity)

**Captured:** 2026-06-14 — deferred by the user, to be picked up *after* the next round of dashboard add/update work.
**Context:** the production-readiness fix-set landed (see `5-2026-06-13-db-production-audit.md` punch-list = mostly resolved, and `docs/superpowers/specs|plans/2026-06-13-db-production-fixes*`). The schema is solid; what remains is cleanup + operational maturity. None of this blocks shipping.

---

## A. Process / operational maturity (highest value)

| # | Item | Why | Effort |
|---|---|---|---|
| A1 | **Stand up a Supabase staging branch** | DB DDL currently hits the LIVE project directly (no staging; Windows CLI broken). This is the single biggest risk. Validate migrations on a branch before prod. | M |
| A2 | **Integration tests on the money routes + a CI gate** | Only 5 unit tests exist. Cover: payout happy-path + 409 collision; referral settle (idempotency, fee cap, self-referral, free-order); webhook HMAC. Wire `tsc`+`lint`+`vitest` into GitHub Actions. | M–L |
| A3 | **Enable leaked-password protection** (Supabase Auth → Password Settings, HaveIBeenPwned). | Security advisor WARN; one toggle. | XS |
| A4 | **Observability** — Sentry (client+server errors) + a real log backend (the `/api/upload` etc. `console.error` logs go nowhere). | Catch prod failures. | M |
| A5 | **Balance reconciliation job** (`pg_cron` is installed) — periodically check `creator_balances` against `transaction_ledger` + `creator_payouts` for drift. | Balances are maintained imperatively in fulfillment; a checker catches bugs. | M |

### A2 expanded — test strategy (run before go-live)

Test pyramid: a wide base of fast unit tests (Vitest) + a thin top of E2E (Playwright). **Run these as the pre-production gate** — the user will execute them when the app is otherwise ready to ship.

**Sequencing (dependencies matter):**
1. **Now / no infra:** Vitest for all *pure* functions + wire `tsc`+`lint`+`vitest` into GitHub Actions CI.
2. **After A1 (test DB / staging branch):** DB-helper integration tests + Playwright E2E. Do NOT run E2E against the live prod project — it creates junk orders/users.

**Vitest (unit)** — already installed; `src/lib/server/referrals.test.ts` exists (5 tests on `computeReferralCommission`).

| Bucket | Maps to | Kind |
|---|---|---|
| Reward calculations | `computeReferralCommission` (`src/lib/server/referrals.ts`) ✅ done | pure — easy |
| Validation functions | `isSafeInternalPath` (`src/lib/safe-redirect.ts`) [pure], `validateCoupon` (`src/lib/server/coupons.ts`), `validateReferral` [DB] | mixed |
| Referral logic | `validateReferral` self-referral rules | DB-touching → mock client or test DB |
| Database helper functions | `getPlatformFeeRate`, `resolveProfileId`, `rateLimit` | DB-touching → needs test DB (A1) |
| Utility functions | currency/price formatters, slug helpers, anything pure in `src/lib/` | pure — easy |

> Rule of thumb: pure functions (no I/O) get exhaustive unit tests now. DB-touching helpers are better as integration tests once a test DB exists — mocks don't catch schema drift.

**Playwright (E2E)** — needs: new dep `@playwright/test` (ask first), a running app (`npm run dev`) against a **seeded test DB**, and deterministic external services.

| Flow | Verifies | Hard part |
|---|---|---|
| Login | email/password → session cookie → dashboard | OAuth consent screen is awkward in Playwright → test email/password, stub OAuth |
| Signup | form → `app_metadata.role` promotion → role-gated redirect | needs email-confirmation disabled in test env |
| Purchase flow | storefront → checkout → Cashfree → webhook → fulfillment → access granted | Cashfree is external → anchor on the **free-order path** (total=0, no Cashfree) for a deterministic test; use sandbox + webhook simulation for the paid path |
| Withdraw flow | KYC-verified creator → payout → `status:'pending'` row + balance decrement | seed a creator with verified KYC + balance (tests the bug fixed 2026-06-14) |
| Admin actions | `super_admin` reads across creators via `is_super_admin()` RLS | seed a `super_admin` user (`app_metadata.role`) |

**CI gate:** `tsc` + `lint` + `vitest` first (fast, free). Add Playwright to CI later (slower; needs test-DB + secrets).

---

## B. Schema cleanup (audit #5 item 10 / Stage 1)

| # | Item | Detail |
|---|---|---|
| B1 | **Decide build-or-drop on ~20 dead tables** | No writer in code, all empty. Clusters: payout-v2 (`creator_payout_methods`, `creator_payout_requests`, `creator_payout_request_items`); wallets (`user_wallets`, `user_wallet_transactions`, `creator_revenue_shares`); subscriptions (`subscriptions`, `creator_subscription_orders`); storage index (`storage_files`, `storage_file_usages`, `media_library`, `product_files`, `product_licenses`); analytics events (`conversion_events`, `product_view_events`, `site_page_views`); misc (`site_templates`, `user_carts`, `user_wishlist`, `email_events`). Drop the ones you won't build, or wire writers for the ones you will. |
| B2 | **Naming consistency** (invasive — touches types + every hook/route; do as one pass) | `lead_form` → `form_submissions` (it holds submissions; `forms` holds the schema — inverted); align `payment_requests` / `linkinbio_pages` with the `site_*` family; consider `site_payment` / `site_linkinbio`. |
| B3 | **Convert text status columns to the declared enums** | `orders.status`, `creator_payouts.status`, `creator_kyc.status`, `subscriptions.status`. 21 enums declared; several unused — drop the dead ones (`ab_test_status`, `font_source_type`, `layout_role_type`, `storage_provider_type`). |
| B4 | **`updated_at` trigger coverage** | Only `linkinbio_*` have the `update_updated_at_column` trigger. Either extend to every table with an `updated_at` column, or drop the column where unused — pick one convention. |

## C. Known bugs / risks to verify (carried from this session)

| # | Item | Detail |
|---|---|---|
| C1 | **Coupon-create identity bug** (same class as the old payout bug) | During the FK orphan scan, a coupon was found with `creator_id` set to a `users.id` instead of `profiles.id` (repointed). **Audit the dashboard coupon-create path** — it likely writes the wrong id. Check any other creator-owned insert that might use `user.id`/`auth.uid()` where `profiles.id` is required. |
| C2 | **`public-asset` bucket allows listing** | Advisor WARN; drop the broad SELECT policy on `storage.objects` for that bucket (object URLs still work). |
| C3 | **`20260418_insta_autodm` migration is a phantom** | Registered in history but its tables don't exist live. On a `db reset` it would recreate unused tables. Decide: apply the feature or remove the migration + deregister it. |
| C4 | **`REBUILD.md` rewrite** | Its `pg_dump`-based flow is superseded by `migrations/` + the Supabase CLI; currently banner-flagged. (Also: capture `storage.objects` RLS policies into a dedicated migration — see `supabase/CLEANUP-2026-06-13.md`.) |

## D. Scale (only when traffic is real)

- Use the Supabase **pooler / PgBouncer** for serverless connections.
- Re-run `get_advisors (performance)` after new high-traffic query paths land and add indexes the advisor flags.
- Revisit the ~40 "unused index" advisor INFOs after 30 days of real `pg_stat_user_indexes` (don't drop prematurely — many are on empty tables).
- Read replicas / compute tier upgrade are the scaling levers — no schema rewrite needed.

---

> **Reminder (now also a hard rule in `CLAUDE.md`):** when you edit code / add a feature / change behavior and it needs a DB change, make the migration **in the same change-set** — migration → regenerate types → code. Don't work around a missing column with `as any` or `metadata` stuffing. New `public` tables get RLS + a policy before shipping.
