---
noteId: "a374bfd07ef911f1b7ddffeec518d7f9"
tags: []

---

# Dashboard Guide System — Design

> Date: 2026-07-14
> Status: Approved (design), pending implementation plan
> Scope: Add an in-app "Guide" button to 10 workflow-heavy dashboard pages. Clicking it swaps the page body for a full-screen, AutoDM-style guide (numbered steps + pro tips). Content lives in one registry. Keeping guides in sync with page changes is a documented rule (no hook).

---

## 1. Goal

Give creators an on-page "how do I use this?" affordance on the dashboard's workflow-heavy pages. Clicking **Guide** replaces the current page's content with a full-screen guide (with a **← Back** button), visually and structurally modelled on the existing AutoDM guide (`src/components/dashboard/autodm/GuideView.tsx`) but more polished. One button component, one guide-screen component, one content registry — so every guided page uses the identical button and the same rendering.

Non-goals:
- No changes to the AutoDM guide (it keeps its existing in-tab `GuideView`). Optional future unification is noted, not built.
- No new backend, DB, or API work. This is a pure client/UI feature with static content.
- Not added to full-screen site editors or the product editor (they have no `PageHeader`).

---

## 2. Locked decisions (from brainstorming)

| Decision | Choice |
|---|---|
| How the guide opens | **Inline full-page swap** — page body replaced by the guide + a `← Back` button (closest to AutoDM). |
| Page coverage | **10 curated pages**: Products, Sites, Short Links, and all Marketing pages (hub + Coupons, Leads, Affiliates, Referrals, Services, Community). |
| Sync enforcement | **Documented rule only** — a written rule in `CLAUDE.md` + guide docs. No Stop-hook enforcement. |
| Architecture | **Context + layout swap** (Approach A below). |

---

## 3. Architecture

**Approach A — Context + layout swap (chosen).**

1. A `GuideProvider` mounted in the dashboard layout holds `activeGuideKey: GuideKey | null` and exposes `openGuide(key)` / `closeGuide()`.
2. A shared `GuideButton` component (the "same button everywhere") is dropped into each guided page's `PageHeader action`. It calls `openGuide(guideKey)`.
3. The dashboard layout renders `activeGuideKey ? <GuideScreen guideKey={activeGuideKey} /> : children`. When a guide is open, the page (`children`) unmounts and the `GuideScreen` renders full-width in the same content area. `← Back` calls `closeGuide()`, which remounts the page.

**Why A over the alternatives:**
- **B. Per-page local state** — each page owns a `showGuide` boolean and renders the swap itself. Rejected: repetitive wiring across 10 pages, easy to drift, more code per page.
- **C. URL param (`?guide=1`)** — guide key derived from pathname, browser Back closes it. Rejected: more moving parts, and an in-app `← Back` button was chosen, so browser-history integration is unnecessary.

**Unmount trade-off (accepted):** while a guide is open the underlying page unmounts and remounts on Back. All 10 guided pages are list/CRUD pages backed by the TanStack Query cache, so remount is cheap (no network re-fetch beyond cache rules, no unsaved-form loss). The product editor — the one page with unsaved-form risk — is out of scope.

**Layout integration detail:** the dashboard layout file (`app/dashboard/layout.tsx`) wraps its content in `GuideProvider` and performs the conditional render. The `GuideButton` lives inside `children`, so it disappears when the guide is open — intended; the `GuideScreen` provides its own Back control. The layout must locate the swap at the content region (not over the sidebar), so the sidebar/top chrome stays visible.

---

## 4. Components

All under `src/components/dashboard/guides/`.

### `GuideProvider.tsx`
- React context: `{ activeGuideKey, openGuide(key), closeGuide() }`.
- `'use client'`. Holds `useState<GuideKey | null>`.
- Exports `useGuide()` hook. Guards for use outside provider.
- On `openGuide`, scroll the content region to top; `Escape` key calls `closeGuide()` (a11y + parity with other overlays).

### `GuideButton.tsx`
- Props: `{ guideKey: GuideKey; className?: string }`.
- Renders a header pill: `BookOpen` (lucide) icon + label **"Guide"**, dashboard-token styling (secondary/ghost button, brand hover). Sits in `PageHeader action` alongside any existing actions (e.g. "Add Product").
- Calls `useGuide().openGuide(guideKey)`.

### `GuideScreen.tsx`
- Props: `{ guideKey: GuideKey }`.
- Reads the `Guide` from the content registry; renders the full-screen guide (section anatomy in §6).
- `← Back` button calls `useGuide().closeGuide()`.
- Pure presentation from the registry — no per-guide code.

### `content.ts`
- The single content registry: `export const GUIDES: Record<GuideKey, Guide>`.
- `export type GuideKey = 'products' | 'sites' | 'links' | 'marketing' | 'coupons' | 'leads' | 'affiliates' | 'referrals' | 'services' | 'community';`
- Draft content authored from each page's real features (per `docs/reference/dashboard-map.md`); copy is freely editable.

---

## 5. Content model

```ts
import type { LucideIcon } from 'lucide-react';

export type GuideStep = {
  title: string;
  desc: string;
  icon?: LucideIcon;   // optional per-step icon; falls back to the step number
};

export type Guide = {
  title: string;                             // e.g. "Selling products"
  intro: string;                             // one-line summary under the title
  steps: GuideStep[];                        // numbered step cards
  tips?: string[];                           // "Pro Tips" panel (Sparkles)
  links?: { label: string; href: string }[]; // optional "Where to next" row
};

export const GUIDES: Record<GuideKey, Guide> = { /* … 10 entries … */ };
```

---

## 6. Guide screen anatomy ("better, like a guide")

Rendered in the content region, top-to-bottom, all with dashboard tokens (`--surface`, `--border`, `--brand`, `--text-*`, `--radius-*`, `--shadow-*`), light + dark, responsive:

1. **Back row** — `← Back` ghost button (left), small "Guide" kicker.
2. **Intro hero** — `Guide.title` (display heading) + `Guide.intro` (muted one-liner).
3. **Steps** — numbered step cards (evolution of AutoDM's list): each card shows a numbered brand chip (or `step.icon`), `title`, `desc`; a subtle vertical rail connects the numbers. Hover raises border to brand tint + `--shadow-xs`.
4. **Pro Tips** — muted panel, `Sparkles` bullet per tip (only if `tips` present).
5. **Where to next** (optional) — a row of link chips from `Guide.links` (e.g. Products guide → "Create a site", "Set up a coupon").

Reuses the AutoDM guide's visual DNA (numbered chips, tips panel) but adds the intro hero, per-step icons, the connecting rail, and the optional links row.

---

## 7. Page coverage (10)

Each page adds `<GuideButton guideKey="…" />` to its `PageHeader action` (kept alongside existing actions).

| Route | `guideKey` | Guide focus |
|---|---|---|
| `/dashboard/products` | `products` | Create/publish products, deliverables & access links, pricing/free mode, trash. |
| `/dashboard/sites` | `sites` | Site types (store/single/link-in-bio/payment), publish, copy link, trash. |
| `/dashboard/links` | `links` | Create short links, codes, targeting/expiry basics, analytics. |
| `/dashboard/marketing` | `marketing` | What the marketing suite covers; where each tool lives. |
| `/dashboard/marketing/coupons` | `coupons` | Create discount codes, expiry/usage caps, bulk generation. |
| `/dashboard/marketing/leads` | `leads` | Where leads come from, filtering by site, CSV export. |
| `/dashboard/marketing/affiliates` | `affiliates` | Affiliate program setup + tracking. |
| `/dashboard/marketing/referrals` | `referrals` | Referral codes, toggling, per-code analytics. |
| `/dashboard/marketing/services` | `services` | Offer services, manage bookings/statuses. |
| `/dashboard/marketing/community` | `community` | Create posts, reactions, moderation. |

Explicitly **excluded**: Overview, Analytics, Orders, Earnings, Customers, Media, Notifications, Settings hub/Profile/Billing/Subscription, Help, admin, redirects, all site editors, product editor, AutoDM (has its own).

---

## 8. Docs & the sync rule

- **New:** `docs/reference/dashboard-guides.md` — describes the guide system (components, the `content.ts` registry, how to add or edit a guide, the page↔`guideKey` table from §7) and states the sync rule.
- **Update `CLAUDE.md`:** add a Code-Quality rule — *"When you change the workflow of a guided dashboard page (see `docs/reference/dashboard-guides.md`), update that page's guide content in `src/components/dashboard/guides/content.ts` in the same change-set."*
- **Update `docs/reference/dashboard-map.md`:** note (in the affected rows or a short section) which pages carry a Guide button and point to `dashboard-guides.md`.
- Enforcement is **documentation + discipline only** — no Stop-hook change (per the locked decision).

---

## 9. Out of scope / future

- Migrating AutoDM's `GuideView` onto this system for a single standard (optional cleanup later).
- Guides for excluded pages.
- Hook-based sync enforcement.
- Search/keyboard-command launcher for guides.

---

## 10. Success criteria

- All 10 pages show an identical **Guide** button in their header.
- Clicking it swaps the content region to a full-screen guide with a working **← Back**; sidebar/top chrome remain.
- Guide content renders from `content.ts` for every key; adding a new guide = one registry entry + one button.
- `Escape` and **← Back** both return to the page; the page restores from cache without a jarring reload.
- Light/dark + mobile all render correctly with dashboard tokens.
- `npm run lint` clean; no new `any`, no hardcoded hex in guide components.
- Docs created/updated per §8.
