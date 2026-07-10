---
noteId: "admin-app-scratch-plan-20260701"
tags: []
---

# Separate Admin App — from-scratch plan (super_admin console)

**Captured:** 2026-07-01 · **Status:** `(left)` — plan only, not started.
**Decision:** admin functionality does **NOT** belong in the DigiOne creator app. It moves to a **standalone
super_admin Next.js app**. Until that app exists, admin operations run from the **terminal** (see Phase 2:
`scripts/kyc-admin.ts`, and Phase 1's payout admin lives temporarily at `/dashboard/admin/payouts`).

> This is a *decision record + build plan* for a **new, separate repo/app**, not work inside DigiOne. When it's
> built, the transitional admin surfaces currently inside DigiOne get **removed** (see §6 Migration).

---

## 1. Why a separate app

- **Security blast-radius:** the admin console needs the Supabase **service-role key** (RLS-bypassing) and
  privileged operations (verify KYC, approve payouts, issue refunds). Shipping that surface alongside the
  public creator app widens the attack surface and risks the service key leaking into a creator-reachable build.
- **Separation of concerns:** creator features vs. platform operations are different products with different
  users, auth, deploy cadence, and uptime needs.
- **Least privilege:** the creator app should hold NO admin code paths. `/dashboard/admin/*` in DigiOne today
  is a stopgap and is slated for removal.
- **Auditability:** a dedicated app centralizes admin action logging (who verified/approved/refunded what).

---

## 2. Architecture

- **Standalone Next.js 16 app**, its own repo + Vercel project, served at a locked-down host (e.g.
  `admin.digione.ai`, ideally behind IP allowlist / VPN / Cloudflare Access).
- **Same Supabase project** (`qcendfisvyjnwmefruba`) — the admin app talks to the same DB. Reads can use the
  existing `is_super_admin()` / `public.is_super_admin()`-gated RLS SELECT policies; **writes go through the
  admin app's own server routes using the service-role key** (never the browser).
- **Auth:** Supabase Auth, but gated to `super_admin` only — the app refuses any non-super_admin session at the
  middleware layer (re-read `users.role` server-side, never trust JWT alone, matching the money-route rule).
  Consider a second factor (TOTP) given the privilege level.
- **No shared code import from DigiOne** initially (separate repo). Shared money/KYC *logic* that must not
  diverge (e.g. `settle_payout` semantics, `verifyKyc` field-set, `kyc-crypto`) is either (a) duplicated with a
  test that pins the contract, or (b) later extracted to a shared package. Start with (a); revisit if drift hurts.
- **Design system:** its own lightweight system (does not need DigiOne's creator/ledger design languages);
  optimize for dense operational tables, not marketing polish.

---

## 3. Admin surfaces (functional scope)

Build in this order (each is a vertical slice: DB reads via RLS, writes via service-role routes):

1. **KYC verification queue** — list `creator_kyc` where `status='pending'`; detail view with masked PII +
   **signed doc URLs** (from `kyc_documents`, logging `kyc_access_log`); **Verify** / **Reject (reason)** →
   calls the same field-set as Phase 2's `verifyKyc`/`rejectKyc`. Replaces `scripts/kyc-admin.ts`.
   *(Provider hook: a "Run PAN/bank check" button when a verification provider is wired.)*
2. **Payout approval queue** — the Phase 1 flow, **migrated** out of DigiOne: list `creator_payouts`, Approve
   (beneficiary → transfer), Reject (pending-only), Sync statuses. Reuses `settle_payout`, `cashfree-payouts`.
3. **Refunds / disputes console** — Phase 4 (Cashfree refund API + ledger reversal + `frozen_balance` clawback).
   **Decision (2026-07-10):** refunds move **entirely to admin**, triggered on a buyer **dispute** — creators do
   **not** self-refund. The creator-facing self-refund path in DigiOne (`RefundPanel` in
   `app/dashboard/orders/page.tsx` + `POST /api/refunds/create`) is slated for **removal** (see §6). Because of
   that, the server-side "block a creator refund when `available_balance` < clawback" guard is intentionally
   **not** built in DigiOne — it's moot once creators can't self-refund. The guard that exists there today is
   **UI-only** (disables the refund button, `orders/page.tsx` `RefundPanel`, via `useEarnings`) and is fine as an
   interim. The `initiateRefund` / `begin_refund` / `settle_refund` primitives stay — the admin console reuses them.
4. **Ledger + balance viewer** — read `transaction_ledger`, `creator_balances`, `balance_reconciliation_log`;
   run `reconcile_creator_balances()`; investigate drift. Also the payout reconcile ("Sync") lives here.
5. **Creator management** — search creators, view profile/KYC/payout history, suspend, adjust (audited).
6. **Tax / invoices ops** (Phases 5–6) — TDS/TCS/GST statements, Form 16A, GSTR exports, invoice re-issue.

**Cross-cutting:** an `admin_actions` audit log (who did what, when, to whom) — every privileged write records a
row. (DigiOne has `kyc_access_log` for doc access; the admin app generalizes this to all admin mutations.)

---

## 4. Data-access + security rules (carry from DigiOne)

- Service-role key is **server-only** in the admin app; never shipped to the browser.
- Every privileged write re-reads `users.role='super_admin'` server-side (JWT not trusted for money/PII actions).
- Money mutations still go through the **same DB primitives** (`settle_payout`, `credit_creator_balance`, the
  future refund RPC) so invariants (idempotency, single-finalizer, ledger discipline) hold identically.
- KYC PII: the admin app decrypts (holds `KYC_ENCRYPTION_KEY`) only server-side, only when needed, and logs
  every doc access to `kyc_access_log`. No PII to the browser beyond masked `*_last4` + signed short-TTL URLs.
- Webhooks (Cashfree Payouts) can stay pointed at DigiOne **or** move to the admin app — decide at migration time;
  whoever owns `settle_payout` calls owns the webhook. Simpler: keep the webhook in DigiOne (it's unauthenticated +
  signature-verified) and let the admin app only drive approve/reject/sync.

---

## 5. Build phases (for the admin app itself)

- **A0 — Scaffold:** new Next.js app, Supabase clients (browser RLS + server service-role), super_admin-only
  middleware, base layout + a dense table UI kit, deploy to a locked host.
- **A1 — KYC verification queue** (replaces `scripts/kyc-admin.ts`).
- **A2 — Payout approval queue** (migrate from DigiOne; then remove from DigiOne — §6).
- **A3 — Ledger/balance + reconcile viewer.**
- **A4 — Refunds/disputes** (with Phase 4).
- **A5 — Creator management + `admin_actions` audit.**
- **A6 — Tax/invoice ops** (with Phases 5–6).

---

## 6. Migration OUT of DigiOne (do when the admin app reaches parity per surface)

Remove from DigiOne once the admin app covers each:
- `app/dashboard/admin/payouts/page.tsx` + `src/hooks/admin/usePayoutQueue.ts` (Phase 1 admin UI).
- `app/api/admin/payouts/[id]/approve`, `.../reject`, `app/api/admin/payouts/sync`.
- `app/api/admin/kyc/[creatorId]/download`.
- The `super_admin` branch + `/dashboard/admin/*` gate in `proxy.ts`; the super_admin sidebar link.
- `scripts/kyc-admin.ts` (superseded by A1).
- `app/api/refunds/create` + the `RefundPanel` self-refund UI in `app/dashboard/orders/page.tsx` (refunds become
  admin/dispute-only per §3.3). Keep the `initiateRefund`/`begin_refund`/`settle_refund` primitives + the refund
  webhook branch — the admin console reuses them.
Keep in DigiOne: the **webhook** (`/api/webhook/cashfree-payout`) unless explicitly moved; all **creator-facing**
KYC (submit, doc upload, wizard) and payout **request** flow. Update `.claude/rules/*` + `docs/reference/*` in the
same change-set as each removal (the doc-drift Stop hook will enforce it).

---

## 7. Open decisions (resolve when starting A0)

- Admin app repo: brand-new repo vs a `apps/admin` in a monorepo with DigiOne (shared packages for money/KYC logic).
- Host lockdown: Cloudflare Access vs IP allowlist vs just super_admin + TOTP.
- Shared-logic strategy: duplicate-with-contract-test now vs extract a `@digione/money` package.
- Whether the Cashfree Payouts webhook moves to the admin app or stays in DigiOne.

---

## 8. Reference

- Phase 2 spec (terminal interim + doc upload): `docs/superpowers/specs/2026-07-01-phase2-kyc-verification-design.md`
- Money/KYC primitives to reuse: `settle_payout`, `credit_creator_balance`, `src/lib/server/{kyc-crypto,kyc-verify,cashfree-payouts,fulfillment}.ts`
- The overhaul blueprint: `.claude/todo-later/12(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md`
- Rules: `.claude/rules/security-model.md`, `.claude/rules/api-routes.md`, `.claude/rules/supabase-reference.md`
