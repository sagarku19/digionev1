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
| `--surface-muted` | Subtle inset (search input bg, read-only field) |
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

Always pair: `bg-[var(--success-bg)] text-[var(--success)]` etc.

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

### Focus

| Token | Use |
|---|---|
| `--focus-ring` | Every focusable surface — `focus:shadow-[var(--focus-ring)]` |

---

## Type scale

Use Tailwind utilities. No custom font-size vars.

| Use | Class |
|---|---|
| Table cells, captions, meta | `text-[13px]` |
| Default body / form labels | `text-sm` (14px) |
| Page-level prose | `text-base` (15–16px) |
| Section heading | `text-lg font-semibold` |
| Page title | `text-2xl font-semibold font-display` (Bricolage) |
| KPI value | `text-2xl font-bold` |

Fonts: `--font-sans` (Inter) for everything except `h1/h2/h3/.font-display` which use `--font-display` (Bricolage).

---

## Primitive catalog

All primitives live in `src/components/ui/`. Always reach for these before writing inline UI.

### Layout

| Primitive | When to use |
|---|---|
| `Card` | Any bordered surface block. `var(--surface)` + `--border` + `--radius-lg` + `--shadow-xs`. |
| `KpiGrid` | Stat grid at top of a page. Wraps `StatCard`s in responsive 1/2/4-column grid. |
| `Toolbar` | Filter row above a list: search + filters + view-toggle + actions. |
| `PageHeader` | Title + subtitle + actions slot above every page. |

### Data display

| Primitive | When to use |
|---|---|
| `DataTable` | Any tabular list. Hover `--surface-hover`, dividers `--border-subtle`, sticky header, empty-state slot. |
| `StatCard` | KPI card. Number + label + optional delta. Delta uses `--success-bg/--success` or `--danger-bg/--danger`. |
| `StatusPill` | Status badge. Pass `status="success" \| "warning" \| "danger" \| "info"`. |
| `EmptyState` | When a list is empty. Icon + title + description + optional CTA. |
| `Skeleton` | Loading placeholder. Wraps the shimmer animation. |

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

All buttons share: `rounded-[var(--radius-sm)] text-sm font-medium px-3 py-2 transition focus:outline-none focus:shadow-[var(--focus-ring)]`.

---

## Page anatomy

Every dashboard page follows the same skeleton:

```
<PageHeader title="…" subtitle="…" actions={…} />
<KpiGrid>  {/* optional, top of analytics-style pages */}
  <StatCard … />
</KpiGrid>
<Toolbar>  {/* optional, for any list */}
  search · filters · view toggle · actions
</Toolbar>
<Card>  {/* main content surface */}
  <DataTable … />  {/* or chart, or form, or grid */}
</Card>
```

Page-level vertical spacing: `space-y-6`. Card-internal padding: `p-5` (small) or `p-6` (default).

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
| Light pass via `useTheme()` | Hardcode `dark:` variants for every color |
| Lucide-react icons | Any other icon library |

---

## When adding a new dashboard page

1. Create the route under `app/dashboard/[feature]/page.tsx` (`'use client'`).
2. Top of file: `<PageHeader title=… subtitle=… actions={…} />`.
3. If KPIs: `<KpiGrid>` of `<StatCard>`s.
4. If list: `<Toolbar>` then `<Card>` wrapping `<DataTable>`.
5. Data fetching via a `useX` hook from `src/hooks/` — never raw Supabase, never `useEffect`.
6. Add nav link in `src/components/dashboard/Sidebar.tsx` (`NAV` or `BOTTOM_NAV` array).
7. Verify with `npx tsc --noEmit` + `npm run lint` + `/verify` + manual light/dark toggle.

The page should look at home next to any existing dashboard page without further styling.

---

## Reference

- Token source: `app/globals.css`
- Theme context: `src/contexts/DashboardThemeContext.tsx`
- Shell: `src/components/dashboard/{Sidebar,TopBar,ImagePickerModal}.tsx`
- Primitives: `src/components/ui/*`
- Layout: `app/dashboard/layout.tsx`
- Overhaul spec (this design's origin): `docs/superpowers/specs/2026-06-04-dashboard-ui-overhaul-design.md`
