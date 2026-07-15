---
noteId: "d959c1405cda11f1b92a4b3b6ebe345a"
tags: []

---

# Environment Variables

Canonical inventory of every `process.env.*` read by the codebase. If you add or remove an env var, update this file and `.env.example` in the same commit.

## Rules

- **`NEXT_PUBLIC_*`** is shipped to the browser. Never put a secret behind this prefix.
- Anything without `NEXT_PUBLIC_` is **server-only**. Importing a module that reads it from a client component will break at build time.
- All env vars are required unless marked optional. Missing required vars fail loud — service clients throw on init, route handlers return 500.
- `.env.local` is gitignored. Never commit it. Use `.env.example` to document new vars.

## Supabase

| Var | Scope | Used in | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | every supabase client, every API route | Project URL. Same value across all envs of one Supabase project. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `proxy.ts` | Anon key. RLS-bound. Safe to expose. |
| `SUPABASE_SERVICE_KEY` | **secret** | `lib/supabase/service.ts` — accessed by all `/api/*` routes via `createServiceClient()` | Service role. Bypasses RLS. Server-only. |

## Cashfree

| Var | Scope | Used in | Notes |
|---|---|---|---|
| `CASHFREE_ENVIRONMENT` | server | `/api/checkout/create`, `/api/checkout/payment-link`, `app/payment/status/page.tsx`, `src/lib/server/cashfree-refunds.ts` | `'PRODUCTION'` → api.cashfree.com. Anything else → sandbox.cashfree.com. |
| `CASHFREE_CLIENT_ID` | **secret** | `/api/checkout/create`, `/api/checkout/payment-link`, `app/payment/status/page.tsx`, `src/lib/server/cashfree-refunds.ts` | Cashfree merchant ID. |
| `CASHFREE_CLIENT_SECRET` | **secret** | `/api/checkout/create`, `/api/checkout/payment-link`, `app/payment/status/page.tsx`, `/api/webhook/cashfree`, `src/lib/server/cashfree-refunds.ts` | Cashfree secret. Also used as the HMAC key for webhook signature verification. |
| `NEXT_PUBLIC_CASHFREE_ENV` | public | `app/(buyer)/checkout/page.tsx` | UI mirror — client uses this to pick sandbox/prod Cashfree JS SDK. Must match `CASHFREE_ENVIRONMENT`. |

## App

| Var | Scope | Used in | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | public | `app/layout.tsx` (OG metadata), `/api/checkout/create`, `/api/checkout/payment-link` | Absolute URL of this app. No trailing slash. Used as Cashfree `return_url` / `notify_url` base. |
| `NEXT_PUBLIC_ROOT_DOMAIN` | public | `proxy.ts` | Root domain for custom-domain detection. Storefront hosts that don't match this fall into the `/_custom/[domain]/*` rewrite. Defaults to `localhost:3000` if unset. |
| `NEXT_PUBLIC_SHORTLINK_DOMAIN` | public | `proxy.ts`, `src/lib/shared/shortlink.ts` | Dedicated short-link domain — currently **`linkln.me`**. proxy.ts step 0 matches **both the apex and `www.`** host: `/` rewrites to the branded landing page `app/link-home/page.tsx` (CTA → the app), and `/{code}` rewrites → `/api/s/[code]`. No scheme/trailing slash/path. Must point at the same Vercel deployment as the main app. `NEXT_PUBLIC_*` is build-time inlined → redeploy after changing. Unset → short-link routing disabled. |

## Cloudflare R2 (object storage)

File storage lives in Cloudflare R2 (S3-compatible). All variables are read by `src/lib/storage/r2.ts` and `src/lib/storage/buckets.ts`. The S3 endpoint is derived at runtime as `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` — never hardcode it.

| Var | Scope | Used in | Notes |
|---|---|---|---|
| `R2_ACCOUNT_ID` | server | `src/lib/storage/r2.ts` | Cloudflare account ID. Used to build the S3-compatible endpoint. |
| `R2_ACCESS_KEY_ID` | **secret** | `src/lib/storage/r2.ts` | R2 API token key ID. Server-only. |
| `R2_SECRET_ACCESS_KEY` | **secret** | `src/lib/storage/r2.ts` | R2 API token secret. Server-only. |
| `R2_BUCKET_KYC` | server | `src/lib/storage/buckets.ts` | R2 bucket name for KYC/private creator docs (`digione-kyc-private`). Private. |
| `R2_BUCKET_PRODUCTS` | server | `src/lib/storage/buckets.ts` | R2 bucket name for product deliverables (`digione-products`). Private. |
| `R2_BUCKET_MEDIA` | server | `src/lib/storage/buckets.ts` | R2 bucket name for creator public media — covers, avatars, banners (`digione-media`). Public via CDN. |
| `R2_BUCKET_PUBLIC` | server | `src/lib/storage/buckets.ts` | R2 bucket name for DigiOne platform assets (`digione-public-assets`). Public via CDN. |
| `NEXT_PUBLIC_R2_MEDIA_URL` | public | `src/lib/storage/r2.ts`, image components | CDN base URL for the media bucket (e.g. `https://media.digione.ai`). Used to build public image URLs. |
| `NEXT_PUBLIC_R2_BUCKET_PUBLIC_URL` | public | `src/lib/storage/r2.ts`, image components | CDN base URL for the public-asset bucket. Used to build platform asset URLs. |

**Logical → R2 bucket mapping** (used throughout the codebase as the logical name):

| Logical name | R2 bucket | Public? |
|---|---|---|
| `public-asset` | `digione-public-assets` | yes |
| `creator-public` | `digione-media` | yes |
| `creator-content` | `digione-products` | no |
| `creator-private` | `digione-kyc-private` | no |

## KYC

| Var | Scope | Used in | Notes |
|---|---|---|---|
| `KYC_ENCRYPTION_KEY` | **secret** | `src/lib/server/kyc-crypto.ts` (KYC PII encryption); `app/api/kyc/submit` (added in a later task) | base64-encoded 32 bytes (AES-256). Server-only. Rotating it requires re-encrypting existing `creator_kyc._enc` values. |

## Cashfree Payouts

Separate from the Cashfree PG (payment gateway) credentials above — Cashfree Payouts is a different product with its own API keys, base URLs, and webhook secret. All variables are server-only. They are read by `src/lib/server/cashfree-payouts.ts` and the admin payout routes.

| Var | Scope | Used in | Notes |
|---|---|---|---|
| `CASHFREE_PAYOUT_ENVIRONMENT` | server | `src/lib/server/cashfree-payouts.ts`, `/api/admin/payouts/[id]/approve` | `'PRODUCTION'` → production Cashfree Payouts base URL. Anything else → sandbox. Not a secret. |
| `CASHFREE_PAYOUT_API_VERSION` | server | `src/lib/server/cashfree-payouts.ts` | Pinned API version sent as `x-api-version` header (default `2024-01-01`). Not a secret. |
| `CASHFREE_PAYOUT_CLIENT_ID` | **secret** | `src/lib/server/cashfree-payouts.ts` | Cashfree Payouts merchant key ID. Different from `CASHFREE_CLIENT_ID` (PG). |
| `CASHFREE_PAYOUT_CLIENT_SECRET` | **secret** | `src/lib/server/cashfree-payouts.ts`, `/api/admin/payouts/[id]/approve` | Cashfree Payouts secret. Used for API auth. Different from `CASHFREE_CLIENT_SECRET` (PG). |
| `CASHFREE_PAYOUT_WEBHOOK_SECRET` | **secret** | `/api/webhook/cashfree-payout` | HMAC key for Cashfree Payouts webhook signature verification. Separate from the PG webhook secret. |
| `CRON_SECRET` | **secret** | `/api/admin/payouts/sync` | Bearer token for the cron-ready payout-sync route. Pass as `Authorization: Bearer <CRON_SECRET>` from your scheduler. Super-admin session is an alternative auth path. |

## DigiOne identity (invoices)

Read by `src/lib/server/invoices/digione-identity.ts`. All server-only — never expose behind `NEXT_PUBLIC_`. `DIGIONE_GSTIN` is required to issue a commission tax invoice; the route throws `500` if it is absent or blank.

| Var | Scope | Used in | Notes |
|---|---|---|---|
| `DIGIONE_LEGAL_NAME` | server | `src/lib/server/invoices/digione-identity.ts` | DigiOne's registered legal entity name, printed on all invoices. |
| `DIGIONE_GSTIN` | **secret** | `src/lib/server/invoices/digione-identity.ts` | DigiOne's GSTIN. Required for commission tax invoices (18% GST); throws if absent. |
| `DIGIONE_PAN` | server | `src/lib/server/invoices/digione-identity.ts` | DigiOne's PAN, printed on invoices as supplementary identity. |
| `DIGIONE_ADDRESS` | server | `src/lib/server/invoices/digione-identity.ts` | Registered address printed on invoice header. |
| `DIGIONE_STATE` | server | `src/lib/server/invoices/digione-identity.ts` | State name (e.g. `Karnataka`) — used for intra/inter-state GST determination. |
| `DIGIONE_STATE_CODE` | server | `src/lib/server/invoices/digione-identity.ts` | Two-digit GST state code (e.g. `29`) matching `DIGIONE_STATE`. |

## Email (Resend)

Transactional email — currently one email: the buyer purchase confirmation, sent from `fulfillOrder` step 4b. Read by `src/lib/server/email.ts`. Missing values are a safe no-op (console.warn, no send) — fulfillment never fails on email.

| Var | Scope | Used in | Notes |
|---|---|---|---|
| `RESEND_API_KEY` | **secret** | `src/lib/server/email.ts` | Resend API key. Server-only. |
| `EMAIL_FROM` | server | `src/lib/server/email.ts` | From header, e.g. `DigiOne <receipts@digione.ai>`. The domain must be verified in the Resend dashboard (SPF/DKIM DNS records). |

## Instagram Auto DM (`instaauto_`)

Instagram automation. All server-only. Read by `src/lib/server/instaauto/*` and the `/api/instaauto/*` + `/api/webhook/instagram` routes. When `INSTAGRAM_APP_ID` is unset, real OAuth connect is disabled but demo (simulated) accounts still work end-to-end.

| Var | Scope | Used in | Notes |
|---|---|---|---|
| `INSTAGRAM_APP_ID` | server | `instaauto/connect`, `instaauto/callback`, `src/lib/server/instaauto/graph.ts` | Meta app ID (OAuth). Unset → real connect returns `not_configured`. |
| `INSTAGRAM_APP_SECRET` | **secret** | `instaauto/callback`, `graph.ts`, `webhook/instagram` | OAuth token exchange **and** the webhook `X-Hub-Signature-256` HMAC key. |
| `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` | **secret** | `webhook/instagram` (GET) | Echoed against `hub.verify_token` during subscription verification. |
| `INSTAAUTO_TOKEN_ENCRYPTION_KEY` | **secret** | `src/lib/server/instaauto/token-crypto.ts` | base64-encoded 32 bytes (AES-256). Separate from `KYC_ENCRYPTION_KEY`. Rotating it invalidates stored IG tokens (creators must reconnect). |
| `CRON_SECRET` | **secret** | `instaauto/drain`, `instaauto/maintenance` | Reused (already defined for payout sync). Bearer token for the cron drainer + token-refresh sweep. |

## Known cleanup

- **`CASHFREE_ENVIRONMENT` vs `NEXT_PUBLIC_CASHFREE_ENV`** — two sources of truth. If they drift, sandbox-signed orders will fail to redirect to prod (or vice versa). Consider deriving the public one from the server one at build time.
- **No env-var validation at boot.** Missing values throw lazily on first request. A `lib/env.ts` with a Zod parse at startup would surface misconfig earlier.
