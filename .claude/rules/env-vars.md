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
| `SUPABASE_SERVICE_KEY` | **secret** | `lib/supabase/service.ts`, all `/api/*` routes that write to `orders`, `creator_balances`, `transaction_ledger` | Service role. Bypasses RLS. Server-only. |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** | `app/api/payouts/request/route.ts` only (as fallback for `SUPABASE_SERVICE_KEY`) | Legacy name. Set to the same value as `SUPABASE_SERVICE_KEY` until the fallback is removed. |

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

## Known cleanup

- **`SUPABASE_SERVICE_KEY` vs `SUPABASE_SERVICE_ROLE_KEY`** — pick one and remove the fallback in `app/api/payouts/request/route.ts:23`.
- **`CASHFREE_ENVIRONMENT` vs `NEXT_PUBLIC_CASHFREE_ENV`** — two sources of truth. If they drift, sandbox-signed orders will fail to redirect to prod (or vice versa). Consider deriving the public one from the server one at build time.
- **No env-var validation at boot.** Missing values throw lazily on first request. A `lib/env.ts` with a Zod parse at startup would surface misconfig earlier.
