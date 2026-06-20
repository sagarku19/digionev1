---
noteId: "a8aab9f05a5f11f183978dfe119e58b2"
tags: []
description: "Audit CLAUDE.md and .claude/rules/ for drift vs the current codebase"

---

You are a Backend Agent auditing this project's AI documentation against the actual codebase. **Do not edit any files** — audit only. At the end, summarize fixes and ask the user if they want them applied.

Run these checks in parallel:

### 1. Hooks — `.claude/rules/hooks-reference.md`
- Glob `src/hooks/**/use*.ts` (hooks live in domain subfolders) and list every exported hook.
- Compare against the table in `.claude/rules/hooks-reference.md`.
- Report hooks in code missing from the doc, and hooks in the doc that no longer exist.

### 2. Project Structure — `CLAUDE.md`
- List top-level directories under `app/` and `src/components/`.
- List route groups under `app/` (the `(group)/` folders).
- Compare against the Project Structure tree in `CLAUDE.md`.
- Report any directory in code missing from the tree, or any in the tree that no longer exists.

### 3. Tech Stack — `CLAUDE.md`
- Read `package.json` dependencies.
- Compare against the Tech Stack table in `CLAUDE.md`.
- Report removed packages still listed, or load-bearing packages (Next.js, Supabase, Tailwind, TanStack Query, Cashfree, Zustand tier) missing from the table. Ignore dev-only or trivial deps.

### 4. Anti-patterns — `.claude/rules/anti-patterns.md`
Grep for forbidden patterns. **Always verify matches are real, not placeholder/example strings inside JSX `placeholder=` props or comments.**
- `console\.log` in `src/` and `app/`
- `createClient(` inside files starting with `'use client'`
- Imports from icon libraries other than `lucide-react` (e.g. `@heroicons`, `react-icons`, `@radix-ui/react-icons`, `@tabler/icons`)
- Report each real violation with `file:line`.

### 5. Storefront sections — three-way wiring
- Glob `src/components/storefront/sections/*.tsx`
- Read the switch in `src/components/storefront/SectionRenderer.tsx`
- Read the `SECTION_TYPES` registry in `src/components/dashboard/site-edit/section-defs.ts`
- Report any section that exists on disk but isn't wired into both, or any case/registry entry pointing to a missing file.

### 6. Dashboard map — `docs/reference/dashboard-map.md`
- Glob `app/dashboard/**/page.tsx`.
- Compare against the Pages table in `docs/reference/dashboard-map.md`.
- Report routes on disk missing from the map, and rows pointing at routes that no longer exist.

### 7. Storefront map — `docs/reference/storefront-map.md`
- Read the renderer block-type branches in `src/components/storefront/LinkInBioPage.tsx` (or `src/components/storefront/linkinbio/blockRenderers/registry.tsx` if it exists), the editor registry `src/components/dashboard/site-edit/tabs/linkinbio/blockEditors/registry.tsx`, `src/components/storefront/SectionRenderer.tsx`, and `src/components/dashboard/site-edit/section-defs.ts`.
- Compare the generated type/section lists against `docs/reference/storefront-map.md`; report any drift.
- **Parity check:** diff the renderer block-type keys against the editor block-type keys. Report any type one side has that the other lacks.

---

## Output format

```
DRIFT REPORT
============================================
1. HOOKS
✅ in sync   OR   ❌ DRIFT — [N items]
   [details with file paths and suggested fix]

2. PROJECT STRUCTURE
...

3. TECH STACK
...

4. ANTI-PATTERNS
...

5. STOREFRONT SECTIONS
...

6. DASHBOARD MAP
✅ in sync   OR   ❌ DRIFT — [N items]
   [details]

7. STOREFRONT MAP
✅ in sync   OR   ❌ DRIFT — [N items]
   [details with parity gaps]

============================================
TOTAL: N categories in sync, M drift items.
```

After the report, ask: **"Apply the fixes? (y/n)"** — do not edit until the user confirms.
