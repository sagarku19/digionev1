---
noteId: "411d1be07a3811f1b30a4fe37f53f544"
tags: []

---

# Buyer Delivery Loop + Cart — Design

**Date:** 2026-07-08
**Status:** Approved (brainstormed with visual companion; all decisions locked by the user)
**Origin:** End-to-end payment-flow audit (2026-07-07). The money path (checkout → Cashfree → webhook → fulfillment → balances/ledger/refunds) is solid. The delivery half is broken: buyers cannot reach their purchased content after leaving `/payment/status`.

## Problem

1. **No checkout client sends a buyer identity** — every `orders.user_id` is NULL, so all purchases fulfill as guest entitlements even for logged-in buyers.
2. **`useLibrary` reads `orders` by `user_id`** — always returns zero rows; both library UIs are permanently empty.
3. **`/account/library` is a hardcoded empty state** — queries nothing; proxy funnels all buyers there.
4. **No UI reads `user_product_access`** — the claim pipeline and `/api/deliverables/[productId]` work but are unreachable.
5. **False copy** — status page claims "a confirmation has been sent" and "the creator will share access via email"; no email system exists.
6. **Fake coupon** — `/cart` hardcodes `SAVE10` (display-only, `alert()`); real coupon backend is unused by product checkout.
7. **Dead cart** — storefront header cart icon has no link/count; `CartButton` component links to non-existent `/checkout/cart`; only one code path ever calls `addItem` (and it immediately navigates to checkout).
8. **Status-page reconcile loses `cf_payment_id`** — orders fulfilled via `/payment/status` keep `gateway_payment_id` NULL and hash the ledger row as `:free`.

## Locked decisions

| Decision | Choice |
|---|---|
| Scope | Everything: delivery loop + cart/drawer + real coupons + purchase email |
| Header cart click | Mini-cart **drawer** (slide-in right; full-width sheet on mobile) |
| Add-to-cart placement | **Multi-product surfaces only** (creator store grids). Single-product surfaces (single-page sales sites, discover product page) keep direct Buy Now only |
| Cross-creator adds | Replace-cart confirm prompt ("Your cart has items from another store. Replace it?") — matches the one-creator-per-order API rule |
| Marketing nav cart | Icon appears **only when cart has items** |
| Library design | **Ledger table** (engineered-ledger language): ruled rows, thumbnail, mono category+date, price, Files + Link actions |
| Library data model | **Approach 1** — `user_product_access` is the single read model (RLS SELECT-own + rewritten `useLibrary`) |
| Buyer identity | Derived **server-side** in `/api/checkout/create` from the cookie session; client `buyerId` body field removed |
| Email provider | **Resend** (only new package). One email: purchase confirmation to the buyer. Non-fatal |

## Design

### 1. Cart system

**Store (`src/hooks/commerce/useCart.ts`):**
- Add drawer state: `isDrawerOpen`, `openDrawer()`, `closeDrawer()`.
- `addItem` enforces the single-creator rule: if the cart is non-empty and `item.creatorId` differs from the existing items' creator, the item is NOT added; the call signals a conflict so the UI can show the replace-cart confirm. On confirm: clear cart → add item → open drawer.
- Pure conflict logic is unit-tested (Vitest, node env).

**Drawer (`src/components/store/CartDrawer.tsx`, new):**
- Slide-in panel from the right (full-width sheet < sm). Items: thumbnail, title, price, remove. Footer: total, primary **Checkout →** (`/checkout`), secondary "View cart" (`/cart`).
- Mounted once on surfaces that can carry a cart (storefront layouts + marketing/discover layout). Styled with `--creator-*` vars on storefront, ledger palette on marketing.

**Header buttons:**
- `StorefrontHeader`: wire the existing dead icon — live count badge, click opens drawer. Creator `show_cart_icon` toggle keeps working.
- `MarketingNav`: ledger-styled cart icon (ink icon, vermilion count badge), rendered only when `items.length > 0`; click opens drawer.
- `src/components/store/CartButton.tsx` is rewritten as the shared count-badge button (props: `itemCount`, `onClick`, `className`) — the broken `/checkout/cart` link dies with it.

**Add-to-cart buttons (multi-product surfaces only):**
- Storefront product-grid sections (`SectionRenderer` product sections on `/store/[slug]`): each product card gets "Add to cart" (adds + opens drawer, no navigation).
- Single-page sites (`ProductSalesPage`) and `/discover/[productId]`: unchanged — direct Buy Now only.

### 2. Library rebuild

**Migration (`supabase/migrations/`):**
- `user_product_access`: add RLS policy `user_product_access_select_own` (`user_id = auth.uid()`, SELECT only) + index on `user_id` if missing. Writes remain service-role only. Idempotent SQL; apply via Supabase MCP; regenerate types.

**Hook (`src/hooks/commerce/useLibrary.ts`, rewritten):**
- Reads `user_product_access` (browser client, RLS-enforced), joined to `products(thumbnail_url, category, description)`.
- Falls back to snapshot columns (`product_name`, `product_price`, `product_link`) when the product row is gone (deleted products stay accessible).
- Dedupe by `product_id`; sort newest first. Query key stays `['library','list']`.

**Buyer page (`app/account/library/page.tsx`, rebuilt):**
- Ledger-table rows per the approved mockup: thumbnail box, name, mono `CATEGORY · DD MMM YYYY` label, price (`₹` Indian format), actions:
  - **↓ Files** — calls `GET /api/deliverables/[productId]`, opens signed URLs; empty → inline "No downloadable files have been added to this product yet."
  - **Open link ↗** — shown when `post_purchase_url`/`product_link` exists.
- Search input (client filter). Keeps `LibraryAccountActions` (claim-on-load + creator upgrade card). Real empty state only when the query returns zero rows.
- `app/dashboard/settings/library/page.tsx` is fixed automatically (shares the hook); only prop/type adjustments if the hook shape shifts.

### 3. Checkout identity

- `/api/checkout/create`: resolve the session via `await createClient()` + `getUser()` (cookie); when present, `orders.user_id = user.id`. Remove `buyerId` from the request body and from `validateReferral`/`order_referrals` inputs (use the server-derived id). Guests remain NULL → `guest_entitlements` path unchanged.
- Fulfillment (`fulfillOrder`) is unchanged — its logged-in branch simply starts running again.

### 4. Payment status page

- **Reconcile fix:** when the DB order is `pending` and Cashfree reports PAID, also fetch `GET {CASHFREE_ENV}/orders/{gatewayOrderId}/payments`, extract the SUCCESS payment's `cf_payment_id`, and call `fulfillOrder(order.id, { gatewayPaymentId })`. Same for the payment-link branch where applicable.
- **Copy:** "A confirmation has been sent to {email}" stays only because it becomes true (email below). The amber "creator will share access via email" block is replaced:
  - Logged-in buyer → **"Go to my library"** button (`/account/library`).
  - Guest → **"Create a free account with {email} to keep lifetime access"** card → opens buyer signup (prefilled email); claim runs after auth (existing pipeline).

### 5. Coupons

- `/cart`: delete the fake `SAVE10` block and the local `discount` state entirely.
- `/checkout`: coupon input + Apply → `POST /api/coupons/validate` `{ code, cartAmount, creatorId: items[0].creatorId }` → show discount + new total inline; invalid → inline error, full price stands. On pay, send `couponCode`; the API re-validates and stores `coupon_id`/`discount_amount` in order metadata (existing behavior).

### 6. Purchase email (Resend)

- New dependency: `resend` (approved). New env: `RESEND_API_KEY` (secret), `EMAIL_FROM` (e.g. `DigiOne <receipts@digione.ai>`) — added to `env-vars.md` + `.env.example`.
- `src/lib/server/email.ts`: thin wrapper (`sendPurchaseConfirmation(...)`); missing env → log + no-op (dev-safe).
- Template: self-contained HTML module (no extra packages): products, amounts, per-product access links, **Open your library** CTA (guest variant: create-account link with prefilled email), receipt link.
- Called from `fulfillOrder` after access grants (step 4b), fully wrapped: any failure is logged and swallowed — fulfillment never fails on email. Product orders only (payment-link receipts out of scope).
- Manual setup (user): verify sending domain in Resend dashboard (SPF/DKIM DNS records).

### 7. Cleanup + docs (same change-set)

- `cashfree-reference.md`: remove the stale "inconsistencies — fix on next touch" rows already fixed; drop references to deleted files (`store/product/[productId]/BuyNowButton.tsx`, `upsells/…`); document the payments-fetch reconcile.
- `api-routes.md`: `/api/checkout/create` (buyerId removed, server-derived identity, email side effect), webhook side-effect list (email).
- `hooks-reference.md`: `useLibrary` new source table; `useCart` drawer state.
- `docs/reference/storefront-map.md` + `dashboard-map.md`: cart drawer, add-to-cart sections, library pages.
- `security-model.md`: `user_product_access` RLS read policy.

## Error handling

| Failure | Behavior |
|---|---|
| Email send fails | Logged, swallowed — order still fulfills |
| Deliverables list empty | Inline notice on the row; no error state |
| Coupon invalid/expired | Inline error; total unchanged |
| Cross-creator add | Confirm prompt; decline = no change |
| Claim fails | Silent; retried on next library load (existing) |
| Cashfree payments fetch fails on status page | Fall back to current behavior (`fulfillOrder` without payment id) |

## Testing & verification

- Unit (Vitest): cart conflict/replace logic; email template builder (renders all fields, guest vs logged-in variant).
- `npx tsc --noEmit`, `npm run lint`, `npm test`, `/verify`.
- Sandbox e2e checklist:
  1. Guest buys → email received → signs up with same email → library row appears → Files downloads.
  2. Logged-in buyer buys → `orders.user_id` set → library row immediate, no claim needed.
  3. Add-to-cart from store grid → drawer opens → count badge on both headers → cross-creator add prompts replace.
  4. Coupon applies at checkout; order metadata carries `coupon_id`; invalid code shows error.
  5. Status-page race: land on `/payment/status` before webhook → `gateway_payment_id` populated.
  6. Refund → library row disappears; `/api/deliverables` returns 403.
  7. Light/dark + mobile drawer sheet.

## Out of scope

- Multi-creator checkout (split payments), payment-link receipts by email, creator email notifications, mini-cart on the dashboard, email marketing/broadcasts, `/discover` add-to-cart.
