---
noteId: "8ccdea20683011f19aeeff0b58723b31"
tags: []

---

# Dashboard health-check findings — 2026-06-15

Read when picking up dashboard hardening, or when asking "what's wrong in the dashboard?".

Snapshot from a read-only health sweep (`tsc` + `eslint` + `vitest`) of `app/dashboard/**`, `src/components/dashboard/**`, `app/(storefront)/**`, `src/components/storefront/**`, taken 2026-06-15. **Storefront was clean** (0 `any`, tsc clean, 12 tests passing — only pre-existing cosmetic lint: `<img>` warnings, 2 unescaped `"` in `TestimonialsCarousel`, the `PriceBlock` static-component pattern in `ProductBlock`). The items below are all **dashboard-side**.

Baseline at capture: `npx tsc --noEmit` = clean repo-wide; `npm test` = 2 files / 12 tests passing. Lint: dashboard **91 errors / 111 warnings**, storefront **9 errors / 31 warnings** (storefront errors all pre-existing cosmetic).

## 1. 🔴 Media library targets a dropped bucket (likely prod-broken)
- `app/dashboard/media/page.tsx:33` — `const BUCKET = 'uploads';` (also referenced in the header comment at line 3 and path-parsing at lines 85–87).
- Per `CLAUDE.md` / `.claude/rules/api-routes.md`, the `uploads` and `user_files` buckets were **dropped 2026-06-03** (`supabase/migrations/20260605100000_drop_legacy_storage_buckets.sql`). So the media library reads/writes a bucket that no longer exists.
- The page also does direct `createClient` + `getCreatorProfileId` storage calls rather than going through `/api/upload` (the hardened, quota-checked path).
- **Fix sketch:** repoint to `creator-public` (public assets) and/or `creator-content`, and route uploads through `POST /api/upload`. Verify against the live bucket list before coding. Read `.claude/todo-later/1(left)-2026-06-03-storage-followups.md` first.

## 2. 🟠 react-hooks/rules-of-hooks violation in autodm
- `app/dashboard/autodm/page.tsx:1142` — `useTemplate` is called inside a callback (`react-hooks/rules-of-hooks` error). There's a related issue around `:1082`.
- autodm is a **documented non-wired prototype** (commit `554831a` "docs(autodm): mark the page as a non-wired prototype"), so it's not user-reachable — low urgency, but it's a genuine violation and a runtime crash risk if the page is ever wired up. Fix when productionising autodm (or delete the prototype).

## 3. 🟡 ~81 `no-explicit-any` lint errors in the site-edit editors
- The dashboard never got the storefront's type pass. `@typescript-eslint/no-explicit-any` errors cluster in:
  - `app/dashboard/sites/edit/linkinbio/[id]/page.tsx` (~18)
  - `app/dashboard/products/[productId]/page.tsx` (~9)
  - `app/dashboard/sites/edit/singlepage/[id]/page.tsx` (~8)
  - `app/dashboard/sites/edit/main/[id]/page.tsx` (~5)
  - `src/components/dashboard/site-edit/section-defs.ts` (~4), `SiteVisualEditor.tsx` (~3), `SectionManager.tsx` (~3), `BioProfileEditor.tsx` (~2), …
- **This is already parked** in `.claude/todo-later/7(left)-2026-06-14-dashboard-refactor-followups.md` ("site-edit editor-internal `any`"). Same uniform pattern the storefront pass used (narrow jsonb once; type DB rows) applies. Note `tsc` passes despite these — they're lint-rule violations, not type errors (the `any`s are explicit).

## 4. Cosmetic (whole dashboard)
- `<img>` (`@next/next/no-img-element`) warnings throughout and 2 `react/no-unescaped-entities` errors — low priority, fix opportunistically when touching the files.

## Not a bug, but worth knowing
- Several site-edit pages do **direct `createClient` for saves** in client components (flagged in `docs/reference/dashboard-map.md`). Pre-existing pattern, not a regression; revisit if/when those saves move behind hooks or `/api/*`.
