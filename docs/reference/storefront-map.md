# Storefront Reference Map

> Last synced: 2026-07-16
> Generated from: `app/(storefront)/**/page.tsx`, `src/components/storefront/**`, the block/section registries
> Regenerate / audit: `/sync-docs`
> Read this FIRST for any storefront task. Styling uses creator vars (`var(--creator-primary)`, `var(--creator-text)`, `var(--creator-bg)`, …) — NOT dashboard `--bg-*`/`--text-*` tokens.

## Site types

| Type | URL | Slug page (server) | Renderer | Type/section source |
|---|---|---|---|---|
| link-in-bio | `/link/[username]` | `app/(storefront)/link/[username]/page.tsx` (gates `is_active` with a `?preview=1` bypass) | `src/components/storefront/LinkInBioPage.tsx` | `src/components/storefront/linkinbio/blockRenderers/registry.tsx` (block list below) |
| single-page | `/site/[slug]` | `app/(storefront)/site/[slug]/page.tsx` (also fetches upsell products by id from `metadata.upsell_product_ids`; passes `isPreview`) | `src/components/storefront/ProductSalesPage.tsx` (fixed template; bottom `#checkout` section: login prompt + configurable name/email/phone fields + upsell list + Pay — visual, real purchase still routes via `/checkout`; listens for `sp-content-update`/`sp-scroll` postMessages from the editor) | inline sub-sections + `#checkout` |
| store | `/store/[slug]` | `app/(storefront)/store/[slug]/page.tsx` (gates `is_active` with a `?preview=1` bypass) | `src/components/storefront/SectionRenderer.tsx` | `section-defs.ts` (sections below) |
| payment | `/pay/[siteId]` | `app/(storefront)/pay/[siteId]/page.tsx` (reads `site_main.metadata` for `fixed_amount`/`is_flexible`/`product_id`; fetches the linked product; gates `is_active` with a `?preview=1` bypass; passes an explicit `isFlexible` to the renderer). Layout renders **no** store header/footer — just theme CSS + `PreviewBridge`. | `src/components/storefront/PaymentLinkPage.tsx` (takes `fixedAmount` + explicit `isFlexible` prop — a fixed ₹0 stays fixed; linked product card on top + name/email/phone + amount; live theme via layout `PreviewBridge`) | n/a |

The public **product page is `/discover/[productId]`** (`app/(marketing)/discover/[productId]/page.tsx`). Its only purchase action is **Add to cart** (→ `/cart` → `/checkout`); the old inline contact-form `BuyNowButton.tsx` was removed 2026-07-17. When a product has an external `product_link`, a secondary "Open external link" button is shown alongside (pending product decision — todo-later 14). The old `app/(storefront)/store/product/[productId]` route and the `upsells/[slug]` route were both removed (upsells to be rebuilt under `/pay`). Dashboard "Preview"/"View" buttons, the buyer library, and link-in-bio product blocks all link to `/discover/{id}`.

The **discover list page** (`app/(marketing)/discover/page.tsx`, redesigned 2026-07-17 Gumroad-style) is a **3-up** grid on web (1/2/3 cols): compact ledger header (no kicker) with inline search, a category **tab rail** driven by the shared taxonomy `src/lib/shared/product-categories.ts` (8 values — same list the dashboard editors write to `products.category`), and an honest sort select (Newest / Price low→high / high→low). The old fake "Trending" featured section, "Hot" badge, and no-op "popular" sort were removed (a real metrics pipeline is specced in todo-later 11). The card is the shared `src/components/marketing/DiscoverCard.tsx` — a bordered card, badge-free and **creator-anonymous**: 16:10 cover, title, 2-line description, price + "View →" row (Free renders vermilion). The detail page (`/discover/[productId]`) shows no creator identity either (no creator box, "More from this creator" rail is unnamed) and reuses `DiscoverCard` for its two 3-up rails. On `/discover*` `MarketingNav` switches to **discover mode**: the center nav rail is hidden and the cart icon is always visible (all users, even with an empty cart); the logo still links to `/`.

**Access-control convention (2026-06-20):** storefront **layouts** check existence + `site_type` only (they can't read `searchParams`); the **page** enforces `is_active` and bypasses it when `?preview=1` is present, so the editors' preview iframes can render unpublished sites. Applies to `link`, `site`, `store`, `pay` (the `store` layout was already existence-only; the `link` and `pay` layouts were tightened to match).

**Buyer auth on storefronts (2026-06-25):** `StorefrontHeader.tsx`'s "Log In" button opens the global centered buyer-auth modal (`src/components/auth/BuyerAuthModal.tsx`, mounted once via `BuyerAuthProvider` in `app/providers.tsx`, driven by the `useBuyerAuth` Zustand store) — no navigation away. When logged in it becomes a "My Library" link to `/account/library`. Buyer accounts are low-friction (no email verification); guest purchases are saved by email (`guest_entitlements`) and claimed on sign-in. See `.claude/rules/api-routes.md` → `/api/auth/buyer-signup`, `/api/account/claim-entitlements`.

**Cart on storefronts (2026-07-17 — drawer removed, checkout unified):** the mini-cart drawer (`CartDrawer.tsx`) was **deleted**; there is no slide-in cart anywhere. Adding to cart and every cart icon now **navigate to `/cart`**. `StorefrontHeader.tsx`'s cart icon (count via `useHydratedCartCount`) and `MarketingNav`'s cart icon both `router.push('/cart')`; `MarketingNav` shows its icon only when the cart has items — except on `/discover*`, where it is always visible. `AddToCartButton.tsx` (`src/components/store/`) adds the item then `router.push('/cart')` (cross-creator adds still show the replace-cart confirm mirroring the one-creator-per-order API rule; confirming also routes to `/cart`). The `useCart` store no longer has `isDrawerOpen`/`openDrawer`/`closeDrawer`. Add-to-cart lives on multi-product store sections (`ProductGrid`, `FeaturedProducts` via `SectionRenderer`, which passes `creatorId` down) and the discover product detail page, whose **only** purchase CTA is now a primary Add to cart. Product cards link to `/discover/{id}`.

**One-page checkout (2026-07-17):** `/cart` and `/checkout` (both in the `(buyer)` group under `CheckoutChrome`) are now **thin wrappers** over the shared `src/components/store/CheckoutExperience.tsx` — a self-contained two-column checkout: product line items + coupon + total on the **left**, buyer contact (auto-filled when logged in) + **Pay ₹X** (direct Cashfree via `/api/checkout/create`) on the **right**. Payment completes on this page — there is no cart→checkout hop. `/cart` serves the discover/store flow; `/checkout` serves the creator single-page sales site (`ProductSalesPage`'s "Buy Now" adds to the cart then routes to `/checkout`). `CheckoutChrome`'s step indicator is now Checkout → Access.

## Link-in-bio block types

Renderer keys (`registry.tsx` → dispatched by `BlockRenderer`): `header`, `text`, `heading`, `divider`, `space`, `social_icons`, `html_embed`, `spotify`, `banner`, `image`, `video_embed`, `lead_form`, `email_capture` (legacy alias → `LeadFormBlock`), `product`, `url` (catch-all fallback for any link with a `url` value)

Editor registry keys (`blockEditors/registry.tsx`): `header`, `text`, `heading`, `space`, `url`, `product`, `video_embed`, `lead_form`, `image`, `html_embed`, `spotify`, `social_icons`, `banner`

Parity: two gaps found (item 3 is a confirmed pairing, not a gap).
1. **`divider`** — renderer handles it; editor registry has no `DividerBlock` and cannot create this block type.
2. **`email_capture`** — renderer accepts it as an alias of `lead_form` (same `LeadFormBlock`, same branch); editor registry lists only `lead_form`, so `email_capture` rows can exist in the DB (legacy data) but the editor will not create new ones.
3. **`product`** — editor registry has it; renderer dispatches it via `blockRenderers/ProductBlock.tsx`. Full parity ✓.

## Store section types

`SectionRenderer` cases (18): `hero_banner`, `featured_products`, `testimonials`, `faq_accordion`, `trust_badges`, `about_creator`, `product_grid`, `social_proof`, `countdown_timer`, `email_capture`, `announcement_bar`, `sticky_cta`, `video_showcase`, `image_gallery`, `rich_text`, `custom_html`, `product_comparison`, `pricing_table`

`section-defs.ts` registry (18): `hero_banner`, `featured_products`, `product_grid`, `testimonials`, `faq_accordion`, `email_capture`, `rich_text`, `custom_html`, `trust_badges`, `social_proof`, `countdown_timer`, `announcement_bar`, `sticky_cta`, `video_showcase`, `image_gallery`, `about_creator`, `product_comparison`, `pricing_table`

Parity: Full parity — all 18 types appear in both the renderer switch and the `SECTION_TYPES` registry. No drift.
