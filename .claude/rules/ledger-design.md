---
noteId: "40ec9050658f11f1afbc71a13b82182e"
tags: []

---

# Engineered-Ledger Design System

**This is the design language for DigiOne's public surfaces** — marketing pages (`app/(marketing)/**`), auth (`app/(auth)/**`), account (`app/account/**`), and the shared chrome (`MarketingNav`, `MarketingFooter`). It is also the reference when porting this look to new surfaces, including dashboard redesigns.

Origin: the June 2026 homepage overhaul. The dashboard currently has its own language (`.claude/rules/dashboard-design.md`, CSS-variable based, light+dark). When redesigning dashboard surfaces in the ledger style, keep the dashboard's CSS-variable tokens for color (so dark mode keeps working) but adopt the ledger's *structure*: rails, hairlines, mono kickers, flat illustration, restrained motion.

---

## The Aesthetic in One Paragraph

A technical document, not a brochure. The page reads as one continuous **engineer's ledger**: a fixed-width column with visible vertical rules, hairline section separators, registration crosses at the joints, monospace micro-annotations (`>>` kickers, routes, metrics), and graph-paper fields. Surfaces are flat — white, warm paper, or ink — with **one chromatic accent: vermilion**. Illustration is built from divs and tokens, never images. Motion is orchestrated and purposeful: one staggered load sequence, self-drawing strokes, marching dashes, pulsing live dots.

---

## Palette

Hardcoded hex is **correct** on these surfaces (they are light-only). Do not use Tailwind color names (`gray-500`, `red-600`) — only these values:

| Token | Value | Use |
|---|---|---|
| **Ink** | `#16130F` | Headings, primary text, dark surfaces, ink buttons, iPhone/browser frames |
| **Vermilion** | `#E83A2E` | The only accent: CTAs, kickers, active states, accents in headlines, data series |
| Vermilion hover | `#C92F24` | Hover on vermilion buttons (`hover:bg-[#C92F24]`) |
| Vermilion (on ink) | `#FF6B5C` | Vermilion accents sitting on `#16130F` surfaces (better contrast) |
| **Paper** | `#FAF8F6` | Warm secondary surface: alternate sections, insets, icon wells, read-only fields |
| White | `#ffffff` | Default page/section background |
| Emerald (semantic) | `emerald-500/600/700` + `emerald-50/100` | Money-positive, LIVE indicators, success states only |
| Amber (semantic) | `amber-400/600` | Ratings (★), pending states only |

### Opacity-derived neutrals (never gray-*)

| Use | Light surface | Ink surface |
|---|---|---|
| Body / secondary text | `text-black/50` – `text-black/55` | `text-white/55` |
| Tertiary text, labels | `text-black/35` – `text-black/45` | `text-white/35` – `text-white/40` |
| Faint / ghost | `text-black/25` – `text-black/30` | `text-white/30` |
| Hairlines, dividers | `bg-black/[0.07]` / `border-black/[0.06]` | `bg-white/[0.09]` |
| Default borders | `border-black/[0.08]` – `border-black/[0.1]` | `border-white/[0.09]` |
| Strong / hover borders | `border-black/[0.22]` – `border-black/[0.3]` | `border-white/25` |
| Subtle fills | `bg-black/[0.03]` – `bg-black/[0.05]` | `bg-white/10` |

Selection: `selection:bg-[#E83A2E]/15` on hero-level sections.

---

## Typography

| Role | Stack | Classes |
|---|---|---|
| Display (wordmarks, optional page titles) | Bricolage Grotesque | `font-display` (`--font-display` in `globals.css`) |
| Body & headings | Inter (default `--font-sans`) | default; headings `font-bold tracking-[-0.03em]`–`[-0.04em]` |
| **Ledger mono** | IBM Plex Mono | `font-ledger` (defined in `globals.css`, `tnum` enabled) |

### Scale in use

| Element | Classes |
|---|---|
| Hero h1 | `text-[40px] sm:text-[56px] lg:text-[68px] font-bold tracking-[-0.04em] leading-[1.02]` |
| Subpage h1 | `text-[36px] sm:text-[52px] lg:text-[60px] font-bold tracking-[-0.04em] leading-[1.05]` |
| Section h2 | `text-[28px] sm:text-[38px] lg:text-[44px] font-bold tracking-[-0.03em] leading-[1.08]` |
| Card/in-flow h3 | `text-[17px]`–`[19px] font-bold tracking-[-0.02em]` |
| Body / sub | `text-[15px] sm:text-[16-17px] font-medium text-black/50 leading-relaxed` |
| UI text / links | `text-[13.5px] font-medium` (nav/footer links), `font-semibold` for emphasis |
| Ledger micro-label | `font-ledger text-[9px-11px] uppercase tracking-[0.18em] text-black/35` |
| Ledger metric value | `font-ledger text-[22px] sm:text-[28px] font-semibold tracking-tight` |

**Headline accent pattern:** second line (or last phrase) of every big heading is vermilion: `<span className="text-[#E83A2E]">…</span>`. Headlines end with a period ("Sell on autopilot.", "serious results.").

**Wordmark:** `DigiOne` + superscript mono `.ai`:
```tsx
DigiOne<span className="font-ledger text-[9px] text-[#E83A2E] font-semibold ml-0.5 align-super">.ai</span>
```

---

## Scaffolding — `src/components/marketing/Ledger.tsx`

Always compose sections from these. Never rebuild rails by hand.

| Export | What it is |
|---|---|
| `INK`, `VERMILION` | Color constants |
| `Cross` | 9px registration cross, absolutely positioned at rail joints. `dark` prop for ink tone. Place at `-top-[5px]/-bottom-[5px] -left-[5px]/-right-[5px]` |
| `Rails` | The page column: `max-w-6xl mx-auto border-x` + top corner crosses. `tone="white" \| "paper" \| "ink"` switches rail color |
| `Kicker` | Mono kicker row: vermilion `>>` + flexing hairline + right-aligned route (e.g. `/discover`). `dark` prop. (`index` prop is legacy — accepted, not rendered) |
| `SectionShell` | Full section: separator hairline → Rails → padded body with Kicker + h2 + sub, then children. `tone` prop |

### Anatomy of every section

```tsx
<section className="relative bg-white">                          {/* or #FAF8F6 / #16130F */}
  <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />   {/* separator */}
  <Rails>                                                        {/* rails continue page-long */}
    <div className="px-5 sm:px-10 lg:px-14 py-14 sm:py-20 lg:py-24">
      <Kicker index="01" route="/route-this-section-references" />
      {/* heading block, then content */}
    </div>
  </Rails>
</section>
```

**Hard rules:**
- Horizontal padding inside rails is always `px-5 sm:px-10 lg:px-14`.
- **Never put a margin on `Rails`** (`mb-*`) — it breaks the continuous vertical rules. Spacing comes from internal padding.
- The last section before the footer gets bottom `Cross`es (`-bottom-[5px]`) marking the joint.
- Tones alternate down the page: white → paper → ink → paper → white… The footer is **ink** and closes the document.
- Page-level wrapper: `flex flex-col w-full overflow-hidden bg-white`.

### Kicker format

`>>` (vermilion, mono) + hairline + route string. The route is real (`/dashboard/earnings`, `/account/profile`) — it annotates what the section is about. No numbering — the `[NN]` index style was retired; use `>>` everywhere, including inline card markers.

---

## Backgrounds & Atmosphere

### Graph paper (hero / subpage headers)

```tsx
<div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{
  backgroundImage:
    'linear-gradient(rgba(22,19,15,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(22,19,15,0.035) 1px, transparent 1px)',
  backgroundSize: '48px 48px',
  WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
  maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
}} />
```
On ink: same grid with `rgba(255,255,255,0.045)`.

### Vermilion radial (depth on ink surfaces)

```tsx
style={{ background: 'radial-gradient(circle at 85% 15%, rgba(232,58,46,0.22) 0%, transparent 45%)' }}
```
Use one per ink card/section, top-corner anchored, `opacity-50`-ish. Footer uses `ellipse 50% 60% at 85% 0%` at 0.14.

### Grain (vermilion stamp CTA only)

SVG `feTurbulence` noise at `opacity-[0.07]` over the `#E83A2E` CTA card — see `CtaBanner.tsx`.

---

## Component Recipes

### Buttons

| Variant | Classes |
|---|---|
| Primary (vermilion) | `bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] px-6 py-3.5 rounded-lg transition-colors duration-200` |
| Ink (on vermilion/paper) | `bg-[#16130F] hover:bg-black text-white …same…` |
| Outline | `border border-black/[0.12] hover:border-black/[0.25] text-[#16130F] font-semibold …same…` |
| Outline (on ink) | `border border-white/35 hover:border-white/70 text-white …same…` |

Arrow affordance on primaries:
```tsx
<ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
```
**No** glows, no `shadow-[…rgba(232,58,46…]`, no `hover:-translate-y-*` on buttons. Color transitions only.

### Inputs

```
w-full px-4 py-3 rounded-lg border border-black/[0.1] bg-white text-[14px] text-[#16130F]
placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15
focus:border-[#E83A2E] transition-all
```
Labels: `text-[13px] font-semibold text-[#16130F] mb-1.5`. Helper: `font-ledger text-[10px] text-black/35`. Read-only: add `bg-[#FAF8F6] text-black/50 cursor-not-allowed`. Define once per page as `const INPUT = '…'`.

### Error / success notes

```tsx
// error
<div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#E83A2E]/[0.06] border border-[#E83A2E]/15 text-[13px] text-[#E83A2E] font-medium">
  <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E] shrink-0" /> {message}
</div>
// success: emerald-50 / emerald-100 / emerald-700
```

### Cards & tiles

- Card: `bg-white border border-black/[0.07] rounded-xl` (+ `p-5/6`). Hover: `hover:border-black/[0.15]` or `hover:bg-[#FAF8F6]`. Shadow only for floating elements: `shadow-[0_16px_50px_-30px_rgba(22,19,15,0.25)]`.
- Ruled grid cells (features, contact channels): no per-card chrome — cells separated by shared `border-black/[0.07]` lines inside one Rails block, `hover:bg-[#FAF8F6]`.
- Rectangle category tile: label left + ghost icon right (`text-black/25 group-hover:text-[#E83A2E]`).
- Featured/anchor tile: ink-filled, icon in `bg-white/10` well, vermilion `#FF6B5C` icon.
- Chips/pills: `rounded-lg px-4 py-2 text-[13px] font-semibold border border-black/[0.1]`; active = ink-filled `bg-[#16130F] text-white`.

### Ledger metrics strip

Hairline-divided columns of mono numbers (see hero bottom / community):
```tsx
<div className="border-t border-black/[0.08] grid grid-cols-2 lg:grid-cols-4">
  {/* each cell: border-l border-black/[0.08], px-5 sm:px-10 lg:px-14 py-6 sm:py-8,
      font-ledger value + text-black/40 label */}
</div>
```

### LIVE indicator

```tsx
<span className="relative flex w-1.5 h-1.5">
  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
</span>
```

### Flat device/UI mockups

Built only from divs + tokens — **no images, no screenshots**. References: browser-chrome dashboard (`Hero.tsx`), iPhone with status bar / dynamic island / before-after cover / home indicator (`ProductShowcase.tsx`), mini-storefront cards (`Storefronts.tsx`). Floating toasts overlap the device: small white card, `font-ledger` copy, soft long shadow.

### Vermilion stamp CTA

Full-bleed `#E83A2E` rounded-2xl card with grain + white radial, ink primary button, mono uppercase footnote. See `CtaBanner.tsx` — reuse it; don't rebuild.

### Legal/policy pages

Use `src/components/marketing/LegalLedger.tsx` (`route`, `title`, `accent`, `sub`, `updated`, `sections`, `toc?`, `footer`). Renders `**bold**` in section content.

---

## Motion

Prefer CSS keyframes; framer-motion not needed on these surfaces.

| Pattern | How |
|---|---|
| Load sequence | `heroFadeUp` keyframe (`opacity 0→1, translateY 20px→0`), `cubic-bezier(0.16,1,0.3,1)`, staggered `0.08s`-steps via `animation-delay` |
| Scroll reveal | Wrap in `<InView>` (`src/components/marketing/InView.tsx`); children with class `iv` transition in; stagger lists with inline `transitionDelay: i * 30-35ms` |
| Self-drawing strokes | SVG `stroke-dasharray`/`dashoffset` → animate offset to 0 (hero revenue plot) |
| Marching ants | dashed SVG line, animate `stroke-dashoffset: -24` loop |
| Ping/pulse | `animate-ping` twin-dot (LIVE), or scaled SVG circle with `transformBox: 'fill-box'` |
| Hover micro | color/border transitions `duration-200`; arrow `translate-x-0.5`; **no** lift/scale on cards or buttons |
| Easing | Always `cubic-bezier(0.16,1,0.3,1)` for entrances/structural moves; 300–500ms |

Decorative SVGs: `aria-hidden`, `pointer-events-none`, hide below `xl` if they'd crowd content.

---

## Chrome

### Nav (`MarketingNav.tsx`)
- Full-width bar with **section-separator hairline** below (`border-b border-black/[0.07]`) — the nav is the first rule of the document.
- Transparent at top → `bg-white/85 backdrop-blur-xl` after 20px scroll; height shrinks 16→14/12.
- **Auto-hide**: hides on scroll-down (after 80px, 6px jitter threshold), reveals on scroll-up. `transition-transform duration-500`.
- Desktop links: shared sliding hover pill (measured via `getBoundingClientRect`), active route gets vermilion 2px tick + ink text (`usePathname`).
- Profile dropdown opens on hover with 180ms close-grace; click toggle kept for touch.

### Footer (`MarketingFooter.tsx`)
- **Ink tone** — the page's full stop. `Rails tone="ink"`, dark crosses, dark kicker, vermilion corner radial, white/55→white links, emerald LIVE status row, giant `font-display` watermark in white-fade gradient with white graph-paper dissolve.
- Gradient-clipped display text needs `paddingRight: '0.06em'` or trailing glyphs clip.

---

## Do / Don't

| Do | Don't |
|---|---|
| `text-black/50`, `border-black/[0.08]` | `text-gray-500`, `border-gray-200` |
| `#E83A2E` / `#C92F24` / `#FF6B5C` | `red-500`, orange gradients, purple anything |
| Flat color transitions on hover | Glow shadows, `hover:-translate-y-*`, `scale` on cards |
| `rounded-lg` buttons/inputs, `rounded-xl` cards | `rounded-2xl/3xl/full` pills for buttons |
| `font-ledger` for numbers, routes, micro-labels | Mono for body text |
| `>>` mono kickers + real route annotations | `[01]`-style index numbering (retired), emoji icons |
| Compose with `Rails`/`Kicker`/`SectionShell`/`LegalLedger` | Hand-rolled section wrappers |
| Div-built flat mockups | Screenshots, stock images, gradient icon boxes |
| One vermilion accent per composition | Multi-color icon grids (`from-blue-500 to-indigo-500`…) |
| `lucide-react` icons, `strokeWidth={1.8}` for decorative | Any other icon set |
| Margins between rails = never; pad inside | `mb-*` on `Rails` (breaks the side rules) |

---

## Porting to the Dashboard

When the user asks to redesign a dashboard surface "in the ledger style":

1. **Keep dashboard tokens for color** — `var(--bg-primary)`, `var(--text-primary)`, `var(--border)` etc. — so light/dark keep working. Map: ink text → `--text-primary`, black/50 → `--text-secondary`, hairlines → `--border-subtle`, paper → `--surface-muted`, vermilion → `--brand`.
2. **Adopt the structure**: hairline separators, mono `font-ledger` kickers (`>>` + route), ruled grids instead of floating cards, metrics strips, flat div illustration.
3. **Adopt the restraint**: compact type, color-only hovers, one orchestrated reveal.
4. `dashboard-design.md` still governs primitives (`Card`, `DataTable`, `PageHeader`…) and sizing discipline — the ledger language layers on top, it does not replace the token system.

## Reference implementations

- Scaffolding: `src/components/marketing/Ledger.tsx`, `InView.tsx`, `LegalLedger.tsx`
- Hero + animated SVG plot: `src/components/marketing/sections/Hero.tsx`
- iPhone mock + category grid: `src/components/marketing/sections/ProductShowcase.tsx`
- Ink section: `sections/MoneyRail.tsx`; stamp CTA: `sections/CtaBanner.tsx`
- Chrome: `src/components/marketing/{MarketingNav,MarketingFooter}.tsx`
- Subpage patterns: `app/(marketing)/{features,pricing,blog,discover,community,contact}/page.tsx`, auth pages, `app/account/*`
