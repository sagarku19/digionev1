---
noteId: "4dc748a069e111f19a5ba9a9f70f067a"
tags: []

---

# Site Editor Shell — Foundation (Spec 1 of N)

- **Date:** 2026-06-17
- **Status:** Approved design — ready for implementation plan
- **Owner:** Dashboard Agent
- **Reference build:** Link-in-Bio editor (`app/dashboard/sites/edit/linkinbio/[id]/page.tsx`)

---

## 1. Context & Problem

DigiOne has four storefront editors under `app/dashboard/sites/edit/`:

| Editor | Shell today | Tabs | ~Lines | Tab layout |
|---|---|---|---|---|
| `linkinbio` | bespoke (its own) | 5 | ~1517 | mini app-sidebar + horizontal tabs |
| `main` | bespoke (its own) | 9 | ~1065 | vertical tab rail |
| `singlepage` | bespoke — near-twin of `main` | 9 | ~1000 | vertical tab rail |
| `payment` | `SiteVisualEditor` (only consumer) | 5 | ~116 | collapsible vertical rail |

Three of four are bespoke. `main` and `singlepage` are ~90% duplicated. The "shared" component (`SiteVisualEditor`) powers only the simplest editor. Every editor expresses its tabs as a **flat rainbow of hardcoded colors** (blue/emerald/rose/amber/fuchsia…), which both reads as inconsistent and violates the dashboard token rule in `.claude/rules/dashboard-design.md`. The result: the four editors feel like four different products.

A deeper observation drove the chosen direction: **all four editors are "an ordered list of things you configure."** linkinbio has *blocks*; main/singlepage have *sections*; payment is *one form*. Today that shared shape is hidden behind flat colored tabs.

## 2. Goals

1. Establish **one shared editor shell** + a **section-based editing model** that all four editors can adopt, replacing the flat-tab model.
2. Make the foundation **easy to keep iterating on** — the owner will do extensive follow-up work inside each editor. Adding or revising a section type must be a near-one-file change.
3. Deliver the foundation with **linkinbio fully migrated** as the reference implementation.
4. Conform to `dashboard-design.md`: tokens only, compact sizing, focus rings, light + dark via tokens.

## 3. Non-Goals (this spec)

- Migrating `main`, `singlepage`, or `payment` — those are **later specs**, built on this foundation. They keep working unchanged in Spec 1.
- Changing any data layer: TanStack hooks, save routines, Supabase queries, RLS.
- Changing the iframe live-preview mechanism or the `postMessage` contracts to the storefront renderers (`app/(storefront)/**`).
- Touching `/api/*`, `types/database.types.ts`, or storefront components.

## 4. Decomposition (the larger effort)

This is **Spec 1 of N**:

1. **Spec 1 — Foundation + linkinbio** *(this document)*: the shared `SiteEditorShell`, the section-model engine + registry, linkinbio migrated end-to-end.
2. **Spec 2 — main + singlepage**: migrate the near-duplicates onto the shell (biggest dedup payoff).
3. **Spec 3 — payment**: migrate the trivial single-section case; retire `SiteVisualEditor`.

Each later spec gets its own design → plan → implementation cycle.

## 5. Chosen Design

### 5.1 Decisions locked during brainstorming

- **Editing model:** Section-list (the left panel is the page's ordered structure), not flat tabs. *(Option 2.)*
- **Section editing navigation:** **Drill-in / master→detail** — clicking a section replaces the list with that section's full-width form under a "‹ Back" header. *(Option A — best for heavy editing; keeps the preview unobstructed; makes each section its own isolated editor file.)*
- **Kept as-is (owner feedback — "already good"):** the existing **editor top header** and the existing **preview header + preview panel**. These are reused, only re-tokenized — not restructured.
- **Removed:** linkinbio's hover-expand **mini app-sidebar**.
- **All new design effort is the LEFT editing panel.**

### 5.2 Left panel anatomy

```
┌──────────────────────────────┐
│ [ Content | Design | Settings ]   ← segmented switch
├──────────────────────────────┤
│ CONTENT view = Section List      │
│  • pinned "Profile header" row   │  (linkinbio only; → BioProfileEditor)
│  • BLOCKS  · drag to reorder     │
│    ⋮⋮ [icon] Title               │
│           summary line     👁 ›  │  hover: duplicate / delete / hide
│    … more rows …                 │
│  • + Add block → categorized     │
│        picker (Basic/Grow/Media) │
│                                  │
│ click a row → DRILL-IN:          │
│  ‹ Back to blocks                │
│  <existing block editor file>    │
└──────────────────────────────┘
```

- **Row design:** drag handle · type-icon tile (`w-7/8` token-filled) · title + **live summary line** (e.g. "Link · My Website · mysite.com", "Social icons · 4 platforms") · hover actions (duplicate / delete / hide) · chevron. Hidden rows dim + show a "Hidden" state.
- **Content / Design / Settings** segmented switch at the top of the panel:
  - **Content** = the section list (above).
  - **Design** = template grid + appearance + theme/palette (existing `BioAppearanceEditor` + the template presets currently in the linkinbio page).
  - **Settings** = slug/URL, SEO, publish, watermark, share toggles.

### 5.3 Architecture

New shell package: `src/components/dashboard/site-edit/shell/`

| File | Responsibility |
|---|---|
| `SiteEditorShell.tsx` | Full-screen layout. Hosts the **kept** top header (back · title · undo/redo · theme · Save), the **kept** preview header + iframe preview panel (device switch + zoom + browser chrome), and the **new** left panel. Owns the `iframeRef` and **exposes it** so each editor keeps its own debounced `postMessage` push — preview contract untouched. |
| `EditorPanel.tsx` | The left column: the `Content / Design / Settings` segmented switch + slot rendering for each view. |
| `SectionList.tsx` | Ordered, drag-reorderable list of section rows (hide / duplicate / delete / click-to-edit) + "Add" affordance. Driven by a **section registry** (below). |
| `AddSectionPicker.tsx` | Categorized picker of available section types, sourced from the registry. |
| `SectionDetail.tsx` | Drill-in wrapper: "‹ Back" header + renders the selected type's editor from the registry. |
| `types.ts` | `SectionModel<TData>`, `SectionRegistry`, `SectionCategory` types. |

**Section registry pattern (the DX win):** each editor supplies a registry mapping
`type → { label, icon, category, defaultData, summarize(data) → string, Editor }`.
`SectionList` reads it for rows + the add-picker; `SectionDetail` reads it for the drill-in form. **Adding/revising a section type = one registry entry + one editor file.**

### 5.4 linkinbio mapping (concrete)

Most of the engine already exists in `BioLinksEditor.tsx`, which today implements the block list, drag-reorder, add/remove/duplicate, visibility, the categorized add-picker (`BLOCK_CATEGORIES`), and the block-editor registry (`blockEditors/registry.tsx` → `BLOCK_EDITORS`). It is currently an **accordion** (`expandedId` expands `BlockBody` inline).

Migration work:

- **Convert accordion → drill-in:** replace `expandedId` inline expansion with `SectionDetail` navigation.
- **Promote** the block list from one of five tabs to the **Content** view.
- **Reuse** `BLOCK_CATEGORIES` for `AddSectionPicker` and `BLOCK_EDITORS` as the linkinbio registry's `Editor` map. Add `summarize()` per type for the row summary line.
- **Add** the pinned **Profile header** row → existing `BioProfileEditor`.
- **Map tabs:** today's `profile` → pinned Content row; `section` → Content list; `templates` + `appearance` → **Design**; `settings` → **Settings**.
- **Remove** the mini app-sidebar.
- **Slim** `linkinbio/[id]/page.tsx` to: hooks + state + its `sectionRegistry` + `<SiteEditorShell>`. Load/save/undo-redo/postMessage logic is preserved (moved or passed as props, not rewritten).

### 5.5 Drag-and-drop

Current `BioLinksEditor` uses manual HTML5 drag (`dragIdx`). `@dnd-kit` is already in the stack (`CLAUDE.md`). **Decision:** keep the existing manual drag for Spec 1 to limit risk (it works), and note `@dnd-kit` as an optional follow-up polish — not a blocker. *(Flag for plan: confirm whether to upgrade now or defer.)*

## 6. What Is Preserved (must not change behavior)

- Data load: `useLinkInBioSiteQuery` (`src/hooks/useLinkInBioSite`).
- The full save routine (sites / linkinbio_pages / linkinbio_blocks / linkinbio_items / forms / design tokens).
- `postMessage` preview shapes (`bio-content-update`, `theme-update`) and debounce.
- Undo/redo snapshots + Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y.
- Slug availability check, publish toggle, SEO fields.

## 7. Styling

- **Tokens only** — remove every per-tab hardcoded color. Active states use `--brand`; surfaces `--surface` / `--surface-muted`; borders `--border` / `--border-subtle`; text `--text-*`.
- Compact sizing per `dashboard-design.md` (no `rounded-2xl/3xl`, no `shadow-xl/2xl`, icon tiles `w-7/8`, radius `--radius-md/lg`).
- Focus rings on every interactive element: `focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]`.
- Light + dark resolve via tokens — no `dark:` overrides except logo asset swaps.

## 8. File Plan

**New:**
- `src/components/dashboard/site-edit/shell/{SiteEditorShell,EditorPanel,SectionList,AddSectionPicker,SectionDetail}.tsx`
- `src/components/dashboard/site-edit/shell/types.ts`
- `src/components/dashboard/site-edit/tabs/linkinbio/sectionRegistry.tsx` (wraps `BLOCK_EDITORS` + `BLOCK_CATEGORIES` + `summarize`)

**Modified:**
- `app/dashboard/sites/edit/linkinbio/[id]/page.tsx` — slimmed to compose `SiteEditorShell`.
- `BioLinksEditor.tsx` — refactored into `SectionList` consumption (accordion → drill-in) or retired in favor of `SectionList` if cleaner.
- `docs/reference/dashboard-map.md` — updated in the same change-set (the doc-drift Stop hook enforces this).

**Untouched:** `main`, `singlepage`, `payment` pages; `SiteVisualEditor.tsx`; all `blockEditors/*Block.tsx`; all hooks; storefront renderers.

## 9. Risks

- **linkinbio is the largest file** — this is a real refactor of one route. Mitigated by: the block editors + registry + add-picker already existing; preserving all data/save logic verbatim; migrating one editor only.
- **Shell generality vs. linkinbio specifics** — the shell must stay generic enough for main/single/payment later, but Spec 1 only proves it against linkinbio. Mitigation: keep editor-specific concerns (registry, save, preview push) in the page, not the shell.

## 10. Verification

- `npx tsc --noEmit` + `npm run lint` (zero new errors).
- Hardcoded-color grep from `dashboard-design.md` over the linkinbio route + shell → **zero hits**.
- Manual, in **light and dark**: load; edit each block type via drill-in; reorder; hide/show; duplicate; delete; add (each category); Profile edit; Design (template + appearance + theme); Settings (slug check, SEO, publish, watermark/share); Save persists; live preview updates while typing; undo/redo; device switch; View live.
- Confirm `main`, `singlepage`, `payment` still load and save unchanged.
- Update `docs/reference/dashboard-map.md`.

## 11. Open Questions for the Plan

1. Upgrade drag to `@dnd-kit` now, or defer (keep manual `dragIdx`)? *(Lean: defer.)*
2. Refactor `BioLinksEditor` in place vs. replace with `SectionList` + a thin linkinbio adapter? *(Lean: replace, so the shell engine is the single source of list behavior.)*
