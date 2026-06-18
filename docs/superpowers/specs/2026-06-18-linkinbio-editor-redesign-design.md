---
noteId: "358d5b406a8f11f19a5ba9a9f70f067a"
tags: []

---

# Link-in-Bio Editor Redesign — Premium SaaS Shell (Design)

- **Date:** 2026-06-18
- **Status:** Approved design — ready for implementation plan
- **Owner:** Dashboard Agent
- **Surface:** `app/dashboard/sites/edit/linkinbio/[id]` + `src/components/dashboard/site-edit/**`
- **Builds on:** the section-list shell shipped in `2026-06-17-site-editor-shell-foundation-design.md` (branch `feat/site-editor-shell`).

---

## 1. Context & Problem

The Link-in-Bio editor was just migrated onto a shared shell (Spec 1: `SiteEditorShell` + `EditorPanel` Content/Design/Settings switch + `SectionList` drag/drill-in + `SectionDetail`). It works and is tokenized, but it still reads like an **admin panel**: a single editing column of near-identical compact rows, drill-in editing that hides the list, no creator-level information hierarchy, no dashboard navigation, desktop-only.

Goal: restructure the editor's **UX and component architecture** into a premium, creator-focused SaaS experience comparable to Linktree / Beacons / Bento / Stan / Framer — **without** changing functionality, APIs, DB schemas, block contracts, preview messaging, or save logic.

This is a UX + component-architecture redesign, not a feature build and not a theme refresh.

## 2. Goals

1. A modern **3-zone layout**: left dashboard **sidebar nav** · editor canvas · live phone preview, under a full-width top bar.
2. **Inline-expand** block editing (cards grow in place; list + preview stay visible) — replacing drill-in.
3. A **premium hybrid design language**: keep dashboard CSS-var color tokens (dark mode preserved) + adopt larger radius / soft shadow / airy spacing on the editor surface.
4. Clear **information hierarchy**: profile → content blocks → preview → design → settings.
5. **Mobile responsive** (sidebar drawer + `Edit | Preview` tab switch).
6. **Zero functional regressions** — all existing data/save/preview/undo behavior preserved exactly.

## 3. Non-Goals

- Building Insights/analytics charts, Course, Link shortener, Social planner, or any "Tools" feature. These appear as **"Coming soon"** sidebar entries only (no backend, no DB, no API).
- Migrating `main` / `singlepage` / `payment` editors (they keep their current shells; the generic `SiteEditorShell` remains available for their later migration).
- Any change to `/api/*`, Supabase schema, RLS, `types/database.types.ts`, block schemas, or the storefront renderer the preview points at.

## 4. Locked Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Design language | **Hybrid** — dashboard color tokens (dark mode) + premium radius/shadow/spacing on the editor surface |
| Block editing | **Inline expand** (card grows in place); drill-in retired |
| Layout | **3-zone**: sidebar nav · canvas · preview + top bar |
| Sidebar scope | **Profile / Content / Design / Settings real**; Insights / Course / Tools = "Coming soon" |
| Ratio | sidebar ~210px (collapsible) · canvas flexible · preview pinned right (~360px phone / desktop scales) |
| Mobile | sidebar → drawer; canvas+preview → `Edit | Preview` tab |

## 5. Information Architecture

Sidebar sections (top → bottom):

- **Content** (default) — Profile *summary card* → block list (inline-expand `BlockCard`s) → sticky "Add block" CTA.
- **Profile** — full `BioProfileEditor` (avatar, name, username, bio, social links).
- **Design** — template picker + `BioAppearanceEditor` (theme, colors, buttons, background).
- **Settings** — URL/slug + availability, SEO (title/desc/image), publish toggle.
- *Tools group:* **Insights**, **Course**, **Link shortener**, **Social planner** → each renders `ComingSoon`.

Profile appears in two places by design: a quick **summary card** at the top of Content, and a full **Profile** section — matching the brief (Section 1 = profile card, Section 2 = blocks).

## 6. Layout & Components

### 6.1 Zones
```
┌───────────────────────── Top bar ─────────────────────────┐
│ ‹Back  My Links · Link-in-bio        ↶ ↷  Save  Preview  Publish │
├──────────┬──────────────────────────────┬─────────────────┤
│ Sidebar  │  Editor canvas (active        │  Live preview   │
│ (nav)    │  section)                     │  (phone/device) │
│ ~210px   │  flexible                     │  ~360px / scales│
└──────────┴──────────────────────────────┴─────────────────┘
```
Mobile (`< lg`): sidebar collapses to a drawer (hamburger in top bar); canvas + preview become an `Edit | Preview` segmented tab.

### 6.2 Component map

New, under `src/components/dashboard/site-edit/editor/`:

| File | Responsibility |
|---|---|
| `LinkInBioShell.tsx` | 3-zone orchestrator: hosts `EditorTopBar`, `EditorSidebar`, the active section, and `PreviewPane`. Owns sidebar active-section state + mobile tab state. |
| `EditorTopBar.tsx` | Back · title/type · undo/redo · Save · Preview · Publish. Extracted from `SiteEditorShell`'s header (same props/behavior). |
| `PreviewPane.tsx` | Device switch + zoom-aware iframe + browser chrome. Extracted from `SiteEditorShell`'s preview (same `iframeRef`/`previewKey`/postMessage contract). |
| `EditorSidebar.tsx` | Nav list (real sections + Tools group), active highlight, "Coming soon" badges, collapse, mobile drawer. |
| `ProfileCard.tsx` | Profile summary card (avatar, name, @username, bio, "Edit profile" → Profile section / "Change avatar"). |
| `BlockCard.tsx` | **Inline-expandable** block card: drag handle, type icon, title/summary, visibility toggle, quick actions (duplicate/delete), hover state; expands to render the existing `BlockBody` editor inline. |
| `ComingSoon.tsx` | Placeholder section view (icon, title, "Coming soon" copy). |

Changed:

| File | Change |
|---|---|
| `SectionList.tsx` | Renders `BlockCard`s with drag/add; no drill-in (`onSelect` → expand instead of navigate). The block-list mechanics (reorder, add, toggle, duplicate, delete) stay. |
| `app/dashboard/sites/edit/linkinbio/[id]/page.tsx` | Composes `LinkInBioShell` instead of `SiteEditorShell` + `EditorPanel`. Section content (Content/Profile/Design/Settings slots) passed in. Save/load/undo/postMessage logic preserved verbatim. |
| `app/globals.css` | Add editor-surface premium tokens (e.g. `--radius-xl: 20px`, `--shadow-card`, `--shadow-card-lg`) under `:root` and `.dark`. |
| `.claude/rules/dashboard-design.md` | Document the "editor surface" exception: where premium radius/shadow tokens are allowed and why (keeps the rule file authoritative). |
| `docs/reference/dashboard-map.md` | Update the linkinbio editor entry to the new architecture. |

Retired (no longer rendered by linkinbio):

| File | Note |
|---|---|
| `SectionDetail.tsx` | Drill-in replaced by inline-expand. Delete (no other consumer). |
| `EditorPanel.tsx` | Content/Design/Settings switch role moves to `EditorSidebar`. Delete (linkinbio was its only consumer). |

Kept: `AddSectionPicker.tsx` (the visual category picker — used by the sticky Add CTA), `sectionRegistry.tsx`, `summarize.ts`, `reorder.ts`, `types.ts`, all `blockEditors/*`, `SiteEditorShell.tsx` (retained for future main/single/payment migration; its TopBar/Preview logic is the source for the extracted components).

## 7. Design Language (hybrid, tokenized)

- **Color/dark-mode:** unchanged dashboard CSS vars (`--bg-*`, `--surface*`, `--text-*`, `--border*`, `--brand`, `--success`, `--focus-ring`). No hardcoded hex, no Tailwind color names, no `dark:` overrides.
- **Premium add-ons (new tokens):** `--radius-xl` (~20px) for cards, `--shadow-card` / `--shadow-card-lg` for soft layered elevation. Used **only** in `editor/**`. These are added to `globals.css` (light + dark) and documented in `dashboard-design.md`.
- Spacing: Notion/Linear rhythm — generous card padding, fewer 1px borders, elevation instead of outlines.
- Focus rings on every interactive element (`focus-visible:shadow-[var(--focus-ring)]`). lucide-react icons only. framer-motion for the inline-expand and reveals (already a dependency).

## 8. Preserved Contracts (must not change behavior)

- Data: `useLinkInBioSiteQuery` (`src/hooks/useLinkInBioSite`).
- Save routine (sites / linkinbio_pages / linkinbio_blocks / linkinbio_items / forms / design tokens) — verbatim.
- Preview: `bio-content-update` + `theme-update` postMessage shapes, debounce, `iframeRef`, `previewKey`.
- Undo/redo snapshots + Ctrl+Z / Shift / Y; slug availability; publish; image picker (`ImagePickerModal` reconnect for inline `BlockBody`, as in Spec 1).

## 9. Implementation Phases (each ends green & committable)

1. **Extract + tokens.** Pull `EditorTopBar` + `PreviewPane` out of `SiteEditorShell` into `editor/`; add premium tokens to `globals.css` + document in `dashboard-design.md`. `SiteEditorShell` re-composes them (no behavior change). Verify linkinbio still works.
2. **Shell + sidebar.** Build `LinkInBioShell` + `EditorSidebar`; wire active-section state; render existing Content/Design/Settings as sections (keep current `SectionList` drill-in for now). linkinbio page → `LinkInBioShell`.
3. **Inline-expand cards.** Build `BlockCard` (expand → `BlockBody` inline, image picker wired); `SectionList` renders `BlockCard`s; delete `SectionDetail`. Drag/add/toggle/duplicate/delete preserved.
4. **Profile + polish + Coming-soon.** `ProfileCard`; premium-restyle Design/Settings sections; `ComingSoon` for Insights/Course/Tools; delete `EditorPanel`.
5. **Mobile.** Sidebar drawer + `Edit | Preview` tab switch; responsive canvas/preview.

## 10. Verification (per phase + final)

- `npx tsc --noEmit` = 0; `npx eslint <touched files>` clean for those files (repo-wide lint has pre-existing `any` debt — scope to touched files).
- Hardcoded-color grep from `dashboard-design.md` over `editor/**` + touched files = zero hits (allowed exceptions: white toggle knobs, `--text-on-brand`).
- Manual in **light + dark**, desktop + a narrow (mobile) width: load; sidebar nav switches sections; Content shows profile card + block list; each block type expands inline and edits update the **preview live**; reorder / toggle / duplicate / delete / add (categorized picker); Profile/Design/Settings edit + persist on Save; undo/redo; device switch; Coming-soon renders; mobile drawer + Edit/Preview tab.
- Confirm `main` / `singlepage` / `payment` editors unaffected.
- Update `docs/reference/dashboard-map.md` (doc-drift Stop hook).

## 11. Risks

- **Blast radius is contained:** `SiteEditorShell`/`EditorPanel`/`SectionDetail` are linkinbio-only today, so retiring/refactoring them affects no other editor.
- **Inline-expand reuses `BlockBody`** — no block-editor rewrites; the main new logic is expand/collapse state + image-picker reconnection (already solved in Spec 1).
- **Premium tokens in dark mode** — must define both `:root` and `.dark` values; verified by the color grep + manual toggle.
- **Scope creep guard:** Insights/Course/Tools are static `ComingSoon` only; any real feature is a separate spec.

## 12. Open Questions for the Plan

1. Sidebar collapse: persist collapsed state to `localStorage`, or session-only? *(Lean: localStorage, key `linkinbio-editor-sidebar`.)*
2. Inline-expand: single-open accordion (one block at a time) or multi-open? *(Lean: single-open — calmer, matches Linktree.)*
3. Mobile breakpoint: `lg` (1024px)? *(Lean: yes.)*
