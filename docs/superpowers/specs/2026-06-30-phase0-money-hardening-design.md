---
noteId: "b3ca1c60745711f193a7f790bf9449ed"
tags: []

---

# Phase 0 — Money-path hardening — design spec

**Date:** 2026-06-30 · **Status:** ✅ IMPLEMENTED + applied to live (2026-06-30)

> **Execution deviations (discovered while building):** (1) the `*_enc` columns were **`bytea`**, not text — the
> `enc:v1:` envelope round-tripped as `\x` hex and broke decrypt; the migration converts them **bytea→text**
> losslessly. (2) `creator_kyc(creator_id)` already had a unique **index** (`idx_kyc_creator`), so the constraint-add
> is index-aware (no-op) and the route upsert worked pre-migration. (3) The live KYC row got encrypted via the new
> route before the backfill ran → **backfill was moot** (script retained). (4) Live e2e was done via the new 4-step
> KYC **wizard** (`billing/page.tsx`), not the old single form. Plan + plan-doc tasks all green; see the parent
> blueprint's "Phase 0 execution notes".
**Parent blueprint:** `.claude/todo-later/11(left)-2026-06-30-payments-earnings-payout-kyc-overhaul.md` (§8 Phase 0)
**Scope decision:** full hardening bundle (blueprint "Approach 2"), corrected against live schema.

> This spec supersedes the half-written, uncommitted `supabase/migrations/20260630000000_phase0_money_hardening.sql`
> and its companion files. Those artifacts are the starting point; this spec lists what must change before
> any of it touches the live DB. **The migration as written would fail on apply** (see §2, record_hash).

---

## 1. Goals / non-goals

**Goals (close the live risk, make the existing flow correct):**
1. Close the **KYC self-verify gate bypass** (bug #1) — creators can no longer write `status`/`*_verified`.
2. Close the **plaintext PAN/bank/UPI** hole (bug #2) — PII encrypted at rest, only `*_last4` readable.
3. Make payout completion **accounting-correct** (bug #3) — a settled payout writes a ledger debit, bumps
   `total_paid_out`, releases `pending_payout`, atomically.
4. **Single source of truth** for available balance (bug #6) — server route and client hook compute identically.
5. Pre-install the inert plumbing later phases need (`frozen_balance`, payout status vocab, reconciliation)
   so Phase 1/4 don't each need a fresh `creator_balances` migration.

**Non-goals (explicitly deferred):**
- Cashfree Payouts integration / the webhook that *calls* `settle_payout` → **Phase 1**.
- KYC verification provider + **admin review UI** → **Phase 2**. Interim: a `super_admin` flips
  `creator_kyc.status` manually via MCP/SQL. No verification UI ships in Phase 0.
- Provider tokenization of PII → **Phase 2** (app-layer AES-256-GCM is the Phase 0 at-rest floor).
- KYC **document image** upload (PAN card / cheque) → **Phase 2**. Phase 0 handles text fields only.
- `frozen_balance` *writers* (disputes/refunds) → **Phase 4**. The column + CHECK land now; nothing writes it yet.
- A reconciliation **scheduler** → deferred to Phase 1 (function ships now, run manually via MCP).
- Tax engine, subscriptions, invoices → Phases 3/5/6.

---

## 2. Grounded current state (verified live, 2026-06-30)

Queried via Supabase MCP against project `qcendfisvyjnwmefruba`. These facts drive the corrections in §4.

| Object | Live fact | Consequence |
|---|---|---|
| `transaction_ledger.record_hash` | type **`bytea`**; `fulfillment.ts:65-68` writes `sha256(...).digest('hex')` (a hex string, stored as its 64 ASCII bytes) | `settle_payout`'s `'payout:'\|\|id` text literal **fails to insert into bytea** — must produce a valid bytea hash matching this convention |
| `transaction_ledger.direction` | enum **`('credit','debit')`** | `'debit'` is valid ✅ |
| `transaction_ledger` columns | has dedicated **`payout_id uuid`**; `prev_hash`/`balance_after` exist but are **NULL/unused** (no hash-chain) | `settle_payout` should set `payout_id`; no chain to maintain ✅ |
| `credit_creator_balance` | **balance-only** SQL RPC; ledger row is written separately in app code (`fulfillment.ts`) | confirms the architectural split; see decision D1 |
| `creator_kyc` policies | `creator_kyc_insert_own` (INSERT), `creator_kyc_update_own` (UPDATE), `creator_kyc_select_own` + `creator_kyc_admin_select` (SELECT) | the two write-policy names **match** the migration's `drop` statements ✅ |
| `creator_kyc` data | **1 row**, `status='pending'`, **plaintext PAN + bank** present, no UPI, **0 verified** | lockdown strands no verified creator; backfill is one row (§4-D) |
| `creator_payouts` | **0 rows**; real status CHECK = `('pending','initiated','processed','failed')`; constraint name `creator_payouts_status_check` matches | safe to repoint vocab; grep for stray `'initiated'`/`'processed'` readers |
| `creator_balances` | **2 rows**, **no negatives**; `frozen_balance` absent | non-negative CHECK is data-safe; add column safely |
| `pg_cron` | **not installed** | in-DB schedule would silently no-op → ship function unscheduled (decision) |

---

## 3. Architecture overview

Two independent units of work that ship as **one atomic change-set** (the apply order in §6 guarantees no
window where KYC submission is broken):

- **Unit A — KYC hardening** (bugs #1, #2): RLS lockdown + a new service-role write route + encryption +
  client rewrite + one-row backfill. Every piece is exercised on ship.
- **Unit B — Payout/balance accounting** (bugs #3, #6, plus inert Phase-1/4 plumbing): `frozen_balance`,
  status vocab, the corrected `settle_payout()` RPC, the reconciliation function, and unifying the
  available-balance formula across route + hook.

Unit B's `settle_payout` has **no caller until Phase 1** — it ships as correct, tested, inert SQL.

---

## 4. The change-set

### Unit A — KYC hardening

**A1. RLS lockdown (migration).** Drop `creator_kyc_insert_own` + `creator_kyc_update_own`. Keep
`creator_kyc_select_own` + `creator_kyc_admin_select`. After this, creators may only **read** their row;
all writes are service-role. Update the table comment to say so.

**A2. New route `POST /api/kyc/submit` (auth required, service-role write).** Replaces the client upsert.
Contract:
- Auth via cookie `getUser()`; resolve `profileId` via `resolveProfileId(user.id, user.email)` → 404 if none.
- Accept only data fields: `legal_name, pan, bank_account, bank_account_name, ifsc_code, upi_id?,
  aadhaar_last4?, dob?, gender?, address_line1?, address_line2?, city?, state?, postal_code?, country?`.
- **Force `status = 'pending'`** and `kyc_level = 'basic'`. **Reject/ignore** any client-supplied `status`,
  `*_verified`, `*_verified_at`, `*_verification_*`, `beneficiary_*`, `admin_notes`, `rejection_reason`.
- Encrypt: `pan_enc = encryptField(pan)`, `bank_account_enc = encryptField(bank_account)`,
  `upi_id_enc = encryptField(upi_id)`; store `pan_last4 = last4(pan)`, `bank_last4 = last4(bank_account)`.
- Upsert on `creator_id` via service role. Return `{ ok: true }`.
- **Extract the row-building into a pure, tested function** `buildEncryptedKycRow(input)` (server lib) so the
  status-forcing + encryption + field-allowlist is unit-tested without a live route (see §8).

**A3. Client rewrite.** `useEarnings.updateKyc` → `POST /api/kyc/submit` (drop the
`supabase.from('creator_kyc').upsert(...)`). `billing/page.tsx` form state holds **raw** `pan` / `bank_account`
/ `upi_id` (rename off the `*_enc` field names), submits raw, and after submit displays only `*_last4`
(read back via the existing SELECT-own path). The masked-reveal UI stays.

**A4. Backfill (encrypt-in-place script).** One-off server script (service-role), run once before/with the
lockdown: read the single plaintext row, `encryptField` its `pan_enc`/`bank_account_enc` in place, populate
`pan_last4`/`bank_last4`, write back. Idempotent: skip any value already `isEncrypted(...)`. Keep the script in
`scripts/` and document the invocation; it reads PII only in-process, never logs raw values.

**A5. Env + key.** Generate a 32-byte base64 `KYC_ENCRYPTION_KEY`; set in `.env.local` + Vercel. Document it
in `.env.example` and `.claude/rules/env-vars.md` (Supabase/secret section) — required, server-only.

### Unit B — Payout / balance accounting

**B1. `creator_balances.frozen_balance numeric not null default 0`** + replace the non-negative CHECK to
include all five counters (`total_earnings, total_platform_fees, total_paid_out, pending_payout,
frozen_balance >= 0`). Data-safe (no negative rows live).

**B2. `creator_payouts.status` vocab** → `('pending','processing','success','failed')`. Table is empty; the
sole writer inserts `'pending'`. Grep the repo for `'initiated'`/`'processed'` string readers first (expected: none).

**B3. `settle_payout()` RPC — corrected.** `security definer`, `revoke execute from public/anon/authenticated`
(service-role only). Atomic claim on `status in ('pending','processing')`; on `success` bump `total_paid_out`,
release `pending_payout`, and insert the ledger debit; on `failed` only release the hold. **Corrections vs the
draft:**
- `record_hash` must be valid `bytea` matching `fulfillment.ts`'s hex-string convention. Use the built-in
  `sha256()` (PG11+, no pgcrypto):
  ```sql
  record_hash => convert_to(encode(sha256(convert_to('payout:' || p_payout_id::text, 'UTF8')), 'hex'), 'UTF8')
  ```
  (yields the 64 ASCII bytes of the lowercase hex digest — byte-identical to `.digest('hex')` rows).
- Populate the dedicated **`payout_id`** column (not just `meta`).
- Keep `on conflict (record_hash) do nothing` (replay-safe) and the atomic status claim (idempotent).

**B4. `reconcile_creator_balances()` + `balance_reconciliation_log`** — alert-only drift check of
`total_paid_out`/`pending_payout` vs `creator_payouts` sums. Ship the function + RLS'd log table. **No
scheduler** (pg_cron absent) — run manually via MCP; pick Vercel-Cron-vs-pg_cron in Phase 1. The function
must **never auto-correct** balances (log only).

**B5. Single-source-of-truth balance.** `availableBalance()` (`src/lib/shared/balance.ts`) already exists +
tested. (a) Payout route: **select `frozen_balance`** (after type-regen) so the shared formula subtracts it —
closes the A5 latent "withdraw frozen funds" trap. (b) `useEarnings` read (line 30): replace the inline
formula with `availableBalance(rawBal)` — closes bug #6.

---

## 5. Key design decisions

- **D1 — `settle_payout` is one combined atomic RPC** (balance + ledger in a single function), deliberately
  *unlike* the credit path (which splits `credit_creator_balance` RPC from the app-layer ledger insert). Bug #3
  is balance/ledger **divergence**; doing both in one transaction removes the divergence window by
  construction. The cost (a second place that writes the ledger, in SQL) is bounded by matching the exact hash
  convention in B3 and is worth it for a money debit.
- **D2 — App-layer AES-256-GCM is the at-rest floor.** `kyc-crypto.ts` is sound (random 12-byte IV, GCM tag,
  `enc:v1:` format). Key lives in `KYC_ENCRYPTION_KEY` (env/Vercel). Known limits, accepted for Phase 0:
  single static key, no key-id stored with ciphertext (`v1` is *format*, not *key*, version) → rotation means
  re-encrypt. Provider tokenization supersedes this in Phase 2.
- **D3 — Interim KYC verification is manual.** Post-lockdown nobody can reach `status='verified'` until the
  Phase 2 admin path exists. That's fine: payouts can't go live to creators until Phase 2 regardless. A
  `super_admin` flips status via MCP/SQL in the meantime. No Phase 0 UI.
- **D4 — Reconciliation ships unscheduled** (per decision): function + log table now, scheduler in Phase 1.
- **D5 — Backfill encrypts in place** (per decision): preserve the submitted row rather than clearing it.

---

## 6. Apply order (this is what makes it atomic / non-bricking)

The lockdown migration breaks the *old* client upsert, so code must lead. Strict order:

1. Add `KYC_ENCRYPTION_KEY` to env (local + Vercel). Update `.env.example` + `env-vars.md`.
2. Land `buildEncryptedKycRow` + `POST /api/kyc/submit` + the `useEarnings`/`billing` rewrite. **Deploy.**
   (New write path live; old upsert path removed.)
3. Run the **backfill script** (service-role; encrypts the one plaintext row).
4. Apply the **migration** (A1 lockdown + B1 frozen + B2 status + B3 settle_payout + B4 reconcile) via
   Supabase MCP `apply_migration`.
5. **Regenerate types** (Windows → MCP `generate_typescript_types` fallback per `supabase-reference.md`).
6. Land B5 (payout route selects `frozen_balance`; `useEarnings` read uses `availableBalance`). **Deploy.**
7. `npx tsc --noEmit` + `npm run lint` + `npm test` + `/verify`.

If step 4 ran before step 2, the still-live client upsert would hit an RLS write-denial for every creator
(form shows "Failed to submit KYC") — never apply the migration before the route/hook are deployed.

---

## 7. Error handling, idempotency, security

- **Idempotency:** `settle_payout` is replay-safe twice over — the status claim (`WHERE status in
  ('pending','processing')` → 0 rows = no-op) and the ledger `record_hash` UNIQUE. The Phase 1 caller (a
  retrying webhook) inherits this.
- **RLS:** `creator_kyc` writes are service-role only post-lockdown; `settle_payout`/`reconcile_creator_balances`
  are `revoke`d from `authenticated`/`anon`. `balance_reconciliation_log` is super_admin-SELECT only.
- **PII:** raw PAN/bank never persisted post-A; only ciphertext + `*_last4`. The route must never echo raw
  values back or log them; the backfill script must not log raw values. Confirm PAN can't leak into error
  payloads / Sentry-style logs.
- **Service-role surface:** `/api/kyc/submit` is a new service-role writer — validate + allowlist fields
  strictly (it's the only thing standing between a creator and arbitrary `creator_kyc` columns now that RLS
  writes are gone).

---

## 8. Testing

- **Exists, keep:** `balance.test.ts` (availableBalance, incl. frozen), `kyc-crypto.test.ts` (round-trip,
  tamper-throw, last4).
- **Add (unit, pure):** `buildEncryptedKycRow` — asserts `status` is forced to `'pending'`, `*_verified`/admin
  fields are dropped, `pan`/`bank_account` come out as `enc:v1:` + correct `*_last4`, empty UPI → `''`.
- **Add (SQL behavior):** `settle_payout` success path (paid_out↑, pending released, one ledger debit row),
  failure path (hold released, no debit), and double-call no-op. Validate against a Supabase **branch** (or
  manual MCP run in Phase 0) since there's no pgTAP harness yet — document the steps. `reconcile_creator_balances`:
  seed a deliberate drift, assert one log row, assert balances **unchanged**.
- This is the money path; per `.claude/rules/verification.md` Lane 2, these are the highest-ROI tests to add.

---

## 9. Affected files

| File | Change |
|---|---|
| `supabase/migrations/20260630000000_phase0_money_hardening.sql` | rewrite per §4 (record_hash fix, payout_id, comments); keep idempotent |
| `src/lib/server/kyc-crypto.ts` | none (sound as-is) — now actually wired |
| `src/lib/server/kyc-row.ts` *(new)* | `buildEncryptedKycRow(input)` pure helper |
| `app/api/kyc/submit/route.ts` *(new)* | service-role KYC writer |
| `src/hooks/commerce/useEarnings.ts` | `updateKyc` → POST route; read uses `availableBalance` |
| `app/dashboard/settings/billing/page.tsx` | raw field state; submit to route; show `*_last4` |
| `app/api/payouts/request/route.ts` | select `frozen_balance` (already imports `availableBalance`) |
| `src/lib/shared/balance.ts` | none (exists) |
| `scripts/backfill-encrypt-kyc.ts` *(new)* | one-off encrypt-in-place |
| `.env.example`, `.claude/rules/env-vars.md` | document `KYC_ENCRYPTION_KEY` |
| `types/database.types.ts` | regenerate (frozen_balance, status vocab) |
| `.claude/rules/api-routes.md` | add `POST /api/kyc/submit` row; note `creator_kyc` writes are service-role |
| `.claude/todo-later/11(left)-...overhaul.md` | update Plan state: Phase 0 → in progress, link this spec |

---

## 10. Verification checklist (Phase 0 done when)

- [ ] A creator can submit KYC through `/api/kyc/submit`; the row shows `enc:v1:` PAN/bank + correct `*_last4`.
- [ ] A creator client-side `creator_kyc` upsert is **denied** by RLS (gate bypass closed).
- [ ] No plaintext remains in `creator_kyc` (`... NOT LIKE 'enc:v1:%'` count = 0).
- [ ] `settle_payout(payout, 'success')` on a seeded payout: `total_paid_out`↑, `pending_payout` released, one
      `tx_type='payout'` debit row; second call returns false / no double-credit.
- [ ] `settle_payout(payout, 'failed')`: hold released, no debit.
- [ ] `availableBalance` identical in route and `useEarnings`; route subtracts `frozen_balance`.
- [ ] `reconcile_creator_balances()` logs seeded drift and changes no balances.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test`, `/verify` pass.

---

## 11. Cross-links

- Blueprint: `.claude/todo-later/11(left)-2026-06-30-payments-earnings-payout-kyc-overhaul.md`
- Live money path: `src/lib/server/fulfillment.ts`, `app/api/payouts/request/route.ts`,
  `src/lib/server/platform-fee.ts`
- Rules: `.claude/rules/security-model.md` (revenue integrity), `.claude/rules/supabase-reference.md`
  (type regen), `.claude/rules/api-routes.md`, `.claude/rules/dashboard-design.md` (billing UI)
- Next: Phase 1 (Cashfree Payouts — the `settle_payout` caller + scheduler decision).
