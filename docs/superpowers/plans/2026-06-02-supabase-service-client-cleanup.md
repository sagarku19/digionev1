---
noteId: "634dfb905e6c11f1b5532decc08dd652"
tags: []

---

# Supabase Service-Role Client Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace direct `@supabase/supabase-js` service-role client construction with `createServiceClient()` from `@/lib/supabase/service` across 10 `/api/*` route handlers, and update the four affected docs files. Zero behavioral changes.

**Architecture:** Hybrid construction strategy. Read-only routes (4) keep top-level construction. Write routes (6) construct inside the handler — webhook constructs *after* HMAC verification. Latent type errors surfaced by the auto-applied `<Database>` generic are fixed inline.

**Tech Stack:** TypeScript 5 strict, Next.js 16 App Router, `@supabase/supabase-js` v2, `@supabase/ssr` (untouched), Supabase service-role helper at `lib/supabase/service.ts`.

**Verification model:** This project has no automated test suite (per `.claude/rules/verification.md` Lane 2). Every task ends with `npx tsc --noEmit`, `npm run lint`, and a commit. Manual smoke happens at the end in Task 15.

**Spec:** `docs/superpowers/specs/2026-06-02-supabase-service-client-cleanup-design.md` (commit `6623528`).

---

## Task 0: Baseline check

**Files:** none (read-only).

- [ ] **Step 1: Confirm clean working tree**

Run:
```bash
git status
```
Expected: `nothing to commit, working tree clean`. If not, ask the user how to handle uncommitted changes before proceeding.

- [ ] **Step 2: Confirm baseline tsc is clean**

Run:
```bash
npx tsc --noEmit
```
Expected: no output, exit 0. If errors exist on `main` before any change, surface them — they are pre-existing and not caused by this refactor.

- [ ] **Step 3: Confirm baseline lint is clean**

Run:
```bash
npm run lint
```
Expected: `✔ No ESLint warnings or errors`. If pre-existing warnings exist, note them; do not introduce new ones.

- [ ] **Step 4: Confirm the helper signature**

Read `lib/supabase/service.ts` and confirm:
- Export name: `createServiceClient`
- Takes zero arguments
- Returns `SupabaseClient<Database>`
- Throws if `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_KEY` are missing

If anything diverges from the spec assumptions, stop and surface it.

- [ ] **Step 5: Capture the target file list**

Run:
```bash
git grep -l "from '@supabase/supabase-js'" -- 'app/api/'
```
Expected: exactly these 10 files:
- `app/api/checkout/create/route.ts`
- `app/api/checkout/payment-link/route.ts`
- `app/api/coupons/validate/route.ts`
- `app/api/discover/route.ts`
- `app/api/discover/[productId]/route.ts`
- `app/api/leads/route.ts`
- `app/api/payouts/request/route.ts`
- `app/api/products/search/route.ts`
- `app/api/upload/route.ts`
- `app/api/webhook/cashfree/route.ts`

If a file is missing or extra appears, stop and reconcile with the spec before continuing.

---

## Task 1: Cohort A — `app/api/discover/route.ts`

**Files:**
- Modify: `app/api/discover/route.ts`

- [ ] **Step 1: Replace lines 1-7**

Before:
```ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

After:
```ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

const supabase = createServiceClient();
```

Leave the rest of the file (lines 8 onward) untouched.

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: clean. If errors appear in `app/api/discover/route.ts`, the auto-applied `<Database>` generic has surfaced a latent type error. Fix it inline:
- If a column or table name in the query doesn't match `types/database.types.ts`, correct the query.
- Do NOT use `as any`, `as never`, or `as unknown as ...` escapes.
- If the fix is more than ~5 lines, stop and surface for separate handling.

- [ ] **Step 3: Lint**

Run:
```bash
npm run lint
```
Expected: no new warnings.

- [ ] **Step 4: Commit**

```bash
git add app/api/discover/route.ts
git commit -m "refactor(api/discover): use createServiceClient helper"
```

---

## Task 2: Cohort A — `app/api/discover/[productId]/route.ts`

**Files:**
- Modify: `app/api/discover/[productId]/route.ts`

- [ ] **Step 1: Replace lines 1-7**

Before:
```ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

After:
```ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

const supabase = createServiceClient();
```

Leave the rest of the file (lines 8 onward) untouched.

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: clean. Apply the same inline-fix policy as Task 1 if errors surface in this file. The query uses `.or('category.eq.X,creator_id.eq.Y')` and `profiles!fk_products_creator(...)` — both are typed against `Database`; verify these reference real columns/relationships in `types/database.types.ts`.

- [ ] **Step 3: Lint**

Run:
```bash
npm run lint
```
Expected: no new warnings.

- [ ] **Step 4: Commit**

```bash
git add app/api/discover/\[productId\]/route.ts
git commit -m "refactor(api/discover/[productId]): use createServiceClient helper"
```

---

## Task 3: Cohort A — `app/api/products/search/route.ts`

**Files:**
- Modify: `app/api/products/search/route.ts`

- [ ] **Step 1: Replace lines 1-7**

Before:
```ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

After:
```ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

const supabase = createServiceClient();
```

Leave the rest of the file (lines 8 onward) untouched.

- [ ] **Step 2: Type-check — KNOWN HAZARD**

Run:
```bash
npx tsc --noEmit
```

This file currently selects `'id, title, slug, price, cover_image, is_published'`. Inspect `types/database.types.ts` — the `products` table columns include `name`, `thumbnail_url` (not `title`, `cover_image`) elsewhere in the codebase. If `tsc` flags missing columns:

- Option A (preferred): correct the SELECT to match the schema (e.g. `'id, name, slug, price, thumbnail_url, is_published'`) AND update the `.ilike('title', ...)` to `.ilike('name', ...)` so behavior continues to do a name search. The `useProducts` consumer of this route should be checked for which field it expects — if it expects `title`, alias via `'name as title'` (Supabase supports this).
- Option B (if A breaks consumers): leave the SELECT as-is, cast the query via a structural type that matches the legacy shape. Document in the commit message that the column names are legacy and the schema has drifted.

If unclear which option applies, stop and ask the user.

- [ ] **Step 3: Lint**

Run:
```bash
npm run lint
```
Expected: no new warnings.

- [ ] **Step 4: Commit**

```bash
git add app/api/products/search/route.ts
git commit -m "refactor(api/products/search): use createServiceClient helper"
```

If type fixes were required in Step 2, append them to the same commit and note "fixes latent type drift surfaced by createServiceClient generic" in the message body.

---

## Task 4: Cohort A — `app/api/coupons/validate/route.ts`

**Files:**
- Modify: `app/api/coupons/validate/route.ts`

- [ ] **Step 1: Replace lines 1-7**

Before:
```ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

After:
```ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

const supabase = createServiceClient();
```

Leave the rest of the file (lines 8 onward) untouched.

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: clean. The `coupons` table SELECT uses `select('*')` — typed access to columns like `valid_until`, `valid_from`, `max_uses`, `current_uses`, `discount_type`, `discount_value` must match `types/database.types.ts`. Apply inline-fix policy if any column is missing.

- [ ] **Step 3: Lint**

Run:
```bash
npm run lint
```
Expected: no new warnings.

- [ ] **Step 4: Commit**

```bash
git add app/api/coupons/validate/route.ts
git commit -m "refactor(api/coupons/validate): use createServiceClient helper"
```

---

## Task 5: Cohort B — `app/api/checkout/create/route.ts`

**Files:**
- Modify: `app/api/checkout/create/route.ts`

- [ ] **Step 1: Update imports (lines 1-4)**

Before:
```ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import crypto from 'crypto';
```

After:
```ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import crypto from 'crypto';
```

Note: `Database` import is dropped because the helper already applies the generic. If the file uses `Database` elsewhere (it does not in the current file), restore the import.

- [ ] **Step 2: Remove top-level construction (lines 6-9)**

Delete:
```ts
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

Keep the `const CASHFREE_ENV = ...` block immediately below it.

- [ ] **Step 3: Add handler-scoped construction**

In the `POST` handler, insert `const supabase = createServiceClient();` as the **first line** inside the `try` block, before `const { items, buyerId, ... } = await req.json();`.

Result around line 15-17:
```ts
export async function POST(req: Request) {
  try {
    const supabase = createServiceClient();
    const { items, buyerId, couponCode, contact, upsellPageId } = await req.json();
```

Leave all subsequent business logic untouched, including the server-side price re-verification block (per `.claude/rules/security-model.md` revenue integrity rule 1).

- [ ] **Step 4: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: clean. The file already used `createClient<Database>(...)` so no new typing surface — only the construction site changed.

- [ ] **Step 5: Lint**

Run:
```bash
npm run lint
```
Expected: no new warnings.

- [ ] **Step 6: Commit**

```bash
git add app/api/checkout/create/route.ts
git commit -m "refactor(api/checkout/create): use createServiceClient inside handler"
```

---

## Task 6: Cohort B — `app/api/checkout/payment-link/route.ts`

**Files:**
- Modify: `app/api/checkout/payment-link/route.ts`

- [ ] **Step 1: Update imports (lines 5-7)**

Before:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
```

After:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
```

- [ ] **Step 2: Remove top-level construction (lines 9-12)**

Delete:
```ts
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // service role — bypasses RLS for payment_submissions write
);
```

Keep the `const CASHFREE_ENV = ...` block and the `interface CashfreeOrderBody` declaration below.

- [ ] **Step 3: Add handler-scoped construction**

In the `POST` handler, insert `const supabase = createServiceClient();` as the **first line** inside the `try` block, before `const body = await req.json() as ...`.

Result:
```ts
export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await req.json() as {
```

- [ ] **Step 4: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 5: Lint**

Run:
```bash
npm run lint
```
Expected: no new warnings.

- [ ] **Step 6: Commit**

```bash
git add app/api/checkout/payment-link/route.ts
git commit -m "refactor(api/checkout/payment-link): use createServiceClient inside handler"
```

---

## Task 7: Cohort B — `app/api/leads/route.ts`

**Files:**
- Modify: `app/api/leads/route.ts`

- [ ] **Step 1: Update imports (lines 4-6)**

Before:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
```

After:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
```

- [ ] **Step 2: Remove top-level construction (lines 8-11)**

Delete:
```ts
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // service role — bypasses RLS
);
```

- [ ] **Step 3: Add handler-scoped construction**

In the `POST` handler, insert `const supabase = createServiceClient();` as the **first line** inside the `try` block, before `const body = await req.json() as ...`.

Result:
```ts
export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await req.json() as {
```

- [ ] **Step 4: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 5: Lint**

Run:
```bash
npm run lint
```
Expected: no new warnings.

- [ ] **Step 6: Commit**

```bash
git add app/api/leads/route.ts
git commit -m "refactor(api/leads): use createServiceClient inside handler"
```

---

## Task 8: Cohort B — `app/api/upload/route.ts`

**Files:**
- Modify: `app/api/upload/route.ts`

⚠ **Special rule:** This file uses `process.env.NEXT_PUBLIC_SUPABASE_URL` at line 30 to build the public URL string. **Keep that read.** Only the construction-related env reads disappear with the swap.

- [ ] **Step 1: Update imports (lines 1-2)**

Before:
```ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
```

After:
```ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
```

- [ ] **Step 2: Remove top-level construction (lines 4-7)**

Delete:
```ts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

- [ ] **Step 3: Add handler-scoped construction**

In the `POST` handler, insert `const supabase = createServiceClient();` as the **first line** inside the `try` block, before `const { filename, bucket = 'products' } = await req.json();`.

Result:
```ts
export async function POST(req: Request) {
  try {
    const supabase = createServiceClient();
    const { filename, bucket = 'products' } = await req.json();
```

- [ ] **Step 4: Verify line 30 untouched**

Read the file. Confirm this line is intact:
```ts
publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${data.path}`
```

If you accidentally deleted or modified it, restore.

- [ ] **Step 5: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: clean. This file previously used untyped `createClient(...)`; with the helper, `bucket` is now typed against `StorageClient.from(name: string)` which accepts any string, so no error expected. The `data.signedUrl` and `data.path` access shape stays the same.

- [ ] **Step 6: Lint**

Run:
```bash
npm run lint
```
Expected: no new warnings.

- [ ] **Step 7: Commit**

```bash
git add app/api/upload/route.ts
git commit -m "refactor(api/upload): use createServiceClient inside handler"
```

---

## Task 9: Cohort B — `app/api/webhook/cashfree/route.ts`

**Files:**
- Modify: `app/api/webhook/cashfree/route.ts`

⚠ **Special rule:** HMAC verification must happen on the raw body **before** `createServiceClient()` is called. Spec §4.3 — *"No client allocation for requests we're about to 401."*

- [ ] **Step 1: Update imports (lines 1-3)**

Before:
```ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
```

After:
```ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import crypto from 'crypto';
```

- [ ] **Step 2: Remove top-level construction (lines 5-8)**

Delete:
```ts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

- [ ] **Step 3: Add handler-scoped construction AFTER signature check**

The construction line goes **between** the signature check (current line 29) and the `JSON.parse(rawBody)` call (current line 31). Insert as a new line:

Result around current lines 26-32:
```ts
    if (signature !== expectedSignature) {
      console.warn('[webhook/cashfree] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const payload = JSON.parse(rawBody);
    const gatewayOrderId = payload.data?.order?.order_id;
```

Do not move it earlier — calling the helper before the HMAC check defeats the "no client allocation for rejected requests" rule.

- [ ] **Step 4: Type-check — KNOWN HAZARD**

Run:
```bash
npx tsc --noEmit
```

This file previously used untyped `createClient(...)`. With the `<Database>` generic now applied, expect possible errors around:

- `(supabase.from('orders') as any).update(...)` — the `as any` was already there; verify the typed client still accepts the shape, otherwise the cast may now be load-bearing in a different way.
- `(order.metadata as any)?.creator_profile_id` — explicit cast, should still work.
- `(supabase as any).from('transaction_ledger').insert(...)` — explicit `as any` cast, should still work.
- `.insert({ recipient_creator_id: ..., title, message, type } as any)` on `notifications` — should still work.

Apply inline-fix policy if real type errors surface. The casts to `any` are tolerated — they pre-date this refactor and are out of scope to remove. Do NOT add new `as any` casts.

- [ ] **Step 5: Lint**

Run:
```bash
npm run lint
```
Expected: no new warnings.

- [ ] **Step 6: Commit**

```bash
git add app/api/webhook/cashfree/route.ts
git commit -m "refactor(api/webhook/cashfree): use createServiceClient after HMAC check"
```

---

## Task 10: Cohort B — `app/api/payouts/request/route.ts`

**Files:**
- Modify: `app/api/payouts/request/route.ts`

⚠ **Special rule:** This file constructs two clients — a cookie-bound `createClient` from `@/lib/supabase/server` (for `getUser()`) and the inline admin client. **Only** the inline admin client is replaced. Keep the cookie-bound client untouched.

- [ ] **Step 1: Update imports (lines 1-3)**

Before:
```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
```

After:
```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
```

- [ ] **Step 2: Replace inline admin construction (lines 20-24)**

Before:
```ts
    // Initialize Admin Client to bypass RLS for secure ledger writes
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
```

After:
```ts
    // Initialize Admin Client to bypass RLS for secure ledger writes
    const supabaseAdmin = createServiceClient();
```

The `|| process.env.SUPABASE_SERVICE_ROLE_KEY` legacy fallback is removed (per spec §4.5 and `.claude/rules/env-vars.md` → "Known cleanup").

- [ ] **Step 3: Verify cookie-bound client untouched**

Read the file. Confirm these lines are intact:
```ts
const supabase = await createClient(); // Uses cookies to verify the JWT
const { data: { user } } = await supabase.auth.getUser();
```

This is the auth path; do NOT merge it into the service client.

- [ ] **Step 4: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: clean. The file previously called untyped `createAdminClient(...)`. Now `supabaseAdmin` is `SupabaseClient<Database>`. Check that `.from('creator_kyc').select('status').eq('creator_id', user.id).single()` typechecks — `creator_id` should be a column on `creator_kyc`. Same for `creator_balances` and `creator_payouts`. Apply inline-fix policy if errors surface.

- [ ] **Step 5: Lint**

Run:
```bash
npm run lint
```
Expected: no new warnings.

- [ ] **Step 6: Commit**

```bash
git add app/api/payouts/request/route.ts
git commit -m "refactor(api/payouts/request): use createServiceClient and drop legacy env fallback"
```

---

## Task 11: Cross-cutting verification

**Files:** none (read-only).

- [ ] **Step 1: Confirm zero `@supabase/supabase-js` direct imports in `app/api/`**

Run:
```bash
git grep -l "from '@supabase/supabase-js'" -- 'app/api/'
```
Expected: no output (zero matches). If any file remains, complete its refactor before moving on.

- [ ] **Step 2: Confirm zero `SUPABASE_SERVICE_ROLE_KEY` references in code**

Run:
```bash
git grep -l "SUPABASE_SERVICE_ROLE_KEY" -- 'app/' 'lib/' 'src/'
```
Expected: no output. Docs still reference it — those are handled in Tasks 12-13.

- [ ] **Step 3: Confirm `NEXT_PUBLIC_SUPABASE_URL` still read where intentional**

Run:
```bash
git grep -n "NEXT_PUBLIC_SUPABASE_URL" -- 'app/api/'
```
Expected: exactly one match — `app/api/upload/route.ts:30` (the public URL string). Anywhere else, the env read should have been removed with the construction.

If extra matches appear, inspect each and remove if it was construction-related leftover.

---

## Task 12: Docs — `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Replace the Supabase section**

Before (lines 6-16):
```
# ── Supabase ─────────────────────────────────────────────────────────────
# Public values — safe to expose to the browser.
NEXT_PUBLIC_SUPABASE_URL=https://qcendfisvyjnwmefruba.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Service role — server-only. Bypasses RLS. Never expose to the browser.
# (Codebase reads SUPABASE_SERVICE_KEY everywhere except payouts/request,
#  which falls back to SUPABASE_SERVICE_ROLE_KEY. Set the same value to both
#  until the fallback is removed.)
SUPABASE_SERVICE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

After:
```
# ── Supabase ─────────────────────────────────────────────────────────────
# Public values — safe to expose to the browser.
NEXT_PUBLIC_SUPABASE_URL=https://qcendfisvyjnwmefruba.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Service role — server-only. Bypasses RLS. Never expose to the browser.
# Read by lib/supabase/service.ts and all /api/* routes via createServiceClient().
SUPABASE_SERVICE_KEY=
```

- [ ] **Step 2: Verify the rest of `.env.example` is unchanged**

Read the file. Lines 1-5 and 17 onward should be byte-identical to the previous version.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "docs(.env.example): drop SUPABASE_SERVICE_ROLE_KEY legacy alias"
```

---

## Task 13: Docs — `.claude/rules/env-vars.md`

**Files:**
- Modify: `.claude/rules/env-vars.md`

- [ ] **Step 1: Update the Supabase table (line 25)**

Delete this row entirely:
```
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** | `app/api/payouts/request/route.ts` only (as fallback for `SUPABASE_SERVICE_KEY`) | Legacy name. Set to the same value as `SUPABASE_SERVICE_KEY` until the fallback is removed. |
```

The row above it (`SUPABASE_SERVICE_KEY`) stays.

- [ ] **Step 2: Update the `SUPABASE_SERVICE_KEY` row's `Used in` column**

Before:
```
| `SUPABASE_SERVICE_KEY` | **secret** | `lib/supabase/service.ts`, all `/api/*` routes that write to `orders`, `creator_balances`, `transaction_ledger` | Service role. Bypasses RLS. Server-only. |
```

After:
```
| `SUPABASE_SERVICE_KEY` | **secret** | `lib/supabase/service.ts` — accessed by all `/api/*` routes via `createServiceClient()` | Service role. Bypasses RLS. Server-only. |
```

This reflects that no `/api/*` route reads it directly anymore.

- [ ] **Step 3: Remove the "Known cleanup" bullet for the legacy env (line 45)**

Delete this line entirely:
```
- **`SUPABASE_SERVICE_KEY` vs `SUPABASE_SERVICE_ROLE_KEY`** — pick one and remove the fallback in `app/api/payouts/request/route.ts:23`.
```

The two other "Known cleanup" bullets below it stay.

- [ ] **Step 4: Commit**

```bash
git add .claude/rules/env-vars.md
git commit -m "docs(rules/env-vars): retire SUPABASE_SERVICE_ROLE_KEY legacy alias"
```

---

## Task 14: Docs — `.claude/rules/api-routes.md` and `.claude/rules/security-model.md`

**Files:**
- Modify: `.claude/rules/api-routes.md`
- Modify: `.claude/rules/security-model.md`

- [ ] **Step 1: Update `.claude/rules/api-routes.md` line 300**

Before:
```
- Service-role writes must use `createServiceClient()` from `lib/supabase/service.ts`. Routes that still call `createClient(...)` from `@supabase/supabase-js` directly are pending cleanup — match the helper before adding new behaviour.
```

After:
```
- Service-role writes must use `createServiceClient()` from `lib/supabase/service.ts`. Never import `createClient` from `@supabase/supabase-js` directly in `/api/*` route handlers.
```

- [ ] **Step 2: Update `.claude/rules/security-model.md` line 29**

Before:
```
**Rule:** if a route imports `createClient` from `@supabase/supabase-js` directly, it should use `createServiceClient()` from `lib/supabase/service.ts` instead. Same effect, one source of truth for env handling.
```

After:
```
**Rule:** `/api/*` routes must use `createServiceClient()` from `lib/supabase/service.ts` for service-role access. Never import `createClient` from `@supabase/supabase-js` directly in route handlers. One source of truth for env handling, RLS-bypass behavior, and `Database` typing.
```

- [ ] **Step 3: Type-check (rules files are markdown but project may run mdx checks)**

Run:
```bash
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add .claude/rules/api-routes.md .claude/rules/security-model.md
git commit -m "docs(rules): mark service-client cleanup done in api-routes and security-model"
```

---

## Task 15: Final verification and deliverables report

**Files:** none (read-only — produces a report).

- [ ] **Step 1: Final type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: clean exit. If errors exist, the refactor is not done — go back and fix at the responsible file/task.

- [ ] **Step 2: Final lint**

Run:
```bash
npm run lint
```
Expected: clean.

- [ ] **Step 3: Final grep verification**

Run:
```bash
git grep -l "from '@supabase/supabase-js'" -- 'app/api/'
```
Expected: zero matches.

Run:
```bash
git grep -l "SUPABASE_SERVICE_ROLE_KEY" -- 'app/' 'lib/' 'src/'
```
Expected: zero matches.

Run:
```bash
git grep -n "SUPABASE_SERVICE_ROLE_KEY"
```
Expected: matches only in `docs/superpowers/specs/2026-06-02-supabase-service-client-cleanup-design.md`, `README.md`, `supabase/REBUILD.md`, `.learn/onboarding/digione_onboarding_guide.md`. Surface these in the deliverables as follow-up doc-drift items — they are NOT in scope for this refactor.

- [ ] **Step 4: Manual smoke checklist (dev server)**

Start the dev server:
```bash
npm run dev
```

Walk through each cohort end-to-end. Tick each box only when the flow completes without errors in the browser console or server logs.

- [ ] `/discover` loads with products — covers `discover/route.ts`.
- [ ] Click a product card → product detail page loads with related items — covers `discover/[productId]/route.ts`.
- [ ] Product search box returns matches — covers `products/search/route.ts`.
- [ ] Enter a coupon code on checkout → validation result returned (valid/invalid both fine) — covers `coupons/validate/route.ts`.
- [ ] Submit a lead form on any storefront site → 200 + entry visible in dashboard leads — covers `leads/route.ts`.
- [ ] Upload a product cover from the product editor → image renders — covers `upload/route.ts`.
- [ ] Sandbox checkout end-to-end (cart → Cashfree sandbox → `/payment/status` shows completed) — covers `checkout/create/route.ts` AND `webhook/cashfree/route.ts`.
- [ ] Payment-link site submit with custom amount → redirects to Cashfree sandbox → returns success — covers `checkout/payment-link/route.ts`.
- [ ] Request a payout from dashboard (KYC-verified test creator) → `creator_balances.pending_payout` increments and `creator_payouts` row created — covers `payouts/request/route.ts`.

If any flow regresses, the responsible task's commit can be reverted in isolation.

- [ ] **Step 5: Cashfree sandbox webhook test**

In Cashfree dashboard → Developers → Webhooks → Test event → fire `PAYMENT_SUCCESS_WEBHOOK` against the sandbox webhook URL.

Verify:
- Webhook handler returns 200.
- `orders.status` flips to `completed` for the test order.
- `creator_balances` is credited (+90% to `total_earnings`, +10% to `total_platform_fees`).
- A `transaction_ledger` row is inserted with a `record_hash`.
- A `notifications` row is inserted for the creator.

If any of these fail, the most likely culprit is the HMAC ordering in Task 9 Step 3 — re-verify the construction line is AFTER the signature check.

- [ ] **Step 6: Write deliverables report**

Compose a final report covering:

1. **Modified files** — list of the 10 routes + 4 docs files + any additional files touched by inline type fixes.
2. **Import diff summary** — should be exactly 10 swaps: `from '@supabase/supabase-js'` → `from '@/lib/supabase/service'`.
3. **Env-var reads removed** — count per file. Verify `NEXT_PUBLIC_SUPABASE_URL` is preserved in `app/api/upload/route.ts:30`.
4. **`tsc` result** — clean (or list of fixes applied).
5. **`npm run lint` result** — clean.
6. **Anything skipped** — should be empty; if a file was skipped surface the reason.
7. **Inline type fixes** — file:line + one-line rationale for each, if any.
8. **Follow-up doc drift** — list of `SUPABASE_SERVICE_ROLE_KEY` mentions in `README.md`, `supabase/REBUILD.md`, `.learn/onboarding/digione_onboarding_guide.md` (out of scope for this PR; recommend a separate follow-up).
9. **Smoke test result** — pass/fail per checkbox in Step 4 + Cashfree webhook test result from Step 5.

Save the report inline in the final assistant message (do not write to a file — the user reads it in chat).

---

## Spec coverage check

| Spec section | Task(s) |
|---|---|
| §3 Cohort A taxonomy | Tasks 1, 2, 3, 4 |
| §3 Cohort B taxonomy | Tasks 5, 6, 7, 8, 9, 10 |
| §4.1 Cohort A diff pattern | Tasks 1-4 |
| §4.2 checkout/create, checkout/payment-link, leads | Tasks 5, 6, 7 |
| §4.3 webhook/cashfree HMAC-before-construction | Task 9 |
| §4.4 upload — keep NEXT_PUBLIC_SUPABASE_URL | Task 8 Step 4, Task 11 Step 3 |
| §4.5 payouts/request — keep cookie client, drop fallback | Task 10 |
| §5 Type-tightening inline-fix policy | Tasks 1-10 Step 2 each |
| §6 Doc updates (4 files) | Tasks 12, 13, 14 |
| §7 Validation gauntlet | Tasks 11, 15 |
| §8 Risks (HMAC ordering, NEXT_PUBLIC_SUPABASE_URL preservation) | Tasks 8, 9 |
| §9 Deliverables report | Task 15 Step 6 |
| §10 Success criteria | Task 11 + Task 15 |
