---
noteId: "a125f7007c4a11f1b7ddffeec518d7f9"
tags: []

---

# Payment-flow integration + security review — 2026-07-10

End-to-end review of the money path **buy → fulfill → refund → payout**, plus the
security controls around it. Backed by a new **integration test suite** that runs the
real route handlers, fulfillment engine, refund engine, and the actual Postgres RPCs
against the live test Supabase project (`qcendfisvyjnwmefruba`).

> The default `npm test` (unit) stays hermetic and creds-free. The integration suite is
> opt-in and DB-backed.

## How to run

```bash
npm run test:integration     # 26 tests across 5 files, ~3.5 min (network-bound)
npm test                     # unchanged unit suite (148 tests)
```

The suite loads `.env.local` (see `test/integration/setup.ts` — it parses the file by
hand because Next skips `.env.local` under `NODE_ENV=test`) and **strips the Resend keys
so no email is ever sent**. Each file seeds its own creators/buyers/products via
`auth.admin.createUser` (the real `handle_new_user` trigger builds `users`+`profiles`,
exactly like production) and tears everything down in `afterAll`. Teardown was verified
to leave **zero** residual rows and zero orphaned ledger rows.

Files:

| File | What it proves |
|---|---|
| `test/integration/world.ts` | Seeding + teardown harness (creator/buyer/product/order/referral/payment-link) |
| `fulfillment.integration.test.ts` | Credit path, idempotency, tax accrual, guest vs logged-in access, referral funding, payment-link fulfillment |
| `refund.integration.test.ts` | Freeze-then-settle, proportional fee reversal, access revoke, guardrails |
| `payout.integration.test.ts` | Request guards (min/KYC/balance/in-flight), tax withholding, `settle_payout` success/fail |
| `webhook-security.integration.test.ts` | HMAC signature gate + idempotent fulfillment via the real webhook route |
| `checkout-security.integration.test.ts` | Server-side price verification, single-creator cart, free short-circuit |

---

## Findings

### 1. [HIGH — FIXED] Payment-link sales were never credited (schema/code mismatch)

`payment_submissions.payment_status` had a CHECK constraint allowing only
`('pending','paid','failed')`, but the code's vocabulary is
`'pending' | 'completed' | 'failed' | 'refunded'`:

- `fulfillPaymentLinkSubmission` (`src/lib/server/fulfillment.ts:280`) claims the row with
  `UPDATE … SET payment_status='completed' WHERE payment_status='pending'`.
- The webhook (`app/api/webhook/cashfree/route.ts:108`) and status page
  (`app/payment/status/page.tsx:134`) read/write `'completed'`/`'refunded'`.
- `'paid'` (the only terminal the constraint allowed) is **never written anywhere**.

**Impact:** every custom-amount payment-link sale threw a check-constraint violation on
the claim UPDATE → `fulfillPaymentLinkSubmission` re-threw → the webhook returned 500 →
Cashfree retried the webhook forever → the submission stayed `pending` and **the creator
was never credited**. A silent, total failure of the payment-link money path.

**Fix (applied):** migration
`supabase/migrations/20260710000000_fix_payment_submissions_status_check.sql` aligns the
constraint to the code's vocabulary (`pending|completed|failed|refunded`) and migrates any
legacy `'paid'` rows. Applied to the test project. Now covered by a passing integration
test (`fulfillment … fulfillPaymentLinkSubmission credits the creator resolved via site ownership`).

### 2. [LOW — FIXED] Free orders emitted a swallowed ledger error

`transaction_ledger` enforces `amount > 0` (`transaction_ledger_amount_check`), so a ₹0
free-order sale insert failed and was caught-and-logged by fulfillment. Behaviourally
correct — a free order moves no money, so having no ledger row is right — but it logged a
`console.error` on every free order.

**Fixed:** `fulfillOrder` now skips the ledger insert when `total === 0`
(`src/lib/server/fulfillment.ts`). Replay safety is unaffected (the atomic order claim
already guards it).

### 3. [LOW — FIXED] `docs/db/money-path.md` §4 showed the pre-gross-fix crediting

The doc showed `credit_creator_balance({ p_earnings_delta: creatorProceeds, … })` and a
hardcoded 10% fee. The **actual** code credits `p_earnings_delta: total` (GROSS) and takes
the rate from `getPlatformFeeRate()` (subscription-driven). The integration test asserts the
real behaviour (`total_earnings=1000` gross, `total_platform_fees=100` separately).

**Fixed:** the §4 snippet + prose now show gross crediting and the subscription-driven
`getPlatformFeeRate()`.

---

## Security properties confirmed solid (each backed by a passing test)

- **Webhook is the only door, and it's locked.** Missing signature → 401; forged signature
  → 401; valid HMAC-SHA256 (base64, constant-time `timingSafeEqual`) → processed. Verified
  end-to-end against the real route.
- **Idempotent fulfillment.** The atomic `pending → completed` claim makes webhook replays
  no-ops — a replayed SUCCESS leaves `total_earnings`/`total_platform_fees` unchanged (no
  double credit). Deterministic `record_hash` has a UNIQUE backstop.
- **Server-side price verification.** A checkout body lying with `price: 99999` is ignored;
  the order is charged the DB price (₹500). Client never sets the amount.
- **Cart integrity.** Empty cart → 400; unpublished product → 400; mixed-creator cart → 400.
- **Free-order short-circuit** completes without contacting the gateway and still grants a
  (guest) entitlement.
- **`total_earnings` is GROSS**, `availableBalance()` subtracts the fee — verified against
  the live balance after a sale.
- **Referral commission is funded from the platform fee** — the seller's proceeds are
  unchanged; the referrer is credited `min(reward%, platformFee)`; settlement is idempotent.
- **Refunds freeze-then-settle.** Freeze holds the net clawback before any reversal; settle
  reverses gross + proportional fee; a full refund nets the balance to zero, flips the order
  to `refunded`, and revokes access; a partial refund keeps the order completed and access
  intact. Blocked when the sale ledger row is missing, and only one refund may be in-flight
  per order.
- **Payout guards.** Below-min (400), unverified KYC (403), insufficient balance (400),
  one in-flight payout at a time (409). TDS/TCS withheld and `net_amount` computed at request.
  `settle_payout('success')` pays the net, releases the reservation, settles the tax rows,
  and writes the payout ledger debit; `settle_payout('failed')` releases without paying.

---

## Not covered (honest scope boundaries → recommended next)

- **Live Cashfree calls** are stubbed (refund gateway) or not exercised (order creation,
  payout transfer + beneficiary creation, `/payment/status` reconciliation polling). These
  need a real sandbox + a real completed payment. The **Cashfree Payouts webhook signature**
  and `/api/admin/payouts/[id]/approve` are not integration-tested here.
- **RLS boundaries** (anon/creator/buyer isolation) — these tests use the service role by
  design; RLS is a separate surface worth its own suite (attempt cross-tenant reads/writes
  with anon + a creator JWT).
- **Payout optimistic-concurrency race** — only the one-in-flight guard is tested; the
  `pending_payout` compare-and-set collision (409) isn't forced as a true race.
- **Coupon redemption at fulfillment** — not asserted (no coupon seeded).
- **`/api/checkout/payment-link` route** (custom-amount submission creation) — only the
  downstream `fulfillPaymentLinkSubmission` is covered.

---

## Changes made in this review

| File | Change |
|---|---|
| `supabase/migrations/20260710000000_fix_payment_submissions_status_check.sql` | **New** — fixes finding #1 (applied to the test project) |
| `vitest.integration.config.ts` | **New** — integration runner (own `@/` path resolver, sequential, DB timeouts) |
| `package.json` | Added `test:integration` script |
| `test/integration/**` | **New** — setup, world harness, 5 test files (26 tests) |
