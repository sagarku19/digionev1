---
noteId: "phase6c-tax-exports-20260706"
tags: []
---

# Phase 6c — Government Return Data Exports (GSTR-8 / 26Q / GSTR-1) — Design Spec

**Captured:** 2026-07-06 · **Phase:** 6c of the payments/earnings/payout/KYC/tax/invoices overhaul (`.claude/todo-later/11(half)-…`). Final slice of Phase 6.
**Predecessors:** Phase 5 (tax data), Phase 6a/6b (docs). This is platform-ops tooling — DigiOne's own ECO filing data, not creator-facing.

## Goal

A terminal admin tool that exports **accountant-ready CSV data** for DigiOne's three e-commerce-operator tax returns — **GSTR-8** (TCS collected), **26Q** (TDS deducted), **GSTR-1** (DigiOne's output GST on commission) — for a given period, so a CA can prepare and file the returns. **Not** portal-ready JSON/FVU and **not** e-filing (both are format-fragile filing-software concerns, out of scope).

**Delivery:** a terminal script `scripts/tax-export.ts`, consistent with the existing admin scripts (`kyc-admin.ts`, `subscription-admin.ts`, `refund-admin.ts`). No routes, no UI (admin UI is deferred to the separate admin app), no migration.

## 1. The three exports

Each writes a CSV to `./tax-exports/` (gitignored — sensitive).

### GSTR-8 (TCS) — monthly, `gstr8 <YYYY-MM>`
TCS collected by the ECO on **registered** creators' supplies. Source: `tax_transactions` where `creator_registered = true`, in the month by **sale date** (`created_at`), grouped by creator. Net of refunds (posted +1, reversed −1).
Columns: `creator_id, gstin, gross_supplies, returned_supplies, net_supplies, tcs_amount, month`.
- `gross_supplies` = Σ gross_amount(posted); `returned_supplies` = Σ gross_amount(reversed); `net_supplies` = gross − returned; `tcs_amount` = Σ tcs_amount(posted − reversed).

### 26Q (TDS) — quarterly, `26q <YYYY-YY> <Q1|Q2|Q3|Q4>`
TDS deducted u/s 194-O, per deductee (creator). TDS actually deducted = `creator_payouts.tds_withheld` for `status='success'` payouts in the quarter (by payout date). "Amount credited" reference = gross sales for the creator in the quarter (`tax_transactions`, sale date, net of refunds). Requires the deductee **PAN** (decrypted from `creator_kyc.pan_enc`).
Columns: `creator_id, pan, deductee_name, amount_credited, tds_deducted, section, quarter`.
- `section` = `'194O'`; rows only where `tds_deducted > 0`.

### GSTR-1 (DigiOne output GST) — monthly, `gstr1 <YYYY-MM>`
DigiOne's outward supply = the commission (facilitation service) it charges creators; output GST 18%. Source: `tax_transactions` in the month by sale date, net of refunds. Per creator: **B2B** (creator has GSTIN → recipient GSTIN row) or **B2C** (aggregated single row for the rest).
Columns: `supply_type, recipient_gstin, taxable_value, gst_amount, month`.
- `taxable_value` = Σ commission_net(posted − reversed); `gst_amount` = Σ gst_on_commission(posted − reversed). B2C rows aggregate all unregistered creators into one line (`recipient_gstin` blank).

**FY quarters (26Q):** Q1 = Apr–Jun, Q2 = Jul–Sep, Q3 = Oct–Dec, Q4 = Jan–Mar (Q4 spans into the next calendar year of the FY label).

## 2. Architecture

- **Pure core** `src/lib/server/tax-export.ts` (server, no DB): typed input-row interfaces + `buildGstr8Rows`, `build26qRows`, `buildGstr1Rows` (aggregation/grouping → typed output rows) + `toCsv(headers: string[], rows: (string|number)[][]): string` (RFC-4180 escaping). Fully unit-testable.
- **Thin script** `scripts/tax-export.ts` (`npx tsx --env-file=.env.local scripts/tax-export.ts <cmd> …`): parses the command, computes the period bounds, fetches rows via `createServiceClient()`, decrypts PANs (only for `26q`, via `decryptField` from `src/lib/server/kyc-crypto`), calls the pure builder, writes `./tax-exports/<name>.csv`, prints the path + a summary (row count, total tax). Mirrors `scripts/subscription-admin.ts` structure (a pure lib + a thin CLI).
- **Data model:** none new. Reads `tax_transactions`, `creator_payouts`, `creator_kyc`. Adds `tax-exports/` to `.gitignore`.
- **Money path:** untouched.

## 3. Sensitivity & CA-flags
1. **PAN in the 26Q export:** that CSV contains **decrypted full PANs** (required for a TDS return). It is a sensitive artifact — admin-only, local, service-role, gitignored, never committed or shared beyond the filing CA. GSTR-8/GSTR-1 use GSTIN only (no PAN).
2. **Date bases:** TCS (GSTR-8) and GSTR-1 are sale-date; 26Q TDS is payout-date (accrue-per-sale / withhold-at-payout). Each CSV header notes its basis.
3. **Informational data, not a filed return:** the CA/filing software produces the statutory return from these figures. Rates/thresholds follow Phase 5 (`tax_rules`).
4. **26Q "amount credited"** is the quarter's gross sales (sale-date) as a reference alongside `tds_deducted` (payout-date); the CA reconciles the timing.

## 4. Scope, deferred, testing

**In scope:** the three CSV exports + the pure builders + the terminal script + `.gitignore`.
**Deferred:** portal-ready JSON/FVU formats; actual e-filing/API submission; GSTR-3B / annual returns; an admin UI (→ admin app); scheduled/automated exports; multi-GSTIN (DigiOne assumed single-registration).
**Testing:** unit tests for `buildGstr8Rows` / `build26qRows` / `buildGstr1Rows` (grouping, net-of-refunds, B2B/B2C split, tds>0 filter, totals) and `toCsv` (comma/quote/newline escaping); a check that `.gitignore` includes `tax-exports/`; `tsc`/`lint`. The script itself is exercised manually (`npx tsx …`); the value lives in the tested pure builders.

## 5. References
- Phase 5 spec (`tax_transactions`, `creator_payouts.tds_withheld`/`tcs_withheld`, `tax_rules`).
- Existing admin scripts: `scripts/subscription-admin.ts` (pure-lib + thin-CLI pattern), `scripts/refund-admin.ts`.
- KYC crypto: `src/lib/server/kyc-crypto.ts` (`decryptField`).
- Blueprint `.claude/todo-later/11(half)-…` §3 (CA tax model, GSTR-8/26Q/GSTR-1 obligations).
