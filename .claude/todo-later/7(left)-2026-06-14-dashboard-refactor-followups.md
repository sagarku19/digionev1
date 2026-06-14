---
noteId: "af01a86067e111f1bffb2f446ab401a4"
tags: []

---

# Dashboard production refactor — remaining follow-ups (2026-06-14)

Deferred from the area-by-area dashboard production refactor (Areas 1–7, 17
commits on `main`). Spec + audit: `docs/superpowers/specs/2026-06-14-dashboard-production-audit-design.md`.
Plan: `docs/superpowers/plans/2026-06-14-dashboard-area1-foundation.md`. Background/decisions in agent memory `dashboard_production_refactor.md`.

Validation bar for all of these (project convention, no test suite): `npx tsc --noEmit` + `npm run lint` + residual-color grep + careful diff review. Behavior must stay identical **except** the explicitly-flagged latent-bug fixes.

---

## 1. ⭐ `products/[productId]` dynamic `any` + `is_free` / `tags` latent bugs (HIGH value)

**File:** `app/dashboard/products/[productId]/page.tsx` (~11 explicit `any`; the file's `formData`/`edits`/`patch` are typed `any`). Related: `app/dashboard/products/page.tsx:376` (kept a narrow `(product as { is_free?: boolean })` cast in Area 1).

**Root cause:** `formData: any = { ...sourceProduct, ...edits }` (line ~190) is untyped, so every `formData.x` access is `any`. Once `formData` is typed, the real issues surface.

**Verified against `types/database.types.ts` (live schema):**
- `products.metadata` (jsonb) — **EXISTS**. `formData.metadata.includes` (369/370) is fine once typed.
- `products.is_on_discover_page` (bool) — **EXISTS**. The `(formData as any).is_on_discover_page` (525/526) is only untyped because `formData` is `any`.
- `products.is_free` — **DOES NOT EXIST**. Referenced at lines 133, 136, 218, 386, 391, 408 (+ `products/page.tsx:376`). → **Latent bug:** free products render `₹0` instead of "Free". The overview (`app/dashboard/page.tsx`) already uses `price === 0`.
- `products.tags` — **DOES NOT EXIST**. Referenced at 508/509. → **Latent bug:** tags entered in the editor never persist.

**Plan:**
1. Type the draft state. Define `type ProductDraft = Database['public']['Tables']['products']['Row']` (or `Partial<Row>` for `edits`); type `formData`/`patch`/`ProductStatsSidebar` props off it. Removes ~9 of the `any`.
2. **Decide `is_free`** (recommended: option A, no schema change):
   - A) Replace `product.is_free` with `product.price === 0` everywhere (matches the overview's existing semantics) — fixes the ₹0-vs-Free bug in both the editor and `products/page.tsx:376`.
   - B) Add a real `products.is_free boolean` column (migration + regen types) if "free" must be independent of price.
3. **Decide `tags`** (recommended: option A):
   - A) Store tags in the existing `metadata` jsonb (`metadata.tags: string[]`) — no schema change; mirrors the `profiles.metadata` fix (commit 18474ed).
   - B) Add a real `products.tags text[]` column (migration + regen types).
4. Drop the remaining `as any` casts in both files after typing.

**Pattern to mirror:** the `profiles.metadata` fix — migration via Supabase MCP `apply_migration`, regen types via MCP `generate_typescript_types` (Windows CLI is broken), then code. Project: `qcendfisvyjnwmefruba`.

---

## 2. Site-edit editor-INTERNAL `any` (MEDIUM, more entangled)

These are dynamic section/draft state in the visual editors (not hook data):
- `src/components/dashboard/site-edit/SiteVisualEditor.tsx` (~5)
- `src/components/dashboard/site-edit/SectionManager.tsx` (~3)
- `src/components/dashboard/site-edit/tabs/singlepage/SinglePageContentEditor.tsx` (~2), `SinglePageAppearanceEditor.tsx` (1)
- `src/components/dashboard/site-edit/tabs/linkinbio/BioProfileEditor.tsx` (~2), `BioAppearanceEditor.tsx` (1)
- `src/components/dashboard/site-edit/tabs/SettingsPanel.tsx` (1)
- `src/components/dashboard/site-edit/tabs/linkinbio/BioLinksEditor.tsx` (`Record<string, any>` defaults in `addLink`) + `blockEditors/types.ts` (`BioLink.metadata: any` — pre-existing, faithful to original).

Approach: type each editor's section/config shape (likely from `site_design_tokens` / `site_sections_config` row types or a local discriminated union). Lower ROI, higher entanglement — do per-editor with care.

---

## 3. Sizing-discipline drift (LOW, cosmetic/visual — needs eyes, not a codemod)

`font-extrabold` / `font-black` / `text-lg+ font-bold` card titles vs the design system's `text-base font-semibold` (see `.claude/rules/dashboard-design.md` → Sizing discipline). ~24 files dashboard-wide (e.g. marketing 2–4 each, products, orders, overview, autodm). NOT swept during the refactor because it's a visual change and "behavior/UI identical" was the constraint. Do as a deliberate eyes-on pass, light + dark, not a blind find/replace.

---

## 4. Re-run the multi-agent code review

The `/code-review`-style multi-agent (3× `nextjs-code-reviewer`) review was requested but couldn't run (agent session limit). An inline review was done (tsc green; BioLinksEditor split proven behavior-equivalent by diffing metadata keys/fields/registry vs the pre-split git rev). Re-run the agents after the limit resets for an independent second pass over commits `27da72d..HEAD`.

---

## Also: manual smoke-test (no test suite — important)
Click through, light + dark: **link-in-bio editor** (add/edit/reorder/duplicate **product / lead-form / social-icons** blocks, save), **products page** (create product, build upsell, delete, bulk archive), **settings/profile** (set tagline + socials → Save → reload; previously errored, fixed in 18474ed), and the 3 site-edit pages after the token sweep.
