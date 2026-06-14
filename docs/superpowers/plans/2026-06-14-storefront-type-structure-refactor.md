---
noteId: "5c56db30680411f19aeeff0b58723b31"
tags: []

---

# Storefront Type + Structure Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all gratuitous `any` from the 5 storefront slug pages + 4 renderers, and split the 967-line `LinkInBioPage.tsx` into a per-block-type registry mirroring the editor — behavior- and visually-identical.

**Architecture:** New `src/components/storefront/linkinbio/blockRenderers/` (one file per block type + `_shared.tsx` + `registry.tsx`) mirrors `src/components/dashboard/site-edit/tabs/linkinbio/blockEditors/`. `LinkInBioPage` becomes layout + dispatch. Slug pages get typed against `database.types.ts` Row types with minimal documented `jsonb` narrowing seams. `ProductSalesPage` (fixed template) is typed + decomposed but gets NO registry.

**Tech Stack:** Next.js 16 App Router, TypeScript 5 strict, Tailwind v4 (creator CSS vars), lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-14-storefront-type-structure-refactor-design.md`

**Verification model:** This repo has no test runner. "Tests" for every task = `npx tsc --noEmit` clean + `npm run lint` clean + a residual-`any` grep on touched files + visual parity (rendered output must not change).

---

## Source line map (from current `src/components/storefront/LinkInBioPage.tsx`, 967 L)

| Region | Lines | Destination |
|---|---|---|
| `SocialLink`, `BioData`, `BioLink` types | 14–49 | `_shared.tsx` (export) |
| `Props` type | 51–58 | stays in `LinkInBioPage.tsx` |
| `SOCIAL_ICONS` | 61–65 | `_shared.tsx` |
| `getFontClass` | 68–77 | stays |
| `FontLink` | 80–92 | stays |
| `getRadiusClass` | 95–103 | `_shared.tsx` |
| `getSpacingClass` | 106–112 | stays |
| `getAnimationStyle` | 115–123 | `_shared.tsx` |
| `getCardStyle` | 126–137 | `_shared.tsx` |
| `getButtonClasses` | 140–155 | `_shared.tsx` |
| `LeadFormBlock` (stateful) | 158–291 | `blockRenderers/LeadFormBlock.tsx` |
| `trackClick` | 294–303 | `_shared.tsx` |
| `ProfileSection` | 306–377 | stays (imports `SOCIAL_ICONS` from `_shared`) |
| `LinkCard` → `header` branch | 394–416 | `HeaderBlock.tsx` |
| `LinkCard` → `text` branch | 419–430 | `TextBlock.tsx` |
| `LinkCard` → `heading` branch | 433–448 | `HeadingBlock.tsx` |
| `LinkCard` → `divider` branch | 451–453 | `DividerBlock.tsx` |
| `LinkCard` → `space` branch | 456–460 | `SpaceBlock.tsx` |
| `LinkCard` → `social_icons` branch | 463–490 | `SocialIconsBlock.tsx` |
| `LinkCard` → `html_embed` branch | 493–502 | `HtmlEmbedBlock.tsx` |
| `LinkCard` → `spotify` branch | 505–522 | `SpotifyBlock.tsx` |
| `LinkCard` → `banner` branch | 525–543 | `BannerBlock.tsx` |
| `LinkCard` → `image` branch | 546–569 | `ImageBlock.tsx` |
| `LinkCard` → `video_embed` branch | 572–589 | `VideoBlock.tsx` |
| `LinkCard` → `lead_form`/`email_capture` | 592–594 | dispatched to `LeadFormBlock.tsx` |
| `LinkCard` → `product` branch (3 layouts) | 597–774 | `ProductBlock.tsx` |
| `LinkCard` → `url`/fallback branch | 777–819 | `UrlBlock.tsx` |
| `AnimationStyles` | 825–842 | stays |
| main `LinkInBioPage` | 845–967 | stays; `LinkCard` call (939–948) → `<BlockRenderer>` |

> Re-read the file before extracting — line numbers may shift if the user edits it. Match by branch content, not by line number alone.

---

## Task 1: `_shared.tsx` — shared types + helpers

**Files:**
- Create: `src/components/storefront/linkinbio/blockRenderers/_shared.tsx`
- Modify: `src/components/storefront/LinkInBioPage.tsx`

- [ ] **Step 1: Create `_shared.tsx`**

Move the types (14–49), `SOCIAL_ICONS` (61–65), `getRadiusClass` (95–103), `getAnimationStyle` (115–123), `getCardStyle` (126–137), `getButtonClasses` (140–155), and `trackClick` (294–303) **verbatim** into the new file, and add the shared props type + a `ProductLite` type. The file:

```tsx
import React from 'react';
import {
  Instagram, Twitter, Youtube, Linkedin, Github, Globe, Music, Music2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────
export type SocialLink = { platform: string; url: string; is_visible?: boolean };

export type BioData = {
  display_name: string;
  bio_text: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  layout_style: string;
  button_style: string;
  background_type: string;
  background_value: string | null;
  social_links: SocialLink[] | null;
  show_watermark: boolean;
  show_share_button: boolean;
  font_family?: string;
  card_style?: string;
  animation?: string;
  border_radius?: string;
  spacing?: string;
  avatar_shape?: 'circular' | 'rounded' | 'square';
  avatar_border?: boolean;
};

// reason: link.metadata is heterogeneous per-block jsonb; a precise union is out of scope for this refactor
export type BioLink = {
  id: string;
  link_type: string;
  title: string | null;
  description: string | null;
  url: string | null;
  thumbnail_url: string | null;
  product_id: string | null;
  icon_type: string | null;
  style_variant: string;
  metadata: Record<string, unknown> & Record<string, any>;
};

export type ProductLite = { id: string; name: string; price: number; thumbnail_url: string | null; is_published: boolean };

export type BlockRendererProps = {
  link: BioLink;
  bio: BioData;
  palette: Record<string, string>;
  productsMap: Record<string, ProductLite>;
  siteId: string;
  index: number;
  animStyle: React.CSSProperties;
  cardSt: React.CSSProperties;
};

// ─── Social icon map ─────────────────────────────────────────
export const SOCIAL_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram, twitter: Twitter, youtube: Youtube,
  linkedin: Linkedin, github: Github, tiktok: Music,
  website: Globe, spotify: Music2,
};

// ─── Border radius / animation / card / button helpers (verbatim) ───
export function getRadiusClass(r?: string): string {
  switch (r) {
    case 'none': return 'rounded-none';
    case 'sm': return 'rounded-md';
    case 'lg': return 'rounded-2xl';
    case 'full': return 'rounded-full';
    default: return 'rounded-xl';
  }
}

export function getAnimationStyle(anim?: string, index?: number): React.CSSProperties {
  const delay = `${(index ?? 0) * 60}ms`;
  switch (anim) {
    case 'fade-in': return { opacity: 0, animation: `bioFadeIn 0.4s ease-out ${delay} forwards` };
    case 'slide-up': return { opacity: 0, transform: 'translateY(12px)', animation: `bioSlideUp 0.4s ease-out ${delay} forwards` };
    case 'scale': return { opacity: 0, transform: 'scale(0.95)', animation: `bioScale 0.3s ease-out ${delay} forwards` };
    default: return {};
  }
}

export function getCardStyle(style?: string, palette?: Record<string, string>): React.CSSProperties {
  switch (style) {
    case 'glass': return {
      backgroundColor: `${palette?.surface || '#FFFFFF'}40`,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    };
    case 'transparent': return { backgroundColor: 'transparent' };
    case 'bordered': return { backgroundColor: 'transparent', border: `2px solid ${palette?.text || '#000'}15` };
    default: return { backgroundColor: palette?.surface || '#FFFFFF' };
  }
}

export function getButtonClasses(style: string, radius?: string): string {
  const r = getRadiusClass(radius);
  const base = `w-full flex items-center gap-3 px-5 py-3.5 transition-all duration-200 text-left ${r}`;
  switch (style) {
    case 'pill':
      return `${base} !rounded-full border-2 border-[--creator-text]/10 hover:border-[--creator-primary] hover:shadow-lg`;
    case 'sharp':
      return `${base} !rounded-none border-2 border-[--creator-text]/10 hover:border-[--creator-primary] hover:shadow-lg`;
    case 'outline':
      return `${base} border-2 border-[--creator-primary]/30 hover:border-[--creator-primary] hover:bg-[--creator-primary]/5`;
    case 'shadow':
      return `${base} border border-[--creator-text]/5 shadow-md hover:shadow-xl hover:translate-y-[-1px]`;
    default:
      return `${base} border-2 border-[--creator-text]/10 hover:border-[--creator-primary] hover:shadow-lg`;
  }
}

// ─── Click tracking (verbatim) ───────────────────────────────
export function trackClick(siteId: string, linkId: string, eventType: string) {
  try {
    const body = JSON.stringify({ site_id: siteId, link_id: linkId, event_type: eventType });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/linkinbio/track', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/linkinbio/track', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
    }
  } catch { /* silent */ }
}
```

- [ ] **Step 2: Update `LinkInBioPage.tsx` to import from `_shared`**

Delete the moved definitions (types 14–49, `SOCIAL_ICONS` 61–65, `getRadiusClass` 95–103, `getAnimationStyle` 115–123, `getCardStyle` 126–137, `getButtonClasses` 140–155, `trackClick` 294–303) from `LinkInBioPage.tsx`. Add at the top:

```tsx
import {
  type BioData, type BioLink, type SocialLink, type ProductLite,
  SOCIAL_ICONS, getRadiusClass, getAnimationStyle, getCardStyle, getButtonClasses, trackClick,
} from './linkinbio/blockRenderers/_shared';
```

Remove now-unused lucide imports from `LinkInBioPage.tsx` that were only used by the moved helpers (keep the ones still used by `ProfileSection`/`LinkCard`/icon-type switch — `Instagram, Twitter, Youtube, Linkedin, Github, Globe, Music, ExternalLink, Share2, Package, Play, Music2`). Let `npm run lint` tell you which are now unused.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run lint`
Expected: no errors (fix any unused-import warnings on `LinkInBioPage.tsx`).

- [ ] **Step 4: Commit**

```bash
git add src/components/storefront/linkinbio/blockRenderers/_shared.tsx src/components/storefront/LinkInBioPage.tsx
git commit -m "refactor(storefront): extract link-in-bio shared types + helpers"
```

---

## Task 2: Display block renderers (9 components)

**Files (all new):**
- `src/components/storefront/linkinbio/blockRenderers/HeaderBlock.tsx`
- `.../TextBlock.tsx`, `.../HeadingBlock.tsx`, `.../DividerBlock.tsx`, `.../SpaceBlock.tsx`, `.../SocialIconsBlock.tsx`, `.../HtmlEmbedBlock.tsx`, `.../SpotifyBlock.tsx`, `.../BannerBlock.tsx`

These are not yet wired (Task 5 wires them) — they only need to compile.

- [ ] **Step 1: Create each component using this exact pattern (worked example: `HeaderBlock.tsx`)**

Each file exports a default component of type `BlockRendererProps` and contains the **verbatim JSX** from the corresponding `LinkCard` branch (the body inside the `if (link.link_type === '...') { return (...) }`), with the branch's local consts kept. Worked example for `header` (current lines 394–416):

```tsx
import React from 'react';
import type { BlockRendererProps } from './_shared';

export default function HeaderBlock({ link, palette, animStyle }: BlockRendererProps) {
  const align = link.metadata?.alignment || 'center';
  const sizeMap: Record<string, string> = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl', '2xl': 'text-2xl' };
  const sizeClass = sizeMap[link.metadata?.size || 'xl'] || 'text-xl';
  return (
    <div className="w-full col-span-2" style={{ textAlign: align as any, ...animStyle }}>
      <h2 className={`${sizeClass} font-bold`} style={{ color: palette.text || '#0F172A' }}>{link.title}</h2>
      {link.metadata?.subtitle && (
        <p className="text-sm mt-1" style={{ color: palette.muted || '#64748B' }}>{link.metadata.subtitle}</p>
      )}
      {link.metadata?.show_divider && (
        <div className="mt-3 mx-auto" style={{
          width: align === 'center' ? '48px' : '48px',
          height: '3px',
          borderRadius: '9999px',
          backgroundColor: palette.primary || '#EC4899',
          marginLeft: align === 'left' ? 0 : align === 'right' ? 'auto' : 'auto',
          marginRight: align === 'right' ? 0 : align === 'left' ? 'auto' : 'auto',
        }} />
      )}
    </div>
  );
}
```

Repeat for the other 8, copying each branch's body verbatim. Notes per component:
- `TextBlock` (419–430), `HeadingBlock` (433–448): destructure `{ link, palette, animStyle }`.
- `DividerBlock` (451–453): destructure `{ palette, animStyle }`; returns the single `<hr>`.
- `SpaceBlock` (456–460): destructure `{ link }`; returns the spacer `<div>` (no animStyle in original).
- `SocialIconsBlock` (463–490): destructure `{ link, palette, animStyle }`; **import `SOCIAL_ICONS` and `Globe`** — the branch uses `SOCIAL_ICONS[s.platform] || Globe`. Add `import { Globe } from 'lucide-react'` and `import { SOCIAL_ICONS } from './_shared'`.
- `HtmlEmbedBlock` (493–502): destructure `{ link, animStyle }`; **self-guard** — return `null` if `!link.metadata?.html` (the original branch condition was `link.link_type === 'html_embed' && link.metadata?.html`).
- `SpotifyBlock` (505–522): destructure `{ link, animStyle }`; **self-guard** — return `null` if `!link.metadata?.spotify_url`.
- `BannerBlock` (525–543): destructure `{ link, bio, palette, siteId, animStyle }`; uses `getRadiusClass` (import from `_shared`) and `trackClick` (import from `_shared`).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` → no errors.
Run: `npm run lint` → no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/storefront/linkinbio/blockRenderers/HeaderBlock.tsx src/components/storefront/linkinbio/blockRenderers/TextBlock.tsx src/components/storefront/linkinbio/blockRenderers/HeadingBlock.tsx src/components/storefront/linkinbio/blockRenderers/DividerBlock.tsx src/components/storefront/linkinbio/blockRenderers/SpaceBlock.tsx src/components/storefront/linkinbio/blockRenderers/SocialIconsBlock.tsx src/components/storefront/linkinbio/blockRenderers/HtmlEmbedBlock.tsx src/components/storefront/linkinbio/blockRenderers/SpotifyBlock.tsx src/components/storefront/linkinbio/blockRenderers/BannerBlock.tsx
git commit -m "refactor(storefront): extract link-in-bio display block renderers"
```

---

## Task 3: Media + interactive block renderers (5 components)

**Files (all new):**
- `.../ImageBlock.tsx` (546–569), `.../VideoBlock.tsx` (572–589), `.../LeadFormBlock.tsx` (158–291), `.../ProductBlock.tsx` (597–774), `.../UrlBlock.tsx` (777–819)

- [ ] **Step 1: `ImageBlock.tsx` + `VideoBlock.tsx`**

Verbatim from branches. Both **self-guard**: `ImageBlock` returns `null` if `!link.thumbnail_url`; `VideoBlock` returns `null` if `!link.metadata?.embed_url`. Destructure `{ link, palette, siteId, animStyle }` (ImageBlock uses `trackClick` when `link.metadata?.link_url` — import from `_shared`). `VideoBlock` destructures `{ link, palette, animStyle }`.

- [ ] **Step 2: `LeadFormBlock.tsx`**

Move the existing stateful `LeadFormBlock` (158–291) verbatim. Change its signature to accept `BlockRendererProps` (`{ link, bio, palette, siteId, animStyle }`) and import `getRadiusClass` from `_shared` instead of receiving it as a prop. Keep `'use client'` at the top of the file (it uses `useState`). Keep all validation/submit logic identical.

- [ ] **Step 3: `ProductBlock.tsx`**

Move the entire `product` branch (597–774) verbatim, including the inner `PriceBlock` component and all three layouts (vertical/split/horizontal). Destructure `{ link, bio, palette, productsMap, siteId, animStyle, cardSt }`. **Self-guard**: keep the original early return — `const product = link.product_id ? productsMap[link.product_id] : null; if (!product && !link.title && !link.thumbnail_url) return null;`. Import `getRadiusClass`, `getButtonClasses`, `trackClick` from `_shared`; import `Package` from lucide-react.

- [ ] **Step 4: `UrlBlock.tsx`**

Move the `url`/fallback branch (777–819) verbatim. Destructure `{ link, bio, palette, siteId, animStyle, cardSt }`. Import the icon-type lucide icons it uses (`ExternalLink, Play, Instagram, Twitter, Music2, Music, Github, Linkedin`) and `getButtonClasses`, `trackClick` from `_shared`. No self-guard needed (it is the fallback).

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` → no errors.
Run: `npm run lint` → no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/storefront/linkinbio/blockRenderers/ImageBlock.tsx src/components/storefront/linkinbio/blockRenderers/VideoBlock.tsx src/components/storefront/linkinbio/blockRenderers/LeadFormBlock.tsx src/components/storefront/linkinbio/blockRenderers/ProductBlock.tsx src/components/storefront/linkinbio/blockRenderers/UrlBlock.tsx
git commit -m "refactor(storefront): extract link-in-bio media + interactive block renderers"
```

---

## Task 4: `registry.tsx` — map + dispatch

**Files:**
- Create: `src/components/storefront/linkinbio/blockRenderers/registry.tsx`

- [ ] **Step 1: Create the registry + dispatch**

```tsx
// link_type -> block renderer. Mirrors blockEditors/registry.tsx.
import React from 'react';
import type { BlockRendererProps, BioLink, BioData, ProductLite } from './_shared';
import { getAnimationStyle, getCardStyle } from './_shared';
import HeaderBlock from './HeaderBlock';
import TextBlock from './TextBlock';
import HeadingBlock from './HeadingBlock';
import DividerBlock from './DividerBlock';
import SpaceBlock from './SpaceBlock';
import SocialIconsBlock from './SocialIconsBlock';
import HtmlEmbedBlock from './HtmlEmbedBlock';
import SpotifyBlock from './SpotifyBlock';
import BannerBlock from './BannerBlock';
import ImageBlock from './ImageBlock';
import VideoBlock from './VideoBlock';
import LeadFormBlock from './LeadFormBlock';
import ProductBlock from './ProductBlock';
import UrlBlock from './UrlBlock';

export const BLOCK_RENDERERS: Record<string, React.ComponentType<BlockRendererProps>> = {
  header: HeaderBlock,
  text: TextBlock,
  heading: HeadingBlock,
  divider: DividerBlock,
  space: SpaceBlock,
  social_icons: SocialIconsBlock,
  html_embed: HtmlEmbedBlock,
  spotify: SpotifyBlock,
  banner: BannerBlock,
  image: ImageBlock,
  video_embed: VideoBlock,
  lead_form: LeadFormBlock,
  email_capture: LeadFormBlock, // legacy alias
  product: ProductBlock,
  url: UrlBlock,
};

export function BlockRenderer({
  link, bio, palette, productsMap, siteId, index,
}: {
  link: BioLink;
  bio: BioData;
  palette: Record<string, string>;
  productsMap: Record<string, ProductLite>;
  siteId: string;
  index: number;
}) {
  const animStyle = getAnimationStyle(bio.animation, index);
  const cardSt = getCardStyle(bio.card_style, palette);
  const Comp = BLOCK_RENDERERS[link.link_type] ?? (link.url ? UrlBlock : null);
  if (!Comp) return null;
  return <Comp link={link} bio={bio} palette={palette} productsMap={productsMap} siteId={siteId} index={index} animStyle={animStyle} cardSt={cardSt} />;
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` → no errors.
Run: `npm run lint` → no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/storefront/linkinbio/blockRenderers/registry.tsx
git commit -m "refactor(storefront): add link-in-bio block renderer registry + dispatch"
```

---

## Task 5: Rewire `LinkInBioPage.tsx` to dispatch + delete inline branches

**Files:**
- Modify: `src/components/storefront/LinkInBioPage.tsx`
- Modify: `docs/reference/storefront-map.md` (the Stop hook requires this when the renderer structure changes)

- [ ] **Step 1: Delete `LinkCard` and the in-file `LeadFormBlock`**

Delete the entire `LinkCard` function (now lines ~380–822 region) and the in-file `LeadFormBlock` (already moved in Task 3 — delete the original 158–291 copy). Keep `ProfileSection`, `FontLink`, `getFontClass`, `getSpacingClass`, `AnimationStyles`, and the main component.

- [ ] **Step 2: Import + use `BlockRenderer`**

Add: `import { BlockRenderer } from './linkinbio/blockRenderers/registry';`
In the main component's links map (current 939–948), replace `<LinkCard ... />` with:

```tsx
{activeLinks.map((link, i) => (
  <BlockRenderer
    key={link.id}
    link={link}
    bio={activeBio}
    palette={activePalette}
    productsMap={activeProductsMap}
    siteId={siteId}
    index={i}
  />
))}
```

Remove any lucide imports from `LinkInBioPage.tsx` that are now unused (only `ProfileSection`'s icons + any used by the main component remain — let lint tell you). The `Props.productsMap` type and the `liveProductsMap` state may stay typed as `Record<string, ProductLite>` (import `ProductLite` from `_shared`); keep `productsMap: Record<string, any>` only if narrowing causes friction — prefer `ProductLite`.

- [ ] **Step 3: Verify (compile + parity + visual)**

Run: `npx tsc --noEmit` → no errors.
Run: `npm run lint` → no errors.
Run: `grep -nE ":\s*any|as any" src/components/storefront/LinkInBioPage.tsx` → only the `textAlign: align as any` style casts inside any remaining JSX (there should be none left in this file after extraction) and any documented seam; investigate anything else.
Parity recheck (read-only): confirm `BLOCK_RENDERERS` keys ⊇ `blockEditors/registry.tsx` keys; the only renderer-only keys are `divider` + `email_capture`.
**Manual:** run `npm run dev`, open a `/link/[username]` page that exercises multiple block types, and confirm the rendered output is unchanged from before (compare against git stash of the old file if unsure). Confirm live-preview still updates via the editor.

- [ ] **Step 4: Update the storefront map**

In `docs/reference/storefront-map.md`, update the link-in-bio renderer source from "inline `link_type` branches" to point at `src/components/storefront/linkinbio/blockRenderers/registry.tsx`, and bump `Last synced` to today. (This satisfies the doc-drift Stop hook.)

- [ ] **Step 5: Commit**

```bash
git add src/components/storefront/LinkInBioPage.tsx docs/reference/storefront-map.md
git commit -m "refactor(storefront): LinkInBioPage becomes layout + block dispatch"
```

---

## Task 6: Link-in-bio slug page type cleanup

**Files:**
- Modify: `app/(storefront)/link/[username]/page.tsx`

- [ ] **Step 1: Remove gratuitous casts + add jsonb seams**

- Drop `as any` from every `.from('...' as any)` — the tables are typed.
- Drop `page as any`, `pageData as any`, `b as any`, `item as any`, the `(l: any)` in `.filter`/`.map`, etc.
- For `jsonb` columns, narrow once with a documented local interface. Add near the top of the file:

```tsx
// reason: these columns are jsonb (typed `Json`); narrow once at the read boundary
type LinkinbioTheme = { buttonStyle?: string; backgroundType?: string; backgroundValue?: string | null; fontFamily?: string; cardStyle?: string; animation?: string; borderRadius?: string; spacing?: string };
type LinkinbioLayout = { style?: string };
type LinkinbioSettings = { socialLinks?: { platform: string; url: string; is_visible?: boolean }[]; showWatermark?: boolean; showShareButton?: boolean; avatarShape?: 'circular' | 'rounded' | 'square'; avatarBorder?: boolean };
```

Use them: `const theme = (pageData.theme ?? {}) as LinkinbioTheme;` etc. Import `BioData`, `BioLink`, `ProductLite` from `@/components/storefront/linkinbio/blockRenderers/_shared` and type the `bio` object, the `links` array, and `productsMap` accordingly — this removes the `bio as any` and `links` casts at the `<LinkInBioPage>` call site. The block→link mapping's `metadata: { ...content, ...(item?.metadata ?? {}) }` stays; type `content`/`style` jsonb via a small `as` seam if needed.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` → no errors.
Run: `npm run lint` → no errors.
Run: `grep -nE ":\s*any|as any" "app/(storefront)/link/[username]/page.tsx"` → only the documented jsonb seams remain.

- [ ] **Step 3: Commit**

```bash
git add "app/(storefront)/link/[username]/page.tsx"
git commit -m "refactor(storefront): type the link-in-bio slug page"
```

---

## Task 7: Remaining slug pages type cleanup

**Files:**
- Modify: `app/(storefront)/site/[slug]/page.tsx` (2), `app/(storefront)/store/[slug]/page.tsx` (4), `app/(storefront)/upsells/[slug]/page.tsx` (5)
- Confirm: `app/(storefront)/pay/[siteId]/page.tsx` (0 — read only)

- [ ] **Step 1: Clean each page**

For each, replace gratuitous `any` with the relevant `Row` type from `@/types/database.types` (or the query's inferred type) and narrow jsonb columns with a one-line documented seam where unavoidable. Read each file first; these counts are low. Do not change behavior. Confirm `pay/[siteId]/page.tsx` has no `any`.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` → no errors.
Run: `npm run lint` → no errors.
Run: `grep -rnE ":\s*any|as any" "app/(storefront)/site" "app/(storefront)/store/[slug]" "app/(storefront)/upsells"` → only documented seams remain.

- [ ] **Step 3: Commit**

```bash
git add "app/(storefront)/site/[slug]/page.tsx" "app/(storefront)/store/[slug]/page.tsx" "app/(storefront)/upsells/[slug]/page.tsx"
git commit -m "refactor(storefront): type single-page, store, upsells slug pages"
```

---

## Task 8: `ProductSalesPage.tsx` cleanup + decomposition

**Files:**
- Modify: `src/components/storefront/ProductSalesPage.tsx`
- Optionally create: `src/components/storefront/singlepage/*.tsx` (only if the file stays large after typing)

- [ ] **Step 1: Type the props + state**

- Replace `singlePage: any` / `palette?: any` with: `palette?: Record<string, string>` and a local `SinglePageData` interface (or `site_singlepage` Row + joined `products`). Type `getCSSVariables(palette: Record<string, string>)`.
- Replace the `liveContent`/`liveAppearance`/`livePalette` `any` state with small local interfaces narrowed from the `postMessage` payload — one documented `// reason:` seam at the message handler. Keep the `postMessage` effect.
- Remove the remaining `as any` casts (e.g. `textAlign: x as any` style casts may stay if structurally required — document them).

- [ ] **Step 2: Extract template sub-components**

Extract the large inline regions (hero, trust badges, feature grid, testimonials, FAQ, countdown, CTA) into co-located function components at the bottom of the file (verbatim JSX, typed props). If the file is still > ~450 lines, move them to `src/components/storefront/singlepage/` and import. NO registry — this is a fixed template.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → no errors.
Run: `npm run lint` → no errors.
Run: `grep -nE ":\s*any|as any" src/components/storefront/ProductSalesPage.tsx` → only documented seams.
**Manual:** `/site/[slug]` renders identically; live-preview still works.

- [ ] **Step 4: Commit**

```bash
git add src/components/storefront/ProductSalesPage.tsx
git commit -m "refactor(storefront): type + decompose ProductSalesPage"
```

---

## Task 9: `SectionRenderer.tsx` + `PaymentLinkPage.tsx` typing

**Files:**
- Modify: `src/components/storefront/SectionRenderer.tsx`, `src/components/storefront/PaymentLinkPage.tsx`

- [ ] **Step 1: `SectionRenderer.tsx`**

Replace `products?: any[]` with `products?: ProductLite[]` (import from `linkinbio/blockRenderers/_shared`, or define a local `StorefrontProduct` type matching the fields sections read) and `siteMain?: any` with a typed shape from the `site_main` Row (or a minimal local interface of the fields actually passed). Keep the `switch` and the `console.warn` default case unchanged.

- [ ] **Step 2: `PaymentLinkPage.tsx`**

Replace the single `any` with the correct type (read the file; likely the `site`/config prop or the SDK `load` result). If it is the Cashfree SDK shape (no real types ship — see `types/cashfree.d.ts`), document with a one-line `// reason:` comment rather than leaving bare `any`.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → no errors.
Run: `npm run lint` → no errors.
Run: `grep -nE ":\s*any|as any" src/components/storefront/SectionRenderer.tsx src/components/storefront/PaymentLinkPage.tsx` → only documented seams.

- [ ] **Step 4: Commit**

```bash
git add src/components/storefront/SectionRenderer.tsx src/components/storefront/PaymentLinkPage.tsx
git commit -m "refactor(storefront): type SectionRenderer + PaymentLinkPage"
```

---

## Task 10: Final verification + map sync

- [ ] **Step 1: Full type + lint pass** — `npx tsc --noEmit` and `npm run lint` both clean across the whole repo.
- [ ] **Step 2: Residual any sweep** — `grep -rnE ":\s*any|as any" "app/(storefront)" src/components/storefront` → every remaining hit is a documented `// reason:` seam (jsonb / postMessage / Cashfree SDK). No bare gratuitous `any`.
- [ ] **Step 3: Run `/sync-docs`** — confirm check 7 (storefront map) reports in sync, with only the intended `divider` + `email_capture` renderer-only parity entries.
- [ ] **Step 4: Manual parity** — click through `/link/[username]`, `/site/[slug]`, `/store/[slug]`, `/pay/[siteId]`, `/upsells/[slug]`; rendered output identical to pre-refactor; live-preview works on link-in-bio + single-page.

---

## Self-review notes (author)

- **Spec coverage:** Part A → Tasks 6, 7; Part B → Tasks 1–5; Part C → Task 8; Part D → Task 9; parity recheck → Tasks 5 & 10; map refresh → Task 5 & 10. All four parts covered.
- **Type consistency:** `BlockRendererProps`, `BioData`, `BioLink`, `ProductLite`, `BLOCK_RENDERERS`, `BlockRenderer` names are consistent across Tasks 1, 2, 3, 4, 5. The dispatch passes exactly the props each component destructures.
- **Behavior preservation:** content-guards moved into each component as self-`null`; the one unreachable URL-fallthrough edge is documented in the spec. Verbatim JSX everywhere; helpers keep identical signatures.
- **No test framework:** verification is tsc + lint + grep + manual parity, per `.claude/rules/verification.md` Lane 1.
- **Ordering:** new files (Tasks 1–4) land before the rewire (Task 5) so each intermediate state compiles; slug-page type cleanup (6–7) follows once `_shared` exports the shared types.
