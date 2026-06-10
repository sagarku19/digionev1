---
noteId: "8a267e4064b611f1a2458925ff71e28e"
tags: []

---

# Homepage Visual Upgrade — Design Spec

**Date:** 2026-06-10
**Owner:** Frontend Agent
**Scope:** Marketing homepage only (`app/(marketing)/page.tsx` composition untouched; section components upgraded)

## Goal

Bring the DigiOne homepage to modern-SaaS polish (Stripe/Linear-grade) by adding product-shot
visuals where the page currently tells instead of shows. No copy changes, no palette changes,
light mode only, no images or new packages — all visuals are flat div-composed mockups in the
same technique already used by the Features bento graphics.

## Decisions (made via visual brainstorm, 2026-06-10)

| Question | Decision |
|---|---|
| Hero treatment | **A — Classic Stripe-style product shot**: full-width dashboard mockup below hero copy |
| Section scope | Hero + **Steps + Marquee + ProductTypes + Showcase** |
| Hero mockup content | **B — Earnings focused**: balance card + incoming UPI payments |
| Theme | Light mode only |
| Untouched | `Features.tsx`, `Testimonials.tsx`, `CtaBanner.tsx`, `MarketingNav.tsx`, section order in `page.tsx` |

## Section designs

### 1. Hero — `src/components/marketing/sections/Hero.tsx`

Add a centered, full-width (max-w-5xl) **dashboard product shot** below the CTA buttons:

- **Frame:** browser chrome (traffic-light dots, URL pill reading `digione.ai/dashboard`),
  white surface, 1px `black/[0.08]` border, large soft shadow, rounded top corners. Fades up
  on load (reuse the existing `heroFadeUp` keyframe with a later delay). A bottom gradient
  fade blends the mockup into the section edge.
- **Content (earnings-focused):**
  - Left **sidebar**: logo dot, skeleton nav items as gray bars, one active item with the
    `#E83A2E` accent. Hidden below `sm`.
  - **Main area**: a large emerald-gradient **balance card** ("Available Balance",
    `₹1,24,850`, "Cashfree · Instant UPI", Withdraw pill) above a list of 3 incoming payment
    rows (`+₹4,200`, `+₹11,500`, one amber "Processing") whose name fields are
    skeleton-shimmer bars; a compact revenue bar chart (red-tinted bars, tallest bar
    `#E83A2E`) sits beside the rows on `md+`.
- **Skeleton shimmer:** a reusable `skeletonShimmer` keyframe (add to `app/globals.css` only
  if no equivalent exists) animates a translucent highlight across designated gray bars.
- **Floating cards:** the 3 existing floating cards (`floatCard1–3`) are repositioned to
  overlap the mockup's outer corners. Still `hidden xl:block`.
- **Mobile (≤ sm):** sidebar hidden; balance card + payment rows only; chart hidden; no
  horizontal overflow at 360px.
- Headline, sub-copy, CTAs, badge, blobs, dot grid, grain — unchanged.
- The whole mockup is decorative: `aria-hidden="true"`, no focusable elements inside.

### 2. Marquee — `src/components/marketing/sections/Marquee.tsx`

- Platform names become bordered **pill chips** (white bg, 1px `black/[0.06]` border, gray
  text) instead of bare gray text; marquee animation and edge fades kept.
- The 3 stat tiles become white **cards** (1px border, soft shadow, rounded-2xl) with a tiny
  flat sparkline accent (3–5 short bars or a polyline div strip) under each number.
- Replace dashboard CSS variables (`var(--text-primary)`, `var(--text-secondary)`) with
  concrete grays (`text-gray-900`, `text-gray-500`) — marketing pages don't use dashboard
  tokens.

### 3. Steps — `src/components/marketing/sections/Steps.tsx`

Keep the 3-column icon layout, numbering, and connector line. Under each step's text, add a
small flat **mini-mockup card** (same card chrome as Features `graphicCard`):

1. **Sign up** — mini signup form: avatar circle, two shimmer skeleton input bars, a red
   submit pill.
2. **Upload & style** — mini builder strip: 2–3 layer rows with drag-handle dots, one active
   row with red left-accent.
3. **Share & get paid** — mini payout toast: green check icon, "₹12,400 credited", "Instant
   UPI" caption.

Mockups stack naturally on mobile (cards full-width per column).

### 4. ProductTypes — `src/components/marketing/sections/ProductTypes.tsx`

Light touch (Features bento sits directly above — avoid busy):

- Each tile gains a small flat **product visual** behind/beside the icon — e.g. mini ebook
  cover (stacked rectangles), mini video-player bar (progress line + play dot), mini template
  grid (2×2 cells). Token-colored divs only, sized to stay subordinate to icon + title.
- Tile layout, copy, hover accents unchanged.

### 5. Showcase — `src/components/marketing/sections/Showcase.tsx`

- Replace each creator card's flat gradient cover with a **mini storefront mockup**: keep the
  gradient as a header strip, overlay a tiny 3-card product-grid skeleton (white cards with
  gray image/text bars) so each card reads as a real store. Revenue badge and avatar chip
  stay.
- Scroller, snap behavior, and card meta unchanged.

## Constraints

- **No copy changes** anywhere (existing headlines, stats, names, testimonials stay).
- **No new colors**: white/neutral grays + `#E83A2E`; existing gradient accents
  (emerald/violet/amber) may be reused where they already appear; no new accent hues.
- **No images, no screenshots, no new assets, no new packages.**
- Icons: lucide-react only, and none inside mockup bodies (labels/meta rows are fine).
- Tailwind only; the only permissible `globals.css` addition is the shimmer keyframe.
- All decorative mockups `aria-hidden="true"`.
- Light mode only — no `dark:` variants on the homepage.
- No `console.log`.

## Responsive requirements

- 360px: no horizontal overflow in any section; hero mockup shows simplified content.
- 768px: grids break to 2–3 columns per existing patterns.
- 1440px: floating cards + full hero mockup visible.

## Verification

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run dev` → manual check at 360 / 768 / 1440px widths.
4. Residual grep for unintended dashboard-token usage in marketing sections.

## Out of scope

- `Features.tsx`, `Testimonials.tsx`, `CtaBanner.tsx`, `MarketingNav.tsx`
- Any other `(marketing)` page (pricing, features, blog…)
- Dashboard, storefront, auth surfaces
- Copy rewrites, dark mode, new sections, section reordering
