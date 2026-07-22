---
noteId: "301d36b0860711f18d3b85f38283563a"
tags: []

---

# Admin Dashboard — Reference

Everything the DigiOne **super_admin** can do today, where it lives, how it's secured, and what still needs building. This is the single source of truth for the admin surface.

> **Status (2026-07-23):** admin lives *inside* the creator app under `app/dashboard/admin/**` as an interim. The plan is to move it to a **standalone super_admin app** (`admin.digione.ai`) — see `.claude/todo-later/13(left)-2026-07-01-admin-app-scratch-plan.md`. This doc is written so that migration is a lift-and-shift: it lists every admin route, hook, page, RPC, and script, plus the auth/money invariants that must not change when it moves.

---

## 1. Who is an admin

- The only privileged role is **`super_admin`**, stored in **`public.users.role`** and mirrored into the JWT `app_metadata.role`.
- There is **no** admin write via RLS. `super_admin` gets **read-everything** through `SELECT` policies guarded by `public.is_super_admin()` (STABLE SECURITY DEFINER → `role = 'super_admin'` for the current `auth.uid()`). Every admin **mutation** goes through a service-role `/api/admin/*` route.
- **Golden rule:** every admin route **re-reads the role from the DB** (`select role from users where auth_provider_id = auth.uid()`), never trusting the JWT alone. The service client has no JWT, so `is_super_admin()` is false for it — the DB re-read is the gate.

```ts
// The auth check every /api/admin/* route repeats:
const { data: { user } } = await supabase.auth.getUser();          // cookie session
if (!user) return 401;
const db = createServiceClient();
const { data: actor } = await db.from('users').select('role').eq('auth_provider_id', user.id).maybeSingle();
if (actor?.role !== 'super_admin') return 403;                     // DB role, not JWT
```

### Where the gate is (and isn't)
- **Sidebar:** the "Admin" section (`src/components/dashboard/Sidebar.tsx`) renders only when `userRole === 'super_admin'`.
- **API routes:** DB-role re-read (above) — this is the real security boundary for actions.
- **Data:** RLS `is_super_admin()` SELECT policies — a non-admin who navigates directly to an admin page sees **empty tables** (RLS returns nothing) and cannot act (routes 403).
- **Known gap (interim):** the admin **pages** themselves have no page-level role guard — protection is RLS (data) + route checks (actions) + hidden nav. Acceptable for the interim because nothing sensitive renders or mutates without passing those two boundaries. The standalone admin app should add a middleware role gate. `proxy.ts` redirects non-creator roles away from `/dashboard/*`; `super_admin` is a superset of creator so it passes.

To grant admin: `update public.users set role = 'super_admin' where id = '<auth uuid>';` (then the user re-logs so the JWT `app_metadata.role` refreshes).

---

## 2. Admin surfaces in the app today

| Page | Purpose | Hook | Routes |
|---|---|---|---|
| `/dashboard/admin/payouts` | Payout approval queue — list all `creator_payouts`; Approve (→ Cashfree beneficiary + transfer), Reject (pending-only, reason), Sync (reconcile stuck `processing`) | `usePayoutQueue` | `POST /api/admin/payouts/[id]/approve`, `/reject`, `/sync` |
| `/dashboard/admin/refunds` | Refund-request queue — list all `refund_requests`; Approve (→ runs the refund engine + Cashfree), Reject (reason) | `useRefundRequests` | `POST /api/admin/refunds/[id]/approve`, `/reject` |

Both mirror the same shape: a `DataTable` of rows read via `is_super_admin()` RLS, with Approve/Reject mutations that hit `/api/admin/*`. Neither page fetches secrets client-side.

---

## 3. Admin API routes (complete)

| Route | Auth | What it does | Money/PII touched |
|---|---|---|---|
| `POST /api/admin/payouts/[id]/approve` | super_admin (DB re-read) | Resolve/create Cashfree beneficiary from KYC, `createTransfer` of `net_amount`, set payout `processing` | Decrypts bank/UPI (`KYC_ENCRYPTION_KEY`), Cashfree Payouts, `creator_payouts`, `creator_kyc.beneficiary_id` |
| `POST /api/admin/payouts/[id]/reject` | super_admin | `settle_payout('failed', reason)` — releases `pending_payout`, ledger reversal | `creator_balances`, `transaction_ledger` |
| `POST /api/admin/payouts/sync` | super_admin **or** `CRON_SECRET` bearer | Reconcile stuck `processing` payouts via Cashfree `getTransfer` → `settle_payout` | `creator_payouts`, `creator_balances` |
| `POST /api/admin/refunds/[id]/approve` | super_admin | `initiateRefund` (`begin_refund` + Cashfree PG refund) → `approve_refund_request` (release request hold, link refund) | `refunds`, `wallet_frozen_logs`, `creator_balances.frozen_balance`, `refund_requests` |
| `POST /api/admin/refunds/[id]/reject` | super_admin | `reject_refund_request` — release request hold, record reason | `wallet_frozen_logs`, `creator_balances.frozen_balance`, `refund_requests` |
| `GET /api/admin/kyc/[creatorId]/download` | super_admin | Mint a short-TTL signed URL for the creator's KYC doc (the **only** path into `digione-kyc-private`); writes `kyc_access_log` on every call | R2 `digione-kyc-private`, `kyc_access_log` |

All use `createServiceClient()` for the privileged write and `createClient()` (cookie) only to identify + role-check the actor.

---

## 4. The refund-request flow (end to end)

Refunds are **not** self-serve. The creator asks; the super_admin decides. Money is held from the moment the request is filed.

```
Creator order drawer → "Request refund" (amount + REQUIRED reason)
   → POST /api/refunds/request
   → create_refund_request RPC (atomic):
        validate order (completed/paid, sale ledger present, remaining, one-pending-per-order)
        FREEZE net clawback  → creator_balances.frozen_balance += net
                              → wallet_frozen_logs (status 'frozen', source 'refund')
        insert refund_requests (status 'pending', frozen_log_id)
   → row appears in /dashboard/admin/refunds

Super_admin → Approve
   → POST /api/admin/refunds/[id]/approve
   → initiateRefund → begin_refund (its OWN hold + refunds row) → Cashfree PG refund create
   → approve_refund_request (release the request-time hold, link refund_id, status 'approved')
   → terminal settlement later via REFUND_STATUS_WEBHOOK on /api/webhook/cashfree
        settle_refund('success') → reverse earnings/fee, release refund hold, ledger debit,
                                   flip order 'refunded' + revoke access (full refund)

Super_admin → Reject
   → POST /api/admin/refunds/[id]/reject (reason)
   → reject_refund_request (release the request-time hold, status 'rejected', review_reason)
   → no gateway call, nothing leaves
```

**Why freeze at request time:** the creator can't withdraw money that's pending a refund decision. The freeze is reconcile-safe — `reconcile_creator_balances()` expects `frozen_balance == sum(wallet_frozen_logs where status='frozen')`, and both `create_refund_request` and the release paths keep that invariant.

**Hold-before-release ordering (approval):** the approve route places the refund's hold (`begin_refund`) *before* releasing the request-time hold, so the balance is never briefly under-frozen. If the gateway rejects, the request stays `pending` and its hold intact — safe to retry.

**RPCs (all `security definer`, service-role only — `revoke execute ... from public/anon/authenticated`):**
- `create_refund_request(p_order_id, p_amount, p_reason, p_creator_id)` → freezes + records the request.
- `approve_refund_request(p_request_id, p_reviewer, p_refund_id)` → releases the request hold, links the refund.
- `reject_refund_request(p_request_id, p_reviewer, p_reason)` → releases the request hold.

**Table `refund_requests`** (migration `20260723000000_refund_requests.sql`): `order_id`, `creator_id`, `amount`, `fee_reversed`, `net_clawback`, `reason` (NOT NULL), `status` (`pending|approved|rejected`), `frozen_log_id`, `refund_id`, `review_reason`, `reviewed_by`, `reviewed_at`. Partial unique `uq_refund_requests_one_pending_per_order` (one open request per order). RLS: creator SELECT-own + super_admin SELECT-all; no client writes.

---

## 5. Data an admin can read (via `is_super_admin()` RLS)

`super_admin` has `SELECT` across the sensitive tables (read-only; writes are service-role routes): `orders`, `creator_balances`, `transaction_ledger`, `creator_payouts`, `refunds`, `refund_requests`, `wallet_frozen_logs`, `creator_kyc`, `kyc_documents`, `tax_transactions`, `invoices`, `balance_reconciliation_log`, and the rest of the 62-table set. This is what lets the admin queues read across **all** creators from the browser client while creators stay scoped to their own rows. Query `pg_policies` for the authoritative list.

---

## 6. Terminal admin scripts (interim ops without a UI)

Until each surface has a UI, these run from a trusted machine with the service-role env. All in `scripts/`:

| Script | Ops |
|---|---|
| `scripts/kyc-admin.ts` | List pending `creator_kyc`, view masked PII, **verify / reject** (the field-set the future KYC queue will reuse), mint signed doc URLs (logs `kyc_access_log`) |
| `scripts/refund-admin.ts` | Refund ops incl. `sync` (reconcile stuck `processing` refunds via Cashfree → `settle_refund`) |
| `scripts/subscription-admin.ts` | Subscription/plan admin (fee-tier plan management) |
| `scripts/tax-export.ts` | TDS/TCS/GST/tax-transaction exports for filing |

Other maintenance scripts: `backfill-payment-ids.ts`, `backfill-encrypt-kyc.ts`, `send-test-email.ts`.

---

## 7. What's NOT in the admin UI yet (build order)

From the standalone-app plan (todo-13 §3), still terminal-only or unbuilt:

1. **KYC verification queue** — list `creator_kyc where status='pending'`, masked PII + signed doc URLs (`kyc_documents`, logs `kyc_access_log`), Verify / Reject(reason). Replaces `scripts/kyc-admin.ts`.
2. **Ledger + balance viewer** — `transaction_ledger`, `creator_balances`, `balance_reconciliation_log`; run `reconcile_creator_balances()`, investigate drift.
3. **Creator management** — search creators, view profile/KYC/payout history, suspend, audited adjustments.
4. **Tax / invoice ops** — TDS/TCS/GST statements, Form 16A, GSTR exports, invoice re-issue.
5. **`admin_actions` audit log** — a generalized who-did-what-to-whom for **every** privileged write (today only `kyc_access_log` exists, for doc access).

---

## 8. Invariants the admin surface must always preserve

Carry these unchanged into any future admin app:

- **Service-role key is server-only.** Never shipped to the browser; only `/api/admin/*` (or the admin app's own server routes) hold it.
- **DB role re-read on every privileged write** — JWT `app_metadata.role` alone is never trusted for money/PII actions.
- **Money mutations go through the same DB primitives** — `settle_payout`, `credit_creator_balance`, `begin_refund`/`settle_refund`, `create_refund_request`/`approve_refund_request`/`reject_refund_request` — so idempotency, single-finalizer, and ledger discipline hold identically no matter who calls them.
- **KYC PII** decrypts server-side only (`KYC_ENCRYPTION_KEY`), only when needed, and logs every doc access to `kyc_access_log`. To the browser: only masked `*_last4` + short-TTL signed URLs.
- **Frozen-balance reconciliation** — any freeze/release must keep `frozen_balance == sum(wallet_frozen_logs where status='frozen')`.

---

## 9. Migrating admin OUT of DigiOne (when the standalone app reaches parity)

Per surface, remove from DigiOne once the admin app covers it (keep the shared money/KYC primitives + webhooks):

- `app/dashboard/admin/**` (payouts + refunds pages) and `src/hooks/admin/**` (`usePayoutQueue`, `useRefundRequests`).
- `app/api/admin/**` (payouts approve/reject/sync, refunds approve/reject, kyc download).
- The `super_admin` sidebar section + the `/dashboard/admin/*` allowance in `proxy.ts`.
- Terminal scripts as their UI equivalents ship (`kyc-admin.ts` → KYC queue, etc.).

**Keep in DigiOne:** the Cashfree webhooks (`/api/webhook/cashfree`, `/api/webhook/cashfree-payout`) unless explicitly moved; all **creator-facing** flows including the payout **request** and the refund **request** (`POST /api/refunds/request`) — those are creator features, not admin. The `initiateRefund`/`begin_refund`/`settle_refund` + `create/approve/reject_refund_request` RPCs stay (the admin console reuses them).

Update `.claude/rules/*` + `docs/reference/*` in the same change-set as each removal — the doc-drift Stop hook enforces it.

---

## 10. Reference

- Standalone admin-app plan: `.claude/todo-later/13(left)-2026-07-01-admin-app-scratch-plan.md`
- Money path: `docs/db/money-path.md`; refunds/freeze primitives: `supabase/migrations/20260704000000_phase4_refunds_risk.sql`; refund requests: `supabase/migrations/20260723000000_refund_requests.sql`
- Routes: `.claude/rules/api-routes.md`; security/RLS: `.claude/rules/security-model.md`; hooks: `.claude/rules/hooks-reference.md`; pages: `docs/reference/dashboard-map.md`
- Payout/KYC engine: `src/lib/server/{cashfree-payouts,kyc-crypto,kyc-verify}.ts`; refund engine: `src/lib/server/refunds.ts` + `src/lib/server/refund-requests.ts`
