---
noteId: "11f94c507b8a11f1b7ddffeec518d7f9"
tags: []

---

# Guest-email & delivery-tracking hardening — deferred

**Added:** 2026-07-09
**Status:** (left) — not started
**Origin:** End-to-end purchase→delivery→tracking flow review (2026-07-09), after the "Buyer Delivery Loop + Cart" feature shipped (`docs/superpowers/plans/2026-07-08-buyer-delivery-loop-and-cart.md`).

## Context — why these matter

The delivery loop is closed and correct:
- **Logged-in** buyers are tracked by `orders.user_id` (auth uid) → `user_product_access` → `/account/library`. Access is keyed to `user_id`, so a mistyped email at checkout does NOT break their access (it only misdelivers the receipt email).
- **Guest** buyers are tracked by `normalizeEmail(customer_email)` → `guest_entitlements` → claimed into `user_product_access` on sign-in (`src/lib/server/entitlements.ts`).

The fragility is entirely on the **guest email** key. The 4 items below harden it. None block the shipped feature — they close edge cases and a product-decision gap.

---

## 1. Server-side email validation in checkout — (small, do first)

**Problem:** `app/api/checkout/create/route.ts:32` does `customer_email = contact?.email ? normalizeEmail(contact.email) : null` with **no format validation**. `type="email" required` on the client blocks most bad input, but the server accepts a malformed value (or null) and would key `guest_entitlements` to garbage / skip the grant entirely.

**Fix:** import `isValidEmail` (already exists in `src/lib/shared/email.ts`) and reject bad/missing email with `400` in `/api/checkout/create` **before** creating the order. Consider making email required server-side for the guest path specifically (logged-in can fall back to the session email).

**Files:** `app/api/checkout/create/route.ts` (add the guard near line 25-32). Optionally mirror in `app/api/checkout/payment-link/route.ts`.
**Effort:** ~15 min. No schema change.

## 2. Guest email-confirm step at checkout — (the important UX fix)

**Problem:** the only truly unrecoverable case is a **valid-format but WRONG** guest email (typo like `saagr@gmail.com`). The order + `guest_entitlements` key to the wrong address; when the real buyer later signs up with THEIR email, `claimGuestEntitlements` matches their email → finds nothing → library stays empty. If the typo address is real and its owner signs up, they inherit the entitlement.

**Fix (pick one):**
- Add a "confirm email" second field on `app/(buyer)/checkout/page.tsx` for guests (not logged-in), OR
- An inline confirm line before Pay: "We'll email your access to **{email}** — correct?" with an edit affordance.

Only applies to the guest branch (`!isLoggedIn`). Logged-in buyers are safe (access by `user_id`), so don't add friction there.

**Files:** `app/(buyer)/checkout/page.tsx` (guest-only email confirm); the discover inline form `app/(marketing)/discover/[productId]/BuyNowButton.tsx` has the same exposure — add the same confirm there.
**Effort:** ~1 hr. No schema change.

## 3. Support re-key path for a mistyped guest entitlement — (recovery tool)

**Problem:** when a guest DOES mistype (and #2 didn't catch it), there is **no** way to move the purchase to the right email short of raw DB surgery. No admin UI (admin is terminal-scripts only per `.claude/todo-later/13(left)-…admin-app`).

**Fix:** a terminal script matching the existing pattern (`scripts/kyc-admin.ts`, `scripts/refund-admin.ts`, run via `npx tsx --env-file=.env.local`) — e.g. `scripts/entitlement-admin.ts`:
- look up `guest_entitlements` / `orders` by order id or old email,
- re-key `guest_entitlements.email` to the corrected address (normalized),
- (and if the buyer already has an account, run the claim so it lands in `user_product_access` immediately).

Guard: this changes who can access a paid product — log every re-key, require the order id + both emails.

**Files:** new `scripts/entitlement-admin.ts`; reuses `src/lib/server/entitlements.ts` (`claimGuestEntitlements`) + `createServiceClient`.
**Effort:** ~1-2 hr. No schema change (writes existing columns).

## 4. Discover external-`product_link` "Buy Now" bypasses checkout — (product decision)

**Problem:** on `app/(marketing)/discover/[productId]/page.tsx:317-325`, when a product has an external `product_link`, "Buy Now" renders a plain `<a href={product_link}>` that **leaves DigiOne entirely** — no `orders` row, no payment, no `user_product_access`, no library entry, no creator earnings. This predates the cart/library work (an "external delivery" model), but now that a real cart + library + checkout exist, it's an untracked sale path sitting next to the new **Add to cart** (which routes through real checkout). Note the deeper inconsistency: elsewhere in the system `product_link` means the **post-purchase access link** (stored in `user_product_access.product_link`), not an external buy URL — this dual meaning is also flagged in `.claude/todo-later/7(left)-…dashboard-refactor-followups.md` (`is_free`/`product_link` latent bugs).

**Decision needed:** either
- (a) drop the external-link Buy Now on discover so all purchases go through checkout (cleanest, everything tracked), or
- (b) keep it but make the dual meaning of `product_link` explicit (separate `external_buy_url` vs `post_purchase_url`) so checkout and discover stop disagreeing.

**Files:** `app/(marketing)/discover/[productId]/page.tsx` (the `product.product_link ? <a> : <BuyNowButton>` branch); cross-ref the product schema decision in todo-later 7.
**Effort:** (a) ~20 min; (b) schema + migration + editor changes, larger. **Get the product call first.**

---

## Priority order
1 (quick guard) → 2 (prevents the unrecoverable case) → 3 (recovery for cases that slip through) → 4 (needs a product decision before code).
