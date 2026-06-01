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

**Rule:** if a route imports `createClient` from `@supabase/supabase-js` directly, it should use `createServiceClient()` from `lib/supabase/service.ts` instead. Same effect, one source of truth for env handling.

## Auth flow

1. User signs up → Supabase Auth sends confirm email.
2. User clicks the email link → `GET /api/auth/callback?code=...` exchanges code for session, sets the cookie, redirects to `/dashboard` (or `/login` on failure).
3. Every request hits `proxy.ts` (Next.js middleware), which:
   - Refreshes the session cookie.
   - Reads `user.user_metadata.role` from the encrypted JWT (no DB hit).
   - Redirects unauthenticated `/dashboard/*` to `/login?returnUrl=...`.
   - Redirects non-creator roles trying to access `/dashboard/*` to `/account/library`.
   - Redirects unauthenticated `/account/*` to `/login`.
4. Inside Route Handlers, use `createClient()` from `lib/supabase/server.ts` and call `supabase.auth.getUser()` (not `getSession()` — see `.claude/rules/anti-patterns.md` and recent commit `329b528`).

The middleware in `proxy.ts` short-circuits on three branches before calling `getUser()`:

1. Custom-domain rewrite happens first — no Supabase client created.
2. Unguarded paths (`/`, `/discover`, storefronts, marketing) return `NextResponse.next()` without touching Supabase.
3. Even on guarded paths (`/dashboard`, `/account`), `getUser()` only runs when an `sb-*` auth cookie is present. Anonymous hits to `/dashboard` skip the network call and fall through to the redirect.

`/api/*` routes are excluded from the middleware matcher entirely — they do their own `getUser()` and return 401 inline.

## Roles

Stored in `auth.users.user_metadata.role`. Three values:

| Role | Access |
|---|---|
| `buyer` (or unset) | `/account/library`, public storefronts, checkout |
| `creator` | All of buyer + `/dashboard/*` |
| `super_admin` | All of creator + admin-gated tables (RLS) |

Role is read from the JWT in `proxy.ts` for the route guard, and from the DB for anything sensitive.

## RLS — what's protected

RLS is the entire authz model. There is **no** "is this user allowed?" code in the app — it's all in Postgres policies. Treat the policies in `supabase/migrations/` as the source of truth.

Tables you should not touch without understanding their RLS:

| Table | What RLS expects |
|---|---|
| `orders` | Buyers can read their own. Creators can read orders where `metadata.creator_profile_id` matches. **Writes: service role only.** |
| `creator_balances` | Creator reads their own row. **Writes: service role only.** |
| `transaction_ledger` | Creator reads their own. **Writes: service role only, with `record_hash` for audit.** |
| `creator_payouts` | Creator reads/inserts their own. |
| `creator_kyc` | Creator reads/updates their own. Payout API checks `status === 'verified'`. |
| `products` | Creator owns rows where `creator_id = profile.id`. Public read where `is_published AND deleted_at IS NULL`. |
| `coupons` | Creator owns. Public read on validate (service role). |
| `sites`, `site_main`, `site_singlepage`, `linkinbio_pages`, `site_sections_config`, `site_design_tokens`, `site_navigation` | Owned by `creator_id`. Public read when `is_active`. |
| `lead_form`, `linkinbio_analytics` | Creator reads via site ownership. Public insert via service role (rate-limited at the route). |

## Revenue integrity rules

These exist because money tables cannot be rebuilt from logs.

1. **Server-side price verification.** Never trust `price`, `quantity`, or `total` from the client. `/api/checkout/create` re-fetches every product's `price` from the DB before calling Cashfree. Reference: `app/api/checkout/create/route.ts:24-49`.
2. **Cashfree webhook is the single source of truth for "paid".** No code path other than `/api/webhook/cashfree` may flip an order to `completed` or credit a creator balance, except: a free order (`total === 0`) which is completed inline at create time. Reference: `app/api/checkout/create/route.ts:114-122`.
3. **Webhook signature verification.** `/api/webhook/cashfree` MUST compute `HMAC-SHA256(rawBody, CASHFREE_CLIENT_SECRET)` and compare base64 against the `x-webhook-signature` header before parsing the body. Reject with 401 on mismatch. Reference: `app/api/webhook/cashfree/route.ts:12-29`.
4. **Idempotency.** Webhook handler must skip orders already in `completed` or `refunded`. Cashfree retries on non-2xx, so any failure path must still return 2xx if processing has already happened. Reference: `app/api/webhook/cashfree/route.ts:52-55`.
5. **Optimistic concurrency on balance writes.** Payout request decrements available balance via a conditional update keyed on the read value of `pending_payout`. Collisions return 409. Reference: `app/api/payouts/request/route.ts:58-69`.
6. **KYC gate before payout.** No payout request is recorded until `creator_kyc.status === 'verified'`. Reference: `app/api/payouts/request/route.ts:27-35`.
7. **Platform fee is 10%** — currently hardcoded in `app/api/webhook/cashfree/route.ts:75`. Lift to config before adding a second tier.
8. **Ledger record hash.** Every `transaction_ledger` row carries a `record_hash = sha256(order_id + timestamp)` for tamper-evidence. Don't skip this column.

## Public endpoints — abuse surface

Endpoints with no auth that write to the DB. These need rate limits in front of them (currently none at the platform level — only `/api/linkinbio/track` self-limits).

| Endpoint | Writes | Current mitigation | Gap |
|---|---|---|---|
| `POST /api/checkout/create` | `orders`, `order_items` | Server-side price verification, Cashfree as money gate | Order rows accumulate on abandoned carts. No per-IP rate limit. |
| `POST /api/checkout/payment-link` | `payment_requests`, `payment_submissions` | Site must exist, fixed-amount enforced | Auto-creates `payment_requests` for unknown sites — wide. |
| `POST /api/leads` | `lead_form` | Form must belong to site, email format check | No rate limit. Form-fill spam → DB growth. |
| `POST /api/linkinbio/track` | `linkinbio_analytics` | 30s per-IP+link dedupe via hashed IP | Dedupe only at insert time. No global cap. |
| `POST /api/upload` | Supabase Storage (signed URL) | None | Anyone can request signed upload URLs for the `products` bucket. Should require an authenticated session. |
| `POST /api/coupons/validate` | (read only) | No auth, anyone can probe codes | Enumeration risk for creator coupon codes. |

## Things that look risky but aren't

- **`SUPABASE_SERVICE_KEY` in `app/payment/{status,receipt}/page.tsx`** — these are server components (no `'use client'`), so the key never reaches the browser. Cleanup is consistency (use `createServiceClient()`), not security.
- **`session.user.user_metadata.role` in `proxy.ts`** — Supabase signs the JWT with its server secret. The metadata is read from the verified JWT, not from the cookie value directly. Spoofing requires forging the JWT.

## Reporting a vulnerability

There is no `SECURITY.md` yet. If you find an issue, open a private security advisory on GitHub or contact the maintainer directly. Do not file a public issue.
