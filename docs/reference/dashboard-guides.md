---
noteId: "dc6bb9007f0411f1b7ddffeec518d7f9"
tags: []

---

# Dashboard Guides

In-page "how do I use this?" guides on workflow-heavy dashboard pages. A **Guide** button in the page header swaps the content region for a full-screen, step-by-step guide (numbered steps + Pro Tips), leaving the sidebar and top bar in place. Back (or Escape) returns to the page.

## How it works

- **`src/components/dashboard/guides/GuideProvider.tsx`** — context holding `activeGuideKey`; `useGuide()` exposes `openGuide(key)` / `closeGuide()`. Mounted in `app/dashboard/layout.tsx`.
- **`GuideButton.tsx`** — the shared header button (`<GuideButton guideKey="…" />`). Calls `openGuide`.
- **`GuideOutlet.tsx`** — inside the layout's `<main>`; renders `GuideScreen` when a guide is active, otherwise the page.
- **`GuideScreen.tsx`** — renders a guide from the registry (centered column: Back row, intro, numbered step cards with a connecting rail, Pro Tips, and a single right-aligned "Go to {page}" button that returns to the page). Opening a guide is scoped to its page — navigating to another route auto-closes it.
- **`content.ts`** — the single source of guide copy: `GUIDE_KEYS` + `GUIDES: Record<GuideKey, Guide>` (`GuideKey` is derived from `GUIDE_KEYS`). `content.test.ts` validates every key has a well-formed guide.

## Adding or editing a guide

1. Add/extend the entry in `content.ts` — add the key to `GUIDE_KEYS` (the `GuideKey` type derives from it) and add the matching `GUIDES` entry.
2. Drop `<GuideButton guideKey="yourKey" />` into that page's header.
3. `npx vitest run src/components/dashboard/guides/content.test.ts`.

## Pages with a guide

| Route | `guideKey` |
|---|---|
| `/dashboard/products` | `products` |
| `/dashboard/sites` | `sites` |
| `/dashboard/links` | `links` |
| `/dashboard/marketing` | `marketing` |
| `/dashboard/marketing/coupons` | `coupons` |
| `/dashboard/marketing/leads` | `leads` |
| `/dashboard/marketing/affiliates` | `affiliates` |
| `/dashboard/marketing/referrals` | `referrals` |
| `/dashboard/marketing/services` | `services` |
| `/dashboard/marketing/community` | `community` |

> AutoDM keeps its own in-tab guide (`src/components/dashboard/autodm/GuideView.tsx`) — not part of this system.

## Keeping guides accurate

When you change the workflow of a guided page (new steps, renamed actions, removed features), update that page's entry in `content.ts` in the same change-set.
