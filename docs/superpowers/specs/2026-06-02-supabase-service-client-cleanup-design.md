---
noteId: "721a16a05e6b11f1b5532decc08dd652"
tags: []

---

# Supabase Service-Role Client Cleanup — Design

**Date:** 2026-06-02
**Agent role:** Backend
**Status:** Approved (brainstorming) — pending plan
**Tracking rules:** `.claude/rules/api-routes.md`, `.claude/rules/security-model.md`, `.claude/rules/env-vars.md`

## 1. Objective

Replace direct service-role Supabase client construction in `/api/*` route handlers with the shared `createServiceClient()` helper from `@/lib/supabase/service`. The cleanup is explicitly required by:

- `.claude/rules/api-routes.md` — *"Routes that still call `createClient(...)` from `@supabase/supabase-js` directly are pending cleanup — match the helper before adding new behaviour."*
- `.claude/rules/security-model.md` — *"if a route imports `createClient` from `@supabase/supabase-js` directly, it should use `createServiceClient()` from `lib/supabase/service.ts` instead."*

The end state: zero `from '@supabase/supabase-js'` imports inside `app/api/`. One source of truth for env handling, RLS-bypass behavior, and `Database` typing on service-role calls.

## 2. Non-goals

- No business logic changes.
- No auth flow changes.
- No query, mutation, or response payload changes.
- No RLS policy changes.
- No new packages.
- No refactor outside `app/api/` (except the docs updates in §6).
- No changes to `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/service.ts`, or `proxy.ts`.

## 3. File taxonomy

The 10 target files split into two cohorts based on construction site.

### Cohort A — Read-only routes, top-level construction (4 files)

`createServiceClient()` called once at module load. No DB writes; module-load throw on missing env is acceptable.

| File | Purpose |
|---|---|
| `app/api/discover/route.ts` | Marketplace listing |
| `app/api/discover/[productId]/route.ts` | Product detail + related |
| `app/api/products/search/route.ts` | Title search |
| `app/api/coupons/validate/route.ts` | Coupon lookup (no usage increment) |

### Cohort B — Write routes, handler-scoped construction (6 files)

`createServiceClient()` called as the first line inside the handler (after any pre-flight checks such as HMAC verification). Defers env validation to request time so a misconfigured deploy fails per-route rather than dead-locking the whole `/api/*` surface.

| File | Writes |
|---|---|
| `app/api/checkout/create/route.ts` | `orders`, `order_items` |
| `app/api/checkout/payment-link/route.ts` | `payment_requests`, `payment_submissions` |
| `app/api/webhook/cashfree/route.ts` | `orders`, `creator_balances`, `transaction_ledger`, `notifications` |
| `app/api/leads/route.ts` | `lead_form` |
| `app/api/upload/route.ts` | Supabase Storage (signed URL) |
| `app/api/payouts/request/route.ts` | `creator_balances`, `creator_payouts` |

### Out of scope (verified, already correct)

| File | Why |
|---|---|
| `app/api/auth/callback/route.ts` | Uses cookie-bound `createClient` from `@/lib/supabase/server`. Correct. |
| `app/api/sites/create/route.ts` | Already uses `createServiceClient()` + cookie client side-by-side. |
| `app/api/sites/check-slug/route.ts` | Already uses `createServiceClient()`. |
| `app/api/linkinbio/track/route.ts` | Already uses `createServiceClient()`. |
| `proxy.ts` | Uses `createServerClient` from `@supabase/ssr`. Intentionally different. |

## 4. Change matrix per file

### 4.1 Cohort A pattern (4 files, identical diff)

**Before:**
```ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

**After:**
```ts
import { createServiceClient } from '@/lib/supabase/service';

const supabase = createServiceClient();
```

The `<Database>` generic is now applied automatically by the helper. Latent type errors in these files (currently untyped) are fixed inline per the policy in §5.

### 4.2 Cohort B — `checkout/create`, `checkout/payment-link`, `leads`

Currently typed (`createClient<Database>(...)`), constructed at module top-level.

- Swap the import.
- Move `const supabase = createServiceClient();` to the first line of the handler.
- Delete top-of-file env-var reads that were only used for construction.
- Local variable name remains `supabase`.

Server-side price re-verification (per `.claude/rules/security-model.md` → Revenue integrity rule 1) is preserved as-is in both checkout routes.

### 4.3 Cohort B — `webhook/cashfree`

Same shape as 4.2 with a mandatory ordering constraint:

1. `const rawBody = await req.text();`
2. HMAC-SHA256 verification against `CASHFREE_CLIENT_SECRET`, base64-compare with `x-webhook-signature` header.
3. **Only if signature passes:** `const supabase = createServiceClient();`
4. Proceed with existing idempotency check + business logic.

No client allocation for requests we're about to 401. This matches the current behavior shape and the rule in `.claude/rules/cashfree-reference.md` → *"Compute the HMAC before `JSON.parse`."*

### 4.4 Cohort B — `upload`

Same as 4.2 with one exception: **keep** the read of `process.env.NEXT_PUBLIC_SUPABASE_URL`. It is still used at `app/api/upload/route.ts:30` to build the public URL string:

```ts
publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${data.path}`
```

Only the construction-related env reads are removed.

### 4.5 Cohort B — `payouts/request`

Smallest diff. The file already constructs the service-role client inside the handler.

- Replace `import { createClient as createAdminClient } from '@supabase/supabase-js'` with `import { createServiceClient } from '@/lib/supabase/service'`.
- Replace the inline construction at lines 21–24 with `const supabaseAdmin = createServiceClient();` (keep the existing variable name `supabaseAdmin`).
- **Remove** the `|| process.env.SUPABASE_SERVICE_ROLE_KEY` legacy fallback — it disappears with the helper swap.
- Keep `await createClient()` from `@/lib/supabase/server` untouched — it is required for `getUser()`. Two clients side-by-side, by design.

## 5. Type-tightening policy

Six files currently use untyped `createClient(...)` (no `<Database>` generic): `discover/route.ts`, `discover/[productId]/route.ts`, `coupons/validate`, `upload`, `products/search`, `webhook/cashfree`. Switching to `createServiceClient()` auto-applies the generic.

**Policy:** if `tsc --noEmit` flags errors after the swap, fix the underlying query inline as part of this PR. Acceptable scope creep — the cleanup gets us strict typing AND fixes the bugs it uncovers. No `as any`, no `as never`, no `as unknown as ...` escapes. If a fix is non-trivial (more than a few lines), block the PR and surface it in the deliverables for separate handling.

## 6. Documentation updates

Same PR, code-and-docs coherent.

| File | Change |
|---|---|
| `.env.example` | Remove `SUPABASE_SERVICE_ROLE_KEY` entry if present. Verify no code outside `app/api/payouts/request/route.ts` reads it before deleting. Keep `SUPABASE_SERVICE_KEY`. |
| `.claude/rules/env-vars.md` | Delete the "Known cleanup" bullet about `SUPABASE_SERVICE_KEY` vs `SUPABASE_SERVICE_ROLE_KEY`. Delete the row for `SUPABASE_SERVICE_ROLE_KEY` from the Supabase table. |
| `.claude/rules/api-routes.md` | Remove the parenthetical *"Routes that still call `createClient(...)` from `@supabase/supabase-js` directly are pending cleanup — match the helper before adding new behaviour."* |
| `.claude/rules/security-model.md` | Update the line *"if a route imports `createClient` from `@supabase/supabase-js` directly, it should use `createServiceClient()` from `lib/supabase/service.ts` instead"* — either delete or rephrase to reflect the cleanup is done and the rule is now load-bearing for new routes only. |

## 7. Validation gauntlet

In order. PR does not ship if any step fails.

1. `npx tsc --noEmit` — clean.
2. `npm run lint` — clean.
3. Grep verification:
   - `from '@supabase/supabase-js'` in `app/api/` → zero matches.
   - `SUPABASE_SERVICE_ROLE_KEY` across repo → zero matches (or only `.env.example` if kept).
4. Manual smoke (`npm run dev`):
   - `/discover` loads; product detail loads; product search returns results; coupon validate via checkout — covers Cohort A end-to-end.
   - Lead form submit on a storefront site — covers `leads`.
   - File upload from product editor — covers `upload`.
   - Sandbox checkout end-to-end (cart → Cashfree sandbox → return to `/payment/status`) — covers `checkout/create`, `webhook/cashfree`.
   - Payment-link site submit with custom amount — covers `checkout/payment-link`.
   - Payout request from dashboard (KYC-verified test creator) — covers `payouts/request`.
5. Cashfree webhook: trigger a sandbox test event from the Cashfree dashboard, confirm 200 + balance credit + ledger row + notification.

## 8. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Latent type errors surface in the 6 untyped files | Medium | Inline-fix policy (§5). |
| Cohort A module-load throw on misconfigured deploy | Low | Acceptable — fails fast at deploy, not at first user request. |
| Webhook handler regression breaks payment confirmation | Low / high-impact | HMAC verification stays before client construction. Cashfree sandbox test fired before merge. |
| Per-request `createServiceClient()` allocation in Cohort B | Negligible | Thin object construction; no socket setup. |
| Hidden references to `SUPABASE_SERVICE_ROLE_KEY` outside `app/api/` | Low | Repo-wide grep before deleting from `.env.example`. |
| `upload` route loses `NEXT_PUBLIC_SUPABASE_URL` read at line 30 | Low | Explicit callout in §4.4. |

## 9. Deliverables

Final report on the PR must include:

1. Modified files list (10 routes + 2–4 docs + any inline type fixes).
2. Import diff summary (count of `@supabase/supabase-js` → `@/lib/supabase/service` swaps).
3. Env-var reads removed per file.
4. `npx tsc --noEmit` result.
5. `npm run lint` result.
6. Anything skipped, with reason.
7. Inline type fixes applied (file:line + one-line rationale each).
8. Follow-up risks (e.g., manual smoke not run, webhook test pending).

## 10. Success criteria

- Zero `from '@supabase/supabase-js'` imports in `app/api/`.
- Zero behavioral changes in any flow (auth, checkout, webhook, payout, upload, discover, search, coupons, leads).
- `tsc` and `lint` pass clean.
- Docs (`.env.example`, `.claude/rules/env-vars.md`, `.claude/rules/api-routes.md`, `.claude/rules/security-model.md`) updated to reflect the cleanup is done.
- Cashfree sandbox webhook still credits balance + writes ledger row.
