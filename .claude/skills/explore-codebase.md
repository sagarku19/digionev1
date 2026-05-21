---
name: Explore Codebase
description: Navigate DigiOne's Next.js App Router + Supabase structure using the knowledge graph
---

## Explore Codebase

Start with the graph, fall back to Glob/Grep only if the graph doesn't cover the area.

### Steps

1. `get_architecture_overview` — understand the top-level community split (storefront vs dashboard vs API vs lib).
2. `list_communities` — identify which community owns the area you're investigating.
3. `semantic_search_nodes <keyword>` — find a specific component, hook, or server action by name.
4. `query_graph imports_of <file>` — see what a file depends on.
5. `query_graph children_of <file>` — list all exports (functions, components, types) in a file.

### Project layout cheat-sheet

| Path | What lives here |
|------|----------------|
| `app/(dashboard)/` | Authenticated seller dashboard pages |
| `app/(storefront)/` | Public-facing storefront pages (dynamic `[siteId]`, `[slug]`) |
| `app/(marketing)/` | Landing / marketing pages |
| `app/api/` | Next.js Route Handlers (REST-style backend) |
| `src/components/dashboard/` | Dashboard UI components (TopBar, Sidebar, etc.) |
| `lib/supabase/` | Supabase client factories (server vs browser) |
| `lib/` | Shared utilities, types, helpers |

### Tips

- `app/(storefront)/[slug]/[childslug]/[postSlug]/` is the deepest dynamic route — trace params carefully.
- Dashboard components use a brand/theme token system — see `globals.css` or `tailwind.config` for CSS vars.
