---
noteId: "c37181205fae11f1b5532decc08dd652"
tags: []

---

# Dashboard UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize every page under `app/dashboard/*` into a cohesive Vercel-like SaaS UI that works in both light and dark mode, without touching data, hooks, API routes, or any non-dashboard surface.

**Architecture:** Layer a new design-token vocabulary into `app/globals.css` (extend, never replace), re-skin the dashboard shell (`Sidebar`, `TopBar`, layout) plus the 8 existing `src/components/ui/*` primitives, add 5 new primitives (`Card`, `EmptyState`, `Skeleton`, `KpiGrid`, `Toolbar`), then sweep the 15 dashboard route folders in 6 batches. Each commit lands directly to `main` after type-check + lint + `/verify` + manual eyeball.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript 5 (strict) · Tailwind CSS v4 · lucide-react · framer-motion · recharts · TanStack Query v5 · Zustand · DigiOne brand red `#E83A2E`.

**Spec source of truth:** `docs/superpowers/specs/2026-06-04-dashboard-ui-overhaul-design.md`
**Design language reference:** `.claude/rules/dashboard-design.md` (auto-loaded — keep in sync if anything in this plan deviates)

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `app/globals.css` | modify | All design tokens (extended, never replaced) |
| `app/dashboard/layout.tsx` | modify | Sidebar width reconcile + `#dashboard-root` id |
| `src/components/dashboard/Sidebar.tsx` | modify | Replace residual hardcoded colors with tokens |
| `src/components/dashboard/TopBar.tsx` | modify | Re-skin chrome to new tokens |
| `src/components/dashboard/ImagePickerModal.tsx` | modify | Re-skin modal chrome |
| `src/components/ui/PageHeader.tsx` | rewrite | Use real tokens, add `actions` slot per spec |
| `src/components/ui/StatCard.tsx` | rewrite | Remove all hardcoded Tailwind colors |
| `src/components/ui/DataTable.tsx` | rewrite | New header + row + pagination styling |
| `src/components/ui/StatusPill.tsx` | rewrite | Use `--{semantic}-bg` / `--{semantic}` pairs |
| `src/components/ui/SideDrawer.tsx` | rewrite | Token-based surfaces and shadows |
| `src/components/ui/ConfirmDialog.tsx` | rewrite | Token-based destructive vs primary |
| `src/components/ui/CurrencyInput.tsx` | rewrite | Surface-muted bg, focus ring |
| `src/components/ui/DateRangePicker.tsx` | rewrite | Real tokens |
| `src/components/ui/Card.tsx` | **create** | Generic surface block |
| `src/components/ui/EmptyState.tsx` | **create** | Icon + title + description + CTA |
| `src/components/ui/Skeleton.tsx` | **create** | Shimmer placeholder |
| `src/components/ui/KpiGrid.tsx` | **create** | Responsive 1/2/4-col grid wrapping `StatCard`s |
| `src/components/ui/Toolbar.tsx` | **create** | Filter row composition |
| `app/dashboard/page.tsx` | modify (B1) | Overview re-skin |
| `app/dashboard/analytics/page.tsx` | modify (B2) | + child components |
| `app/dashboard/earnings/page.tsx` | modify (B2) | + child components |
| `app/dashboard/payouts/page.tsx` | modify (B2) | + child components |
| `app/dashboard/products/**` | modify (B3) | All page + child components |
| `app/dashboard/orders/**` | modify (B3) | All page + child components |
| `app/dashboard/customers/**` | modify (B3) | All page + child components |
| `app/dashboard/sites/page.tsx` and child components (NOT `sites/edit/*`) | modify (B4) | Index + management surfaces |
| `app/dashboard/media/**` | modify (B4) | All page + child components |
| `app/dashboard/marketing/**` | modify (B5) | All pages + child components |
| `app/dashboard/automation/**` | modify (B5) | All pages + child components |
| `app/dashboard/autodm/**` | modify (B5) | All pages + child components |
| `app/dashboard/notifications/**` | modify (B6) | All pages + child components |
| `app/dashboard/integration/**` | modify (B6) | All pages + child components |
| `app/dashboard/settings/**` | modify (B6) | All pages + child components |
| `app/dashboard/help/**` | modify (B6) | All pages + child components |

**Out of scope (never touch):**
- `app/dashboard/sites/edit/**` (full-screen editor, no dashboard chrome)
- `app/api/**`, `src/hooks/**`, `src/lib/**`, `supabase/**`, `types/database.types.ts`
- `app/(storefront|buyer|marketing|auth)/**`
- `src/components/{storefront,store,marketing}/**`
- `package.json`, lockfiles, `DashboardThemeContext` API surface

---

## Notes on the codebase before you start

1. **No tests exist.** Per `.claude/rules/verification.md`, the project uses type-check + lint + `/verify` slash command + manual click-through. There is no TDD step in this plan because there is no test runner configured. Don't add one — that's out of scope.
2. **The existing primitives reference token names that do not exist in `globals.css`.** Names like `--color-text-tertiary`, `--surface-color`, `--color-success-subtle` are used in `PageHeader`, `StatCard`, `DataTable`, etc., but `globals.css` only defines `--text-primary/-secondary`, `--success`, `--bg-elevated`, plus a few legacy `--color-*` aliases. Adding the new tokens in Task 1 *plus* rewriting the primitives in Tasks 6-13 fixes both styling and broken references in one shot.
3. **`--accent` is the monochrome button color** (black in light / white in dark). It is **not** brand red. Brand red is `--brand`. Don't unify them.
4. **`#dashboard-root`**: `CLAUDE.md` says the `.dark` class is applied to `#dashboard-root` and `<html>`. That id is not currently on `app/dashboard/layout.tsx`. Task 2 adds it.
5. **Frontmatter** — files under `docs/` and `.claude/rules/` in this repo may receive an auto-injected Foam noteId frontmatter block. That's fine, don't strip it.

---

## Group 1 — Tokens

**Commit at end:** `dashboard(tokens): add SaaS token layer to globals.css`

### Task 1: Add new design tokens to `app/globals.css`

**Files:**
- Modify: `app/globals.css` — append to existing `:root` and `.dark` blocks only; do not delete or rename any existing var.

- [ ] **Step 1: Insert new vars into `:root` block**

Find the existing `:root { ... }` block (starts around line 34). Add the following inside it, after the existing `--brand-gradient` line and **before** the `Legacy aliases` comment:

```css
  /* Surfaces */
  --surface:        var(--bg-elevated);
  --surface-hover:  #f7f7f8;
  --surface-muted:  var(--bg-secondary);

  /* Borders */
  --border-strong:  #d4d4d8;
  --border-subtle:  #f0f0f1;

  /* Text */
  --text-tertiary:  #a3a3a3;
  --text-on-brand:  #ffffff;

  /* Semantic surface pairs */
  --info:        #2563eb;
  --info-bg:     #eff6ff;
  --success-bg:  #f0fdf4;
  --warning-bg:  #fffbeb;
  --danger-bg:   #fef2f2;

  /* Radius */
  --radius-md:    12px;
  --radius-pill:  999px;

  /* Shadow */
  --shadow-xs: 0 1px 2px rgba(10, 10, 10, 0.04);
  --shadow-sm: 0 1px 2px rgba(10, 10, 10, 0.06), 0 1px 3px rgba(10, 10, 10, 0.04);
  --shadow-md: 0 4px 6px -1px rgba(10, 10, 10, 0.08), 0 2px 4px -2px rgba(10, 10, 10, 0.05);
  --shadow-lg: 0 10px 25px -3px rgba(10, 10, 10, 0.10), 0 4px 10px -4px rgba(10, 10, 10, 0.06);

  /* Focus */
  --focus-ring: 0 0 0 3px rgba(232, 58, 46, 0.20);
```

Also add new legacy aliases (so existing `--color-text-tertiary` and `--surface-color` references in primitives don't break the moment globals.css ships before primitive rewrites):

```css
  /* Legacy aliases for in-flight primitive references */
  --color-text-tertiary:    var(--text-tertiary);
  --surface-color:          var(--surface);
  --color-success-subtle:   var(--success-bg);
  --color-warning-subtle:   var(--warning-bg);
  --color-danger-subtle:    var(--danger-bg);
  --color-success:          var(--success);
  --color-warning:          var(--warning);
  --color-danger:           var(--danger);
  --color-text-primary:     var(--text-primary);
  --color-text-secondary:   var(--text-secondary);
```

These aliases will be removed in a follow-up commit after every primitive references the canonical name — leave them in for the duration of this overhaul.

- [ ] **Step 2: Mirror the new vars in the `.dark` block**

Find the existing `.dark { ... }` block. Add the following inside it, after the existing `--danger` line and **before** the `Legacy aliases` comment:

```css
  --surface:        var(--bg-elevated);
  --surface-hover:  #1a1a1c;
  --surface-muted:  var(--bg-secondary);

  --border-strong:  #3a3a3d;
  --border-subtle:  #1a1a1c;

  --text-tertiary:  #525252;
  --text-on-brand:  #ffffff;

  --info:        #60a5fa;
  --info-bg:     #1e293b;
  --success-bg:  #052e16;
  --warning-bg:  #422006;
  --danger-bg:   #450a0a;

  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.30);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.40), 0 1px 3px rgba(0, 0, 0, 0.30);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.45), 0 2px 4px -2px rgba(0, 0, 0, 0.35);
  --shadow-lg: 0 10px 25px -3px rgba(0, 0, 0, 0.50), 0 4px 10px -4px rgba(0, 0, 0, 0.40);

  --focus-ring: 0 0 0 3px rgba(232, 58, 46, 0.35);

  /* Legacy aliases for in-flight primitive references */
  --color-text-tertiary:    var(--text-tertiary);
  --surface-color:          var(--surface);
  --color-success-subtle:   var(--success-bg);
  --color-warning-subtle:   var(--warning-bg);
  --color-danger-subtle:    var(--danger-bg);
  --color-success:          var(--success);
  --color-warning:          var(--warning);
  --color-danger:           var(--danger);
  --color-text-primary:     var(--text-primary);
  --color-text-secondary:   var(--text-secondary);
```

- [ ] **Step 3: Verify it compiles**

Run:
```bash
npx tsc --noEmit
npm run lint
```
Expected: no new errors. (Pre-existing warnings are fine.)

- [ ] **Step 4: Smoke-test in dev**

Run:
```bash
npm run dev
```
Open `http://localhost:3000/dashboard`. Confirm the page renders. Toggle theme. Nothing should look different yet — this commit only adds tokens.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "dashboard(tokens): add SaaS token layer to globals.css"
```

---

## Group 2 — Shell + Primitives

**Commit at end:** `dashboard(shell): re-skin sidebar, topbar, layout, primitives`

All tasks in this group share a single commit. Run verification (type-check + lint + manual eyeball in both light and dark) once at the end, before committing.

### Task 2: Reconcile dashboard layout

**Files:**
- Modify: `app/dashboard/layout.tsx`

- [ ] **Step 1: Read current state**

The file currently uses `md:pl-[248px]` while `Sidebar.tsx` is `w-[256px]` — 8px gap. Also missing `id="dashboard-root"` on the main container despite `CLAUDE.md` documenting it.

- [ ] **Step 2: Replace the file**

Replace the entire contents of `app/dashboard/layout.tsx` with:

```tsx
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { DashboardThemeProvider } from '@/contexts/DashboardThemeContext';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEditorPage = pathname?.startsWith('/dashboard/sites/edit');

  if (isEditorPage) {
    return (
      <div id="dashboard-root" className="flex-1 flex flex-col min-w-0 min-h-screen bg-[var(--bg-primary)]">
        {children}
      </div>
    );
  }

  return (
    <div id="dashboard-root" className="min-h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <div className="flex-1 flex flex-col md:pl-[256px] min-w-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
        <TopBar />
        <main className="flex-1 px-4 md:px-6 pb-20 overflow-x-hidden bg-[var(--bg-primary)]">
          <div className="max-w-[1200px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardThemeProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardThemeProvider>
  );
}
```

### Task 3: Sidebar light pass

**Files:**
- Modify: `src/components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Replace the hardcoded mobile hamburger color**

Find:
```tsx
className="md:hidden fixed top-2.5 left-3 p-1.5 text-gray-700 dark:text-[var(--text-secondary)] transition-all active:scale-95"
```
Replace with:
```tsx
className="md:hidden fixed top-2.5 left-3 p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-95"
```

- [ ] **Step 2: Replace the mobile drawer shadow**

Find:
```tsx
w-[256px] flex flex-col shadow-2xl md:shadow-none
```
Replace with:
```tsx
w-[256px] flex flex-col shadow-[var(--shadow-lg)] md:shadow-none
```

- [ ] **Step 3: Replace the "Free Plan" amber hardcodes**

Find the `Plan suggestion` block in the profile dropdown (currently uses `from-amber-500/10`, `to-orange-500/10`, `border-amber-400/20`, `text-amber-500`, `text-amber-600`, `dark:text-amber-400`, `bg-amber-500`, `hover:bg-amber-600`). Replace the whole block with:

```tsx
                <div className="px-2 pt-2 pb-1">
                  <div className="rounded-[var(--radius-sm)] bg-[var(--warning-bg)] border border-[var(--warning)]/20 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3 h-3 text-[var(--warning)]" />
                      <span className="text-[11px] font-bold text-[var(--warning)]">Free Plan</span>
                    </div>
                    <p className="text-[10.5px] text-[var(--text-secondary)] leading-relaxed mb-2">Unlock lower fees, priority support and more.</p>
                    <Link
                      href="/dashboard/settings/subscription"
                      onClick={() => { close(); setProfileMenuOpen(false); }}
                      className="block w-full text-center py-1 bg-[var(--warning)] hover:opacity-90 text-[var(--text-on-brand)] rounded-md text-[11px] font-semibold transition"
                    >
                      Upgrade to Pro
                    </Link>
                  </div>
                </div>
```

- [ ] **Step 4: Verify no Tailwind color literals remain**

Run:
```bash
npx tsc --noEmit
```
Then grep:
```bash
grep -n "text-gray-\|bg-gray-\|amber-\|orange-" src/components/dashboard/Sidebar.tsx
```
Expected: no matches.

### Task 4: TopBar re-skin

**Files:**
- Modify: `src/components/dashboard/TopBar.tsx`

- [ ] **Step 1: Read the current file**

Open `src/components/dashboard/TopBar.tsx`. Understand its structure (search input, theme toggle, notifications bell, profile area, etc.).

- [ ] **Step 2: Apply transformation rules**

For every visual className in this file, apply these substitutions (in order — earlier rules take precedence):

| Find | Replace with |
|---|---|
| `bg-white` / `dark:bg-zinc-900` / `dark:bg-zinc-950` | `bg-[var(--bg-primary)]` |
| `border-gray-200` / `dark:border-zinc-800` (top bar bottom border) | `border-[var(--border-subtle)]` |
| `border-gray-200` / `dark:border-zinc-800` (everything else) | `border-[var(--border)]` |
| `text-gray-900` / `dark:text-white` | `text-[var(--text-primary)]` |
| `text-gray-500` / `text-gray-600` / `dark:text-gray-400` | `text-[var(--text-secondary)]` |
| `text-gray-400` / `dark:text-gray-500` | `text-[var(--text-tertiary)]` |
| `bg-gray-50` / `bg-gray-100` / `dark:bg-zinc-800` (input background) | `bg-[var(--surface-muted)]` |
| `hover:bg-gray-100` / `dark:hover:bg-zinc-800` | `hover:bg-[var(--surface-hover)]` |
| `focus:ring-blue-500` / `focus:ring-indigo-500` / any blue/indigo focus | `focus:shadow-[var(--focus-ring)]` (also drop `focus:ring-1` if present — shadow replaces it) |
| `focus:border-blue-500` / similar | `focus:border-[var(--border-strong)]` |
| `rounded-md` / `rounded-lg` on inputs | `rounded-[var(--radius-md)]` |
| `rounded-lg` on the search input wrapper | `rounded-[var(--radius-md)]` |

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
grep -nE "bg-(white|gray|zinc)|text-gray|border-gray|border-zinc|dark:(bg|text|border)-(white|gray|zinc)" src/components/dashboard/TopBar.tsx
```
Expected: no matches (other than possibly inside a logo path or theme-toggle icon — flag those for review).

### Task 5: ImagePickerModal re-skin

**Files:**
- Modify: `src/components/dashboard/ImagePickerModal.tsx`

- [ ] **Step 1: Read the file**

Open `src/components/dashboard/ImagePickerModal.tsx`.

- [ ] **Step 2: Apply the same transformation table as Task 4**

Plus these additional rules specific to a modal:

| Find | Replace with |
|---|---|
| Modal panel background `bg-white dark:bg-zinc-900` | `bg-[var(--surface)]` |
| Modal panel `shadow-xl` / `shadow-2xl` | `shadow-[var(--shadow-lg)]` |
| Modal panel `rounded-xl` / `rounded-2xl` | `rounded-[var(--radius-lg)]` |
| Overlay `bg-black/40` / `bg-black/50` | `bg-black/50 backdrop-blur-sm` |
| Primary CTA `bg-indigo-600` / `bg-blue-600` | `bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)]` |
| Secondary button | `bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)]` |

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
grep -nE "bg-(white|gray|zinc|indigo|blue|emerald|red|amber|orange)" src/components/dashboard/ImagePickerModal.tsx
```
Expected: no matches.

### Task 6: Rewrite `PageHeader`

**Files:**
- Rewrite: `src/components/ui/PageHeader.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
import { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  breadcrumbs?: ReactNode;
}

export function PageHeader({ title, description, action, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mt-6 mb-4">
      <div className="min-w-0">
        {breadcrumbs && (
          <div className="mb-2 text-sm text-[var(--text-tertiary)]">
            {breadcrumbs}
          </div>
        )}
        <h1 className="text-2xl font-semibold font-display text-[var(--text-primary)] tracking-tight truncate">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
```

### Task 7: Rewrite `StatCard`

**Files:**
- Rewrite: `src/components/ui/StatCard.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: LucideIcon;
  subValue?: string;
  className?: string;
}

export function StatCard({ label, value, trend, icon: Icon, subValue, className = '' }: StatCardProps) {
  return (
    <div
      className={`group relative bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] hover:bg-[var(--surface-hover)] transition-all duration-200 overflow-hidden ${className}`}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</h3>
        {Icon && (
          <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-semibold leading-none ${
                trend.isPositive
                  ? 'bg-[var(--success-bg)] text-[var(--success)]'
                  : 'bg-[var(--danger-bg)] text-[var(--danger)]'
              }`}
            >
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
          {subValue && (
            <span className="text-xs font-medium text-[var(--text-tertiary)] truncate">{subValue}</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Task 8: Rewrite `DataTable`

**Files:**
- Rewrite: `src/components/ui/DataTable.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pageSize?: number;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  emptyState?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  pageSize = 10,
  searchable = false,
  searchKeys = [],
  emptyState,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: 'asc' | 'desc' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  let processedData = [...data];
  if (searchable && searchQuery && searchKeys.length > 0) {
    const q = searchQuery.toLowerCase();
    processedData = processedData.filter(row =>
      searchKeys.some(key => String(row[key] ?? '').toLowerCase().includes(q))
    );
  }

  if (sortConfig) {
    processedData.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = processedData.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const handleSort = (key: keyof T) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  return (
    <div className="w-full bg-[var(--surface)] rounded-[var(--radius-lg)] border border-[var(--border)] shadow-[var(--shadow-xs)] overflow-hidden flex flex-col">
      {searchable && (
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide bg-[var(--surface-muted)] border-b border-[var(--border-subtle)]">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-6 py-3 font-semibold ${col.sortable ? 'cursor-pointer select-none group' : ''}`}
                  onClick={() => col.sortable && col.accessorKey && handleSort(col.accessorKey)}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && col.accessorKey && (
                      <span className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors">
                        {sortConfig?.key === col.accessorKey ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center text-[var(--text-tertiary)]">
                  {emptyState ? emptyState : 'No results found.'}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, i) => (
                <tr key={i} className="hover:bg-[var(--surface-hover)] transition-colors">
                  {columns.map((col, j) => (
                    <td key={j} className="px-6 py-4 text-[var(--text-primary)]">
                      {col.cell ? col.cell(row) : (col.accessorKey ? String(row[col.accessorKey] ?? '') : null)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-muted)]">
          <span className="text-sm text-[var(--text-secondary)]">
            Showing <span className="font-medium text-[var(--text-primary)]">{(safeCurrentPage - 1) * pageSize + 1}</span> to <span className="font-medium text-[var(--text-primary)]">{Math.min(safeCurrentPage * pageSize, processedData.length)}</span> of <span className="font-medium text-[var(--text-primary)]">{processedData.length}</span> results
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Task 9: Rewrite `StatusPill`

**Files:**
- Rewrite: `src/components/ui/StatusPill.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
export interface StatusPillProps {
  status: string;
  type?: 'order' | 'kyc' | 'payout' | 'general';
  className?: string;
}

export function StatusPill({ status, className = '' }: StatusPillProps) {
  const s = status.toLowerCase();

  let bg = 'bg-[var(--surface-muted)]';
  let text = 'text-[var(--text-secondary)]';

  if (['success', 'completed', 'paid', 'approved', 'active', 'verified'].includes(s)) {
    bg = 'bg-[var(--success-bg)]';
    text = 'text-[var(--success)]';
  } else if (['pending', 'processing', 'in_review', 'draft', 'requested'].includes(s)) {
    bg = 'bg-[var(--warning-bg)]';
    text = 'text-[var(--warning)]';
  } else if (['failed', 'rejected', 'cancelled', 'refunded', 'inactive'].includes(s)) {
    bg = 'bg-[var(--danger-bg)]';
    text = 'text-[var(--danger)]';
  } else if (['info', 'new'].includes(s)) {
    bg = 'bg-[var(--info-bg)]';
    text = 'text-[var(--info)]';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-pill)] text-[11px] font-medium tracking-wide capitalize ${bg} ${text} ${className}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
```

### Task 10: Rewrite `SideDrawer`

**Files:**
- Rewrite: `src/components/ui/SideDrawer.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
"use client";

import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

export function SideDrawer({ isOpen, onClose, title, children, footer, size = 'md' }: SideDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const widthMap = {
    md: 'w-full max-w-md',
    lg: 'w-full max-w-2xl',
    xl: 'w-full max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed right-0 top-0 bottom-0 ${widthMap[size]} bg-[var(--surface)] shadow-[var(--shadow-lg)] border-l border-[var(--border)] z-50 flex flex-col`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--surface-hover)] transition-colors focus:outline-none focus:shadow-[var(--focus-ring)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>

            {footer && (
              <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)]">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Task 11: Rewrite `ConfirmDialog`

**Files:**
- Rewrite: `src/components/ui/ConfirmDialog.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  requiredText?: string;
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  isDestructive = false, requiredText,
}: ConfirmDialogProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = !requiredText || text === requiredText;

  const handleConfirm = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onClose();
      setText('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={!loading ? onClose : undefined}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-md border border-[var(--border)] overflow-hidden"
          >
            <div className="px-6 py-5 flex items-start gap-4">
              <div
                className={`p-2.5 rounded-full shrink-0 mt-0.5 ${
                  isDestructive
                    ? 'bg-[var(--danger-bg)] text-[var(--danger)]'
                    : 'bg-[var(--info-bg)] text-[var(--info)]'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                  {description}
                </p>

                {requiredText && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Type <strong>{requiredText}</strong> to confirm:
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] text-sm"
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder={requiredText}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-[var(--surface-muted)] border-t border-[var(--border-subtle)] flex justify-end gap-3 flex-col-reverse sm:flex-row">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-3 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-[var(--radius-sm)] disabled:opacity-50 transition-colors focus:outline-none focus:shadow-[var(--focus-ring)]"
              >
                {cancelLabel}
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || !isValid}
                className={`px-3 py-2 text-sm font-medium text-[var(--text-on-brand)] rounded-[var(--radius-sm)] disabled:opacity-50 transition-colors focus:outline-none focus:shadow-[var(--focus-ring)] ${
                  isDestructive
                    ? 'bg-[var(--danger)] hover:opacity-90'
                    : 'bg-[var(--brand)] hover:bg-[var(--brand-hover)]'
                }`}
              >
                {loading ? 'Processing...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

### Task 12: Rewrite `CurrencyInput`

**Files:**
- Rewrite: `src/components/ui/CurrencyInput.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
"use client";

import { useState, ChangeEvent } from 'react';

export interface CurrencyInputProps {
  value: number;
  onChange: (val: number) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export function CurrencyInput({ value, onChange, label, error, disabled }: CurrencyInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());

  const handleBlur = () => {
    let parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed < 0) parsed = 0;
    setInputValue(parsed.toString());
    onChange(parsed);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
      setInputValue(val);
      if (val !== '' && val !== '.') {
        onChange(parseFloat(val));
      } else {
        onChange(0);
      }
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">{label}</label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-[var(--text-secondary)] text-sm">₹</span>
        </div>
        <input
          type="text"
          inputMode="decimal"
          className={`block w-full pl-7 pr-3 py-2 text-sm border rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-shadow ${
            error
              ? 'border-[var(--danger)] text-[var(--danger)] focus:border-[var(--danger)]'
              : 'border-[var(--border)] focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          placeholder="0.00"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
        />
      </div>
      {error && <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
```

### Task 13: Rewrite `DateRangePicker`

**Files:**
- Rewrite: `src/components/ui/DateRangePicker.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
"use client";

export interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  className?: string;
}

export function DateRangePicker({ startDate, endDate, onChange, className = '' }: DateRangePickerProps) {
  const inputClasses =
    'pl-3 pr-2 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] min-w-[130px] transition-shadow';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onChange(e.target.value, endDate)}
        className={inputClasses}
      />
      <span className="text-[var(--text-tertiary)] text-sm font-medium">to</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onChange(startDate, e.target.value)}
        className={inputClasses}
      />
    </div>
  );
}
```

### Task 14: Create `Card` primitive

**Files:**
- Create: `src/components/ui/Card.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { ReactNode, HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean | 'sm';
  hoverable?: boolean;
  children: ReactNode;
}

export function Card({ padded = true, hoverable = false, className = '', children, ...rest }: CardProps) {
  const padding = padded === 'sm' ? 'p-5' : padded ? 'p-6' : '';
  const hover = hoverable
    ? 'hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-sm)] transition-all duration-200'
    : '';

  return (
    <div
      className={`bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] ${padding} ${hover} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
```

### Task 15: Create `EmptyState` primitive

**Files:**
- Create: `src/components/ui/EmptyState.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] border border-[var(--border-subtle)] flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-[var(--text-tertiary)]" />
        </div>
      )}
      <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

### Task 16: Create `Skeleton` primitive

**Files:**
- Create: `src/components/ui/Skeleton.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

const radiusMap = {
  sm: 'rounded-[var(--radius-sm)]',
  md: 'rounded-[var(--radius-md)]',
  lg: 'rounded-[var(--radius-lg)]',
  full: 'rounded-full',
};

export function Skeleton({ rounded = 'md', className = '', style, ...rest }: SkeletonProps) {
  return (
    <div
      className={`${radiusMap[rounded]} bg-[var(--surface-muted)] ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(90deg, transparent 0%, var(--surface-hover) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.6s linear infinite',
        ...style,
      }}
      {...rest}
    />
  );
}
```

### Task 17: Create `KpiGrid` primitive

**Files:**
- Create: `src/components/ui/KpiGrid.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { ReactNode } from 'react';

export interface KpiGridProps {
  children: ReactNode;
  className?: string;
}

export function KpiGrid({ children, className = '' }: KpiGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}>
      {children}
    </div>
  );
}
```

### Task 18: Create `Toolbar` primitive

**Files:**
- Create: `src/components/ui/Toolbar.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { ReactNode } from 'react';

export interface ToolbarProps {
  search?: ReactNode;
  filters?: ReactNode;
  view?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function Toolbar({ search, filters, view, actions, className = '' }: ToolbarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {search && <div className="flex-1 min-w-[200px] max-w-md">{search}</div>}
      {filters && <div className="flex items-center gap-2">{filters}</div>}
      {view && <div className="flex items-center gap-2">{view}</div>}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

### Task 19: Verify, eyeball, commit Group 2

- [ ] **Step 1: Type check**

```bash
npx tsc --noEmit
```
Expected: no errors. If you see `Cannot find module '@/components/ui/Card'` from a page, that's expected — we haven't migrated pages yet. Pages still importing the old primitive shapes should keep working because we preserved every existing prop name and signature.

- [ ] **Step 2: Lint**

```bash
npm run lint
```
Expected: no new errors.

- [ ] **Step 3: Slash-command verify**

In Claude Code, run `/verify`. Address any rule-violation findings the project's verifier reports.

- [ ] **Step 4: Manual smoke**

```bash
npm run dev
```
Walk through:
- `/dashboard` (overview)
- `/dashboard/analytics`
- `/dashboard/orders`
- A page that opens a `SideDrawer` (e.g. customer detail) — confirm it slides in and looks right
- A `ConfirmDialog` flow if reachable
- A `DataTable` with pagination

In each: click the theme toggle in the TopBar and verify both light and dark mode look right.

- [ ] **Step 5: Commit Group 2**

```bash
git add app/dashboard/layout.tsx src/components/dashboard/Sidebar.tsx src/components/dashboard/TopBar.tsx src/components/dashboard/ImagePickerModal.tsx src/components/ui/
git commit -m "dashboard(shell): re-skin sidebar, topbar, layout, primitives"
```

---

## Group 3 — Batch B1: Overview

**Commit at end:** `dashboard(b1-overview): re-skin overview to SaaS tokens`

### Task 20: Re-skin the dashboard overview

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: any child components imported by `page.tsx` that live under `app/dashboard/` (not `src/components/dashboard/` — those are shared and already done) — if the page renders inline cards/lists, refactor them in place.

- [ ] **Step 1: Inventory the imports**

```bash
npx tsc --noEmit
```
Then read `app/dashboard/page.tsx` and list every component it uses that lives outside `src/components/ui/`. Touch every file in that list.

- [ ] **Step 2: Apply transformation table**

For every file in the batch, apply these substitutions:

| Find | Replace with |
|---|---|
| `bg-white` | `bg-[var(--surface)]` (if it's a card surface) or `bg-[var(--bg-primary)]` (if it's the page bg) |
| `bg-gray-50` / `bg-gray-100` / `dark:bg-zinc-800` / `dark:bg-zinc-900` (subtle) | `bg-[var(--surface-muted)]` |
| `border-gray-200` / `dark:border-zinc-800` (card / input) | `border-[var(--border)]` |
| `border-gray-100` / `dark:border-zinc-800/50` (hairline) | `border-[var(--border-subtle)]` |
| `text-gray-900` / `dark:text-white` | `text-[var(--text-primary)]` |
| `text-gray-600` / `text-gray-500` / `dark:text-gray-400` | `text-[var(--text-secondary)]` |
| `text-gray-400` / `dark:text-gray-500` | `text-[var(--text-tertiary)]` |
| `bg-emerald-*` / `text-emerald-*` (success) | `bg-[var(--success-bg)] text-[var(--success)]` |
| `bg-red-*` / `text-red-*` (danger) | `bg-[var(--danger-bg)] text-[var(--danger)]` |
| `bg-amber-*` / `bg-yellow-*` / `text-amber-*` / `text-yellow-*` (warning) | `bg-[var(--warning-bg)] text-[var(--warning)]` |
| `bg-blue-*` / `bg-indigo-*` / `text-blue-*` / `text-indigo-*` (info) | `bg-[var(--info-bg)] text-[var(--info)]` |
| Primary CTA `bg-indigo-600` / `bg-blue-600` etc. with white text | `bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)]` |
| Monochrome CTA `bg-black` / `bg-zinc-900` / `dark:bg-white` | `bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)]` |
| `shadow-sm` / `shadow` | `shadow-[var(--shadow-xs)]` |
| `shadow-md` / `shadow-lg` (on cards at rest) | `shadow-[var(--shadow-xs)]` |
| `shadow-xl` / `shadow-2xl` (modal / drawer only) | `shadow-[var(--shadow-lg)]` |
| `rounded-md` (input/button) | `rounded-[var(--radius-sm)]` for buttons, `rounded-[var(--radius-md)]` for inputs |
| `rounded-lg` / `rounded-xl` / `rounded-2xl` (card) | `rounded-[var(--radius-lg)]` |
| `rounded-full` (pill/avatar) | keep as `rounded-full` OR `rounded-[var(--radius-pill)]` (equivalent — pick one for consistency) |
| `dark:` overrides for color | delete (let the variable flip). Keep `dark:` only for things like logo asset swaps. |

- [ ] **Step 3: Replace inline UI with primitives where it makes sense**

In the overview:
- Wrap the KPI grid in `<KpiGrid>`; each KPI becomes `<StatCard label="..." value="..." trend={...} />`.
- Wrap each card surface in `<Card>` (no inline `bg-white border rounded-lg p-6`).
- Replace inline "no data" blocks with `<EmptyState icon={Icon} title="..." description="..." />`.
- Replace inline `animate-pulse` / shimmer divs with `<Skeleton className="h-4 w-32" />`.
- If there's a filter row above a list, wrap it in `<Toolbar search={...} filters={...} actions={...} />`.

Add imports:
```tsx
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { KpiGrid } from '@/components/ui/KpiGrid';
import { Toolbar } from '@/components/ui/Toolbar';
import { StatCard } from '@/components/ui/StatCard';
import { PageHeader } from '@/components/ui/PageHeader';
```

- [ ] **Step 4: Page anatomy**

Top of `app/dashboard/page.tsx` (or its top render block) should follow:

```tsx
<PageHeader title="Overview" description="..." action={<...optional CTA...>} />
<KpiGrid>
  <StatCard ... />
  <StatCard ... />
  <StatCard ... />
  <StatCard ... />
</KpiGrid>
<Card>...</Card>
```

Page-level vertical rhythm: wrap the top-level content in `<div className="space-y-6">`.

- [ ] **Step 5: Verify and residual scan**

```bash
npx tsc --noEmit
npm run lint
grep -nE "bg-(white|gray|zinc|emerald|red|amber|yellow|blue|indigo|black)|text-(gray|zinc|emerald|red|amber|yellow|blue|indigo|white|black)|border-(gray|zinc)|#[0-9a-fA-F]{3,6}" app/dashboard/page.tsx
```
Expected: no matches in `app/dashboard/page.tsx`. (Matches inside icon-only `text-white` on the brand button are OK because they belong to `--text-on-brand` semantics — re-check those cases manually.)

- [ ] **Step 6: Manual eyeball**

```bash
npm run dev
```
Open `http://localhost:3000/dashboard`. Toggle light/dark. Verify:
- KPIs render in a 1/2/4 responsive grid.
- Brand red is the only chromatic accent.
- Empty / loading states (if any reachable) look right.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "dashboard(b1-overview): re-skin overview to SaaS tokens"
```

---

## Group 4 — Batch B2: Money pages

**Commit at end:** `dashboard(b2-money): re-skin analytics/earnings/payouts to SaaS tokens`

### Task 21: Re-skin analytics, earnings, payouts

**Files:**
- Modify: every `page.tsx` and child component under `app/dashboard/analytics/`
- Modify: every `page.tsx` and child component under `app/dashboard/earnings/`
- Modify: every `page.tsx` and child component under `app/dashboard/payouts/`

These pages all use recharts. They are the primary stress test for the chart theming.

- [ ] **Step 1: Inventory**

```bash
ls app/dashboard/analytics app/dashboard/earnings app/dashboard/payouts
```
List every `.tsx` file in those trees. Touch all of them.

- [ ] **Step 2: Apply the Task 20 Step 2 transformation table to every file**

(Same table — do not re-list here.)

- [ ] **Step 3: Replace inline UI with primitives**

Same primitive replacement list as Task 20 Step 3. In addition, every payment / payout status badge becomes `<StatusPill status="..." />`.

- [ ] **Step 4: Theme recharts**

For every `<LineChart>`, `<BarChart>`, `<AreaChart>`, `<PieChart>`, `<ResponsiveContainer>` in these files:

- `CartesianGrid stroke` → `var(--border-subtle)`
- `XAxis` / `YAxis` `stroke` → `var(--border-subtle)`
- `XAxis` / `YAxis` `tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}`
- `<Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', color: 'var(--text-primary)' }} />`
- Primary series stroke / fill → `var(--brand)`
- Secondary series stroke / fill → `var(--text-secondary)`
- For `<Area>` gradients, use brand red with stop-opacity `0.2` at top, `0` at bottom.

Hex colors inside chart props are allowed only when the variable is not visible at runtime (recharts renders to SVG and reads computed CSS at render time — `var(...)` works as a string). If a particular recharts API rejects the `var(...)` string, fall back to reading the computed value via `getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()` and pass that. Document the workaround inline only if used.

- [ ] **Step 5: Verify and residual scan**

```bash
npx tsc --noEmit
npm run lint
grep -rnE "bg-(white|gray|zinc|emerald|red|amber|yellow|blue|indigo|black)|text-(gray|zinc|emerald|red|amber|yellow|blue|indigo|white|black)|border-(gray|zinc)|#[0-9a-fA-F]{3,6}" app/dashboard/analytics app/dashboard/earnings app/dashboard/payouts
```
Expected: no matches (or only the documented chart-color exceptions).

- [ ] **Step 6: Manual eyeball**

```bash
npm run dev
```
Walk:
- `/dashboard/analytics` (with charts populated — if no data, confirm `<EmptyState>` renders)
- `/dashboard/earnings`
- `/dashboard/payouts`

Toggle light/dark on each. Confirm charts redraw with the right colors.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/analytics app/dashboard/earnings app/dashboard/payouts
git commit -m "dashboard(b2-money): re-skin analytics/earnings/payouts to SaaS tokens"
```

---

## Group 5 — Batch B3: Commerce pages

**Commit at end:** `dashboard(b3-commerce): re-skin products/orders/customers to SaaS tokens`

### Task 22: Re-skin products, orders, customers

**Files:**
- Modify: every file under `app/dashboard/products/` (including upsells, new product page, edit page, detail components)
- Modify: every file under `app/dashboard/orders/`
- Modify: every file under `app/dashboard/customers/`

Most data-table-heavy batch. Validates `<DataTable>`, `<Toolbar>`, `<StatusPill>`, `<SideDrawer>`, `<ConfirmDialog>` together.

- [ ] **Step 1: Inventory**

```bash
ls app/dashboard/products app/dashboard/orders app/dashboard/customers
```

- [ ] **Step 2: Apply the Task 20 transformation table to every file**

- [ ] **Step 3: Replace inline tables with `<DataTable>`**

For each list page that currently renders an HTML `<table>` inline:
- Move the column definitions into a `columns: ColumnDef<RowType>[]` array at the top of the page.
- Replace the table JSX with `<DataTable data={...} columns={...} searchable searchKeys={[...]} pageSize={20} emptyState={<EmptyState ... />} />`.

For pages where the table is too custom for the generic `DataTable` (e.g. with row expansion or complex row actions), leave the table inline but token-migrate every className.

- [ ] **Step 4: Replace inline status badges with `<StatusPill>`**

Search each file for inline status badge JSX. Replace with `<StatusPill status={order.status} />`.

- [ ] **Step 5: Replace inline edit/detail panels with `<SideDrawer>`**

If a page has its own "edit X" or "view X" drawer, migrate it to `<SideDrawer isOpen={...} onClose={...} title="...">`.

- [ ] **Step 6: Replace inline confirm modals with `<ConfirmDialog>`**

Especially destructive actions (delete product, cancel order, refund) — wire them through `<ConfirmDialog isDestructive ...>`.

- [ ] **Step 7: Verify and residual scan**

```bash
npx tsc --noEmit
npm run lint
grep -rnE "bg-(white|gray|zinc|emerald|red|amber|yellow|blue|indigo|black)|text-(gray|zinc|emerald|red|amber|yellow|blue|indigo|white|black)|border-(gray|zinc)|#[0-9a-fA-F]{3,6}" app/dashboard/products app/dashboard/orders app/dashboard/customers
```

- [ ] **Step 8: Manual eyeball**

```bash
npm run dev
```
Walk: `/dashboard/products`, `/dashboard/products/new`, `/dashboard/orders`, `/dashboard/customers`. Toggle theme.

- [ ] **Step 9: Commit**

```bash
git add app/dashboard/products app/dashboard/orders app/dashboard/customers
git commit -m "dashboard(b3-commerce): re-skin products/orders/customers to SaaS tokens"
```

---

## Group 6 — Batch B4: Content pages

**Commit at end:** `dashboard(b4-content): re-skin sites/media to SaaS tokens`

### Task 23: Re-skin sites (index only) and media

**Files:**
- Modify: every `.tsx` file under `app/dashboard/sites/` **except anything in or under `app/dashboard/sites/edit/`**
- Modify: every `.tsx` file under `app/dashboard/media/`

`app/dashboard/sites/edit/**` is a full-screen editor with its own chrome — it's already short-circuited in `app/dashboard/layout.tsx`. Do not touch any file in that subtree.

- [ ] **Step 1: Inventory and exclusion check**

```bash
ls app/dashboard/sites app/dashboard/media
```
List all `.tsx` files under `app/dashboard/sites/` and explicitly exclude `app/dashboard/sites/edit/**`. Verify none of the files in your touch list are inside `sites/edit/`.

- [ ] **Step 2: Apply the Task 20 transformation table to every file in the touch list**

- [ ] **Step 3: Replace inline UI with primitives**

- Site-card grids → wrap each card in `<Card hoverable>`. Site type badges → `<StatusPill>`.
- Media library tiles → custom layout, but use `<Card hoverable padded={false}>` as the tile wrapper. Loading tiles → `<Skeleton className="aspect-square w-full" rounded="lg" />`.
- "No sites yet" / "Empty library" → `<EmptyState icon={...} title="..." description="..." action={...} />`.

- [ ] **Step 4: Verify and residual scan**

```bash
npx tsc --noEmit
npm run lint
grep -rnE "bg-(white|gray|zinc|emerald|red|amber|yellow|blue|indigo|black)|text-(gray|zinc|emerald|red|amber|yellow|blue|indigo|white|black)|border-(gray|zinc)|#[0-9a-fA-F]{3,6}" app/dashboard/sites app/dashboard/media | grep -v "app/dashboard/sites/edit/"
```

- [ ] **Step 5: Manual eyeball**

```bash
npm run dev
```
Walk `/dashboard/sites`, `/dashboard/media`. Toggle theme. Open the site editor briefly to confirm it still renders untouched.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/sites app/dashboard/media
git commit -m "dashboard(b4-content): re-skin sites/media to SaaS tokens"
```

---

## Group 7 — Batch B5: Growth pages

**Commit at end:** `dashboard(b5-growth): re-skin marketing/automation/autodm to SaaS tokens`

### Task 24: Re-skin marketing, automation, autodm

**Files:**
- Modify: every `.tsx` file under `app/dashboard/marketing/` (includes coupons, leads, affiliates, referrals, services, community)
- Modify: every `.tsx` file under `app/dashboard/automation/`
- Modify: every `.tsx` file under `app/dashboard/autodm/`

Reuses primitives validated in B3. Should be the fastest batch.

- [ ] **Step 1: Inventory**

```bash
ls app/dashboard/marketing app/dashboard/automation app/dashboard/autodm
```

- [ ] **Step 2: Apply transformations**

Same table as Task 20. Same primitive substitutions as Task 22 (lists → `<DataTable>`, badges → `<StatusPill>`, drawers → `<SideDrawer>`, destructive confirms → `<ConfirmDialog isDestructive>`).

Special cases:
- `marketing/community` has post cards — wrap in `<Card hoverable>`.
- `automation/` flows often render workflow nodes — those are domain JSX; just migrate colors. Don't refactor flow logic.
- `autodm/` Instagram surfaces — same.

- [ ] **Step 3: Verify and residual scan**

```bash
npx tsc --noEmit
npm run lint
grep -rnE "bg-(white|gray|zinc|emerald|red|amber|yellow|blue|indigo|black)|text-(gray|zinc|emerald|red|amber|yellow|blue|indigo|white|black)|border-(gray|zinc)|#[0-9a-fA-F]{3,6}" app/dashboard/marketing app/dashboard/automation app/dashboard/autodm
```

- [ ] **Step 4: Manual eyeball**

Walk a representative page from each subfolder under `marketing/` plus `/dashboard/automation` and `/dashboard/autodm`. Toggle theme.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/marketing app/dashboard/automation app/dashboard/autodm
git commit -m "dashboard(b5-growth): re-skin marketing/automation/autodm to SaaS tokens"
```

---

## Group 8 — Batch B6: Account pages

**Commit at end:** `dashboard(b6-account): re-skin notifications/integration/settings/help to SaaS tokens`

### Task 25: Re-skin notifications, integration, settings, help

**Files:**
- Modify: every `.tsx` file under `app/dashboard/notifications/`
- Modify: every `.tsx` file under `app/dashboard/integration/`
- Modify: every `.tsx` file under `app/dashboard/settings/` (profile, billing, subscription, and any nested route)
- Modify: every `.tsx` file under `app/dashboard/help/`

Form-heavy. Validates `<CurrencyInput>`, `<DateRangePicker>`, and the button conventions.

- [ ] **Step 1: Inventory**

```bash
ls app/dashboard/notifications app/dashboard/integration app/dashboard/settings app/dashboard/help
```

- [ ] **Step 2: Apply transformations**

Same Task 20 table. Additionally:

- Every text input / textarea / select uses:
  ```
  className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow"
  ```
- Every form label:
  ```
  className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
  ```
- Every helper text under a field:
  ```
  className="mt-1 text-xs text-[var(--text-tertiary)]"
  ```
- Field error text:
  ```
  className="mt-1 text-xs text-[var(--danger)]"
  ```
- Currency fields → `<CurrencyInput>`.
- Settings nav (left rail of `/dashboard/settings/*`) — re-skin the active tab indicator using `var(--brand)` left border (3px, like the sidebar pattern in `Sidebar.tsx:130`).

- [ ] **Step 3: Replace inline UI with primitives**

- Section blocks → `<Card>`.
- Notification empty states → `<EmptyState>`.
- Connect/Disconnect destructive flows → `<ConfirmDialog isDestructive>`.

- [ ] **Step 4: Verify and residual scan**

```bash
npx tsc --noEmit
npm run lint
grep -rnE "bg-(white|gray|zinc|emerald|red|amber|yellow|blue|indigo|black)|text-(gray|zinc|emerald|red|amber|yellow|blue|indigo|white|black)|border-(gray|zinc)|#[0-9a-fA-F]{3,6}" app/dashboard/notifications app/dashboard/integration app/dashboard/settings app/dashboard/help
```

- [ ] **Step 5: Manual eyeball**

Walk `/dashboard/notifications`, `/dashboard/integration`, `/dashboard/settings/profile`, `/dashboard/settings/subscription`, `/dashboard/help`. Submit a form to confirm focus rings + validation states. Toggle theme.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/notifications app/dashboard/integration app/dashboard/settings app/dashboard/help
git commit -m "dashboard(b6-account): re-skin notifications/integration/settings/help to SaaS tokens"
```

---

## Post-overhaul follow-up (NOT part of this plan — log only)

After all 8 commits land and you've eyeballed everything end-to-end, two cleanup follow-ups are worth filing separately:

1. **Remove the temporary legacy token aliases** (the `--color-*` / `--surface-color` / `*-subtle` block added in Task 1) once `grep -rn "color-text-tertiary\|surface-color\|color-success-subtle\|color-warning-subtle\|color-danger-subtle\|color-success\|color-warning\|color-danger\|color-text-primary\|color-text-secondary" src app` returns zero hits. Run as a separate commit.

2. **Tighten chart theme via shared helper.** If recharts patterns recur in 3+ files, extract a `lib/charts/theme.ts` helper that returns `{ axisStroke, gridStroke, tickFill, tooltipContentStyle, brandStroke }`. Not in scope here.

File those as `.claude/todo-later/` entries when you have time, not as part of this overhaul's commits.

---

## Self-review

**Spec coverage check** (against `docs/superpowers/specs/2026-06-04-dashboard-ui-overhaul-design.md`):

| Spec section | Where it's implemented |
|---|---|
| §2.1 Existing tokens kept | Task 1 — explicitly preserved |
| §2.2 New tokens (surfaces, borders, text, semantic, radius, shadow, focus) | Task 1 Steps 1+2 |
| §2.3 Type scale | Embedded in primitive rewrites (Tasks 6-13) + page tasks (20-25) |
| §3.1 Token commit | Group 1 (Task 1, single commit) |
| §3.2 Layout reconcile + `#dashboard-root` | Task 2 |
| §3.3 Sidebar light pass | Task 3 |
| §3.4 TopBar re-skin | Task 4 |
| §3.5 ImagePickerModal | Task 5 |
| §4.1 Re-skinned 8 primitives | Tasks 6-13 |
| §4.2 5 new primitives | Tasks 14-18 |
| §4.3 Recharts theming | Task 21 Step 4 (B2 — money pages) + reused in later batches |
| §4.4 Button conventions | Embedded across primitive rewrites + Task 20 transformation table |
| §5 Page sweep batches B1-B6 | Tasks 20-25 |
| §5.2 Out-of-scope guard for `sites/edit/*` | Task 23 Step 1 explicit exclusion |
| §6 Verification | Each task's verify + residual scan steps |
| §7 Commit cadence (8 commits) | 1 token + 1 shell + 6 batches = 8 |
| §8 Rules that apply | Plan header + verification commands |
| §9 Don't touch list | "Out of scope" table at the top + repeated in Task 23 |

**Placeholder scan:** no `TBD`, `TODO`, "implement later", "fill in details", or stub references.

**Type consistency:**
- `PageHeaderProps`: `title`, `description?`, `action?`, `breadcrumbs?` — unchanged from existing.
- `StatCardProps`: `label`, `value`, `trend?`, `icon?`, `subValue?`, `className?` — unchanged.
- `DataTableProps<T>`: `data`, `columns`, `pageSize?`, `searchable?`, `searchKeys?`, `emptyState?` — unchanged.
- `StatusPillProps`: `status`, `type?`, `className?` — `type` parameter kept in props for backwards compat even though new implementation doesn't read it (destructured but unused — kept to avoid breaking call sites).
- `SideDrawerProps`: `isOpen`, `onClose`, `title`, `children`, `footer?`, `size?` — unchanged.
- `ConfirmDialogProps`: `isOpen`, `onClose`, `onConfirm`, `title`, `description`, `confirmLabel?`, `cancelLabel?`, `isDestructive?`, `requiredText?` — unchanged.
- `CurrencyInputProps`: `value`, `onChange`, `label?`, `error?`, `disabled?` — unchanged.
- `DateRangePickerProps`: `startDate`, `endDate`, `onChange`, `className?` — unchanged.
- New primitives' types fully declared inline in Tasks 14-18.

No call site of any existing primitive will break because every prop name and signature is preserved.

**Gap I considered and accepted:** the `StatusPill` `type` prop is now unused in the new implementation (status string maps to colors directly). Kept in the interface so existing call sites that pass `type="order"` etc. don't TS-error. A follow-up could drop it — that's a future cleanup, not this overhaul.
