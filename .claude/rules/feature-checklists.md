---
noteId: "c2ead3205a5711f183978dfe119e58b2"
tags: []

---

# How to Add a New Feature (checklist)

## New dashboard feature
1. `app/dashboard/[feature]/page.tsx` — page
2. `src/hooks/[domain]/use[Feature].ts` — TanStack Query hook. Hooks live in domain subfolders: `auth/`, `creator/`, `products/`, `commerce/`, `marketing/`, `analytics/`, `notifications/`, `sites/`, `site-editor/`, `storefront/`. Import via the full path (`@/hooks/[domain]/use[Feature]`).
3. `src/components/dashboard/` — UI components
4. `src/components/dashboard/Sidebar.tsx` — add nav link
5. `app/api/[feature]/route.ts` — any data mutations

## New storefront section
1. `src/components/storefront/sections/` — component
2. `src/components/dashboard/site-edit/section-defs.ts` — register it
3. `src/components/storefront/SectionRenderer.tsx` — add case
4. Add editor tab if user needs to configure it

## Bug fix
1. Find the exact file and line
2. Fix only that — no surrounding cleanup or refactoring
3. Run `npx tsc --noEmit` to confirm TypeScript passes
