---
noteId: "7d3371c05cdc11f1b92a4b3b6ebe345a"
tags: []

---

# Cashfree Reference

Working reference for editing anything that touches Cashfree. DigiOne uses the Cashfree **Payment Gateway (PG) v2023-08-01** REST API directly via `fetch` — not the Node SDK — plus the browser checkout SDK on the buyer side.

> Related: [`api-routes.md`](./api-routes.md), [`security-model.md`](./security-model.md), [`env-vars.md`](./env-vars.md).

## Environments

| Env | Base URL | Set by |
|---|---|---|
| Sandbox | `https://sandbox.cashfree.com/pg` | `CASHFREE_ENVIRONMENT !== 'PRODUCTION'` |
| Production | `https://api.cashfree.com/pg` | `CASHFREE_ENVIRONMENT === 'PRODUCTION'` |

Hosted checkout URL pattern (built in `app/api/checkout/payment-link/route.ts:168`):

```
sandbox:    https://payments-test.cashfree.com/order/#{payment_session_id}
production: https://payments.cashfree.com/order/#{payment_session_id}
```

**The client-side mirror** is `NEXT_PUBLIC_CASHFREE_ENV` — must match the server value or sandbox-signed sessions will fail to redirect to prod (or vice versa).

## Auth headers — every Cashfree request

```typescript
{
  'Content-Type':    'application/json',
  'x-api-version':   '2023-08-01',
  'x-client-id':     process.env.CASHFREE_CLIENT_ID!,
  'x-client-secret': process.env.CASHFREE_CLIENT_SECRET!,
}
```

Don't change `x-api-version` without reviewing every call site — request and response schemas are pinned to it. Search this repo for `'2023-08-01'` before bumping.

## Flow 1 — Product checkout

```
[buyer clicks Buy]
   ↓
POST /api/checkout/create                            (our server)
   ├─ Re-fetch product prices from DB (never trust client)
   ├─ Validate coupon via src/lib/server/coupons.ts (if provided)
   ├─ INSERT orders (status: 'pending', metadata: { coupon_id, discount_amount })
   ├─ INSERT order_items
   ├─ If total === 0: fulfillOrder() immediately → { status: 'completed' }
   └─ Else: POST {CASHFREE_ENV}/orders → { payment_session_id }
   ↓
[client receives payment_session_id]
   ↓
[Cashfree JS SDK opens hosted checkout]
   ↓
[user pays on Cashfree]
   ↓
[parallel]
 ├─ Browser → /payment/status?order_id=...           (checks DB first; calls Cashfree only if still pending)
 │             └─ If PAID: fulfillOrder()             (same function as webhook)
 └─ Cashfree → POST /api/webhook/cashfree            (THE source of truth)
                ↓
                ├─ Verify HMAC (crypto.timingSafeEqual)
                ├─ Route: ord_* → fulfillOrder(); pl_* → fulfillPaymentLinkSubmission()
                └─ fulfillOrder: atomic claim → credit RPC → ledger → notify → access grants → coupon
```

Reference: `app/api/checkout/create/route.ts`, `app/api/webhook/cashfree/route.ts`, `src/lib/server/fulfillment.ts`.

## Flow 2 — Payment link (custom-amount)

Same idea, different tables. Used by sites of type `payment` where the buyer enters their own amount.

```
POST /api/checkout/payment-link
   ├─ Look up (or auto-create) payment_requests row
   ├─ INSERT payment_submissions (payment_status: 'pending')
   └─ POST {CASHFREE_ENV}/orders → payment_session_id
```

Returns `payment_url` so the page can redirect directly to the hosted checkout. Reference: `app/api/checkout/payment-link/route.ts`.

## Creating an order

`POST {CASHFREE_ENV}/orders` with body:

```jsonc
{
  "order_id": "ord_<our-uuid-no-dashes>",        // our reference, must be unique
  "order_amount": 999,                           // number, INR. 1 paisa precision OK
  "order_currency": "INR",
  "customer_details": {
    "customer_id":    "<our-stable-id>",
    "customer_name":  "<from contact>",
    "customer_email": "<from contact>",
    "customer_phone": "9999999999"               // 10 digits, no country code; default '0000000000' if missing
  },
  "order_meta": {
    "return_url": "${NEXT_PUBLIC_APP_URL}/payment/status?order_id={order_id}",
    "notify_url": "${NEXT_PUBLIC_APP_URL}/api/webhook/cashfree"
  }
}
```

Success response (status 200, fields we care about):

```jsonc
{
  "order_id":            "ord_...",
  "payment_session_id":  "session_...",
  "order_status":        "ACTIVE",
  "order_amount":        999,
  "order_currency":      "INR"
}
```

**Hand the `payment_session_id` to the browser SDK or build the hosted URL with it.** Do not embed `x-client-secret` anywhere browser-reachable.

## Webhook — `POST /api/webhook/cashfree`

The **only** path that flips an order to `completed` and credits a creator. Read this whole section before changing it.

### 1. Signature verification (mandatory)

```typescript
const rawBody = await req.text();                                    // exact bytes, no JSON parse
const expected = Buffer.from(
  crypto.createHmac('sha256', CASHFREE_CLIENT_SECRET)               // HMAC-SHA256
    .update(rawBody)
    .digest('base64')                                               // base64, not hex
);
const received = Buffer.from(signature);
if (expected.length !== received.length ||
    !crypto.timingSafeEqual(expected, received)) return 401;        // constant-time compare
```

The HMAC key is the **same** `CASHFREE_CLIENT_SECRET` you use for API calls. Signature header is `x-webhook-signature`. Reference: `app/api/webhook/cashfree/route.ts`.

Compute the HMAC **before** `JSON.parse`. If you parse and re-stringify you'll get a different byte sequence and every webhook will fail.

Use `crypto.timingSafeEqual` — not `===` — to prevent timing-based signature oracle attacks.

### 2. Payload shape (v2023-08-01)

```jsonc
{
  "data": {
    "order": {
      "order_id": "ord_...",      // matches orders.gateway_order_id
      "order_amount": 999,
      "order_currency": "INR"
    },
    "payment": {
      "cf_payment_id": "...",    // store as orders.gateway_payment_id
      "payment_status": "SUCCESS" // | "FAILED" | "USER_DROPPED" | "PENDING"
    },
    "customer_details": { ... }
  },
  "event_time": "...",
  "type": "PAYMENT_SUCCESS_WEBHOOK" // or PAYMENT_FAILED_WEBHOOK, ...
}
```

Per Cashfree's own docs, when reconciling: **dedupe by `cf_payment_id`**, not by `order_id`. A single order can have multiple payment attempts (FAILED → PENDING → SUCCESS). Update the order only on the final terminal status.

### 3. Idempotency

Cashfree retries non-2xx responses. The handler must:

- Use the atomic claim in `fulfillOrder` (`UPDATE orders SET status='completed' WHERE id=? AND status='pending'`). Zero rows updated = already processed → return `200 { received: true }` without re-processing.
- Return `200` even when the order isn't found in our DB (avoids permanent retry storms from stray test events).
- Only return non-2xx for actual processing failures we want Cashfree to retry.

### 4. Status mapping

| Cashfree `payment_status` | DigiOne `orders.status` |
|---|---|
| `SUCCESS` | `completed` (also credit balance, write ledger, notify) |
| `FAILED` | `failed` |
| `USER_DROPPED` | `failed` |
| `PENDING` | leave as `pending` |

### 5. Side effects on `SUCCESS`

All side effects are executed by `src/lib/server/fulfillment.ts` (`fulfillOrder` for product orders, `fulfillPaymentLinkSubmission` for `pl_` orders), in order:

1. Atomic claim: `UPDATE orders SET status='completed' WHERE id=? AND status='pending'`. Zero rows = already done, return early.
2. Credit `creator_balances` via `credit_creator_balance` RPC. Platform fee rate from `getPlatformFeeRate()` in `src/lib/server/platform-fee.ts` (currently 0.10 — a single place to change for future tiers).
3. Insert `transaction_ledger` row with `record_hash = sha256(orderId + ':' + cf_payment_id)` (UNIQUE — replays are rejected by the DB).
4. Insert `notifications` row for the creator.
5. Grant `user_product_access` rows for logged-in buyers (UNIQUE on `(order_id, product_id)` — idempotent).
6. Redeem coupon via `increment_coupon_uses` RPC if `orders.metadata.coupon_id` is set.

All use the service-role client. RLS does not apply.

## Checking order status (server-side)

`/payment/status` checks DB status **first**. Only when the order is still `pending` does it call Cashfree:

```typescript
const res = await fetch(`${CASHFREE_ENV}/orders/${gatewayOrderId}`, {
  headers: {
    'x-api-version':   '2023-08-01',
    'x-client-id':     process.env.CASHFREE_CLIENT_ID!,
    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET!,
  },
  cache: 'no-store',
});
const data = await res.json();
data.order_status; // "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED" | ...
```

`PAID` → calls `fulfillOrder` (same function as the webhook). `EXPIRED | USER_DROPPED | DROPPED | FAILED` → sets `orders.status = 'failed'`. Anything else → still pending.

**Payment-id reconcile (2026-07-08):** before calling `fulfillOrder`, the status page also fetches `GET {CASHFREE_ENV}/orders/{gatewayOrderId}/payments`, extracts the SUCCESS payment's `cf_payment_id`, and passes it as `{ gatewayPaymentId }` (same for `fulfillPaymentLinkSubmission`). This keeps `orders.gateway_payment_id` populated and the ledger `record_hash` identical to the webhook path — no more `:free`-suffixed hashes for status-page-reconciled paid orders. A failed payments fetch falls back to fulfilling without a payment id.

`/payment/status` and `/payment/receipt` use `createServiceClient()` — no more module-scope raw `createClient(URL, SERVICE_KEY)`.

**This is a reconciliation path for the user-facing race**, not the authoritative path. Treat the webhook as authoritative; this exists to handle the case where the user lands on the status page before the webhook arrives. The shared `fulfillOrder` function ensures both paths produce the same result.

## Browser SDK — `@cashfreepayments/cashfree-js`

Installed at `^1.0.6` (`package.json`). `types/cashfree.d.ts` is a one-liner `declare module` — no real types ship with the package, so callsites can use any shape. Keep that in mind when changing the SDK's API surface.

### Where it's used in this repo

| File | Trigger | Returns to | Free-order short-circuit? |
|---|---|---|---|
| `app/(buyer)/checkout/page.tsx` | Cart checkout (`Pay ₹X` button) | `/payment/status?order_id=...` | Yes |
| `app/(marketing)/discover/[productId]/BuyNowButton.tsx` | Product-page Buy Now (ledger checkout) | `/payment/status?order_id=...` | Yes |
| `src/components/storefront/PaymentLinkPage.tsx` | Payment-link sites (custom amount) | `/payment/status?order_id=...&sub=...` | N/A (no free path on payment links) |

### The reference call pattern (use this shape)

```typescript
import { load } from '@cashfreepayments/cashfree-js';

const res  = await fetch('/api/checkout/create', { /* ... */ });
const data = await res.json();
if (!res.ok) throw new Error(data.error ?? 'Checkout failed');

// Free-order short-circuit — the API returns no payment_session_id when total === 0.
if (data.status === 'completed') {
  window.location.href = `/payment/status?order_id=${data.orderId}`;
  return;
}

const cashfree = await load({
  mode: data.environment === 'production' ? 'production' : 'sandbox',
});
cashfree.checkout({
  paymentSessionId: data.payment_session_id,
  returnUrl:        `${window.location.origin}/payment/status?order_id=${data.orderId}`,
});
```

Three things to copy exactly:

1. **Read `mode` from `data.environment`** (the API response), not from `process.env.NEXT_PUBLIC_CASHFREE_ENV`. The API normalises to lowercase `'production' | 'sandbox'` and that's the contract the SDK expects. See the bug note below.
2. **Free-order short-circuit before calling `cashfree.checkout()`.** A free order returns `{ status: 'completed' }` with no session — calling `checkout({ paymentSessionId: undefined })` throws.
3. **`returnUrl` is the option the SDK reads.** Cashfree also honours the `order_meta.return_url` set server-side, but the browser-passed `returnUrl` wins. Keep both pointing at `/payment/status?order_id=...` so it doesn't matter which wins.

### SDK options actually in use

| Option | Used in | Notes |
|---|---|---|
| `mode` | `load({ mode })` | `'sandbox'` or `'production'`. Picked per the table above. |
| `paymentSessionId` | `cashfree.checkout({ paymentSessionId })` | Comes from the server response. |
| `returnUrl` | `cashfree.checkout({ returnUrl })` | Always `${window.location.origin}/payment/status?order_id=${orderId}` (payment-link adds `&sub=${submission_id}`). |
| `redirectTarget` | Not passed | SDK default is `_self`. Don't use `_blank` — it breaks the post-payment return because Cashfree relies on the same-tab referrer. (discover BuyNowButton.tsx, PaymentLinkPage.tsx) |

### Server `order_meta.return_url` vs browser `returnUrl`

Both are set today:

- **Server** (in `/api/checkout/create:145` and `/api/checkout/payment-link:125`) sets `order_meta.return_url = ${NEXT_PUBLIC_APP_URL}/payment/status?order_id={order_id}`. Cashfree substitutes `{order_id}`.
- **Browser** passes `returnUrl` to `cashfree.checkout(...)`. Cashfree gives this precedence when using the JS SDK flow.

Net effect: the browser value wins for SDK-driven flows, the server value wins for hosted-redirect flows (e.g. the `payment_url` returned by `/api/checkout/payment-link`). Keep them aligned.

## Common tasks

### Add a new field to the order body

Adjust the body in `app/api/checkout/create/route.ts:134-148` (and the parallel one in `payment-link/route.ts:114-128`). Cashfree ignores unknown fields, so dropping in `order_tags` for analytics is safe. Don't put PII in `order_id` or `customer_id` — they're echoed in URLs.

### Switch sandbox ↔ production

1. Set `CASHFREE_ENVIRONMENT=PRODUCTION` and `NEXT_PUBLIC_CASHFREE_ENV=PRODUCTION`.
2. Swap `CASHFREE_CLIENT_ID` + `CASHFREE_CLIENT_SECRET` to the prod merchant credentials.
3. In Cashfree dashboard → Webhooks, point the production webhook URL at `https://digione.ai/api/webhook/cashfree`.
4. Test signature verification end-to-end. Sandbox webhooks won't fire to prod and vice versa.

### Debug a webhook failure

1. Cashfree dashboard → Developers → Webhooks → see retry attempts.
2. Check `console.warn('[webhook/cashfree] Invalid signature')` in your logs — that's the most common cause.
3. If signature is OK but order isn't found, the `gatewayOrderId` in the webhook doesn't match `orders.gateway_order_id`. Usually means the order create call to Cashfree silently used a different `order_id` than what we stored.
4. The handler returns 200 on "order not found" to stop retry storms — check logs, not webhook UI, for these.

### Trigger a test webhook

Cashfree dashboard → Developers → Webhooks → "Test event". Pick `PAYMENT_SUCCESS_WEBHOOK` and the test order. It'll fire with a real HMAC signature against our endpoint.

## Gotchas

- **Never call Cashfree from the browser.** All API calls go through `/api/checkout/*`. The `x-client-secret` is a server secret.
- **Don't parse-and-restringify the webhook body** before HMAC. The signature is over the raw bytes. Use `await req.text()` and pass that exact string to `createHmac`.
- **Base64, not hex.** `crypto.createHmac(...).digest('base64')` — hex comparison fails silently. Also use `crypto.timingSafeEqual` (not `===`) to prevent timing oracle attacks.
- **Idempotency is on us.** Cashfree will retry. The handler must produce the same result on the second call as on the first (and not double-credit balances).
- **Phone number format.** Cashfree expects 10 digits, no country code. The current code passes `'0000000000'` as a fallback (`/api/checkout/create/route.ts:142`). This is enough for the gateway to accept but Cashfree may bounce the order if it fails their internal validation in some regions — pass a real phone where you can.
- **Currency is hardcoded `INR`.** Multi-currency is out of scope.
- **Free orders skip Cashfree entirely.** `total === 0` calls `fulfillOrder` directly from `/api/checkout/create`. Reference: `app/api/checkout/create/route.ts`, `src/lib/server/fulfillment.ts`. Don't add Cashfree calls in that path.
- **Single-creator cart constraint.** All items must share `creator_id`. Reference: `app/api/checkout/create/route.ts:40-43`. If you ever lift this, payouts and platform-fee math must split per creator.
- **No retry on Cashfree 5xx in `/api/checkout/create`.** A 502 leaves a `pending` `orders` row and a `failed` Cashfree session. A reconciliation job would clean these up; we don't have one yet.

## Reference

- Cashfree PG API docs: https://www.cashfree.com/docs/api-reference/payments/latest
- Webhook reference: https://www.cashfree.com/docs/payments/online/webhooks
- Webhook idempotency best practices: https://www.cashfree.com/docs/payments/online/webhooks/webhook-indempotency
- Browser SDK: https://www.cashfree.com/docs/payments/online/web-integration
