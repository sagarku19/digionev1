---
noteId: "d2e66800680011f19aeeff0b58723b31"
tags: []

---

# Docs System + Reference Maps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build regenerable reference maps for the dashboard and storefront, a Stop-hook that nudges those maps to stay fresh, and `/sync-docs` checks that audit them — so any future task starts from one map read instead of re-exploring the codebase.

**Architecture:** Maps live in `docs/reference/` (read on-demand, zero baseline token cost) with one-line pointers in `CLAUDE.md`. A cross-platform Node Stop hook (`.claude/hooks/check-doc-drift.mjs`) blocks end-of-turn only when a watched dir changed but its map didn't. `/sync-docs` gains two audit checks (dashboard routes, storefront map + editor↔renderer parity).

**Tech Stack:** Node (ESM `.mjs`, no deps), Markdown, Claude Code hooks (`settings.json`), git.

**Spec:** `docs/superpowers/specs/2026-06-14-docs-system-and-reference-maps-design.md`

**Out of scope:** the storefront type/structure refactor (companion spec). The hook + maps are built to *survive* that refactor and ongoing slug/editor edits, not to perform them.

---

## File structure

| File | Responsibility |
|---|---|
| `.claude/hooks/check-doc-drift.mjs` | Stop hook: pure `computeReminders()` + `main()` that reads git + stdin |
| `.claude/hooks/check-doc-drift.test.mjs` | Dependency-free node test for `computeReminders()` |
| `docs/reference/dashboard-map.md` | One row per `app/dashboard/**` route + site-edit editors sub-section |
| `docs/reference/storefront-map.md` | The 4 site types → page → renderer → registry → creator-var contract |
| `.claude/settings.json` | Wire the Stop hook (currently `{"hooks":{}}`) |
| `.claude/commands/sync-docs.md` | +2 audit checks (dashboard map, storefront map + parity) |
| `CLAUDE.md` | 2 pointer rows + 1 definition-of-done rule |

**Build order rationale:** the hook is created but **wired last** (Task 6), so it doesn't nag about not-yet-existing maps while the maps are being built.

---

## Task 1: Stop-hook script (pure logic, TDD)

**Files:**
- Create: `.claude/hooks/check-doc-drift.mjs`
- Test: `.claude/hooks/check-doc-drift.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `.claude/hooks/check-doc-drift.test.mjs`:

```js
import { computeReminders } from './check-doc-drift.mjs';

let failed = 0;
function assert(name, cond) {
  if (cond) console.log(`PASS ${name}`);
  else { console.error(`FAIL ${name}`); failed++; }
}

// 1. dashboard source changed, map not updated -> 1 reminder
assert('dashboard source without map',
  computeReminders(['app/dashboard/products/page.tsx']).length === 1);

// 2. dashboard source changed AND map updated -> no reminder
assert('dashboard source with map',
  computeReminders(['app/dashboard/products/page.tsx', 'docs/reference/dashboard-map.md']).length === 0);

// 3. only the map changed -> no reminder
assert('only map changed',
  computeReminders(['docs/reference/dashboard-map.md']).length === 0);

// 4. unrelated file -> no reminder
assert('unrelated file',
  computeReminders(['src/lib/utils.ts']).length === 0);

// 5. storefront source -> reminder names the storefront map
{
  const r = computeReminders(['src/components/storefront/LinkInBioPage.tsx']);
  assert('storefront reminder names map', r.length === 1 && r[0].includes('storefront-map.md'));
}

// 6. both surfaces changed, neither map -> 2 reminders
assert('both surfaces changed',
  computeReminders(['app/dashboard/x/page.tsx', 'app/(storefront)/link/[username]/page.tsx']).length === 2);

// 7. storefront parens path is matched
assert('storefront parens path',
  computeReminders(['app/(storefront)/store/[slug]/page.tsx']).length === 1);

if (failed > 0) { console.error(`\n${failed} test(s) failed`); process.exit(1); }
console.log('\nAll tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node .claude/hooks/check-doc-drift.test.mjs`
Expected: FAIL — `Cannot find module ... check-doc-drift.mjs` (the implementation doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `.claude/hooks/check-doc-drift.mjs`:

```js
// Stop hook: nudge reference maps to stay in sync with watched source dirs.
// Pure logic (computeReminders) is unit-tested; main() wires git + stdin.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const WATCHED_PAIRS = [
  { name: 'dashboard', sources: ['app/dashboard/', 'src/components/dashboard/'], map: 'docs/reference/dashboard-map.md' },
  { name: 'storefront', sources: ['app/(storefront)/', 'src/components/storefront/'], map: 'docs/reference/storefront-map.md' },
];

export function computeReminders(changedFiles, pairs = WATCHED_PAIRS) {
  const changed = new Set(changedFiles);
  const reminders = [];
  for (const pair of pairs) {
    const sourceChanged = changedFiles.some(
      (f) => f !== pair.map && pair.sources.some((s) => f.startsWith(s))
    );
    const mapChanged = changed.has(pair.map);
    if (sourceChanged && !mapChanged) {
      reminders.push(
        `You edited ${pair.name} source files but did not update ${pair.map}. ` +
        `Update it to reflect the change, or confirm the change does not affect the map (e.g. CSS-only / copy tweak).`
      );
    }
  }
  return reminders;
}

function getChangedFiles() {
  let out = '';
  try {
    out = execSync('git status --porcelain', { encoding: 'utf8' });
  } catch {
    return [];
  }
  return out
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      let p = line.slice(3);                       // strip "XY " status prefix
      if (p.includes(' -> ')) p = p.split(' -> ')[1]; // rename: keep new path
      p = p.trim();
      if (p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1); // unquote
      return p.replace(/\\/g, '/');                // normalize separators
    });
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  let input = {};
  try { input = JSON.parse((await readStdin()) || '{}'); } catch { input = {}; }
  if (input.stop_hook_active) process.exit(0); // loop guard

  const reminders = computeReminders(getChangedFiles());
  if (reminders.length > 0) {
    process.stdout.write(JSON.stringify({ decision: 'block', reason: reminders.join('\n') }));
  }
  process.exit(0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node .claude/hooks/check-doc-drift.test.mjs`
Expected: 7 × `PASS ...` then `All tests passed` (exit 0).

- [ ] **Step 5: Smoke-test main() reads stdin + git**

Run (PowerShell): `'{}' | node .claude/hooks/check-doc-drift.mjs`
Expected: prints a JSON `{"decision":"block",...}` **only if** you currently have uncommitted changes under a watched dir; otherwise prints nothing. Exit code 0 either way.
Run: `'{"stop_hook_active":true}' | node .claude/hooks/check-doc-drift.mjs`
Expected: prints nothing, exits 0 (loop guard).

- [ ] **Step 6: Commit**

```bash
git add .claude/hooks/check-doc-drift.mjs .claude/hooks/check-doc-drift.test.mjs
git commit -m "feat(hooks): doc-drift Stop-hook script + tests"
```

---

## Task 2: Generate `docs/reference/dashboard-map.md`

**Files:**
- Create: `docs/reference/dashboard-map.md`

- [ ] **Step 1: Enumerate routes**

Run: `Glob app/dashboard/**/page.tsx` and note every route. Also note `src/components/dashboard/site-edit/tabs/**` files for the editors sub-section.

- [ ] **Step 2: For each route, extract its dependencies**

For each `page.tsx`, read only its import block + top of component and record:
- **Hooks:** imports from `@/hooks/*` (cross-reference `.claude/rules/hooks-reference.md` for the query key).
- **Key components:** imports from `@/components/ui/*` and the page's own top-level component from `@/components/dashboard/*`. Do NOT list leaf components.
- **API routes:** any `fetch('/api/...')` literal in the file.
- **RLS / Notes:** revenue/security tables the page reads (`orders`, `creator_balances`, `transaction_ledger`), and any Zustand store. Leave blank if none.

- [ ] **Step 3: Write the file**

Use exactly this header + table format. The two example rows below show the required cell style — replace/extend with the real swept rows (verify each cell against the actual file; do not copy the examples blindly):

```markdown
# Dashboard Reference Map

> Last synced: 2026-06-14
> Generated from: `app/dashboard/**/page.tsx` + `src/components/dashboard/site-edit/tabs/**`
> Regenerate / audit: `/sync-docs`
> Read this FIRST for any `app/dashboard/**` task instead of globbing pages.

## Pages

| Route | Purpose | Hooks | Key components | API routes | RLS / Notes |
|---|---|---|---|---|---|
| `/dashboard/products` | Product list + CRUD | `useProducts` | `DataTable`, `SideDrawer`, `PageHeader` | — | — |
| `/dashboard/payouts` | Request + track payouts | `useEarnings` | `DataTable`, `CurrencyInput` | `POST /api/payouts/request` | reads `creator_balances`, `creator_kyc` |

## Site-edit editors (`src/components/dashboard/site-edit/tabs/`)

| Site type | Editor entry | Tab files |
|---|---|---|
| link-in-bio | `linkinbio/BioLinksEditor.tsx` | `linkinbio/blockEditors/*` (registry: `registry.tsx`), `BioProfileEditor`, `BioAppearanceEditor` |
| single-page | `singlepage/SinglePage*Editor.tsx` | hero, content, product, trust, social, checkout, appearance, advanced, settings, logo, template |
```

- [ ] **Step 4: Verify completeness**

Run: `Glob app/dashboard/**/page.tsx` again and confirm every route has exactly one row. Confirm no row points at a path that doesn't exist.

- [ ] **Step 5: Commit**

```bash
git add docs/reference/dashboard-map.md
git commit -m "docs(reference): add dashboard page map"
```

---

## Task 3: Generate `docs/reference/storefront-map.md`

**Files:**
- Create: `docs/reference/storefront-map.md`

- [ ] **Step 1: Read the structural sources**

Read these to fill the generated lists (do not hand-invent type names):
- `src/components/storefront/linkinbio/blockRenderers/registry.tsx` **if it exists** (companion refactor); else the inline `link_type` branches in `src/components/storefront/LinkInBioPage.tsx`.
- `src/components/dashboard/site-edit/tabs/linkinbio/blockEditors/registry.tsx` (`BLOCK_EDITORS` keys).
- `src/components/storefront/SectionRenderer.tsx` switch cases.
- `src/components/dashboard/site-edit/section-defs.ts` (`SECTION_TYPES`).

- [ ] **Step 2: Write the file**

Use exactly this content, filling the bracketed generated lists from Step 1:

```markdown
# Storefront Reference Map

> Last synced: 2026-06-14
> Generated from: `app/(storefront)/**/page.tsx`, `src/components/storefront/**`, the block/section registries
> Regenerate / audit: `/sync-docs`
> Read this FIRST for any storefront task. Styling uses creator vars (`var(--creator-primary)`, `var(--creator-text)`, `var(--creator-bg)`, …) — NOT dashboard `--bg-*`/`--text-*` tokens.

## Site types

| Type | URL | Slug page (server) | Renderer | Type/section source |
|---|---|---|---|---|
| link-in-bio | `/link/[username]` | `app/(storefront)/link/[username]/page.tsx` | `src/components/storefront/LinkInBioPage.tsx` | block registry (below) |
| single-page | `/site/[slug]` | `app/(storefront)/site/[slug]/page.tsx` | `src/components/storefront/ProductSalesPage.tsx` (fixed template) | inline sub-components |
| store | `/store/[slug]` | `app/(storefront)/store/[slug]/page.tsx` | `src/components/storefront/SectionRenderer.tsx` | `section-defs.ts` SECTION_TYPES (below) |
| payment | `/pay/[siteId]` | `app/(storefront)/pay/[siteId]/page.tsx` | `src/components/storefront/PaymentLinkPage.tsx` | n/a |

Standalone pages: `app/(storefront)/upsells/[slug]/page.tsx`, `app/(storefront)/store/product/[productId]/page.tsx`.

## Link-in-bio block types

Renderer registry keys: [list from blockRenderers/registry.tsx or LinkInBioPage branches]
Editor registry keys: [list from blockEditors/registry.tsx]
Parity: [note any type one side has that the other lacks — e.g. renderer-only `divider`, `email_capture` alias]

## Store section types

`SectionRenderer` cases: [list]
`section-defs.ts` SECTION_TYPES: [list]
```

- [ ] **Step 3: Verify the parity line is accurate**

Diff the two key lists by eye and write the real result on the Parity line (e.g. "in sync (13 each)" or "renderer renders `divider` which the editor cannot create").

- [ ] **Step 4: Commit**

```bash
git add docs/reference/storefront-map.md
git commit -m "docs(reference): add storefront site-type map"
```

---

## Task 4: Extend `/sync-docs` with 2 checks

**Files:**
- Modify: `.claude/commands/sync-docs.md` (append after check 5, before the `---` and Output format)

- [ ] **Step 1: Add the two checks**

Insert after the "### 5. Storefront sections" block:

```markdown
### 6. Dashboard map — `docs/reference/dashboard-map.md`
- Glob `app/dashboard/**/page.tsx`.
- Compare against the Pages table in `docs/reference/dashboard-map.md`.
- Report routes on disk missing from the map, and rows pointing at routes that no longer exist.

### 7. Storefront map — `docs/reference/storefront-map.md`
- Read the renderer block registry (`src/components/storefront/linkinbio/blockRenderers/registry.tsx` if present, else the `link_type` branches in `LinkInBioPage.tsx`), the editor registry (`blockEditors/registry.tsx`), `SectionRenderer.tsx`, and `section-defs.ts`.
- Compare the generated type/section lists against `docs/reference/storefront-map.md`; report any drift.
- **Parity check:** diff the renderer block-type keys against the editor block-type keys. Report any type one side has that the other lacks.
```

- [ ] **Step 2: Update the Output format section**

In the same file, add to the example output block two new numbered sections (`6. DASHBOARD MAP`, `7. STOREFRONT MAP`) mirroring the existing style, and update the final `TOTAL: N categories` line wording to reflect 7 categories.

- [ ] **Step 3: Verify**

Read the file back and confirm checks 6 and 7 are present and the Output format lists all 7 categories.

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/sync-docs.md
git commit -m "docs(sync): audit dashboard + storefront reference maps"
```

---

## Task 5: CLAUDE.md pointers + definition-of-done rule

**Files:**
- Modify: `CLAUDE.md` (Reference Files table; Absolute Rules → Code Quality)

- [ ] **Step 1: Add two pointer rows**

In the `## Reference Files` table (the one listing `.claude/rules/*`), add two rows:

```markdown
| `docs/reference/dashboard-map.md` | Starting ANY `app/dashboard/**` task — read this first instead of globbing pages |
| `docs/reference/storefront-map.md` | Starting ANY storefront task (`app/(storefront)/**`, `src/components/storefront/**`) — read this first |
```

- [ ] **Step 2: Add the definition-of-done rule**

Under `### Code Quality` in Absolute Rules, add:

```markdown
- When you change a dashboard route or a storefront renderer/registry, update the matching map in `docs/reference/` in the same change-set (or confirm it's unaffected). The Stop hook in `.claude/hooks/check-doc-drift.mjs` enforces this.
```

- [ ] **Step 3: Verify**

Read back both edits; confirm the table rows render and the rule is under Code Quality.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): point at reference maps + map-update rule"
```

---

## Task 6: Wire the Stop hook (done last, so maps already exist)

**Files:**
- Modify: `.claude/settings.json` (currently `{"hooks": {}}`)

- [ ] **Step 1: Write the hook config**

Replace the contents of `.claude/settings.json` with:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "node .claude/hooks/check-doc-drift.mjs" }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Verify the JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "feat(hooks): enable doc-drift Stop hook"
```

---

## Task 7: End-to-end verification (no new files)

- [ ] **Step 1: Confirm the negative case** — with a clean working tree, run `'{}' | node .claude/hooks/check-doc-drift.mjs`. Expected: no output (nothing changed).

- [ ] **Step 2: Confirm the positive case** — make a trivial edit to any `app/dashboard/**/page.tsx` (e.g. add a comment), then run `'{}' | node .claude/hooks/check-doc-drift.mjs`. Expected: JSON `{"decision":"block","reason":"...dashboard...dashboard-map.md..."}`. Revert the trivial edit.

- [ ] **Step 3: Confirm the dismissal case** — with that same trivial edit present, also `touch`/edit `docs/reference/dashboard-map.md`, re-run. Expected: no output (map counted as updated). Revert both.

- [ ] **Step 4: Run `/sync-docs`** and confirm checks 6 and 7 report (in-sync or specific drift) without erroring.

- [ ] **Step 5: Re-run the unit test** — `node .claude/hooks/check-doc-drift.test.mjs` → `All tests passed`.

---

## Self-review notes (filled by author)

- **Spec coverage:** Component 1 → Task 2; Component 2 → Task 3; Component 3 (Stop hook) → Tasks 1 + 6; Component 4 (/sync-docs) → Task 4; Component 5 (CLAUDE.md) → Task 5; Sequencing/verify → Task 7. All five spec components covered.
- **Placeholder scan:** The only intentional "fill from source" gaps are the swept dashboard rows (Task 2) and the generated type lists (Task 3) — these are generation tasks whose *format* is fully locked with concrete examples; the spec mandates they be derived from on-disk sources, not pre-written.
- **Type consistency:** `computeReminders` / `WATCHED_PAIRS` names match between implementation, test, and the hook config across Tasks 1, 6, 7.
- **No test framework:** real verification is the dependency-free node test + manual hook fires; consistent with `.claude/rules/verification.md` Lane 1.
