---
noteId: "d9ea3b00675a11f1bffb2f446ab401a4"
tags: []

---

# DigiOne Money Path

End-to-end guide for how money enters DigiOne, flows through the creator, and exits as a payout. Read this before touching `app/api/checkout/`, `app/api/webhook/`, `src/lib/server/fulfillment.ts`, or `app/api/payouts/`.

---

## 1. Checkout (`POST /api/checkout/create`)

**File:** `app/api/checkout/create/route.ts`

### Price verification (trust nothing from the client)

The route immediately re-fetches every product's `price` and `is_published` state from the DB using the service-role client:

```ts
// route.ts:28-35
const { data: dbProducts } = await supabase
  .from('products')
  .select('id, price, creator_id, is_published')
  .in('id', productIds);
```

The client-supplied price is **never read**. `subtotal` is computed from `dbProducts` only (line 52). This closes the most obvious price-tampering attack.

### Single-creator-cart constraint

All products in one order must share the same `creator_id` (line 43-46). Mixed-creator carts are rejected with `400`. This is a hard requirement because payouts and platform-fee math are per-creator — lifting it would require splitting both.

### Coupon validation

If `couponCode` is present, the shared `validateCoupon` helper from `src/lib/server/coupons.ts` is called (line 58). It checks expiry, usage caps, and the per-creator scope. The resulting `discount` and `couponId` are stored in `orders.metadata` for later redemption at fulfillment.

### Referral attribution

If `referralCode` is present, `validateReferral` from `src/lib/server/referrals.ts` is called (line 69-73). It:

- Looks up the code in `referral_codes` where `is_active = true`.
- Rejects self-referrals (buyer owns the code, or selling creator owns the code).
- Returns `{ referralCodeId, referrerCreatorId, rewardPercent }`.

If the referral is valid, a **pending** `order_referrals` row is written after the order is created (line 119-128). Commission is not calculated yet — that happens at fulfillment.

### Orders row

A `pending` order is inserted (line 95-107):

| Column | Source |
|---|---|
| `id` | `crypto.randomUUID()` |
| `gateway_order_id` | `ord_` + UUID without dashes |
| `creator_id` | from DB, never from client |
| `total_amount` | `max(0, subtotal - discount)` |
| `status` | `'pending'` |
| `metadata` | `{ creator_profile_id, coupon_id?, discount_amount?, upsell_page_id? }` |

### Free-order short-circuit

When `total === 0` (line 131-134), `fulfillOrder(orderId)` is called directly — Cashfree is never contacted. The response is `{ orderId, amount: 0, status: 'completed' }`. The browser must handle this case before calling the Cashfree JS SDK (see `.claude/rules/cashfree-reference.md`).

---

## 2. Cashfree — Creating the Payment Session

**File:** `app/api/checkout/create/route.ts:138-173`  
**Reference:** `.claude/rules/cashfree-reference.md`

After inserting the pending order, the route calls `POST {CASHFREE_ENV}/orders` with:

```json
{
  "order_id":       "ord_<uuid>",
  "order_amount":   999,
  "order_currency": "INR",
  "customer_details": { "customer_id": "<orderId>", ... },
  "order_meta": {
    "return_url": "${NEXT_PUBLIC_APP_URL}/payment/status?order_id={orderId}",
    "notify_url": "${NEXT_PUBLIC_APP_URL}/api/webhook/cashfree"
  }
}
```

On success, Cashfree returns a `payment_session_id` which is handed to the browser SDK. The SDK opens the hosted checkout. The `x-client-secret` never reaches the browser.

If Cashfree returns a non-200, the pending order is immediately flipped to `failed` (line 168) and `502` is returned. There is no retry on 5xx — a reconciliation job for orphaned pending orders is a known gap (see `.claude/todo-later/`).

---

## 3. Webhook (`POST /api/webhook/cashfree`)

**File:** `app/api/webhook/cashfree/route.ts`

### HMAC signature verification

This happens **before** `JSON.parse`. The raw request body bytes are signed with `HMAC-SHA256(rawBody, CASHFREE_CLIENT_SECRET)`, base64-encoded, and compared with `crypto.timingSafeEqual` against the `x-webhook-signature` header (lines 8-25). Constant-time comparison prevents timing oracle attacks. Any mismatch returns `401` and the body is never parsed.

```ts
const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
const signatureValid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
```

### Routing by order_id prefix

After parsing, the `data.order.order_id` prefix determines which fulfillment path to call:

| Prefix | Table | Success handler |
|---|---|---|
| `pl_` | `payment_submissions` | `fulfillPaymentLinkSubmission(submissionId, gatewayPaymentId)` |
| `ord_` (all others) | `orders` | `fulfillOrder(order.id, { gatewayPaymentId })` |

Cashfree retries any non-2xx response, so the handler returns `200 { received: true }` even when the order is not found (line 79) — this prevents permanent retry storms from stray test events.

### Status mapping

| Cashfree `payment_status` | DigiOne action |
|---|---|
| `SUCCESS` | Call `fulfillOrder` / `fulfillPaymentLinkSubmission` |
| `FAILED` | Set `orders.status = 'failed'` |
| `USER_DROPPED` | Set `orders.status = 'failed'` |
| `PENDING` | No-op — leave as `pending` |

---

## 4. Fulfillment (`fulfillOrder`)

**File:** `src/lib/server/fulfillment.ts`

All side effects run in this single shared function, called from both the webhook and `/payment/status` (the reconciliation path for the user-facing race). Both paths produce identical results because `fulfillOrder` is the single source of truth.

### Step 1 — Atomic status claim (idempotency gate)

```ts
// fulfillment.ts:23-33
const { data: claimed } = await db
  .from('orders')
  .update({ status: 'completed', gateway_payment_id: ..., payment_verified_at: ... })
  .eq('id', orderId)
  .eq('status', 'pending')   // ← guard
  .select('id, user_id, total_amount, creator_id, metadata')
  .maybeSingle();

if (!claimed) return { fulfilled: false, alreadyFulfilled: true };
```

If `claimed` is null, the order was already processed (by a concurrent webhook retry or the status page). The function returns immediately without re-running any side effect. This is the only idempotency mechanism — there is no distributed lock.

### Step 2 — Credit creator balance

```ts
// fulfillment.ts:50-54
await db.rpc('credit_creator_balance', {
  p_creator_id: creatorId,
  p_earnings_delta: creatorProceeds,   // total − platformFee
  p_fees_delta:     platformFee,
});
```

The platform fee rate is 10% (`DEFAULT_PLATFORM_FEE_RATE = 0.10` in `src/lib/server/platform-fee.ts`). `credit_creator_balance` is an atomic Postgres RPC — no read-modify-write race on the balance row.

### Step 3 — Transaction ledger row

```ts
// fulfillment.ts:63-65
const recordHash = crypto.createHash('sha256')
  .update(`${orderId}:${opts?.gatewayPaymentId ?? 'free'}`)
  .digest('hex');
```

`record_hash` is deterministic: `sha256(orderId + ':' + cf_payment_id)`. The column has a UNIQUE constraint, so a duplicate hash from a webhook replay is rejected at the DB level — no application-level check needed.

The ledger row has `tx_type = 'sale'` and `direction = 'credit'`.

### Step 4 — Access grants

For logged-in buyers, a `user_product_access` row is upserted per product in the order (lines 89-115). The upsert conflict target is `(order_id, product_id)` — naturally idempotent. Guest buyers get their download link from `/payment/status` instead.

### Step 5 — Coupon redemption

If `orders.metadata.coupon_id` is set, the `increment_coupon_uses` RPC is called (line 121). The RPC is idempotent by design.

### Step 6 — Creator notification

A `notifications` row is inserted for the creator with `type = 'sale'` (lines 129-136).

### Step 7 — Referral commission

```ts
// fulfillment.ts:141-183
// Claim the pending order_referrals row (idempotency: pending → settled)
const { data: settled } = await db
  .from('order_referrals')
  .update({ status: 'settled' })
  .eq('order_id', orderId)
  .eq('status', 'pending')
  .select('referrer_creator_id, metadata')
  .maybeSingle();
```

If the claim succeeds, commission is computed (see Section 6 below), the referrer's balance is credited via the same `credit_creator_balance` RPC, a `transaction_ledger` row is written with `tx_type = 'referral_commission'` and its own deterministic hash (`sha256(orderId + ':ref:' + gatewayPaymentId)`), and a notification is sent to the referrer.

---

## 5. Balance & Payout (`POST /api/payouts/request`)

**File:** `app/api/payouts/request/route.ts`

### Available balance formula

```
available = total_earnings − total_platform_fees − total_paid_out − pending_payout
```

Computed at lines 52-54. All four fields come from a single `creator_balances` read; there is no intermediate calculation table.

### Preconditions (checked in order)

1. Cookie session → `auth.getUser()` → `resolveProfileId(user.id, user.email)` (the 3-hop auth→users→profiles lookup). Returns `404` if no profile.
2. `creator_kyc.status === 'verified'` → else `403`. No payout is recorded until KYC clears.
3. `available_balance >= amount` → else `400`.

### Optimistic concurrency

```ts
// route.ts:63-76
const { data: updatedRows } = await supabaseAdmin
  .from('creator_balances')
  .update({ pending_payout: newPending })
  .eq('creator_id', profileId)
  .eq('pending_payout', balanceData.pending_payout)  // ← guard on the value we read
  .select('id');

if (!updatedRows || updatedRows.length !== 1) {
  return NextResponse.json({ error: 'Transaction collision. Please try again.' }, { status: 409 });
}
```

If two payout requests race, exactly one wins (the update guard changes the value the loser would match). The loser gets `409` and must retry.

### Payout status lifecycle

```
pending → initiated → processed
                   ↘ failed
```

The API only creates `pending` rows. Transitions to `initiated`, `processed`, and `failed` are performed manually (or by a future automation) outside this codebase today.

---

## 6. Referral Funding Model

**File:** `src/lib/server/referrals.ts`

### Commission formula

```ts
// referrals.ts:7-11
export function computeReferralCommission(total, rewardPercent, platformFee): number {
  const raw = Math.round(((total * rewardPercent) / 100) * 100) / 100;
  return Math.min(raw, platformFee);
}
```

Commission = `min(reward_percent × total / 100, platform_fee)`.

**The commission is drawn from DigiOne's platform fee share, not from the selling creator's proceeds.** The selling creator always receives `total × (1 − fee_rate)` regardless of whether a referral code was used.

### v1 scope

Only `referral_codes` with a non-null `owner_creator_id` earn commission. Codes owned only by a `owner_user_id` (buyer-side codes) are **tracked** (the `order_referrals` row is written) but `rewardPercent` is forced to `0` at attribution time (referrals.ts:46), so commission computation returns `0` and no ledger row is written.

### Idempotency

The `order_referrals` claim (`pending → settled`) is the guard — identical to the order's own atomic claim. A duplicate webhook call finds no `pending` row to claim and skips the commission entirely. The ledger `record_hash` (UNIQUE constraint) provides a second layer of replay protection.

---

## 7. Manual Money-Path Smoke Checklist

Run this against a local dev or staging environment to confirm the full flow end-to-end.

### (a) Referral capture at checkout

1. Get an active referral code from `referral_codes` where `is_active = true` and `owner_creator_id IS NOT NULL`.
2. POST to `/api/checkout/create` with `{ referralCode: "<CODE>", items: [...], contact: {...} }`.
3. Confirm `200` response with `payment_session_id` (or `status: 'completed'` for a free product).
4. Query DB:
   ```sql
   select status, referrer_creator_id, metadata
   from order_referrals
   where order_id = '<orderId>';
   ```
   Expected: one row, `status = 'pending'`, `referrer_creator_id` populated.

### (b) Commission settled after payment

5. Complete the payment in the Cashfree sandbox, or manually call:
   ```
   GET /payment/status?order_id=<orderId>
   ```
   (which calls `fulfillOrder` when the order is still pending and Cashfree says PAID).
6. Confirm order row:
   ```sql
   select status, gateway_payment_id from orders where id = '<orderId>';
   -- Expected: status = 'completed'
   ```
7. Confirm referrer's balance was credited **exactly once**:
   ```sql
   select count(*) from transaction_ledger
   where order_id = '<orderId>' and tx_type = 'referral_commission';
   -- Expected: 1
   ```
8. Confirm referral row was settled:
   ```sql
   select status, commission_amount from order_referrals where order_id = '<orderId>';
   -- Expected: status = 'settled', commission_amount > 0
   ```

### (c) Payout request

9. Ensure the creator has `creator_kyc.status = 'verified'`.
10. POST to `/api/payouts/request` (authenticated session):
    ```json
    { "amount": 100 }
    ```
11. Expected: `200 { success: true, payout: { status: "pending", ... } }`.
12. Confirm balance:
    ```sql
    select total_earnings, total_platform_fees, total_paid_out, pending_payout
    from creator_balances
    where creator_id = '<profileId>';
    -- pending_payout should have increased by 100
    ```

### (d) Refund flow

13. Refund a completed sandbox order: orders page → drawer → Refund (or `npx tsx --env-file=.env.local scripts/refund-admin.ts refund <orderId>`).
14. Confirm: `refunds` row `processing`; `creator_balances.frozen_balance` increased by `net_clawback`; a payout request for more than the new available 400s.
15. Deliver the REFUND_STATUS_WEBHOOK (Cashfree dashboard test event) or run `refund-admin.ts sync`.
16. Confirm: refund `success`; `total_earnings` −= amount; `total_platform_fees` −= fee_reversed; `frozen_balance` released; ledger `refund` debit exists; order `refunded` (full refunds); `user_product_access` rows for the order gone; `/api/deliverables/[productId]` now 403 for that buyer.
17. `select public.reconcile_creator_balances();` → 0 new drift rows.

---

## 8. Refunds

Freeze → gateway → webhook-settle, mirroring the payout pattern.

```
POST /api/refunds/create  (creator, own order)  OR  scripts/refund-admin.ts refund
   ↓
begin_refund RPC (atomic)
   ├─ lock orders row FOR UPDATE (serializes concurrent refunds; shared lock order with settle_refund)
   ├─ read original platform_fee from the sale transaction_ledger row (refuse if absent → 'refund:sale_ledger_missing')
   ├─ compute proportional split (completing refund takes the exact fee remainder)
   ├─ INSERT refunds (status 'processing', merchant_refund_id 'rfnd_…')
   ├─ creator_balances.frozen_balance += net_clawback
   └─ INSERT wallet_frozen_logs (status 'frozen', source 'refund')
   ↓
Cashfree POST /orders/{order_id}/refunds  (createRefund)
   ├─ rejected  → settle_refund('failed') immediately → freeze released, 502 to caller
   └─ accepted  → refund stays 'processing' until the terminal webhook/sync
   ↓
[terminal] REFUND_STATUS_WEBHOOK on /api/webhook/cashfree  (or refund-admin.ts sync → getRefund poll)
   → settle_refund(...) (claim-idempotent):
      SUCCESS  → total_earnings −= amount, total_platform_fees −= fee_reversed,
                 frozen_balance −= net_clawback, ledger 'refund' debit
                 (record_hash = sha256('refund:' + refundId)), release freeze log;
                 if sum(success refunds) ≥ order.total → orders.status='refunded' +
                 delete user_product_access / guest_entitlements for the order
      FAILED   → frozen_balance −= net_clawback (release only), release freeze log
```

**Proportional fee reversal (worked example — ₹1000 sale, 10% platform fee):**

| Refund | amount | fee_reversed | net_clawback (creator loses) |
|---|---|---|---|
| Full ₹1000 | 1000 | 100 | 900 |
| Partial ₹400 | 400 | 40 | 360 |

A fully refunded order nets to zero: the creator gives back their ₹900 proceeds and the platform gives up its ₹100 fee. Partial fees are `round(fee * amount / total, 2)`; the **completing** refund takes the exact fee remainder so paisa never accumulate.

**Cashfree `refund_status` mapping:** `SUCCESS → settle_refund('success')`; `CANCELLED | FAILED → settle_refund('failed')`; `PENDING | ONHOLD → no-op` (leave `processing`). `syncProcessingRefunds` additionally settles a confirmed 404 past the 15-min stale cutoff as `failed` (the create never reached Cashfree). Reconcile stuck refunds with `npx tsx --env-file=.env.local scripts/refund-admin.ts sync`.

**Invariants:**
- **One in-flight refund per order** — partial unique index `uq_refunds_one_processing_per_order (order_id) WHERE status='processing'`. Sequential partials work (wait for the previous to settle); a concurrent double-submit fails with a unique violation mapped to a friendly "already processing" 409.
- **No `frozen_balance` write outside the RPCs** (`begin_refund`/`settle_refund`/`freeze_creator_funds`/`release_frozen_funds`).

**⚠ Deployment precondition (Task 1 quality review):** refund surfaces must NOT be enabled in any environment until the gross-earnings fulfillment fix **and** the `total_earnings` net→gross backfill migration have both been applied there. Settling a refund against a net-shaped `total_earnings` (where the fee was double-counted) can drive `total_earnings` below zero, tripping `chk_creator_balances_nonneg` inside `settle_refund` and wedging the refund in `processing`.
