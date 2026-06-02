---
noteId: "013882f05cdb11f1b92a4b3b6ebe345a"
tags: []

---

# API Routes

Every route under `app/api/`. Source-of-truth for what auth each one expects, what shape it takes, and what tables it touches.

## At a glance

| Method | Path | Auth | Client | Writes to |
|---|---|---|---|---|
| GET | `/api/auth/callback` | OAuth/email-link code | server (cookie) | sets session cookie |
| POST | `/api/checkout/create` | none (buyerId optional) | service role | `orders`, `order_items` |
| POST | `/api/checkout/payment-link` | none | service role | `payment_requests`, `payment_submissions` |
| POST | `/api/webhook/cashfree` | HMAC signature | service role | `orders`, `creator_balances`, `transaction_ledger`, `notifications` |
| POST | `/api/coupons/validate` | none | service role | — |
| GET | `/api/discover` | none | service role | — |
| GET | `/api/discover/[productId]` | none | service role | — |
| POST | `/api/leads` | none | service role | `lead_form` |
| POST | `/api/linkinbio/track` | none | service role | `linkinbio_analytics` |
| POST | `/api/payouts/request` | cookie session | service role | `creator_balances`, `creator_payouts` |
| GET | `/api/products/search` | none | service role | — |
| GET | `/api/sites/check-slug` | none | service role | — |
| POST | `/api/sites/create` | cookie session | server + service role | `sites`, `site_main`/`site_singlepage`/`linkinbio_pages`, `site_sections_config`, `site_design_tokens`, `site_navigation` |
| POST | `/api/upload` | cookie session | server + service role | Supabase Storage (signed URL) |
| GET | `/api/deliverables/[productId]` | cookie session | server + service role | — (mints signed download URLs) |
| POST | `/api/private/download` | cookie session | server + service role | — (mints signed download URL) |

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

**Errors:** `400` (empty cart, unpublished product, multi-creator cart), `502` (Cashfree failure), `500` (other).

**Side effects:** Inserts pending `orders` row (`status: 'pending'`). All items must belong to one creator. Re-reads `price` from DB — never trusts client.

---

### `POST /api/checkout/payment-link`

Custom-amount payment links for `payment_requests` sites. Auto-creates a `payment_requests` row if the site doesn't have one yet.

```json
// Request
{ "siteId": "uuid", "name": "string", "email": "string", "phone": "string?", "amount": 100 }
```

```json
// Success
{ "payment_session_id": "...", "order_id": "pl_...", "submission_id": "uuid", "environment": "sandbox" | "production", "payment_url": "https://..." }
```

**Errors:** `400` (missing fields, amount < 1, wrong amount for fixed-amount link), `502` (Cashfree).

---

### `POST /api/webhook/cashfree`

Cashfree → us. The **only** path that flips an order to `completed` and credits a creator balance.

**Auth:** HMAC-SHA256 of raw body using `CASHFREE_CLIENT_SECRET`, base64-encoded, must equal `x-webhook-signature` header. See `.claude/rules/security-model.md` → Revenue integrity rules.

**Body:** Cashfree v2 webhook envelope. Relevant fields:
```
data.order.order_id            → matches orders.gateway_order_id
data.payment.payment_status    → SUCCESS | FAILED | USER_DROPPED
data.payment.cf_payment_id     → stored in orders.gateway_payment_id
```

**On `SUCCESS`:**
1. `orders.status = 'completed'`, set `gateway_payment_id`, `payment_verified_at`
2. Credit `creator_balances`: `+ (total_amount × 0.9)` to `total_earnings`, `+ 10%` to `total_platform_fees`
3. Insert `transaction_ledger` row with `record_hash`
4. Insert `notifications` row for the creator

**On `FAILED` / `USER_DROPPED`:** `orders.status = 'failed'`.

**Idempotency:** orders already in `completed` or `refunded` return `200 { received: true }` without re-processing.

---

## Catalog & discover

### `POST /api/coupons/validate`

```json
// Request
{ "code": "SAVE10", "cartAmount": 999, "creatorId": "uuid" }

// Success
{ "valid": true, "discount_amount": 100, "final_price": 899 }
```

**Errors:** `404` (invalid coupon), `400` (expired / not yet active / usage limit).

---

### `GET /api/discover`

Public marketplace listing for `/discover`.

| Query | Type | Default |
|---|---|---|
| `q` | string? | — |
| `category` | string? \| `'all'` | `'all'` |
| `limit` | 1–100 | 50 |

Filters: `is_published = true`, `is_on_discover_page = true`, `deleted_at IS NULL`. Returns `{ products: [...] }` with creator profile joined.

---

### `GET /api/discover/[productId]`

Single product detail + 8 related (same category or same creator) + 4 more from the same creator.

**Errors:** `404` if not published.

---

### `GET /api/products/search`

Fuzzy title search.

| Query | Type | Notes |
|---|---|---|
| `q` | string | Required. Empty → `{ results: [] }` |
| `creator` | uuid? | Scope to one creator |

Returns up to 20 published products.

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
**Errors:** `400` (missing form/site, no contact field, bad email), `500`.

---

### `POST /api/linkinbio/track`

Fire-and-forget analytics for link-in-bio pages. **Always returns 2xx**, even on failure — tracking must never block UX.

```json
// Request
{ "site_id": "uuid", "link_id": "uuid?", "event_type": "page_view" | "link_click" | "product_click" | "social_click" }
```

**Dedupe:** Skips inserts where the same `site_id + link_id + ip_hash` event occurred in the last 30 seconds. IP is SHA256-hashed, first 16 chars stored.

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

### `POST /api/payouts/request` (auth required)

Creator requests a payout. Cookie session required.

```json
// Request
{ "amount": 5000 }
```

**Preconditions checked in order:**
1. `creator_kyc.status === 'verified'` → else 403
2. Available balance = `total_earnings - total_platform_fees - total_paid_out - pending_payout` ≥ `amount` → else 400
3. Optimistic concurrency: `creator_balances.pending_payout` matches the value just read → else 409

**On success:** `pending_payout += amount`, inserts `creator_payouts` row with `status: 'pending'`, `currency: 'INR'`.

```json
// Success
{ "success": true, "payout": { /* creator_payouts row */ } }
```

---

## Storage

### `POST /api/upload`

Returns a signed upload URL for a Supabase Storage bucket.

```json
// Request
{
  "filename": "string (sanitized: [A-Za-z0-9._-]+, max 200 chars, no leading dot)",
  "bucket": "public-asset" | "creator-public" | "creator-content" | "creator-private",
  "productId": "uuid (optional; creator-content uses 'unassigned' folder if omitted; format-validated when present)",
  "kind": "'cover' | 'linkinbio' | 'avatar' | 'banner' | 'other' (defaults to 'other'; allowlist enforced when bucket is 'creator-public' or 'public-asset')",
  "category": "'kyc' | 'contracts' | 'other' (required when bucket === 'creator-private')"
}
```

`creatorId` is no longer accepted from the request body — it is derived server-side from the authenticated session via the 3-hop `auth.users → users → profiles` lookup.

**File paths per bucket:**

| Bucket | Public? | Owner | Path layout |
|---|---|---|---|
| `public-asset` | yes | **DigiOne** (platform-managed stock content, demo files, sample assets) | `digione/{kind}/{timestamp}_{filename}` |
| `creator-public` | yes | Creator | `{creator_id}/{kind}/{timestamp}_{filename}` |
| `creator-content` | **no** | Creator | `{creator_id}/{product_id or "unassigned"}/{timestamp}_{filename}` |
| `creator-private` | **no** | Creator | `{creator_id}/{category}/{timestamp}_{filename}` |

**`public-asset` ownership note:** intended as DigiOne-managed (admins or seed scripts populate it with stock images, sample link-in-bio backgrounds, demo files that creators reference but don't upload). The route currently still accepts creator writes to this bucket for link-in-bio backwards-compat — that's a deferred tighten-up. All net-new creator uploads should target `creator-public` instead.

**Legacy buckets dropped 2026-06-03:** `uploads` and `user_files` from earlier dev iterations no longer exist. See `supabase/migrations/20260605100000_drop_legacy_storage_buckets.sql`.

`publicUrl` in the response is `null` for private buckets. Reads for private buckets must go through dedicated signed-URL endpoints (not yet implemented for `creator-content` / `creator-private` — see `.claude/rules/security-model.md` for the access-check requirement).

```json
// Success
{ "signedUrl": "https://...", "path": "1234_image.png", "publicUrl": "https://{supabase}/storage/v1/object/public/{bucket}/{path}" }
```

**Hardening (2026-06-03):** route requires a cookie session. `creatorId` derived server-side. Filename sanitized to `[A-Za-z0-9._-]+` (max 200 chars, no leading dot). `productId` is UUID-format-validated. Storage errors are logged server-side as JSON via `console.error` with `reqId` correlation and **never** leak Supabase internals to the client — clients get generic messages (`Failed to create upload URL`, `Internal server error`). Every response carries an `X-Request-ID` header (echoed from `x-request-id` request header if present, else generated). `creator-content` uploads are gated by a per-creator storage quota (1 GB hardcoded default — real per-plan version is blocked on `creator_subscriptions` table + a numeric quota schema). Quota check goes through the `public.sum_bucket_bytes_for_prefix(bucket, prefix)` RPC. Over-quota returns `413` with `{ usedBytes, quotaBytes }`. Still outstanding: rate limiting, resumable uploads for `creator-content`, log shipping to a real observability backend.

**`public-asset` path migration:** new uploads use `digione/{kind}/{ts}_{filename}`. Pre-2026-06-03 objects at `public-asset/linkinbio/...` and `public-asset/{filename}` remain readable at their original URLs; this change is forward-only.

---

## Downloads (private buckets)

### `GET /api/deliverables/[productId]` (auth required)

Buyer-facing endpoint. Returns short-TTL signed download URLs for every file the creator uploaded under `creator-content/{creator_id}/{productId}/`.

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

**Errors:** `400` (invalid productId), `401` (no session), `403` (no access row), `404` (product not found), `502` (storage list/sign error), `500` (other). TTL is 10 minutes. Max 50 files returned. All responses include `X-Request-ID` + `Cache-Control: no-store`.

---

### `POST /api/private/download` (auth required)

Creator-facing endpoint. Mints a signed download URL for a file in `creator-private` or `creator-content` that the calling creator owns. Used by dashboard surfaces (KYC review of own docs, deliverable preview before publishing).

```json
// Request
{ "bucket": "creator-private" | "creator-content", "path": "{creator_id}/..." }
```

```json
// Success
{ "bucket": "creator-private", "path": "{creator_id}/kyc/...", "signedUrl": "...", "ttlSeconds": 600 }
```

**Ownership:** `path` must start with the calling creator's `profile.id`. Strict prefix match. Rejects `..`, leading `/`, backslashes. 403 if path doesn't belong to the caller.

**Errors:** `400` (invalid JSON / bucket / path), `401` (no session), `403` (profile not found / ownership violation), `502` (storage sign error), `500` (other). TTL is 10 minutes.

---

## Conventions

- All routes return JSON. Errors: `{ error: string }` with the appropriate status code.
- Auth-required routes always use `await createClient()` from `lib/supabase/server.ts` + `supabase.auth.getUser()`. Never `getSession()` (see `.claude/rules/anti-patterns.md`).
- Service-role writes must use `createServiceClient()` from `lib/supabase/service.ts`. Never import `createClient` from `@supabase/supabase-js` directly in `/api/*` route handlers.
- Cashfree calls always go through `${CASHFREE_ENV}/orders` with `x-api-version: 2023-08-01`.
- Cashfree return/notify URLs are built from `NEXT_PUBLIC_APP_URL` — never hardcode.
- Server-side price verification is mandatory in any route that creates an order. Never trust `price` or `amount` from the client.
