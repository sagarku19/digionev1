---
noteId: "401bc2906bc011f19a5ba9a9f70f067a"
tags: []

---

# Link-in-Bio folder reorg — deferred until all 4 site editors are upgraded

**Status:** left (not started)
**Added:** 2026-06-19
**Trigger to resume:** after the **main**, **single-page**, and **payment** editors get the same token + brand-accent + structure upgrade the link-in-bio editor just received. Do the reorg across all of `site-edit/tabs/**` at once so shared components land in the right home.

## Why deferred
The link-in-bio editor polish is complete (token-clean, brand accent, accessibility, dead-code removed). The user asked to also reorganize the link-in-bio files into clearer folders, then decided to **defer the folder move until the other 3 editors are upgraded** — so the restructure is done holistically, not just for one type.

## Constraint that shaped the plan (important)
`tabs/linkinbio/BioAppearanceEditor.tsx` is **shared** — imported by the **main store** editor (`app/dashboard/sites/edit/main/[id]/page.tsx:21`) as well as link-in-bio. Single-page has its own `SinglePageAppearanceEditor.tsx`. So a "move everything into a linkinbio-only folder" is wrong for `BioAppearanceEditor`. Likewise `site-edit/editor/{EditorTopBar,PreviewPane}` are shared via `shell/SiteEditorShell` (main/single/payment). Don't move shared pieces into a type-specific folder.

## Proposed target (link-in-bio specifics only)
Group the block SYSTEM under one folder; keep tab-panel entry points at the linkinbio root:
```
tabs/linkinbio/
  blocks/                     ← rename of blockEditors/ + move the glue files in
    registry.tsx              (link_type → editor; exports BlockBody)
    sectionRegistry.tsx       (shell adapter → linkinbioRegistry)
    blockCategories.tsx       (block-type catalogue + re-exports BioLink)
    summarize.ts
    _shared.tsx               (INPUT/Chip/AlignPicker/SEG/ACCENT_BTN/HELP)
    types.ts                  (BioLink, ProductLite, BlockEditorProps — canonical)
    *Block.tsx ×14
  BioProfileEditor.tsx        (panel, linkinbio-only)
  BioTemplates.tsx            (panel)
  BioSetupWizard.tsx          (onboarding)
  BioAppearanceEditor.tsx     (SHARED with main — leave at root)
```

## Import edits required when doing it (use `git mv` to keep history)
Folder rename `blockEditors/` → `blocks/` keeps the same depth, so internal `./` and `../../../_shared/editorStyles` imports stay valid. Moving the 3 glue files INTO `blocks/` changes depth by one:
- `blockCategories.tsx`: `./blockEditors/types` → `./types`.
- `summarize.ts`: `./blockEditors/types` → `./types`.
- `sectionRegistry.tsx`: `./blockEditors/types` → `./types`; `../../shell/types` → `../../../shell/types`; `./blockCategories` and `./summarize` stay.
- External consumer `app/dashboard/sites/edit/linkinbio/[id]/page.tsx`: `blockEditors/types` → `blocks/types`, `blockEditors/registry` → `blocks/registry`, `sectionRegistry` → `blocks/sectionRegistry`.
- Storefront `src/components/storefront/linkinbio/blockRenderers/registry.tsx` only has a *comment* referencing `blockEditors/registry.tsx` — update the comment, no import.
- Naming note: keep the editor side distinct from the storefront `blockRenderers/`. If `blocks/` blurs that, consider keeping `blockEditors/` and instead nesting glue under it.

After moving: `npx tsc --noEmit`, scoped `eslint` on touched files, and update `docs/reference/dashboard-map.md` (link-in-bio row already lists these files).

## Done in the same session (for reference — already complete)
Link-in-bio token/brand/a11y pass; `BioLinksEditor.tsx` (dead) removed and its exports extracted to `blockCategories.tsx`; shared `_shared.tsx` consts added.
