# Storefront Reference Map

> Last synced: 2026-06-14
> Generated from: `app/(storefront)/**/page.tsx`, `src/components/storefront/**`, the block/section registries
> Regenerate / audit: `/sync-docs`
> Read this FIRST for any storefront task. Styling uses creator vars (`var(--creator-primary)`, `var(--creator-text)`, `var(--creator-bg)`, …) — NOT dashboard `--bg-*`/`--text-*` tokens.

## Site types

| Type | URL | Slug page (server) | Renderer | Type/section source |
|---|---|---|---|---|
| link-in-bio | `/link/[username]` | `app/(storefront)/link/[username]/page.tsx` | `src/components/storefront/LinkInBioPage.tsx` | inline `link_type` branches (block list below) |
| single-page | `/site/[slug]` | `app/(storefront)/site/[slug]/page.tsx` | `src/components/storefront/ProductSalesPage.tsx` (fixed template) | inline sub-sections |
| store | `/store/[slug]` | `app/(storefront)/store/[slug]/page.tsx` | `src/components/storefront/SectionRenderer.tsx` | `section-defs.ts` (sections below) |
| payment | `/pay/[siteId]` | `app/(storefront)/pay/[siteId]/page.tsx` | `src/components/storefront/PaymentLinkPage.tsx` | n/a |

Standalone pages: `app/(storefront)/upsells/[slug]/page.tsx`, `app/(storefront)/store/product/[productId]/page.tsx`.

## Link-in-bio block types

Renderer branches (`LinkInBioPage.tsx`): `header`, `text`, `heading`, `divider`, `space`, `social_icons`, `html_embed`, `spotify`, `banner`, `image`, `video_embed`, `lead_form`, `email_capture` (alias branch, shares `LeadFormBlock`), `url` (catch-all fallback for any link with a `url` value)

Editor registry keys (`blockEditors/registry.tsx`): `header`, `text`, `heading`, `space`, `url`, `product`, `video_embed`, `lead_form`, `image`, `html_embed`, `spotify`, `social_icons`, `banner`

Parity: Two gaps found.
1. **`divider`** — renderer handles it; editor registry has no `DividerBlock` and cannot create this block type.
2. **`email_capture`** — renderer accepts it as an alias of `lead_form` (same `LeadFormBlock`, same branch); editor registry lists only `lead_form`, so `email_capture` rows can exist in the DB (legacy data) but the editor will not create new ones.
3. **`product`** — editor registry has it; renderer handles it inline in the `link_type === 'product'` branch. Full parity ✓.

## Store section types

`SectionRenderer` cases (18): `hero_banner`, `featured_products`, `testimonials`, `faq_accordion`, `trust_badges`, `about_creator`, `product_grid`, `social_proof`, `countdown_timer`, `email_capture`, `announcement_bar`, `sticky_cta`, `video_showcase`, `image_gallery`, `rich_text`, `custom_html`, `product_comparison`, `pricing_table`

`section-defs.ts` registry (18): `hero_banner`, `featured_products`, `product_grid`, `testimonials`, `faq_accordion`, `email_capture`, `rich_text`, `custom_html`, `trust_badges`, `social_proof`, `countdown_timer`, `announcement_bar`, `sticky_cta`, `video_showcase`, `image_gallery`, `about_creator`, `product_comparison`, `pricing_table`

Parity: Full parity — all 18 types appear in both the renderer switch and the `SECTION_TYPES` registry. No drift.
