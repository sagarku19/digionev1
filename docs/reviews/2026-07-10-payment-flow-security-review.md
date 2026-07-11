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
npm run test:integration     # 38 tests across 8 files (the live-Cashfree test self-skips without CASHFREE_* creds)
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
| `fulfillment.integration.test.ts` | Credit path, idempotency, tax accrual, guest vs logged-in access, referral funding, coupon redemption, payment-link fulfillment |
| `refund.integration.test.ts` | Freeze-then-settle, proportional fee reversal, access revoke, guardrails |
| `payout.integration.test.ts` | Request guards (min/KYC/balance/in-flight), concurrency race, tax withholding, `settle_payout` success/fail |
| `payment-link.integration.test.ts` | `/api/checkout/payment-link` route: field/amount/site validation + pending submission creation |
| `webhook-security.integration.test.ts` | HMAC signature gate + idempotent fulfillment via the real webhook route |
| `checkout-security.integration.test.ts` | Server-side price verification, single-creator cart, free short-circuit |
| `rls.integration.test.ts` | Cross-tenant isolation with anon / signed-in JWTs (orders, balances, ledger, access, revenue-write block) |
| `cashfree-sandbox.integration.test.ts` | LIVE sandbox: `/api/checkout/create` makes a real Cashfree order that reads back `ACTIVE` (self-skips without `CASHFREE_*`) |

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

### 4. [MEDIUM — FIXED] "One in-flight payout" was not atomic (TOCTOU)

`/api/payouts/request` guards on a `SELECT` for an existing `pending`/`processing`
payout, but that check-then-insert is a TOCTOU window. A concurrency test fired two
simultaneous ₹100 requests for the same creator and **both returned 200** — two pending
payouts. The optimistic `pending_payout` compare-and-set still prevents *over-withdrawal*
(each request re-reads `pending_payout` and re-checks `available >= amount`, so the total
can never exceed the balance), so this is a **risk-control** gap, not a money-loss bug —
but the documented "one payout at a time" invariant was not actually enforced.

**Fixed:** partial unique index `uq_creator_payouts_one_inflight_per_creator (creator_id)
WHERE status IN ('pending','processing')` (migration `20260710000001…`), mirroring
`uq_refunds_one_processing_per_order`. The route now maps the 23505 insert violation to
409 and releases its reservation. The concurrency test now deterministically asserts one
200 + one 409 and a single payout row.

### 5. [LOW — FIXED] `api-routes.md` said payment-link "does not auto-create"

The doc claimed `/api/checkout/payment-link` does **not** auto-create a `payment_requests`
row. The route actually **does** auto-create one — but only after confirming the site is a
valid, active `payment` site (the real fix for the old abuse hole was the site check, not
removing the auto-create). Corrected the wording. Now covered by a payment-link route test.

## Constraint-drift sweep (follow-up)

Prompted by finding #1, I audited **all 33 enum-style CHECK constraints** in `public`
against the literal values the code actually writes (`notifications.type`,
`orders.status`, `refunds.status`, `creator_payouts.status`, `payment_submissions.
payment_status`, `tax_transactions.status`, `subscriptions.status`, `creator_kyc.status`,
`creator_payout_methods.status`, `order_referrals.status`, `wallet_frozen_logs.*`,
`preferred_payout_method`, …).

**Result: no further code-vs-constraint mismatches.** Every status/type/enum value written
by the app is within its constraint (`creator_payouts` correctly includes `processing`/
`reversed`; `notifications.type` only writes `sale`/`refund`; `preferred_payout_method`
is forced to `bank`/`upi`; etc.). The payment-link `completed` case (finding #1) was the
only real drift.

One **doc** inaccuracy found and fixed: `money-path.md` §9 said tax rows are inserted
`status = 'pending'`, but `record_sale_tax` inserts `'posted'` (the constraint only allows
`posted`/`reversed`; "unsettled" is the `settled` boolean). Corrected.

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

- **Live Cashfree** order creation + order-status read are now exercised against the real
  sandbox (`cashfree-sandbox.integration.test.ts`, when `CASHFREE_*` creds are present).
  Still **not** automatable in-harness: completing the hosted payment (needs a human on the
  sandbox checkout page — no public auto-pay API), real webhook delivery (Cashfree posts to
  the deployed `NEXT_PUBLIC_APP_URL`, not this process — but the signature gate is covered by
  `webhook-security.*`), the `/payment/status` post-payment reconcile, the **payout transfer
  + beneficiary creation**, `/api/admin/payouts/[id]/approve`, and the **Cashfree Payouts
  webhook signature**. The sandbox test's header documents the manual steps to finish a real
  end-to-end payment.

> Follow-up (2026-07-10, same review): RLS cross-tenant isolation, the payout concurrency
> race, coupon redemption, and the `/api/checkout/payment-link` route are **now covered**
> (see the file table above). The concurrency work surfaced + fixed finding #4.

---

## Changes made in this review

| File | Change |
|---|---|
| `supabase/migrations/20260710000000_fix_payment_submissions_status_check.sql` | **New** — fixes finding #1 (applied to the test project) |
| `supabase/migrations/20260710000001_one_inflight_payout_per_creator.sql` | **New** — fixes finding #4 (partial unique index; applied to the test project) |
| `src/lib/server/fulfillment.ts` | Skip ₹0 ledger insert (finding #2) |
| `app/api/payouts/request/route.ts` | Map the in-flight unique-violation to 409 + release reservation (finding #4) |
| `docs/db/money-path.md`, `.claude/rules/api-routes.md` | Doc-drift fixes (findings #3, #5, and payout-index note) |
| `vitest.integration.config.ts` | **New** — integration runner (own `@/` path resolver, sequential, DB timeouts) |
| `package.json` | Added `test:integration` script |
| `test/integration/**` | **New** — setup, world harness, 8 test files (38 tests; live-Cashfree self-skips without creds) |
