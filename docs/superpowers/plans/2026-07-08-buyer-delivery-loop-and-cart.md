---
noteId: "dd0916907a8711f1b7ddffeec518d7f9"
tags: []

---

# Buyer Delivery Loop + Cart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the buyer delivery loop (library reads `user_product_access`, server-derived checkout identity, real purchase email) and build the real cart system (drawer, add-to-cart on store grids, real coupons at checkout).

**Architecture:** The cart is a Zustand-persisted store with a pure, unit-tested conflict rule (one creator per order) and drawer state; a shared `CartDrawer` mounts on the store/marketing/account layouts. Delivery reads flow through `user_product_access` (RLS SELECT-own, already live) via a rewritten `useLibrary`; writes stay service-role-only through the existing fulfillment path, which gains a non-fatal Resend email step. `/api/checkout/create` derives buyer identity from the cookie session (client `buyerId` removed).

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Zustand + TanStack Query v5, Supabase (RLS), Cashfree PG v2023-08-01, Resend (only new package), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-08-buyer-delivery-loop-and-cart-design.md`

**Ground truth discovered during planning (differs from / sharpens the spec):**
- The RLS policy `user_product_access_select_own` (`user_id = auth.uid()`, SELECT to authenticated) **already exists** in `supabase/migrations/20260602000000_rls_policies.sql:190-193`, and indexes `idx_upa_user` / `idx_upa_user_product` already exist. Task 5 verifies live state instead of writing a redundant migration (fallback SQL provided).
- `public.users.id` **equals** `auth.users.id` (`handle_new_user` inserts `id = NEW.id`), so `orders.user_id = user.id` (auth uid) satisfies `fk_upa_user` and the RLS policy. No schema change needed.
- `types/database.types.ts` already contains `user_product_access` and `products.post_purchase_url` — **no type regeneration needed** (no schema changes in this plan).
- The three "inconsistencies" listed in `cashfree-reference.md` for `app/(buyer)/checkout/page.tsx` are **already fixed in code** (static import, `data.environment` check, free-order short-circuit) — that doc section is stale and gets cleaned in Task 8.
- Git convention: work directly on `main` (user preference), commit per task.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/hooks/commerce/cart-logic.ts` | Create | Pure cart rules: `CartItem`, `classifyAdd` (single-creator conflict) |
| `src/hooks/commerce/cart-logic.test.ts` | Create | Vitest unit tests for `classifyAdd` |
| `src/hooks/commerce/useCart.ts` | Rewrite | Zustand store: items + drawer state, `addItem` returns conflict result, `replaceCartWith`, hydration-safe count |
| `src/components/store/CartButton.tsx` | Rewrite | Shared count-badge button (`itemCount`, `onClick`) — kills dead `/checkout/cart` link |
| `src/components/store/CartDrawer.tsx` | Create | Slide-in mini-cart (creator/ledger palettes), mounted per-layout |
| `src/components/store/AddToCartButton.tsx` | Create | Add-to-cart with replace-cart confirm modal |
| `src/components/storefront/StorefrontHeader.tsx` | Modify | Wire dead cart icon → live count + open drawer |
| `src/components/marketing/MarketingNav.tsx` | Modify | Ledger cart icon, rendered only when cart has items |
| `app/(storefront)/store/[slug]/layout.tsx` | Modify | Mount `<CartDrawer palette="creator" />` |
| `app/(marketing)/layout.tsx`, `app/account/layout.tsx` | Modify | Mount `<CartDrawer palette="ledger" />` |
| `src/components/storefront/SectionRenderer.tsx` | Modify | Pass `creatorId` down to sections |
| `app/(storefront)/store/[slug]/page.tsx` | Modify | Pass `creatorId={site.creator_id}` |
| `src/components/storefront/sections/ProductGrid.tsx` | Modify | Card restructure + AddToCartButton, link to `/discover/{id}` |
| `src/components/storefront/sections/FeaturedProducts.tsx` | Rewrite | Resolve real products from props + AddToCartButton |
| `src/components/storefront/ProductSalesPage.tsx` | Modify | Buy Now handles cross-creator conflict |
| `src/hooks/commerce/useLibrary.ts` | Rewrite | Read `user_product_access` + products join, snapshot fallback |
| `app/account/library/page.tsx` | Rewrite | Ledger-table library (search, Files, Open link) |
| `app/api/checkout/create/route.ts` | Modify | Server-derived buyer identity; `buyerId` body field removed |
| `app/payment/status/page.tsx` | Modify | Payments-fetch reconcile (`cf_payment_id`), copy fix |
| `app/payment/status/LibraryCta.tsx` | Create | Logged-in → library button; guest → create-account card |
| `app/user-login/page.tsx` | Modify | `?email=` param prefills the signup modal |
| `app/(buyer)/cart/page.tsx` | Modify | Delete fake SAVE10 coupon block |
| `app/(buyer)/checkout/page.tsx` | Modify | Real coupon input → `/api/coupons/validate`, send `couponCode` |
| `src/lib/server/email-templates/purchase-confirmation.ts` | Create | Pure HTML email builder (unit-tested) |
| `src/lib/server/email-templates/purchase-confirmation.test.ts` | Create | Vitest tests for the builder |
| `src/lib/server/email.ts` | Create | Resend wrapper `sendPurchaseConfirmation` (missing env → no-op) |
| `src/lib/server/fulfillment.ts` | Modify | Step 4b: send purchase email (non-fatal) |
| Docs: `.claude/rules/{hooks-reference,api-routes,cashfree-reference,security-model,env-vars}.md`, `docs/reference/{storefront-map,dashboard-map}.md`, `.env.example` | Modify | Same-change-set doc updates (distributed across tasks) |

---

### Task 1: Cart conflict logic + store upgrade

**Files:**
- Create: `src/hooks/commerce/cart-logic.ts`
- Create: `src/hooks/commerce/cart-logic.test.ts`
- Modify: `src/hooks/commerce/useCart.ts` (full rewrite below)
- Modify: `src/components/storefront/ProductSalesPage.tsx:602-614` (`handleBuyNow`)
- Modify: `.claude/rules/hooks-reference.md` (useCart row)

- [ ] **Step 1: Write the failing test**

Create `src/hooks/commerce/cart-logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { classifyAdd, type CartItem } from './cart-logic';

const item = (id: string, creatorId: string): CartItem => ({
  id,
  title: `Product ${id}`,
  price: 100,
  creatorId,
  coverImage: null,
  slug: id,
});

describe('classifyAdd', () => {
  it('adds to an empty cart', () => {
    expect(classifyAdd([], item('p1', 'c1'))).toBe('added');
  });

  it('adds a second item from the same creator', () => {
    expect(classifyAdd([item('p1', 'c1')], item('p2', 'c1'))).toBe('added');
  });

  it('returns exists for a product already in the cart', () => {
    expect(classifyAdd([item('p1', 'c1')], item('p1', 'c1'))).toBe('exists');
  });

  it('returns conflict for an item from a different creator', () => {
    expect(classifyAdd([item('p1', 'c1')], item('p2', 'c2'))).toBe('conflict');
  });

  it('checks duplicate before conflict (same product id always exists)', () => {
    expect(classifyAdd([item('p1', 'c1')], item('p1', 'c2'))).toBe('exists');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/commerce/cart-logic.test.ts`
Expected: FAIL — `Cannot find module './cart-logic'` (or equivalent resolve error).

- [ ] **Step 3: Write the pure logic**

Create `src/hooks/commerce/cart-logic.ts`:

```ts
// Pure cart rules — no store, no React. Unit-tested in cart-logic.test.ts.
// The single-creator rule mirrors the /api/checkout/create constraint:
// all items in one order must belong to one creator.

export interface CartItem {
  id: string; // Product ID
  title: string;
  price: number;
  creatorId: string;
  coverImage: string | null;
  slug: string;
}

export type AddItemResult = 'added' | 'exists' | 'conflict';

export function classifyAdd(items: CartItem[], item: CartItem): AddItemResult {
  if (items.some((i) => i.id === item.id)) return 'exists';
  if (items.length > 0 && items[0].creatorId !== item.creatorId) return 'conflict';
  return 'added';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/commerce/cart-logic.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Rewrite the cart store**

Replace the entire contents of `src/hooks/commerce/useCart.ts` with:

```ts
"use client";

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { classifyAdd, type AddItemResult, type CartItem } from './cart-logic';

export type { AddItemResult, CartItem };

interface CartStore {
  items: CartItem[];
  isDrawerOpen: boolean;
  addItem: (item: CartItem) => AddItemResult;
  replaceCartWith: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,
      addItem: (item) => {
        const result = classifyAdd(get().items, item);
        if (result === 'added') set({ items: [...get().items, item] });
        return result;
      },
      replaceCartWith: (item) => set({ items: [item] }),
      removeItem: (id) => {
        set({ items: get().items.filter(i => i.id !== id) });
      },
      clearCart: () => set({ items: [] }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
    }),
    {
      name: 'digione-cart',
      partialize: (s) => ({ items: s.items }),
    }
  )
);

/** Derived total — use this instead of store.total */
export function useCartTotal() {
  const items = useCart(s => s.items);
  return items.reduce((sum, item) => sum + item.price, 0);
}

/**
 * SSR-safe item count: returns 0 until the client has mounted so the first
 * client render matches server markup (zustand persist rehydrates from
 * localStorage before React hydration, which would otherwise mismatch).
 */
export function useHydratedCartCount() {
  const count = useCart(s => s.items.length);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? count : 0;
}
```

Notes: `partialize` keeps `isDrawerOpen` out of localStorage (drawer never re-opens on reload). `CartItem` moved to `cart-logic.ts` and is re-exported here so existing import paths keep working.

- [ ] **Step 6: Handle the conflict in ProductSalesPage's Buy Now**

In `src/components/storefront/ProductSalesPage.tsx`:

Line 536, change:

```ts
  const { addItem } = useCart();
```
to:
```ts
  const { addItem, replaceCartWith } = useCart();
```

Replace `handleBuyNow` (lines 602-614) with:

```ts
  const handleBuyNow = () => {
    if (isPreview) return; // visual only in the editor preview
    if (!product?.id) return;
    const item = {
      id: product.id,
      title: product.name || 'Product',
      price: product.price || 0,
      creatorId: product.creator_id || '',
      coverImage: product.thumbnail_url || null,
      slug: product.id,
    };
    const result = addItem(item);
    if (result === 'conflict') {
      // Single-product sales page has no drawer; the native confirm is enough here.
      if (!window.confirm('Your cart has items from another store. Replace it?')) return;
      replaceCartWith(item);
    }
    router.push('/checkout');
  };
```

- [ ] **Step 7: Update hooks-reference.md**

In `.claude/rules/hooks-reference.md`, find the row:

```
| `useCart()` | Cart state for buyer checkout |
```

Replace with:

```
| `useCart()` | Cart state for buyer checkout — items + drawer state (`isDrawerOpen`, `openDrawer`, `closeDrawer`); `addItem` returns `'added' \| 'exists' \| 'conflict'` (single-creator rule); `replaceCartWith` for the replace-cart confirm. Also exports `useCartTotal`, `useHydratedCartCount` |
```

- [ ] **Step 8: Verify compile + full test run**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm test`
Expected: all suites pass (114 existing + 5 new).

- [ ] **Step 9: Commit**

```bash
git add src/hooks/commerce/cart-logic.ts src/hooks/commerce/cart-logic.test.ts src/hooks/commerce/useCart.ts src/components/storefront/ProductSalesPage.tsx .claude/rules/hooks-reference.md
git commit -m "feat(cart): single-creator conflict rule + drawer state in cart store

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: CartButton rewrite + CartDrawer component

**Files:**
- Modify: `src/components/store/CartButton.tsx` (full rewrite)
- Create: `src/components/store/CartDrawer.tsx`

- [ ] **Step 1: Rewrite CartButton as the shared count-badge button**

Replace the entire contents of `src/components/store/CartButton.tsx` with:

```tsx
"use client";

import { ShoppingCart } from 'lucide-react';

export interface CartButtonProps {
  itemCount: number;
  onClick: () => void;
  className?: string;
  badgeClassName?: string;
}

export function CartButton({ itemCount, onClick, className = '', badgeClassName = '' }: CartButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={itemCount > 0 ? `Open cart, ${itemCount} item${itemCount === 1 ? '' : 's'}` : 'Open cart'}
      className={`relative p-2 rounded-full transition-colors ${className}`}
    >
      <ShoppingCart className="w-5 h-5" />
      {itemCount > 0 && (
        <span
          className={`absolute top-0 right-0 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-bold leading-none ${badgeClassName}`}
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  );
}
```

This deletes the broken `href="/checkout/cart"` link (route never existed).

- [ ] **Step 2: Create CartDrawer**

Create `src/components/store/CartDrawer.tsx`:

```tsx
"use client";

// Mini-cart drawer — slides in from the right (full-width sheet below sm).
// Mounted once per surface that can carry a cart: the store layout
// (palette="creator", themed by --creator-* vars) and the marketing/account
// layouts (palette="ledger", engineered-ledger palette).

import { useEffect } from 'react';
import Link from 'next/link';
import { X, ShoppingCart, Trash2, ArrowRight } from 'lucide-react';
import { useCart, useCartTotal } from '@/hooks/commerce/useCart';

const PALETTES = {
  creator: {
    panel: 'bg-[var(--creator-bg,#ffffff)] text-[var(--creator-text,#16130F)]',
    muted: 'text-[var(--creator-text-muted,#64748b)]',
    thumb: 'bg-[var(--creator-surface,#f5f5f4)]',
    cta: 'bg-[var(--creator-primary,#E83A2E)] hover:opacity-90 text-white',
    secondary: 'border border-black/[0.12] hover:bg-black/[0.03]',
  },
  ledger: {
    panel: 'bg-white text-[#16130F]',
    muted: 'text-black/50',
    thumb: 'bg-[#FAF8F6]',
    cta: 'bg-[#E83A2E] hover:bg-[#C92F24] text-white',
    secondary: 'border border-black/[0.1] hover:border-black/[0.25]',
  },
} as const;

function formatINR(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

export default function CartDrawer({ palette = 'creator' }: { palette?: keyof typeof PALETTES }) {
  const { items, isDrawerOpen, closeDrawer, removeItem } = useCart();
  const total = useCartTotal();
  const p = PALETTES[palette];

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isDrawerOpen, closeDrawer]);

  return (
    <div
      className={`fixed inset-0 z-[90] ${isDrawerOpen ? 'visible' : 'invisible pointer-events-none'}`}
      aria-hidden={!isDrawerOpen}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={closeDrawer}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Shopping cart"
        className={`absolute right-0 top-0 h-full w-full sm:w-[400px] ${p.panel} shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-[15px] font-bold tracking-[-0.01em]">
              Your cart{items.length > 0 ? ` (${items.length})` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close cart"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-black/[0.08] hover:bg-black/[0.04] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <ShoppingCart className={`w-8 h-8 ${p.muted}`} strokeWidth={1.5} />
              <p className={`text-sm font-medium ${p.muted}`}>Your cart is empty</p>
            </div>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.06]">
                  <div className={`w-12 h-12 rounded-lg ${p.thumb} border border-black/[0.06] overflow-hidden shrink-0 flex items-center justify-center`}>
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingCart className={`w-4 h-4 ${p.muted}`} strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold truncate">{item.title}</p>
                    <p className={`text-[12px] font-medium ${p.muted}`}>{formatINR(item.price)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.title} from cart`}
                    className={`p-2 rounded-lg ${p.muted} hover:text-[#E83A2E] hover:bg-black/[0.03] transition-colors shrink-0`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-black/[0.08] shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-[13px] font-semibold ${p.muted}`}>Total</span>
              <span className="text-[17px] font-bold">{formatINR(total)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className={`group flex items-center justify-center gap-2 w-full py-3 rounded-lg text-[14px] font-semibold transition-colors ${p.cta}`}
            >
              Checkout
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
            <Link
              href="/cart"
              onClick={closeDrawer}
              className={`flex items-center justify-center w-full py-2.5 rounded-lg text-[13px] font-semibold transition-colors ${p.secondary}`}
            >
              View cart
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors (nothing imports the old `CartButton` shape — verified: zero existing importers).

- [ ] **Step 4: Commit**

```bash
git add src/components/store/CartButton.tsx src/components/store/CartDrawer.tsx
git commit -m "feat(cart): CartDrawer mini-cart + CartButton rewritten as shared badge button

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Wire headers + mount the drawer

**Files:**
- Modify: `src/components/storefront/StorefrontHeader.tsx`
- Modify: `src/components/marketing/MarketingNav.tsx`
- Modify: `app/(storefront)/store/[slug]/layout.tsx`
- Modify: `app/(marketing)/layout.tsx`
- Modify: `app/account/layout.tsx`

- [ ] **Step 1: Wire the StorefrontHeader cart icon**

In `src/components/storefront/StorefrontHeader.tsx`:

Add imports after the existing ones (line 6):

```tsx
import { CartButton } from '@/components/store/CartButton';
import { useCart, useHydratedCartCount } from '@/hooks/commerce/useCart';
```

Inside the component, after `const { isLoggedIn } = useAuthSession();` (line 27), add:

```tsx
  const openDrawer = useCart((s) => s.openDrawer);
  const cartCount = useHydratedCartCount();
```

Replace the dead cart block (lines 60-66):

```tsx
            {showCart && (
              <div className="relative">
                <button className="text-[--creator-text] p-2 rounded-full hover:bg-[--creator-surface] transition-colors flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                </button>
              </div>
            )}
```

with:

```tsx
            {showCart && (
              <CartButton
                itemCount={cartCount}
                onClick={openDrawer}
                className="text-[--creator-text] hover:bg-[--creator-surface]"
                badgeClassName="bg-[var(--creator-primary,#E83A2E)] text-white"
              />
            )}
```

The creator's `show_cart_icon` toggle keeps working (`showCart` is unchanged).

- [ ] **Step 2: Add the cart icon to MarketingNav (only when cart has items)**

In `src/components/marketing/MarketingNav.tsx`:

Add imports after line 10 (`useAuthSession` import):

```tsx
import { CartButton } from '@/components/store/CartButton';
import { useCart, useHydratedCartCount } from '@/hooks/commerce/useCart';
```

Inside the component, after `const { isLoggedIn, userEmail, profile } = useAuthSession();` (line 47), add:

```tsx
  const openCartDrawer = useCart((s) => s.openDrawer);
  const cartCount = useHydratedCartCount();
```

Desktop: at line 203, inside `<div className="hidden lg:flex items-center gap-4">`, insert as the FIRST child (before `{isLoggedIn ? (`):

```tsx
              {cartCount > 0 && (
                <CartButton
                  itemCount={cartCount}
                  onClick={openCartDrawer}
                  className="text-[#16130F] hover:bg-black/[0.04] !rounded-lg"
                  badgeClassName="bg-[#E83A2E] text-white"
                />
              )}
```

Mobile: at line 307, inside `<div className="lg:hidden flex items-center">`, insert BEFORE the hamburger button:

```tsx
              {cartCount > 0 && (
                <CartButton
                  itemCount={cartCount}
                  onClick={openCartDrawer}
                  className="text-[#16130F] hover:bg-black/[0.04] !rounded-lg mr-1"
                  badgeClassName="bg-[#E83A2E] text-white"
                />
              )}
```

(`useHydratedCartCount` returns 0 during SSR/first paint, so the conditional render cannot cause a hydration mismatch.)

- [ ] **Step 3: Mount the drawer on the three layouts**

`app/(storefront)/store/[slug]/layout.tsx` — add import:

```tsx
import CartDrawer from '@/components/store/CartDrawer';
```

and render it after `<StorefrontFooter … />` (line 59):

```tsx
      <StorefrontFooter navConfig={nav} siteMain={main} />
      <CartDrawer palette="creator" />
```

`app/(marketing)/layout.tsx` — replace the file contents with:

```tsx
import React from 'react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import CartDrawer from '@/components/store/CartDrawer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#16130F]">
      <MarketingNav />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <MarketingFooter />
      <CartDrawer palette="ledger" />
    </div>
  );
}
```

`app/account/layout.tsx` — same change (MarketingNav is mounted here too, so the drawer must exist for its cart icon):

```tsx
import React from 'react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import CartDrawer from '@/components/store/CartDrawer';

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#16130F]">
      <MarketingNav />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <MarketingFooter />
      <CartDrawer palette="ledger" />
    </div>
  );
}
```

- [ ] **Step 4: Verify compile + lint**

Run: `npx tsc --noEmit` then `npm run lint`
Expected: clean.

- [ ] **Step 5: Manual smoke (dev server)**

Run `npm run dev`, open a store URL (`/store/<any-slug>`) and `/discover`:
- Store header shows the cart icon (still respecting `show_cart_icon`); clicking opens an empty drawer.
- Marketing nav shows NO cart icon (cart is empty).

- [ ] **Step 6: Commit**

```bash
git add src/components/storefront/StorefrontHeader.tsx src/components/marketing/MarketingNav.tsx "app/(storefront)/store/[slug]/layout.tsx" "app/(marketing)/layout.tsx" app/account/layout.tsx
git commit -m "feat(cart): wire header cart buttons + mount CartDrawer on store/marketing/account layouts

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Add-to-cart on store grids

**Files:**
- Create: `src/components/store/AddToCartButton.tsx`
- Modify: `src/components/storefront/SectionRenderer.tsx` (creatorId pass-through)
- Modify: `app/(storefront)/store/[slug]/page.tsx:57`
- Modify: `src/components/storefront/sections/ProductGrid.tsx` (card restructure)
- Modify: `src/components/storefront/sections/FeaturedProducts.tsx` (full rewrite — real products)
- Modify: `docs/reference/storefront-map.md` (same change-set — the doc-drift Stop hook enforces this)

- [ ] **Step 1: Create AddToCartButton (with replace-cart confirm)**

Create `src/components/store/AddToCartButton.tsx`:

```tsx
'use client';

// Storefront add-to-cart with the replace-cart confirm for cross-creator adds
// (mirrors the one-creator-per-order rule in /api/checkout/create). Used on
// multi-product store sections only (ProductGrid, FeaturedProducts) — single-
// product surfaces keep direct Buy Now.

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCart, type CartItem } from '@/hooks/commerce/useCart';

export function AddToCartButton({ item, className = '' }: { item: CartItem; className?: string }) {
  const { addItem, replaceCartWith, openDrawer } = useCart();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = addItem(item);
    if (result === 'conflict') {
      setShowConfirm(true);
      return;
    }
    openDrawer();
  };

  const handleReplace = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    replaceCartWith(item);
    setShowConfirm(false);
    openDrawer();
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleAdd}
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-[var(--creator-primary,#E83A2E)] text-white hover:opacity-90 transition-opacity ${className}`}
      >
        <ShoppingCart className="w-4 h-4" />
        Add to cart
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center px-5">
          <div className="absolute inset-0 bg-black/40" onClick={handleCancel} />
          <div
            role="dialog"
            aria-label="Replace cart confirmation"
            className="relative bg-[var(--creator-bg,#ffffff)] text-[var(--creator-text,#16130F)] border border-black/[0.08] rounded-xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[16px] font-bold mb-1.5">Replace your cart?</h3>
            <p className="text-[13.5px] font-medium text-[var(--creator-text-muted,#64748b)] mb-5 leading-relaxed">
              Your cart has items from another store. Each order can only contain products from one store.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleReplace}
                className="flex-1 py-2.5 rounded-lg bg-[var(--creator-primary,#E83A2E)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Replace cart
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-2.5 rounded-lg border border-black/[0.12] text-sm font-semibold hover:bg-black/[0.03] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Pass creatorId through SectionRenderer**

In `src/components/storefront/SectionRenderer.tsx`:

Add to `SectionRendererProps` (line 56-61):

```tsx
export interface SectionRendererProps {
  sections: StorefrontSection[];
  products?: StorefrontProduct[];
  siteMain?: StorefrontSiteMain | null;
  siteId?: string;
  creatorId?: string;
}
```

Update the function signature and shared props (lines 63-69):

```tsx
export default function SectionRenderer({ sections, products = [], siteMain, siteId, creatorId }: SectionRendererProps) {
  if (!sections || !Array.isArray(sections)) return null;

  return (
    <div className="flex flex-col w-full">
      {sections.map((section, index) => {
        const props = { settings: section.settings ?? {}, products, siteMain, creatorId };
        const key = section.id ?? index;
```

(JSX spread with extra props is fine — only `ProductGrid`/`FeaturedProducts` declare `creatorId`.)

In `app/(storefront)/store/[slug]/page.tsx:57`, change:

```tsx
      <SectionRenderer sections={visible} products={products} siteMain={siteMain} siteId={site.id} />
```
to:
```tsx
      <SectionRenderer sections={visible} products={products} siteMain={siteMain} siteId={site.id} creatorId={site.creator_id} />
```

(`sites.creator_id` is `profiles.id`, same value as `products.creator_id` — the id the checkout API and coupon validation expect.)

- [ ] **Step 3: Restructure ProductGrid cards + add the button**

Replace the entire contents of `src/components/storefront/sections/ProductGrid.tsx` with:

```tsx
'use client';
// ProductGrid section — displays products in a configurable column grid.
// DB tables: products (via props, no direct fetch)

import React from 'react';
import Link from 'next/link';
import type { StorefrontProduct } from '../SectionRenderer';
import { AddToCartButton } from '@/components/store/AddToCartButton';

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

interface ProductGridSettings { title?: string; columns?: number; show_price?: boolean; max_items?: number; }
type GridProduct = StorefrontProduct & { slug?: string | null };

export default function ProductGrid({
  settings,
  products = [],
  creatorId,
}: {
  settings: Record<string, unknown>;
  products?: GridProduct[];
  creatorId?: string;
}) {
  // reason: section settings is jsonb; narrow once to the typed view
  const s = settings as unknown as ProductGridSettings;
  const title     = s?.title     ?? '';
  const columns   = s?.columns   ?? 3;
  const showPrice = s?.show_price !== false;
  const maxItems  = s?.max_items  ?? 12;
  const colClass  = columns === 2
    ? 'sm:grid-cols-2'
    : columns === 4
    ? 'sm:grid-cols-2 lg:grid-cols-4'
    : 'sm:grid-cols-2 lg:grid-cols-3';

  const visible = products.filter((p) => p.is_published).slice(0, maxItems);

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto w-full" id="products">
      {title && <h2 className="text-3xl font-bold text-[--creator-text] mb-10 text-center">{title}</h2>}
      {visible.length === 0 ? (
        <p className="text-center text-[--creator-text-muted] py-12">No products available yet.</p>
      ) : (
        <div className={`grid grid-cols-1 ${colClass} gap-6`}>
          {visible.map((p) => (
            <div
              key={p.id}
              className="group flex flex-col bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-xl hover:border-[--creator-primary]/30 transition-all"
            >
              <Link href={`/discover/${p.id}`} className="flex flex-col flex-1">
                {p.thumbnail_url && (
                  <img
                    src={p.thumbnail_url}
                    alt={p.name}
                    className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="p-5 pb-0 flex flex-col flex-1">
                  <h3 className="font-semibold text-[--creator-text] line-clamp-2 group-hover:text-[--creator-primary] transition-colors">
                    {p.name}
                  </h3>
                  {showPrice && (
                    <p className="mt-3 font-bold text-[--creator-primary]">{formatINR(p.price ?? 0)}</p>
                  )}
                </div>
              </Link>
              {creatorId && (
                <div className="p-5 pt-3">
                  <AddToCartButton
                    item={{
                      id: p.id,
                      title: p.name,
                      price: p.price ?? 0,
                      creatorId,
                      coverImage: p.thumbnail_url,
                      slug: p.id,
                    }}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

Deliberate fix included: the card link changes from the dead `#{slug}` anchor to the real product page `/discover/{id}` (the canonical product URL per `storefront-map.md`). The button sits OUTSIDE the `<Link>` so add-to-cart never navigates and the HTML stays valid.

- [ ] **Step 4: Rewrite FeaturedProducts to use real products**

Replace the entire contents of `src/components/storefront/sections/FeaturedProducts.tsx` with:

```tsx
// FeaturedProducts section — shows curated products (settings.product_ids)
// resolved against the site's real assigned products; falls back to the first
// 3 published products. Placeholder demo cards render only when the store has
// no real products (display-only, no cart).

import React from 'react';
import Link from 'next/link';
import type { StorefrontProduct } from '../SectionRenderer';
import { AddToCartButton } from '@/components/store/AddToCartButton';

interface FeaturedProductsSettings {
  title?: string;
  subtitle?: string;
  product_ids?: string[];
}

const PLACEHOLDERS = [
  { id: 'demo-1', name: 'Digital Course Demo', price: 4999, thumbnail_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=600' },
  { id: 'demo-2', name: 'Premium Notion Template', price: 999, thumbnail_url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=600' },
  { id: 'demo-3', name: 'Design System Kit', price: 2999, thumbnail_url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=600' },
];

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function FeaturedProducts({
  settings,
  products = [],
  creatorId,
}: {
  settings: Record<string, unknown>;
  products?: StorefrontProduct[];
  creatorId?: string;
}) {
  // reason: section settings is jsonb; narrow once to the typed view
  const s = settings as unknown as FeaturedProductsSettings;
  const title = s?.title || 'Featured Products';
  const subtitle = s?.subtitle || 'Explore my top selling digital items.';
  const productIds = s?.product_ids || [];

  const published = products.filter((p) => p.is_published);
  const byId = new Map(published.map((p) => [p.id, p]));
  const selected = productIds.length
    ? productIds.flatMap((id) => { const p = byId.get(id); return p ? [p] : []; })
    : published.slice(0, 3);

  return (
    <section id="products" className="w-full py-20 bg-[--creator-bg]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-[--creator-text] mb-4">{title}</h2>
          {subtitle && (
            <p className="text-lg text-[--creator-text-muted] max-w-2xl mx-auto">{subtitle}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {selected.length > 0
            ? selected.map((product) => (
                <div
                  key={product.id}
                  className="group flex flex-col bg-[--creator-surface] rounded-2xl overflow-hidden border border-[--creator-border] hover:border-[--creator-primary] transition-all duration-300 hover:shadow-xl"
                >
                  <Link href={`/discover/${product.id}`} className="flex flex-col flex-1">
                    <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {product.thumbnail_url ? (
                        <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[--creator-text-muted]">No Image</div>
                      )}
                    </div>
                    <div className="p-6 pb-0 flex flex-col flex-1 text-left">
                      <h3 className="font-bold text-lg text-[--creator-text] mb-2 group-hover:text-[--creator-primary] transition-colors">{product.name}</h3>
                      <span className="font-bold text-[--creator-text]">{formatINR(product.price ?? 0)}</span>
                    </div>
                  </Link>
                  {creatorId && (
                    <div className="p-6 pt-4">
                      <AddToCartButton
                        item={{
                          id: product.id,
                          title: product.name,
                          price: product.price ?? 0,
                          creatorId,
                          coverImage: product.thumbnail_url,
                          slug: product.id,
                        }}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              ))
            : PLACEHOLDERS.map((product) => (
                <div key={product.id} className="flex flex-col bg-[--creator-surface] rounded-2xl overflow-hidden border border-[--creator-border]">
                  <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6 flex flex-col flex-1 text-left">
                    <h3 className="font-bold text-lg text-[--creator-text] mb-2">{product.name}</h3>
                    <span className="mt-auto pt-4 font-bold text-[--creator-text]">{formatINR(product.price)}</span>
                  </div>
                </div>
              ))}
        </div>

      </div>
    </section>
  );
}
```

- [ ] **Step 5: Update storefront-map.md (same change-set — Stop hook enforces this)**

In `docs/reference/storefront-map.md`:

1. Bump the header line `> Last synced: 2026-06-25` → `> Last synced: 2026-07-08`.
2. In the "Buyer auth on storefronts" paragraph (line 21), append a new paragraph after it:

```markdown
**Cart on storefronts (2026-07-08):** `StorefrontHeader.tsx`'s cart icon is live — count badge via `useHydratedCartCount`, click opens the shared `src/components/store/CartDrawer.tsx` (mounted in the store layout with `palette="creator"`, and in the marketing/account layouts with `palette="ledger"`; `MarketingNav` shows its cart icon only when the cart has items). Add-to-cart lives on multi-product store sections only — `ProductGrid` and `FeaturedProducts` cards render `src/components/store/AddToCartButton.tsx` (cross-creator adds show a replace-cart confirm mirroring the one-creator-per-order API rule). `SectionRenderer` passes `creatorId` down for cart items. Product cards link to `/discover/{id}`. Single-product surfaces (`ProductSalesPage`, `/discover/[productId]`) keep direct Buy Now only.
```

- [ ] **Step 6: Verify compile + lint + manual smoke**

Run: `npx tsc --noEmit` and `npm run lint` — expected clean.
Dev-server smoke on `/store/<slug>`:
- Product cards show "Add to cart"; clicking adds + opens the drawer (no navigation).
- Count badge appears on the store header and (after navigating to `/discover`) on the marketing nav.
- Adding a product from a different creator's store prompts "Replace your cart?".

- [ ] **Step 7: Commit**

```bash
git add src/components/store/AddToCartButton.tsx src/components/storefront/SectionRenderer.tsx "app/(storefront)/store/[slug]/page.tsx" src/components/storefront/sections/ProductGrid.tsx src/components/storefront/sections/FeaturedProducts.tsx docs/reference/storefront-map.md
git commit -m "feat(cart): add-to-cart on store product grids with replace-cart confirm

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Library data model — verify RLS + rewrite useLibrary

**Files:**
- Verify (live DB, no code): `user_product_access` RLS policy + indexes
- Modify: `src/hooks/commerce/useLibrary.ts` (full rewrite)
- Modify: `.claude/rules/hooks-reference.md` (useLibrary row)
- Modify: `.claude/rules/security-model.md` (RLS table row)

- [ ] **Step 1: Verify the RLS policy and index are live**

Using the Supabase MCP (`mcp__plugin_supabase_supabase__execute_sql`, project `qcendfisvyjnwmefruba`):

```sql
select policyname, cmd, qual from pg_policies
where schemaname = 'public' and tablename = 'user_product_access';
```

Expected: one row — `user_product_access_select_own | SELECT | (user_id = auth.uid())`.

```sql
select indexname from pg_indexes
where schemaname = 'public' and tablename = 'user_product_access';
```

Expected: includes `idx_upa_user` (or `idx_upa_user_product`).

**Only if either is missing** (not expected — both shipped in the 2026-06 RLS rollout), write `supabase/migrations/20260708000000_upa_select_own.sql` and apply it via the MCP `apply_migration`:

```sql
-- Idempotent: buyer read model for the library (Approach 1).
alter table public.user_product_access enable row level security;
drop policy if exists user_product_access_select_own on public.user_product_access;
create policy user_product_access_select_own on public.user_product_access
  for select to authenticated using (user_id = auth.uid());
create index if not exists idx_upa_user on public.user_product_access(user_id);
```

No type regeneration needed either way (no schema shape change).

- [ ] **Step 2: Rewrite useLibrary**

Replace the entire contents of `src/hooks/commerce/useLibrary.ts` with:

```ts
// Logged-in buyer's purchased products. Single read model: user_product_access
// (RLS SELECT-own), joined to products for live thumbnail/category/description.
// Snapshot columns (product_name/product_price/product_link) keep deleted or
// unpublished products accessible. Download URLs are NOT stored on products —
// they are minted on demand via GET /api/deliverables/[productId] (signed R2 URLs).
// DB tables: user_product_access, products (read only); auth.users (via supabase.auth)
// Query keys: ['library','list']
"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface PurchasedProduct {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  price_at_purchase: number;
  purchased_at: string;
  access_url: string | null;
}

type JoinedProduct = {
  name: string | null;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  post_purchase_url: string | null;
};

type AccessRow = {
  product_id: string;
  product_name: string;
  product_price: number;
  product_link: string;
  created_at: string | null;
  products: JoinedProduct | JoinedProduct[] | null;
};

export function useLibrary() {
  return useQuery({
    queryKey: ['library', 'list'] as const,
    queryFn: async (): Promise<PurchasedProduct[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_product_access')
        .select(`
          product_id, product_name, product_price, product_link, created_at,
          products ( name, description, thumbnail_url, category, post_purchase_url )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const seen = new Set<string>();
      const result: PurchasedProduct[] = [];
      // reason: the embedded relation is typed object-or-array by supabase-js; narrow once
      for (const row of (data ?? []) as unknown as AccessRow[]) {
        if (seen.has(row.product_id)) continue;
        seen.add(row.product_id);
        const p = Array.isArray(row.products) ? row.products[0] : row.products;
        result.push({
          id: row.product_id,
          name: p?.name ?? row.product_name,
          description: p?.description ?? null,
          thumbnail_url: p?.thumbnail_url ?? null,
          category: p?.category ?? null,
          price_at_purchase: Number(row.product_price) || 0,
          purchased_at: row.created_at ?? '',
          access_url: p?.post_purchase_url || row.product_link || null,
        });
      }
      return result;
    },
  });
}
```

Notes: rows arrive newest-first, so the `seen` dedupe keeps the most recent purchase per product. `product_link` can be `''` (fulfillment stores empty string when a product has no link) — the `|| null` collapses it. RLS on `products` hides unpublished/deleted rows from anon/buyer reads, so `row.products` comes back `null` for them and the snapshot fallback kicks in.

- [ ] **Step 3: Verify the dashboard library page still compiles (shared hook)**

Run: `npx tsc --noEmit`
Expected: clean — `app/dashboard/settings/library/page.tsx` consumes `PurchasedProduct` fields (`id`, `name`, `thumbnail_url`, `category`, `purchased_at`) which are all unchanged; `access_url` is additive.

- [ ] **Step 4: Update the docs (same change-set)**

`.claude/rules/hooks-reference.md`:
- Row `| useLibrary() | Logged-in buyer's purchased products |` → `| useLibrary() | Logged-in buyer's purchased products — reads user_product_access (RLS SELECT-own) joined to products; snapshot columns keep deleted products accessible; access_url = post_purchase_url ?? product_link |`
- The top-of-file comment block reference in the `commerce/` folder row needs no change.

`.claude/rules/security-model.md`, in the "RLS — what's protected" table, add a row after the `refunds` row:

```markdown
| `user_product_access` | Buyer reads their own rows (`user_id = auth.uid()`) — the library read model. **Writes: service role only** (fulfillment grants + guest-entitlement claims). |
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/commerce/useLibrary.ts .claude/rules/hooks-reference.md .claude/rules/security-model.md
git commit -m "feat(library): useLibrary reads user_product_access (single read model)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(Include `supabase/migrations/20260708000000_upa_select_own.sql` in the add list only if Step 1 required it.)

---

### Task 6: Buyer library page rebuild (ledger table)

**Files:**
- Modify: `app/account/library/page.tsx` (full rewrite)
- Modify: `docs/reference/dashboard-map.md:39` (settings/library data-source note)

- [ ] **Step 1: Rewrite the buyer library page**

Replace the entire contents of `app/account/library/page.tsx` with:

```tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Library, ArrowRight, Search, Download, ExternalLink, Loader2, Package,
} from 'lucide-react';
import { Rails, Cross, Kicker } from '@/src/components/marketing/Ledger';
import LibraryAccountActions from '@/components/account/LibraryAccountActions';
import { useLibrary } from '@/hooks/commerce/useLibrary';

const INPUT =
  'w-full pl-10 pr-4 py-3 rounded-lg border border-black/[0.1] bg-white text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all';

function formatINR(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BuyerLibraryPage() {
  const { data: products = [], isLoading } = useLibrary();
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [rowNotice, setRowNotice] = useState<{ id: string; message: string } | null>(null);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  // Deliverables live in R2, not on the product row. Mint signed URLs on demand.
  const handleFiles = async (productId: string) => {
    setDownloadingId(productId);
    setRowNotice(null);
    try {
      const res = await fetch(`/api/deliverables/${productId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not prepare your download.');
      if (!data.files?.length) {
        setRowNotice({ id: productId, message: 'No downloadable files have been added to this product yet.' });
        return;
      }
      for (const file of data.files) {
        window.open(file.signedUrl, '_blank', 'noopener');
      }
    } catch (err) {
      setRowNotice({
        id: productId,
        message: err instanceof Error ? err.message : 'Download failed. Please try again.',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex flex-col w-full overflow-hidden bg-white">

      {/* Header */}
      <section className="relative bg-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(22,19,15,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(22,19,15,0.035) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
          }}
        />
        <Rails className="pt-28 sm:pt-32">
          <div className="px-5 sm:px-10 lg:px-14 pb-10 sm:pb-12">
            <div className="max-w-3xl mx-auto">
              <Kicker route="/account/library" />
              <h1 className="mt-7 text-[30px] sm:text-[40px] font-bold tracking-[-0.04em] leading-[1.05] text-[#16130F]">
                My digital <span className="text-[#E83A2E]">library.</span>
              </h1>
              <p className="mt-4 text-[14px] sm:text-[15px] font-medium text-black/50 max-w-xl leading-relaxed">
                Access all of your purchased content, courses, and downloads across DigiOne.
              </p>
            </div>
          </div>
        </Rails>
      </section>

      {/* Content */}
      <section className="relative bg-white">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <Cross className="-bottom-[5px] -left-[5px]" />
          <Cross className="-bottom-[5px] -right-[5px]" />
          <div className="px-5 sm:px-10 lg:px-14 py-10 sm:py-14">

            {/* Loading */}
            {isLoading && (
              <div className="max-w-3xl mx-auto flex items-center justify-center gap-3 py-16">
                <span className="w-6 h-6 rounded-full border-2 border-black/[0.08] border-t-[#E83A2E] animate-spin" />
                <span className="font-ledger text-[11px] text-black/40 uppercase tracking-[0.18em]">Loading library…</span>
              </div>
            )}

            {/* Empty state — only when the query returns zero rows */}
            {!isLoading && products.length === 0 && (
              <div className="max-w-3xl mx-auto bg-white border border-black/[0.07] rounded-xl p-10 sm:p-14 text-center">
                <div className="w-14 h-14 rounded-lg bg-[#FAF8F6] border border-black/[0.07] flex items-center justify-center mx-auto mb-5">
                  <Library className="w-6 h-6 text-[#E83A2E]" strokeWidth={1.8} />
                </div>
                <p className="font-ledger text-[10px] uppercase tracking-[0.18em] text-black/35 mb-3">
                  0 items · No purchases yet
                </p>
                <h2 className="text-[19px] font-bold tracking-[-0.02em] text-[#16130F] mb-2">
                  Your library is currently empty
                </h2>
                <p className="text-[13.5px] font-medium text-black/50 max-w-sm mx-auto mb-7 leading-relaxed">
                  When you purchase templates, assets, or software from creators, they will appear here forever.
                </p>
                <Link
                  href="/discover"
                  className="group inline-flex items-center gap-2 bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Discover top products
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                </Link>
              </div>
            )}

            {/* Ledger table */}
            {!isLoading && products.length > 0 && (
              <div className="max-w-3xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
                  <p className="font-ledger text-[10px] uppercase tracking-[0.18em] text-black/35 shrink-0">
                    {products.length} item{products.length === 1 ? '' : 's'}
                  </p>
                  <div className="relative flex-1 max-w-sm sm:ml-auto">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search your library…"
                      className={INPUT}
                    />
                  </div>
                </div>

                <div className="bg-white border border-black/[0.07] rounded-xl overflow-hidden">
                  {filtered.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <p className="text-[13.5px] font-medium text-black/50">
                        No products match &ldquo;{search}&rdquo;.
                      </p>
                    </div>
                  ) : (
                    filtered.map((p, i) => (
                      <div key={p.id} className={i > 0 ? 'border-t border-black/[0.07]' : ''}>
                        <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-[#FAF8F6] transition-colors">
                          {/* Thumbnail */}
                          <div className="w-12 h-12 rounded-lg bg-[#FAF8F6] border border-black/[0.07] overflow-hidden flex items-center justify-center shrink-0">
                            {p.thumbnail_url ? (
                              <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-black/25" strokeWidth={1.8} />
                            )}
                          </div>

                          {/* Name + mono meta */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-bold tracking-[-0.01em] text-[#16130F] truncate">{p.name}</p>
                            <p className="font-ledger text-[10px] uppercase tracking-[0.14em] text-black/35 mt-1">
                              {(p.category ?? 'digital')} · {formatDate(p.purchased_at)}
                            </p>
                          </div>

                          {/* Price */}
                          <span className="hidden sm:block font-ledger text-[13px] font-semibold text-[#16130F] shrink-0">
                            {formatINR(p.price_at_purchase)}
                          </span>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleFiles(p.id)}
                              disabled={downloadingId === p.id}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#16130F] hover:bg-black disabled:opacity-50 text-white text-[12.5px] font-semibold transition-colors"
                            >
                              {downloadingId === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              Files
                            </button>
                            {p.access_url && (
                              <a
                                href={p.access_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black/[0.1] hover:border-black/[0.25] text-[#16130F] text-[12.5px] font-semibold transition-colors"
                              >
                                Open link
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Per-row notice (empty deliverables / download error) */}
                        {rowNotice?.id === p.id && (
                          <div className="px-4 sm:px-5 pb-3.5 -mt-1">
                            <p className="text-[12.5px] font-medium text-[#E83A2E]">{rowNotice.message}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <LibraryAccountActions />
          </div>
        </Rails>
      </section>
    </div>
  );
}
```

(`Kicker`'s `index` prop is legacy and no longer rendered — dropped. `LibraryAccountActions` stays: it runs the claim-on-load and the creator-upgrade card.)

- [ ] **Step 2: Update dashboard-map.md (settings/library row)**

In `docs/reference/dashboard-map.md:39`, the `/dashboard/settings/library` row currently ends with:

```
`useLibrary` reads `orders`→`order_items`→`products` (status `completed`); Download mints signed R2 URLs via `GET /api/deliverables/[productId]`
```

Change that note to:

```
`useLibrary` reads `user_product_access` (RLS SELECT-own) joined to `products` (snapshot fallback for deleted products); Download mints signed R2 URLs via `GET /api/deliverables/[productId]`
```

- [ ] **Step 3: Verify compile + manual smoke**

Run: `npx tsc --noEmit` and `npm run lint` — expected clean.
Dev-server smoke: visit `/account/library` logged in as a buyer with purchases (or after Task 7 + a sandbox purchase): rows render; the Files button on a product with no deliverables shows the inline notice; search filters.

- [ ] **Step 4: Commit**

```bash
git add app/account/library/page.tsx docs/reference/dashboard-map.md
git commit -m "feat(library): rebuild /account/library as ledger table over user_product_access

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Server-derived checkout identity

**Files:**
- Modify: `app/api/checkout/create/route.ts`
- Modify: `.claude/rules/api-routes.md` (checkout/create section)

- [ ] **Step 1: Derive the buyer from the cookie session**

In `app/api/checkout/create/route.ts`:

Add the import (after line 3):

```ts
import { createClient } from '@/lib/supabase/server';
```

Replace line 21:

```ts
    const { items, buyerId, couponCode, contact, upsellPageId, referralCode } = await req.json();
```

with:

```ts
    const { items, couponCode, contact, upsellPageId, referralCode } = await req.json();

    // Buyer identity is derived server-side from the cookie session — never
    // from the request body. Guests stay null → guest_entitlements path.
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    const buyerUserId = user?.id ?? null;
```

Replace the three `buyerId` usages:

1. Line 75 (referral validation):
```ts
      referral = await validateReferral(supabase, String(referralCode), {
        buyerUserId,
        sellingCreatorId: creatorProfileId,
      });
```

2. Line 103 (orders insert):
```ts
      user_id: buyerUserId,
```

3. Line 130 (order_referrals upsert):
```ts
        referred_user_id: buyerUserId,
```

(`public.users.id` equals `auth.users.id` — `handle_new_user` inserts with `id = NEW.id` — so this satisfies both the `orders.user_id` semantics used by `fulfillOrder` and the `user_product_access_select_own` RLS policy.)

- [ ] **Step 2: Update api-routes.md**

In `.claude/rules/api-routes.md`, `POST /api/checkout/create` section:

1. In the at-a-glance table row, change `Auth` cell from `none (buyerId optional)` to `none (buyer derived from cookie session when present)`.
2. In the request JSON sample, delete the line `"buyerId": "uuid?",`.
3. In the **Side effects** paragraph, after the sentence about the pending orders row, add: `Buyer identity is server-derived: when a cookie session exists, orders.user_id = auth user id (fulfillment then grants user_product_access directly); guests stay NULL and flow through guest_entitlements.`

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: clean. (No client sends `buyerId` today — verified: checkout page and discover BuyNowButton never included it.)

- [ ] **Step 4: Commit**

```bash
git add app/api/checkout/create/route.ts .claude/rules/api-routes.md
git commit -m "fix(checkout): derive buyer identity server-side from the cookie session

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Payment status — cf_payment_id reconcile + delivery CTA copy

**Files:**
- Create: `app/payment/status/LibraryCta.tsx`
- Modify: `app/payment/status/page.tsx`
- Modify: `app/user-login/page.tsx` (`?email=` prefill)
- Modify: `.claude/rules/cashfree-reference.md`

- [ ] **Step 1: Create the LibraryCta client component**

Create `app/payment/status/LibraryCta.tsx`:

```tsx
'use client';

// Post-purchase access CTA — replaces the old "creator will share access via
// email" copy. Logged-in buyers go straight to the library; guests are nudged
// to create a free account (email prefilled via the remembered-buyer-email key,
// which the globally-mounted BuyerAuthModal reads).

import Link from 'next/link';
import { BookOpen, UserPlus, ArrowRight } from 'lucide-react';
import { useAuthSession } from '@/hooks/auth/useAuthSession';
import { useBuyerAuth } from '@/stores/buyerAuth';
import { rememberBuyerEmail } from '@/lib/shared/buyer-email';

export function LibraryCta({ email }: { email: string }) {
  const { isLoggedIn, isLoading } = useAuthSession();
  const openBuyerAuth = useBuyerAuth((s) => s.open);

  if (isLoading) return null;

  if (isLoggedIn) {
    return (
      <Link
        href="/account/library"
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition shadow-md shadow-indigo-500/20"
      >
        <BookOpen className="w-3.5 h-3.5" />
        Go to my library
        <ArrowRight className="w-3.5 h-3.5 ml-auto" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (email) rememberBuyerEmail(email);
        openBuyerAuth('signup', '/account/library');
      }}
      className="w-full text-left flex items-start gap-2.5 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl px-3 py-2.5 hover:bg-indigo-100/70 dark:hover:bg-indigo-500/15 transition"
    >
      <UserPlus className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>
        <span className="font-semibold">Create a free account{email ? ` with ${email}` : ''}</span>{' '}
        to keep lifetime access to your purchases.
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Add the payments-fetch reconcile helper**

In `app/payment/status/page.tsx`, after `getCashfreeStatus` (line 43), add:

```ts
// Fetch the SUCCESS payment's cf_payment_id for a Cashfree order so the
// status-page reconcile stores the same gateway_payment_id (and ledger
// record_hash) the webhook would have. Cashfree's guidance: dedupe by
// cf_payment_id, not order_id. Failure → undefined (fall back to the old
// behavior: fulfill without a payment id).
async function getCashfreePaymentId(gatewayOrderId: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${CASHFREE_ENV}/orders/${gatewayOrderId}/payments`, {
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID!,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET!,
      },
      cache: 'no-store',
    });
    if (!res.ok) return undefined;
    const payments: unknown = await res.json();
    if (!Array.isArray(payments)) return undefined;
    // reason: Cashfree response is untyped at the fetch boundary; narrow the two fields used
    const success = (payments as Array<{ payment_status?: string; cf_payment_id?: string | number }>)
      .find((p) => p?.payment_status === 'SUCCESS');
    return success?.cf_payment_id != null ? String(success.cf_payment_id) : undefined;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 3: Use it in both reconcile branches**

Payment-link branch — replace (lines 106-110):

```ts
        const cfStatus = await getCashfreeStatus(submission.gateway_order_id || order_id);
        status = cfToDbStatus(cfStatus);
        if (status === 'completed') {
          await fulfillPaymentLinkSubmission(submission.id);
        }
```

with:

```ts
        const cfStatus = await getCashfreeStatus(submission.gateway_order_id || order_id);
        status = cfToDbStatus(cfStatus);
        if (status === 'completed') {
          const gatewayPaymentId = await getCashfreePaymentId(submission.gateway_order_id || order_id);
          await fulfillPaymentLinkSubmission(submission.id, gatewayPaymentId);
        }
```

Product branch — replace (lines 149-154):

```ts
        const cfStatus = await getCashfreeStatus(order.gateway_order_id || order_id);
        status = cfToDbStatus(cfStatus);
        if (status === 'completed') {
          await fulfillOrder(order.id); // shared claim — no raw writes here (finding #1)
        }
```

with:

```ts
        const cfStatus = await getCashfreeStatus(order.gateway_order_id || order_id);
        status = cfToDbStatus(cfStatus);
        if (status === 'completed') {
          const gatewayPaymentId = await getCashfreePaymentId(order.gateway_order_id || order_id);
          // shared claim — no raw writes here; payment id keeps the ledger
          // record_hash identical to the webhook path (no more ':free' hashes)
          await fulfillOrder(order.id, gatewayPaymentId ? { gatewayPaymentId } : undefined);
        }
```

- [ ] **Step 4: Replace the amber "creator will share access" block**

In `app/payment/status/page.tsx`:

Add the import (after line 15):

```ts
import { LibraryCta } from './LibraryCta';
```

Replace the amber fallback block (lines 273-280):

```tsx
                      ) : (
                        <div className="px-4 pb-4">
                          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl px-3 py-2.5">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>The creator will share access details via email shortly.</span>
                          </div>
                        </div>
                      )}
```

with:

```tsx
                      ) : (
                        <div className="px-4 pb-4">
                          <LibraryCta email={customerEmail} />
                        </div>
                      )}
```

The "A confirmation has been sent to {email}" line (line 204-208) STAYS — Task 10 makes it true.

- [ ] **Step 5: `?email=` prefill on /user-login (used by the guest email CTA in Task 10)**

In `app/user-login/page.tsx`:

Change the import on line 9:

```tsx
import { useRouter, useSearchParams } from 'next/navigation';
```

Add after line 8's imports:

```tsx
import { rememberBuyerEmail } from '@/lib/shared/buyer-email';
```

Inside `UserLoginContent`, after `const opened = useRef(false);` (line 17), add:

```tsx
  const searchParams = useSearchParams();

  // Email links (purchase confirmation) land here with ?email= so the signup
  // modal prefills even on a device with no remembered buyer email.
  useEffect(() => {
    const email = searchParams.get('email');
    if (email) rememberBuyerEmail(email);
  }, [searchParams]);
```

(The page already wraps content in `<Suspense>`, which `useSearchParams` requires.)

- [ ] **Step 6: Update cashfree-reference.md**

In `.claude/rules/cashfree-reference.md`:

1. **"Where it's used in this repo" table**: replace the four rows with the current truth:

```markdown
| File | Trigger | Returns to | Free-order short-circuit? |
|---|---|---|---|
| `app/(buyer)/checkout/page.tsx` | Cart checkout (`Pay ₹X` button) | `/payment/status?order_id=...` | Yes |
| `app/(marketing)/discover/[productId]/BuyNowButton.tsx` | Product-page Buy Now (ledger checkout) | `/payment/status?order_id=...` | Yes |
| `src/components/storefront/PaymentLinkPage.tsx` | Payment-link sites (custom amount) | `/payment/status?order_id=...&sub=...` | N/A (no free path on payment links) |
```

2. **Delete the "Inconsistencies in current code — fix on next touch" section entirely** (all rows are fixed or reference deleted files: the old `store/product/[productId]/BuyNowButton.tsx` and `upsells/[slug]/UpsellCheckoutClient.tsx` routes no longer exist, and `checkout/page.tsx` now uses static import + `data.environment` + the free-order short-circuit).

3. In **"Checking order status (server-side)"**, after the `PAID → calls fulfillOrder` paragraph, add:

```markdown
**Payment-id reconcile (2026-07-08):** before calling `fulfillOrder`, the status page also fetches `GET {CASHFREE_ENV}/orders/{gatewayOrderId}/payments`, extracts the SUCCESS payment's `cf_payment_id`, and passes it as `{ gatewayPaymentId }` (same for `fulfillPaymentLinkSubmission`). This keeps `orders.gateway_payment_id` populated and the ledger `record_hash` identical to the webhook path — no more `:free`-suffixed hashes for status-page-reconciled paid orders. A failed payments fetch falls back to fulfilling without a payment id.
```

4. In the **SDK options table / `redirectTarget` row** ("Not passed" row) remove the mention of `BuyNowButton.tsx`, `UpsellCheckoutClient.tsx` if the deleted-file names appear — replace the file list with `discover BuyNowButton.tsx, PaymentLinkPage.tsx`.

- [ ] **Step 7: Verify compile + lint**

Run: `npx tsc --noEmit` and `npm run lint`
Expected: clean. (`Clock` is still used by the PENDING branch, so the lucide import stays valid.)

- [ ] **Step 8: Commit**

```bash
git add app/payment/status/LibraryCta.tsx app/payment/status/page.tsx app/user-login/page.tsx .claude/rules/cashfree-reference.md
git commit -m "fix(payments): status-page reconcile stores cf_payment_id; real delivery CTA replaces false email copy

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Real coupons at checkout (+ kill fake SAVE10)

**Files:**
- Modify: `app/(buyer)/cart/page.tsx`
- Modify: `app/(buyer)/checkout/page.tsx`

- [ ] **Step 1: Delete the fake coupon from /cart**

In `app/(buyer)/cart/page.tsx`:

1. Line 3: change to `import React from 'react';` (no `useState` needed anymore).
2. Line 6: add `ShoppingCart` to the lucide import and remove `Tag`:
   ```ts
   import { Trash2, ArrowRight, ShieldCheck, ShoppingCart } from 'lucide-react';
   ```
3. Delete lines 11-24 (the `couponCode`/`discount` state and `handleApplyCoupon`).
4. Delete line 46 (`const finalTotal = total - discount;`).
5. Delete the discount row (lines 99-104, the `{discount > 0 && …}` block).
6. In the "Total due" row (line 108), change `{finalTotal.toLocaleString('en-IN')}` to `{total.toLocaleString('en-IN')}`.
7. Delete the entire promo-code block (lines 112-132, the `<div className="mb-6 relative">…</div>` containing the Promo code input and Apply button).
8. Delete the dummy `ShoppingCart` SVG function at the bottom (lines 158-163) — the lucide import replaces it.

- [ ] **Step 2: Add the real coupon input to /checkout**

In `app/(buyer)/checkout/page.tsx`:

1. Add `Tag` to the lucide import (line 11):
   ```ts
   import { Loader2, ShieldCheck, Package, Trash2, AlertTriangle, Tag } from 'lucide-react';
   ```

2. After the existing state declarations (line 25), add:

```tsx
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const payable = Math.max(0, total - (appliedCoupon?.discount ?? 0));
```

3. After the email-prefill `useEffect` (line 36), add:

```tsx
  // Cart changes invalidate an applied coupon (amount/creator may have changed).
  useEffect(() => {
    setAppliedCoupon(null);
    setCouponError(null);
  }, [items]);
```

4. Add the handler after `useEffect` blocks (before `handlePay`):

```tsx
  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code || items.length === 0) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cartAmount: total, creatorId: items[0].creatorId }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) throw new Error(data.error || 'Invalid coupon code');
      setAppliedCoupon({ code: code.toUpperCase(), discount: Number(data.discount_amount) || 0 });
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err instanceof Error ? err.message : 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };
```

5. In `handlePay`'s fetch body (line 52-56), add `couponCode`:

```ts
        body: JSON.stringify({
          items,
          contact: { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined },
          referralCode,
          couponCode: appliedCoupon?.code,
        }),
```

6. Replace the summary footer (lines 118-121):

```tsx
          <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-500">Total</span>
            <span className="text-xl font-extrabold text-gray-900 dark:text-white">₹{total.toLocaleString('en-IN')}</span>
          </div>
```

with:

```tsx
          <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 space-y-3">
            {/* Coupon */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value); setCouponError(null); }}
                  placeholder="Coupon code"
                  disabled={!!appliedCoupon}
                  className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm uppercase text-gray-900 dark:text-white placeholder-gray-400 placeholder:normal-case focus:ring-2 focus:ring-indigo-500/40 outline-none transition disabled:opacity-60"
                />
              </div>
              {appliedCoupon ? (
                <button
                  type="button"
                  onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                  className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-red-500 border border-gray-200 dark:border-gray-700 rounded-lg transition"
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-4 py-2 text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition"
                >
                  {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </button>
              )}
            </div>
            {couponError && (
              <p className="text-xs text-red-500 font-medium">{couponError}</p>
            )}
            {appliedCoupon && (
              <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                <span>Coupon {appliedCoupon.code}</span>
                <span>−₹{appliedCoupon.discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            {/* Total */}
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-semibold text-gray-500">Total</span>
              <span className="text-xl font-extrabold text-gray-900 dark:text-white">₹{payable.toLocaleString('en-IN')}</span>
            </div>
          </div>
```

7. Update the Pay button label (line 185) from `Pay ₹{total.toLocaleString('en-IN')}` to:

```tsx
                Pay ₹{payable.toLocaleString('en-IN')}
```

(The API re-validates the coupon server-side and stores `coupon_id`/`discount_amount` in order metadata — existing behavior; the client `discount` is display-only. A coupon that takes the total to ₹0 flows through the existing free-order short-circuit.)

- [ ] **Step 3: Verify compile + lint + manual smoke**

Run: `npx tsc --noEmit` and `npm run lint` — expected clean.
Dev smoke: `/cart` has no promo field; `/checkout` Apply with a bogus code shows the inline error and the total is unchanged; a valid creator coupon shows the discount row and lowers the Pay button amount.

- [ ] **Step 4: Commit**

```bash
git add "app/(buyer)/cart/page.tsx" "app/(buyer)/checkout/page.tsx"
git commit -m "feat(coupons): real coupon validation at checkout; remove fake SAVE10 from cart

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Purchase confirmation email (Resend)

**Files:**
- Install: `resend` package (approved in the spec — the only new package)
- Create: `src/lib/server/email-templates/purchase-confirmation.ts`
- Create: `src/lib/server/email-templates/purchase-confirmation.test.ts`
- Create: `src/lib/server/email.ts`
- Modify: `src/lib/server/fulfillment.ts` (step 4b)
- Modify: `.env.example`, `.claude/rules/env-vars.md`, `.claude/rules/api-routes.md`

- [ ] **Step 1: Install resend**

Run: `npm install resend`
Expected: added to `package.json` dependencies, no peer warnings.

- [ ] **Step 2: Write the failing template test**

Create `src/lib/server/email-templates/purchase-confirmation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildPurchaseConfirmation, type PurchaseEmailInput } from './purchase-confirmation';

const base: PurchaseEmailInput = {
  to: 'buyer@example.com',
  customerName: 'Asha Verma',
  orderId: 'abc12345-0000-0000-0000-000000000000',
  totalAmount: 1499,
  items: [
    { name: 'Notion Template', price: 999, accessUrl: 'https://example.com/access' },
    { name: 'Preset <Pack>', price: 500, accessUrl: null },
  ],
  isGuest: false,
  appUrl: 'https://digione.ai',
};

describe('buildPurchaseConfirmation', () => {
  it('renders every product with its price and the total', () => {
    const { html } = buildPurchaseConfirmation(base);
    expect(html).toContain('Notion Template');
    expect(html).toContain('₹999');
    expect(html).toContain('₹500');
    expect(html).toContain('₹1,499');
  });

  it('escapes HTML in product names', () => {
    const { html } = buildPurchaseConfirmation(base);
    expect(html).toContain('Preset &lt;Pack&gt;');
    expect(html).not.toContain('Preset <Pack>');
  });

  it('includes per-product access links only when present', () => {
    const { html } = buildPurchaseConfirmation(base);
    expect(html).toContain('https://example.com/access');
    expect(html.match(/Access your product/g)?.length).toBe(1);
  });

  it('logged-in variant links to the library', () => {
    const { html } = buildPurchaseConfirmation(base);
    expect(html).toContain('https://digione.ai/account/library');
    expect(html).toContain('Open your library');
  });

  it('guest variant links to account creation with the prefilled email', () => {
    const { html } = buildPurchaseConfirmation({ ...base, isGuest: true });
    expect(html).toContain('https://digione.ai/user-login?email=buyer%40example.com');
    expect(html).toContain('Create your free account');
  });

  it('includes the receipt link and greets by first name', () => {
    const { html } = buildPurchaseConfirmation(base);
    expect(html).toContain('https://digione.ai/payment/receipt?order_id=abc12345-0000-0000-0000-000000000000');
    expect(html).toContain('Hi Asha,');
  });

  it('subject names the single product, or the count for multi-item orders', () => {
    expect(buildPurchaseConfirmation({ ...base, items: [base.items[0]] }).subject)
      .toBe('Your purchase is confirmed — Notion Template');
    expect(buildPurchaseConfirmation(base).subject)
      .toBe('Your purchase is confirmed — 2 products');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/lib/server/email-templates/purchase-confirmation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the template builder**

Create `src/lib/server/email-templates/purchase-confirmation.ts`:

```ts
// Self-contained HTML purchase-confirmation email — no extra packages, no JSX.
// Pure builder (unit-tested); sending lives in src/lib/server/email.ts.
// Palette mirrors the engineered-ledger language: ink #16130F, vermilion
// #E83A2E, paper #FAF8F6. Table layout + inline styles for email clients.

export interface PurchaseEmailItem {
  name: string;
  price: number;
  accessUrl: string | null;
}

export interface PurchaseEmailInput {
  to: string;
  customerName: string;
  orderId: string;
  totalAmount: number;
  items: PurchaseEmailItem[];
  isGuest: boolean;
  appUrl: string;
}

function formatINR(n: number): string {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPurchaseConfirmation(input: PurchaseEmailInput): { subject: string; html: string } {
  const firstName = escapeHtml((input.customerName || 'there').split(' ')[0]);
  const libraryUrl = input.isGuest
    ? `${input.appUrl}/user-login?email=${encodeURIComponent(input.to)}`
    : `${input.appUrl}/account/library`;
  const ctaLabel = input.isGuest ? 'Create your free account' : 'Open your library';
  const receiptUrl = `${input.appUrl}/payment/receipt?order_id=${input.orderId}`;

  const subject = input.items.length === 1
    ? `Your purchase is confirmed — ${input.items[0].name}`
    : `Your purchase is confirmed — ${input.items.length} products`;

  const itemRows = input.items
    .map(
      (item) => `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #eeeae6;">
                <div style="font-size:14px;font-weight:600;color:#16130F;">${escapeHtml(item.name)}</div>
                ${item.accessUrl ? `<a href="${escapeHtml(item.accessUrl)}" style="font-size:12px;color:#E83A2E;text-decoration:none;">Access your product →</a>` : ''}
              </td>
              <td align="right" style="padding:12px 0;border-bottom:1px solid #eeeae6;font-size:14px;font-weight:600;color:#16130F;white-space:nowrap;">${formatINR(item.price)}</td>
            </tr>`
    )
    .join('');

  const guestNote = input.isGuest
    ? `<p style="font-size:13px;color:rgba(22,19,15,0.55);line-height:1.6;margin:16px 0 0;">Create a free account with <strong>${escapeHtml(input.to)}</strong> to keep lifetime access to everything you buy on DigiOne.</p>`
    : '';

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FAF8F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F6;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #eeeae6;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:28px 32px 0;">
            <div style="font-size:16px;font-weight:700;color:#16130F;">DigiOne<span style="color:#E83A2E;font-size:10px;vertical-align:super;">.ai</span></div>
          </td></tr>
          <tr><td style="padding:24px 32px 0;">
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#16130F;">Payment successful</h1>
            <p style="font-size:14px;color:rgba(22,19,15,0.55);line-height:1.6;margin:8px 0 0;">Hi ${firstName}, your purchase is confirmed. Here's what you bought:</p>
          </td></tr>
          <tr><td style="padding:20px 32px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${itemRows}
              <tr>
                <td style="padding:14px 0;font-size:13px;font-weight:600;color:rgba(22,19,15,0.55);">Total paid</td>
                <td align="right" style="padding:14px 0;font-size:16px;font-weight:700;color:#16130F;">${formatINR(input.totalAmount)}</td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:8px 32px 28px;">
            <a href="${libraryUrl}" style="display:block;text-align:center;background:#E83A2E;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 20px;border-radius:8px;">${ctaLabel}</a>
            ${guestNote}
            <p style="font-size:12px;color:rgba(22,19,15,0.4);margin:16px 0 0;">
              <a href="${receiptUrl}" style="color:rgba(22,19,15,0.55);">Download your receipt</a> · Order ${escapeHtml(input.orderId.slice(0, 8))}
            </p>
          </td></tr>
        </table>
        <p style="font-size:11px;color:rgba(22,19,15,0.35);margin:16px 0 0;">Secured by DigiOne · Payments via Cashfree</p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, html };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/lib/server/email-templates/purchase-confirmation.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Write the send wrapper**

Create `src/lib/server/email.ts`:

```ts
// Thin Resend wrapper. Missing env → warn + no-op (dev-safe). Callers treat
// email as best-effort: failures are logged, never thrown past this module's
// contract (send errors are logged here; network throws propagate and MUST be
// caught by the caller — fulfillment wraps the call in try/catch).
// Server-only.

import { Resend } from 'resend';
import {
  buildPurchaseConfirmation,
  type PurchaseEmailInput,
} from './email-templates/purchase-confirmation';

export type { PurchaseEmailInput };

export async function sendPurchaseConfirmation(input: PurchaseEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn('[email] RESEND_API_KEY / EMAIL_FROM not configured — skipping purchase confirmation');
    return;
  }

  const { subject, html } = buildPurchaseConfirmation(input);
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to: input.to, subject, html });
  if (error) {
    console.error('[email] purchase confirmation send failed:', error.message ?? error);
  }
}
```

- [ ] **Step 7: Call it from fulfillment (step 4b)**

In `src/lib/server/fulfillment.ts`:

Add the import (after line 11):

```ts
import { sendPurchaseConfirmation } from './email';
```

In `fulfillOrder`, change the claim select (line 34) to include `customer_name`:

```ts
    .select('id, user_id, total_amount, creator_id, metadata, customer_email, customer_name')
```

Replace the step-4 block (lines 100-150) with (changes: `recipientEmail` derived once, `post_purchase_url` added to the select, email sent at the end of the block):

```ts
  // 4. Grant durable access. Logged-in buyers get a user_product_access row now;
  // guests get an email-keyed guest_entitlements row, claimed on later sign-in.
  const buyerUserId = claimed.user_id;
  const recipientEmail = claimed.customer_email ? normalizeEmail(claimed.customer_email) : null;
  const guestEmail = !buyerUserId ? recipientEmail : null;

  if (buyerUserId || guestEmail) {
    const { data: items, error: itemsErr } = await db
      .from('order_items')
      .select('product_id, price_at_purchase, products(name, product_link, post_purchase_url)')
      .eq('order_id', orderId);

    if (itemsErr) {
      console.error('[fulfillment] order_items read failed for order', orderId, itemsErr.message);
    }

    for (const item of items ?? []) {
      if (!item.product_id) continue;
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const productName = product?.name ?? 'Product';
      const productLink = product?.product_link ?? '';
      const productPrice = Number(item.price_at_purchase) || 0;

      if (buyerUserId) {
        const { error: accessErr } = await db.from('user_product_access').upsert(
          {
            user_id: buyerUserId,
            order_id: orderId,
            product_id: item.product_id,
            product_name: productName,
            product_link: productLink,
            product_price: productPrice,
          },
          { onConflict: 'order_id,product_id', ignoreDuplicates: true }
        );
        if (accessErr) {
          console.error('[fulfillment] access grant failed for order', orderId, 'product', item.product_id, accessErr.message);
        }
      } else if (guestEmail) {
        await recordGuestEntitlement({
          orderId,
          email: guestEmail,
          productId: item.product_id,
          productName,
          productPrice,
          productLink,
        });
      }
    }

    // 4b. Purchase-confirmation email (Resend) — logged and swallowed;
    // fulfillment never fails on email. Product orders only.
    if (recipientEmail && (items?.length ?? 0) > 0) {
      try {
        await sendPurchaseConfirmation({
          to: recipientEmail,
          customerName: claimed.customer_name ?? 'there',
          orderId,
          totalAmount: total,
          isGuest: !buyerUserId,
          appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
          items: (items ?? []).map((item) => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            return {
              name: product?.name ?? 'Product',
              price: Number(item.price_at_purchase) || 0,
              accessUrl: product?.post_purchase_url || product?.product_link || null,
            };
          }),
        });
      } catch (emailErr) {
        console.error(
          '[fulfillment] purchase email failed for order',
          orderId,
          emailErr instanceof Error ? emailErr.message : String(emailErr)
        );
      }
    }
  }
```

(`fulfillPaymentLinkSubmission` is untouched — payment-link receipts are out of scope.)

- [ ] **Step 8: Env vars — .env.example + env-vars.md**

Append to `.env.example` (after the DigiOne identity block):

```
# ── Email (Resend) ───────────────────────────────────────────────────────
# Transactional email (purchase confirmations). Missing values = emails are
# silently skipped (dev-safe no-op). Verify the sending domain in the Resend
# dashboard (SPF/DKIM DNS records) before production.
RESEND_API_KEY=
EMAIL_FROM="DigiOne <receipts@digione.ai>"
```

In `.claude/rules/env-vars.md`, add a new section before "## Known cleanup":

```markdown
## Email (Resend)

Transactional email — currently one email: the buyer purchase confirmation, sent from `fulfillOrder` step 4b. Read by `src/lib/server/email.ts`. Missing values are a safe no-op (console.warn, no send) — fulfillment never fails on email.

| Var | Scope | Used in | Notes |
|---|---|---|---|
| `RESEND_API_KEY` | **secret** | `src/lib/server/email.ts` | Resend API key. Server-only. |
| `EMAIL_FROM` | server | `src/lib/server/email.ts` | From header, e.g. `DigiOne <receipts@digione.ai>`. The domain must be verified in the Resend dashboard (SPF/DKIM DNS records). |
```

- [ ] **Step 9: api-routes.md — webhook/fulfillment side-effect list**

In `.claude/rules/api-routes.md`, in the `POST /api/webhook/cashfree` section's "On SUCCESS (product orders)" numbered list, renumber/insert after item 5 (access grants):

```markdown
5b. Send the buyer purchase-confirmation email via Resend (`src/lib/server/email.ts`) — non-fatal, logged and swallowed; skipped when `RESEND_API_KEY`/`EMAIL_FROM` are unset.
```

Also update the at-a-glance webhook row's "Writes to" cell to append `; purchase email (Resend, non-fatal)`.

- [ ] **Step 10: Verify compile + full test run**

Run: `npx tsc --noEmit`, `npm run lint`, `npm test`
Expected: all clean/passing.

**Manual setup for the user (note in the final report, not automatable):** create a Resend account, verify the sending domain (SPF/DKIM DNS records), and set `RESEND_API_KEY` + `EMAIL_FROM` in `.env.local` / Vercel.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json src/lib/server/email-templates/purchase-confirmation.ts src/lib/server/email-templates/purchase-confirmation.test.ts src/lib/server/email.ts src/lib/server/fulfillment.ts .env.example .claude/rules/env-vars.md .claude/rules/api-routes.md
git commit -m "feat(email): Resend purchase-confirmation email from fulfillment (non-fatal)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full local gauntlet**

```bash
npx tsc --noEmit
npm run lint
npm test
```

Expected: zero type errors, zero lint errors, all Vitest suites pass (114 existing + cart-logic 5 + email template 7).

- [ ] **Step 2: Run the project's `/verify` skill**

Invoke the `verify` skill (rule-violation scan on changed files + smoke checklist). Fix anything it flags.

- [ ] **Step 3: Manual sandbox e2e checklist (from the spec)**

With `npm run dev` + Cashfree sandbox:

1. **Guest buys** → email received (needs `RESEND_API_KEY` set; otherwise confirm the `[email] … skipping` warn in server logs) → signs up with the same email → library row appears → Files downloads.
2. **Logged-in buyer buys** → `orders.user_id` set (check via Supabase) → library row immediate, no claim needed.
3. **Add-to-cart** from a store grid → drawer opens → count badge on the store header AND on the marketing nav (after navigating to `/discover`) → adding from a second creator's store prompts "Replace your cart?".
4. **Coupon** applies at `/checkout`; order `metadata.coupon_id` present on the created order; invalid code shows the inline error.
5. **Status-page race**: land on `/payment/status` before the webhook → `orders.gateway_payment_id` populated (no `:free` ledger hash).
6. **Refund** an order (`/api/refunds/create` or dashboard) → after `settle_refund`, the library row disappears (access revoked) and `/api/deliverables/[productId]` returns 403.
7. **Light/dark + mobile**: drawer renders as a full-width sheet below `sm`; dashboard settings library still fine in both themes.

- [ ] **Step 4: Report**

Summarize what shipped, the manual Resend DNS setup still owed by the user, and any checklist items that couldn't be exercised in sandbox.

---

## Self-review notes

- **Spec coverage:** §1 cart system → Tasks 1–4; §2 library → Tasks 5–6; §3 identity → Task 7; §4 status page → Task 8; §5 coupons → Task 9; §6 email → Task 10; §7 docs → distributed into Tasks 1, 4, 5, 6, 7, 8, 10 (same change-set per CLAUDE.md); testing → Tasks 1, 10, 11. Error-handling table: email non-fatal (T10 §7), empty deliverables inline notice (T6), coupon inline error (T9), cross-creator confirm (T1/T4), claim silent retry (unchanged, kept in T6), payments-fetch fallback (T8 §2).
- **Type consistency:** `CartItem`/`AddItemResult` defined once in `cart-logic.ts`, re-exported from `useCart.ts`; `classifyAdd`, `replaceCartWith`, `openDrawer`, `useHydratedCartCount` used with those exact names in Tasks 2–4; `PurchasedProduct.access_url` added in Task 5 and consumed in Task 6; `PurchaseEmailInput` shape matches between template, wrapper, and fulfillment call.
- **Out of scope respected:** no multi-creator checkout, no payment-link emails, no creator notification emails, no dashboard mini-cart, no `/discover` add-to-cart (discover product page keeps Buy Now only).
