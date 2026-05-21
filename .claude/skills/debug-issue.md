---
name: Debug Issue
description: Systematically debug issues in the DigiOne Next.js/Supabase codebase
---

## Debug Issue

Trace and fix bugs using graph-powered navigation tailored for this project.

### Steps

1. `semantic_search_nodes` — find the component, route handler, or util related to the symptom.
2. `query_graph callers_of` — trace where the broken function is called from (pages, API routes, hooks).
3. `query_graph callees_of` — trace what it calls (Supabase client, lib utils, external APIs).
4. `detect_changes` — check if a recent commit introduced the regression.
5. `get_impact_radius` on the suspect file to see blast radius before touching anything.

### Project-specific hints

- **Supabase RLS errors**: check `lib/supabase/` client setup and any `CREATE POLICY` SQL in migration files.
- **Route 404s / params undefined**: verify the file is inside the correct `app/(storefront)/` or `app/(dashboard)/` group and that dynamic segments match `[slug]` / `[siteId]` conventions.
- **Hydration mismatches**: look for `typeof window` guards or server-only imports leaking into client components.
- **Type errors**: run `npx tsc --noEmit` first — the error message usually points directly to the broken contract.
- **Auth issues**: check `src/components/dashboard/` and `app/api/` for stale session handling.
