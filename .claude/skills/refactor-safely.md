---
name: Refactor Safely
description: Plan and execute safe refactoring in DigiOne using dependency analysis
---

## Refactor Safely

Use the graph before touching anything. This codebase has shared lib utilities used across both storefront and dashboard — breaking one can silently break the other.

### Steps

1. `refactor_tool mode="dead_code"` — find unreferenced exports before deleting anything.
2. `refactor_tool mode="suggest"` — get community-driven split/extract suggestions.
3. `refactor_tool mode="rename"` — preview all locations affected by a rename before applying.
4. `apply_refactor_tool <refactor_id>` — apply the rename only after reviewing the preview.
5. `detect_changes` after edits — confirm the blast radius matches expectations.

### Safety checks specific to this project

- **`lib/` utils**: always run `get_impact_radius` — these are imported by both storefront and dashboard.
- **Supabase schema types**: types generated from the DB schema are used project-wide; renaming them requires updating all call sites.
- **Route segments**: renaming `[slug]` or `[siteId]` folder names breaks URL patterns — check `app/` route groups first.
- **Theme tokens / CSS vars**: used across many components; grep for the old name before renaming.
- **`src/components/dashboard/TopBar.tsx`** is currently modified — avoid touching it during unrelated refactors.

### After refactoring

- `npx tsc --noEmit` — catch any broken type contracts immediately.
- Check `get_affected_flows` to make sure no critical render or API path is broken.
