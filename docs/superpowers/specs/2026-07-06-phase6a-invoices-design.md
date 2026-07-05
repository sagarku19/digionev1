---
noteId: "phase6a-invoices-20260706"
tags: []
---

# Phase 6a — Invoice Engine + Core Invoices — Design Spec

**Captured:** 2026-07-06 · **Phase:** 6a of the payments/earnings/payout/KYC/tax/invoices overhaul (`.claude/todo-later/11(half)-…`). First slice of Phase 6.
**Predecessor:** Phase 5 (tax engine) — BUILT. This consumes `tax_transactions` (`commission_net`, `gst_on_commission`) and `creator_kyc` (seller identity, GSTIN).

## Goal

A shared server-side PDF invoice engine (`@react-pdf/renderer`) plus the two invoices every transaction needs: the **buyer purchase invoice** (Bill of Supply / receipt) and the **DigiOne→creator monthly commission tax invoice** (DigiOne's GSTIN, 18% GST on commission). PDFs are generated on-demand, cached in private R2, and served by owner-scoped signed URLs — **fully decoupled from the Phase 4/5 money path** (no `fulfillOrder` changes).

**Decomposition:** Phase 6 splits into 6a (this: engine + core invoices), 6b (Form 16A + annual earnings statement), 6c (GSTR-8/26Q/GSTR-1 government exports). Each is its own spec→plan→build cycle. This spec is 6a only.

---

## 1. Documents & legal shape

| Document | Issuer → Recipient | Tax treatment | Source |
|---|---|---|---|
| **Buyer purchase invoice** | **Creator** → Buyer | **Bill of Supply** (no GST) for the unregistered majority. Registered-creator *Tax Invoice with sale-GST* is **deferred** (needs Phase 5's deferred product-GST-rate capture). | `orders` + `order_items` + creator identity (`creator_kyc`) + buyer contact |
| **Commission tax invoice** | **DigiOne** → Creator | Always **Tax Invoice**, 18% GST on commission (DigiOne is GST-registered — the Phase 5 model requires it) | monthly aggregate of `tax_transactions` |

### 1.1 Invoice numbering
GST requires a consecutive series, unique per issuer per FY.
- **Creator sale series:** `{creatorPrefix}/{fy}/{NNNNNN}` — sequential **per creator per FY** (`series_key = creator_id`). `creatorPrefix` = `'INV'` (fixed) unless a per-creator prefix is later added.
- **DigiOne commission series:** `DIGI/{fy}/{NNNNNN}` — one global series (`series_key = 'digione'`).
- Numbers are allocated atomically by the `issue_invoice` RPC (§3) and are idempotent per order (sale) / creator-month (commission).
- **CA-flag:** numbering is by **issue (first-download) order**, not strictly transaction order — a documented v1 simplification. `invoice_date` is set to the transaction/period date, so dates are correct even if the number sequence isn't strictly time-ordered. Moving issuance into `fulfillOrder` would make it strictly sequential; the schema already supports that.

### 1.2 Seller identity
- **Commission invoice** seller = **DigiOne**, from new server-only env config (`DIGIONE_LEGAL_NAME`, `DIGIONE_GSTIN`, `DIGIONE_PAN`, `DIGIONE_ADDRESS`, `DIGIONE_STATE`, `DIGIONE_STATE_CODE`) via `src/lib/server/invoices/digione-identity.ts`.
- **Sale invoice** seller = the **creator**, from `creator_kyc` (`legal_name`, `gstin`, address fields, `state`). Recipient = the order's buyer contact.

---

## 2. Architecture

### 2.1 PDF engine (`src/lib/server/invoices/`, server-only)
- `@react-pdf/renderer` document components: `SaleInvoiceDoc`, `CommissionInvoiceDoc` — share layout primitives (issuer header, party blocks, line-item table, tax summary, footer). Each takes a typed `InvoiceModel` and renders; `renderToBuffer(<Doc data={…}/>)` → `Buffer`.
- Pure **data-builders** (`buildSaleInvoiceModel`, `buildCommissionInvoiceModel`) build the typed model from DB rows — **unit-testable without rendering**. The PDF components are dumb presentational functions of the model.

### 2.2 Generation model — on-demand, cached, decoupled
On first request (download):
1. `issue_invoice` RPC (§3) atomically allocates the number + inserts the `invoices` row **with a frozen content snapshot** in `metadata` (parties, line items, tax). Idempotent: returns the existing row for a given order / creator-month.
2. If `invoices.storage_file_id` is null, build the model from the snapshot → `renderToBuffer` → upload to R2 at the **deterministic key** `{creator_id}/invoices/{invoice_number}.pdf` → write `storage_files` (`kind='invoice'`, `visibility='private'`, `bucket='creator-content'`) → set `invoices.storage_file_id`.
3. Mint a short-TTL signed URL for the object and return it.

Re-downloads reuse the cached object (deterministic key + existing row). Concurrent first-requests are safe (deterministic key overwrite; `issue_invoice` idempotency); a rare concurrent first-issue wastes at most one counter number (tolerated gap, noted). **No `fulfillOrder` changes** — 6a never touches the money path.

The content snapshot in `metadata` makes each invoice **reproducible and legally immutable** — the PDF is rendered from the frozen snapshot, not live joins, so later KYC/name changes never alter an issued invoice.

### 2.3 Storage & serving
Private R2 via the existing `storage` provider + `storage_files`. Served by owner-scoped signed-URL routes (§4). No public URL, ever. Invoices count against the creator's `sumOwnerBytes` quota like any other file.

---

## 3. Data model

### 3.1 `invoices` (new — issued-invoice registry)
```
id uuid pk, type text check (type in ('sale','commission')), issuer text check (issuer in ('creator','digione')),
creator_id uuid not null → profiles, order_id uuid → orders null, period_month text null,  -- 'YYYY-MM' for commission
fy text not null, invoice_number text not null unique, invoice_date date not null, is_tax_invoice boolean not null,
subtotal numeric not null, tax_amount numeric not null default 0, total numeric not null, currency text not null default 'INR',
storage_file_id uuid → storage_files null, metadata jsonb, created_at timestamptz not null default now()
```
Guards: `unique(invoice_number)`; partial-unique `(order_id) WHERE type='sale'`; partial-unique `(creator_id, period_month) WHERE type='commission'`. Indexes: `(creator_id, type, invoice_date desc)`.
RLS: creator SELECT-own (`creator_id = current_profile_id()`) + super_admin; **writes service-role only**. Buyer sale-invoice access is via the API route (service-role, verifies order ownership), not RLS.

### 3.2 `invoice_counters` (new — atomic numbering)
```
id uuid pk, series_key text not null, fy text not null, last_number bigint not null default 0, unique(series_key, fy)
```
RLS: enabled, no policies (service-role only).

### 3.3 RPC `issue_invoice(...)` (service-role, security-definer)
Params: `p_type, p_issuer, p_creator_id, p_order_id?, p_period_month?, p_fy, p_is_tax_invoice, p_subtotal, p_tax_amount, p_total, p_series_key, p_prefix, p_invoice_date, p_metadata`.
Logic (atomic, idempotent):
1. Return the existing row if one matches (`type='sale' AND order_id=?` or `type='commission' AND creator_id=? AND period_month=?`).
2. Else `INSERT … ON CONFLICT (series_key, fy) DO UPDATE SET last_number = last_number + 1 RETURNING last_number` on `invoice_counters`; format `invoice_number = p_prefix || '/' || p_fy || '/' || lpad(seq::text, 6, '0')`.
3. `INSERT` the `invoices` row (with the partial-unique guards as the race backstop → on conflict, re-select and return the existing row).
Returns the `invoices` row. A separate lightweight update sets `storage_file_id` after the PDF is cached (done in app code, not this RPC).

`current_fy()` (from Phase 5) supplies the FY label. No changes to any Phase 4/5 RPC.

---

## 4. Routes

Both GET, auth-required, mint a short-TTL signed URL, `Cache-Control: no-store`, mirror `/api/deliverables`:

- **`GET /api/invoices/sale/[orderId]`** → buyer purchase invoice. Access: the sale's **creator** (owns it) OR the order's **buyer** (`orders.user_id = auth user` or `orders.customer_email = auth email`). Builds the sale model (Bill of Supply for unregistered; registered-creator tax invoice deferred → still a Bill of Supply in 6a), issues + caches, returns `{ signedUrl, ttlSeconds, invoiceNumber }`. Errors: `400` (bad orderId), `401`, `403` (not creator/buyer), `404` (order not found / not paid), `500`.
- **`GET /api/invoices/commission/[month]`** (`month = YYYY-MM`) → creator's monthly commission tax invoice. Creator-only. Aggregates that month's `tax_transactions` (posted − reversed) for the creator; `404` if no commission. Issues + caches, returns `{ signedUrl, ttlSeconds, invoiceNumber }`. Errors: `400` (bad month), `401`, `404` (no profile / no commission), `500`.

---

## 5. Dependency, config, UI, hooks

- **New dep:** `@react-pdf/renderer` (approved) in `package.json`.
- **New env (server-only):** `DIGIONE_LEGAL_NAME`, `DIGIONE_GSTIN`, `DIGIONE_PAN`, `DIGIONE_ADDRESS`, `DIGIONE_STATE`, `DIGIONE_STATE_CODE` — documented in `env-vars.md` + `.env.example`; read via `digione-identity.ts` (throws a clear error if `DIGIONE_GSTIN` is missing when a commission invoice is requested).
- **UI (dashboard tokens, light+dark):**
  - Buyer: "Download invoice" on `app/payment/receipt` (+ account/library order view) → sale route.
  - Creator: "Invoice" button in the orders drawer (`app/dashboard/orders`) → sale route.
  - Creator: a "Tax invoices" card on `app/dashboard/earnings` listing recent commission months → commission route per month.
- **Hooks** (`src/hooks/commerce/useInvoices.ts`): `useDownloadSaleInvoice()`, `useDownloadCommissionInvoice()` (mutations: fetch route → open `signedUrl`), `useCommissionMonths()` (query over `tax_transactions` → months with commission).

---

## 6. Scope, deferred, testing

**In scope:** PDF engine + data-builders, commission monthly tax invoice, buyer Bill-of-Supply invoice, `invoices` + `invoice_counters` + `issue_invoice`, R2 storage + 2 signed-URL routes, DigiOne identity config, download UI + hooks.

**Deferred (honest):**
- Registered-creator buyer **Tax Invoice with sale-GST breakdown** (needs Phase 5's deferred product-GST-rate capture); buyer GSTIN / B2B ITC.
- Subscription SaaS tax invoice (Phase 3 billing is still terminal/deferred — nothing live to invoice).
- Email delivery of invoices; Form 16A + annual statement (6b); GSTR-8/26Q/GSTR-1 exports (6c).

**Testing:** unit tests for `buildSaleInvoiceModel` / `buildCommissionInvoiceModel` (amounts, tax lines, Bill-of-Supply vs Tax-Invoice branch, `{prefix}/{fy}/{NNNNNN}` formatting) + a `renderToBuffer` smoke (non-empty PDF buffer); live SQL sanity on `issue_invoice` idempotency (same order/month → same number, one row); `tsc`/`lint`/`/verify`; light + dark UI check.

## 7. CA-review flags
1. Invoice numbering is by issue (first-download) order, not strictly transaction order (`invoice_date` is still the transaction/period date).
2. 6a issues a **Bill of Supply** for all creators; the registered-creator GST **Tax Invoice** on sales is deferred until product-GST-rate capture lands.
3. Assumes DigiOne is GST-registered (required by the Phase 5 commission-GST model).

## 8. References
- Phase 5 spec/plan (tax engine — data source).
- Blueprint `.claude/todo-later/11(half)-…` §3.4 (invoices as legal artifacts), §4b (storage/PDF).
- `@react-pdf/renderer` (`renderToBuffer` server-side); storage patterns in `.claude/rules/api-routes.md` → Storage, `/api/deliverables`.
