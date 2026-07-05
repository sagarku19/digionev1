---
noteId: "013882f05cdb11f1b92a4b3b6ebe345a"
tags: []

---

# API Routes

Every route under `app/api/`. Source-of-truth for what auth each one expects, what shape it takes, and what tables it touches.

## At a glance

| Method | Path | Auth | Client | Writes to |
|---|---|---|---|---|
| GET | `/api/auth/callback` | OAuth/email-link code | server (cookie) | sets session cookie; claims guest entitlements |
| POST | `/api/auth/buyer-signup` | none (public) | service role | `auth.users` (confirmed, no verification email) |
| POST | `/api/account/claim-entitlements` | cookie session | server + service role | `user_product_access`, `guest_entitlements` |
| POST | `/api/account/upgrade-to-creator` | cookie session | server + service role | `auth.users` (`app_metadata.role`), `users.role`, `profiles` |
| POST | `/api/checkout/create` | none (buyerId optional) | service role | `orders`, `order_items`, `guest_entitlements` (free guest orders) |
| POST | `/api/checkout/payment-link` | none | service role | `payment_requests`, `payment_submissions` |
| POST | `/api/refunds/create` | cookie session | server + service role | `refunds`, `wallet_frozen_logs`, `creator_balances.frozen_balance` (via `begin_refund`); Cashfree PG refund create |
| POST | `/api/webhook/cashfree` | HMAC signature | service role | `orders`, `creator_balances`, `transaction_ledger`, `notifications`, `user_product_access`; `refunds` + `settle_refund` (REFUND_STATUS_WEBHOOK) |
| POST | `/api/webhook/cashfree-payout` | Cashfree Payouts signature (HMAC) | service role | `settle_payout` (success/failed); `TRANSFER_REVERSED` → `settle_payout('failed')` in-flight / `reverse_settled_payout` post-success; separate from `/api/webhook/cashfree` (PG webhook) |
| POST | `/api/coupons/validate` | none | service role | — |
| POST | `/api/leads` | none | service role | `lead_form` |
| POST | `/api/linkinbio/track` | none | service role | `linkinbio_analytics` |
| POST | `/api/payouts/request` | cookie session | service role | `creator_balances`, `creator_payouts` (min ₹100; links `creator_payout_methods.id` as `payout_method_id`; one-in-flight guard → 409 while a pending/processing payout exists); Phase 5 ₹20L GST gate → 409 gstin_required; computes + stores tds_withheld/tcs_withheld/net_amount via begin_payout_tax |
| POST | `/api/admin/payouts/[id]/approve` | cookie session (super_admin, DB role re-read) | server + service role | `creator_payouts` (status→processing), `creator_kyc` (beneficiary_id), `creator_payout_methods`; calls Cashfree beneficiary + transfer of `net_amount` (amount − TDS − TCS) |
| POST | `/api/admin/payouts/[id]/reject` | cookie session (super_admin) | service role | `creator_payouts` via `settle_payout('failed')` (pending-only) |
| POST | `/api/admin/payouts/sync` | super_admin session OR `CRON_SECRET` bearer | service role | reconciles stuck `processing` payouts via Cashfree `getTransfer` → `settle_payout` |
| POST | `/api/kyc/submit` | cookie session | server + service role | `creator_kyc` (forces status=pending, encrypts PAN/bank/UPI; never accepts *_verified/status from client) |
| POST | `/api/kyc/documents` | cookie session | server + service role | `kyc_documents` (links an uploaded creator-private kyc file; validates owner+bucket+kind) |
| POST | `/api/kyc/payout-method` | cookie session | server + service role | `creator_kyc` — focused payout update: re-encrypts bank/UPI, resets ONLY bank/UPI verification + `beneficiary_id`, sets `status=pending`; keeps identity (`pan_verified`, legal_name) intact |
| POST | `/api/kyc/gstin` | cookie session | server + service role | `creator_kyc` (gstin; format+checksum validated) |
| GET | `/api/products/search` | none | service role | — |
| GET | `/api/sites/check-slug` | none | service role | — |
| POST | `/api/sites/create` | cookie session | server + service role | `sites`, `site_main`/`site_singlepage`/`linkinbio_pages`, `site_sections_config`, `site_design_tokens`, `site_navigation` |
| POST | `/api/upload` | cookie session | server + service role | R2 presigned PUT (private buckets only); `storage_files` row written by `/confirm` |
| POST | `/api/upload/confirm` | cookie session | server + service role | `storage_files` (writes metadata row after successful PUT) |
| POST | `/api/media/upload` | cookie session | server + service role | R2 `digione-media`; `storage_files` |
| POST | `/api/media/derive` | cookie session | server + service role | R2 `digione-media`; `storage_files` (derivative row); soft-delete of replaced file |
| GET | `/api/media/resolve` | cookie session | server + service role | — (reads `storage_files`, returns original + crop) |
| GET | `/api/media/list` | cookie session | server + service role | — (lists creator originals from `storage_files`) |
| POST | `/api/media/delete` | cookie session | server + service role | R2 (object delete); `storage_files` (hard-cascade delete of original + derivatives) |
| GET | `/api/deliverables/[productId]` | cookie session | server + service role | — (mints R2 signed download URLs via `storage_files`) |
| POST | `/api/private/download` | cookie session | server + service role | — (mints R2 signed URL for `creator-content` only) |
| GET | `/api/admin/kyc/[creatorId]/download` | cookie session (super_admin) | server + service role | `kyc_access_log` (writes on every mint) |

---

## Auth

### `GET /api/auth/callback`

Supabase email/OAuth confirm callback. Exchanges `code` for a session cookie and redirects.

| Query | Type | Notes |
|---|---|---|
| `code` | string | Supabase auth code |
| `next` | string? | Redirect target after success. Default `/dashboard` |

**Success:** `302 → {origin}{next}`
**Failure:** `302 → /login?error=...`

Also claims guest entitlements: after the session exists it calls `claimGuestEntitlements(user.email, user.id)` (see `src/lib/server/entitlements.ts`) so OAuth/email buyers inherit any purchases made under that email before signing up.

---

### `POST /api/auth/buyer-signup`

Frictionless buyer account creation — **no verification email**. Uses the service role to `auth.admin.createUser({ email_confirm: true, user_metadata: { full_name, role: 'buyer' } })`, then promotes `app_metadata.role = 'buyer'` via `updateUserById` (the `handle_new_user` trigger reads `user_metadata.role` for `public.users.role`). The client signs in with `signInWithPassword` afterward; claiming runs once a session exists (library load / callback).

```json
// Request
{ "email": "string", "password": "string (min 6)", "fullName": "string?" }
```

**Success:** `{ ok: true }`
**Errors:** `400` (bad email / short password), `409` (email already registered), `429` (rate limit — 10/min/IP), `500`.

---

### `POST /api/account/claim-entitlements` (auth required)

Copies every unclaimed `guest_entitlements` row matching the **verified JWT email** into `user_product_access`, then stamps the rows `claimed_by_user_id`. Idempotent + retryable. Email is read from `getUser()`, never the body. Triggered once on `/account/library` load and from the auth callback.

**Success:** `{ claimed: number }`
**Errors:** `401` (no session), `500`.

---

### `POST /api/account/upgrade-to-creator` (auth required)

Promotes a logged-in buyer to creator. Updates **both** role stores: JWT `app_metadata.role` (proxy.ts dashboard gate) and `public.users.role` (login/reset redirect), and ensures a `profiles` row exists. The client then runs `refreshSession()` + invalidates `['auth','session']` + `router.refresh()` so no re-login is needed.

**Success:** `{ ok: true }`
**Errors:** `401` (no session), `500`.

---

## Checkout

### `POST /api/checkout/create`

Product checkout. Verifies prices server-side, creates an `orders` row, calls Cashfree, returns a `payment_session_id` for the Cashfree JS SDK.

```json
// Request
{
  "items": [{ "id": "uuid" }],
  "buyerId": "uuid?",
  "couponCode": "string?",
  "referralCode": "string?",
  "contact": { "name": "string", "email": "string", "phone": "string" },
  "upsellPageId": "uuid?"
}
```

```json
// Success (paid)
{ "orderId": "uuid", "gatewayOrderId": "ord_...", "amount": 999, "payment_session_id": "...", "environment": "sandbox" | "production" }

// Success (free order, total === 0)
{ "orderId": "uuid", "amount": 0, "status": "completed" }
```

**Errors:** `400` (empty cart, unpublished product, multi-creator cart), `429` (rate limit — 10/min/IP), `502` (Cashfree failure), `500` (other).

**Side effects:** Inserts pending `orders` row (`status: 'pending'`). All items must belong to one creator. Re-reads `price` from DB — never trusts client. Coupon validation is shared via `src/lib/server/coupons.ts` (full expiry/usage-cap checks); valid coupon stores `coupon_id` + `discount_amount` in `orders.metadata`. Free orders (`total === 0`) run through `fulfillOrder` directly — no Cashfree call. **Referral:** a valid `referralCode` (validated via `src/lib/server/referrals.ts`) writes a pending `order_referrals` row; the platform-fee-funded commission is settled in `fulfillOrder` (step 7). Only creator-owned codes (`owner_creator_id`) pay commission.

---

### `POST /api/checkout/payment-link`

Custom-amount payment links for `payment_requests` sites. Does **not** auto-create a `payment_requests` row — the site must exist, be active (`is_active = true`), and have `site_type = 'payment'`; otherwise 404.

```json
// Request
{ "siteId": "uuid", "name": "string", "email": "string", "phone": "string?", "amount": 100 }
```

```json
// Success
{ "payment_session_id": "...", "order_id": "pl_...", "submission_id": "uuid", "environment": "sandbox" | "production", "payment_url": "https://..." }
```

**Errors:** `400` (missing fields, amount < 1, wrong amount for fixed-amount link), `404` (site not found / inactive / wrong type), `429` (rate limit — 10/min/IP), `502` (Cashfree).

---

### `POST /api/webhook/cashfree`

Cashfree → us. The **only** path that flips an order to `completed` and credits a creator balance.

**Auth:** HMAC-SHA256 of raw body using `CASHFREE_CLIENT_SECRET`, base64-encoded, compared with `crypto.timingSafeEqual` against the `x-webhook-signature` header. See `.claude/rules/security-model.md` → Revenue integrity rules.

**Body:** Cashfree v2 webhook envelope. Relevant fields:
```
data.order.order_id            → matches orders.gateway_order_id (or payment_submissions.gateway_order_id for pl_ prefix)
data.payment.payment_status    → SUCCESS | FAILED | USER_DROPPED
data.payment.cf_payment_id     → stored as gateway_payment_id
```

**Type-aware routing** (checked in order):
- `REFUND_STATUS_WEBHOOK` / `data.refund` envelope → refund settlement: matched by `refunds.merchant_refund_id`, then `SUCCESS → settle_refund('success')` (reverses `total_earnings`/`total_platform_fees`, releases the freeze, flips fully-refunded orders to `refunded`, revokes access, notifies), `CANCELLED|FAILED → settle_refund('failed')` (releases the freeze only), `PENDING|ONHOLD → no-op`. Unknown/stray refund → `200 { received: true }`.
- unknown envelope (no `data.order`, no `data.refund`) → `200 { received: true }` (previously `400` — a 400 here caused Cashfree retry storms for non-payment event types).

**Routing by `order_id` prefix (payment webhooks):**
- `pl_*` → payment-link submission: `SUCCESS` calls `fulfillPaymentLinkSubmission`; `FAILED`/`USER_DROPPED` flips `payment_submissions.payment_status = 'failed'`.
- all others → product order: `SUCCESS` calls `fulfillOrder`; `FAILED`/`USER_DROPPED` sets `orders.status = 'failed'`.

**On `SUCCESS` (product orders) — via `src/lib/server/fulfillment.ts` `fulfillOrder`:**
1. Atomic claim: `UPDATE orders SET status='completed' WHERE id=? AND status='pending'` — zero rows = already processed, skip (idempotent).
2. Credit `creator_balances` via `credit_creator_balance` RPC (platform fee from `getPlatformFeeRate()` in `src/lib/server/platform-fee.ts`, currently 0.10).
3. Insert `transaction_ledger` row with `record_hash = sha256(orderId + ':' + cf_payment_id)` (UNIQUE constraint — replay-safe).
4. Insert `notifications` row for the creator.
5. Grant `user_product_access` rows for logged-in buyers (idempotent UNIQUE on `(order_id, product_id)`).
6. Redeem coupon via `increment_coupon_uses` RPC if coupon was applied.

**On `FAILED` / `USER_DROPPED`:** `orders.status = 'failed'` (or `payment_submissions.payment_status = 'failed'` for `pl_` orders).

**Idempotency:** the atomic claim (`WHERE status='pending'`) is the guard — zero rows updated means already processed, returns `200 { received: true }` without re-processing.

---

## Catalog & discover

### `POST /api/coupons/validate`

```json
// Request
{ "code": "SAVE10", "cartAmount": 999, "creatorId": "uuid" }

// Success
{ "valid": true, "discount_amount": 100, "final_price": 899 }
```

**Errors:** `404` (invalid coupon), `400` (expired / not yet active / usage limit), `429` (rate limit — 10/min/IP).

> The `/api/discover` and `/api/discover/[productId]` routes have been deleted. The `/discover` and product-detail pages query Supabase directly via the browser client (public RLS allows anon reads).

---

### `GET /api/products/search`

Fuzzy title search.

| Query | Type | Notes |
|---|---|---|
| `q` | string | Required. Empty → `{ results: [] }` |
| `creator` | uuid? | Scope to one creator |

Returns up to 20 published products. Rate-limited 30/min/IP.

---

## Capture

### `POST /api/leads`

Lead-form capture. Verifies `formId` belongs to `siteId` before inserting.

```json
// Request
{ "formId": "uuid", "siteId": "uuid", "name": "string?", "email": "string?", "mobile": "string?", "custom": { "any": "string" } }
```

At least one of `name`, `email`, `mobile` required. Email format validated if provided.

**Success:** `{ success: true }`
**Errors:** `400` (missing form/site, no contact field, bad email), `429` (rate limit — 5/min/IP), `500`.

---

### `POST /api/linkinbio/track`

Fire-and-forget analytics for link-in-bio pages. **Always returns 2xx**, even on failure — tracking must never block UX.

```json
// Request
{ "site_id": "uuid", "link_id": "uuid?", "event_type": "page_view" | "link_click" | "product_click" | "social_click" }
```

**Rate limit:** 60/min/IP (fail-open — over-limit inserts are silently skipped, never 429). **Dedupe:** additionally skips inserts where the same `site_id + link_id + ip_hash` event occurred in the last 30 seconds. IP is SHA256-hashed, first 16 chars stored.

**Side effects:** Inserts `linkinbio_analytics`. For `link_click`/`product_click`, calls RPC `increment_link_click_count`.

---

## Sites

### `POST /api/sites/create` (auth required)

Creates a `sites` row plus all required sub-tables for the given site type.

```json
// Request
{ "site_type": "main" | "single" | "payment" | "linkinbio", "slug": "string", "title": "string", "description": "string?", "product_id": "uuid?" }
```

**Slug rules:** required for `main`, `single`, `linkinbio`. Ignored for `payment` (URL uses siteId). Uniqueness checked against `sites.slug`.

**Uniqueness per creator:** non-`main` types are 1-per-creator (409 if duplicate).

**Defaults written:**
- `site_main` or `site_singlepage` or `linkinbio_pages` (type-dependent)
- `site_sections_config.sections` (defaults vary by type)
- `site_design_tokens` (palette, typography, radius, spacing)
- `site_navigation` (default nav items)

```json
// Success (201)
{ "siteId": "uuid", "slug": "store/foo" | "site/foo" | "link/foo" | "pay/{siteId}", "creatorId": "uuid" }
```

**Errors:** `401` (no session), `404` (no user/profile), `409` (slug taken or type already exists), `500`.

---

### `GET /api/sites/check-slug?slug=&type=`

| Query | Type | Notes |
|---|---|---|
| `slug` | string | Required for `main`, `single`, `linkinbio` |
| `type` | site type | Required |

**Slug regex:** `^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$` (3–50 chars).

**Response:** `{ available: boolean, error?: string }`. Payment type always returns `{ available: true }`.

---

## Money

### `POST /api/refunds/create` (auth required)

Creator refunds one of their own completed orders. Freeze-then-settle: `begin_refund` (atomic RPC) holds the net clawback in `creator_balances.frozen_balance` and records a `processing` `refunds` row **before** any gateway call; the Cashfree PG refund is then created. Terminal settlement (reverse balances, ledger debit, order flip, access revoke) happens later via the `REFUND_STATUS_WEBHOOK` on `/api/webhook/cashfree` or `scripts/refund-admin.ts sync`.

```json
// Request  (amount omitted = full remaining; min ₹1)
{ "orderId": "uuid", "amount": 400, "reason": "string?" }

// Success
{ "success": true, "refund": { "refundId": "uuid", "merchantRefundId": "rfnd_…", "amount": 400, "feeReversed": 40, "netClawback": 360, "creatorId": "uuid" } }
```

**Guards in order:** auth (401) → creator profile resolved (404) → 5/min **profile-keyed** rate limit (429) → order exists + belongs to caller (404/403) → `begin_refund` state checks. Fee reversal is proportional (the platform returns its fee on the refunded portion); the completing refund takes the exact fee remainder so a fully refunded order nets to zero.

**Errors:** `400` (invalid orderId/amount, over-refund past remaining), `401` (no session), `403` (not your order), `404` (no profile / order not found), `409` (invalid state — order not completed/paid, **missing sale ledger row**, or a refund already `processing` for this order), `429` (rate limit), `502` (gateway rejected — the freeze is released immediately, safe to retry), `500`.

---

### `POST /api/payouts/request` (auth required)

Creator requests a payout. Cookie session required.

```json
// Request
{ "amount": 5000, "payoutMethodId": "uuid" }
```

All operations key on the creator's `profiles.id`, resolved via `resolveProfileId` from `src/lib/server/resolve-profile.ts`. Returns `404` when no profile resolves for the authenticated user.

**Preconditions checked in order:**
1. `profiles.id` resolved → else 404
2. `amount` ≥ 100 (₹100 minimum) → else 400
3. `creator_kyc.status === 'verified'` → else 403
4. No in-flight payout: no existing `creator_payouts` row for the creator in `pending`/`processing` → else 409 (risk control — one payout at a time)
5. `payoutMethodId` belongs to the creator (`creator_payout_methods`) → else 400
6. Available balance = `total_earnings - total_platform_fees - total_paid_out - pending_payout` ≥ `amount` → else 400
7. Optimistic concurrency: `creator_balances.pending_payout` matches the value just read → else 409

**On success:** `pending_payout += amount`, inserts `creator_payouts` row with `status: 'pending'`, `currency: 'INR'`, and `payout_method_id` linked to the chosen `creator_payout_methods` row.

```json
// Success
{ "success": true, "payout": { /* creator_payouts row */ } }
```

---

### `POST /api/kyc/submit` (auth required)

Creator submits KYC details. Cookie session required.

```json
// Request
{ "legal_name": "string", "pan": "string", "bank_account": "string", "ifsc_code": "string",
  "bank_account_name": "string?", "upi_id": "string?", "aadhaar_last4": "string?",
  "dob": "string?", "gender": "string?", "address_line1": "string?", "city": "string?",
  "state": "string?", "postal_code": "string?", "country": "string?" }
```

Body passes through `buildEncryptedKycRow` (`src/lib/server/kyc-row.ts`), which:
- **Allowlists** input fields — any `status`, `kyc_level`, `*_verified`, or admin column in the body is silently dropped.
- Forces `status = 'pending'` and `kyc_level = 'basic'` on every upsert regardless of what the client sends.
- **Encrypts** `pan`, `bank_account`, and `upi_id` at rest (AES-256-GCM via `src/lib/server/kyc-crypto.ts`). Stores only `*_last4` as readable masked values.
- Upserts on `creator_id` (unique constraint added by the Phase 0 migration) so re-submitting before verification overwrites the previous draft.

`creator_kyc` client writes are being locked to service-role-only in the Phase 0 migration — this route is the single authorised write path for creators.

**Success:** `{ ok: true }`
**Errors:** `400` (invalid JSON, required fields missing), `401` (no session), `404` (no creator profile), `500` (upsert failure).

---

### `POST /api/kyc/gstin` (auth required)

Creator submits their GSTIN once FY sales cross the ₹20L GST-registration threshold (the payout gate blocks withdrawals until this is provided). GSTIN is validated **offline** (15-char format + mod-36 checksum) — no live API in Phase 5.

```json
// Request
{ "gstin": "27AAPFU0939F1ZV" }

// Success
{ "ok": true, "registered": true }
```

**Guards:** auth (401) → valid GSTIN format+checksum (400) → creator profile resolved (404) → 5/min profile-keyed rate limit (429). Sets `creator_kyc.gstin` (+ `gstin_added_at`, `gstin_verified=false`). Errors: `400`, `401`, `404`, `429`, `500`.

---

### `POST /api/admin/payouts/[id]/approve` (super_admin only)

Approves a pending payout and initiates the Cashfree Payouts transfer. DB role is re-read on every call — JWT `super_admin` claim alone is not trusted.

**Flow:**
1. Resolve `creator_kyc.beneficiary_id`; if absent, create a Cashfree beneficiary from the KYC + payout-method data and write it back.
2. Call Cashfree Payouts `createTransfer`; store `gateway_payout_id` + `gateway_batch_id` in the `creator_payouts` row and set `status = 'processing'`.
3. Return immediately — terminal status (success/failed) arrives via `/api/webhook/cashfree-payout`.

```json
// Request body — none required (payout ID is in the URL path)

// Success
{ "success": true, "payoutId": "uuid", "gatewayPayoutId": "string" }
```

**Errors:** `401` (no session), `403` (not super_admin), `404` (payout not found or not pending), `409` (payout already processing/settled), `502` (Cashfree error), `500`.

---

### `POST /api/admin/payouts/[id]/reject` (super_admin only)

Rejects a pending payout. Calls `settle_payout('failed', rejectionReason)` which releases `pending_payout` and writes a ledger debit entry marking the reversal.

```json
// Request
{ "reason": "string?" }

// Success
{ "success": true }
```

**Errors:** `401` (no session), `403` (not super_admin), `404` (payout not found), `409` (payout not in pending state), `500`.

---

### `POST /api/admin/payouts/sync` (super_admin OR `CRON_SECRET`)

Reconciliation route. Fetches every `creator_payouts` row stuck in `processing` status, queries Cashfree `getTransfer` for the current terminal state, and calls `settle_payout` for each resolved transfer.

**Auth:** accepts either a valid super_admin cookie session **or** `Authorization: Bearer <CRON_SECRET>` for unattended cron runs.

```json
// Success
{ "synced": 3, "skipped": 1, "errors": 0 }
```

**Errors:** `401` (no auth), `403` (not super_admin and wrong/missing CRON_SECRET), `500`.

---

### `POST /api/webhook/cashfree-payout`

Cashfree Payouts → us. Terminal status updates for payout transfers initiated by the approve route.

**Auth:** HMAC-SHA256 of raw body using `CASHFREE_PAYOUT_WEBHOOK_SECRET`, compared via `crypto.timingSafeEqual`. **Separate** from the PG webhook at `/api/webhook/cashfree` — different product, different secret.

**On `TRANSFER_SUCCESS`:** calls `settle_payout('success', ...)` — releases `pending_payout`, bumps `total_paid_out`, writes a `payout` debit row in `transaction_ledger`.
**On `TRANSFER_FAILED` / `TRANSFER_REVERSED`:** calls `settle_payout('failed', failureReason)` — releases `pending_payout`, writes a reversal ledger entry.

**Idempotency:** `settle_payout` is an atomic Postgres RPC that guards on the current status — a duplicate delivery for an already-settled payout is a no-op.

```json
// Success (always 200 on valid signature)
{ "received": true }
```

**Errors:** `401` (invalid signature). Returns `200` even when the payout is not found (avoids Cashfree retry storms from stray test events).

---

## Storage

All file storage is **Cloudflare R2** (S3-compatible). Routes call `storage.*` from `src/lib/storage/index.ts` — never the aws-sdk directly. The logical bucket names used in route bodies map to real R2 buckets via `src/lib/storage/buckets.ts`.

**Logical → R2 bucket mapping:**

| Logical name | R2 bucket | Public? | Purpose |
|---|---|---|---|
| `public-asset` | `digione-public-assets` | yes | DigiOne platform stock assets |
| `creator-public` | `digione-media` | yes | Creator covers, avatars, banners (images) |
| `creator-content` | `digione-products` | no | Product deliverables |
| `creator-private` | `digione-kyc-private` | no | KYC docs, contracts (write-only for creators) |

Public URLs: `NEXT_PUBLIC_R2_MEDIA_URL` for `creator-public`; `NEXT_PUBLIC_R2_BUCKET_PUBLIC_URL` for `public-asset`.

**`storage_files` metadata table:** every uploaded object has a row (`owner_id`, `bucket`, `object_key`, `file_name`, `mime_type`, `size`, `visibility`, `kind`, `product_id`, `parent_file_id`, `crop`, `created_at`, `deleted_at`). Partial unique on `(bucket, object_key) WHERE deleted_at IS NULL`. Quota = `SELECT sum(size) FROM storage_files WHERE owner_id = ? AND deleted_at IS NULL` via `sumOwnerBytes` in `src/lib/storage/files.ts`. RLS: owner SELECT + super_admin SELECT; writes are service-role only. The old `sum_bucket_bytes_for_prefix` RPC is **retired**.

---

### `POST /api/upload` (auth required)

Issues a **presigned PUT URL** for **private buckets only** (`creator-content`, `creator-private`). Images go through `/api/media/upload` instead — this route is for non-image files (deliverables, KYC docs).

```json
// Request
{
  "filename": "string (sanitized: [A-Za-z0-9._-]+, max 200 chars, no leading dot)",
  "bucket": "creator-content" | "creator-private",
  "productId": "uuid? (optional; creator-content uses 'unassigned' if omitted; UUID-format-validated when present)",
  "kind": "string (defaults to 'other')",
  "category": "'kyc' | 'contracts' | 'other' (required when bucket === 'creator-private')"
}
```

`creatorId` is derived server-side (3-hop `auth.users → users → profiles`). Quota checked via `sumOwnerBytes`; over-quota returns `413 { usedBytes, quotaBytes }`.

```json
// Success
{ "uploadUrl": "https://...", "bucket": "creator-content", "objectKey": "{creator_id}/{product_id}/{ts}_{filename}" }
```

**After upload:** client must call `POST /api/upload/confirm` to write the `storage_files` row.

**Errors:** `400` (bad filename / bucket / category), `401` (no session), `413` (quota exceeded), `500`.

---

### `POST /api/upload/confirm` (auth required)

Called by the client after a successful presigned PUT. HEADs the object in R2 for its actual size and writes the `storage_files` metadata row. Idempotent (upserts on `(bucket, object_key)`).

```json
// Request
{ "bucket": "creator-content" | "creator-private", "objectKey": "string", "productId": "uuid?", "kind": "string?" }
```

```json
// Success
{ "fileId": "uuid" }
```

**Errors:** `400` (missing fields), `401` (no session), `403` (ownership violation), `502` (R2 HEAD error), `500`.

---

### `POST /api/media/upload` (auth required)

Multipart image upload. Receives the raw file, converts to WebP with `sharp`, uploads the original to `digione-media`, writes a `storage_files` row, and returns the public CDN URL.

```
Form data: { file: File, bucket: "creator-public" | "public-asset", kind: "cover" | "avatar" | "banner" | "linkinbio" | "other" }
```

```json
// Success
{ "fileId": "uuid", "publicUrl": "https://media.digione.ai/{objectKey}", "objectKey": "string" }
```

**Errors:** `400` (missing/bad file or kind), `401` (no session), `413` (quota), `500`.

---

### `POST /api/media/derive` (auth required)

Non-destructive crop. Creates a derivative object in R2 from an existing original (or source URL restricted to our R2 public buckets). The original is **never mutated**. The derivative row carries `parent_file_id` + `crop` (jsonb). Optionally soft-deletes a previously replaced derivative (`replacesFileId`).

```json
// Request
{
  "sourceFileId": "uuid?",
  "sourceUrl": "string? (must be an R2 public bucket URL)",
  "crop": { "x": 0, "y": 0, "width": 100, "height": 100, "unit": "%" },
  "kind": "string",
  "replacesFileId": "uuid?"
}
```

```json
// Success
{ "fileId": "uuid", "publicUrl": "string", "objectKey": "string" }
```

**Errors:** `400` (missing source / invalid crop / sourceUrl not our domain), `401` (no session), `403` (not owner), `500`.

---

### `GET /api/media/resolve?url=` (auth required)

Maps a derivative CDN URL back to its original `storage_files` row + saved crop. Used by `ImagePickerModal` to load the re-crop state.

```json
// Success
{ "originalUrl": "string", "originalFileId": "uuid", "crop": { /* saved crop or null */ } }
```

**Errors:** `400` (missing/bad url), `401` (no session), `404` (no matching row).

---

### `GET /api/media/list` (auth required)

Returns the creator's **original** images (rows where `parent_file_id IS NULL`) for the Media Library. Derivatives are excluded.

```json
// Success
{ "files": [{ "id": "uuid", "publicUrl": "string", "kind": "string", "createdAt": "string", "size": 12345 }] }
```

---

### `POST /api/media/delete` (auth required)

Hard-cascade deletes an original image: removes the object from R2, hard-deletes the `storage_files` row, and hard-deletes all derivative rows (+ their R2 objects).

```json
// Request
{ "fileId": "uuid" }
```

```json
// Success
{ "deleted": true }
```

**Errors:** `400` (missing fileId), `401` (no session), `403` (not owner), `404` (not found), `500`.

---

## Downloads (private buckets)

### `GET /api/deliverables/[productId]` (auth required)

Buyer-facing endpoint. Returns short-TTL signed download URLs by querying `storage_files` for rows with `bucket = 'creator-content'` and matching `product_id`, then signing each via R2.

**Access:** verifies a `user_product_access` row exists for `(auth user.id, productId)`. 403 if no row.

```json
// Success
{
  "productId": "uuid",
  "productName": "string",
  "ttlSeconds": 600,
  "files": [
    { "name": "course.zip", "path": "{creator_id}/{productId}/{ts}_course.zip", "signedUrl": "...", "bytes": 12345, "mimeType": "application/zip", "createdAt": "..." }
  ]
}
```

**Errors:** `400` (invalid productId), `401` (no session), `403` (no access row), `404` (product not found), `502` (R2 sign error), `500` (other). TTL is 10 minutes. Max 50 files returned. All responses include `X-Request-ID` + `Cache-Control: no-store`.

---

### `POST /api/private/download` (auth required)

Creator-facing endpoint. Mints a signed download URL for a file in **`creator-content` only** (KYC docs were removed from this route — use the admin route below). Used by dashboard surfaces for deliverable preview before publishing.

```json
// Request
{ "bucket": "creator-content", "path": "{creator_id}/..." }
```

```json
// Success
{ "bucket": "creator-content", "path": "{creator_id}/{product_id}/...", "signedUrl": "...", "ttlSeconds": 600 }
```

**Ownership:** `path` must start with the calling creator's `profile.id`. Strict prefix match. Rejects `..`, leading `/`, backslashes. 403 if path doesn't belong to the caller.

**Errors:** `400` (invalid JSON / bucket / path), `401` (no session), `403` (profile not found / ownership violation / wrong bucket), `502` (R2 sign error), `500` (other). TTL is 10 minutes.

---

### `GET /api/admin/kyc/[creatorId]/download` (super_admin only)

The **only** route that mints a signed URL for the `digione-kyc-private` bucket. Reads `creator_kyc` to locate the object key, signs it via R2, and writes a `kyc_access_log` row on every call. The DB role is re-read (`super_admin` check) — JWT metadata alone is not trusted.

```json
// Success
{ "signedUrl": "...", "ttlSeconds": 600, "creatorId": "uuid" }
```

**Errors:** `401` (no session), `403` (not super_admin or no KYC record), `404` (creator not found), `502` (R2 sign error), `500`. Every successful call writes a `kyc_access_log` row (`admin_id`, `creator_id`, `file_id`, `object_key`, `created_at`).

---

## Conventions

- All routes return JSON. Errors: `{ error: string }` with the appropriate status code.
- Auth-required routes always use `await createClient()` from `lib/supabase/server.ts` + `supabase.auth.getUser()`. Never `getSession()` (see `.claude/rules/anti-patterns.md`).
- Service-role writes must use `createServiceClient()` from `lib/supabase/service.ts`. Never import `createClient` from `@supabase/supabase-js` directly in `/api/*` route handlers.
- Cashfree calls always go through `${CASHFREE_ENV}/orders` with `x-api-version: 2023-08-01`.
- Cashfree return/notify URLs are built from `NEXT_PUBLIC_APP_URL` — never hardcode.
- Server-side price verification is mandatory in any route that creates an order. Never trust `price` or `amount` from the client.
