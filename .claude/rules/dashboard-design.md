---
noteId: "66898c205fac11f1b5532decc08dd652"
tags: []

---

# Dashboard Design System

**This is the design language for DigiOne dashboard pages.** Read this whenever you build or modify anything under `app/dashboard/**`, `src/components/dashboard/**`, or `src/components/ui/**`.

Not for storefront, marketing, or auth — those have their own design languages.

---

## Aesthetic

**Vercel-like SaaS.** Clean neutrals, generous breathing room, near-monochrome surfaces with **brand red `#E83A2E`** as the only chromatic accent. Soft 1px borders, subtle elevation, comfortable density (UI text 13–15px). Both light and dark are first-class.

| Use brand red for | Don't use brand red for |
|---|---|
| Primary CTAs | Page backgrounds |
| Active nav indicator | Body text |
| Selection highlights | Borders or dividers |
| Avatar background fallback | Hover states (use `--surface-hover`) |
| Important badges (e.g. "New", "Upgrade") | Charts (use as primary series only) |

---

## Token vocabulary

All tokens live in `app/globals.css` `:root` (light) and `.dark` (dark). **Never** hardcode hex in a dashboard component — always reference a token.

### Surfaces

| Token | Use |
|---|---|
| `--bg-primary` | Page background |
| `--bg-secondary` | Secondary background (sidebar, sub-sections) |
| `--bg-tertiary` | Tertiary inset (rare — code blocks, nested panels) |
| `--surface` | Card / panel / modal background |
| `--surface-muted` | Subtle inset (search input bg, read-only field, button rest) |
| `--surface-hover` | Row + card hover background |

### Borders

| Token | Use |
|---|---|
| `--border` | Default border (cards, inputs, dividers) |
| `--border-strong` | Focused / dropdown / active borders |
| `--border-subtle` | Hairline dividers inside cards, table rows |

### Text

| Token | Use |
|---|---|
| `--text-primary` | Body, headings, values |
| `--text-secondary` | Labels, captions, meta |
| `--text-tertiary` | Placeholders, faint timestamps, table headers |
| `--text-on-brand` | Text on brand-red background (always `#ffffff`) |

### Brand and accent

| Token | Use |
|---|---|
| `--brand` (`#E83A2E`) | Primary CTAs, active indicators, avatar bg |
| `--brand-hover` | Brand button hover |
| `--accent` | Monochrome button (black in light, white in dark) |
| `--accent-hover` | Monochrome button hover |
| `--accent-fg` | Text on monochrome button |

> **Naming gotcha:** `--accent` is **not** brand red. It's the monochrome button color. Brand red is `--brand`. Both meanings are deliberate — don't unify them.

### Semantic

| Token | `-bg` pair | Use |
|---|---|---|
| `--success` | `--success-bg` | Positive deltas, completed states |
| `--warning` | `--warning-bg` | Pending, "Free Plan" badges, soft warnings |
| `--danger` | `--danger-bg` | Errors, destructive buttons, negative deltas |
| `--info` | `--info-bg` | Informational banners |

Canonical pair: `bg-[var(--success-bg)] text-[var(--success)]`. For borders use `border-[var(--success)]/20` (opacity modifier on the base color).

**Aliases** (resolve to the same values, kept for in-flight code): `--success-subtle` ≡ `--success-bg`, `--success-border` ≡ `--success` (same for `warning/danger/info`). Prefer the canonical names in new code.

### Radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `8px` | Buttons, pills, small chips |
| `--radius-md` | `12px` | Inputs, dropdowns, tooltips |
| `--radius-lg` | `16px` | Cards, modals, drawers |
| `--radius-pill` | `999px` | Status pills, avatars |

### Shadow

| Token | Use |
|---|---|
| `--shadow-xs` | Card at rest |
| `--shadow-sm` | Card hover, small floating elements |
| `--shadow-md` | Popovers, tooltips, dropdowns |
| `--shadow-lg` | Modals, drawers, mobile sidebar |

### Editor-surface premium tokens

The Link-in-Bio editor (`src/components/dashboard/site-edit/editor/**`) is a distinct, premium surface. It may additionally use:

| Token | Value | Use |
|---|---|---|
| `--radius-xl` | `20px` | Editor block/profile cards |
| `--shadow-card` | soft | Card at rest in the editor |
| `--shadow-card-lg` | softer/larger | Expanded/active editor card |

These are **only** for `site-edit/editor/**`. List/form/dashboard pages keep `--radius-lg`/`--shadow-xs/sm`.

### Focus

| Token | Use |
|---|---|
| `--focus-ring` | Every focusable surface — `focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]` |

---

## Type scale

Use Tailwind utilities. No custom font-size vars. Default to the **compact end** of these ranges — see "Sizing discipline" below.

| Use | Class |
|---|---|
| Table cells, captions, meta | `text-[13px]` or `text-xs` |
| Default body / form labels | `text-sm` (14px) |
| Page-level prose | `text-sm` to `text-base` |
| Section heading inside a card | `text-base font-semibold` |
| Page title (`PageHeader`) | `text-2xl font-semibold font-display` (Bricolage) |
| KPI value | `text-2xl font-bold` |

Fonts: `--font-sans` (Inter) for everything except `h1/h2/h3/.font-display` which use `--font-display` (Bricolage).

### Sizing discipline (read before scaling anything up)

The dashboard is dense by design. When in doubt go SMALLER.

| Element | Default | Don't use |
|---|---|---|
| In-card title | `text-base font-semibold` | `text-lg/xl/2xl`, `font-extrabold/black` |
| Icon container on a tile | `w-10 h-10 rounded-[var(--radius-md)]` | `w-12+ h-12+`, `rounded-2xl/3xl` |
| Icon inside container | `w-5 h-5` | `w-6+ h-6+` |
| Card radius | `rounded-[var(--radius-lg)]` (default from `<Card>`) | `rounded-[24px/32px]` |
| Card padding | `<Card>` default (`p-6`) or `padded="sm"` (`p-5`) | `p-8/p-10` or manual override |
| Card shadow | `--shadow-xs` at rest, `--shadow-sm` on hover | `shadow-xl/2xl` |

If your design needs anything heavier than the right column above, you're probably building a storefront surface, not a dashboard surface.

---

## Top spacing — every page

Every dashboard page MUST have top breathing room equivalent to `mt-6` so it doesn't sit flush against the TopBar.

Two acceptable patterns:

1. **Page uses `<PageHeader>`** (the default for almost every page): `PageHeader` already supplies `mt-6 mb-4` internally. No extra padding needed on the outer wrapper.
2. **Page does NOT use `<PageHeader>`** (creation hubs, wizards, full-bleed editors): add `pt-6` to the outermost flex/space-y wrapper. Example:
   ```tsx
   <div className="space-y-6 pt-6 pb-12">
     {/* custom header layout */}
   </div>
   ```

If a page launches and the first interactive element collides with the TopBar, you missed this rule.

---

## Focus rings — required on every interactive element

Every `<Link>`, `<button>`, `<input>`, `<select>`, `<textarea>`, and any custom `<div tabIndex={0} role="button">` must include:

```
focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]
```

Inputs additionally get `focus:border-[var(--border-strong)]`.

Use `focus-visible:` (not `focus:`) so mouse users don't see the ring — only keyboard users do.

---

## Primitive catalog

All primitives live in `src/components/ui/`. Always reach for these before writing inline UI.

### Layout

| Primitive | When to use |
|---|---|
| `Card` | Any bordered surface block. `var(--surface)` + `--border` + `--radius-lg` + `--shadow-xs`. Default `p-6`. Use `padded="sm"` (`p-5`), `padded={false}` (no padding — for table/list rows that fill the card), or `hoverable` for tile cards. |
| `KpiGrid` | Stat grid at top of a page. Wraps `StatCard`s in responsive 1/2/4-column grid. |
| `Toolbar` | Filter row above a list: search + filters + view-toggle + actions. |
| `PageHeader` | Title + subtitle + actions slot above almost every page. Don't use on creation hubs or wizards — see "Page archetypes" below. |

### Data display

| Primitive | When to use |
|---|---|
| `DataTable` | Any tabular list. Hover `--surface-hover`, dividers `--border-subtle`, sticky header, empty-state slot. |
| `StatCard` | KPI card. Number + label + optional delta. Delta uses `--success-bg/--success` or `--danger-bg/--danger`. |
| `StatusPill` | Status badge. Pass `status="success" \| "warning" \| "danger" \| "info"` (also accepts free-form strings — unknown values render neutral). |
| `EmptyState` | When a list is empty. Icon + title + description + optional CTA. |
| `Skeleton` | Loading placeholder. Wraps the shimmer animation. Avoid `animate-pulse` inline blocks — use `<Skeleton>`. |

### Overlays

| Primitive | When to use |
|---|---|
| `SideDrawer` | Edit / detail panel sliding from the right. |
| `ConfirmDialog` | Destructive confirmations. Destructive button uses `--danger`. |
| `ImagePickerModal` | Picking from media library / Unsplash. (Dashboard-domain.) |

### Inputs

| Primitive | When to use |
|---|---|
| `CurrencyInput` | INR amounts. Includes `₹` prefix, no decimal paise. |
| `DateRangePicker` | Date range filters (analytics, earnings, orders). |

### Button patterns (no component — utility recipes)

| Variant | Classes |
|---|---|
| Primary (brand) | `bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)]` |
| Primary (mono) | `bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)]` |
| Secondary | `bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)]` |
| Ghost | `text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]` |
| Destructive | `bg-[var(--danger)] hover:opacity-90 text-[var(--text-on-brand)]` |

All buttons share: `rounded-[var(--radius-sm)] text-sm font-medium px-3 py-2 transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]`.

### Form input pattern (no component — utility recipe)

Every text input / textarea / select inside the dashboard uses the same className:

```
w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow
```

Form labels: `block text-sm font-medium text-[var(--text-primary)] mb-1.5`.
Helper text: `mt-1 text-xs text-[var(--text-tertiary)]`.
Field error: `mt-1 text-xs text-[var(--danger)]`.

Define once at the top of a page as `const INPUT = '…'` and reuse — don't inline the long className everywhere.

---

## Card variants via `!` override

`<Card>` ships with default `bg-[var(--surface)]` and `border-[var(--border)]`. To tint a card with a semantic color, override with `!` (Tailwind `!important`):

```tsx
<Card className="!bg-[var(--warning-bg)] !border-[var(--warning)]/20">
  {/* warning-tinted card body */}
</Card>
```

Used for: Setup Required callouts, KYC status banners, marketing CTA cards. Keep these visually quiet — semantic-bg tokens are designed for incidental contrast, not full surfaces.

When the same tinted-card variant recurs in 3+ places, file a follow-up to add `variant="success|warning|danger|info"` to `Card`. Don't pre-emptively grow the API.

---

## Page archetypes

Most dashboard pages fall into one of four archetypes. Pick one and follow its skeleton.

### 1. List page

The most common archetype — analytics, products, orders, customers, leads, coupons, …

```tsx
<div className="space-y-6 pb-12">
  <PageHeader title="…" description="…" action={<…CTA…>} />
  <KpiGrid>          {/* optional, top of analytics-style pages */}
    <StatCard … />
  </KpiGrid>
  <Toolbar           {/* optional, for any list */}
    search={…}
    filters={…}
    actions={…}
  />
  <Card padded={false}>
    <DataTable … />
  </Card>
</div>
```

### 2. Form / settings page

For settings/profile/billing — multiple stacked form sections.

```tsx
<div className="space-y-6 pb-12">
  <PageHeader title="…" description="…" action={<Save button>} />

  <Card>
    <section1 form fields, label + input pattern>
  </Card>

  <Card>
    <section2 form fields>
  </Card>

  {/* sticky bottom action bar if needed */}
</div>
```

### 3. Creation hub

A landing page that routes the user into one of several creation wizards (e.g. `/dashboard/sites/new`).

```tsx
<div className="space-y-6 pb-12">
  {/* back button alone on the left */}
  <div className="pt-6">
    <button onClick={…back…}>← Back to …</button>
  </div>

  {/* centred title + description */}
  <div className="text-center max-w-xl mx-auto">
    <h1 className="text-2xl font-semibold font-display text-[var(--text-primary)] tracking-tight">
      {Title}
    </h1>
    <p className="mt-1 text-sm text-[var(--text-secondary)]">{Description}</p>
  </div>

  {/* grid of preview-style tiles */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {options.map(o => <PreviewTile … />)}
  </div>
</div>
```

Do NOT use `<PageHeader>` here. `PageHeader`'s `justify-between` layout puts the title on the left and the action on the right — wrong hierarchy for a hub where the user's attention should land on the title block, not the back button. The custom 2-row layout above is the canonical creation-hub pattern.

### 4. Multi-step wizard

Each step of a creation flow (`/dashboard/sites/new/{store,singlepage,linkinbio,payment}`, `/dashboard/products/new`, etc.).

```tsx
<div className="space-y-6 pt-6 pb-12">
  <div className="w-full max-w-5xl mx-auto">
    {/* Top bar: back-step button (left) + type/context badge (right) */}
    <div className="flex items-center justify-between mb-4">
      <button onClick={…back…}>← {step > 1 ? 'Go Back' : 'All Types'}</button>
      <ContextBadge />
    </div>

    {/* Two-column: form left, live preview right */}
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      <div>
        <Breadcrumb step={step} steps={STEP_LABELS} />
        <Card>
          <header className="mb-5">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">{stepTitle}</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{stepDescription}</p>
          </header>
          {/* form fields */}
          {/* nav controls: ← back arrow, Continue / Launch button */}
        </Card>
      </div>

      <Card padded="sm">
        <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-3">Preview</div>
        <LivePreview {…formState} />
      </Card>
    </div>
  </div>
</div>
```

See "Wizard patterns" below for the details.

---

## Wizard patterns

### Breadcrumb step bar (replaces stripe progress bars)

```tsx
function Breadcrumb({ step, steps }: { step: number; steps: string[] }) {
  return (
    <ol className="flex items-center gap-2 text-xs font-medium mb-4">
      {steps.map((label, i) => {
        const idx = i + 1;
        const isActive = idx === step;
        const isDone   = idx < step;
        return (
          <React.Fragment key={label}>
            <li className={`inline-flex items-center gap-1.5 ${
              isActive ? ACCENT.text :
              isDone   ? 'text-[var(--success)]' :
              'text-[var(--text-tertiary)]'
            }`}>
              {isDone
                ? <Check className="w-3.5 h-3.5" />
                : <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold ${
                    isActive ? `${ACCENT.bg} text-[var(--text-on-brand)]` : 'bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-tertiary)]'
                  }`}>{idx}</span>}
              <span className={isActive ? 'font-semibold' : ''}>{label}</span>
            </li>
            {idx < steps.length && <li aria-hidden className="text-[var(--text-tertiary)]">→</li>}
          </React.Fragment>
        );
      })}
    </ol>
  );
}
```

### Per-wizard ACCENT constant

When a wizard is contextually tied to a non-brand color (e.g. Product Site → info-blue, Payment Link → success-green), define a single `ACCENT` constant at the top of the file and route the Continue button, active breadcrumb step, and slug-success state through it. Example:

```tsx
const ACCENT = {
  bg:      'bg-[var(--info)]',
  bgHover: 'hover:opacity-90',
  text:    'text-[var(--info)]',
  fill:    'var(--info)',
};
```

The **Launch button on the final step always stays brand red** (`bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)]`) — that's the universal "create the thing" CTA convention. No exceptions.

### Live preview column

The right column of a wizard renders a stylised mini-render of what the user is creating, updating as form state changes. Rules:

- Use `<Card padded="sm">` as the container with a `text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]` "Preview" label at the top.
- Composition is flat `<div>` blocks with token backgrounds — **no images, no lucide icons inside the preview body** (icons may sit in the label row above the preview, not inside it).
- Read directly from the form's `useState` values — don't copy them to a local var.
- Fall back to placeholder strings ("Your Title", "username", "—") when fields are empty so the preview doesn't collapse.
- Truncate long text with `line-clamp-1` or `line-clamp-2`.

### Preview-style picker tiles (creation hub)

Each tile on a creation hub has TWO stacked regions:

| Region | Purpose | Constraints |
|---|---|---|
| **Mockup** (top, `h-32`) | Flat illustration of what the option produces | Token colors only. NO lucide icons. NO images. Composed from `<div>` blocks (rectangles, circles, lines). |
| **Meta** (bottom) | Icon + label + description + tags | Lucide icon `w-4 h-4` allowed here. |

The mockup region uses `bg-[var(--surface-muted)] border-b border-[var(--border-subtle)] p-3`. The accent element inside the mockup (e.g. a CTA bar, an avatar) brightens on hover via `group/tile` + `opacity-90 group-hover/tile:opacity-100 transition-opacity`.

The whole tile is `<Card hoverable padded={false}>` with `tabIndex={0} role="button"` + `onClick` and Enter/Space key handlers for accessibility.

---

## Charts (recharts)

Theme charts per-instance — no global config.

| Element | Token |
|---|---|
| Axis stroke | `var(--border-subtle)` |
| Grid | `var(--border-subtle)` |
| Tick text | `var(--text-tertiary)` |
| Tooltip bg | `var(--surface)` |
| Tooltip border | `var(--border)` |
| Tooltip shadow | `var(--shadow-md)` |
| Tooltip radius | `var(--radius-md)` |
| Primary series | `var(--brand)` |
| Secondary series | `var(--text-secondary)` |

`var(--*)` strings work inside recharts `stroke`, `fill`, `stopColor`, and `contentStyle` props on all target browsers. If you ever hit a renderer that doesn't accept them, read the computed value via `getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()` and pass the hex string. Document the workaround inline.

---

## Light + dark — both are first-class

- Toggle is on `#dashboard-root` and `<html>` via the `.dark` class, owned by `DashboardThemeProvider`.
- Read theme with `useTheme()` from `@/contexts/DashboardThemeContext`. Never read a `localStorage` key directly.
- Every token resolves correctly in both modes. **Don't** write `dark:` Tailwind overrides — use the variable, let the variable flip.

The one exception: dark-mode-only logo asset swaps (e.g. `DigiOneLogo` vs `DigiOneLogoDark`). Those are fine.

---

## Do / Don't

| Do | Don't |
|---|---|
| `bg-[var(--surface)]` | `bg-white` or `bg-gray-50` |
| `text-[var(--text-secondary)]` | `text-gray-500` |
| `border-[var(--border)]` | `border-gray-200` |
| `text-[var(--brand)]` for active states | `text-red-500` |
| `shadow-[var(--shadow-sm)]` | `shadow-lg` / `shadow-2xl` |
| Reach for a primitive | Inline copy-paste card chrome |
| Wrap pages in `<PageHeader>` or add `pt-6` | Render content flush against the TopBar |
| `focus-visible:shadow-[var(--focus-ring)]` on every interactive | Skip focus styles "because it's just a link" |
| `text-base font-semibold` for card titles | `text-2xl font-extrabold` inside a card |
| `<Card>` defaults (p-6, radius-lg, shadow-xs) | `rounded-[32px] p-10 shadow-2xl` |
| `<Skeleton>` for loading | Inline `animate-pulse` div blocks |
| `<EmptyState>` for "no results" | Custom-built "nothing here" markup |
| Per-page `INPUT` const for form fields | Long inline form-input className strings |
| `ACCENT` constant for type-tinted wizards | Scattered `bg-[var(--info)]` calls throughout |
| Lucide-react icons | Any other icon library |
| Token in className: `border-[var(--success)]/20` | Custom semantic var: `border-[var(--success-border)]` (alias still works, but canonical is cleaner) |

---

## When adding a new dashboard page

1. **Pick the archetype** (list / form / hub / wizard). Follow that skeleton.
2. **Create the route** under `app/dashboard/[feature]/page.tsx` (`'use client'` at the top).
3. **Top spacing:** use `<PageHeader>` OR add `pt-6` on the outer wrapper. Never both.
4. **Compose with primitives.** Reach for `<Card>`, `<KpiGrid>`, `<StatCard>`, `<EmptyState>`, `<Skeleton>`, `<Toolbar>`, `<DataTable>`, `<StatusPill>`, `<SideDrawer>`, `<ConfirmDialog>`, `<CurrencyInput>`, `<DateRangePicker>` before building inline.
5. **Sizing discipline.** Default to compact. If you're typing `text-lg`, `text-xl`, `font-bold` (in a card title), `w-12`, `w-14`, `rounded-2xl`, or `p-8` — stop and re-read the Sizing table above.
6. **Focus rings** on every interactive element.
7. **Data fetching via a `useX` hook** from `src/hooks/`. Never raw Supabase in a client component. Never `useEffect` for fetching (debounced UI logic is fine).
8. **Add a nav link** in `src/components/dashboard/Sidebar.tsx` (`NAV` or `BOTTOM_NAV` array).
9. **Verify:** `npx tsc --noEmit` + `npm run lint` + `/verify` + manual toggle in light AND dark mode. Run a residual grep for hardcoded Tailwind colors:
   ```bash
   grep -nE "bg-(white|gray|zinc|emerald|red|amber|yellow|blue|indigo|purple|pink|violet|sky|rose|fuchsia)|text-(gray|zinc|emerald|red|amber|yellow|blue|indigo|purple|pink|violet|sky|rose|fuchsia)|border-(gray|zinc|emerald|amber|indigo|purple|violet)|backdrop-blur-3xl|dark:bg-|dark:text-|dark:border-|dark:hover:" app/dashboard/[feature]
   ```
   Expected: zero hits (acceptable false positives: `text-[var(--text-on-brand)]` style refs that look like color words; `bg-white/N` opacity overlays on brand-tokened hero cards; literal-white toggle knobs).

If the page looks at home next to any existing dashboard page (overview, analytics, products, settings), you're done.

---

## When the design rule and the spec disagree

This file always wins over an older spec in `docs/superpowers/specs/`. Specs are point-in-time records of one overhaul; this rule file is the living source of truth. If you find a discrepancy, update this file in the same commit as the code change.

---

## Reference

- Token source: `app/globals.css`
- Theme context: `src/contexts/DashboardThemeContext.tsx`
- Shell: `src/components/dashboard/{Sidebar,TopBar,ImagePickerModal}.tsx`
- Primitives: `src/components/ui/*`
- Layout: `app/dashboard/layout.tsx`
- Overhaul spec (origin of this design): `docs/superpowers/specs/2026-06-04-dashboard-ui-overhaul-design.md`
- Implementation plan (origin of this design): `docs/superpowers/plans/2026-06-04-dashboard-ui-overhaul.md`
