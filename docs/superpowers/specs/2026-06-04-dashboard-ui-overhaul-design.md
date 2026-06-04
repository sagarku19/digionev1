---
noteId: "3fa7a1005fac11f1b5532decc08dd652"
tags: []

---

# Dashboard UI Overhaul — Design Spec

**Date:** 2026-06-04
**Owner:** Dashboard Agent
**Scope:** Visual + interaction overhaul of every page under `app/dashboard/*` for both light and dark mode.
**Non-scope:** Data, hooks, API routes, storefront, marketing, auth, Cashfree, Supabase schema, packages.

---

## 1. Direction

Anchor aesthetic: **Vercel-like**.

- Clean neutrals, generous breathing room.
- Near-monochrome surfaces with **brand red `#E83A2E`** as the only chromatic accent (CTAs, badges, active states, avatar background).
- Soft 1px borders, subtle elevation, comfortable density (UI text 13–15px).
- Both light and dark are first-class; tokens flip cleanly.

Style alternatives considered and rejected: Linear (too dense for a mixed creator audience), Stripe (warmer cool-blue palette conflicts with brand red), Cal.com/Notion (radii + density trade off too much information per fold).

---

## 2. Token system — `app/globals.css`

**Strategy: extend, do not replace.** Every existing token in `:root` and `.dark` stays. New tokens are layered in.

### 2.1 Existing tokens (kept as-is)

| Token | Light | Dark |
|---|---|---|
| `--bg-primary` | `#ffffff` | `#0a0a0a` |
| `--bg-secondary` | `#fafafa` | `#111111` |
| `--bg-tertiary` | `#f4f4f5` | `#1a1a1a` |
| `--bg-elevated` | `#ffffff` | `#141415` |
| `--text-primary` | `#0a0a0a` | `#ededed` |
| `--text-secondary` | `#737373` | `#888888` |
| `--border` | `#e5e5e5` | `#262626` |
| `--accent` (monochrome button) | `#0a0a0a` | `#ededed` |
| `--accent-hover` | `#262626` | `#ffffff` |
| `--accent-fg` | `#ffffff` | `#0a0a0a` |
| `--brand` (DigiOne red) | `#E83A2E` | `#E83A2E` |
| `--brand-hover` | `#cc2e23` | `#cc2e23` |
| `--success` / `--warning` / `--danger` | `#16a34a` / `#d97706` / `#dc2626` | `#22c55e` / `#f59e0b` / `#f87171` |
| `--radius` / `-sm` / `-lg` | `10px` / `8px` / `16px` | same |

> **Naming nuance, preserved:** `--accent` is the monochrome button color (black in light / white in dark), **not** brand red. Brand red is `--brand`. Both meanings stay.

### 2.2 New tokens (layered in)

**Surfaces and borders:**

```css
:root {
  --surface:           var(--bg-elevated);
  --surface-hover:     #f7f7f8;
  --surface-muted:     var(--bg-secondary);

  --border-strong:     #d4d4d8;
  --border-subtle:     #f0f0f1;

  --text-tertiary:     #a3a3a3;
  --text-on-brand:     #ffffff;
}

.dark {
  --surface:           var(--bg-elevated);
  --surface-hover:     #1a1a1c;
  --surface-muted:     var(--bg-secondary);

  --border-strong:     #3a3a3d;
  --border-subtle:     #1a1a1c;

  --text-tertiary:     #525252;
  --text-on-brand:     #ffffff;
}
```

**Semantic surface pairs (badges, pills, banners):**

```css
:root {
  --info:        #2563eb;
  --info-bg:     #eff6ff;
  --success-bg:  #f0fdf4;
  --warning-bg:  #fffbeb;
  --danger-bg:   #fef2f2;
}

.dark {
  --info:        #60a5fa;
  --info-bg:     #1e293b;
  --success-bg:  #052e16;
  --warning-bg:  #422006;
  --danger-bg:   #450a0a;
}
```

**Radius, shadow, focus:**

```css
:root {
  --radius-md:     12px;
  --radius-pill:   999px;

  --shadow-xs:     0 1px 2px rgba(10, 10, 10, 0.04);
  --shadow-sm:     0 1px 2px rgba(10, 10, 10, 0.06), 0 1px 3px rgba(10, 10, 10, 0.04);
  --shadow-md:     0 4px 6px -1px rgba(10, 10, 10, 0.08), 0 2px 4px -2px rgba(10, 10, 10, 0.05);
  --shadow-lg:     0 10px 25px -3px rgba(10, 10, 10, 0.10), 0 4px 10px -4px rgba(10, 10, 10, 0.06);

  --focus-ring:    0 0 0 3px rgba(232, 58, 46, 0.20);
}

.dark {
  --shadow-xs:     0 1px 2px rgba(0, 0, 0, 0.30);
  --shadow-sm:     0 1px 2px rgba(0, 0, 0, 0.40), 0 1px 3px rgba(0, 0, 0, 0.30);
  --shadow-md:     0 4px 6px -1px rgba(0, 0, 0, 0.45), 0 2px 4px -2px rgba(0, 0, 0, 0.35);
  --shadow-lg:     0 10px 25px -3px rgba(0, 0, 0, 0.50), 0 4px 10px -4px rgba(0, 0, 0, 0.40);

  --focus-ring:    0 0 0 3px rgba(232, 58, 46, 0.35);
}
```

### 2.3 Type scale (Tailwind utilities — no new vars)

| Use | Class |
|---|---|
| Table cells, captions, meta | `text-[13px]` |
| Default body / form labels | `text-sm` (14px) |
| Page-level prose | `text-base` (15–16px) |
| Section heading | `text-lg font-semibold` |
| Page title | `text-2xl font-semibold font-display` (Bricolage) |
| KPI value | `text-2xl font-bold` |

---

## 3. Shell refactor — Phase 1

Foundation that must land before any page work.

### 3.1 Token commit

`app/globals.css` — append the Section 2.2 token blocks. No existing var removed or renamed.

### 3.2 Layout

`app/dashboard/layout.tsx`:

- Reconcile sidebar width: `md:pl-[248px]` is currently 8px short of the sidebar's `w-[256px]`. Use `md:pl-[256px]`.
- Ensure `<main>` (or its parent) carries `id="dashboard-root"` so the `.dark` class application matches the rule in `CLAUDE.md` (Theming System → Dashboard).
- Keep `max-w-[1200px]` container.
- Editor route short-circuit unchanged.

### 3.3 Sidebar — `src/components/dashboard/Sidebar.tsx`

Already 95% tokenized. Light pass only:

- Mobile hamburger button: drop the hardcoded `text-gray-700`; use `text-[var(--text-secondary)]`.
- "Free Plan" gradient badge: swap `amber-500`/`amber-400` hardcodes for `var(--warning)` + `var(--warning-bg)`.
- Replace `shadow-2xl` on mobile drawer with `shadow-[var(--shadow-lg)]`.
- Normalize widths: sidebar stays `w-[256px]`; layout pad already matches after 3.2.

No structural changes. No nav rewrites.

### 3.4 TopBar — `src/components/dashboard/TopBar.tsx`

Re-skin chrome:

- Background `var(--bg-primary)`, bottom border `var(--border-subtle)`.
- Search input → `var(--surface-muted)` background, focus ring uses `--focus-ring`, focused border `--border-strong`.
- Theme toggle and notification buttons → hover background `var(--surface-hover)`, icon color `var(--text-secondary)`.

No structural changes.

### 3.5 ImagePickerModal — `src/components/dashboard/ImagePickerModal.tsx`

Re-skin modal chrome: `var(--surface)` panel, `var(--border)` border, `--shadow-lg` shadow, `--radius-lg` radius. Buttons follow the convention in Section 4.4 below.

---

## 4. Primitives — Phase 1.5

Re-skin the existing 8, add 5 new ones. All live in `src/components/ui/`.

### 4.1 Re-skinned (existing)

| Primitive | Key change |
|---|---|
| `PageHeader` | Title `text-2xl font-semibold font-display`, subtitle `text-sm text-[var(--text-secondary)]`, right-side actions slot. Top margin `mt-6`, bottom `mb-4`. |
| `StatCard` | Surface `var(--surface)`, border `var(--border)`, hover `var(--surface-hover)`, `--shadow-xs` at rest. Delta tag uses `--success-bg` / `--success` (positive) or `--danger-bg` / `--danger` (negative). |
| `DataTable` | Header `text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]`, row hover `var(--surface-hover)`, dividers `--border-subtle`, sticky header, empty-state slot. |
| `StatusPill` | Map status → `bg-[var(--{semantic}-bg)] text-[var(--{semantic})]`. Radius `--radius-pill`, font `text-[11px] font-medium`. |
| `SideDrawer` | Surface `--surface`, overlay `bg-black/50 backdrop-blur-sm`, left border `--border`, `--shadow-lg`. |
| `ConfirmDialog` | Radius `--radius-lg`, `--shadow-lg`. Destructive button `bg-[var(--danger)] text-[var(--text-on-brand)]`. |
| `CurrencyInput` | Background `var(--surface-muted)`, focused border `--border-strong`, focus ring `--focus-ring`. |
| `DateRangePicker` | Popover `var(--surface)` + `--shadow-md` + `--radius-lg`. Selected range cell: `bg-[color-mix(in_srgb,var(--brand)_10%,transparent)]` with `text-[var(--brand)]`. |

### 4.2 New

| New primitive | Purpose |
|---|---|
| `Card` | Generic surface block. `var(--surface)` + `border-[var(--border)]` + `rounded-[var(--radius-lg)]` + `shadow-[var(--shadow-xs)]`. Optional `padded` and `hoverable` props. |
| `EmptyState` | Icon (lucide-react) + title + description + optional CTA. Centered, `py-12 px-6`. |
| `Skeleton` | `div` with the existing `@keyframes shimmer`. Props: `className` (width/height), `rounded`. |
| `KpiGrid` | Responsive grid `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3`. Children are `StatCard`s. |
| `Toolbar` | Filter row: search slot + filter slot + view-toggle slot + actions slot. Horizontal flex with `gap-2`, wraps on narrow viewports. |

### 4.3 Recharts theming

Apply once in chart wrappers (no global config):

- Axis stroke / grid: `var(--border-subtle)`
- Tick text: `var(--text-tertiary)`
- Tooltip: `bg-[var(--surface)]` + `border-[var(--border)]` + `shadow-[var(--shadow-md)]` + `rounded-[var(--radius-md)]`
- Primary series stroke: `var(--brand)`
- Secondary series: `var(--text-secondary)`

### 4.4 Button conventions (no new component yet — utility patterns)

| Variant | Classes |
|---|---|
| Primary (brand) | `bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)]` |
| Primary (mono) | `bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)]` |
| Secondary | `bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)]` |
| Ghost | `text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]` |
| Destructive | `bg-[var(--danger)] hover:opacity-90 text-[var(--text-on-brand)]` |

All buttons share `rounded-[var(--radius-sm)] text-sm font-medium px-3 py-2 transition focus:outline-none focus:shadow-[var(--focus-ring)]`.

---

## 5. Page sweep — Phase 2

6 batches, ordered by visibility and primitive-reuse density.

| Batch | Folders | Validates |
|---|---|---|
| **B1** | `dashboard/` (root overview) | `KpiGrid`, `Card`, `Toolbar`, `EmptyState`, `Skeleton` |
| **B2** | `analytics/`, `earnings/`, `payouts/` | `Card` + `KpiGrid` + recharts theming |
| **B3** | `products/`, `orders/`, `customers/` | `DataTable`, `Toolbar`, `StatusPill`, `SideDrawer`, `ConfirmDialog` |
| **B4** | `sites/` (index only), `media/` | Card grids, image-picker chrome |
| **B5** | `marketing/*` (coupons, leads, affiliates, referrals, services, community), `automation/`, `autodm/` | Reuses B3 primitives |
| **B6** | `notifications/`, `integration/`, `settings/*`, `help/` | `CurrencyInput`, `DateRangePicker`, `ConfirmDialog`, form chrome |

### 5.1 Per-batch loop

1. Open every `page.tsx` and dashboard-only child component in the batch.
2. Replace tokens:
   - Hardcoded hex → matching `var(--*)`.
   - `bg-white` / `bg-gray-*` → `bg-[var(--surface)]` or a `--bg-*` token.
   - `text-gray-*` → `text-[var(--text-primary|secondary|tertiary)]`.
   - `border-gray-*` → `border-[var(--border)]` or `--border-subtle`.
3. Replace inline card / empty-state / skeleton chrome with the new primitives.
4. Toggle theme via `useTheme()` once per batch; eyeball both modes in `npm run dev`.
5. Run `npx tsc --noEmit` + `npm run lint` + `/verify`.
6. Grep the batch for residual `#[0-9a-fA-F]{3,6}`, `bg-white`, `bg-gray-`, `text-gray-`, `border-gray-`.
7. Commit.

### 5.2 Out of scope (confirmed)

- `app/dashboard/sites/edit/*` — full-screen editor, bypasses dashboard chrome.
- Anything outside `app/dashboard/**`, `src/components/dashboard/**`, `src/components/ui/**`.
- Data hooks, query keys, mutations, API routes, packages.
- `DashboardThemeContext` API surface.

---

## 6. Verification

Lane 1 (local self-check, per CLAUDE.md / `.claude/rules/verification.md`):

| Step | Command |
|---|---|
| Type-check | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Rule check | `/verify` |
| Manual | `npm run dev` → toggle theme → walk every page in batch |
| Residual scan | grep for `#[0-9a-fA-F]{3,6}`, `bg-white`, `bg-gray-`, `text-gray-`, `border-gray-` inside batch files |

All five must pass before commit.

---

## 7. Commit cadence

8 commits, all direct to `main`:

```
dashboard(tokens):    add SaaS token layer to globals.css
dashboard(shell):     re-skin sidebar, topbar, layout, primitives
dashboard(b1-overview):   re-skin overview to SaaS tokens
dashboard(b2-money):      re-skin analytics/earnings/payouts to SaaS tokens
dashboard(b3-commerce):   re-skin products/orders/customers to SaaS tokens
dashboard(b4-content):    re-skin sites/media to SaaS tokens
dashboard(b5-growth):     re-skin marketing/automation/autodm to SaaS tokens
dashboard(b6-account):    re-skin notifications/integration/settings/help to SaaS tokens
```

---

## 8. Rules that apply

Drawn from `CLAUDE.md` and `.claude/rules/`:

- Dashboard UI uses CSS variables. Never hardcode hex inside dashboard components.
- Dark mode via `.dark` class on `#dashboard-root` and `<html>`. Use `useTheme()` from `DashboardThemeContext` — no parallel theme system.
- `lucide-react` is the only icon library.
- Tailwind utilities only. No new `.css` files — extend `app/globals.css` only.
- No `useEffect` for data fetching. No `console.log`. No new packages.
- Brand red `#E83A2E` is reserved for CTAs, badges, active states, avatar background.
- Tailwind v4, Next.js 16 App Router, strict TS — no `any`.
- Self-documenting names. No comments explaining what code does.

## 9. Don't touch

- `app/api/**`, `src/hooks/**`, `src/lib/**`, `supabase/**`, `types/database.types.ts`.
- `app/(storefront)/**`, `app/(buyer)/**`, `app/(marketing)/**`, `app/(auth)/**`.
- `src/components/storefront/**`, `src/components/store/**`, `src/components/marketing/**`.
- Any data-fetching logic, query keys, or mutation flow.
- Cashfree, checkout, webhook, payments.
- `package.json`, lockfile.
- `DashboardThemeContext` API surface — consumers' styling changes only.

---

## 10. Companion deliverable

A reusable design-system reference for **every future dashboard page** is written to `.claude/rules/dashboard-design.md` and indexed in `CLAUDE.md`. That doc — not this spec — is the long-lived source of truth for token vocabulary, primitive catalog, and the visual language. This spec is for the one-time overhaul; the rule file is for everything that comes after.
