---
noteId: "phase6b-statements-20260706"
tags: []
---

# Phase 6b — Creator Annual Earnings & Tax Statement — Design Spec

**Captured:** 2026-07-06 · **Phase:** 6b of the payments/earnings/payout/KYC/tax/invoices overhaul (`.claude/todo-later/11(half)-…`). Second slice of Phase 6.
**Predecessors:** Phase 5 (tax engine — data source) + Phase 6a (PDF engine — reused). This adds one informational statement; no money-path or schema changes.

## Goal

A single per-creator, per-financial-year **"Annual Earnings & Tax Statement"** PDF summarizing sales, platform commission + GST, net earnings, and TDS/TCS withheld — reusing the 6a `@react-pdf/renderer` engine and R2 signed-URL delivery. Informational only: it explicitly directs the creator to TRACES for the statutory Form 16A.

**Legal framing (decided):** a statutory **Form 16A** can only be generated from the government **TRACES** portal by the deductor after filing the quarterly **26Q** return — a platform cannot self-generate a valid one. 6b therefore produces an **informational statement** with a TRACES disclaimer, not a statutory certificate.

## 1. The document & data sources

One PDF per creator per FY. Reuses the 6a `@react-pdf` primitives via a new `StatementDoc` (summary-table layout, not invoice-shaped).

| Line | Source | Date basis |
|---|---|---|
| Gross sales | `tax_transactions` (posted − reversed) | sale date (FY) |
| Platform commission | `tax_transactions.commission_gross` (posted − reversed) | sale date |
| GST on commission (18%) | `tax_transactions.gst_on_commission` (posted − reversed) | sale date |
| Net earnings | gross − commission | derived |
| **TDS withheld (194-O)** | `creator_payouts.tds_withheld`, `status='success'` in the FY | **payout date** |
| **TCS withheld (§52)** | `creator_payouts.tcs_withheld`, `status='success'` in the FY | payout date |
| Disclaimer | — | "Informational. The statutory Form 16A is issued via the TRACES portal after 26Q filing." |

**Deliberate nuance (noted on the PDF):** earnings are attributed to the FY of the **sale**; TDS/TCS is attributed to the FY of the **payout** (income in the year earned, TDS in the year deducted — matches how 26AS works). Both date-bases are stated so figures reconcile with the creator's 26AS.

## 2. Architecture

- **Pure builder** `buildAnnualStatementModel(input)` → `StatementModel` (unit-testable, no DB). Input = the aggregated FY figures + creator identity + fy label. New `StatementModel` type (distinct from `InvoiceModel`).
- **PDF** `StatementDoc` (`src/lib/server/invoices/statement-documents.tsx`) reusing the shared styling approach from 6a's `documents.tsx`; `renderStatementPdf(model)` (`src/lib/server/invoices/statement-render.tsx`) via `renderToBuffer`.
- **Route** `GET /api/statements/annual/[fy]` (auth, creator-only, `export const runtime = 'nodejs'`): validate `fy` (`^\d{4}-\d{2}$`) → resolve `profileId` → aggregate `tax_transactions` (net-of-refunds, FY by sale `created_at`) + `creator_payouts` (`tds_withheld`/`tcs_withheld`, success, FY by payout date) → if no data → `404` → build + render → upload to private R2 at the deterministic key `{creator_id}/statements/annual-{fy}.pdf` (**always regenerated** — an in-progress FY keeps accruing) → `storage_files` (`kind='tax_doc'`, `visibility='private'`, `bucket='creator-content'`, upsert-by-key) → return `{ signedUrl, ttlSeconds }` with `Cache-Control: no-store`. Reuses the 6a storage helpers (`storage.putObject`/`createDownloadUrl`, `insertFile`/`findLiveByKey`). **No DB registry / no numbering** — a statement is not a serial-numbered legal invoice.
  - FY→date-range: an FY label `2026-27` spans `2026-04-01` (incl.) to `2027-04-01` (excl.). A shared `fyBounds(fy)` helper returns `{ saleStart, saleEnd }` (UTC).
- **Hooks** (`src/hooks/commerce/useStatements.ts`): `useDownloadAnnualStatement()` (mutation: fetch route → open `signedUrl`, mirroring `useInvoices`) + `useStatementYears()` (query over `tax_transactions` → FYs that have any posted commission/sale, newest first).
- **UI:** an "Annual statements" `<Card>` on `app/dashboard/earnings/page.tsx` (near the Tax-invoices card) — one row per FY with a Download button. Dashboard tokens only.

## 3. Data model

**No new tables or migration.** Reuses `storage_files` (`kind='tax_doc'`), `tax_transactions` (read), `creator_payouts` (read), `creator_kyc` (creator identity). The FY→FY-bounds helper is pure TS.

## 4. FY-bounds + aggregation detail

`fyBounds('2026-27')` → `{ saleStart: '2026-04-01', saleEnd: '2027-04-01' }` (UTC, half-open). Sales aggregation: sum over `tax_transactions` where `creator_id = ?` AND `created_at ∈ [saleStart, saleEnd)`, applying `posted` as +1 and `reversed` as −1 (net of refunds) for `gross_amount`, `commission_gross`, `gst_on_commission`. TDS/TCS aggregation: sum `creator_payouts.tds_withheld`/`tcs_withheld` where `creator_id = ?` AND `status='success'` AND the payout's `processed_at` (fallback `created_at`) `∈ [saleStart, saleEnd)`.

## 5. Scope, deferred, testing

**In scope:** the annual statement builder + PDF + route + hooks + earnings UI.

**Deferred:** quarterly TDS statements; the real TRACES Form 16A integration; GSTR-8/26Q/GSTR-1 exports (6c); email delivery; caching/immutability of past-FY statements (always regenerated for v1).

**Testing:** unit tests for `buildAnnualStatementModel` (figures, derived net earnings, zero-FY, INR formatting label) + `fyBounds`; a `renderStatementPdf` smoke test (non-empty `%PDF-` buffer). tsc/lint/`/verify`, light+dark UI check on the earnings card.

## 6. Notes / CA-flags
1. Informational statement, not the statutory Form 16A (which comes from TRACES post-26Q).
2. Earnings on sale-date basis, TDS/TCS on payout-date basis (stated on the PDF).
3. `commission_gross` in `tax_transactions` is the GST-inclusive fee (net + GST); the statement shows commission and GST-on-commission as separate lines summing to it.

## 7. References
- Phase 5 spec (tax data), Phase 6a spec/plan (PDF engine + storage pattern reused).
- `@react-pdf/renderer` `renderToBuffer`; `src/lib/server/invoices/` (6a engine); `src/lib/storage` helpers.
