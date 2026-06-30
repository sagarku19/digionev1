---
noteId: "payments-earnings-payout-kyc-20260630"
tags: []
---

# Payments / Earnings / Payout / KYC / Tax / Subscriptions — overhaul blueprint

**Captured:** 2026-06-30 · **Last updated:** 2026-06-30 (Phase 0 built + applied to live).
**Status:** `(half)` — **Phase 0 DONE** (live); Phases 1–6 not started. Update the status tag + "Plan state" as work continues.
**Scope:** the entire money surface — earnings, payouts, KYC, refunds, **GST/TDS/TCS tax**,
invoices, **creator subscriptions (creator → DigiOne billing)**, wallet/ledger maturity, risk
controls. Both DB and code. Written from four lenses: **developer**, **DB designer**, **UI/UX
designer**, and **chartered accountant** (Indian e-commerce tax).

> Living planning doc for the payments overhaul. Research is grounded in **live code + live schema**
> (read 2026-06-30) and **current Indian tax law** (verified via web research, Finance Act 2024 +
> CBIC Notification 15/2024 — rates changed recently, do not trust older memory). When a phase
> starts it gets its own `docs/superpowers/specs/` + `plans/` files; link them from "Plan state".

---

## 0. Plan state (update this as you go)

| Phase | What | Status | Spec / Plan links |
|---|---|---|---|
| 0 | Harden live: KYC self-verify RLS hole, **plaintext PAN/bank `_enc` columns**, payout accounting (ledger debit + balance release), single balance formula, reconciliation | **DONE** (applied live 2026-06-30) | spec: `docs/superpowers/specs/2026-06-30-phase0-money-hardening-design.md` · plan: `docs/superpowers/plans/2026-06-30-phase0-money-hardening.md` |
| 1 | Payouts for real: wire `creator_payout_methods` + **Cashfree Payouts** (beneficiary → transfer → webhook) | **BUILT (not live — needs Cashfree Payouts sandbox creds + contract spike + e2e)** | spec: `docs/superpowers/specs/2026-06-30-phase1-cashfree-payouts-design.md` · plan: `docs/superpowers/plans/2026-06-30-phase1-cashfree-payouts.md` |
| 2 | KYC verification: PAN + bank/UPI verify provider, admin review UI, typed mutation, real encryption/tokenization, **KYC document upload → R2 `creator-private`** | not started | — |
| 3 | **Creator subscriptions**: wire `subscription_plans`/`subscriptions`, Cashfree PG recurring, **platform-fee tiering**, plan gating | not started | — |
| 4 | Refunds + `frozen_balance` + risk controls (velocity, dispute freeze, duplicate-payout guard) | not started | — |
| 5 | **GST / TDS / TCS tax engine** (the real greenfield build) | not started | — |
| 6 | Invoices + tax statements: creator-sale invoice + DigiOne→creator commission/subscription tax invoice; **PDF generation → R2 (signed-URL only)**; Form 16A / GSTR exports | not started | — |

**Next planned phase:** Phase 2 — KYC verification (PAN + bank/UPI verify provider, admin review UI).

**Phase 1 deferred — needs before going live:**
- **Task 1 (contract spike):** confirm the Cashfree Payouts V2 API contract end-to-end in sandbox — auth (bearer token generation), beneficiary create + idempotency, transfer create, `getTransfer` poll, and the **webhook signature variant** (Cashfree Payouts uses a different signing scheme from PG; both a legacy form-POST verifier and a V2 JSON verifier exist in `src/lib/server/cashfree-payouts.ts` — confirm which sandbox actually sends and delete the dead path).
- **Sandbox e2e:** full flow with real Cashfree Payouts sandbox credentials → approve → beneficiary/transfer created → webhook fires → `settle_payout` settles → balance released.
- **(a)** Confirm webhook signature variant (legacy form-POST vs V2 JSON) and drop the unused verifier once confirmed.
- **(b)** Add FK `creator_payouts.payout_method_id → creator_payout_methods(id)` so the admin queue can JOIN the payout destination (bank/UPI) without a second round-trip.
- **(c)** Reconciliation scheduler stays deferred — the sync route is cron-ready via `CRON_SECRET` but no scheduler has been wired; set up `pg_cron` or an external cron once going live.

**Phase 0 execution notes (what actually shipped / deviations from the original blueprint):**
- KYC writes now go through service-role `POST /api/kyc/submit` (+ pure `buildEncryptedKycRow`); client `creator_kyc`
  INSERT/UPDATE RLS policies dropped. The 4-step KYC **wizard** (`billing/page.tsx`) submits raw → server encrypts.
- **PII encryption is real** (AES-256-GCM, `src/lib/server/kyc-crypto.ts`, key `KYC_ENCRYPTION_KEY`). Live row verified encrypted.
- **`_enc` columns were `bytea`** (not text) — storing the `enc:v1:` envelope round-tripped as `\x` hex and broke
  `decryptField`/`isEncrypted`. Migration converts `pan_enc`/`bank_account_enc`/`upi_id_enc` **bytea→text** losslessly.
  Lesson for Phase 2 (decryption/admin): these are now `text`.
- **`creator_kyc(creator_id)` already had a UNIQUE INDEX** (`idx_kyc_creator`) → the upsert's `onConflict` works; the
  migration's constraint-add is index-aware and was a no-op. No redundant index created.
- **Backfill became moot** — the one live row got encrypted via the new route before the backfill ran. Script kept for safety.
- `settle_payout` is a single combined atomic RPC (balance + ledger), `record_hash` is bytea via `sha256()` matching `fulfillment.ts`.
- Carried to Phase 1: payout webhook → `settle_payout` caller; reconciliation scheduler. Carried to Phase 2: admin KYC verify UI + provider tokenization.

---

## 1. Headline finding — most of the "ideal fintech schema" ALREADY EXISTS as dead, unwired tables/columns

DigiOne's DB is **not** the thin system the money-path docs describe. It already contains a
near-complete fintech + subscription schema that was never wired up. The work is **~70% wiring +
hardening existing schema**, not designing a new DB. **Do not rebuild from `earning.txt`'s
greenfield schema — you'd recreate tables you already own under different names.**

| Ideal-schema concept | Already in DigiOne's DB | Wired? |
|---|---|---|
| `bank_accounts` (payout destinations) | `creator_payout_methods` (account_holder_name, account_number, ifsc_code, bank_name, branch_name, upi_id, `type` enum `payout_type`, is_default, `version` optimistic-lock, status) | ❌ No writer/reader |
| Payout request workflow | `creator_payout_requests` + `creator_payout_request_items` (admin_notes, rejection_reason, payout_method_id, status) | ❌ Dead |
| KYC (PAN/bank/UPI) | `creator_kyc` — **40 cols**: `pan_enc`, `pan_last4`, `pan_verified`, `aadhaar_last4`, `bank_account_enc`, `bank_last4`, `bank_verified`, `ifsc_code`, `upi_id_enc`, `upi_verified`, `beneficiary_id`, `beneficiary_metadata`, `kyc_level`, address, `admin_notes`, `rejection_reason`, per-field `*_verification_provider`/`*_ref`/`*_verified_at` | 🟡 Form writes a few fields as a raw untyped upsert; **`_enc` columns hold PLAINTEXT** |
| Payout gateway tracking | `creator_payouts` already has `gateway_batch_id`, `gateway_payout_id`, `gateway_name`, `gateway_metadata`, `failure_reason` | ❌ Only `amount/currency/status:'pending'` ever written |
| Wallet (pending/available/frozen) | `creator_balances` (pending_payout; available derived) + dead `user_wallets`, `user_wallet_transactions` | 🟡 No `frozen_balance` |
| Ledger | `transaction_ledger` (append-only, UNIQUE `record_hash`, CHECK amount>0, `tx_type`, `direction`) | ✅ Working (credits only) |
| Revenue share | `creator_revenue_shares` | ❌ Dead |
| **Creator subscription** | `subscription_plans` (plan_type enum `free\|plus\|pro`, monthly_price, yearly_price, **`platform_fee_percent`**, features jsonb), `subscriptions` (creator_id, plan_id, billing_cycle, current_price, **`current_platform_fee_percent`**, status, renewal_date, auto_renew), `creator_subscription_orders` | ❌ Dead — but `getPlatformFeeRate(creatorId)` is **already shaped to read the tier fee** |

**Genuinely missing (no table at all):** GST/TDS/TCS tax engine (`tax_rules`, `tax_transactions`),
`invoices`, `refunds`, `frozen_balance` column + `wallet_frozen_logs`.

---

## 2. What the live money path does today (grounded)

Files read: `app/api/payouts/request/route.ts`, `src/lib/server/fulfillment.ts`,
`src/hooks/commerce/useEarnings.ts`, `app/dashboard/settings/billing/page.tsx`,
`app/api/webhook/cashfree/route.ts`, `docs/db/money-path.md`, `types/database.types.ts`.

- **Checkout / Webhook / Fulfillment** — solid. Atomic-claim idempotency, HMAC verify, deterministic
  `record_hash`, platform-fee-funded referral commission. Fulfillment writes **credits only**.
- **Payout** (`/api/payouts/request`) — auth → `resolveProfileId` → KYC `verified` gate → balance check
  → bumps `pending_payout` (optimistic `.eq` guard + row-count) → inserts `creator_payouts{status:'pending'}`.
  **Then nothing — no money moves, no destination, no ledger debit.**
- **Billing/KYC page** — `useEarnings.updateKyc` upserts an **untyped blob**; the form sets
  `status:'pending'` and writes raw PAN/account/UPI strings into `pan_enc`/`bank_account_enc`/`upi_id_enc`.
- **Subscriptions** — schema present, no code path. "Free Plan" badges are cosmetic; every creator is
  effectively on the hardcoded 10% fee (`getPlatformFeeRate` ignores the tier today).

available_balance (duplicated in route + hook):
`available = total_earnings − total_platform_fees − total_paid_out − pending_payout`

---

## 3. Chartered-accountant view — Indian tax model (this is the part that needs to be RIGHT)

DigiOne is an **Electronic Commerce Operator (ECO)**: it lists creators' digital products and
collects buyer consideration via Cashfree. That status triggers three distinct, **separate** tax
obligations. Mixing them up is the classic mistake — they have different laws, rates, payees, and returns.

### 3.1 The three taxes — who, what, rate, return

| Tax | Law | Who bears it | Who collects/deducts & remits | Rate (current) | Base | Return |
|---|---|---|---|---|---|---|
| **TCS under GST** | CGST §52 | Creator (seller) — it's their GST credit | **DigiOne (ECO)** collects & deposits | **0.5%** (0.25% CGST + 0.25% SGST, or 0.5% IGST) — reduced from 1% w.e.f. **10 Jul 2024** (Notif. 15/2024) | **Net** taxable supplies (gross − returns) by **registered** sellers; excludes §9(5) services | **GSTR-8**, monthly, by 10th |
| **TDS u/s 194-O** | Income-tax §194-O | Creator (adjustable against their income tax) | **DigiOne (ECO)** deducts & deposits | **0.1%** of gross sales — reduced from 1% w.e.f. **1 Oct 2024**. **5%** if creator has **no PAN** (§206AA) | **Gross** sale amount facilitated | **26Q** quarterly; issue **Form 16A** |
| **GST on DigiOne's own services** (commission + subscription) | CGST (intermediary/SaaS supply) | The creator (DigiOne charges it on top) | **DigiOne** charges, collects, remits | **18%** | DigiOne's 10% commission **and** the plus/pro subscription fee | **GSTR-1 / GSTR-3B** |

> ⚠️ **TCS ≠ TDS.** TCS (GST, 0.5%, on net supplies, GSTR-8) and TDS (income-tax, 0.1%/5%, on gross,
> 26Q) are two different deductions from the **same** payout, under two different laws. Both are the
> ECO's responsibility. They are **not** DigiOne's expense — they're withheld from the creator's
> earnings and remitted to the government on the creator's behalf.

### 3.2 The ₹1000 sale, done correctly (single creator, registered, has PAN)

Assume product MRP is GST-inclusive where the creator is registered; if the creator is **unregistered**
(the common case — see §3.3) there is no GST on the sale and no TCS.

| Step | Amount | Ledger entry_type | Notes |
|---|---|---|---|
| Buyer pays | ₹1000 | `order_payment` (credit, buyer side) | Cashfree collects |
| DigiOne commission (10%) | −₹100 | `platform_commission` | DigiOne revenue |
| GST on commission (18% of ₹100) | −₹18 | `gst_on_commission` | DigiOne collects from creator, remits |
| Creator gross earning | ₹900 | `creator_earning` (credit) | before withholding |
| TDS 194-O (0.1% of ₹1000 gross) | −₹1 | `tds_withheld` | remitted to IT dept, Form 16A to creator |
| TCS GST §52 (0.5% of net taxable, if registered) | −₹5 | `tcs_withheld` | remitted via GSTR-8 (only if registered) |
| **Net to creator wallet (pending→available)** | **≈ ₹876** | `creator_earning` net of withholdings | |

The example in `earning.txt` ("GST ₹18, TDS ₹9") used the **old 1% TDS** and conflated GST-on-commission
with TCS. The corrected figures above use **current** rates.

### 3.3 Creator GST registration — most creators are EXEMPT (big simplification)

- Digital products (ebooks, courses, templates, presets) are **services** for GST (OIDAR-like), not goods.
- **Notification 65/2017-CT:** a supplier of **services** through an ECO is **exempt from compulsory
  registration** if aggregate turnover ≤ **₹20 lakh** (₹10 lakh in special-category states). (Goods
  sellers via ECO have stricter rules under §24(ix), but that's not the digital-product case.)
- **Consequences for the engine:**
  - Unregistered creator (the majority): **no GST on their sale, no TCS.** Only TDS 194-O applies
    (0.1%/5%), plus DigiOne's 18% GST on its own commission.
  - Registered creator (has GSTIN on file): GST on sale + **TCS 0.5%** on net + TDS 0.1%.
  - ⟹ The KYC/tax profile must capture **GSTIN (optional)** and **PAN (drives TDS rate)**, and the
    tax engine must branch on "registered?" per creator.

### 3.4 What this means for the schema (CA requirements)

1. **Immutability:** tax rows are append-only audit records. Never UPDATE a posted tax row — reverse it.
2. **Per-order tax breakdown** stored at fulfillment time using the **rate in force on the transaction
   date** (rates change — snapshot them, don't recompute later).
3. **TDS aggregation per creator per FY** for the ₹5L 194-O threshold and Form 16A generation.
4. **TCS only for registered creators**, netted of refunds in the same month (GSTR-8 needs net).
5. **DigiOne's GST output** on commission + subscription must be separately reportable (GSTR-1/3B).
6. **Invoices** are a legal artifact, not a nicety: tax invoice (DigiOne→creator for commission &
   subscription, with DigiOne's GSTIN) and the creator's sale invoice (buyer-facing).

Sources: [Section 194-O 0.1% (Terra Insight)](https://www.terra-insight.com/insights/section-194o-tds-0-1-percent-current-rate-history-india/),
[194-O guide (TaxBuddy)](https://www.taxbuddy.com/blog/section-194o-tds-on-payment-to-e-commerce-operator),
[TCS 0.5% Notif 15/2024 (GST Safar)](https://gstsafar.com/tcs-rate-for-e-commerce-operator/),
[CBIC TCS→0.5% (nyca.in)](https://www.nyca.in/cbic-reduces-tcs-rate-from-1-to-0-5-for-e-commerce-operators-effective-july-10-2024/),
[TCS under GST (ClearTax)](https://cleartax.in/s/tcs-under-goods-and-services-tax),
[Notif 65/2017 service-supplier exemption (RJA)](https://carajput.com/blog/taxability-under-gst-for-e-commerce-sale-of-services/),
[Compulsory registration §24 (Tax2win)](https://tax2win.in/guide/compulsory-registration-gst-act-section-24).

---

## 4. Creator subscriptions (creator → DigiOne) — the second money flow

This is a **separate** flow from buyer→creator sales and must not be conflated. DigiOne sells SaaS
plans to creators; the schema already models it.

- **Plans:** `subscription_plans` — `free | plus | pro`, `monthly_price`, `yearly_price`, **`platform_fee_percent`**
  (lower fee on higher tiers — the monetization lever), `features` jsonb (feature gating).
- **Active sub:** `subscriptions` — `creator_id`, `subscription_plan_id`, `billing_cycle`,
  `current_price`, **`current_platform_fee_percent`** (snapshot so a mid-cycle plan price change
  doesn't retroactively alter fees), `status`, `renewal_date`, `auto_renew`.
- **Orders:** `creator_subscription_orders` — each charge (Cashfree PG, same gateway as product checkout).

**Money-path coupling (critical):** `getPlatformFeeRate(creatorId)` in `src/lib/server/platform-fee.ts`
**already accepts a creatorId** but returns a hardcoded 0.10. Wiring subscriptions means: resolve the
creator's active `subscriptions.current_platform_fee_percent` here → the fulfillment split in
`fulfillOrder` automatically tiers. One function, one change, whole money path tiers correctly.

**CA note:** the subscription fee is a **taxable SaaS supply by DigiOne → 18% GST**, and needs its own
**tax invoice** (DigiOne's GSTIN). Recurring billing = Cashfree subscriptions/mandates (e-NACH/UPI
AutoPay). Failed renewals must **downgrade to `free`** (raising the fee back to the free-tier rate),
not block sales.

**UX:** the current `/dashboard/settings/billing` page is **KYC only** despite its title. Subscriptions
need their own surface — plan cards (free/plus/pro), current-plan state, upgrade/downgrade, invoice
history. Keep KYC and subscription as distinct sections (they're distinct legal/functional concerns).

---

## 4b. Storage (R2) — sensitive documents & generated PDFs

All file storage is **Cloudflare R2** via `src/lib/storage/` + the `storage_files` metadata table
(see `.claude/rules/api-routes.md` → Storage, `.claude/rules/supabase-reference.md`). The money/tax
surfaces add three new storage *kinds*, none of which may ever be public:

| Artifact | Logical bucket | R2 bucket | Access path | `storage_files.kind` |
|---|---|---|---|---|
| **KYC documents** (PAN card image, bank proof/cancelled cheque, Aadhaar) | `creator-private` | `digione-kyc-private` | upload via `POST /api/upload` (`bucket:'creator-private', category:'kyc'`); read **only** via `GET /api/admin/kyc/[creatorId]/download` (super_admin, writes `kyc_access_log`) | `kyc` |
| **Invoices** (creator-sale, commission, subscription PDFs) | `creator-content` (or a new `digione-invoices`) | private | minted signed URL via an authed route scoped to owner (creator) / buyer | `invoice` |
| **Tax statements** (Form 16A, GSTR-8/GSTR-1 exports, annual earnings statement) | `creator-content` | private | authed signed URL, owner-scoped | `tax_doc` |

**Rules that carry over:**
- KYC docs are **write-only for creators** (the `creator-private` bucket already enforces this) — a
  creator can upload but never read back; only `super_admin` mints a signed URL, and every mint is
  logged to `kyc_access_log`. This is the existing model — reuse it, don't reinvent.
- **Never store raw PAN/account numbers as text** (bug #2) — and the *document images* are even more
  sensitive: private bucket + signed-URL-only + access log. No public URL, ever.
- Invoices/tax PDFs are generated server-side (sharp/pdf lib TBD — **new dep, ask first**), uploaded
  via the service-role storage path, metadata row in `storage_files`, served by short-TTL signed URL.
- Quota: these count against the creator's `sumOwnerBytes` quota like any other file.

**Schema delta:** add `kyc_document_file_id uuid REFERENCES storage_files(id)` (or a `kyc_documents`
child table if multiple docs per creator) to link KYC rows to their uploaded proof; add
`pdf_file_id uuid REFERENCES storage_files(id)` on `invoices`. New `storage_files.kind` values
(`kyc`, `invoice`, `tax_doc`) are just strings — no enum migration needed.

---

## 5. Reconciled schema — ideal ↔ existing, with concrete deltas

Adopt the **good ideas** from `earning.txt` (ledger entry-type taxonomy, frozen balance, tax tables,
invoices, refunds) but **map them onto existing tables** rather than creating duplicates.

| Ideal table | Map to existing | Delta needed |
|---|---|---|
| `wallets(pending/available/frozen)` | `creator_balances` | add `frozen_balance numeric default 0` + non-negative CHECKs; keep available **derived**, never stored |
| `ledger_entries(entry_type, direction, status)` | `transaction_ledger` | extend `tx_type` taxonomy to: `sale, platform_commission, gst_on_commission, creator_earning, tds_withheld, tcs_withheld, refund, payout, referral_commission, subscription_charge, adjustment`; add `status (posted\|pending\|reversed)`, `reverses_ledger_id` (self-FK for reversals) |
| `bank_accounts` | `creator_payout_methods` | wire it; treat `version` as optimistic lock; enforce one `is_default` per creator |
| `payouts` | `creator_payouts` | use the existing `gateway_*` cols; **align `status` vocab** (`pending→processing→success→failed`); write a ledger `payout` debit + bump `total_paid_out` + release `pending_payout` on terminal status |
| `tax_rules` | **NEW** | `gst_commission_rate, tds_rate_pan, tds_rate_no_pan, tcs_rate, effective_from, effective_to, is_active` — versioned, never edited in place |
| `tax_transactions` | **NEW** | per-order immutable: `order_id, creator_id, gst_on_commission, tds_amount, tcs_amount, creator_registered bool, gstin, pan_present bool, rate_snapshot jsonb, fy text` |
| `refunds` | **NEW** | `order_id, amount, reason, status, gateway_refund_id`, + ledger reversal + balance clawback (from frozen) |
| `wallet_frozen_logs` | **NEW** | `creator_id, amount, reason, status(frozen\|released), related_dispute_id` |
| `invoices` | **NEW** | dual-purpose: `kind(creator_sale\|commission\|subscription)`, `number` (per-series), `subtotal, gst_amount, total, gstin, pdf_url(R2)` |

**Ledger discipline (from `earning.txt`, keep it):** ledger is the source of truth, `creator_balances`
is a cache, taxes are immutable, **wallet is never updated except by replaying ledger deltas via RPC**.
DigiOne already follows this for credits (`credit_creator_balance`); extend the same discipline to
**debits** (payouts, refunds, withholdings) — today that half is missing.

---

## 6. Concrete bugs / risks in current live code

| # | Severity | Issue | Location |
|---|---|---|---|
| 1 | **HIGH** | KYC `status`/`*_verified` self-writable by creator via untyped client upsert (form posts `status:'pending'`; nothing stops `'verified'`) → **payout-gate bypass**. Verify `creator_kyc` UPDATE RLS blocks these columns. | `useEarnings.ts:45-57`, `billing/page.tsx:176-194`, RLS |
| 2 | **HIGH** | **PAN, full bank account #, UPI stored as PLAINTEXT** in `pan_enc`/`bank_account_enc`/`upi_id_enc` — the `_enc` suffix implies encryption that does not exist. PII + financial-data exposure. | `billing/page.tsx:176-194` |
| 3 | **HIGH** | Payout completion writes **no ledger debit**, never bumps `total_paid_out`, never releases `pending_payout` → balance/ledger divergence + permanently understated available balance the moment payouts go live | `fulfillment.ts` + missing payout-complete handler |
| 4 | **MED** | No payout destination — `creator_payout_methods` unwired; a request has no bank/UPI target | `payouts/request/route.ts` + DB |
| 5 | **MED** | `getPlatformFeeRate` ignores subscription tier (hardcoded 0.10) → plus/pro fee discount never applied | `platform-fee.ts` |
| 6 | **MED** | available_balance math duplicated (route + hook), can drift | `useEarnings.ts:30`, `payouts/request/route.ts:52` |
| 7 | LOW | Coupon-create identity-bug class — check creator-owned inserts use `profiles.id` not `user.id` | various (audit C1) |

Verify **#1 and #2 first** — both are live security holes (gate bypass + plaintext PII).

---

## 7. UI / UX designer view — the surfaces

Follow `.claude/rules/dashboard-design.md` (tokens, primitives, sizing discipline). The money
surfaces are trust-critical — they must read as *precise and safe*, not flashy.

| Surface | State today | Target |
|---|---|---|
| **Earnings** `/dashboard/earnings` | balances + payout list | KPI grid (available / pending / lifetime / this-month), a **balance-breakdown** card (gross − commission − GST − TDS − TCS = net), payout history `DataTable` with `StatusPill`, withdraw CTA gated on KYC |
| **Withdraw flow** | single amount POST | `SideDrawer`: pick payout method → amount (≤ available) → **shows TDS/TCS withheld preview** → confirm. `ConfirmDialog` on submit. Empty-state → "Add a bank account" |
| **Payout methods** | none | list of `creator_payout_methods` cards (masked account, default badge), add/verify (penny-drop), set-default |
| **KYC wizard** | one long locked form | keep the 3-step progress bar; split into PAN → Address → Bank → GSTIN(optional); **per-field verified pills** (already designed); replace plaintext inputs with tokenized submit; show only `*_last4` after submit |
| **Tax center** (new) | none | per-FY summary: TDS deducted (downloadable Form 16A), TCS collected, GST on commission paid; monthly breakdown; "Download statements" |
| **Subscription/billing** (new) | KYC mislabeled "Billing & KYC" | plan cards (free/plus/pro w/ fee % + features), current plan, upgrade/downgrade, **GST invoice history**; separate from KYC |
| **Admin** (super_admin) | none | KYC review queue (approve/reject + reason), payout approval queue, refund/dispute console, ledger viewer |

**Design cues:** money figures in `tabular-nums`; masked PII with reveal toggle (already in billing page);
withholding amounts always shown *before* confirm (no surprises — a CA-grade UX principle); status via
`StatusPill` (`pending/processing/success/failed`); destructive/clawback actions via `ConfirmDialog`.

---

## 8. Recommended sequencing (each = its own spec → plan → build)

**Phase 0 — Harden live (highest risk-reduction-per-effort; do first):**
- Fix KYC self-verify RLS hole (#1) — block `status`/`*_verified` from client writes; move status
  transitions to a service-role route.
- Fix plaintext PII (#2) — encrypt-at-rest (pgcrypto / app-layer KMS) or **tokenize via the verification
  provider** so raw PAN/account never lands in our DB; store only `*_last4` + provider token.
- Payout-completion accounting (#3): ledger `payout` debit + `total_paid_out` increment +
  `pending_payout` release on success/failure. Makes the *existing* flow correct even before a gateway.
- Single source of truth for available-balance (#6).
- Reconciliation `pg_cron` job (audit A5): `creator_balances` vs `Σ transaction_ledger − payouts`.

**Phase 1 — Payouts for real:** wire `creator_payout_methods` (penny-drop verify, `version` lock);
integrate **Cashfree Payouts** (beneficiary → `creator_kyc.beneficiary_id`; transfer → `creator_payouts.gateway_*`;
**signature-verified payout webhook** → status transitions + ledger debit from Phase 0). Batch/retry/schedules later.

**Phase 2 — KYC verification:** PAN + bank (penny-drop) + UPI verification provider (Cashfree/Signzy);
admin review UI (`super_admin` via `is_super_admin()`); typed, column-scoped mutation replacing the blob upsert.

**Phase 3 — Creator subscriptions:** wire `subscription_plans`/`subscriptions`/`creator_subscription_orders`;
Cashfree recurring (mandate/AutoPay); **make `getPlatformFeeRate` read `current_platform_fee_percent`** (#5);
plan-based feature gating; failed-renewal → downgrade to free; 18% GST invoice per charge.

**Phase 4 — Refunds + `frozen_balance` + risk:** Cashfree PG refund API + ledger reversal + clawback from
frozen; `wallet_frozen_logs`; velocity/duplicate-payout/refund-abuse checks.

**Phase 5 — GST/TDS/TCS tax engine:** `tax_rules` (versioned) + `tax_transactions` (immutable per order,
rate snapshot, registered-flag branch); compute withholdings at fulfillment; per-creator-per-FY TDS
aggregation (₹5L threshold, Form 16A); TCS net-of-returns for GSTR-8.

**Phase 6 — Invoices:** creator-sale invoice (buyer-facing) + DigiOne→creator tax invoice (commission +
subscription, DigiOne GSTIN); PDF to R2; numbering series; GSTR-1/3B export.

---

## 9. Recommendation summary

1. **Phase 0 first** — two live security holes (KYC gate bypass + plaintext PAN/bank) + the
   payout-accounting gap. Small, pure risk-reduction, unblocks everything.
2. **Phase 1 (Cashfree Payouts)** — highest-value feature; schema already shaped for it.
3. **Phase 3 (subscriptions)** is cheap leverage — one `getPlatformFeeRate` change tiers the whole
   money path; it's also a revenue lever you're currently not pulling.
4. **Phase 5 (GST/TDS/TCS)** — schedule before scaling revenue. Use **current** rates: TDS 0.1%
   (5% no-PAN, ₹5L threshold), TCS 0.5% (registered only), GST 18% on DigiOne's commission/subscription.
   Most small creators are GST-**unregistered** (≤₹20L services exemption) → only TDS applies to them.
5. Do **not** rebuild from `earning.txt` — reconcile its good ideas onto existing tables (§5).

---

## 10. Reference

- Live code: `app/api/payouts/request/route.ts`, `src/lib/server/fulfillment.ts`,
  `src/lib/server/platform-fee.ts`, `src/hooks/commerce/useEarnings.ts`,
  `app/dashboard/settings/billing/page.tsx`, `app/api/webhook/cashfree/route.ts`,
  `app/api/checkout/create/route.ts`
- Money-path doc: `docs/db/money-path.md` · Schema/types: `types/database.types.ts`
  (money tables ~279–660; subscriptions ~2631–2738; transaction_ledger ~2739)
- Prior audits: `.claude/todo-later/5(done)-2026-06-13-db-production-audit.md` (§5/§8 payouts),
  `.claude/todo-later/6(left)-2026-06-14-post-dashboard-followups.md` (A5 reconciliation, B1 dead tables, C1 identity bug)
- Greenfield reference (do not adopt wholesale): `.claude/todo-later/earning.txt`
- Rules: `.claude/rules/security-model.md`, `.claude/rules/cashfree-reference.md`,
  `.claude/rules/supabase-reference.md`, `.claude/rules/dashboard-design.md`
- **Tax law (verified 2026-06-30):**
  - TDS 194-O 0.1% / 5% no-PAN / ₹5L threshold — [Terra Insight](https://www.terra-insight.com/insights/section-194o-tds-0-1-percent-current-rate-history-india/), [TaxBuddy](https://www.taxbuddy.com/blog/section-194o-tds-on-payment-to-e-commerce-operator)
  - TCS GST §52 0.5% (Notif 15/2024, 10 Jul 2024) — [GST Safar](https://gstsafar.com/tcs-rate-for-e-commerce-operator/), [nyca.in](https://www.nyca.in/cbic-reduces-tcs-rate-from-1-to-0-5-for-e-commerce-operators-effective-july-10-2024/), [ClearTax](https://cleartax.in/s/tcs-under-goods-and-services-tax)
  - Service-supplier registration exemption ≤₹20L (Notif 65/2017) — [RJA](https://carajput.com/blog/taxability-under-gst-for-e-commerce-sale-of-services/), [Tax2win §24](https://tax2win.in/guide/compulsory-registration-gst-act-section-24)
  - Cashfree Payouts API + webhooks — [Cashfree Payout webhooks](https://www.cashfree.com/docs/payouts/payouts/make-payouts/webhooks)
