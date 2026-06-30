---
noteId: "578a51a0747e11f193a7f790bf9449ed"
tags: []

---

# Phase 1 — Cashfree Payouts (real money movement) — design spec

**Date:** 2026-06-30 · **Status:** design (approved-in-session, pending written review)
**Parent blueprint:** `.claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md` (§8 Phase 1)
**Builds on:** Phase 0 (`docs/superpowers/specs/2026-06-30-phase0-money-hardening-design.md`) — uses its live `settle_payout()` RPC as the single payout finalizer.

> Phase 1 makes payouts actually move money via **Cashfree Payouts V2**, behind a **super_admin approval gate**.
> It reuses Phase 0's hardened accounting (`settle_payout`, `frozen_balance`, single balance formula) and adds the
> beneficiary→transfer→webhook integration. Refunds/reserves/clearing stay in Phase 4; the admin gate is the interim safety valve.

---

## 0. Goals / non-goals

**Goals:**
1. A creator can request a withdrawal; a **super_admin approves**; money is sent via Cashfree Payouts; the
   webhook settles it through Phase 0's `settle_payout()` (ledger debit + `total_paid_out` + hold release).
2. The payout **destination is derived from the verified KYC bank** — no separate payout-method management UI.
3. **No scheduler** — webhook is authoritative; stuck/missed `processing` payouts reconcile via **lazy on-read +
   a manual "Sync statuses" button** (the route is built cron-ready for a future Phase).
4. Money never moves without a human approval; every transition is idempotent and signature-verified.

**Non-goals (deferred):**
- Refunds, `frozen_balance` writes, clearing period, rolling reserve, dispute freeze → **Phase 4**.
- Separate creator-managed payout methods (multiple banks/UPI, penny-drop add-flow) → later; Phase 1 derives one from KYC.
- Admin **KYC** review UI + verification provider → **Phase 2** (KYC verification stays a manual super_admin status flip).
- Tax withholding (TDS/TCS) shown at withdraw time → **Phase 5**.
- Batch payouts, payout schedules, retries-with-backoff → later.
- A cron/pg_cron scheduler → explicitly out (decision); the reconcile route is cron-ready for when it's added.

---

## 1. Prerequisites + grounded Cashfree Payouts facts

**Prerequisite (flag before go-live):** Cashfree **Payouts** is a *separate product* from the Payment Gateway used in
checkout. It needs its own activation and API credentials, and (for bank transfers) a funded payout balance. Phase 1 is
built and tested against **sandbox** first.

**Cashfree Payouts V2 (verified 2026-06-30 via official docs):**
- **Base URLs:** production `https://api.cashfree.com/payout` · sandbox `https://sandbox.cashfree.com/payout`.
- **Auth:** V2 uses header auth — `x-client-id`, `x-client-secret`, `x-api-version` (the **Payouts** credentials, *not*
  the PG ones). The exact `x-api-version` value + whether a `/v2/authorize` bearer step is needed must be confirmed
  against the live API reference during planning (Payouts has historically had both token-auth and direct-header auth).
- **Endpoints (paths to confirm against the live reference in the plan):**
  - Create beneficiary: `POST {base}/v2/beneficiary` — `{ beneficiary_id, beneficiary_name, bank account no + IFSC and/or VPA, contact details }`.
  - Initiate transfer: `POST {base}/v2/transfers` — `{ transfer_id, transfer_amount, transfer_mode (banktransfer|upi), beneficiary_details:{ beneficiary_id } }`.
  - Get transfer: `GET {base}/v2/transfers/{transfer_id}` (status reconciliation).
- **Webhook signature (verified):** the classic Payouts webhook is **form-POST**: take all POST params **except**
  `signature`, **sort by key**, **concatenate the values**, **HMAC-SHA256** with the **oldest active API key's client
  secret**, **base64-encode**, and compare (constant-time) to the `signature` param. Events: **`TRANSFER_SUCCESS`**
  (`transferId, referenceId, acknowledged, eventTime, utr`) and **`TRANSFER_FAILED`** (`transferId, referenceId, reason`).
  - ⚠️ **Variant to confirm in the plan:** newer Payouts webhooks can be JSON with an `x-webhook-signature` +
    `x-webhook-timestamp` HMAC (like the PG webhook). The implementation MUST match the variant configured for *this*
    account's webhook. Document the chosen variant inline.
  - `acknowledged = 0` means debited-but-not-yet-credited (await `TRANSFER_ACKNOWLEDGED`). For our ledger, `TRANSFER_SUCCESS`
    = money left the platform = settle as success; the credit-confirmation nuance is recorded in `gateway_metadata`, not a separate state.

Sources: [Payouts webhooks](https://www.cashfree.com/docs/payouts/payouts/make-payouts/webhooks),
[Payouts V2 reference](https://www.cashfree.com/docs/api-reference/payouts/v2),
[Payouts endpoints](https://www.cashfree.com/docs/api-reference/vrs/v2/end-point).

---

## 2. Current state (grounded live, 2026-06-30)

| Object | State | Phase 1 action |
|---|---|---|
| `app/api/payouts/request/route.ts` | Live: KYC-verified gate, `availableBalance` (incl. frozen), optimistic `pending_payout += amount`, inserts `creator_payouts {status:'pending'}` | Add **min-payout** guard + set `payout_method_id`; no money moves here (unchanged otherwise) |
| `public.settle_payout()` | Live + tested (Phase 0) — atomic balance+ledger payout finalizer | **Reused** as the only terminal mutation; called by reject + webhook |
| `creator_payouts` | 0 rows; has `payout_method_id`, `gateway_*`, `failure_reason`; status CHECK `pending/processing/success/failed` | **Fix `status` default** `'initiated'`→`'pending'`; write `processing` on approve |
| `creator_payout_methods` | 0 rows; bank/UPI cols, `type` enum, `is_default`, `version`, `status` default `'pending'`; RLS `*_all_own` | Auto-create **one verified row** from KYC (non-secret fields + `account_last4` only) |
| `creator_kyc.beneficiary_id` / `beneficiary_metadata` | exist, null | Populate on Cashfree beneficiary creation (service-role) |
| `creator_payout_requests` / `_items` | dead | **Stay dead** (YAGNI); `payout_request_id` null |

---

## 3. Architecture & payout state machine

```
Creator: Withdraw ₹X — POST /api/payouts/request  (hardened: + min ₹100, + payout_method_id)
  guards: KYC 'verified' · ₹100 ≤ X ≤ availableBalance(incl frozen)
  → optimistic pending_payout += X · INSERT creator_payouts {status:'pending'}
        │
        ▼
super_admin: approval queue (/dashboard/admin/payouts)
  ├─ REJECT (only while status='pending') → settle_payout(id,'failed') → release hold, no money moves
  └─ APPROVE → POST /api/admin/payouts/[id]/approve  (super_admin re-checked server-side):
        1. ensure beneficiary: if kyc.beneficiary_id null → decrypt KYC bank → POST /v2/beneficiary → store id
        2. atomic claim: UPDATE creator_payouts SET status='processing' WHERE id=? AND status='pending' RETURNING
              (0 rows → already claimed, abort)
        3. POST /v2/transfers { transfer_id: payout.id, beneficiary, amount, mode }
              ├─ accepted   → stay 'processing' (await webhook)
              └─ rejected/err → settle_payout(id,'failed') → release hold (creator can re-request)
        │
        ▼
Cashfree processes (async)
        │
        ▼
POST /api/webhook/cashfree-payout   (signature-verified, separate from PG webhook)
  ├─ TRANSFER_SUCCESS → settle_payout(id,'success') → ledger 'payout' debit + total_paid_out += X + release hold
  └─ TRANSFER_FAILED  → settle_payout(id,'failed')  → release hold, no debit
```

**Invariants:**
- `settle_payout()` is the **only** terminal mutation, called by exactly two sites (reject, webhook). Phase 0 idempotency holds.
- `transfer_id = creator_payouts.id` → Cashfree dedupes duplicate transfers; our atomic status claim dedupes approves.
- **Reject is gated on `status='pending'`** — impossible to reject after the transfer fired (kills the reject-vs-success race).
- Webhook is authoritative; `GET /v2/transfers/{id}` is the reconciliation fallback (see §6).

---

## 4. Schema deltas (one migration)

1. **`creator_payouts.status` default → `'pending'`** (was `'initiated'`, now CHECK-invalid).
   `alter table public.creator_payouts alter column status set default 'pending';`
2. **`creator_payout_methods.account_last4 text`** (new column). Phase 1 stores only **non-secret** destination fields:
   `account_holder_name`, `ifsc_code`, `bank_name`, `type`, `status='verified'`, `is_default=true`, `account_last4`.
   **`account_number` stays NULL** — the real number lives encrypted in `creator_kyc`, decrypted server-side only at
   beneficiary creation. (IFSC/holder/last4 are non-secret → existing `*_all_own` RLS is fine.)
3. No new tables. No `frozen_balance` writes. `creator_payout_requests`/`_items` untouched.

**Env (new, server-only secrets) — document in `env-vars.md` + `.env.example`:**
`CASHFREE_PAYOUT_CLIENT_ID`, `CASHFREE_PAYOUT_CLIENT_SECRET`, `CASHFREE_PAYOUT_ENVIRONMENT` (`SANDBOX|PRODUCTION`),
and the payout **webhook signature secret** (the oldest active Payouts API key secret, if it differs from the request secret).

**Config constant:** `MIN_PAYOUT_INR = 100` in a small server lib (e.g. `src/lib/server/payout-policy.ts`), single source.

**Fee policy (decided):** the **platform absorbs** the Cashfree per-transfer fee. The creator receives the full requested
amount and `settle_payout` debits exactly `payout.amount` — **no fee ledger line, no `amount requested ≠ amount sent`**.
(The fee is a platform operating cost, trivial next to the 10% commission; revisit only if it ever becomes material.)

---

## 5. Server units (isolated, testable)

| Unit | Responsibility |
|---|---|
| `src/lib/server/cashfree-payouts.ts` | Thin Payouts client: `createBeneficiary()`, `initiateTransfer()`, `getTransfer()`, `verifyPayoutWebhookSignature()`, base-URL/creds resolution. Never imported client-side. Mirrors the PG client's structure but with Payouts creds. |
| `src/lib/server/payout-policy.ts` | `MIN_PAYOUT_INR`; helper to build a `creator_payout_methods` display row + Cashfree beneficiary payload from a decrypted KYC bank. |
| `app/api/payouts/request/route.ts` (modify) | + min-payout guard, + set `payout_method_id` (ensure/derive the KYC method row). |
| `app/api/admin/payouts/[id]/approve/route.ts` | super_admin re-checked via `is_super_admin()`; ensure beneficiary → claim `processing` → initiate transfer → on transfer error `settle_payout('failed')`. |
| `app/api/admin/payouts/[id]/reject/route.ts` | super_admin; only while `pending`; `settle_payout('failed')` + store reason. |
| `app/api/admin/payouts/sync/route.ts` | super_admin (or cron-secret) — polls `GET /v2/transfers/{id}` for `processing` payouts older than N min → `settle_payout` accordingly. **Cron-ready** (a future Vercel Cron calls this exact route). |
| `app/api/webhook/cashfree-payout/route.ts` | signature-verify (constant-time) → route `TRANSFER_SUCCESS`/`TRANSFER_FAILED` → `settle_payout`. Returns 2xx on already-processed (idempotent). |

KYC bank decryption uses Phase 0's `decryptField` (`src/lib/server/kyc-crypto.ts`); the `_enc` columns are now `text` (Phase 0).

---

## 6. Reconciliation — no scheduler (decision)

The webhook is primary. For missed/stuck `processing` payouts, **no cron**:
- **Lazy on-read:** when a super_admin opens `/dashboard/admin/payouts`, the server polls Cashfree for any `processing`
  payout older than N minutes (via the sync route) and settles it — self-heals exactly when someone's looking.
- **Manual "Sync statuses" button** → same `POST /api/admin/payouts/sync` route, on demand.
- **Cron-ready:** the sync route accepts either a super_admin session **or** a shared `CRON_SECRET` header, so a future
  Vercel Cron can call it with zero new code. Phase 0's `reconcile_creator_balances()` may be invoked from the same route
  now that real payout data exists (alert-only; still never auto-corrects).

---

## 7. Edge cases / idempotency / error handling

| Case | Handling |
|---|---|
| Double-approve / double-click | Atomic `UPDATE … WHERE status='pending' RETURNING` (0 rows = no-op) + Cashfree `transfer_id` dedupe. |
| Reject after transfer fired | Reject gated on `status='pending'`; once `processing`, only the webhook settles. |
| Transfer-init fails (4xx/5xx) | `settle_payout('failed')` → release hold; creator re-requests. No stuck `processing` from a known failure. |
| Transfer call times out (unknown) | Stays `processing` → sync route (`GET /v2/transfers/{id}`) resolves: settle, or revert if Cashfree never got it. |
| Late/duplicate webhook | `settle_payout` claim (`status IN ('pending','processing')`) → no-op on repeat. |
| Webhook for failed/rejected payout | `settle_payout` finds no claimable row → no-op (reject can't fire post-`processing`, so no money-moved-but-failed contradiction). |
| Invalid webhook signature | 401, do not process. Constant-time compare. |
| Beneficiary already exists at Cashfree | Check `kyc.beneficiary_id` first; treat Cashfree "already exists" as success. |
| KYC bank decrypt fails / missing | Abort approval → payout stays `pending`, admin sees error, no money moves. |
| Crash between beneficiary-created and transfer-init | Retry-safe: beneficiary idempotent, `transfer_id` dedupes. |
| Amount integrity | `settle_payout` debits the **recorded** `payout.amount`; webhook amount is informational only. |
| Underfunded payout balance | Transfer fails → `settle_payout('failed')` → hold released; admin sees reason. |

---

## 8. UI/UX (follow `.claude/rules/dashboard-design.md`)

**Creator** (`/dashboard/earnings`): a `SideDrawer` withdraw flow — shows the single KYC-derived destination
("Payout to HDFC ••••1591"), amount input (₹100 ≤ X ≤ available), `ConfirmDialog` → `POST /api/payouts/request`.
KYC-not-verified → CTA to `/dashboard/settings/billing`. Payout history `DataTable` + `StatusPill`
(`pending/processing/success/failed`). No tax preview (Phase 5).

**Admin** (`/dashboard/admin/payouts`, super_admin, re-checked server-side): pending queue (creator · amount ·
destination ••••last4 · requested-at) with **Approve** (`ConfirmDialog`) / **Reject** (reason, pending-only);
terminal history; **"Sync statuses"** button. Add a Sidebar entry visible only to super_admin.

---

## 9. Security

- All Cashfree Payouts calls are server-only (`cashfree-payouts.ts`); secrets never reach the browser.
- Admin routes re-read `is_super_admin()` server-side — JWT role is not trusted for money actions.
- Webhook signature verification is mandatory + constant-time; reject on mismatch.
- `creator_payouts`/`creator_balances`/`transaction_ledger` writes remain service-role only; `settle_payout` is the only debit path.
- Payout destination = KYC-verified account (AML-aligned); the full account number is never duplicated out of encrypted `creator_kyc`.
- `/api/admin/payouts/sync` dual-auths (super_admin session OR `CRON_SECRET`); the secret is server-only.

---

## 10. Testing

- **Unit:** `verifyPayoutWebhookSignature` (known fixture + tamper-reject), beneficiary/transfer request builders (pure),
  min-payout/amount guards, the KYC-bank→beneficiary-payload mapper. `settle_payout` already covered (Phase 0).
- **Integration:** webhook route (bad signature → 401; `TRANSFER_SUCCESS`/`FAILED` → correct `settle_payout`); approve route
  (status claim, beneficiary-exists branch, transfer-error → failed); reject route (pending-only guard).
- **Manual (mandatory before prod):** full **Cashfree sandbox** run — request → approve → sandbox transfer → webhook →
  settled; verify ledger debit + `total_paid_out` + hold release; verify a forced `TRANSFER_FAILED` releases the hold.
- Per `.claude/rules/verification.md` Lane 2, the signature verifier + the webhook routing are the highest-ROI tests.

---

## 11. Sequencing / what carries forward

- **Reconcile scheduler:** intentionally not built; the cron-ready sync route is the seam. Revisit when payout volume grows.
- **Phase 2** (KYC verify UI + provider) may move beneficiary creation to KYC-approval time; Phase 1 creates it lazily at first approval.
- **Phase 4** adds refunds/clearing/reserve/`frozen_balance` writes — at which point the admin gate can relax toward auto-payout.
- **Phase 5** adds TDS/TCS withholding shown at withdraw + netted from the payout.

---

## 12. Open items to confirm during planning

1. Exact V2 auth (`x-api-version` value / whether `/v2/authorize` bearer is needed) — confirm against live reference + sandbox.
2. Exact V2 beneficiary + transfer request/response schemas — confirm against live reference.
3. Which **webhook signature variant** this account uses (legacy sorted-params vs V2 `x-webhook-signature`) — match it, document inline.
4. `processing`-staleness threshold N for the sync poll (proposed: 15 min).
5. Confirm Cashfree Payouts is activated + sandbox creds available.

---

## 13. Reference

- Phase 0 spec/plan: `docs/superpowers/specs|plans/2026-06-30-phase0-money-hardening*`
- Live finalizer: `public.settle_payout()` · balance helper: `src/lib/shared/balance.ts`
- PG patterns to mirror (not reuse): `app/api/webhook/cashfree/route.ts`, `src/lib/server/fulfillment.ts`, `.claude/rules/cashfree-reference.md`
- Rules: `.claude/rules/{security-model,api-routes,env-vars,dashboard-design}.md`
- Cashfree Payouts: [webhooks](https://www.cashfree.com/docs/payouts/payouts/make-payouts/webhooks) ·
  [V2 reference](https://www.cashfree.com/docs/api-reference/payouts/v2)
