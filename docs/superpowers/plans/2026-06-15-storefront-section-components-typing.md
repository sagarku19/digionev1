---
noteId: "1b28e9d0682911f19aeeff0b58723b31"
tags: []

---

# Storefront Section Components — Typing Pass (Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Remove gratuitous `any` from the ~18 storefront section components (`src/components/storefront/sections/*.tsx`), behavior- and visually-identical. Second pass / follow-up to `docs/superpowers/specs/2026-06-14-storefront-type-structure-refactor-design.md`.

**Why a uniform pattern (read before any task):** `SectionRenderer` builds `const props = { settings: section.settings ?? {}, products, siteMain }` where `section.settings` is `Record<string, unknown>` (from `StorefrontSection`). It spreads `{...props}` into each section. Therefore a section component's `settings` param MUST remain assignable from `Record<string, unknown>` — it canNOT be a concrete interface (that breaks the dispatch with "unknown not assignable to string"). The fix: keep the param loose and narrow ONCE inside.

**Verification model:** no test runner. Per task: `npx tsc --noEmit` clean + `npm run lint` (no NEW errors; pre-existing `<img>` warnings carry) + residual-`any` grep on the touched files.

---

## The pattern (apply to every section component)

1. Add a local `interface <Name>Settings { ... }` listing ONLY the fields the component reads from `settings`, all optional, with nested types for any arrays/objects it reads (e.g. `faqs?: { q?: string; a?: string }[]`).
2. Change the param from `{ settings }: { settings: any }` to `{ settings }: { settings: Record<string, unknown> }`.
3. Narrow once at the top with a documented cast:
   ```tsx
   // reason: section settings is jsonb; narrow once to the typed view
   const s = settings as unknown as <Name>Settings;
   ```
   Then replace every `settings?.field` / `settings.field` read with `s.field`.
4. Replace `(x: any)` annotations in `.map`/`.filter` with the inferred type from the typed array (drop the annotation entirely once the array is typed).
5. For components that also take `products`: type `products?` (see ProductGrid example — note the `slug` extension).
6. Do NOT change any JSX, class names, fallback values, or logic. Behavior- and visually-identical.

### Worked example A — scalar settings (`HeroBanner.tsx`)

```tsx
import React from 'react';
import Link from 'next/link';

interface HeroBannerSettings {
  title?: string;
  subtitle?: string;
  primary_cta?: { text?: string; url?: string };
  alignment?: 'left' | 'center' | 'right';
  background_image_url?: string;
}

export default function HeroBanner({ settings }: { settings: Record<string, unknown> }) {
  // reason: section settings is jsonb; narrow once to the typed view
  const s = settings as unknown as HeroBannerSettings;
  const title = s?.title || 'Welcome to my store';
  const subtitle = s?.subtitle || 'Discover premium digital products, courses, and more.';
  const primaryCta = s?.primary_cta || { text: 'Shop Now', url: '#products' };
  const alignment = s?.alignment || 'center';
  const bgImageUrl = s?.background_image_url;
  // ...rest UNCHANGED...
}
```

### Worked example B — settings + products (`ProductGrid.tsx`)

`ProductGrid` reads `p.slug`, which is NOT on `StorefrontProduct` (the store page never selects it; it is always undefined at runtime → keep that behavior with an optional field).

```tsx
import React from 'react';
import Link from 'next/link';
import type { StorefrontProduct } from '../SectionRenderer';

function formatINR(n: number) { return `₹${n.toLocaleString('en-IN')}`; }

interface ProductGridSettings { title?: string; columns?: number; show_price?: boolean; max_items?: number; }
type GridProduct = StorefrontProduct & { slug?: string | null };

export default function ProductGrid({ settings, products = [] }: { settings: Record<string, unknown>; products?: GridProduct[] }) {
  // reason: section settings is jsonb; narrow once to the typed view
  const s = settings as unknown as ProductGridSettings;
  const title = s?.title ?? '';
  const columns = s?.columns ?? 3;
  const showPrice = s?.show_price !== false;
  const maxItems = s?.max_items ?? 12;
  // ...colClass UNCHANGED...
  const visible = products.filter((p) => p.is_published).slice(0, maxItems);
  // ...rest UNCHANGED (p.slug, p.thumbnail_url, p.name, p.price all still valid)...
}
```

### Worked example C — array settings (`FaqAccordion.tsx` shape)

```tsx
interface FaqAccordionSettings {
  title?: string;
  faqs?: { question?: string; answer?: string }[]; // match the actual fields the file reads
}
// const s = settings as unknown as FaqAccordionSettings;
// const faqs = s?.faqs ?? [];
// {faqs.map((faq, index) => ( ... ))}   // drop the `: any`
```

---

## Task 1: Batch A — scalar-settings sections

**Files:** `HeroBanner.tsx`, `AboutCreator.tsx`, `AnnouncementBar.tsx`, `CustomHtml.tsx`, `RichText.tsx`, `TrustBadges.tsx` (all under `src/components/storefront/sections/`)

- [ ] **Step 1:** For each file, read it, then apply the pattern (steps 1–4 above). Derive each `*Settings` interface from the exact fields the file reads — do not guess fields it doesn't use.
- [ ] **Step 2: Verify** — `npx tsc --noEmit` → clean. `npm run lint` on the 6 files → no NEW errors (pre-existing `<img>` warnings OK). `grep -nE ":\s*any\b|as any" <the 6 files>` → no matches (the `as unknown as` casts are fine — they won't match `as any`).
- [ ] **Step 3: Commit**
```bash
git add src/components/storefront/sections/HeroBanner.tsx src/components/storefront/sections/AboutCreator.tsx src/components/storefront/sections/AnnouncementBar.tsx src/components/storefront/sections/CustomHtml.tsx src/components/storefront/sections/RichText.tsx src/components/storefront/sections/TrustBadges.tsx
git commit -m "refactor(storefront): type section components (batch A)"
```

## Task 2: Batch B — mixed sections

**Files:** `StickyCta.tsx`, `CountdownTimerSection.tsx`, `VideoShowcase.tsx`, `ImageGallery.tsx`, `EmailCapture.tsx`, `SocialProof.tsx`

- [ ] **Step 1:** Apply the pattern to each. `EmailCapture` also takes `siteId?: string` — keep it. `SocialProof` reads a `stats` array — type it (`stats?: { ... }[]`) and drop the `(s: any)`. `ImageGallery` reads an images array — type it. `CountdownTimerSection` reads a target date/labels — type the fields it uses.
- [ ] **Step 2: Verify** — same as Task 1 Step 2 for these 6 files.
- [ ] **Step 3: Commit**
```bash
git add src/components/storefront/sections/StickyCta.tsx src/components/storefront/sections/CountdownTimerSection.tsx src/components/storefront/sections/VideoShowcase.tsx src/components/storefront/sections/ImageGallery.tsx src/components/storefront/sections/EmailCapture.tsx src/components/storefront/sections/SocialProof.tsx
git commit -m "refactor(storefront): type section components (batch B)"
```

## Task 3: Batch C — array/product sections

**Files:** `FaqAccordion.tsx`, `PricingTable.tsx`, `ProductComparison.tsx`, `TestimonialsCarousel.tsx`, `FeaturedProducts.tsx`, `ProductGrid.tsx`

- [ ] **Step 1:** Apply the pattern. These have inner arrays — type each array in the `*Settings` interface and drop the `(x: any)` map/filter annotations:
  - `FaqAccordion`: `faqs` array.
  - `PricingTable`: `plans` array.
  - `ProductComparison`: `columns` + `rows` arrays (the `(_: any, ci)` becomes `(_, ci)`).
  - `TestimonialsCarousel`: `testimonials` array.
  - `FeaturedProducts`: reads `settings?.products` (array of `{ id; name; price; thumbnail_url }`) + `settings?.product_ids` + `title`/`subtitle`; type all; drop `(product: any)`.
  - `ProductGrid`: use Worked example B exactly (`StorefrontProduct` import + `GridProduct`).
- [ ] **Step 2: Verify** — same checks for these 6 files. Confirm `npx tsc --noEmit` is clean (this batch is the most likely to surface assignability issues).
- [ ] **Step 3: Commit**
```bash
git add src/components/storefront/sections/FaqAccordion.tsx src/components/storefront/sections/PricingTable.tsx src/components/storefront/sections/ProductComparison.tsx src/components/storefront/sections/TestimonialsCarousel.tsx src/components/storefront/sections/FeaturedProducts.tsx src/components/storefront/sections/ProductGrid.tsx
git commit -m "refactor(storefront): type section components (batch C)"
```

## Task 4: Final verification

- [ ] `npx tsc --noEmit` repo-wide → clean.
- [ ] `grep -rnE ":\s*any\b|as any" src/components/storefront/sections` → no matches.
- [ ] Run `/sync-docs` → storefront-section wiring (check 5) + storefront map (check 7) still report in sync.
- [ ] Note for the user: chrome (`StorefrontHeader/Footer`), the `(storefront)` `layout.tsx` files, `UpsellCheckoutClient.tsx`, `BuyNowButton.tsx` still carry `any` — a separate optional pass.

---

## Self-review notes (author)
- **Pattern safety:** param stays `Record<string, unknown>` so `SectionRenderer`'s `{...props}` dispatch keeps compiling; narrowing is one documented `as unknown as` per file (not `as any`).
- **ProductGrid `slug`:** handled via `GridProduct = StorefrontProduct & { slug?: string | null }` to preserve the current (always-undefined) behavior.
- **Behavior:** no JSX/class/fallback/logic changes — type-only.
- **Batching:** 3 × 6 files keeps each subagent's context small (avoids the single-giant-task session limit hit during the prior refactor).
