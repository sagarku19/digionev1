---
noteId: "44d1919075c811f193a7f790bf9449ed"
tags: []

---

# Phase 3 — Creator Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `getPlatformFeeRate` read the creator's active subscription (tiering the whole money path to Plus 7% / Pro 5%), ship a real plan picker, and add a terminal script to activate a creator onto a plan — all credential-independent.

**Architecture:** A pure `resolveFeeRate` + a service-client `getPlatformFeeRate` read the active `subscriptions` row (snapshotted fee, fail-safe to Free 0.10). A shared `subscription.ts` lib (`subscriptionRowFromPlan` pure + `activate`/`cancel`) powers a terminal `subscription-admin.ts` (manual activation, mirroring `kyc-admin`). A `useSubscription` hook + `hasFeature` helper power the plan picker. No real billing this phase.

**Tech Stack:** Next.js 16, Supabase (service-role + RLS), `npx tsx` for the script, Vitest, TanStack Query. No migration / no type-regen (RLS + index already exist; no schema change).

**Spec:** `docs/superpowers/specs/2026-07-02-phase3-creator-subscriptions-design.md`
**Conventions:** commit to `main`. Project id `qcendfisvyjnwmefruba`. Service client at `lib/supabase/service.ts` (root `lib/`, imported `@/lib/supabase/service`; scripts use relative `../lib/supabase/service`).

---

## Grounded facts (verified live/code 2026-07-02)

- `subscription_plans` (3 active rows): `free` (fee 10%, ₹0), `plus` (7%, ₹500/mo, ₹5500/yr), `pro` (5%, ₹1000/mo, ₹10000/yr). Cols: `id, plan_type(enum free|plus|pro), plan_name, platform_fee_percent(numeric), monthly_price, yearly_price, description, features(jsonb = string[] of keys, e.g. ["full_analytics","unlimited_products","priority_support","custom_domain","api_access","advanced_marketing"]), is_active`.
- `subscriptions` (0 rows): `id, creator_id, subscription_plan_id, status, billing_cycle, current_price, current_platform_fee_percent, start_date, end_date, renewal_date, auto_renew, metadata, timestamps`.
- **RLS already set:** `subscriptions_select_own` (SELECT), `subscription_plans_select_public` (SELECT), both RLS-on; `subscriptions` has a `creator_id` index. Writes are service-role only (no client INSERT/UPDATE policy). **No migration needed.**
- `src/lib/server/platform-fee.ts` today: `const DEFAULT_PLATFORM_FEE_RATE = 0.10; export async function getPlatformFeeRate(creatorId: string | null): Promise<number> { void creatorId; return DEFAULT_PLATFORM_FEE_RATE; }`. Called by `src/lib/server/fulfillment.ts` (both fulfill paths) with the creator's `profiles.id`.
- `createServiceClient()` from `@/lib/supabase/service`. `getCreatorProfileId()` from `@/lib/getCreatorProfileId` (client). Numeric columns may arrive as `number` or `string` from PostgREST → coerce with `Number()`.

---

## File structure

| File | Responsibility | Status |
|---|---|---|
| `src/lib/server/platform-fee.ts` (+`.test.ts`) | `resolveFeeRate` pure + `getPlatformFeeRate` reads active sub | rewrite |
| `src/lib/server/subscription.ts` (+`.test.ts`) | `subscriptionRowFromPlan` pure + `activateSubscription`/`cancelSubscription` | create |
| `scripts/subscription-admin.ts` | terminal `view`/`activate`/`cancel` | create |
| `src/hooks/creator/useSubscription.ts` | `useSubscription` + `useSubscriptionPlans` + `hasFeature` | create |
| `app/dashboard/settings/subscription/page.tsx` | real plan picker | rewrite |
| `.claude/rules/supabase-reference.md`, `docs/reference/dashboard-map.md`, blueprint | docs | modify |

---

## Task 1: `platform-fee.ts` — fee reads the active subscription (TDD)

**Files:** Rewrite `src/lib/server/platform-fee.ts`, Test `src/lib/server/platform-fee.test.ts`

- [ ] **Step 1: Write the failing test (pure `resolveFeeRate`)**

```ts
// src/lib/server/platform-fee.test.ts
import { describe, it, expect } from 'vitest';
import { resolveFeeRate } from './platform-fee';

describe('resolveFeeRate', () => {
  it('converts a plan percent to a rate', () => {
    expect(resolveFeeRate({ current_platform_fee_percent: 7 })).toBeCloseTo(0.07);
    expect(resolveFeeRate({ current_platform_fee_percent: 5 })).toBeCloseTo(0.05);
    expect(resolveFeeRate({ current_platform_fee_percent: 10 })).toBeCloseTo(0.10);
  });
  it('accepts a numeric string (PostgREST numeric)', () => {
    expect(resolveFeeRate({ current_platform_fee_percent: '7.0' as unknown as number })).toBeCloseTo(0.07);
  });
  it('falls back to Free 0.10 for null/invalid', () => {
    expect(resolveFeeRate(null)).toBe(0.10);
    expect(resolveFeeRate({ current_platform_fee_percent: null })).toBe(0.10);
    expect(resolveFeeRate({ current_platform_fee_percent: NaN })).toBe(0.10);
  });
});
```

- [ ] **Step 2: Run it, verify FAIL**

Run: `npm test -- src/lib/server/platform-fee.test.ts`
Expected: FAIL (`resolveFeeRate` not exported).

- [ ] **Step 3: Rewrite the file**

```ts
// src/lib/server/platform-fee.ts
// Platform fee policy. The rate is the creator's active-subscription platform fee (snapshotted on the
// sub, so a later plan-price change never retroactively alters an active subscriber). Fails SAFE to the
// Free tier (0.10 = the higher platform fee) on no-sub / expired / error — never under-charges. Server-only.
import { createServiceClient } from '@/lib/supabase/service';

const DEFAULT_PLATFORM_FEE_RATE = 0.10;

export function resolveFeeRate(sub: { current_platform_fee_percent: number | string | null } | null | undefined): number {
  const pct = Number(sub?.current_platform_fee_percent);
  if (Number.isFinite(pct) && pct >= 0) return pct / 100;
  return DEFAULT_PLATFORM_FEE_RATE;
}

export async function getPlatformFeeRate(creatorId: string | null): Promise<number> {
  if (!creatorId) return DEFAULT_PLATFORM_FEE_RATE;
  try {
    const db = createServiceClient();
    const { data } = await db
      .from('subscriptions')
      .select('current_platform_fee_percent, renewal_date')
      .eq('creator_id', creatorId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);
    const sub = (data ?? [])[0];
    if (!sub) return DEFAULT_PLATFORM_FEE_RATE;
    if (sub.renewal_date && new Date(sub.renewal_date).getTime() < Date.now()) return DEFAULT_PLATFORM_FEE_RATE;
    return resolveFeeRate(sub);
  } catch {
    return DEFAULT_PLATFORM_FEE_RATE; // fail safe to the higher (Free) fee
  }
}
```

- [ ] **Step 4: Run it, verify PASS + typecheck**

Run: `npm test -- src/lib/server/platform-fee.test.ts` → PASS (3). Run: `npx tsc --noEmit` → clean (fulfillment.ts already calls `getPlatformFeeRate(creatorId)` — signature unchanged).

- [ ] **Step 5: Commit**
```bash
git add src/lib/server/platform-fee.ts src/lib/server/platform-fee.test.ts
git commit -m "feat(subscriptions): getPlatformFeeRate reads the active subscription tier (fail-safe to Free)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `subscription.ts` — activation lib (TDD)

**Files:** Create `src/lib/server/subscription.ts`, Test `src/lib/server/subscription.test.ts`

- [ ] **Step 1: Write the failing test (pure `subscriptionRowFromPlan`)**

```ts
// src/lib/server/subscription.test.ts
import { describe, it, expect } from 'vitest';
import { subscriptionRowFromPlan } from './subscription';

const plan = { id: 'plan-pro', plan_type: 'pro', platform_fee_percent: 5, monthly_price: 1000, yearly_price: 10000 };
const NOW = new Date('2026-07-02T00:00:00.000Z');

describe('subscriptionRowFromPlan', () => {
  it('snapshots fee + monthly price and renews in 1 month', () => {
    const r = subscriptionRowFromPlan('creator-1', plan, 'monthly', NOW);
    expect(r.creator_id).toBe('creator-1');
    expect(r.subscription_plan_id).toBe('plan-pro');
    expect(r.status).toBe('active');
    expect(r.billing_cycle).toBe('monthly');
    expect(r.current_price).toBe(1000);
    expect(r.current_platform_fee_percent).toBe(5);
    expect(r.auto_renew).toBe(false);
    expect(r.renewal_date).toBe('2026-08-02T00:00:00.000Z');
  });
  it('uses yearly price and renews in 1 year', () => {
    const r = subscriptionRowFromPlan('c', plan, 'yearly', NOW);
    expect(r.current_price).toBe(10000);
    expect(r.renewal_date).toBe('2027-07-02T00:00:00.000Z');
  });
});
```

- [ ] **Step 2: Run it, verify FAIL**

Run: `npm test -- src/lib/server/subscription.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/lib/server/subscription.ts
// Server-only subscription activation. subscriptionRowFromPlan is pure + tested; activate/cancel apply it
// via the service client. One active sub per creator (activation supersedes any prior active row). This is
// the seam a future billing webhook reuses to activate a paid sub after a confirmed charge.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type Db = SupabaseClient<Database>;
export type PlanType = 'free' | 'plus' | 'pro';
export type Cycle = 'monthly' | 'yearly';

export interface PlanRow {
  id: string;
  plan_type: string;
  platform_fee_percent: number | string;
  monthly_price: number | string;
  yearly_price: number | string;
}

export function subscriptionRowFromPlan(creatorId: string, plan: PlanRow, cycle: Cycle, now: Date) {
  const renewal = new Date(now);
  if (cycle === 'yearly') renewal.setFullYear(renewal.getFullYear() + 1);
  else renewal.setMonth(renewal.getMonth() + 1);
  return {
    creator_id: creatorId,
    subscription_plan_id: plan.id,
    status: 'active',
    billing_cycle: cycle,
    current_price: Number(cycle === 'yearly' ? plan.yearly_price : plan.monthly_price),
    current_platform_fee_percent: Number(plan.platform_fee_percent),
    start_date: now.toISOString(),
    renewal_date: renewal.toISOString(),
    auto_renew: false,
  };
}

export async function activateSubscription(db: Db, creatorId: string, planType: PlanType, cycle: Cycle): Promise<boolean> {
  const { data: plan } = await db.from('subscription_plans')
    .select('id, plan_type, platform_fee_percent, monthly_price, yearly_price')
    .eq('plan_type', planType).eq('is_active', true).maybeSingle();
  if (!plan) return false;
  // one active sub per creator — supersede any current active row
  await db.from('subscriptions').update({ status: 'cancelled' }).eq('creator_id', creatorId).eq('status', 'active');
  const { error } = await db.from('subscriptions').insert(subscriptionRowFromPlan(creatorId, plan as PlanRow, cycle, new Date()));
  if (error) throw error;
  return true;
}

export async function cancelSubscription(db: Db, creatorId: string): Promise<boolean> {
  const { data, error } = await db.from('subscriptions')
    .update({ status: 'cancelled' }).eq('creator_id', creatorId).eq('status', 'active').select('id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
```

- [ ] **Step 4: Run it, verify PASS + typecheck**

Run: `npm test -- src/lib/server/subscription.test.ts` → PASS (2). Run: `npx tsc --noEmit` → clean. If the `insert(...)` object trips tsc on a column type, cast the return of `subscriptionRowFromPlan` to `Database['public']['Tables']['subscriptions']['Insert']` at the insert call (its keys are all real `subscriptions` columns) — do NOT use `any`; report if you did.

- [ ] **Step 5: Commit**
```bash
git add src/lib/server/subscription.ts src/lib/server/subscription.test.ts
git commit -m "feat(subscriptions): activate/cancel lib + pure subscriptionRowFromPlan (TDD)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `scripts/subscription-admin.ts` — terminal view/activate/cancel

**Files:** Create `scripts/subscription-admin.ts`

- [ ] **Step 1: Write the script**

```ts
// scripts/subscription-admin.ts
// Terminal admin for creator subscriptions (interim until billing + the admin app exist). Service-role.
//   npx tsx --env-file=.env.local scripts/subscription-admin.ts view    <creatorId>
//   npx tsx --env-file=.env.local scripts/subscription-admin.ts activate <creatorId> <free|plus|pro> [--cycle monthly|yearly]
//   npx tsx --env-file=.env.local scripts/subscription-admin.ts cancel  <creatorId>
import { createServiceClient } from '../lib/supabase/service';
import { activateSubscription, cancelSubscription, type PlanType, type Cycle } from '../src/lib/server/subscription';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const [cmd, creatorId, planArg] = process.argv.slice(2);
  if (!cmd || !creatorId) throw new Error('usage: subscription-admin <view|activate|cancel> <creatorId> [plan] [--cycle monthly|yearly]');
  const db = createServiceClient();

  if (cmd === 'view') {
    const { data } = await db.from('subscriptions')
      .select('status, billing_cycle, current_price, current_platform_fee_percent, renewal_date, subscription_plans(plan_type, plan_name)')
      .eq('creator_id', creatorId).eq('status', 'active').order('created_at', { ascending: false }).limit(1);
    console.log(data && data[0] ? { ...data[0] } : '(no active subscription — Free 10%)');
  } else if (cmd === 'activate') {
    if (!planArg || !['free', 'plus', 'pro'].includes(planArg)) throw new Error('plan must be free|plus|pro');
    const cycleArg = arg('--cycle');
    const cycle: Cycle = cycleArg === 'yearly' ? 'yearly' : 'monthly';
    const ok = await activateSubscription(db, creatorId, planArg as PlanType, cycle);
    console.log(ok ? `activated ${creatorId} -> ${planArg} (${cycle})` : `plan ${planArg} not found/active`);
  } else if (cmd === 'cancel') {
    const ok = await cancelSubscription(db, creatorId);
    console.log(ok ? `cancelled active sub for ${creatorId} (now Free 10%)` : `no active sub for ${creatorId}`);
  } else {
    throw new Error(`unknown command: ${cmd}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('subscription-admin FAILED:', e.message); process.exit(1); });
```

- [ ] **Step 2: Typecheck + commit (do NOT run it live yet — that's Task 6)**

Run: `npx tsc --noEmit` → clean. If tsc flags the `../lib/supabase/service` path, confirm the service client's real location (root `lib/supabase/service.ts`, per `scripts/kyc-admin.ts`) and match it.
```bash
git add scripts/subscription-admin.ts
git commit -m "feat(subscriptions): terminal subscription-admin — view/activate/cancel

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `useSubscription` hook + `hasFeature`

**Files:** Create `src/hooks/creator/useSubscription.ts`

- [ ] **Step 1: Write the hook**

```ts
// src/hooks/creator/useSubscription.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

// features is a jsonb string[] of feature keys on each plan.
export function hasFeature(features: unknown, key: string): boolean {
  return Array.isArray(features) && (features as unknown[]).includes(key);
}

export function useSubscriptionPlans() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['subscriptions', 'plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, plan_type, plan_name, platform_fee_percent, monthly_price, yearly_price, description, features')
        .eq('is_active', true)
        .order('monthly_price', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  return { plans: data, isLoading };
}

export function useSubscription() {
  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions', 'current'],
    queryFn: async () => {
      const creatorId = await getCreatorProfileId();
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, status, billing_cycle, current_price, current_platform_fee_percent, renewal_date, subscription_plan_id, subscription_plans(plan_type, plan_name, features)')
        .eq('creator_id', creatorId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
  return { subscription: data, plan: data?.subscription_plans ?? null, isActive: !!data, isLoading };
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` → clean. (If the embedded `subscription_plans(...)` select is typed as array-or-object, handle both where consumed in Task 5; the hook returns it as-is.)
```bash
git add src/hooks/creator/useSubscription.ts
git commit -m "feat(subscriptions): useSubscription + useSubscriptionPlans + hasFeature

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Plan picker UI (`app/dashboard/settings/subscription/page.tsx`)

**Files:** Rewrite `app/dashboard/settings/subscription/page.tsx`

- [ ] **Step 1: Read the current page + design rules**

Read the existing `app/dashboard/settings/subscription/page.tsx` (static today) and `.claude/rules/dashboard-design.md` (tokens, `Card`, `PageHeader`, `StatusPill`, sizing discipline, brand usage). Match the archetype of other settings pages.

- [ ] **Step 2: Rewrite as a real picker**

`'use client'`. Use `useSubscription()` + `useSubscriptionPlans()`. Layout:
- `<PageHeader title="Subscription" description="Your DigiOne plan — a lower platform fee on higher tiers." />`.
- A **monthly/yearly toggle** (local `useState<'monthly'|'yearly'>`).
- A responsive grid of plan `Card`s (Free/Plus/Pro from `plans`). Each card shows: `plan_name`; the **platform fee %** as the headline stat (`{platform_fee_percent}% platform fee`); the price for the selected cycle (`₹{monthly_price}/mo` or `₹{yearly_price}/yr`, Indian formatting, `₹0` → "Free"); a short feature list from `features` (map the `string[]` keys to readable labels, e.g. `full_analytics`→"Full analytics"); and a CTA.
- **Current plan** (match `plan?.plan_type` from `useSubscription`, treating "no active sub" as `free`): badge "Current plan" + a muted/disabled CTA. **Other plans:** an informational CTA — a `Card`-tinted note "Plan changes are activated by the DigiOne team — self-serve checkout is coming soon." (No payment call.)
- Highlight the recommended tier (Pro) with a subtle brand accent per the design rules. Use `Skeleton` while loading, tokens only, focus rings on the toggle/buttons. Top spacing via `PageHeader`.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → clean. Run: `npx eslint app/dashboard/settings/subscription/page.tsx` → no new errors. Run the dashboard hardcoded-color grep from `dashboard-design.md` on the page → expect 0 hits.

- [ ] **Step 4: Manual UI check**

`npm run dev`, open `/dashboard/settings/subscription`: three plan cards render with fees (10/7/5%) + prices; the monthly/yearly toggle switches prices; with no active sub, **Free** shows "Current plan". (After Task 6 activates Pro, reload → Pro shows "Current plan".)

- [ ] **Step 5: Commit**
```bash
git add app/dashboard/settings/subscription/page.tsx
git commit -m "feat(subscriptions): real plan picker (fee %/price/features, current plan, cycle toggle)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Live e2e (fee tiering) + docs

**Files:** Modify `.claude/rules/supabase-reference.md`, `docs/reference/dashboard-map.md`, `.claude/todo-later/11(half)-…overhaul.md`

- [ ] **Step 1: Terminal + live fee-tiering check (manual)**

Pick a creator id (`<C>`). Baseline: no active sub → Free.
```
npx tsx --env-file=.env.local scripts/subscription-admin.ts activate <C> pro
npx tsx --env-file=.env.local scripts/subscription-admin.ts view <C>
```
Expected: `view` shows Pro / fee 5 / renewal ~+1mo. Then confirm the money path tiers: either (a) run a real test sale for `<C>` and check the new `transaction_ledger` row's `meta.platform_fee` = 5% of the sale (vs 10%), or (b) call the fee resolver directly:
```
npx tsx --env-file=.env.local -e "import('./src/lib/server/platform-fee').then(m=>m.getPlatformFeeRate('<C>').then(r=>console.log('rate',r)))"
```
Expected: `rate 0.05`. Then `subscription-admin cancel <C>` → resolver returns `0.10` again.

- [ ] **Step 2: Docs**

- `.claude/rules/supabase-reference.md`: note `subscriptions`/`subscription_plans` are wired — `getPlatformFeeRate` reads the active sub (snapshot fee, fail-safe Free); activation via `scripts/subscription-admin.ts`; RLS select-own/public.
- `docs/reference/dashboard-map.md`: update the `/dashboard/settings/subscription` row → real picker (`useSubscription`, `useSubscriptionPlans`; reads `subscription_plans`/`subscriptions`; informational CTA).
- `.claude/todo-later/11(half)-…overhaul.md`: §0 Phase 3 row → **BUILT (fee-tiering core; billing deferred)** + link the Phase 3 spec/plan; note deferred: real PG billing / recurring / auto-renew / GST invoice / feature-gating enforcement.

- [ ] **Step 3: Full gauntlet + commit**

Run: `npx tsc --noEmit` · `npm run lint` · `npm test` · `/verify` → all green (platform-fee + subscription unit tests included).
```bash
git add .claude/rules/supabase-reference.md docs/reference/dashboard-map.md ".claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md"
git commit -m "docs(phase3): subscriptions wired — fee tiering + picker + terminal activation; blueprint state

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Verification checklist (Phase 3 done when)

- [ ] `getPlatformFeeRate(<pro creator>)` returns `0.05`; `<plus>` `0.07`; no-sub / expired / null / error → `0.10`.
- [ ] `subscription-admin activate/view/cancel` work; one active sub per creator (activate supersedes prior).
- [ ] A Pro creator's sale splits the platform fee at 5% in `transaction_ledger` (vs 10% on Free).
- [ ] The plan picker renders 3 plans (fees 10/7/5%), the cycle toggle switches prices, current plan is badged.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test`, `/verify` pass. No migration / no type-regen was needed.

## Self-review notes (addressed)

- **Spec coverage:** §2 fee lever → Task 1. §3 picker → Task 5. §4 terminal + shared lib → Tasks 2/3. §5 hook + hasFeature → Task 4. §6 security (fail-safe, snapshot, one-active-sub) → Tasks 1/2. §7 testing → Tasks 1/2 unit + Task 6 live. §8 files: the migration/type-regen rows are dropped (RLS + index already exist — grounded), noted in the header.
- **Type consistency:** `resolveFeeRate({current_platform_fee_percent})` (Task 1) · `subscriptionRowFromPlan(creatorId, plan, cycle, now)` / `activateSubscription(db, creatorId, planType, cycle)` / `cancelSubscription(db, creatorId)` / `PlanType`/`Cycle`/`PlanRow` identical across Tasks 2/3 · `hasFeature(features, key)` + `useSubscription`/`useSubscriptionPlans` shapes identical across Tasks 4/5.
- **No placeholders:** every code step complete; Task 5 (UI) gives exact layout/props against the file's real primitives + the grounded `features` string[] shape.
