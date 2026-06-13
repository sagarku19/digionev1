---
noteId: "66b8554065f711f1bffb2f446ab401a4"
tags: []

---

# Production-Readiness Fixes — Design

**Date:** 2026-06-12
**Source:** Full-codebase audit (2026-06-12) — 27 findings (4 BLOCKER, 8 HIGH, 9 MEDIUM, 6 COST) — plus the 2026-06-03 DB audit (`.claude/todo-later/2-2026-06-03-db-audit.md`).
**Scope decision:** fix **all 27 findings** plus the DB/RLS/index work. The 445-error lint cleanup (`no-explicit-any` across ~40 files) is **out of scope** as a separate mechanical chore — but files touched by this work get their edited lines fixed, and all new code is zero-`any`.

## Decisions made during brainstorming

| Decision | Choice |
|---|---|
| Money-loop architecture | **Approach B** — single shared fulfillment function with an atomic DB claim, called by both the webhook and the status page |
| Rate limiting | Postgres-based (`rate_limits` table + `check_rate_limit` RPC). No new packages, no external service |
| DB changes | Migration files in `supabase/migrations/` **and** applied live to project `qcendfisvyjnwmefruba` via Supabase MCP `apply_migration`; types regenerated after |
| Payment-link economics | Credit creators at the same 10% platform fee — but the fee lives in one helper (`getPlatformFeeRate(creatorId)`) so it can later vary by subscription/offer/creator |
| RLS rollout | Apply `20260602000000_rls_policies.sql` directly to live (no paid preview branch); immediate smoke tests + advisor re-run after |
| Commit protocol | Nothing committed during implementation. Full diff summary presented at the end; user approves one commit batch |

---

## 1. The money loop (findings #1, #2, #4, #9, #10, #13, #14, #18, #19, #27)

### New module `src/lib/server/fulfillment.ts` (server-only, service client)

**`fulfillOrder(orderId, opts?: { gatewayPaymentId?: string })`**

1. **Atomic claim:** `UPDATE orders SET status='completed', gateway_payment_id=?, payment_verified_at=now() WHERE id=? AND status='pending'`. Live schema has both columns (verified in `types/database.types.ts`), so the `as any` / retry-without-column fallbacks in checkout and webhook are deleted (#18). If 0 rows updated → return `{ alreadyFulfilled: true }`, do nothing else. This claim is the idempotency mechanism — whoever wins (webhook or status page) does the side effects exactly once.
2. **Credit creator:** RPC `credit_creator_balance(p_creator_id, p_earnings_delta, p_fees_delta)` — atomic `INSERT … ON CONFLICT (creator_id) DO UPDATE SET total_earnings = creator_balances.total_earnings + EXCLUDED.total_earnings, …`. Kills the read-modify-write race (#9). Fee rate from `src/lib/server/platform-fee.ts` → `getPlatformFeeRate(creatorId): Promise<number>` (returns `0.10` today; the single future extension point for tiered fees). Creator resolved from `orders.creator_id` with `metadata.creator_profile_id` fallback; if **both** missing: loud `console.error` with order id + ledger row carries `meta.needs_reconciliation: true` (#14). The order still completes for the buyer.
3. **Ledger row:** `transaction_ledger` insert with deterministic `record_hash = sha256(order_id + cf_payment_id)` (replay-detecting; column becomes UNIQUE — see M6). Free orders (no `cf_payment_id`) hash `order_id + 'free'`.
4. **Grant access (#2):** for each `order_items` row, insert `user_product_access` (`user_id = orders.user_id`, plus required snapshots `product_link`, `product_name`, `product_price` read from `products`). Idempotent via the new unique `(order_id, product_id)` + `ON CONFLICT DO NOTHING`. **Guests (`orders.user_id IS NULL`) get no row** — they keep today's behavior (access links on the status/receipt pages); logged-in buyers get durable `/api/deliverables` + Library access.
5. **Coupon redemption (#4):** if `orders.metadata.coupon_id` present → RPC `increment_coupon_uses(p_coupon_id)` (atomic increment).
6. **Notification** to the creator (unchanged semantics).

**`fulfillPaymentLinkSubmission(submissionId, gatewayPaymentId)`** (#10)

Same shape: atomic claim on `payment_submissions.payment_status 'pending' → 'completed'`; creator resolved via `payment_requests → sites.creator_id`; credit at `getPlatformFeeRate`; ledger row with `tx_type: 'payment_link'`; notification. No product access (nothing to deliver).

### Callers

- **`/api/webhook/cashfree`** — on `SUCCESS`: if `data.order.order_id` starts with `pl_` → look up `payment_submissions.gateway_order_id` → `fulfillPaymentLinkSubmission`; else current `orders` lookup → `fulfillOrder`. Existing fast-path early-exit for already-terminal orders stays, but correctness no longer depends on it. `FAILED`/`USER_DROPPED` handling unchanged (also extended to flip `payment_submissions` for `pl_` ids). HMAC verification switches to `crypto.timingSafeEqual` on equal-length buffers (#13).
- **`/payment/status` page** — checks DB status **first**; calls Cashfree only when still pending (#27); on PAID calls `fulfillOrder` / `fulfillPaymentLinkSubmission` instead of its raw `orders`/`payment_submissions` updates (#1). The page is a thin caller, never a direct writer. Both `/payment/status` and `/payment/receipt` swap module-scope raw `createClient(URL, SERVICE_KEY)` for `createServiceClient()` (#19).
- **`/api/checkout/create` free-order path** — replaces inline "mark completed" with `fulfillOrder`, so free orders also grant access and redeem coupons.

### Checkout coupon validation (#4)

Extract the full validation from `/api/coupons/validate` into shared `src/lib/server/coupons.ts` → `validateCoupon(code, creatorId, cartAmount)`: creator scoping, `is_active`, `valid_from`/`valid_until`, `max_uses` vs `current_uses`, discount math. Both the validate route and `/api/checkout/create` call it. Checkout stores `coupon_id` + `discount_amount` in `orders.metadata` so fulfillment can redeem.

---

## 2. Identity & authorization (findings #3, #5, #6, #7, #8, #11, #21)

- **Payouts (#3):** shared `src/lib/server/resolve-profile.ts` → `resolveProfileId(authUserId): Promise<string | null>` (the 3-hop `auth.users → users → profiles` already proven in `/api/sites/create`). `/api/payouts/request` keys all four operations (KYC check, balance read, conditional balance update, `creator_payouts` insert) on `profile.id`. `/api/sites/create` adopts the shared helper. `api-routes.md` corrected (it documents behavior the code never had).
- **`useCoupons` (#5):** `user.id` → `await getCreatorProfileId()` in query + insert (the `useProducts` pattern).
- **Open redirects (#6, #7):** `src/lib/safe-redirect.ts` → `isSafeInternalPath(p)` = `p.startsWith('/') && !p.startsWith('//') && !p.includes('\\')`. Used by `/api/auth/callback` (`?next=`, fallback `/dashboard`) and both `returnUrl` consumers in `login/page.tsx` (fallback: role-based default).
- **CSS injection (#8):** `src/lib/safe-css.ts` → `safeCssColor(value, fallback)` (allowlist: `#hex` 3–8 digits; `rgb()/rgba()/hsl()/hsla()` with numeric/percent args only; bare `[a-zA-Z]+` named color) and `safeFontFamily(value, fallback)` (`[\w\s,'-]` only). Applied at every interpolation point: `src/lib/storefront-theme.ts` + the four self-building layouts (`site/[slug]`, `store/[slug]`, `link/[username]`, `upsells/[slug]`). Invalid values render existing defaults.
- **Role storage (#11, #21):**
  - Signup UI value `'user'` → `'buyer'` (#21). The chosen role still rides in `user_metadata` at `signUp` (survives email confirmation) but is now only a *request*.
  - `/api/auth/callback` **promotes**: if `app_metadata.role` unset → `auth.admin.updateUserById` sets it from the requested value (`creator`/`buyer`; legacy `'user'` → `'buyer'`; absent → `'buyer'`, preserving documented Google-signup behavior).
  - One-time SQL backfill copies existing users' `raw_user_meta_data->>'role'` into `raw_app_meta_data` (legacy `'user'` mapped to `'buyer'`).
  - `proxy.ts` reads **`app_metadata.role` only**. `user_metadata` can no longer open the dashboard gate.
  - Known dev-only edge: with email confirmations disabled locally, a fresh signup skips the callback and has no `app_metadata.role` until first confirmed/OAuth login. Accepted.

---

## 3. Platform hardening & cost (findings #12, #15, #16, #17, #20, #22, #23, #24, #25, #26)

### Rate limiting (#12)

- Migration: `rate_limits(key text, window_start timestamptz, count int, PRIMARY KEY (key, window_start))`, RLS enabled with **no policies** (service-role only). RPC `check_rate_limit(p_key, p_max, p_window_seconds) → boolean`: atomic fixed-window upsert-increment; clears that key's expired windows.
- Helper `src/lib/server/rate-limit.ts` → `rateLimit(req, routeName, { max, windowSeconds })`: first-hop `x-forwarded-for`, SHA-256-hashed IP, calls RPC. On limit: routes return `429 { error: 'Too many requests' }`. Fail-open if the RPC errors (availability over strictness), with a `console.error`.
- Applied: `checkout/create` 10/min, `checkout/payment-link` 10/min, `leads` 5/min, `coupons/validate` 10/min, `products/search` 30/min, `linkinbio/track` 60/min (keeps its 30s dedupe).
- Payment-link auto-create hole closed: before auto-creating a `payment_requests` row, verify the site exists, `is_active`, and `site_type = 'payment'`; else 404.

### Proxy rewrite (#15 + #22)

Order of operations: (1) custom-domain rewrite first — **exact host matching** (`host === ROOT_DOMAIN || host.endsWith('.' + ROOT_DOMAIN)` + explicit allowlist for `localhost`, `*.vercel.app`, LAN IPs) — no Supabase client; (2) unguarded paths → `NextResponse.next()` immediately (zero auth calls on marketing/storefront traffic); (3) `/dashboard|/account` only: `getUser()` runs **only when an `sb-*` cookie exists**, else straight redirect to login; (4) matcher excludes `/api/*`. Role gate reads `app_metadata.role`.

### Dead code & discover (#16, #17, #26)

- Delete `src/hooks/usePayoutRequests.ts`, `src/hooks/useSiteConfig.ts` (zero consumers; nonexistent table / wrong identity). Remove from `hooks-reference.md`.
- Remove the dead `site_config` read inside `useStorefront` (table doesn't exist; the query has been silently failing).
- Execute `.claude/todo-later/4`: delete `/api/discover`, `/api/discover/[productId]`, `useDiscoverProduct`; inline equivalent RLS-public queries into the discover Server Components.

### Hook hygiene (#20, #23, #24, #25)

- `QueryClient` global default `staleTime: 60_000` in the provider; per-hook overrides stay.
- `useNotifications` `refetchInterval` 30s → 120s.
- `select('*')` → explicit column lists where consumer usage is clear; kept with a one-line justification where the full typed row is consumed wholesale.
- Query keys normalized to `[domain, kind, ...ids]`. Every `invalidateQueries`/`setQueryData` call site (hooks **and** pages — grep `invalidateQueries` across `app/` + `src/`) updated in the same pass:

| Hook | Old key(s) | New key(s) |
|---|---|---|
| useAbTests | `['ab-tests']` | `['ab-tests','list']` |
| useAnalytics | `['analytics', start, end]` | `['analytics','range', start, end]` |
| useAffiliates | `['affiliates']` | `['affiliates','list']` |
| useCoupons | `['coupons']` | `['coupons','list']` |
| useCreator | `['creator-profile']` | `['creator','profile']` |
| useCustomers | `['customers']` | `['customers','list']` |
| useEarnings | `['creator-earnings']` | `['earnings','summary']` |
| useGuestLeads | `['guest-leads', siteId]` | `['leads','list', siteId]` |
| useLibrary | `['library']` | `['library','list']` |
| useNotifications | `['notifications']` | `['notifications','list']` |
| useOrders | `['creator-orders']` | `['orders','list']` |
| useProductPage | `['product', creatorId, slug]` | `['products','page', creatorId, slug]` |
| useProducts | `['products']`, `['product', id]` | `['products','list']`, `['products','detail', id]` |
| useSites | `['creator-sites']` | `['sites','list']` |
| useStorefront | `['storefront', slug]` | `['storefront','detail', slug]` |
| useStoreProducts | `['store-products', creatorId]` | `['products','store', creatorId]` |
| useUpsellPages | `['upsell-pages']`, `['upsell-page', id]` | `['upsells','list']`, `['upsells','detail', id]` |
| (already compliant) | `['auth','session']`, `['community','posts']`, `['marketing','stats']`, `['profiles','detail',…]`, `['referrals','codes']`, `['services','list']`, `['service-bookings','list',…]`, `['sites','singlepage'/'linkinbio'/'edit-state',…]` | unchanged |

`hooks-reference.md` updated to match.

---

## 4. DB, RLS, indexes

Migrations in order (file + live apply via MCP):

| # | Migration | Content |
|---|---|---|
| M1 | apply existing `20260602000000_rls_policies.sql` | **RLS is currently OFF on 58/59 live tables.** Apply unmodified, directly to live. Immediately run `supabase/exports/RLS-TEST-CHECKLIST.md` smoke checks + `get_advisors`; fix forward |
| M2 | migration-history backfill | Register the 5 applied-but-untracked files in `supabase_migrations.schema_migrations` |
| M3 | function hardening | `REVOKE EXECUTE` on `handle_new_user`, `handle_user_email_confirmed`, `sum_bucket_bytes_for_prefix` from `PUBLIC`/`anon`/`authenticated`. Manual dashboard task noted: enable leaked-password protection |
| M4 | missing tables code already calls | `linkinbio_analytics` + `increment_link_click_count` RPC (owner-read RLS via site ownership, service-role writes); minimal `ab_tests` matching `useAbTests` shape (owner RLS) |
| M5 | money RPCs | `credit_creator_balance`, `increment_coupon_uses` |
| M6 | money integrity | Backfill `orders.creator_id` from `metadata.creator_profile_id`; partial unique index `orders(gateway_order_id) WHERE gateway_order_id IS NOT NULL`; `transaction_ledger.record_hash` UNIQUE (0 live rows); unique `(order_id, product_id)` on `user_product_access` |
| M7 | index pass + rate_limits | Add FK indexes: `order_items(product_id)`, `lead_form(site_id)`, `lead_form(form_id)`, `payment_submissions(request_id)`, `site_singlepage(product_id)`, `forms(site_id)`, `site_design_tokens(creator_id)`. Drop 4 duplicates (`order_items.idx_order_items_order`, `profiles.idx_profiles_user_id`, `sites.idx_sites_type`, `users.idx_users_auth_provider`). Create `rate_limits` + `check_rate_limit` |

Plus the one-time `app_metadata.role` backfill (Section 2) executed via `execute_sql` (data fix, not schema).

After all migrations: **regenerate `types/database.types.ts` via MCP** (mandatory), then remove `(supabase as any)` casts in touched files.

---

## 5. Verification (before asking to commit)

1. `npx tsc --noEmit` — clean.
2. `npm run lint` — zero **new** errors vs the pre-change baseline (445/172).
3. `get_advisors` (security) — RLS errors drop from 53 to ~0; no new findings.
4. Manual smoke: email + Google login; dashboard pages load with data; storefront/link/store pages render; sandbox checkout end-to-end (order → webhook → balance credited → `user_product_access` row → `/api/deliverables` 200); payout request succeeds for a verified-KYC creator; coupons page lists/creates; coupon redemption increments `current_uses`; rate limit returns 429 on burst.
5. Docs corrected in the same change-set: `api-routes.md`, `security-model.md`, `cashfree-reference.md`, `hooks-reference.md`; todo-later 2/3/4 annotated with completed items.

## 6. Out of scope

- The 445-error lint cleanup (separate chore).
- Payout v2 schema (`creator_payout_methods/…`), `storage_files` indexing, reconciliation cron for lost webhooks, resumable uploads, observability backend (Sentry etc.), per-tier platform fees (extension point created, not used).

## 7. Commit protocol

No commits during implementation. At the end: full diff summary + verification results presented; user approves a single commit batch (this spec file included).
