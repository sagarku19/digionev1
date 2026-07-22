---
noteId: "eaf533805cda11f1b92a4b3b6ebe345a"
tags: []

---

# Security Model

How auth, authorization, and money integrity work in DigiOne. Read this before touching anything in `app/api/`, `proxy.ts`, or any table listed under "Revenue tables" below.

## Trust boundaries

| Boundary | Crosses | Trusted? |
|---|---|---|
| Browser → Next.js | Anything from the client | **Untrusted.** Re-validate every input. Never trust prices, quantities, IDs, or amounts from the body. |
| Next.js → Supabase (anon key) | Cookie-bound user session | Trusted *only* for what RLS allows. |
| Next.js → Supabase (service key) | Server-only routes | **Fully trusted.** Bypasses RLS. Use only for writes that RLS cannot express (revenue, ledger, cross-tenant resolution). |
| Cashfree → `/api/webhook/cashfree` | Webhook payload | Trusted **only after** HMAC-SHA256 signature verification against `CASHFREE_CLIENT_SECRET`. |
| Custom domain → proxy | Hostname header | Untrusted hostname is rewritten into `/_custom/[domain]/*` and resolved server-side. |

## Three Supabase clients — when to use which

| Client | File | Key | RLS | Use in |
|---|---|---|---|---|
| Browser | `lib/supabase/client.ts` | anon | enforced | Client Components only. Reads via RLS. No writes to revenue tables. |
| Server (cookie) | `lib/supabase/server.ts` | anon | enforced | Server Components, Server Actions, Route Handlers that need the **logged-in user**. Reads RLS-filtered to that user. |
| Service | `lib/supabase/service.ts` | service role | **bypassed** | Route Handlers only. Required for any write to `orders`, `creator_balances`, `transaction_ledger`, and for cross-user lookups (e.g. resolving auth user → public user → profile). |

**Rule:** `/api/*` routes must use `createServiceClient()` from `lib/supabase/service.ts` for service-role access. Never import `createClient` from `@supabase/supabase-js` directly in route handlers. One source of truth for env handling, RLS-bypass behavior, and `Database` typing.

## Auth flow

1. User signs up → Supabase Auth sends confirm email. Signup form submits `user_metadata.role` (either `'creator'` or `'buyer'`) as the requested role.
2. User clicks the email link → `GET /api/auth/callback?code=...` exchanges code for session, promotes the signup-requested `user_metadata.role` into `app_metadata.role` via `auth.admin.updateUserById` + `refreshSession()`, then redirects to `?next=` (safe-redirect validated by `src/lib/safe-redirect.ts`) or `/dashboard` by default. On failure → `/login?error=...`.
3. Every request hits `proxy.ts` (Next.js middleware), which:
   - Uses exact host matching (not substring) for custom-domain detection.
   - Verifies the JWT **locally** via `getClaims()` (signature check against the cached JWKS — zero network for live tokens); falls back to `getUser()` (session refresh + cookie write-back) only when local claims can't be produced (expired token, JWKS miss).
   - Reads `app_metadata.role` from the verified claims (no DB hit) and gates via the pure helper `gateGuardedRoute` in `src/lib/shared/route-gate.ts`.
   - Redirects unauthenticated `/dashboard/*` to `/login?returnUrl=...` (`returnUrl` is also safe-redirect validated).
   - Redirects non-creator roles trying to access `/dashboard/*` to `/account/library`.
   - Redirects unauthenticated `/account/*` to `/login`.
4. Inside Route Handlers, use `createClient()` from `lib/supabase/server.ts` and call `supabase.auth.getUser()` (not `getSession()` — see `.claude/rules/anti-patterns.md`).

The middleware in `proxy.ts` runs a four-step fast-path before touching auth:

1. **Exact host match** for custom-domain rewrite — no Supabase client created.
2. **Unguarded paths** (`/`, `/discover`, storefronts, marketing) return `NextResponse.next()` without touching Supabase.
3. **Guarded paths** (`/dashboard`, `/account`) check for an `sb-` cookie first — no cookie → redirect immediately, no network call.
4. **`getClaims()` local verification** runs only when an `sb-` cookie is present on a guarded path; `getUser()` fires only as its fallback (~once per user per token expiry, not per request).

**Local-verify trade-off (accepted, 2026-07-18 spec):** the middleware can't see bans/session-revocations until the access token expires (≤1h lag). Defense-in-depth holds — all data access is RLS-gated; the middleware gate is a router, not the security boundary. Requires the Supabase project to be on **asymmetric JWT signing keys** (rotated to ES256 2026-07-18) — on the legacy HS256 secret, `getClaims()` internally degrades to a `getUser()` network call (old behavior, no harm). See `docs/superpowers/specs/2026-07-18-middleware-jwt-and-prefetch-design.md`.

**API-route auth is two-tier (2026-07-18):**
- **High-frequency routes** (media, uploads, product files, private/deliverable downloads, short links, site create) use `getVerifiedIdentity()` from `src/lib/server/auth-claims.ts`: the same local JWT signature check as the middleware, against a module-cached JWKS (route handlers build a fresh Supabase client per request, so auth-js's own JWKS cache never hits — the module cache is what makes it zero-network). `getUser()` remains the fallback for expired tokens, JWKS outages, and legacy-signed tokens. The cryptographic guarantee is identical to `getUser()` (both prove the token was minted by GoTrue and is unexpired); the only delta is the ≤1h revocation lag, and every one of these routes still enforces DB-level ownership (`storage_files.owner_id`, `user_product_access`, `linksh_links.creator_id`, …) before touching anything.
- **Money/KYC/admin/account/checkout routes** deliberately stay on per-request `getUser()`: they authorize **service-role writes** (which bypass RLS) that move money or expose PII, so a banned user or revoked session must be rejected immediately, not within an hour. Do not migrate these to local verification without a security review.
- Creator-identity resolution caches only **positive** `authUserId → profiles.id` mappings (`src/lib/server/identity-cache.ts`) — the mapping is immutable once a profile exists; null is never cached so buyer→creator upgrades are seen immediately. The profile id is a filter, not a credential — authorization stays with RLS/ownership checks.

`/api/*` routes are excluded from the middleware matcher entirely — they do their own `getUser()` and return 401 inline.

**Dev-only edge case:** with email confirmations disabled locally, a fresh signup has no `app_metadata.role` until the first confirmed or OAuth login (the callback promotion step doesn't run). Users may be redirected to `/account/library` on first `/dashboard` access until they confirm or re-login.

## Roles

Stored in **`auth.users.app_metadata.role`** (server-controlled — cannot be spoofed by the client). Three values:

| Role | Access |
|---|---|
| `buyer` (or unset) | `/account/library`, public storefronts, checkout |
| `creator` | All of buyer + `/dashboard/*` |
| `super_admin` | All of creator + **read-everything** across sensitive tables via the `public.is_super_admin()` RLS helper (SELECT policies only). Admin **writes** still go through service-role API routes — there are no admin INSERT/UPDATE/DELETE policies. |

`proxy.ts` reads **only** `app_metadata.role` from the verified JWT — it no longer reads `user_metadata.role`. The signup form no longer uses `'user'` as the buyer value; it sends `'buyer'`. `/api/auth/callback` promotes the signup-requested `user_metadata.role` into `app_metadata` so it is server-controlled from that point on. For anything sensitive, re-read from the DB rather than trusting the JWT metadata.

## RLS — what's protected

RLS is the entire authz model. There is **no** "is this user allowed?" code in the app — it's all in Postgres policies. Treat the policies in `supabase/migrations/` as the source of truth.

**Implementation:** all policies live in `supabase/migrations/20260602000000_rls_policies.sql` (plus later migrations under `supabase/migrations/`); query the live policies directly (`pg_policies`) for the authoritative set. Every owner check resolves through the helper `public.current_profile_id()` (STABLE SECURITY DEFINER → `select id from profiles where user_id = auth.uid()`), since `profiles.id` is the `creator_id` used across the schema. `service_role` bypasses RLS, so revenue tables carry **read-only** policies for creators and rely on service-role API routes for all writes (no INSERT/UPDATE policy needed for those writes to work).

> History: RLS was effectively off (only `public_images`) until it was rolled out across all public tables (live: 62/62 tables, 87 policies). For the current production-readiness state and remaining gaps, see `.claude/todo-later/5(done)-2026-06-13-db-production-audit.md`.

Tables you should not touch without understanding their RLS:

| Table | What RLS expects |
|---|---|
| `orders` | Buyers read their own (`user_id = auth.uid()`). Creators read their own (`creator_id = current_profile_id()`). **Writes: service role only.** |
| `creator_balances` | Creator reads their own row. **Writes: service role only.** |
| `transaction_ledger` | Creator reads their own. **Writes: service role only, with `record_hash` for audit.** |
| `creator_payouts` | Creator reads/inserts their own. |
| `refunds` | Creator reads their own. **Writes: service role only** (begin_refund/settle_refund RPCs). |
| `refund_requests` | Creator reads their own (SELECT-own) + super_admin reads all (`is_super_admin()`). **Writes: service role only** (create_refund_request / approve_refund_request / reject_refund_request RPCs). Creators no longer self-refund — they file a request that freezes the clawback; a super_admin approves (runs the refund engine) or rejects (releases the hold). See `docs/reference/admin-dashboard.md`. |
| `wallet_frozen_logs` | Creator reads their own. **Writes: service role only** (freeze/release RPCs). |
| `user_product_access` | Buyer reads their own rows (`user_id = auth.uid()`) — the library read model. **Writes: service role only** (fulfillment grants + guest-entitlement claims). |
| `creator_kyc` | Creator **reads** their own (SELECT-own); **no client writes** — all writes go through service-role `POST /api/kyc/submit` (forces `status='pending'`, never accepts `*_verified` from the client; encrypts PAN/bank/UPI via `kyc-crypto`). Admin verification flips `status`/`*_verified` server-side. Payout API checks `status === 'verified'`. |
| `products` | Creator owns rows where `creator_id = profile.id`. Public read where `is_published AND deleted_at IS NULL`. |
| `communities` | **Public read (anon + authenticated, `qual=true`)** — the `/community/[handle]` page is viewable by anyone. Owner-only INSERT/UPDATE via `current_profile_id()`; no client DELETE. One row per creator (`creator_id` unique); carries the public `name`, unique `username` handle, `bio`, `show_avatar` toggle, and `socials` (jsonb array of `{platform,url}`, ≤4). `community_posts` stay keyed on `creator_id`. |
| `community_posts` | Owner CRUD via `current_profile_id()`; **public read (anon, `qual=true`)** for the community page. Public **likes** are an anon-callable `increment_community_post_like(post_id, delta±1)` SECURITY DEFINER RPC that only bumps the denormalised `like_count` (clamped ≥0) — no direct anon writes. Dedupe is client-side localStorage (best-effort, not enforced). `community_reactions` is now legacy/unused. |
| `coupons` | Creator owns (no anon read). Public validation goes through `/api/coupons/validate` (service role). |
| `sites`, `site_main`, `site_singlepage`, `linkinbio_pages`, `site_sections_config`, `site_design_tokens`, `site_navigation` | Owned by `creator_id`. Public read when `is_active`. |
| `lead_form`, `linkinbio_analytics` | Creator reads via site ownership. Public insert via service role (rate-limited at the route). |
| `tax_rules` | Readable by `authenticated` (rates/thresholds). **Writes: service role only.** |
| `tax_transactions` | Creator reads their own. **Writes: service role only** (record_sale_tax / settle_* RPCs). |
| `invoices` | Creator reads their own. **Writes: service role only** (issue_invoice RPC). Buyer sale-invoice access is via the API route (verifies order ownership), not RLS. |
| `invoice_counters` | No policies — service-role only. |

## Revenue integrity rules

These exist because money tables cannot be rebuilt from logs.

1. **Server-side price verification.** Never trust `price`, `quantity`, or `total` from the client. `/api/checkout/create` re-fetches every product's `price` from the DB before calling Cashfree. Reference: `app/api/checkout/create/route.ts`.
2. **Single fulfillment path.** All order-completion side effects (balance credit, ledger, notifications, access grants, coupon redemption) run through `src/lib/server/fulfillment.ts` (`fulfillOrder` for product orders, `fulfillPaymentLinkSubmission` for `pl_` orders). The webhook and `/payment/status` both call into this module — no other code path may flip an order to `completed` or credit a creator balance, except free orders (`total === 0`) which call `fulfillOrder` directly from `/api/checkout/create`.
3. **Webhook signature verification.** `/api/webhook/cashfree` MUST compute `HMAC-SHA256(rawBody, CASHFREE_CLIENT_SECRET)`, base64-encode, and compare with `crypto.timingSafeEqual` against the `x-webhook-signature` header before parsing the body. Reject with 401 on mismatch. Reference: `app/api/webhook/cashfree/route.ts`.
4. **Idempotency via atomic claim.** `fulfillOrder` uses `UPDATE orders SET status='completed' WHERE id=? AND status='pending'`. Zero rows updated = already processed. Cashfree retries on non-2xx, so any failure path must still return 2xx if processing has already happened.
5. **Balance writes via RPC.** `creator_balances` is updated via the `credit_creator_balance` Postgres RPC (no read-modify-write race). Platform fee rate comes from `getPlatformFeeRate()` in `src/lib/server/platform-fee.ts` (returns 0.10 today; single extension point for future tiers — no longer hardcoded in the webhook).
6. **Optimistic concurrency on payout.** Payout request decrements available balance via a conditional update keyed on the read value of `pending_payout`. Collisions return 409. Reference: `app/api/payouts/request/route.ts`.
7. **KYC gate before payout.** No payout request is recorded until `creator_kyc.status === 'verified'`. Reference: `app/api/payouts/request/route.ts`.
8. **Deterministic UNIQUE ledger record hash.** Every `transaction_ledger` row carries `record_hash = sha256(orderId + ':' + cf_payment_id)` (`:free` for free orders; `pl:submissionId:...` for payment-link orders). The column has a UNIQUE constraint — a duplicate hash is rejected by the DB, making replays replay-safe. Don't skip this column.
9. **`user_product_access` grants.** On fulfillment, logged-in buyers receive `user_product_access` rows (one per product in the order). UNIQUE on `(order_id, product_id)` — idempotent.
10. **Refunds are freeze-then-settle.** `begin_refund` (atomic RPC: order row lock → over-refund check → `frozen_balance` hold) runs before any gateway call; only `settle_refund` (claim-idempotent, webhook/sync-driven) reverses `total_earnings`/`total_platform_fees`, writes the ledger `refund` debit (`record_hash = sha256('refund:' + refundId)`), flips fully-refunded orders to `refunded`, and revokes access. Fee reversal is proportional. No code path outside these RPCs may mutate `frozen_balance`.
11. **`total_earnings` is GROSS.** Fulfillment credits the gross sale amount; `availableBalance()` subtracts `total_platform_fees`. (Fixed 2026-07-04 — it previously credited net, double-counting the fee.)
12. **Tax is accrue-per-sale / settle-at-payout.** `record_sale_tax` snapshots an immutable `tax_transactions` row at fulfillment (GST-inclusive commission split + threshold-aware pending TDS/TCS) — no balance change. `begin_payout_tax` reserves unsettled pending tax (net of `reversed` counter-rows) at payout; the transfer sends `net_amount`; `settle_payout` finalizes/releases and `settle_refund` writes the proportional reversal. Only these RPCs touch `tax_transactions`. `total_earnings`/`reconcile_creator_balances` are unaffected (a payout of ₹X counts as ₹X paid out regardless of the bank/govt split).
13. **GST registration gate.** `gst_registration_required` blocks payout (409) once FY turnover ≥ ₹20L (₹10L special-category states) until a GSTIN is furnished via `POST /api/kyc/gstin`.

## Public endpoints — abuse surface

Endpoints with no auth that write to the DB. Rate limits are backed by the Postgres `rate_limits` table + `check_rate_limit` RPC via `src/lib/server/rate-limit.ts` (fail-open — a DB error does not block the request).

| Endpoint | Writes | Rate limit | Remaining gap |
|---|---|---|---|
| `POST /api/checkout/create` | `orders`, `order_items` | 10/min/IP | Order rows still accumulate on abandoned carts; no reconciliation job yet. |
| `POST /api/checkout/payment-link` | `payment_submissions` | 10/min/IP | Auto-create hole closed — 404 unless site exists, active, and `site_type='payment'`. |
| `POST /api/leads` | `lead_form` | 5/min/IP | Form must belong to site, email format checked. |
| `POST /api/linkinbio/track` | `linkinbio_analytics` | 60/min/IP (fail-open) + 30s per-IP+link dedupe | Tracking must never block UX — 429 is never returned. |
| `POST /api/upload` | Supabase Storage (signed URL) | Requires cookie session (auth check) | Still outstanding: per-creator upload rate limit; resumable uploads. |
| `POST /api/coupons/validate` | (read only) | 10/min/IP | Enumeration risk reduced but not eliminated. |

## Things that look risky but aren't

- **`app_metadata.role` in `proxy.ts`** — Supabase signs the JWT with its server secret. The metadata is read from the verified JWT. `app_metadata` is server-controlled (unlike `user_metadata` which the client can write). Spoofing requires forging the JWT.
- **`/payment/status` calling Cashfree** — it checks DB status first and only calls Cashfree when the order is still `pending`. When Cashfree confirms, it calls `fulfillOrder` (same path as the webhook). This is intentional: handles the race where the user lands on the status page before the webhook arrives.
- **`app/payment/{status,receipt}/page.tsx` now use `createServiceClient()`** — these are server components. The service key never reaches the browser.

## Reporting a vulnerability

There is no `SECURITY.md` yet. If you find an issue, open a private security advisory on GitHub or contact the maintainer directly. Do not file a public issue.
