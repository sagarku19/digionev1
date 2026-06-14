---
noteId: "a0523a10680311f19aeeff0b58723b31"
tags: []

---

# Storefront Type + Structure Refactor — Design

**Date:** 2026-06-14
**Status:** Design (awaiting user review)
**Author:** Claude + sagarkushwaha5599@gmail.com
**Agent role:** Storefront Agent (owns `app/(storefront)/`, `src/components/storefront/`)
**Companion to:** `2026-06-14-docs-system-and-reference-maps-design.md` (the docs system; this refactor is its first real consumer — `/sync-docs` refreshes `docs/reference/storefront-map.md` after this lands)

---

## Problem

The storefront surfaces carry the production-readiness debt the dashboard already shed: gratuitous `any` over already-typed data, and one 967-line renderer (`LinkInBioPage.tsx`) holding ~35 inline `link_type` branches in a single function. This is hard to read, hard to extend, and obscures the editor↔renderer contract.

Current state (measured 2026-06-14):

| Surface | File | `any` | Note |
|---|---|---|---|
| link-in-bio page | `app/(storefront)/link/[username]/page.tsx` | 22 | all tables ARE in generated types → casts are gratuitous |
| single-page | `app/(storefront)/site/[slug]/page.tsx` | 2 | |
| store | `app/(storefront)/store/[slug]/page.tsx` | 4 | |
| upsells | `app/(storefront)/upsells/[slug]/page.tsx` | 5 | |
| payment | `app/(storefront)/pay/[siteId]/page.tsx` | 0 | confirm-only |
| link-in-bio renderer | `src/components/storefront/LinkInBioPage.tsx` | 9 | 967 L, ~35 inline branches |
| single-page renderer | `src/components/storefront/ProductSalesPage.tsx` | 36 | 586 L, fixed template |
| store renderer | `src/components/storefront/SectionRenderer.tsx` | 2 | already a registry; `products?: any[]`, `siteMain?: any` |
| payment renderer | `src/components/storefront/PaymentLinkPage.tsx` | 1 | |

**Goal:** zero gratuitous `any`, and a link-in-bio renderer that is layout + dispatch over a per-block-type registry mirroring the editor — **with byte-identical rendered output**.

---

## Constraints & principles

- **Behavior- and visually-identical.** Every extracted renderer keeps verbatim JSX, same props/data, same guards. This is a structure/type change, not a redesign. No visual diff.
- **Creator variables only.** Storefront styling uses `var(--creator-primary)`, `var(--creator-text)`, `var(--creator-bg)`, etc. — NOT dashboard `--bg-*`/`--text-*` tokens. `dashboard-design.md` does not apply here.
- **TypeScript strict, zero `any`** without a documented one-line reason. The only legitimate casts are narrowing `jsonb` (`Json`-typed) columns to a small local interface at the data boundary.
- **lucide-react only.** No other icon set.
- **No `useEffect` for data fetching.** The existing `postMessage` live-preview effects and click-tracking effects are not data fetching — keep them as-is.
- **Verify per file:** `npx tsc --noEmit` + `npm run lint` after each file; manual click-through of each storefront URL in light context.
- **Mirror the editor.** The block-renderer folder + registry structure mirrors `src/components/dashboard/site-edit/tabs/linkinbio/blockEditors/` exactly (`_shared`, one file per type, `registry`).

---

## Scope — four parts (A→D)

### A. Slug-page type cleanup (pure types, no behavior change)

Remove gratuitous `: any` / `as any` over already-typed data in the five slug pages. Pattern:

- **Table queries:** drop `.from('linkinbio_pages' as any)` etc. — all eight storefront tables (`sites`, `linkinbio_pages`, `linkinbio_blocks`, `linkinbio_items`, `site_singlepage`, `site_main`, `site_design_tokens`, `products`) are in `types/database.types.ts`, so the typed client yields `Row` types directly. Drop `page as any`, `b as any`, `item as any`, etc.
- **`jsonb` columns** (`theme`, `layout`, `settings`, `content`, `style`, `metadata`, `seo`, `color_palette`) are typed `Json` (a recursive union). Narrow each **once** at the boundary to a small local interface with a one-line `// reason:` comment — e.g. `const theme = (pageData.theme ?? {}) as LinkinbioTheme;`. This replaces ~20 scattered `any` with a few typed seams.
- The page maps DB rows into the renderer's flat `BioLink` / `BioData` shapes (already declared in `LinkInBioPage.tsx`). Export those types from a shared module (see B) so the page imports them instead of casting `bio as any` at the `<LinkInBioPage>` call site.
- `pay/[siteId]/page.tsx` (0 `any`) — confirm only.

**Files:** the five `app/(storefront)/**/page.tsx` listed above.

### B. Link-in-bio renderer split (the structural change)

Split `LinkInBioPage.tsx`'s inline branch chain into one component per block type, mirroring `blockEditors/`.

**New folder `src/components/storefront/linkinbio/blockRenderers/`:**

| File | Renders `link_type` |
|---|---|
| `_shared.tsx` | shared types (`BioLink`, `BioData`, `BlockRendererProps`) + shared helpers: `trackClick`, `SOCIAL_ICONS`, `getRadiusClass`, `getButtonClasses`, `getAnimationStyle`, `getCardStyle` |
| `HeaderBlock.tsx` | `header` |
| `TextBlock.tsx` | `text` |
| `HeadingBlock.tsx` | `heading` |
| `DividerBlock.tsx` | `divider` |
| `SpaceBlock.tsx` | `space` |
| `SocialIconsBlock.tsx` | `social_icons` |
| `HtmlEmbedBlock.tsx` | `html_embed` |
| `SpotifyBlock.tsx` | `spotify` |
| `BannerBlock.tsx` | `banner` |
| `ImageBlock.tsx` | `image` |
| `VideoBlock.tsx` | `video_embed` |
| `LeadFormBlock.tsx` | `lead_form` (+ `email_capture` alias) — the existing stateful sub-component moves here verbatim |
| `ProductBlock.tsx` | `product` (all three layouts: horizontal/vertical/split) |
| `UrlBlock.tsx` | `url` + the catch-all fallback |
| `registry.tsx` | `link_type → component` map + `BlockRenderer` dispatch |

**Registry & dispatch** (mirrors `blockEditors/registry.tsx`):

```
BLOCK_RENDERERS: Record<string, ComponentType<BlockRendererProps>> = {
  header, text, heading, divider, space, social_icons, html_embed,
  spotify, banner, image, video_embed,
  lead_form: LeadFormBlock, email_capture: LeadFormBlock,
  product, url,
}
```

`BlockRenderer` computes `animStyle`/`cardSt` once (as `LinkCard` does today), looks up `BLOCK_RENDERERS[link.link_type]`, falls back to `UrlBlock` when the type is unknown **and** `link.url` is present, else renders nothing. Each block component **self-guards** (returns `null` when its required content is missing — e.g. `ImageBlock` returns null without `thumbnail_url`), preserving today's content guards.

**`LinkInBioPage.tsx` keeps** (it becomes layout + dispatch): the `Props`, the `postMessage` live-preview effect, page-view tracking effect, `handleShare`, background/font/cssVars computation, `FontLink`, `getFontClass`, `getSpacingClass`, `AnimationStyles`, `ProfileSection`, and the two-column layout that maps `activeLinks` through `<BlockRenderer>`. Target: well under ~300 lines.

**One documented behavior note:** today's if-chain lets a *content-missing* `image`/`video_embed`/`spotify`/`html_embed` block that also carries a top-level `link.url` fall through to the URL renderer. Under the registry those types resolve to their own (self-nulling) component, not the URL fallback. The editor never produces those block types with a populated `link.url`, so this path is unreachable in real data — documented here so a reviewer doesn't read it as a regression.

### C. Single-page renderer cleanup (`ProductSalesPage.tsx`)

`ProductSalesPage` is a **fixed template**, not a dynamic block list — so it does **not** get a registry. The pass here is:

- Remove the 36 gratuitous `any`: type `singlePage` from `site_singlepage` Row + joined `products`, type `palette` as `Record<string, string>`, and replace the `liveContent`/`liveAppearance`/`livePalette` `any` state with small local interfaces narrowed from the `postMessage` payload (one documented seam).
- Extract the large inline template regions (hero, trust badges, feature grid, testimonials, FAQ, countdown, CTA) into co-located sub-components — either at the bottom of the file or a sibling `src/components/storefront/singlepage/` folder if the file stays large. Verbatim JSX, same props.
- Keep the live-preview `postMessage` effect.

### D. Store + payment typing

- `SectionRenderer.tsx`: replace `products?: any[]` and `siteMain?: any` with typed shapes — `products` from the `products` Row type (the subset actually read by sections), `siteMain` from `site_main` Row. Keep the `switch`; it is already the registry. Leave the `console.warn` default case as-is (out of scope to change behavior).
- `PaymentLinkPage.tsx`: clear the single `any`.

---

## Parity cross-check (read-only — do not edit the editor)

Already established by `docs/reference/storefront-map.md`:
- Editor registry produces 13 types; renderer additionally handles `divider` and `email_capture` (alias of `lead_form`).
- After the split, re-confirm `blockRenderers/registry.tsx` keys ⊇ `blockEditors/registry.tsx` keys, and that the only renderer-only keys remain `divider` + `email_capture`. Record the result; do not "fix" the gap in this refactor (that's a product decision).

---

## Out of scope / Don't touch

- The **editor side** (`blockEditors/**`, `BioLinksEditor.tsx`, `site-edit/tabs/**`) — read-only for the parity check.
- `app/api/**`, `src/hooks/**`, `types/database.types.ts`, all dashboard files.
- `app/(storefront)/store/product/[productId]/page.tsx` (already `any`-free).
- No new packages. No design changes. No `useEffect` data fetching introduced.
- Do **not** resolve the `divider`/`email_capture` parity gap or the `/dashboard/media` `uploads`-bucket issue here.

---

## Verification

- After **each** file: `npx tsc --noEmit` + `npm run lint` → clean.
- Residual `any` grep on touched files → only documented `// reason:` seams remain.
- Manual click-through, output identical to pre-refactor: `/link/[username]` (every block type), `/site/[slug]`, `/store/[slug]`, `/pay/[siteId]`, `/upsells/[slug]`.
- Live-preview still works: edit in the dashboard editor, confirm the `postMessage` updates still flow to each renderer.
- After merge: run `/sync-docs` → check 7 refreshes the storefront-map link-in-bio row to point at `blockRenderers/registry.tsx` and re-verifies parity.

## Risks / tradeoffs

- **Behavior drift during extraction** — the dominant risk. Mitigated by verbatim JSX, self-guarding components, per-file tsc/lint, and the documented unreachable-fallthrough note.
- **Shared-helper coupling** — moving helpers to `_shared.tsx` must keep identical signatures; the block components and `LinkInBioPage` both import from it.
- **`jsonb` narrowing interfaces** could drift from real data — keep them minimal (only the fields actually read) and co-located.
- **Churn overlap** — the user has ongoing edits in slug pages/editors. This refactor should land as a focused change-set; the Stop hook will nudge the storefront-map update on completion.

## Success criteria

- Zero gratuitous `any` across the nine files; only minimal documented `jsonb`/postMessage seams remain.
- `LinkInBioPage.tsx` is layout + dispatch (well under ~300 lines); each block type is an independently readable file mirroring its editor counterpart.
- `npx tsc --noEmit` + `npm run lint` clean; every storefront URL renders identically to before.
- `/sync-docs` reports the storefront map in sync (with the known, intentional `divider`/`email_capture` renderer-only entries).
