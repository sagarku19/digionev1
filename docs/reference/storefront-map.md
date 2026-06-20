# Storefront Reference Map

> Last synced: 2026-06-20
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

Standalone pages: `app/(storefront)/upsells/[slug]/page.tsx`, `app/(storefront)/store/product/[productId]/page.tsx`.

**Access-control convention (2026-06-20):** storefront **layouts** check existence + `site_type` only (they can't read `searchParams`); the **page** enforces `is_active` and bypasses it when `?preview=1` is present, so the editors' preview iframes can render unpublished sites. Applies to `link`, `site`, `store`, `pay` (the `store` layout was already existence-only; the `link` and `pay` layouts were tightened to match).

## Link-in-bio block types

Renderer keys (`registry.tsx` → dispatched by `BlockRenderer`): `header`, `text`, `heading`, `divider`, `space`, `social_icons`, `html_embed`, `spotify`, `banner`, `image`, `video_embed`, `lead_form`, `email_capture` (legacy alias → `LeadFormBlock`), `product`, `url` (catch-all fallback for any link with a `url` value)

Editor registry keys (`blockEditors/registry.tsx`): `header`, `text`, `heading`, `space`, `url`, `product`, `video_embed`, `lead_form`, `image`, `html_embed`, `spotify`, `social_icons`, `banner`

Parity: Two gaps found.
1. **`divider`** — renderer handles it; editor registry has no `DividerBlock` and cannot create this block type.
2. **`email_capture`** — renderer accepts it as an alias of `lead_form` (same `LeadFormBlock`, same branch); editor registry lists only `lead_form`, so `email_capture` rows can exist in the DB (legacy data) but the editor will not create new ones.
3. **`product`** — editor registry has it; renderer dispatches it via `blockRenderers/ProductBlock.tsx`. Full parity ✓.

## Store section types

`SectionRenderer` cases (18): `hero_banner`, `featured_products`, `testimonials`, `faq_accordion`, `trust_badges`, `about_creator`, `product_grid`, `social_proof`, `countdown_timer`, `email_capture`, `announcement_bar`, `sticky_cta`, `video_showcase`, `image_gallery`, `rich_text`, `custom_html`, `product_comparison`, `pricing_table`

`section-defs.ts` registry (18): `hero_banner`, `featured_products`, `product_grid`, `testimonials`, `faq_accordion`, `email_capture`, `rich_text`, `custom_html`, `trust_badges`, `social_proof`, `countdown_timer`, `announcement_bar`, `sticky_cta`, `video_showcase`, `image_gallery`, `about_creator`, `product_comparison`, `pricing_table`

Parity: Full parity — all 18 types appear in both the renderer switch and the `SECTION_TYPES` registry. No drift.
