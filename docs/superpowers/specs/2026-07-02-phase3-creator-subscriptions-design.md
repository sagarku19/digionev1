---
noteId: "761a68e075c711f193a7f790bf9449ed"
tags: []

---

# Phase 3 — Creator subscriptions (fee-tiering core, manual activation) — design spec

**Date:** 2026-07-02 · **Status:** design (approved-in-session, pending written review)
**Parent blueprint:** `.claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md` (§4, §8 Phase 3)
**Builds on:** the money path (`getPlatformFeeRate` in `fulfillOrder`/`fulfillPaymentLinkSubmission`).

> Phase 3 ships the **credential-independent core** of creator subscriptions: it makes `getPlatformFeeRate`
> real (reads the creator's active plan → tiers the whole money path), turns the static plan page into a real
> picker, and adds a terminal script to activate a creator onto a plan. **All real payment (PG charging,
> recurring mandates, auto-renew, GST invoices) is deferred** — activation is manual/terminal for now,
> consistent with how Phases 1–2 deferred external-creds parts.

---

## 0. Goals / non-goals

**Goals:**
1. **`getPlatformFeeRate(creatorId)` becomes real** — reads the creator's active subscription and returns its
   snapshotted `current_platform_fee_percent`, falling back to Free (0.10). One change tiers the entire money
   path (Plus 7% / Pro 5% flow through `fulfillOrder`).
2. **Plan picker** (`/dashboard/settings/subscription`, today static) — real Free/Plus/Pro cards from
   `subscription_plans`, current-plan badge, monthly/yearly toggle, **informational** CTA (no self-serve checkout yet).
3. **Terminal activation** (`scripts/subscription-admin.ts`) — a super_admin activates/cancels a creator's plan.
4. **`useSubscription()` hook** + a pure `hasFeature` helper (current-plan context; per-feature enforcement deferred).

**Non-goals (deferred):**
- Real payment: one-time PG charge, recurring Cashfree mandate/AutoPay, `creator_subscription_orders` writes.
- Auto-renew + failed-renewal downgrade automation (manual for now; the fee lever already treats expired as Free).
- **18% GST invoice** on the subscription fee → **Phases 5–6** (tax + invoices).
- App-wide **feature-gating enforcement** — this pass ships the helper + current-plan read, not gating on every feature.
- Any admin **UI** for subscriptions (admin lives in the separate app — `.claude/todo-later/12(left)-…`; terminal for now).

---

## 1. Current state (grounded live, 2026-07-02)

| Object | State |
|---|---|
| `subscription_plans` | **3 rows, active:** `free` (fee **10%**, ₹0), `plus` (fee **7%**, ₹500/mo · ₹5500/yr), `pro` (fee **5%**, ₹1000/mo · ₹10000/yr). Cols: `id, plan_type (enum), plan_name, platform_fee_percent, monthly_price, yearly_price, description, features(jsonb), is_active, timestamps`. |
| `subscriptions` | **0 rows.** Cols: `id, creator_id, subscription_plan_id, status, billing_cycle, current_price, current_platform_fee_percent, start_date, end_date, renewal_date, auto_renew, metadata, timestamps`. |
| `creator_subscription_orders` | present, **unused this phase** (billing deferred). |
| `getPlatformFeeRate` | `src/lib/server/platform-fee.ts` — `async (creatorId) => 0.10` (ignores creatorId today). Called by `src/lib/server/fulfillment.ts` (both fulfill paths). |
| RLS | **Verify + ensure** (Task 1): `subscriptions` SELECT-own (`creator_id = current_profile_id()`) + super_admin SELECT, writes service-role only; `subscription_plans` readable by `authenticated` (the picker reads it). |

---

## 2. The fee lever — `getPlatformFeeRate` (the core)

Rewrite `src/lib/server/platform-fee.ts` so the rate is resolved from the active subscription. Keep the exact
signature (`async (creatorId: string | null): Promise<number>`) so callers are unchanged.

**Resolution (server-only, service client):**
```
if creatorId is null → return 0.10 (Free default)
read subscriptions where creator_id = creatorId
  and status = 'active'
  and (renewal_date is null or renewal_date > now())
  order by created_at desc, limit 1
if found and current_platform_fee_percent is a valid number → return that / 100
else → return 0.10
on any DB error → return 0.10   (fail-safe to the HIGHER platform fee; never under-charge)
```
- **Snapshot:** uses `subscriptions.current_platform_fee_percent` (frozen when the sub was activated) — a later
  `subscription_plans.platform_fee_percent` change does NOT retroactively alter an active subscriber.
- **Pure core:** extract `resolveFeeRate(row: { current_platform_fee_percent } | null): number` (pure, unit-tested);
  the async fn does the query + calls it.
- **Hot path:** called per fulfillment — one indexed read on `subscriptions(creator_id, status)`; add that index if absent.

---

## 3. Plan picker UI (`app/dashboard/settings/subscription/page.tsx`)

Replace the static UI with real data:
- **`useSubscriptionPlans()`** reads `subscription_plans` (active, ordered by price); **`useSubscription()`** reads the
  creator's active sub + its plan.
- **Cards** (Free / Plus / Pro): plan name, **fee %** (the headline value), monthly/yearly price (₹, Indian format), a
  short feature list from `features` jsonb. A **monthly/yearly toggle** switches the displayed price.
- **Current plan** gets a badge + muted CTA ("Current plan"); others get an **informational** CTA — a note that plan
  changes are activated by the DigiOne team for now (self-serve checkout arrives with the billing pass). No payment call.
- Follows `dashboard-design.md` (tokens, `Card`, `PageHeader`, `StatusPill`, sizing discipline, brand for the primary tier).

---

## 4. Terminal activation — `scripts/subscription-admin.ts` (service-role)

Run via `npx tsx --env-file=.env.local`. Server-only (holds the service key = trusted admin). Built on a shared
`src/lib/server/subscription.ts` so the same activation logic is reusable when billing is wired later.

- **`view <creatorId>`** — prints the creator's active sub (plan, fee%, price, cycle, renewal_date, status) or "(none — Free)".
- **`activate <creatorId> <free|plus|pro> [--cycle monthly|yearly]`** — resolves the plan from `subscription_plans`,
  then upserts a `subscriptions` row: `subscription_plan_id`, `status='active'`, `billing_cycle`,
  `current_price` (monthly/yearly from the plan), **`current_platform_fee_percent` snapshotted from the plan**,
  `start_date=now()`, `renewal_date = now() + 1 month|1 year`, `auto_renew=false`. Cancels/supersedes any prior active sub
  for that creator (one active sub per creator). Activating `free` is equivalent to cancel (fee back to 10%).
- **`cancel <creatorId>`** — sets the active sub `status='cancelled'` (the fee lever then falls back to Free).

**Shared lib `src/lib/server/subscription.ts`:** `activateSubscription(db, creatorId, planType, cycle)`,
`cancelSubscription(db, creatorId)`, and a pure `subscriptionRowFromPlan(plan, cycle, now)` (unit-tested field-set +
renewal-date math). One active sub per creator (upsert-by-creator / supersede prior active).

---

## 5. `useSubscription` hook + gating helper

- **`src/hooks/creator/useSubscription.ts`** — `useSubscription()` → `{ plan, subscription, isActive, isLoading }`
  (reads `subscriptions` joined to `subscription_plans` for the current creator, RLS select-own).
  **`useSubscriptionPlans()`** → all active plans (for the picker).
- **`hasFeature(features: Json, key: string): boolean`** — pure helper reading the plan's `features` jsonb. Exposed for
  future gating; **not** retrofitted across the app this phase. (If the `features` shape is unknown, the plan step
  confirms it against a live row before coding the helper.)

---

## 6. Security / correctness

- `getPlatformFeeRate` and the activation lib/script are **server-only** (service client). No client writes to
  `subscriptions`/`subscription_plans` (RLS: creator SELECT-own, writes service-role).
- **Fail-safe fee:** a resolution error returns Free 0.10 (the higher platform fee) — never under-charges the platform.
- **Snapshot integrity:** the money split uses the sub's frozen `current_platform_fee_percent`, decoupled from live plan edits.
- **One active sub per creator** — activation supersedes any prior active row (no ambiguity in resolution).
- Money-path invariant unchanged: `fulfillOrder` still credits `creator_proceeds = total − total*rate`; only the *rate source* changes.

---

## 7. Testing

- **Unit:** `resolveFeeRate` (active row → rate/100; null → 0.10; bad value → 0.10); `subscriptionRowFromPlan`
  (snapshots fee + price, renewal +1mo/+1yr, status active). `hasFeature` (present/absent).
- **Manual (terminal + live):** `subscription-admin activate <creatorId> pro` → `view` shows Pro/5% → make a test sale
  for that creator → confirm `fulfillOrder` split the platform fee at **5%** (`transaction_ledger` meta `platform_fee`)
  and credited 95% (vs 90% on Free). Then `cancel` → next sale splits at 10% again.
- Per `.claude/rules/verification.md` Lane 2, the fee-resolution unit tests are the highest-ROI (money path).

---

## 8. Files

| File | Responsibility | Status |
|---|---|---|
| `supabase/migrations/20260702000000_subscriptions_rls_index.sql` | ensure RLS (subscriptions/plans) + `subscriptions(creator_id,status)` index | create (idempotent; may be no-op if present) |
| `src/lib/server/platform-fee.ts` (+`.test.ts`) | `resolveFeeRate` pure + `getPlatformFeeRate` reads active sub | rewrite |
| `src/lib/server/subscription.ts` (+`.test.ts`) | `activate`/`cancel` + pure `subscriptionRowFromPlan` | create |
| `scripts/subscription-admin.ts` | terminal `view`/`activate`/`cancel` | create |
| `src/hooks/creator/useSubscription.ts` | `useSubscription` + `useSubscriptionPlans` + `hasFeature` | create |
| `app/dashboard/settings/subscription/page.tsx` | real plan picker | rewrite |
| `types/database.types.ts` | regen if the migration changes anything | regenerate (likely no-op) |
| `.claude/rules/{api-routes,supabase-reference}.md`, `docs/reference/dashboard-map.md`, blueprint | docs | modify |

---

## 9. What carries forward

- **Billing** (self-serve upgrade): a later pass adds a PG charge (one-time via the existing PG, or a Cashfree
  recurring mandate) → `creator_subscription_orders` + a webhook that calls `activateSubscription`. The terminal
  script's `activateSubscription` lib is the seam.
- **Auto-renew + failed-renewal downgrade**; **GST invoice** on the fee (Phases 5–6); **feature-gating enforcement**;
  the subscription **admin UI** → the separate admin app (`12(left)`).

---

## 10. Reference

- Money path: `src/lib/server/{platform-fee,fulfillment}.ts`; blueprint §4.
- Rules: `.claude/rules/{security-model,supabase-reference,dashboard-design}.md`.
- Phase 2 terminal-admin pattern to mirror: `scripts/kyc-admin.ts`, `src/lib/server/kyc-verify.ts`.
