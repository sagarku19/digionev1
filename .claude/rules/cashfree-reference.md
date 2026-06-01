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
   ├─ INSERT orders (status: 'pending')
   ├─ INSERT order_items
   └─ POST {CASHFREE_ENV}/orders                    (to Cashfree)
        → { payment_session_id }
   ↓
[client receives payment_session_id]
   ↓
[Cashfree JS SDK opens hosted checkout]
   ↓
[user pays on Cashfree]
   ↓
[parallel]
 ├─ Browser → /payment/status?order_id=...           (returns status page)
 └─ Cashfree → POST /api/webhook/cashfree            (THE source of truth)
                ↓
                ├─ Verify HMAC signature
                ├─ UPDATE orders SET status='completed'
                ├─ UPDATE creator_balances (+ ledger row)
                └─ INSERT notifications
```

Reference: `app/api/checkout/create/route.ts`, `app/api/webhook/cashfree/route.ts`.

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
const expected = crypto.createHmac('sha256', CASHFREE_CLIENT_SECRET) // HMAC-SHA256
  .update(rawBody)
  .digest('base64');                                                 // base64, not hex
if (signature !== expected) return 401;
```

The HMAC key is the **same** `CASHFREE_CLIENT_SECRET` you use for API calls. Signature header is `x-webhook-signature`. Reference: `app/api/webhook/cashfree/route.ts:12-29`.

Compute the HMAC **before** `JSON.parse`. If you parse and re-stringify you'll get a different byte sequence and every webhook will fail.

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

- Return `200 { received: true }` for orders already in `completed` or `refunded` (skip work). Reference: `app/api/webhook/cashfree/route.ts:52-55`.
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

In order:

1. `orders.status = 'completed'`, set `gateway_payment_id`, `payment_verified_at`.
2. Credit `creator_balances`: `+ (total_amount × 0.9)` to `total_earnings`, `+ 10%` to `total_platform_fees`. **Platform fee is hardcoded at `route.ts:75`** — lift to config before adding tiers.
3. Insert `transaction_ledger` row with `record_hash = sha256(order_id + timestamp)`.
4. Insert `notifications` row for the creator.

All four use the service-role client. RLS does not apply.

## Checking order status (server-side)

Used by `/payment/status` to verify before showing success:

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

Reference: `app/payment/status/page.tsx:31-47`. Status string mapping in `cfToDbStatus()` at `:49`.

`PAID` → completed. `EXPIRED | USER_DROPPED | DROPPED | FAILED` → failed. Anything else → pending.

**This is a read-side reconciliation path only.** Treat the webhook as authoritative for state transitions; this status check exists to handle the case where the user lands on the success page before the webhook arrives.

## Browser SDK — `@cashfreepayments/cashfree-js`

Installed at `^1.0.6` (`package.json`). `types/cashfree.d.ts` is a one-liner `declare module` — no real types ship with the package, so callsites can use any shape. Keep that in mind when changing the SDK's API surface.

### Where it's used in this repo

| File | Trigger | Returns to | Free-order short-circuit? |
|---|---|---|---|
| `app/(buyer)/checkout/page.tsx:42-51` | Cart checkout (`Pay ₹X` button) | `/payment/status?order_id=...` | **No** — assumes `payment_session_id` always present |
| `app/(storefront)/store/product/[productId]/BuyNowButton.tsx:31-39` | Single-product Buy Now | `/payment/status?order_id=...` | Yes — redirects directly when `data.status === 'completed'` |
| `app/(storefront)/upsells/[slug]/UpsellCheckoutClient.tsx:84-96` | Upsell page checkout (primary + add-ons) | `/payment/status?order_id=...` | Yes |
| `src/components/storefront/PaymentLinkPage.tsx:46-56` | Payment-link sites (custom amount) | `/payment/status?order_id=...&sub=...` | N/A (no free path on payment links) |

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

### Inconsistencies in current code — fix on next touch

These are live in the repo and worth knowing before you copy from any one site:

| File | Issue |
|---|---|
| `app/(buyer)/checkout/page.tsx:45` | Checks `process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production'` (lowercase) — but `.env.example` sets it to `SANDBOX`/`PRODUCTION` (uppercase). **Result: this page never picks production mode even when the env says it should.** Switch to `data.environment === 'production'` like the other three. |
| `app/(buyer)/checkout/page.tsx` (no short-circuit) | Doesn't handle the free-order case. If `total === 0`, the API returns `{ status: 'completed' }` with no `payment_session_id` and the SDK call will throw. Add the `if (data.status === 'completed')` branch before `load(...)`. |
| `app/(buyer)/checkout/page.tsx:43` | Uses dynamic `import('@cashfreepayments/cashfree-js')` with `// @ts-ignore`. The other three use static `import { load } from '...'`. Static is the convention here (the type declaration in `types/cashfree.d.ts` exists specifically so static imports don't need `@ts-ignore`). |
| `BuyNowButton.tsx`, `UpsellCheckoutClient.tsx`, `PaymentLinkPage.tsx` | Do not pass `redirectTarget`. SDK default is `_self`, which is what we want — fine, but be explicit if you ever need a popup. |

### SDK options actually in use

| Option | Used in | Notes |
|---|---|---|
| `mode` | `load({ mode })` | `'sandbox'` or `'production'`. Picked per the table above. |
| `paymentSessionId` | `cashfree.checkout({ paymentSessionId })` | Comes from the server response. |
| `returnUrl` | `cashfree.checkout({ returnUrl })` | Always `${window.location.origin}/payment/status?order_id=${orderId}` (payment-link adds `&sub=${submission_id}`). |
| `redirectTarget` | Not passed | SDK default is `_self`. Don't use `_blank` — it breaks the post-payment return because Cashfree relies on the same-tab referrer. |

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
- **Base64, not hex.** `crypto.createHmac(...).digest('base64')` — getting hex out and comparing fails silently.
- **Idempotency is on us.** Cashfree will retry. The handler must produce the same result on the second call as on the first (and not double-credit balances).
- **Phone number format.** Cashfree expects 10 digits, no country code. The current code passes `'0000000000'` as a fallback (`/api/checkout/create/route.ts:142`). This is enough for the gateway to accept but Cashfree may bounce the order if it fails their internal validation in some regions — pass a real phone where you can.
- **Currency is hardcoded `INR`.** Multi-currency is out of scope.
- **Free orders skip Cashfree entirely.** `total === 0` is completed inline. Reference: `app/api/checkout/create/route.ts:114-122`. Don't add Cashfree calls in that path.
- **Single-creator cart constraint.** All items must share `creator_id`. Reference: `app/api/checkout/create/route.ts:40-43`. If you ever lift this, payouts and platform-fee math must split per creator.
- **No retry on Cashfree 5xx in `/api/checkout/create`.** A 502 leaves a `pending` `orders` row and a `failed` Cashfree session. A reconciliation job would clean these up; we don't have one yet.

## Reference

- Cashfree PG API docs: https://www.cashfree.com/docs/api-reference/payments/latest
- Webhook reference: https://www.cashfree.com/docs/payments/online/webhooks
- Webhook idempotency best practices: https://www.cashfree.com/docs/payments/online/webhooks/webhook-indempotency
- Browser SDK: https://www.cashfree.com/docs/payments/online/web-integration
