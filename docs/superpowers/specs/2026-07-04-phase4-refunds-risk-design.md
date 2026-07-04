---
noteId: "358d5700778f11f193a7f790bf9449ed"
tags: []

---

# Phase 4 — Refunds + frozen balance + risk controls — design spec

**Date:** 2026-07-04 · **Status:** design (approved-in-session, pending written review)
**Parent blueprint:** `.claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md` (§5, §8 Phase 4)
**Builds on:** Phase 0 (`frozen_balance`, `settle_payout`, `reconcile_creator_balances`), Phase 1 (Cashfree Payouts webhook/sync), the shared fulfillment module.

> Phase 4 makes refunds real (Cashfree PG refund API → ledger reversal → balance clawback via the
> frozen-balance mechanism), activates `frozen_balance` (which Phase 0 shipped but nothing writes),
> adds the agreed risk controls, and fixes a pre-existing balance bug discovered during design
> (platform fee double-counted in available balance). Admin actions stay terminal-script interim,
> consistent with Phases 2–3.

---

## 0. Goals / non-goals

**Goals:**
1. **Gross-earnings convention fix** — `total_earnings` becomes lifetime **gross**; fulfillment credits gross; guarded backfill converts historical rows. Fixes available-balance under-reporting by the fee on every sale.
2. **Refund engine** (product orders): `refunds` table + `begin_refund`/`settle_refund` RPCs + Cashfree PG refund API + `REFUND_STATUS_WEBHOOK` handling + sync fallback. Proportional platform-fee reversal. Access revocation on full refund.
3. **Frozen balance activated** — refund clawbacks freeze at initiation; `wallet_frozen_logs` audit trail; manual admin freeze/unfreeze (interim dispute handling).
4. **Risk controls** — one-in-flight payout guard; refund initiation rate limit + atomic over-refund guard; `TRANSFER_REVERSED`-after-success payout clawback (`reverse_settled_payout`).
5. **Surfaces** — creator refund action on `/dashboard/orders`; conditional "Frozen" stat on `/dashboard/earnings`; `scripts/refund-admin.ts` for admin.
6. **Reconciliation coverage** — `reconcile_creator_balances()` extended to earnings/fees-vs-ledger and frozen-vs-logs.

**Non-goals (deferred, recorded here deliberately):**
- **Payment-link (`pl_`) refunds** — product orders only this phase; `payment_submissions.payment_status='refunded'` stays vocabulary-only.
- **Free-order access revocation** — refunds require a paid order (`gateway_payment_id` present).
- **Referral-commission clawback on refund** — platform absorbs it (bounded above by the fee it already funds).
- **Cashfree dispute-webhook automation** — dispute freezes are manual (terminal) this phase.
- **Buyer-facing refund request UI / buyer email notifications** — policy stays support-mediated (email); Cashfree notifies the buyer on refund credit.
- **Admin app UI** — terminal script only (`.claude/todo-later/12(left)-…admin-app`).
- **Coupon-use decrement on refund** — redeemed stays redeemed.

---

## 1. Current state (grounded live, 2026-07-04)

| Object | State |
|---|---|
| `creator_balances.frozen_balance` | Exists (Phase 0), non-negative CHECK, **subtracted by `availableBalance()`** — but no writer anywhere. |
| `availableBalance()` | `src/lib/shared/balance.ts` — `earnings − fees − paid_out − pending − frozen`. Single source (route + hook). |
| **Balance bug** | `fulfillOrder`/`fulfillPaymentLinkSubmission` credit **NET** proceeds into `total_earnings` (`fulfillment.ts:47-52`) while the formula subtracts `total_platform_fees` again and the earnings UI labels it "Lifetime gross revenue". A ₹1000 sale @10% shows ₹800 available instead of ₹900. Present since the original webhook (verified in git). |
| `transaction_ledger` | Append-only; `amount > 0` CHECK; UNIQUE `record_hash` (bytea holding ASCII hex of sha256); free-text `tx_type`; `order_id` + `payout_id` FKs. Sale rows: `amount = gross`, `meta.platform_fee`, `meta.net_amount`. |
| `orders.status` | CHECK already includes `'refunded'` + `'cancelled'`; webhook, `/payment/status`, and the orders page already render them; **nothing sets them**. |
| PG webhook `/api/webhook/cashfree` | Routes on `data.order.order_id` only. A `REFUND_STATUS_WEBHOOK` (no `data.order.order_id`… envelope is `data.refund`) would hit the "Missing order ID" **400** → Cashfree retry storm. Latent bug fixed by this phase's type-aware routing. |
| Payout webhook `/api/webhook/cashfree-payout` | Handles `TRANSFER_SUCCESS`/`TRANSFER_FAILED`; **`TRANSFER_REVERSED` unhandled** (deferred Phase 1 item → here). |
| `settle_payout(p_payout_id, p_terminal, …, p_expect_status)` | Atomic finalizer, claim-based idempotency (migration `20260701000001`). |
| `reconcile_creator_balances()` | Checks `total_paid_out`/`pending_payout` vs `creator_payouts` only. No earnings/fees/frozen coverage. |
| Payout request route | Optimistic concurrency on `pending_payout`; KYC gate; ₹100 min; **no in-flight-payout cap** (unbounded pending rows possible). |
| Rate limiting | `rate_limits` table + `check_rate_limit` RPC via `src/lib/server/rate-limit.ts` (fail-open). |
| Refund policy (public) | `/refunds` page: 7-day buyer window, support-mediated, refunds to source in 5–7 days, "may recover the amount from the creator's pending payouts". Dashboard help copy promises a creator "Refund" action in orders — built this phase. |
| `notifications.type` | CHECK already allows `'refund'`. |
| Admin pattern | Terminal scripts + shared `src/lib/server/` libs (`kyc-admin.ts`, `subscription-admin.ts`); super_admin API routes exist only for payouts. |

**Session decisions (2026-07-04):** fix the balance bug in this phase · refund initiation = admin (terminal) **and** creator (dashboard) · **proportional** fee reversal · architecture = freeze → gateway → webhook-settled (mirrors `settle_payout`).

---

## 2. Gross-earnings convention fix (bug fix + backfill)

**Convention after this phase:** `total_earnings` = lifetime **gross** sale value credited; `total_platform_fees` = lifetime fees; `available = gross − fees − paid_out − pending − frozen`. Referral commissions keep crediting `(commission, 0)` — commission is the referrer's gross; unchanged.

**Code:** in `fulfillOrder` and `fulfillPaymentLinkSubmission`, pass `p_earnings_delta = total` (gross) instead of `creatorProceeds`. `credit_creator_balance` RPC unchanged.

**Backfill migration (idempotent, drift-safe — money never silently rewrites itself):**
1. Compute per-creator expected sums from `transaction_ledger`: `ledger_gross = Σ amount` over credit rows with `tx_type in ('sale','payment_link','referral_commission')`; `ledger_fees = Σ (meta->>'platform_fee')::numeric` over the same rows (referral rows contribute 0).
2. Convert **only** rows still in the old net shape: `UPDATE creator_balances SET total_earnings = ledger_gross WHERE total_earnings = ledger_gross − ledger_fees` (per-creator join). Already-converted rows (`earnings == ledger_gross`) don't match → re-run is a no-op.
3. Rows matching **neither** shape → do not touch; insert a `balance_reconciliation_log` row (`field = 'total_earnings'`) for manual review.

**Why ledger-derived, not `earnings += fees`:** a bare increment is not idempotent (double-runs double-add) and trusts a cached counter; the ledger is the source of truth and the shape-match makes the conversion self-limiting.

---

## 3. Refund money math (proportional fee reversal)

Inputs per refund: order total `T`, original fee `F` (from the order's `sale` ledger row `meta.platform_fee` — **if that row is missing, `begin_refund` refuses**; fix the books first, never guess), refund amount `R` where `0 < R ≤ T − Σ(prior success/processing refund amounts)`.

```
fee_reversed  = round(F × R / T, 2)          -- BUT the refund that completes the order takes
                                             -- F − Σ(prior fee_reversed) so the order zeroes exactly
net_clawback  = R − fee_reversed             -- what the creator actually loses
```

| Moment | Balance effect | Ledger |
|---|---|---|
| `begin_refund` (initiation) | `frozen_balance += net_clawback` | — (no money moved yet) |
| `settle_refund('success')` | `total_earnings −= R`, `total_platform_fees −= fee_reversed`, `frozen_balance −= net_clawback` | one **debit**, `tx_type='refund'`, `amount = R`, `record_hash = sha256('refund:'+refunds.id)`, `meta = { refund_id, order_id, fee_reversed, net_clawback, gateway_refund_id }` |
| `settle_refund('failed')` | `frozen_balance −= net_clawback` (release only) | — |

Net across initiate+success: available −= `net_clawback`; platform gives up `fee_reversed`. A fully refunded order nets to **zero** in ledger and balances (matches Phase 5's TCS net-of-returns needs).

**Invariants:** per-creator `Σ refund gross ≤ Σ sale gross` and `Σ fee_reversed ≤ Σ fees`, so `total_earnings`/`total_platform_fees` stay ≥ 0 arithmetically; `frozen_balance −= net_clawback` releases exactly what was frozen. **No `greatest(…, 0)` clamps in `settle_refund`** — a CHECK violation means corrupted books and must fail loudly (webhook 500s → Cashfree retries → row stays `processing` → sync/admin investigates). `available` **may go negative** (creator withdrew before the refund) — that is creator debt, repaid by future sales; the per-component CHECKs still hold and the public policy already reserves this right.

**Buyer side:** refund goes to source via Cashfree (STANDARD speed — 5–7 days, matching the policy page). On **full** refund, access is revoked (§4 `settle_refund`); partial refunds keep access (a partial is a goodwill discount).

---

## 4. Schema — migration `20260704000000_phase4_refunds_risk.sql`

All idempotent SQL; apply live via the Supabase MCP; regenerate types (Windows MCP fallback).

### 4.1 `refunds`

```sql
create table refunds (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references orders(id),
  creator_id         uuid not null references profiles(id),
  amount             numeric not null check (amount > 0),
  fee_reversed       numeric not null default 0 check (fee_reversed >= 0),
  net_clawback       numeric not null check (net_clawback >= 0),
  reason             text,
  status             text not null default 'processing'
                       check (status in ('processing','success','failed')),
  initiated_by       text not null check (initiated_by in ('creator','admin')),
  initiator_id       uuid,                    -- profiles.id (creator) / users.id (admin)
  merchant_refund_id text not null unique,    -- sent to Cashfree as refund_id: 'rfnd_'+id-no-dashes
  gateway_refund_id  text,                    -- cf_refund_id
  gateway_metadata   jsonb,
  failure_reason     text,
  created_at         timestamptz not null default now(),
  processed_at       timestamptz
);
```
Indexes: `(creator_id, created_at desc)`, `(order_id)`, partial `(status) where status = 'processing'` (sync scan).
RLS: creator SELECT-own (`creator_id = current_profile_id()`) + super_admin SELECT; **writes service-role only** (no client INSERT/UPDATE/DELETE policies).

### 4.2 `wallet_frozen_logs`

```sql
create table wallet_frozen_logs (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references profiles(id),
  amount       numeric not null check (amount > 0),
  reason       text not null,
  status       text not null default 'frozen' check (status in ('frozen','released')),
  source       text not null check (source in ('refund','dispute','manual')),
  refund_id    uuid references refunds(id),
  created_by   uuid,                          -- admin auth user for manual; null for system
  release_note text,
  released_at  timestamptz,
  created_at   timestamptz not null default now()
);
```
Index: `(creator_id, status)`. RLS: creator SELECT-own + super_admin SELECT; writes service-role only.

### 4.3 RPCs (security definer, `set search_path = public`, EXECUTE revoked from `public, anon, authenticated`)

**`begin_refund(p_order_id uuid, p_amount numeric, p_reason text, p_initiated_by text, p_initiator_id uuid) returns uuid`** — one transaction:
1. `SELECT … FROM orders WHERE id = p_order_id FOR UPDATE` — serializes concurrent refunds per order.
2. Validate: order exists, `status = 'completed'`, `gateway_payment_id is not null`, `creator_id is not null`.
3. Read `F` from the order's `sale` ledger row (`meta->>'platform_fee'`); **raise** if the row is absent.
4. `Σ(refunds where order_id and status in ('processing','success')) + p_amount ≤ total_amount` else raise.
5. Compute the §3 split (completing refund takes the fee remainder exactly).
6. Insert `refunds` row (`status='processing'`, `merchant_refund_id = 'rfnd_' || replace(id::text,'-','')`).
7. `frozen_balance += net_clawback`; insert `wallet_frozen_logs` (`source='refund'`, `refund_id`, `status='frozen'`).
8. Return the refund id.

**`settle_refund(p_refund_id uuid, p_terminal text, p_gateway_refund_id text default null, p_gateway_metadata jsonb default null, p_failure_reason text default null) returns boolean`** — mirror of `settle_payout`:
1. Claim: `UPDATE refunds SET status = p_terminal, processed_at = now(), … WHERE id = ? AND status = 'processing' RETURNING …`; zero rows → `false` (idempotent no-op).
2. `success`: apply §3 balance reversal (no clamps); insert ledger debit (`on conflict (record_hash) do nothing`); release the frozen log (`status='released', released_at=now()`); then `SELECT … FROM orders WHERE id = … FOR UPDATE` (serializes two partials completing concurrently) and if the order is now fully refunded (`Σ success = total_amount`) → `orders.status = 'refunded'` **and revoke access in-transaction**: `DELETE FROM user_product_access WHERE order_id = …; DELETE FROM guest_entitlements WHERE order_id = …`.
3. `failed`: release frozen log + `frozen_balance −= net_clawback`; stamp `failure_reason`.
4. Return `true`.

**`freeze_creator_funds(p_creator_id uuid, p_amount numeric, p_reason text, p_source text default 'manual', p_created_by uuid default null) returns uuid`** — `frozen_balance += amount` + log row; returns log id.
**`release_frozen_funds(p_log_id uuid, p_note text default null) returns boolean`** — claim `frozen → released`; `frozen_balance −= amount`; `false` if already released.

**`reverse_settled_payout(p_payout_id uuid, p_reason text default null, p_gateway_metadata jsonb default null) returns boolean`** — deferred Phase 1 clawback:
1. Add `'reversed'` to the `creator_payouts.status` CHECK (`pending|processing|success|failed|reversed`).
2. Claim: `UPDATE creator_payouts SET status='reversed', failure_reason=p_reason, … WHERE id=? AND status='success'`; zero rows → `false`.
3. `total_paid_out −= amount` (the money came back → available rises).
4. Ledger **credit**, `tx_type='payout_reversal'`, `amount`, `record_hash = sha256('payout-rev:'+id)`, `on conflict do nothing`.

**`reconcile_creator_balances()` extended:** also compare `total_earnings` vs `ledger_gross − Σ(refund debits)`, `total_platform_fees` vs `ledger_fees − Σ(fee_reversed)`, and `frozen_balance` vs `Σ(open wallet_frozen_logs)`; log drift rows (`field` values `'total_earnings' | 'total_platform_fees' | 'frozen_balance'`). Still alert-only, never auto-corrects.

### 4.4 Backfill — migration `20260704000001_gross_earnings_backfill.sql`

Exactly §2: ledger-derived, shape-matched, drift-logged, idempotent. Runs **after** the fulfillment code change deploys (ordering note: apply both migrations and deploy the code in the same change-set; the shape-match makes an interleaved sale at worst a logged drift row, not corruption).

---

## 5. Flows

### 5.1 Initiation — shared lib `src/lib/server/refunds.ts`

`initiateRefund({ orderId, amount?, reason?, initiatedBy, initiatorId })`:
1. `begin_refund` RPC (amount defaults to full remaining, resolved inside the RPC when null).
2. Cashfree `POST {CASHFREE_ENV}/orders/{gateway_order_id}/refunds` — body `{ refund_id: merchant_refund_id, refund_amount, refund_note }`, standard PG headers (`x-api-version: 2023-08-01`, PG client id/secret) via new thin `src/lib/server/cashfree-refunds.ts` (`createRefund`, `getRefund`; **never imported client-side**).
3. Gateway reject (non-2xx) → `settle_refund(id, 'failed', failure_reason='gateway_reject:…')` — freeze released — surface 502.
4. Gateway accept → store `gateway_refund_id` (cf_refund_id) on the row; stays `processing` until webhook/sync.

Also exports the **pure** `computeRefundSplit(total, feeOriginal, amount, priorFeeReversed, isCompleting)` used for UI preview + unit tests (the RPC re-computes authoritatively in SQL — client math is display-only).

**Creator route — `POST /api/refunds/create`** (cookie session): body `{ orderId, amount?, reason? }`. Guards in order: auth → `resolveProfileId` → rate limit **5/min per profile** (`check_rate_limit`, key `refund:{profileId}`) → order ownership (`orders.creator_id = profileId`) → delegate to `initiateRefund(initiatedBy:'creator')`. Errors: 400 (validation/over-refund/free order), 401, 403 (not owner), 404, 409 (`begin_refund` state conflicts), 429, 502 (gateway), 500. No time-window restriction — the 7-day policy governs buyer *requests*; creators/admin may refund any completed paid order.

**Admin — `scripts/refund-admin.ts`** (run `npx tsx --env-file=.env.local scripts/refund-admin.ts <cmd>`, service-role, same pattern as `kyc-admin.ts`):
| Command | Does |
|---|---|
| `view [orderId\|creatorId]` | Orders with refund state; refund rows; frozen logs; balance snapshot |
| `refund <orderId> [amount] [--reason …]` | `initiateRefund(initiatedBy:'admin')` |
| `sync` | Poll all `processing` refunds via `getRefund`; map terminal states → `settle_refund`; confirmed-404 after a stale cutoff → `settle_refund('failed')` (mirrors payout sync) |
| `freeze <creatorId> <amount> --reason …` | `freeze_creator_funds` (`source='dispute'` or `'manual'`) |
| `unfreeze <logId> [--note …]` | `release_frozen_funds` |

No `/api/admin/refunds/*` routes this phase (admin app later). Refund sync is script-only (payout sync keeps its CRON route; a refund cron route can be added when going live).

### 5.2 Settlement — the existing PG webhook becomes type-aware

`app/api/webhook/cashfree/route.ts` (same URL + HMAC secret Cashfree already signs refund webhooks with):
1. After signature verification: if `payload.type?.startsWith('REFUND')` **or** `payload.data?.refund` exists → refund branch: look up `refunds` by `merchant_refund_id = data.refund.refund_id` (fallback `gateway_refund_id = cf_refund_id`); not found → `200 {received:true}` (stray/test event). Map `refund_status`: `SUCCESS → settle_refund('success')`; `CANCELLED → settle_refund('failed')`; `PENDING`/`ONHOLD` → no-op 200. *(Exact enum re-verified against Cashfree PG docs during the plan's contract-check task; the mapping table is the contract.)*
2. Payment envelopes: existing logic unchanged.
3. Anything else unrecognized (no order id, no refund envelope) → **`200 {received:true}`**, replacing today's 400 (kills the latent retry-storm).
4. `settle_refund` DB error → 500 so Cashfree retries (claim makes retries safe) — same posture as the payout webhook.

App-side after a `true` success settle (non-atomic, log-and-continue like fulfillment): `notifications` insert for the creator (`type='refund'`, "₹X refunded on order …").

### 5.3 Payout reversal — `TRANSFER_REVERSED`

In `app/api/webhook/cashfree-payout/route.ts`: on `event === 'TRANSFER_REVERSED'` → first `settle_payout(p_terminal:'failed', p_expect_status:'processing', p_failure_reason:'transfer_reversed')` (in-flight reversal = failure, releases the hold); if that returns `false` → `reverse_settled_payout(payoutId, 'transfer_reversed', params)` (post-success clawback). Both idempotent; DB errors → 500.

---

## 6. Risk controls

| Control | Where | Rule |
|---|---|---|
| One-in-flight payout | `/api/payouts/request` | Reject 409 if any `creator_payouts` row for this creator is `pending`/`processing` ("You already have a payout in progress"). Belt-and-braces with the existing optimistic-concurrency guard (two racers: the second fails the `.eq(pending_payout)` match anyway). |
| Frozen funds gate withdrawals | already live | `availableBalance()` subtracts `frozen_balance`; activating freezes makes it real. |
| Over-refund guard | `begin_refund` | Row-lock (`FOR UPDATE` on the order) + Σ check — concurrent refunds can't exceed the order total. |
| Refund velocity | `/api/refunds/create` | 5/min per profile via `check_rate_limit`. |
| Dispute freeze | terminal | `freeze`/`unfreeze` commands + `wallet_frozen_logs` (`source='dispute'`); Cashfree dispute-webhook automation deferred. |
| Duplicate payout transfer | already live | `transfer_id = payout.id` (gateway dedupe) + `settle_payout` claim + `p_expect_status`. |
| Payout reversal clawback | payout webhook | §5.3. |

---

## 7. Creator UI (dashboard-design rules apply)

- **Orders page** (`app/dashboard/orders/page.tsx`): row action **Refund** on `completed` paid orders → `ConfirmDialog` (destructive) with a `CurrencyInput` prefilled to the full remaining amount + optional reason; shows the clawback preview ("₹X will be deducted from your balance") from `computeRefundSplit` — withholding shown *before* confirm. Calls a new mutation (in `src/hooks/commerce/useOrders.ts`) → `POST /api/refunds/create` → invalidates `['orders']` + `['earnings']`. The `refunded` status pill already exists; partially refunded orders stay `completed`.
- **Earnings page** (`app/dashboard/earnings/page.tsx`): "Frozen" line rendered only when `frozen_balance > 0` (`useEarnings` already selects `*` so the field flows through) — quiet, `--warning` semantic pair, no layout rework.
- No new sidebar nav; no new pages.

---

## 8. Error handling summary

| Failure | Behavior |
|---|---|
| Gateway rejects refund create | `settle_refund('failed')` immediately (freeze released) → 502 to caller |
| Webhook DB error | 500 → Cashfree retries; claim idempotency makes replays no-ops |
| Webhook for unknown refund/order | 200 ack (no retry storms) |
| Missed webhook / stuck `processing` | `refund-admin.ts sync` polls `getRefund`; terminal map; confirmed-404 past stale cutoff → failed (freeze released) |
| Missing `sale` ledger row | `begin_refund` raises → 409/400 with explicit message; books fixed manually first |
| CHECK violation in `settle_refund` | RPC error (no clamp) → webhook 500 → row stays `processing` → drift visible in reconcile + sync; manual investigation |
| Crash between settle and notification | Notification lost (log-and-continue) — money + access already atomic in the RPC |

---

## 9. Testing & verification

- **Unit (vitest):** `refunds.test.ts` for `computeRefundSplit` — proportional rounding, completing-refund exactness (Σ fee_reversed = F), full-refund nets-to-zero, over-refund rejection at the boundary. `balance.test.ts` already covers frozen subtraction.
- **Migration:** apply via Supabase MCP → regen types (`npm run update-types` / MCP fallback) → `npx tsc --noEmit` + `npm run lint` + `/verify`.
- **Sandbox smoke (append to `docs/db/money-path.md`):** paid sandbox order → creator refund from orders page → `refunds` row `processing` + `frozen_balance` up + withdraw blocked for that amount → refund webhook (or `sync`) → balances net out, ledger debit present, order `refunded`, `user_product_access` gone, `/api/deliverables/[productId]` now 403 → `reconcile_creator_balances()` returns 0 drift. Payout: request → second request 409 (one-in-flight). Backfill: run twice → identical state.
- **Docs in the same change-set:** `api-routes.md` (new route + webhook change), `security-model.md` (refund path + revenue rules addendum), `docs/db/money-path.md` (§ refunds), blueprint §0 status, `docs/reference/dashboard-map.md` (orders page action).

---

## 10. Files touched

| File | Change |
|---|---|
| `supabase/migrations/20260704000000_phase4_refunds_risk.sql` | Tables, RLS, indexes, 5 RPCs, payout status CHECK + `'reversed'`, reconcile v2 |
| `supabase/migrations/20260704000001_gross_earnings_backfill.sql` | Guarded net→gross conversion (§2/§4.4) |
| `src/lib/server/fulfillment.ts` | Credit gross (2 call sites) |
| `src/lib/server/refunds.ts` (new) | `initiateRefund`, `computeRefundSplit` (pure), sync helper |
| `src/lib/server/cashfree-refunds.ts` (new) | `createRefund`, `getRefund` (PG creds, 2023-08-01) |
| `app/api/refunds/create/route.ts` (new) | Creator-initiated refunds |
| `app/api/webhook/cashfree/route.ts` | Type-aware routing; refund branch; unknown→200 |
| `app/api/webhook/cashfree-payout/route.ts` | `TRANSFER_REVERSED` branch (§5.3) |
| `app/api/payouts/request/route.ts` | One-in-flight guard |
| `scripts/refund-admin.ts` (new) | view / refund / sync / freeze / unfreeze |
| `src/hooks/commerce/useOrders.ts` | Refund mutation |
| `app/dashboard/orders/page.tsx` | Refund action + dialog |
| `app/dashboard/earnings/page.tsx` | Conditional Frozen stat |
| `src/lib/server/refunds.test.ts` (new) | Split-math unit tests |
| `types/database.types.ts` | Regenerated |
| Docs listed in §9 | Same change-set |

---

## 11. Open items for the plan phase

1. **Cashfree refund contract check** (small spike task, mirrors Phase 1 T1): confirm the v2023-08-01 refund create/get response fields + `REFUND_STATUS_WEBHOOK` envelope/status enum in sandbox before freezing the webhook mapping (§5.2). Cashfree PG docs: https://www.cashfree.com/docs/api-reference/payments/latest
2. Confirm whether `begin_refund` resolves "full remaining" internally on `p_amount = null` (recommended) vs the caller computing it — plan decides the exact signature.
3. Stale cutoff for sync-404 → failed (reuse the payout sync constant).
