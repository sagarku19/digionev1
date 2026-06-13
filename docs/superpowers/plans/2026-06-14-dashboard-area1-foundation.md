---
noteId: "c61f51b0677211f1bffb2f446ab401a4"
tags: []

---

# Dashboard Area 1 — Cross-Cutting Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the shared currency-formatting module and remove gratuitous `any` over typed hook data across dashboard pages — the two cross-cutting, low-risk wins that unblock every later area.

**Architecture:** Two independent concerns, each its own commit(s): (A) create `src/lib/format.ts` and migrate the 11 duplicated `formatINR`/`formatINRCompact` definitions to it; (B) delete `: any`/`as any` annotations that sit over already-typed hook data, letting TypeScript inference do the work. No behavior, UI, route, or contract changes.

**Tech Stack:** Next.js 16 App Router, TypeScript 5 (strict), TanStack Query hooks (typed), `Intl.NumberFormat`.

**Validation bar (per the spec — NOT TDD; no test suite exists):** each task verifies with `npx tsc --noEmit` + `npm run lint` + the residual-color grep where relevant + careful diff self-review. There are intentionally **no** "write a failing test" steps.

**Scope guard — do NOT touch in this plan:** `app/api/**`, `src/hooks/**`, `types/database.types.ts`, `supabase/**`, storefront/marketing/auth surfaces, `globals.css`. **Deferred to Area 2 (not here):** the three `app/dashboard/sites/edit/*/[id]/page.tsx` editor pages and all of `src/components/dashboard/site-edit/**` (their `any` is mostly local editor state, tangled with the editor split). **Deliberately excluded:** unifying `timeAgo` — the four implementations differ in output (`just now` vs `Just now`, days-bucket vs date fallback, year vs no-year), so unifying would change behavior. Leave every local `timeAgo` as-is.

---

## File Structure

**Created:**
- `src/lib/format.ts` — single source of truth for INR currency formatting. Exports `formatINR(n: number): string` and `formatINRCompact(n: number): string`. Pure functions, no React, importable from any layer. (Boundary relaxed for this one file per the spec's resolved decision 1.)

**Modified (Concern A — formatter migration, 11 files):** each loses its local `formatINR`/`formatINRCompact`/`formatINRFull` definition and gains `import { formatINR } from '@/lib/format';` (plus `formatINRCompact` where used):
- `app/dashboard/page.tsx`
- `app/dashboard/analytics/page.tsx` (also deletes dead `formatINRFull`)
- `app/dashboard/customers/page.tsx`
- `app/dashboard/earnings/page.tsx` (uses both `formatINR` + `formatINRCompact`)
- `app/dashboard/orders/page.tsx`
- `app/dashboard/products/page.tsx`
- `app/dashboard/products/[productId]/page.tsx`
- `app/dashboard/products/upsells/[upsellId]/page.tsx`
- `app/dashboard/settings/subscription/page.tsx`
- `app/dashboard/marketing/community/page.tsx` *(only if it defines `formatINR`; it defines `timeAgo` — leave that. Verify in Task 2.)*
- `app/dashboard/notifications/page.tsx` *(defines `timeAgo` only — leave alone unless it also defines `formatINR`. Verify in Task 2.)*

**Modified (Concern B — `any` sweep, non-site-edit pages):** `products/page.tsx`, `products/[productId]/page.tsx`, `products/upsells/[upsellId]/page.tsx`, `orders/page.tsx`, `earnings/page.tsx`, `analytics/page.tsx`, `page.tsx`, `customers/page.tsx`, `marketing/leads/page.tsx`, `marketing/coupons/page.tsx`, `marketing/affiliates/page.tsx`, `marketing/community/page.tsx`, `notifications/page.tsx`, `settings/profile/page.tsx`, `settings/page.tsx`, `sites/page.tsx`, `sites/new/singlepage/page.tsx`, `media/page.tsx`.

---

## Task 1: Branch + shared format module

**Files:**
- Create: `src/lib/format.ts`

- [ ] **Step 1: Create the working branch**

```bash
git checkout -b refactor/dashboard-area1-foundation
```

- [ ] **Step 2: Write `src/lib/format.ts`**

The two functions reproduce the exact output of every existing copy: `formatINR` is `Intl.NumberFormat('en-IN', currency INR, maximumFractionDigits: 0)`; `formatINRCompact` is earnings' lakh/thousand shortener (the sole consumer) falling back to `formatINR`.

```typescript
// Shared INR currency formatting for the dashboard.
// formatINR reproduces the 11 duplicated local definitions; formatINRCompact
// is the lakh/thousand shortener previously local to the earnings page.
// NOTE: timeAgo is intentionally NOT here — the page-local variants differ in
// output and unifying them would change behavior.

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(amount: number): string {
  return inrFormatter.format(amount);
}

export function formatINRCompact(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return formatINR(amount);
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). The file has no consumers yet, so this only confirms the module itself type-checks.

- [ ] **Step 4: Commit**

```bash
git add src/lib/format.ts
git commit -m "refactor(dashboard): add shared src/lib/format.ts (formatINR, formatINRCompact)"
```

---

## Task 2: Migrate currency formatters to the shared module

Replace every local `formatINR` / `formatINRCompact` / `formatINRFull` definition with an import. Output is byte-identical, so this is a pure structural move.

**Files (exact):** `app/dashboard/{page,analytics/page,customers/page,earnings/page,orders/page,products/page,products/[productId]/page,products/upsells/[upsellId]/page,settings/subscription/page}.tsx` — and verify `marketing/community/page.tsx` + `notifications/page.tsx` (they may only define `timeAgo`).

- [ ] **Step 1: Confirm which files actually define a currency formatter (not just timeAgo)**

Run: `grep -rln "formatINR" app/dashboard`
Expected: the 9 certain files above. If `marketing/community` or `notifications` appear, they define `formatINR` too and are included; if not, skip them (their `timeAgo` stays untouched).

- [ ] **Step 2: In each file, delete the local definition and add the import**

For a file that uses only `formatINR` (e.g. `customers/page.tsx`, `orders/page.tsx`, `products/page.tsx`, `products/[productId]/page.tsx`, `products/upsells/[upsellId]/page.tsx`, `settings/subscription/page.tsx`, `page.tsx`):

```diff
- function formatINR(n: number) {
-   return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
- }
```
Add to the import block (after the other `@/lib` / `@/components` imports):
```typescript
import { formatINR } from '@/lib/format';
```
(`app/dashboard/page.tsx` uses the arrow form `const formatINR = (n: number) => …` — delete that const, same import.)

For `earnings/page.tsx` (uses both):
```diff
- function formatINR(amount: number) {
-   return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
- }
- function formatINRCompact(amount: number) {
-   if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
-   if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
-   return formatINR(amount);
- }
```
```typescript
import { formatINR, formatINRCompact } from '@/lib/format';
```

For `analytics/page.tsx` (has `formatINR` AND a dead identical `formatINRFull`):
```diff
- function formatINR(amount: number) {
-   ...
-   return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
- }
- function formatINRFull(amount: number) {
-   ...
-   return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
- }
```
```typescript
import { formatINR } from '@/lib/format';
```
Then replace every `formatINRFull(` call site with `formatINR(`:
Run: `grep -n "formatINRFull" app/dashboard/analytics/page.tsx` → change each remaining call to `formatINR`.

- [ ] **Step 3: Verify no stragglers and it compiles**

Run: `grep -rn "function formatINR\|const formatINR\|formatINRFull\|function formatINRCompact" app/dashboard`
Expected: **zero** matches (all definitions removed; `formatINRFull` gone).
Run: `npx tsc --noEmit`
Expected: PASS.
Run: `npm run lint`
Expected: clean (watch for now-unused `Intl`/leftover symbols — remove any flagged).

- [ ] **Step 4: Commit**

```bash
git add app/dashboard
git commit -m "refactor(dashboard): use shared formatINR; drop 11 local copies + dead formatINRFull"
```

---

## Task 3: `any` sweep — products + orders + earnings + overview

Remove `: any` / `as any` that sits over typed hook data. The hooks already return typed rows (`useProducts` → `ProductRow[]`, `useEarnings.payouts` → `creator_payouts` Row[], etc.), so deleting the annotation lets inference type the callback param. `as any[]` casts are deleted outright.

**Transformation rules:**
1. `arr.filter((x: any) => …)` → `arr.filter((x) => …)` (same for `.map`, `.reduce`, `.forEach`, `.find`).
2. `(payouts as any[])` → `payouts` (delete the cast).
3. `catch (err: any)` → `catch (err: unknown)`, and at the use site `err.message` → `err instanceof Error ? err.message : String(err)`.
4. **Leave** recharts callbacks (`CustomTooltip = (… : any)`, `formatter={(v: any) => …}`) — recharts ships no usable types; converting is out of scope. Add a single `// recharts: untyped callback` comment above each so it reads as deliberate.
5. If deleting an annotation makes `tsc` complain that the array is `any`/untyped (hook returns loose data), type the callback param explicitly with the matching Row type, e.g. `import type { Database } from '@/types/database.types';` then `(p: Database['public']['Tables']['products']['Row']) => …`. (Do not edit the hook.)

**Files:** `products/page.tsx` (10), `products/[productId]/page.tsx` (12), `products/upsells/[upsellId]/page.tsx` (6), `orders/page.tsx` (5), `earnings/page.tsx` (7), `analytics/page.tsx` (4), `page.tsx` (8), `customers/page.tsx`.

- [ ] **Step 1: Apply rules 1–5 to each file**

Concrete examples from real call sites:
```diff
# app/dashboard/page.tsx:78
- {orders.slice(0, 8).map((order: any) => {
+ {orders.slice(0, 8).map((order) => {
# app/dashboard/page.tsx:135-136
- const activeProductsCount = products.filter((p: any) => p.is_published).length;
- const topProducts = useMemo(() => products.filter((p: any) => p.is_published).slice(0, 5), [products]);
+ const activeProductsCount = products.filter((p) => p.is_published).length;
+ const topProducts = useMemo(() => products.filter((p) => p.is_published).slice(0, 5), [products]);
# app/dashboard/page.tsx:261 (recharts — keep, annotate)
+ // recharts: untyped callback
  formatter={(v: any) => [formatINR(Number(v)), 'Revenue']}
```
```diff
# app/dashboard/earnings/page.tsx:83,90-92
- for (const p of payouts as any[]) {
+ for (const p of payouts) {
- (payouts as any[])
-   .filter(p => p.status === 'completed' || p.status === 'paid')
-   .reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
+ payouts
+   .filter((p) => p.status === 'completed' || p.status === 'paid')
+   .reduce((sum, p) => sum + (p.amount || 0), 0),
# app/dashboard/earnings/page.tsx:69
- } catch (err: any) {
-   setErrorMsg(err.message);
+ } catch (err: unknown) {
+   setErrorMsg(err instanceof Error ? err.message : 'Failed to request payout');
```
```diff
# app/dashboard/products/page.tsx:86-89 etc.
- const publishedCount = products.filter((p: any) => p.is_published).length;
+ const publishedCount = products.filter((p) => p.is_published).length;
```

- [ ] **Step 2: Verify the four files are clean and compile**

Run: `grep -rnE ":\s*any\b|as any\b" app/dashboard/products app/dashboard/orders/page.tsx app/dashboard/earnings/page.tsx app/dashboard/analytics/page.tsx app/dashboard/page.tsx app/dashboard/customers/page.tsx`
Expected: only the deliberately-kept recharts lines remain (each preceded by the `// recharts:` comment).
Run: `npx tsc --noEmit`
Expected: PASS. (If a param now errors as implicit-`any`, apply rule 5 — type it from the Row type.)
Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard
git commit -m "refactor(dashboard): drop gratuitous any over typed hook data (products/orders/earnings/overview)"
```

---

## Task 4: `any` sweep — marketing + settings + misc pages

Same rules as Task 3, remaining non-site-edit pages.

**Files:** `marketing/leads/page.tsx` (10), `marketing/coupons/page.tsx` (7), `marketing/affiliates/page.tsx` (6), `marketing/community/page.tsx` (1), `notifications/page.tsx` (4), `settings/profile/page.tsx` (6), `settings/page.tsx` (1), `sites/page.tsx` (2), `sites/new/singlepage/page.tsx` (2), `media/page.tsx` (1).

- [ ] **Step 1: Apply transformation rules 1–5 to each file**

Concrete examples:
```diff
# app/dashboard/marketing/leads/page.tsx:60,67-70
- const filtered = leads.filter((l: any) => { … });
- const withEmail = leads.filter((l: any) => l.email).length;
+ const filtered = leads.filter((l) => { … });
+ const withEmail = leads.filter((l) => l.email).length;
# leads:13 — exported helper signature, type from the hook's element type:
- function exportCSV(leads: any[]) {
+ function exportCSV(leads: ReturnType<typeof useGuestLeads>['leads']) {
```
```diff
# app/dashboard/marketing/coupons/page.tsx:75,130
- const handleToggle = async (coupon: any) => { … }
+ const handleToggle = async (coupon: Database['public']['Tables']['coupons']['Row']) => { … }
- } catch (err: any) {
+ } catch (err: unknown) {
```
```diff
# app/dashboard/marketing/community/page.tsx:69 — profile is from a hook; prefer the typed field
- const avatarUrl = (profile as any)?.avatar_url;
+ const avatarUrl = profile?.avatar_url;   // if tsc errors, the field is absent on the type — keep a narrow cast w/ comment instead
```
> For `(profile as any)?.field` cases: first try removing the cast. If `tsc` says the property doesn't exist on the typed profile, the access was reaching for an untyped field — keep a **narrow** cast `(profile as { avatar_url?: string })?.avatar_url` with a one-line comment, rather than `as any`. Do not modify the hook.

- [ ] **Step 2: Verify clean + compiles**

Run: `grep -rnE ":\s*any\b|as any\b" app/dashboard/marketing app/dashboard/settings app/dashboard/notifications/page.tsx app/dashboard/sites/page.tsx app/dashboard/sites/new/singlepage/page.tsx app/dashboard/media/page.tsx`
Expected: zero matches except any deliberately-kept narrow casts (each with an explanatory comment) and recharts lines.
Run: `npx tsc --noEmit`
Expected: PASS.
Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard
git commit -m "refactor(dashboard): drop gratuitous any over typed hook data (marketing/settings/misc)"
```

---

## Task 5: Final Area-1 verification

- [ ] **Step 1: Full type + lint pass**

Run: `npx tsc --noEmit`
Expected: PASS.
Run: `npm run lint`
Expected: clean (zero new warnings vs. pre-Area-1 baseline).

- [ ] **Step 2: Confirm no behavior-bearing leftovers**

Run: `grep -rn "function formatINR\|const formatINR\|formatINRFull" app/dashboard`
Expected: zero.
Run: `grep -rnE ":\s*any\b|as any\b" app/dashboard --include=*.tsx | grep -v "sites/edit"`
Expected: only deliberately-kept recharts callbacks + narrow documented casts. (The `sites/edit/*` editor pages are excluded — they belong to Area 2.)

- [ ] **Step 3: Confirm `timeAgo` was left untouched (behavior guard)**

Run: `grep -rln "function timeAgo" app/dashboard`
Expected: still the original 4 files (`page.tsx`, `marketing/community`, `notifications`, `orders`) — none removed, none changed.

- [ ] **Step 4: Self-smoke (recommended, not gated)**

`npm run dev` → click through Overview, Products, Orders, Earnings, Analytics, a Marketing page, Notifications in **both** light and dark. Confirm currency renders identically and lists populate. (Not a formal gate per the chosen validation bar, but cheap insurance for the `any`/formatter changes.)

---

## Self-Review (completed during planning)

- **Spec coverage:** Area 1 of the spec = "shared format module + any-over-hook-data sweep." Both covered (Tasks 1–2 = format; Tasks 3–4 = any). The spec's third Area-1 item ("reconcile Card") was **removed during audit re-verification** — `SiteEditShell` is dead code and the `INPUT`/`FieldLabel` duplication is `site-edit`-local, both moved to Area 2. Spec updated to match.
- **Placeholder scan:** No "TBD"/"handle edge cases" steps. Every code step shows real diffs from real call sites; every verify step has an exact command + expected result.
- **Type consistency:** `formatINR(amount: number): string` / `formatINRCompact(amount: number): string` are referenced identically in Tasks 1–2. `Database['public']['Tables'][…]['Row']` is the consistent fallback typing in rules 5 / Tasks 3–4.
- **Behavior guard:** `timeAgo` unification explicitly excluded (Tasks scope + Step 5.3) because the four impls differ in output; recharts `any` explicitly retained. These are the two places where a naive "cleanup" would have changed behavior.

---

## Execution Handoff

After this plan is approved, the remaining areas (2–7, plus autodm annotate-only) each get their own focused plan at their gate.
