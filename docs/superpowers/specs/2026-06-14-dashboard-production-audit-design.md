---
noteId: "582b5930677011f1bffb2f446ab401a4"
tags: []

---

# Dashboard Production-Grade Audit & Refactor — Design

**Date:** 2026-06-14
**Agent role:** Dashboard Agent (`app/dashboard/**`, `src/components/dashboard/**`)
**Type:** Structure / readability / maintainability — **no behavior, UI, route, business-logic, or contract changes.**

---

## Scope & agreed approach

| Decision | Choice |
|---|---|
| Sequencing | **Audit-all (read-only) → refactor area-by-area**, each area its own approve → refactor → verify gate |
| Per-area validation bar | `npx tsc --noEmit` clean + `npm run lint` clean + residual-color grep clean + careful diff self-review (no manual click-through gate) |
| File-splitting appetite | **Aggressive** — split the giant files into focused sub-components/helpers |

**Fixed contracts — do not change:** `app/api/**`, `src/hooks/**`, `types/database.types.ts`, `supabase/**`, storefront/marketing/auth surfaces, `globals.css` tokens. No new packages.

**Acknowledged risk:** aggressive splits + no manual-click gate + no test suite = highest regression surface with the lightest behavior check. `tsc` catches signature/import breakage, not logic-equivalence (e.g. a `useEffect` dep subtly changing, a handler losing a closure value). Mitigation: every extraction is a pure mechanical move, reviewed diff-by-diff. A quick self-smoke of each area is recommended even though it is not a formal gate.

---

## Surface measured

- **Pages:** 41 files, ~17,200 lines.
- **Components:** 24 files, ~7,800 lines.
- **Signal counts:** ~861 hardcoded-color/`dark:` grep hits across 27 files (subset are legit — brand `#E83A2E`, `bg-white/N` overlays — needs eyes); **155 `: any`/`as any`**; 63 `useEffect`; 24 silent/empty `catch`; 4 `console.`; **11 hand-copied `formatINR` definitions, zero shared format util**.

---

## Root causes (the audit collapses to a handful of systemic patterns)

1. **Gratuitous `any` over already-typed hook data.** `useProducts` returns `ProductRow[]`, `useEarnings` returns typed rows, etc. Pages still write `products.filter((p: any) => …)` and even `(payouts as any[])` — actively discarding types the hooks hand them. → Near-mechanical fix: delete the annotation, let inference work. Not a typing project.
2. **No shared formatting layer.** `formatINR` is redefined 11× (analytics has an identical `formatINR` *and* `formatINRFull`); `timeAgo` redefined 3×. No `src/lib/format.ts`.
3. **Dead `SiteEditShell` + fragmented `site-edit` primitives.** `SiteEditShell.tsx` (598 lines, exporting its own `Card`/`Field`/`INPUT`) has **no importer** — confirmed dead code. The live duplication is `INPUT` redefined in ~16 tab files (intentional per-editor accent colors over a duplicated, token-violating base) and `FieldLabel` copied across ~8 files. Styling drift is concentrated here.
4. **Giant multi-responsibility files** in `site-edit/**` and a few pages (mock-data `autodm` page; products page bundling 5 modals/panels).
5. **Sizing-discipline drift** vs `dashboard-design.md` — `font-extrabold`/`text-lg`+ card titles in ~24 files.
6. **Errors swallowed silently** — 24 empty `catch {}`; `err: any` catch blocks.

---

## PASS 1 — Punch-list by severity

Format: `FILE → LINE(S) → ISSUE → IMPACT → FIX`.

### Critical
_None._ No correctness, security, or money-path defects found in the dashboard layer (those live in API/hooks, which are out of scope and already audited). "Critical" here would mean a structural defect actively causing bugs; none observed.

### High

- **`src/components/dashboard/site-edit/SiteEditShell.tsx` → whole file (598) → Dead code.** No file in `app/` or `src/` imports `SiteEditShell` (or its exported `Card`/`Field`/`INPUT`); the editor pages build their shells inline. → 598 lines of orphaned code mislead onboarding devs and inflate the `site-edit` surface. → Delete the file (Area 2), after a final confirm-no-importer grep. (Its `useState<any>` / effect-fetch concerns are moot once deleted.)
- **`site-edit/tabs/**` → ~16 local `INPUT` consts + ~8 local `FieldLabel` copies → Fragmented per-tab primitives.** Each tab redefines `INPUT` with a hardcoded, token-violating base (`bg-gray-50`, `placeholder-gray-400`, `focus:ring-*-500`) and an intentional per-editor accent (pink/purple/orange/emerald/indigo/blue/amber). `FieldLabel` is copy-pasted. → Token drift + 16-place edits. → Extract one accent-parametrized `INPUT` builder + a shared `FieldLabel` into a `site-edit/_shared` module; replace gray hardcodes with tokens, keep the accent per editor (Area 2).
- **`src/components/dashboard/site-edit/tabs/linkinbio/BioLinksEditor.tsx` → 142–1190 → 13+ `link_type` branches rendered inline in one 1,190-line component.** → Unreadable, unmaintainable; adding a block type means editing a 1,200-line file. → Aggressive split: one `<…BlockEditor>` per `link_type` (file-per-type or a `blockEditors` registry), shared `Chip`/`AlignPicker`/`FieldLabel` lifted to a local `_shared`.
- **`app/dashboard/autodm/page.tsx` → whole file (1,351) → Entirely `MOCK_AUTOMATIONS` static data, no hooks, but linked live in Sidebar.** → A non-functional prototype ships as a real feature; biggest file, near-zero real value, pure debt. → **Decision needed** (see Open Decisions). Default recommendation: extract its types + mock to a clearly-labeled `_prototype` module and split the view switch; do not invest in deep refactor of a mock.
- **`app/dashboard/sites/edit/{linkinbio,main,singlepage}/[id]/page.tsx` → 1,516 / 1,064 / 966 → Oversized editor pages combining data shaping + handlers + render.** → Hard to navigate/extend. → Extract per-section sub-editors and data-shaping helpers; route shared chrome through `SiteEditShell`.

### Medium

- **~155 `: any` / `as any` across pages → e.g. `analytics:60,96`, `earnings:78,83,90`, `products:86–166`, `orders:24,69,189`, `page.tsx:49,78,135`, `coupons/leads/affiliates/notifications` map callbacks → Gratuitous annotations over typed hook data.** → Defeats strict mode where it's already free. → Delete annotations / type props from `database.types` Row types. Mechanical, low-risk, high-ROI.
- **11× `formatINR` + 3× `timeAgo` duplicated; no shared util → analytics/customers/earnings/orders/products/page/upsells/subscription → Copy-paste formatting, subtly divergent (compact variants, identical dupes).** → One currency-format change must be made in 11 places. → Extract a shared format module (location is an Open Decision — `src/lib/format.ts` is outside the agent boundary).
- **Sizing-discipline drift (~24 files) → e.g. `page.tsx:202,280`, `products:8 hits`, `autodm:11 hits` → `font-extrabold`/`font-black`/`text-lg+ font-bold` card titles vs `dashboard-design.md` (`text-base font-semibold`).** → Visual inconsistency, contradicts the documented system. → Normalize card titles to the spec. (Confirm none are intentional hero treatments first.)
- **24 silent/empty `catch {}` + `err: any` → e.g. `products:113,148,162`, `earnings:69` → Creation/mutation failures swallowed, no user feedback.** → Users see nothing on failure; undebuggable in prod. → Narrow to `catch (err: unknown)` and surface a minimal error state (no new toast lib — use existing inline error patterns).
- **Token violations concentrated in `site-edit/**` → linkinbio page 100 hits, BioLinksEditor 84, main 81, singlepage 74, SiteEditShell 65 → Hardcoded Tailwind colors / `dark:` overrides where tokens exist.** → Dark mode correctness + drift. → Replace with `var(--*)` tokens; manually confirm each (some `bg-white/N` overlays / `#E83A2E` are legit).

### Low

- **`app/dashboard/products/page.tsx` → 99 → `next.has(id) ? next.delete(id) : next.add(id)` ternary-as-statement.** → Lint smell. → `if/else`.
- **`analytics/page.tsx` → 32 → `formatINRFull` identical to `formatINR`.** → Dead alias. → Remove, collapse callers.
- **Component-shell ordering deviations** (helpers/sub-components scattered above the default export in several files) vs the CLAUDE.md shell convention. → Minor onboarding friction. → Reorder during each area's pass; sub-components to file bottom.
- **Unused imports** — spot-checked; confirm per-file with lint during each area pass rather than pre-listing.

---

## Scores (current state)

| Dimension | Score | Note |
|---|---|---|
| Architecture | 6/10 | Sound app-router + hooks layering; undermined by parallel `Card`, mock `autodm`, giant editors |
| Maintainability | 5/10 | 11× formatter dupes, 1,000–1,500-line files, swallowed errors |
| Readability | 6/10 | Pages use primitives well; giant editors + inline `any` drag it down |
| Scalability | 6/10 | Adding a link-type/editor section means editing a huge file; no shared util layer |
| Onboarding | 5/10 | Good CLAUDE.md/rules; reality drifts from them (two Cards, sizing, mock feature) |
| **Overall production-readiness** | **5.5/10** | Solid bones, consistent debt patterns — most of it mechanically fixable |

### The four questions

1. **Would a senior engineer approve this structure?** Conditionally. The layering (App Router pages → TanStack hooks → typed Supabase) is correct and the primitive/token system is well-documented. They would block on: the parallel `Card`, the 1,000–1,500-line editor files, the mock `autodm` shipping as a feature, and `any` over typed data.
2. **Could a new developer onboard efficiently?** Partially. The rules files are excellent, but the code drifts from them (two Cards, sizing, swallowed errors), so a newcomer can't trust the docs as ground truth — the most expensive kind of friction.
3. **Is it easy to extend?** For list/form pages, yes (clear archetypes). For `site-edit`, no — the giant editors are the main extension barrier.
4. **Top 10 highest-ROI improvements** (ordered):
   1. Delete gratuitous `any` over hook data — strict mode for free, mechanical, repo-wide.
   2. Extract a shared format module (`formatINR`/`formatINRCompact`/`timeAgo`).
   3. Reconcile the two `Card` primitives.
   4. Split `BioLinksEditor` by `link_type`.
   5. Decide + handle `autodm` mock (label/relocate, don't deep-refactor).
   6. Token-violation sweep in `site-edit/**` (verify each).
   7. Surface swallowed `catch` errors.
   8. Split the three giant editor pages into sub-editors.
   9. Normalize card-title sizing to `dashboard-design.md`.
   10. Reorder files to the shell convention + lint-driven dead-import cleanup.

---

## PASS 2 — area sequence (each gated: approve → refactor → tsc + lint + grep → next)

1. **Cross-cutting foundation** — shared `src/lib/format.ts` (+ migrate 11 dupes, delete dead `formatINRFull`); `any`-over-hook-data sweep. (Unblocks everything else. `Card` reconcile removed — see below.)
2. **`site-edit/**`** — biggest debt: **delete dead `SiteEditShell`**, extract shared `INPUT` builder + `FieldLabel` to `_shared`, split `BioLinksEditor` by `link_type`, the three editor pages, token sweep.
3. **`products` + `orders`** — split modals/panels, dedupe, types, error surfacing.
4. **`settings/**`** — billing/profile/subscription forms.
5. **`marketing/**`** — coupons/leads/affiliates/community/referrals/services.
6. **`analytics` + `earnings`** — dedupe, types, casts.
7. **Shell + misc** — `Sidebar`, `TopBar`, `ImagePickerModal`, overview, smaller pages.
8. **`autodm`** — annotate only (prototype header comment + backlog note); no refactor, per decision 2.

---

## Resolved decisions (locked 2026-06-14)

1. **Shared format util location → `src/lib/format.ts`.** The Dashboard-Agent boundary is relaxed for this **one** new pure-utility file. It exports `formatINR` / `formatINRCompact` / `timeAgo`; all 11+ dashboard copies are replaced with imports. (`src/components/dashboard/lib` was rejected.) No other `src/lib` files are touched.
2. **`autodm` mock page → leave as-is, documented.** No structural refactor. Add a header comment marking it a non-wired prototype and log it as backlog. Excluded from the Pass-2 refactor work (Area 8 becomes "annotate only").
3. **`SiteEditShell` → superseded by audit re-verification.** The original "type now, defer rewire" decision is moot: `SiteEditShell.tsx` was confirmed to have **no importer** and is dead code. Action is now a straight deletion in Area 2 (after a final confirm-no-importer grep), not a typing/rewire task.

---

## Next step

After user review of this spec → invoke **writing-plans** to produce the detailed Pass-2 implementation plan, starting with Area 1 (cross-cutting foundation).
