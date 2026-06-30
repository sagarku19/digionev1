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
| `CASHFREE_ENVIRONMENT` | server | `/api/checkout/create`, `/api/checkout/payment-link`, `app/payment/status/page.tsx` | `'PRODUCTION'` → api.cashfree.com. Anything else → sandbox.cashfree.com. |
| `CASHFREE_CLIENT_ID` | **secret** | `/api/checkout/create`, `/api/checkout/payment-link`, `app/payment/status/page.tsx` | Cashfree merchant ID. |
| `CASHFREE_CLIENT_SECRET` | **secret** | `/api/checkout/create`, `/api/checkout/payment-link`, `app/payment/status/page.tsx`, `/api/webhook/cashfree` | Cashfree secret. Also used as the HMAC key for webhook signature verification. |
| `NEXT_PUBLIC_CASHFREE_ENV` | public | `app/(buyer)/checkout/page.tsx` | UI mirror — client uses this to pick sandbox/prod Cashfree JS SDK. Must match `CASHFREE_ENVIRONMENT`. |

## App

| Var | Scope | Used in | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | public | `app/layout.tsx` (OG metadata), `/api/checkout/create`, `/api/checkout/payment-link` | Absolute URL of this app. No trailing slash. Used as Cashfree `return_url` / `notify_url` base. |
| `NEXT_PUBLIC_ROOT_DOMAIN` | public | `proxy.ts` | Root domain for custom-domain detection. Storefront hosts that don't match this fall into the `/_custom/[domain]/*` rewrite. Defaults to `localhost:3000` if unset. |

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

## Known cleanup

- **`CASHFREE_ENVIRONMENT` vs `NEXT_PUBLIC_CASHFREE_ENV`** — two sources of truth. If they drift, sandbox-signed orders will fail to redirect to prod (or vice versa). Consider deriving the public one from the server one at build time.
- **No env-var validation at boot.** Missing values throw lazily on first request. A `lib/env.ts` with a Zod parse at startup would surface misconfig earlier.
