---
noteId: "phase5-tax-engine-20260705"
tags: []
---

# Phase 5 — GST / TDS / TCS Tax Engine — Design Spec

**Captured:** 2026-07-05 · **Phase:** 5 of the payments/earnings/payout/KYC/tax/subscriptions overhaul (`.claude/todo-later/11(half)-…`).
**Predecessor:** Phase 4 (refunds + frozen balance + risk) — BUILT. This phase builds on Phase 4's money path (gross `total_earnings`, freeze-then-settle refunds, one-in-flight payout guard).

## Goal

Withhold and account for the three Indian e-commerce taxes on creator earnings, correctly and immutably, and gate GST registration at the statutory turnover threshold — **without** building any government-facing documents (those are Phase 6). Ship the universal path (unregistered creators: TDS + GST-on-commission) fully; light up the registered-creator path (TCS) behind a turnover-driven gate.

**Non-goal (→ Phase 6):** Form 16A / GSTR-8 / 26Q / GSTR-1 exports, PDF invoices, actual government remittance, live GSTIN/PAN API verification, product-level GST-rate capture, buyer-facing GST-on-sale pricing.

---

## 1. The tax model (CA-verified, current rates)

DigiOne is an **Electronic Commerce Operator (ECO)**. Three distinct, separate obligations — different laws, rates, payees, returns. Do not conflate them.

| Tax | Law | Borne by | Collected/remitted by | Rate (current) | Base | Return (Phase 6) |
|---|---|---|---|---|---|---|
| **TDS 194-O** | Income-tax §194-O | Creator (adjust in ITR) | DigiOne | **0.1%** (PAN, after ₹5L/FY) · **5%** (no PAN, §206AA, from ₹1) · resident participants only | **Gross** sale value | 26Q quarterly; Form 16A |
| **TCS §52** | CGST §52 | Creator (their GST credit) | DigiOne | **0.5%** (0.25% CGST + 0.25% SGST) since 10 Jul 2024 | **Net** taxable supplies (gross − returns), **registered** creators only | GSTR-8 monthly |
| **GST on commission** | CGST (SaaS/intermediary) | Creator (embedded in the fee) | DigiOne | **18%** | DigiOne's 10% commission | GSTR-1 / 3B |

**Rates & thresholds verified 2026-07-05** via web research: TDS 0.1%/5% (ClearTax, KKCA, Dhanaay), TCS 0.5% since 10 Jul 2024 (GSTHero, Notif 15/2024), GST registration ₹20L/₹10L for services via ECO (Tax2win, Notif 65/2017). Real marketplaces (Amazon/Flipkart/Meesho) deduct TDS/TCS **at settlement/payout** as settlement-report line items — this design mirrors that.

### 1.1 Commission is GST-inclusive (project decision)

DigiOne's 10% commission is **GST-inclusive** — a ₹1000 sale takes a flat ₹100, which *already contains* the GST-on-commission. It is **not** ₹100 + ₹18 on top. The ₹100 splits, for DigiOne's own GST reporting only:
- `commission_net` = `commission_gross ÷ (1 + 0.18)` = ₹84.75 (DigiOne revenue ex-GST)
- `gst_on_commission` = `commission_gross − commission_net` = ₹15.25 (DigiOne output tax)

**Consequence:** the creator's available-balance formula is **unchanged** — GST-on-commission is carved *out of* the existing fee, not added. `available = total_earnings − total_platform_fees − total_paid_out − pending_payout − frozen_balance` stays exactly as Phase 4 left it, and `reconcile_creator_balances` needs no changes.

---

## 2. Creator tax lifecycle — turnover-gated registration

Driven by the creator's **FY-to-date gross sales** (Indian FY = 1 Apr–31 Mar; `fy` label like `'2026-27'`).

| Stage | Trigger (FY gross) | Applies | Payout |
|---|---|---|---|
| **Basic** (PAN via KYC) | ₹0 – ₹5L | GST-on-commission only | ✅ |
| **TDS active** | > ₹5L | + TDS 194-O at payout (0.1% PAN / 5% no-PAN) | ✅ |
| **Registration due** | ≥ ₹20L (₹10L special-category states) **and** `gstin IS NULL` | GST registration legally required | 🚫 **payout blocked** — "Add your GSTIN to withdraw" |
| **Registered** ("complete KYC") | GSTIN furnished | + TCS §52 (0.5% on net sales) at payout | ✅ |

- **₹5L / FY** — TDS 194-O exemption for individual/HUF creators who furnished PAN. No-PAN → 5% from ₹1 (no threshold benefit).
- **₹20L / FY** (₹10L special-category states, resolved from KYC `state`) — GST compulsory-registration threshold for service suppliers via an ECO. Crossing it makes GSTIN mandatory; we gate payout until furnished.
- All thresholds/rates are **config in `tax_rules`**, snapshotted per transaction so changes never rewrite history.

---

## 3. Withholding model — accrue per-sale, settle at payout

Cash for TDS/TCS leaves at **payout** (matching Amazon/Flipkart settlement practice and the project decision), but the **base** and thresholds are computed **per-sale on gross** and accrued as *pending* withholdings.

### 3.1 At sale (fulfillment)
Write an immutable `tax_transactions` row:
- Split the commission → `commission_net`, `gst_on_commission`.
- Accrue **pending** `tds_amount`: `0` if PAN present and running FY gross ≤ ₹5L; else `round(gross × 0.1%, 2)` (PAN) or `round(gross × 5%, 2)` (no PAN). The sale that crosses ₹5L taxes its full gross (simple; flagged for CA).
- Accrue **pending** `tcs_amount`: `round(gross × 0.5%, 2)` if registered, else `0`.
- Snapshot the active `tax_rules` row into `rate_snapshot`, plus `creator_registered`, `pan_present`, `gstin`, `fy`.
- **Balance amounts unchanged** — available still credits `gross − commission`.

### 3.2 At payout (request)
- **GST gate:** if FY turnover ≥ ₹20L (₹10L special-category) and `gstin IS NULL` → 409.
- **Compute withholding:** sum the creator's **unsettled** pending TDS/TCS across `tax_transactions`; store `tds_withheld`, `tcs_withheld`, and `net_amount = amount − tds_withheld − tcs_withheld` on the `creator_payouts` row; set `settling_payout_id` on those `tax_transactions`.

### 3.3 At payout settle (webhook)
- **Success** → mark the reserved `tax_transactions` `settled = true`.
- **Failure/reversal** → clear `settling_payout_id` on unsettled reserved rows (tax returns to pending for the next payout). Mirrors Phase 4 freeze/settle idempotency.
- **Balance:** `total_paid_out += amount` (the full payout amount leaves available; the bank/govt split is internal). Unchanged from today.
- **Transfer:** Cashfree `createTransfer` uses **`net_amount`**, not `amount`.

### 3.4 At refund (settle_refund extension)
When a refund settles `success`, write a `status='reversed'` counter `tax_transactions` row (`reverses_id` → the sale row), proportional to the refunded fraction:
- Reverse `gst_on_commission` proportionally (DigiOne's output tax drops).
- Release **unsettled** pending TDS/TCS proportionally (reduce what a future payout withholds).
- **Already-settled** TDS/TCS is **not** cash-clawed-back in v1 — that's correct real-world behavior: deducted TDS is claimed in the creator's ITR, and TCS is netted month-wise in GSTR-8 (the counter-row provides that net basis). Flagged for CA.

### 3.5 Worked example — ₹1000 sale, PAN, unregistered, FY gross already > ₹5L
```
Sale gross                     ₹1000   orders.total_amount
Commission (10%, GST-incl.)    −₹100   total_platform_fees (unchanged)
  ├ commission_net              ₹84.75  tax_transactions
  └ gst_on_commission           ₹15.25  tax_transactions
Available credited              ₹900    (gross − fee; unchanged from Phase 4)
Pending TDS (0.1% × 1000)       ₹1.00   tax_transactions (pending)
Pending TCS (unregistered)      ₹0
Payout ₹900 → withhold ₹1 → creator receives ₹899 (net_amount)
```

---

## 4. Data model

### 4.1 `tax_rules` (new — versioned config)
```
id uuid pk, gst_commission_rate numeric, tds_rate_pan numeric, tds_rate_no_pan numeric,
tcs_rate numeric, tds_threshold_fy numeric, gst_reg_threshold numeric,
gst_reg_threshold_special numeric, effective_from timestamptz, effective_to timestamptz,
is_active bool, created_at timestamptz
```
Seed one active row: `0.18, 0.001, 0.05, 0.005, 500000, 2000000, 1000000`. RLS: `authenticated` SELECT (read-only, like `subscription_plans`); writes service-role only.

### 4.2 `tax_transactions` (new — per-sale immutable accrual + audit)
```
id uuid pk, creator_id uuid→profiles, fy text,
order_id uuid→orders null, submission_id uuid→payment_submissions null,  -- exactly one set
gross_amount numeric, commission_gross numeric, commission_net numeric, gst_on_commission numeric,
creator_registered bool, gstin text, pan_present bool,
tds_amount numeric default 0, tcs_amount numeric default 0,
settled bool default false,            -- TDS+TCS settle together at one payout
settling_payout_id uuid→creator_payouts null,
rate_snapshot jsonb, status text check (status in ('posted','reversed')) default 'posted',
reverses_id uuid→tax_transactions null, created_at timestamptz,
check ((order_id is not null) <> (submission_id is not null))   -- polymorphic source, exactly one
```
Both product orders and payment-link submissions credit creator earnings, so both are taxed and both count toward the turnover thresholds — hence the polymorphic source (mirrors how the money path already routes `pl_*` vs product orders). A `reversed` counter-row carries the refunded gross as positive values; all aggregates do `FILTER (status='posted') − FILTER (status='reversed')`.
Indexes: `(creator_id, fy)`, `(creator_id) WHERE not tds_settled OR not tcs_settled`, `(created_at)`, partial-unique `(order_id) WHERE status='posted' AND order_id IS NOT NULL` and `(submission_id) WHERE status='posted' AND submission_id IS NOT NULL` (idempotent accrual). RLS: creator SELECT-own (`creator_id = current_profile_id()`) + super_admin; **writes service-role only**.

### 4.3 `creator_kyc` +=
`gstin text`, `gstin_verified bool default false`, `gstin_added_at timestamptz`. "Registered" ≡ `gstin IS NOT NULL`. Written via the new `POST /api/kyc/gstin` (format + checksum only).

### 4.4 `creator_payouts` +=
`tds_withheld numeric default 0`, `tcs_withheld numeric default 0`, `net_amount numeric` (actual bank transfer). `'reversed'` status already exists from Phase 4.

### 4.5 Ledger
`transaction_ledger.tx_type` is free-text (no CHECK) — no migration needed. Tax is tracked in `tax_transactions` + `creator_payouts`, **not** mirrored into the ledger, so the balance formula and `reconcile_creator_balances` are untouched.

---

## 5. RPCs (Postgres, service-role, security-definer)

- **`record_sale_tax(p_creator_id, p_gross, p_commission_gross, p_fy, p_order_id default null, p_submission_id default null)`** → computes the split + threshold-aware TDS/TCS accrual authoritatively (re-implements `tax-math.ts`; reads `fy_turnover` before this sale for the ₹5L check and `creator_kyc` for PAN/GSTIN), inserts the `tax_transactions` row for whichever source is set, returns the row. Called from `fulfillOrder` (order_id) and `fulfillPaymentLinkSubmission` (submission_id) after the balance credit. Idempotent via the per-source partial-unique index.
- **`fy_turnover(p_creator_id, p_fy)`** → `SUM(gross_amount) FILTER (status='posted') − SUM(gross_amount of reversed)`; used by the payout gate and the sale-time threshold check.
- **`begin_payout_tax(p_payout_id, p_creator_id)`** → reserves the creator's unsettled posted rows (`settling_payout_id = p_payout_id`) and returns `{tds_withheld, tcs_withheld}` = reserved pending **net of any `reversed` counter-rows** against those originals (so a refund before payout reduces the withholding). Called from the payout request path.
- **`settle_payout` (extend)** → on success mark reserved `tax_transactions` `settled = true`; on failure clear `settling_payout_id` on unsettled reserved rows.
- **`settle_refund` (extend, Phase 4 RPC)** → on `success` also write the reversal counter-row + release unsettled pending tax (§3.4).

---

## 6. API routes

- **`POST /api/kyc/gstin`** (new, auth): body `{ gstin }`; validates 15-char GSTIN format + checksum; upserts `creator_kyc.gstin` (+ `gstin_added_at`, `gstin_verified=false`) via service role; returns `{ ok, registered:true }`. Rate-limited (profile-keyed, reuse `rateLimitKey`).
- **`POST /api/payouts/request`** (extend): add the GST turnover gate (409) and `begin_payout_tax` withholding computation; persist `tds_withheld`/`tcs_withheld`/`net_amount`.
- **`POST /api/admin/payouts/[id]/approve`** (extend): Cashfree transfer uses `net_amount`.
- **`POST /api/webhook/cashfree-payout`** (extend): success/failure already call `settle_payout` — tax settle/release rides along.

---

## 7. Pure module + TDD

**`src/lib/shared/tax-math.ts`** (isomorphic; RPC re-computes authoritatively):
- `splitCommission(commissionGross, gstRate)` → `{ commissionNet, gstOnCommission }`.
- `accrueSaleTax({ gross, fyGrossBefore, panPresent, registered, rates })` → `{ tdsAmount, tcsAmount }` with the ₹5L threshold + no-PAN branches.
- `reverseSaleTax(saleRow, refundFraction)` → proportional reversal amounts.
Unit tests (`tax-math.test.ts`) cover: GST-inclusive split rounding, below/above ₹5L, no-PAN 5%, unregistered→no-TCS, registered TCS, threshold-crossing sale, proportional refund reversal, non-finite guards.

---

## 8. UI (dashboard tokens, light + dark)

- **Withdraw drawer** (`/dashboard/earnings`): tax preview block `Gross ₹900 · TDS −₹1 · TCS −₹5 · You receive ₹894` via `usePayoutTaxPreview`. If gated (≥₹20L, no GSTIN) → blocking state + **"Add GSTIN"** opening the GSTIN modal.
- **GSTIN modal:** input → format+checksum → `POST /api/kyc/gstin`; on success invalidates earnings/tax queries.
- **Earnings Tax card:** per-FY TDS withheld / TCS withheld / GST-on-commission with a monthly mini-breakdown (`useTaxSummary` over `tax_transactions`). One-line "10% fee is GST-inclusive" note. **No PDF downloads** (Phase 6).
- **Registration banner:** `--warning`-tinted, shown when turnover ≥ ₹20L and no GSTIN, linking to the GSTIN modal.

## 9. Hooks
- `usePayoutTaxPreview()` → `['earnings','tax-preview']` — unsettled pending TDS/TCS + gate state.
- `useTaxSummary(fy?)` → `['tax','summary', fy]` — per-FY aggregates + monthly breakdown.
- `useAddGstin()` mutation → `POST /api/kyc/gstin`.

---

## 10. Scope, testing, CA-review flags

**In scope:** everything above. **Out of scope (Phase 6):** all documents/exports/remittance, live GSTIN/PAN verification, product-GST-rate capture, registered-creator buyer-side GST pricing.

**Verification:** `tax-math` unit suite; `npx tsc`/lint; live SQL — a sale writes `tax_transactions`; `fy_turnover` correct; a payout withholds + settles + transfers `net_amount`; a refund writes the reversal row; `reconcile_creator_balances()` still 0 drift (unchanged).

**Flagged for CA review (documented, not blockers):**
1. TDS/TCS cash withheld at **payout** though 194-O liability arises at credit-or-payment whichever earlier — the internal wallet credit is a provisional accrual; withholding at the payment (payout) event is the industry-standard simplification.
2. The ₹5L-crossing sale is taxed on full gross (not just the excess).
3. TCS computed on **gross** (not ex-GST taxable value) — product-GST-rate capture deferred to Phase 6.
4. Already-settled TDS/TCS is not cash-reversed on refund (claimed in ITR / netted in GSTR-8 via the reversal counter-row).

## 11. References
- Phase 4 spec/plan (predecessor money path).
- Blueprint `.claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md` §3 (CA model), §7 (schema sketch).
- ClearTax §194-O · Dhanaay 194-O marketplace deductions · GSTHero TCS 0.5% · Tax2win influencer GST ₹20L · CBIC Notif 15/2024 (TCS→0.5%) · Notif 65/2017 (service-supplier registration).
