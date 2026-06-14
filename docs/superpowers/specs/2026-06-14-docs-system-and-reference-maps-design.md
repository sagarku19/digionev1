---
noteId: "1457e7b0680011f19aeeff0b58723b31"
tags: []

---

# Docs System + Reference Maps — Design

**Date:** 2026-06-14
**Status:** Design (awaiting user review)
**Author:** Claude + sagarkushwaha5599@gmail.com
**Companion spec (separate, executed next):** Storefront type + structure refactor ("best prompt" — see Notes)

---

## Problem

DigiOne has strong AI-facing docs already (`.claude/rules/*.md`, `/sync-docs`, `docs/db/*`), but three gaps cost tokens and cause drift:

1. **No dashboard structural map.** `dashboard-design.md` covers the *design system*, not *what each page does*. Any dashboard task today means globbing + reading ~20 page files to rediscover which hooks/components/APIs a page uses.
2. **No storefront reference doc.** The 4 site types (link-in-bio, single-page, store, payment), their slug pages, renderers, and block/section registries are undocumented as a unit.
3. **No freshness mechanism.** `settings.json` has `hooks: {}`. Nothing nudges docs to stay in sync when code changes — and **slug pages + editors are under active, heavy edits**, so drift is the default.

**Goal:** give Claude a one-read map per surface (so it stops re-exploring — the token win), and a mechanism that keeps those maps fresh automatically as the churn continues.

---

## Constraints & principles

- **Regenerable, not hand-maintained.** Both maps are derived from structural sources (routes on disk, registries, `section-defs.ts`). Edits trigger a re-sync; they never force a manual rewrite. This is non-negotiable given ongoing slug/editor churn.
- **Token economy first.** Big maps live in `docs/reference/` (read on-demand, **zero baseline cost**). Only one-line pointers go into the always-loaded `CLAUDE.md`.
- **Cross-platform.** User is on Windows/PowerShell. The freshness hook is a Node script (no bash/PowerShell divergence).
- **No false magic.** "Automatic" = a Stop hook that *reminds* + `/sync-docs` that *regenerates* + a CLAUDE.md rule that makes map-update part of definition-of-done. Claude does not silently rewrite prose on every keystroke.
- Follows existing conventions: reference docs mirror the table style of `api-routes.md` / `hooks-reference.md`.

---

## Architecture — three layers

| Layer | Files | Loaded |
|---|---|---|
| **Reference maps** | `docs/reference/dashboard-map.md`, `docs/reference/storefront-map.md` | On-demand (read for relevant tasks only) |
| **Pointers** | 2 lines in `CLAUDE.md` (Reference Files table) | Always (baseline cost ≈ 2 lines) |
| **Freshness** | `.claude/hooks/check-doc-drift.mjs` (Stop hook) + extended `/sync-docs` + 1 CLAUDE.md rule | Hook runs at end-of-turn; sync on demand |

---

## Component 1 — `docs/reference/dashboard-map.md`

One row per route under `app/dashboard/**`. Columns:

| Route | Purpose | Hooks | Key components | API routes | RLS / Notes |
|---|---|---|---|---|---|

- **Header block** (top of file): `Last synced: YYYY-MM-DD`, the glob it is generated from (`app/dashboard/**/page.tsx`), and `Regenerate: /sync-docs`.
- Covers the site-edit **editors** too (`src/components/dashboard/site-edit/tabs/**`) as a short sub-section, since those are actively churning — keyed by site type → tab files. Kept structural (file → what it edits), not visual.
- "Key components" lists only shared/primitive components (`DataTable`, `SideDrawer`, etc.) and the page's own top-level component — not every leaf.
- RLS/Notes flags revenue/security-sensitive tables a page reads (`orders`, `creator_balances`) and any Zustand store used. Empty for most rows.

**Source of truth for generation:** route files on disk + their imports. Drift check compares routes-on-disk vs rows.

## Component 2 — `docs/reference/storefront-map.md`

Keyed by **site type**, derived from structural sources so it survives slug/editor churn:

```
Site type → URL pattern → slug page (server) → renderer component → registry/section source → creator-var contract
```

Per type, a compact section:
- **link-in-bio** — `/link/[username]` → `link/[username]/page.tsx` → `LinkInBioPage.tsx` → `linkinbio/blockRenderers/registry.tsx` (list of block types, generated from the registry keys) → creator vars used.
- **single-page** — `/site/[slug]` → `ProductSalesPage.tsx` (fixed template; sub-components list).
- **store** — `/store/[slug]` → section-based via `SectionRenderer.tsx` ← `section-defs.ts` `SECTION_TYPES` (generated list).
- **payment** — `/pay/[siteId]` → `PaymentLinkPage.tsx`.
- Also list `upsells/[slug]` and `store/product/[productId]` as standalone pages.

- **Block/section type lists are generated from the registries**, not enumerated by hand — adding a type updates the map via `/sync-docs`.
- **Header block** identical pattern (last-synced, source globs, regenerate command).
- First fill is generated against current structure; explicitly marked regenerable. After the companion refactor lands (which introduces `blockRenderers/`), re-sync updates the link-in-bio row.

## Component 3 — Freshness: Stop hook

`.claude/hooks/check-doc-drift.mjs`, wired in `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      { "matcher": "", "hooks": [ { "type": "command", "command": "node .claude/hooks/check-doc-drift.mjs" } ] }
    ]
  }
}
```

**Script logic:**
1. Read Stop-hook JSON from stdin. If `stop_hook_active === true` → `exit 0` (loop guard).
2. Get changed files this session via `git status --porcelain` (uncommitted working-tree + staged — the realistic pre-commit window).
3. For each **watched pair**, if any source file changed **and** the matching map file did **not** change → collect a reminder.
4. If reminders exist → emit `{"decision":"block","reason":"<which dirs changed, which map to update or confirm no-op>"}` (one consolidated message). Else `exit 0`.

**Watched pairs:**
- `app/dashboard/**`, `src/components/dashboard/**` → `docs/reference/dashboard-map.md`
- `app/(storefront)/**`, `src/components/storefront/**` → `docs/reference/storefront-map.md`

The reminder is **dismissable by action**: Claude either updates the map or confirms the change doesn't affect it (e.g. a CSS-only tweak), then stops normally on the next turn (the map now shows as changed, or nothing watched changed).

## Component 4 — Freshness: extend `/sync-docs`

Add two checks to `.claude/commands/sync-docs.md` (audit-only, asks before applying — existing pattern):

6. **Dashboard map** — glob `app/dashboard/**/page.tsx`; report routes missing from `dashboard-map.md` or rows pointing at deleted routes.
7. **Storefront map** — compare site-type sections + generated block/section type lists against `storefront-map.md`; **and** run the editor↔renderer **parity check**: diff `blockEditors/registry.tsx` keys against `blockRenderers/registry.tsx` keys, flagging any type one side has that the other lacks.

## Component 5 — CLAUDE.md edits

- **Reference Files table:** 2 new rows pointing at `docs/reference/dashboard-map.md` ("read first for any `app/dashboard/**` work") and `docs/reference/storefront-map.md` ("read first for any storefront work").
- **Absolute Rules → Code Quality:** one line — "When you change a dashboard route or storefront renderer/registry, update the matching map in `docs/reference/` in the same change-set (or confirm it's unaffected). The Stop hook enforces this."

---

## Sequencing (drives the implementation plan)

1. **Scaffold** — create `docs/reference/`, write `check-doc-drift.mjs`, wire the Stop hook in `settings.json`, extend `/sync-docs` (+2 checks), add CLAUDE.md pointers + rule.
2. **Generate `dashboard-map.md`** — one sweep of `app/dashboard/**` + site-edit tabs; fill the table.
3. **Generate `storefront-map.md`** — from current structural sources (registries, section-defs, site types).
4. **Verify the loop** — make a trivial edit under a watched dir, confirm the Stop hook fires; run `/sync-docs` and confirm the two new checks report correctly.

**Out of scope (companion spec):** the storefront refactor itself (slug-page `any` cleanup, `LinkInBioPage` → `blockRenderers/` registry split, `ProductSalesPage` cleanup, `SectionRenderer`/`PaymentLinkPage` typing). When that lands, step 3's link-in-bio row is refreshed via `/sync-docs`.

---

## Risks / tradeoffs

- **Stop hook friction.** Mitigated: only blocks when a watched dir changed *and* the map didn't; loop-guarded; one consolidated message; dismissable by confirming no-op.
- **Map staleness during heavy churn.** Accepted and designed-for: maps are generated, the hook nudges, `/sync-docs` regenerates. The maps stay *structurally* accurate even if a row's prose lags.
- **`git status` misses already-committed changes mid-session.** Acceptable: the realistic workflow updates docs before committing; `/sync-docs` is the full-audit backstop.
- **Baseline token cost** of pointers is ~2 lines — negligible vs. the exploration it saves.

## Success criteria

- A dashboard or storefront task can be started by reading **one** map file instead of globbing + reading many files.
- Editing a watched dir without updating its map surfaces a reminder before the turn ends.
- `/sync-docs` reports drift for both new maps and the editor↔renderer parity gap.
- Maps regenerate cleanly after the companion refactor and after ongoing slug/editor edits — no manual rewrite required.
