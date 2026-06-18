---
noteId: "c7328be069e211f19a5ba9a9f70f067a"
tags: []

---

# Site Editor Shell — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared `SiteEditorShell` + section-list/drill-in editing model and migrate the Link-in-Bio editor onto it, with all data/save/preview logic preserved.

**Architecture:** A new `shell/` package owns the full-screen chrome (kept header + kept iframe preview, re-tokenized) and a left **EditorPanel** with a `Content / Design / Settings` switch. Content is a registry-driven **SectionList** (drag/hide/duplicate/delete/add) whose rows drill into the section's existing editor via **SectionDetail**. The linkinbio page is slimmed to compose these and supply a `sectionRegistry` that reuses the existing per-block editors.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4 (dashboard CSS-var tokens), TanStack Query (unchanged), Vitest (node) for pure logic, lucide-react icons.

**Branch:** `feat/site-editor-shell` (already created; spec committed).

**Testing approach (codebase-specific):** Per `.claude/rules/verification.md`, UI is verified with `npx tsc --noEmit` + `npm run lint` + manual + the hardcoded-color grep. Vitest runs in **node** env only — use it for pure functions (`moveItem`, `summarizeBlock`). Do **not** add jsdom/RTL (new packages need owner approval). Component tasks gate on `tsc` + `lint`; integration is verified manually in the running app.

---

## File Structure

**New files**

| File | Responsibility |
|---|---|
| `src/components/dashboard/site-edit/shell/types.ts` | `SectionDef`, `SectionRegistry`, `SectionCategory`, `SectionItem` types |
| `src/components/dashboard/site-edit/shell/reorder.ts` | pure `moveItem(arr, from, to)` |
| `src/components/dashboard/site-edit/shell/reorder.test.ts` | Vitest for `moveItem` |
| `src/components/dashboard/site-edit/shell/AddSectionPicker.tsx` | categorized "add section" menu |
| `src/components/dashboard/site-edit/shell/SectionList.tsx` | reorderable row list + add affordance |
| `src/components/dashboard/site-edit/shell/SectionDetail.tsx` | drill-in chrome (back header + slot) |
| `src/components/dashboard/site-edit/shell/EditorPanel.tsx` | Content/Design/Settings switch + slots |
| `src/components/dashboard/site-edit/shell/SiteEditorShell.tsx` | full-screen layout: header + preview + left panel slot |
| `src/components/dashboard/site-edit/tabs/linkinbio/sectionRegistry.tsx` | linkinbio block registry (label/icon/category/summarize) |
| `src/components/dashboard/site-edit/tabs/linkinbio/summarize.ts` | pure `summarizeBlock(link)` |
| `src/components/dashboard/site-edit/tabs/linkinbio/summarize.test.ts` | Vitest for `summarizeBlock` |

**Modified files**

| File | Change |
|---|---|
| `app/dashboard/sites/edit/linkinbio/[id]/page.tsx` | compose `SiteEditorShell` + `EditorPanel`; remove mini-sidebar; preserve load/save/undo/postMessage |
| `docs/reference/dashboard-map.md` | document the new shell + linkinbio editor structure |

**Untouched:** `main`, `singlepage`, `payment` pages; `SiteVisualEditor.tsx`; every `blockEditors/*Block.tsx` + `blockEditors/registry.tsx`; `BioProfileEditor`, `BioAppearanceEditor`; all hooks; storefront renderers; `/api/*`; `types/database.types.ts`.

---

## Task 0: Baseline green

**Files:** none (verification only)

- [ ] **Step 1: Confirm branch and clean baseline**

Run:
```bash
git branch --show-current
npx tsc --noEmit
npm run lint
```
Expected: branch is `feat/site-editor-shell`; `tsc` and `lint` both exit 0 (record any pre-existing warnings so new ones are distinguishable).

---

## Task 1: Shell types + reorder util (TDD)

**Files:**
- Create: `src/components/dashboard/site-edit/shell/types.ts`
- Create: `src/components/dashboard/site-edit/shell/reorder.ts`
- Test: `src/components/dashboard/site-edit/shell/reorder.test.ts`

- [ ] **Step 1: Write the failing test**

`src/components/dashboard/site-edit/shell/reorder.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { moveItem } from './reorder';

describe('moveItem', () => {
  it('moves an element forward', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });
  it('moves an element backward', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });
  it('returns an unchanged copy for out-of-range indices', () => {
    const src = ['a', 'b'];
    const out = moveItem(src, 0, 5);
    expect(out).toEqual(['a', 'b']);
    expect(out).not.toBe(src);
  });
  it('does not mutate the input', () => {
    const src = ['a', 'b', 'c'];
    moveItem(src, 0, 2);
    expect(src).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/dashboard/site-edit/shell/reorder.test.ts`
Expected: FAIL — cannot find module `./reorder`.

- [ ] **Step 3: Implement `reorder.ts`**

`src/components/dashboard/site-edit/shell/reorder.ts`:
```ts
// Pure array reorder. Out-of-range indices yield an unchanged copy.
export function moveItem<T>(arr: readonly T[], from: number, to: number): T[] {
  const next = arr.slice();
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
```

- [ ] **Step 4: Create `types.ts`**

`src/components/dashboard/site-edit/shell/types.ts`:
```ts
import type React from 'react';

// Minimal shape every section row needs. Editors keep their own richer types.
export type SectionItem = { id: string; is_visible: boolean };

export type SectionCategory = { id: string; label: string };

// One registry entry = one section/block type.
export type SectionDef<TItem> = {
  type: string;
  label: string;
  icon: React.ElementType;
  categoryId: string;
  summarize: (item: TItem) => string;
};

export type SectionRegistry<TItem> = {
  categories: SectionCategory[];
  defs: Record<string, SectionDef<TItem>>;
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/dashboard/site-edit/shell/reorder.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: exit 0.
```bash
git add src/components/dashboard/site-edit/shell/types.ts src/components/dashboard/site-edit/shell/reorder.ts src/components/dashboard/site-edit/shell/reorder.test.ts
git commit -m "feat(site-edit): shell types + reorder util"
```

---

## Task 2: linkinbio `summarizeBlock` (TDD)

**Files:**
- Create: `src/components/dashboard/site-edit/tabs/linkinbio/summarize.ts`
- Test: `src/components/dashboard/site-edit/tabs/linkinbio/summarize.test.ts`

- [ ] **Step 1: Write the failing test**

`summarize.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { summarizeBlock } from './summarize';
import type { BioLink } from './blockEditors/types';

const base: BioLink = {
  id: '1', link_type: 'url', title: '', description: '', url: '',
  thumbnail_url: '', product_id: '', icon_type: 'external',
  style_variant: 'default', is_visible: true, sort_order: 1, metadata: {},
};

describe('summarizeBlock', () => {
  it('summarizes a url block with title and url', () => {
    expect(summarizeBlock({ ...base, link_type: 'url', title: 'My Website', url: 'mysite.com' }))
      .toBe('My Website · mysite.com');
  });
  it('falls back to "Link" when a url block has no title', () => {
    expect(summarizeBlock({ ...base, link_type: 'url', url: 'mysite.com' })).toBe('Link · mysite.com');
  });
  it('counts social platforms', () => {
    expect(summarizeBlock({ ...base, link_type: 'social_icons', metadata: { links: [{}, {}, {}] } }))
      .toBe('3 platforms');
  });
  it('singularizes one platform', () => {
    expect(summarizeBlock({ ...base, link_type: 'social_icons', metadata: { links: [{}] } }))
      .toBe('1 platform');
  });
  it('uses heading title', () => {
    expect(summarizeBlock({ ...base, link_type: 'heading', title: 'Featured' })).toBe('Featured');
  });
  it('falls back to the type for unknown blocks', () => {
    expect(summarizeBlock({ ...base, link_type: 'mystery' })).toBe('mystery');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/dashboard/site-edit/tabs/linkinbio/summarize.test.ts`
Expected: FAIL — cannot find module `./summarize`.

- [ ] **Step 3: Implement `summarize.ts`**

`summarize.ts`:
```ts
import type { BioLink } from './blockEditors/types';

// One-line row summary shown under each block title in the section list.
export function summarizeBlock(l: BioLink): string {
  switch (l.link_type) {
    case 'url':
      return [l.title || 'Link', l.url].filter(Boolean).join(' · ');
    case 'header':
      return l.title || 'Header';
    case 'heading':
      return l.title || 'Section title';
    case 'text':
      return (l.metadata?.content as string) || 'Text';
    case 'social_icons': {
      const n = Array.isArray(l.metadata?.links) ? l.metadata.links.length : 0;
      return `${n} platform${n === 1 ? '' : 's'}`;
    }
    case 'lead_form':
      return l.title || 'Lead form';
    case 'product':
      return l.title || 'Product';
    case 'image':
      return l.title || 'Image';
    case 'banner':
      return l.title || 'Banner';
    case 'video_embed':
      return 'Video';
    case 'spotify':
      return 'Spotify';
    case 'html_embed':
      return 'Embed';
    case 'space':
      return 'Spacer';
    case 'divider':
      return 'Divider';
    default:
      return l.link_type;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/dashboard/site-edit/tabs/linkinbio/summarize.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/site-edit/tabs/linkinbio/summarize.ts src/components/dashboard/site-edit/tabs/linkinbio/summarize.test.ts
git commit -m "feat(linkinbio): summarizeBlock for section row summaries"
```

---

## Task 3: linkinbio section registry

**Files:**
- Create: `src/components/dashboard/site-edit/tabs/linkinbio/sectionRegistry.tsx`

Reuses `BLOCK_CATEGORIES` (already in `BioLinksEditor.tsx`) — but that constant is not exported. **First export it.**

- [ ] **Step 1: Export `BLOCK_CATEGORIES`**

In `src/components/dashboard/site-edit/tabs/linkinbio/BioLinksEditor.tsx`, change the declaration at line ~22 from `const BLOCK_CATEGORIES = [` to:
```ts
export const BLOCK_CATEGORIES = [
```
(Leave the body unchanged.)

- [ ] **Step 2: Create `sectionRegistry.tsx`**

`src/components/dashboard/site-edit/tabs/linkinbio/sectionRegistry.tsx`:
```tsx
import type { BioLink } from './blockEditors/types';
import type { SectionRegistry, SectionDef } from '../../shell/types';
import { BLOCK_CATEGORIES } from './BioLinksEditor';
import { summarizeBlock } from './summarize';

// Build the shell registry from the existing block categories. Each category's
// `types` entries already carry { id, label, icon }, so we map them 1:1 and
// attach the shared summarize().
export const linkinbioRegistry: SectionRegistry<BioLink> = {
  categories: BLOCK_CATEGORIES.map((c) => ({ id: c.label, label: c.label })),
  defs: BLOCK_CATEGORIES.reduce<Record<string, SectionDef<BioLink>>>((acc, cat) => {
    for (const t of cat.types) {
      acc[t.id] = {
        type: t.id,
        label: t.label,
        icon: t.icon,
        categoryId: cat.label,
        summarize: summarizeBlock,
      };
    }
    return acc;
  }, {}),
};
```

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: exit 0.
```bash
git add src/components/dashboard/site-edit/tabs/linkinbio/sectionRegistry.tsx src/components/dashboard/site-edit/tabs/linkinbio/BioLinksEditor.tsx
git commit -m "feat(linkinbio): section registry from block categories"
```

---

## Task 4: AddSectionPicker

**Files:**
- Create: `src/components/dashboard/site-edit/shell/AddSectionPicker.tsx`

- [ ] **Step 1: Create the component**

`src/components/dashboard/site-edit/shell/AddSectionPicker.tsx`:
```tsx
'use client';
import { X } from 'lucide-react';
import type { SectionRegistry } from './types';

type Props<TItem> = {
  registry: SectionRegistry<TItem>;
  onPick: (type: string) => void;
  onClose: () => void;
};

export default function AddSectionPicker<TItem>({ registry, onPick, onClose }: Props<TItem>) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Add a block</h3>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-[var(--radius-sm)] p-1 text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-4">
        {registry.categories.map((cat) => {
          const defs = Object.values(registry.defs).filter((d) => d.categoryId === cat.id);
          if (defs.length === 0) return null;
          return (
            <div key={cat.id}>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                {cat.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {defs.map((d) => (
                  <button
                    key={d.type}
                    onClick={() => onPick(d.type)}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <d.icon className="h-4 w-4 text-[var(--text-secondary)]" />
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint + commit**

Run: `npx tsc --noEmit && npm run lint`
Expected: exit 0.
```bash
git add src/components/dashboard/site-edit/shell/AddSectionPicker.tsx
git commit -m "feat(site-edit): AddSectionPicker categorized add menu"
```

---

## Task 5: SectionList

**Files:**
- Create: `src/components/dashboard/site-edit/shell/SectionList.tsx`

Drag uses the existing manual HTML5 pattern (matches `BioLinksEditor`; no new deps). Operates on items via accessor props so it stays decoupled from `BioLink` field names (`link_type` vs `type`).

- [ ] **Step 1: Create the component**

`src/components/dashboard/site-edit/shell/SectionList.tsx`:
```tsx
'use client';
import { useState, type ReactNode } from 'react';
import { GripVertical, Eye, EyeOff, Copy, Trash2, ChevronRight, Plus } from 'lucide-react';
import type { SectionItem, SectionRegistry } from './types';
import AddSectionPicker from './AddSectionPicker';

type Props<TItem extends SectionItem> = {
  items: TItem[];
  registry: SectionRegistry<TItem>;
  typeOf: (item: TItem) => string;
  onReorder: (from: number, to: number) => void;
  onToggleVisible: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onAdd: (type: string) => void;
  pinned?: ReactNode;
};

export default function SectionList<TItem extends SectionItem>({
  items, registry, typeOf, onReorder, onToggleVisible, onDuplicate, onDelete, onSelect, onAdd, pinned,
}: Props<TItem>) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      {pinned}

      {items.length > 0 && (
        <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
          Blocks · drag to reorder
        </p>
      )}

      <div className="space-y-2">
        {items.map((item, idx) => {
          const def = registry.defs[typeOf(item)];
          const Icon = def?.icon;
          const hidden = !item.is_visible;
          return (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) onReorder(dragIdx, idx); setDragIdx(null); }}
              onDragEnd={() => setDragIdx(null)}
              className={`group flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2.5 transition hover:bg-[var(--surface-hover)] ${dragIdx === idx ? 'opacity-50' : ''} ${hidden ? 'opacity-60' : ''}`}
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[var(--text-tertiary)]" />
              <button
                onClick={() => onSelect(item.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[var(--text-primary)]">{def?.label ?? typeOf(item)}</span>
                  <span className="block truncate text-xs text-[var(--text-tertiary)]">
                    {hidden ? 'Hidden' : def?.summarize(item)}
                  </span>
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <IconBtn label={hidden ? 'Show' : 'Hide'} onClick={() => onToggleVisible(item.id)}>
                  {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </IconBtn>
                <IconBtn label="Duplicate" onClick={() => onDuplicate(item.id)}><Copy className="h-3.5 w-3.5" /></IconBtn>
                <IconBtn label="Delete" onClick={() => onDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
            </div>
          );
        })}
      </div>

      {adding ? (
        <AddSectionPicker
          registry={registry}
          onPick={(type) => { onAdd(type); setAdding(false); }}
          onClose={() => setAdding(false)}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] py-3 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <Plus className="h-4 w-4" /> Add block
        </button>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Typecheck + lint + commit**

Run: `npx tsc --noEmit && npm run lint`
Expected: exit 0.
```bash
git add src/components/dashboard/site-edit/shell/SectionList.tsx
git commit -m "feat(site-edit): SectionList with drag/hide/duplicate/delete/add"
```

---

## Task 6: SectionDetail

**Files:**
- Create: `src/components/dashboard/site-edit/shell/SectionDetail.tsx`

- [ ] **Step 1: Create the component**

`src/components/dashboard/site-edit/shell/SectionDetail.tsx`:
```tsx
'use client';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode, ElementType } from 'react';

type Props = {
  title: string;
  icon?: ElementType;
  backLabel?: string;
  onBack: () => void;
  children: ReactNode;
};

export default function SectionDetail({ title, icon: Icon, backLabel = 'Back', onBack, children }: Props) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)]"
      >
        <ChevronLeft className="h-4 w-4" /> {backLabel}
      </button>
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-[var(--text-secondary)]" /> : null}
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint + commit**

Run: `npx tsc --noEmit && npm run lint`
Expected: exit 0.
```bash
git add src/components/dashboard/site-edit/shell/SectionDetail.tsx
git commit -m "feat(site-edit): SectionDetail drill-in chrome"
```

---

## Task 7: EditorPanel

**Files:**
- Create: `src/components/dashboard/site-edit/shell/EditorPanel.tsx`

- [ ] **Step 1: Create the component**

`src/components/dashboard/site-edit/shell/EditorPanel.tsx`:
```tsx
'use client';
import type { ReactNode } from 'react';

export type EditorView = 'content' | 'design' | 'settings';

const VIEWS: { id: EditorView; label: string }[] = [
  { id: 'content', label: 'Content' },
  { id: 'design', label: 'Design' },
  { id: 'settings', label: 'Settings' },
];

type Props = {
  view: EditorView;
  onViewChange: (v: EditorView) => void;
  content: ReactNode;
  design: ReactNode;
  settings: ReactNode;
};

export default function EditorPanel({ view, onViewChange, content, design, settings }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-[var(--border)] p-3">
        <div className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-1">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              className={`flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                view === v.id
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {view === 'content' && content}
        {view === 'design' && design}
        {view === 'settings' && settings}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint + commit**

Run: `npx tsc --noEmit && npm run lint`
Expected: exit 0.
```bash
git add src/components/dashboard/site-edit/shell/EditorPanel.tsx
git commit -m "feat(site-edit): EditorPanel content/design/settings switch"
```

---

## Task 8: SiteEditorShell (chrome lifted from SiteVisualEditor, re-tokenized)

**Files:**
- Create: `src/components/dashboard/site-edit/shell/SiteEditorShell.tsx`
- Reference (read-only): `src/components/dashboard/site-edit/SiteVisualEditor.tsx:255-466` (header + preview markup to adapt)

The shell reproduces SiteVisualEditor's **left-panel header** + **right preview panel** as a slot-based component, with all colors converted to tokens. The left panel body is provided by the caller (the `EditorPanel`). The preview iframe ref is owned by the caller and passed in.

- [ ] **Step 1: Create the component**

`src/components/dashboard/site-edit/shell/SiteEditorShell.tsx`:
```tsx
'use client';
import { useEffect, useRef, useState, type ReactNode, type RefObject, type ElementType } from 'react';
import {
  ArrowLeft, Save, Loader2, CheckCircle2, ExternalLink, Monitor, Tablet, Smartphone,
  RefreshCw, Copy, Check, Undo2, Redo2, Moon, Sun,
} from 'lucide-react';

type Props = {
  // header
  title: string;
  typeLabel: string;
  typeIcon: ElementType;
  onBack: () => void;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  // preview
  previewUrl: string | null;
  displayUrl: string | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  previewKey: number;
  onRefresh: () => void;
  device: string;
  onDeviceChange: (d: string) => void;
  // left panel body (EditorPanel)
  children: ReactNode;
};

const DEVICES = [
  { id: 'desktop', icon: Monitor, label: 'Desktop' },
  { id: 'tablet', icon: Tablet, label: 'Tablet' },
  { id: 'mobile', icon: Smartphone, label: 'Mobile' },
];

export default function SiteEditorShell(props: Props) {
  const { title, typeLabel, typeIcon: TypeIcon, onBack, saving, saved, onSave,
    canUndo, canRedo, onUndo, onRedo, theme, onToggleTheme,
    previewUrl, displayUrl, iframeRef, previewKey, onRefresh, device, onDeviceChange, children } = props;

  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const [previewW, setPreviewW] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = previewWrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => { for (const e of entries) setPreviewW(e.contentRect.width); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const copyUrl = () => {
    if (!displayUrl) return;
    navigator.clipboard.writeText(`https://${displayUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const DESKTOP_W = 1280;
  const DESKTOP_H = Math.round((DESKTOP_W * 10) / 16);
  const isDesktop = device === 'desktop';
  const isMobile = device === 'mobile';
  const devicePx = isDesktop ? DESKTOP_W : isMobile ? 375 : 768;
  const zoom = isDesktop && previewW > 0 ? Math.min(1, (previewW - 48) / DESKTOP_W) : 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="flex min-h-0 flex-1">

        {/* LEFT PANEL */}
        <div className="flex w-[440px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-primary)]">
          {/* header */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] px-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="-ml-2 rounded-[var(--radius-md)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="max-w-[180px] truncate text-sm font-semibold text-[var(--text-primary)]">{title}</h1>
                <p className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-tertiary)]">
                  <TypeIcon className="h-3 w-3" /> {typeLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onToggleTheme} title="Toggle theme" className="rounded-[var(--radius-md)] border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              {(onUndo || onRedo) && (
                <div className="flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--border)] p-1">
                  <button onClick={onUndo} disabled={!canUndo} title="Undo" className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-secondary)] enabled:hover:bg-[var(--surface-hover)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"><Undo2 className="h-4 w-4" /></button>
                  <button onClick={onRedo} disabled={!canRedo} title="Redo" className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-secondary)] enabled:hover:bg-[var(--surface-hover)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"><Redo2 className="h-4 w-4" /></button>
                </div>
              )}
              <button onClick={onSave} disabled={saving}
                className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50 ${saved ? 'bg-[var(--success)] text-[var(--text-on-brand)]' : 'bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]'}`}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>
          {/* body slot */}
          <div className="min-h-0 flex-1">{children}</div>
        </div>

        {/* RIGHT PREVIEW */}
        <div className="flex flex-1 flex-col bg-[var(--bg-tertiary)]">
          <div className="relative flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] px-4">
            <a href={displayUrl ? `https://${displayUrl}` : undefined} target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${!displayUrl ? 'pointer-events-none opacity-40' : ''}`}>
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
            <button onClick={copyUrl} disabled={!displayUrl}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
              {copied ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Link'}
            </button>
            <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Website Preview</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-1">
              {DEVICES.map((d) => (
                <button key={d.id} onClick={() => onDeviceChange(d.id)} title={d.label}
                  className={`rounded-[var(--radius-sm)] p-1.5 transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${device === d.id ? 'bg-[var(--surface-muted)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}>
                  <d.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div ref={previewWrapperRef} className={`flex flex-1 items-start justify-center overflow-y-auto overflow-x-hidden px-6 pb-6 ${isDesktop ? 'pt-10' : 'pt-6'}`}>
            <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]"
              style={{ width: devicePx, maxWidth: '100%', height: isDesktop ? DESKTOP_H : '100%', zoom: isDesktop ? zoom : undefined, transformOrigin: 'top left' }}>
              <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[var(--danger)]" />
                  <span className="h-3 w-3 rounded-full bg-[var(--warning)]" />
                  <span className="h-3 w-3 rounded-full bg-[var(--success)]" />
                </div>
                <div className="flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
                  <p className="truncate font-mono text-[10px] text-[var(--text-tertiary)]">{displayUrl ? `https://${displayUrl}` : 'Loading…'}</p>
                </div>
                <button onClick={onRefresh} title="Refresh" className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
              {previewUrl ? (
                <iframe ref={iframeRef} key={previewKey} src={previewUrl} className="w-full flex-1 border-0" title="Site Preview" />
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-tertiary)]">No preview available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint + commit**

Run: `npx tsc --noEmit && npm run lint`
Expected: exit 0.
```bash
git add src/components/dashboard/site-edit/shell/SiteEditorShell.tsx
git commit -m "feat(site-edit): SiteEditorShell chrome (tokenized header + preview)"
```

---

## Task 9: Migrate the linkinbio page onto the shell

**Files:**
- Modify: `app/dashboard/sites/edit/linkinbio/[id]/page.tsx`

This rewires the existing page. **Preserve verbatim** (do not rewrite the logic): the `useLinkInBioSiteQuery` hydration effect, `handleSave`, the undo/redo refs + handlers + keyboard effect, the debounced `postMessage` push effect (`bio-content-update` / `theme-update`), `applyTemplate`, `updatePalette`, and the slug-check effect. Only the **render tree** and the block-list wiring change.

- [ ] **Step 1: Add view + selection state and block-list helpers**

Near the other `useState` hooks in `EditLinkInBioPage`, add:
```tsx
const [view, setView] = useState<EditorView>('content');
const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
```

Add block-list helpers (port of `BioLinksEditor`'s internals, operating on the page's `links`/`setLinks`):
```tsx
const reindex = (ls: BioLink[]) => ls.map((l, i) => ({ ...l, sort_order: i + 1 }));

const handleReorder = (from: number, to: number) => setLinks(prev => reindex(moveItem(prev, from, to)));
const handleToggleVisible = (id: string) => setLinks(prev => prev.map(l => l.id === id ? { ...l, is_visible: !l.is_visible } : l));
const handleDelete = (id: string) => { setLinks(prev => reindex(prev.filter(l => l.id !== id))); if (selectedBlockId === id) setSelectedBlockId(null); };
const handleDuplicate = (id: string) => setLinks(prev => {
  const idx = prev.findIndex(l => l.id === id);
  if (idx < 0) return prev;
  const src = prev[idx];
  const clone: BioLink = { ...src, id: crypto.randomUUID(), title: src.title ? `${src.title} (copy)` : '', metadata: src.metadata ? JSON.parse(JSON.stringify(src.metadata)) : {} };
  const next = [...prev]; next.splice(idx + 1, 0, clone);
  return reindex(next);
});
const handleAdd = (type: string) => {
  const meta: Record<string, any> = {
    social_icons: { links: [], style: 'circle', size: 'md', alignment: 'center' },
    header: { subtitle: '', alignment: 'center', size: 'xl', show_divider: false },
    text: { content: '', alignment: 'left', size: 'base' },
    html_embed: { html: '' }, spotify: { spotify_url: '', embed_type: 'track' },
    banner: { description: '', button_text: 'Learn More', button_url: '', bg_color: '' },
    space: { height: 'md' },
    lead_form: { fields: [{ type: 'name', label: 'Full Name', required: false, placeholder: 'Your name' }, { type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' }], button_text: 'Submit', description: '', success_message: "Thanks! We'll be in touch." },
    product: { layout: 'horizontal', button_position: 'right', show_price: true, badge: '', cta_text: 'Buy Now' },
  };
  const newLink: BioLink = { id: crypto.randomUUID(), link_type: type, title: '', description: '', url: '', thumbnail_url: '', product_id: '', icon_type: 'external', style_variant: 'default', is_visible: true, sort_order: links.length + 1, metadata: meta[type] ?? {} };
  setLinks(prev => [...prev, newLink]);
  setSelectedBlockId(newLink.id);
};
const updateSelected = (updates: Partial<BioLink>) => setLinks(prev => prev.map(l => l.id === selectedBlockId ? { ...l, ...updates } : l));
const updateSelectedMeta = (key: string, value: unknown) => setLinks(prev => prev.map(l => l.id === selectedBlockId ? { ...l, metadata: { ...l.metadata, [key]: value } } : l));
```

- [ ] **Step 2: Add imports**

At the top of the file add:
```tsx
import SiteEditorShell from '@/components/dashboard/site-edit/shell/SiteEditorShell';
import EditorPanel, { type EditorView } from '@/components/dashboard/site-edit/shell/EditorPanel';
import SectionList from '@/components/dashboard/site-edit/shell/SectionList';
import SectionDetail from '@/components/dashboard/site-edit/shell/SectionDetail';
import { moveItem } from '@/components/dashboard/site-edit/shell/reorder';
import { linkinbioRegistry } from '@/components/dashboard/site-edit/tabs/linkinbio/sectionRegistry';
import { BlockBody } from '@/components/dashboard/site-edit/tabs/linkinbio/blockEditors/registry';
import { Link2 } from 'lucide-react';
```
(Remove now-unused imports — `BioLinksEditor`, the per-tab icon set, the mini-sidebar nav icons — as flagged by lint in Step 6.)

- [ ] **Step 3: Build the three view slots**

Above the `return`, compute:
```tsx
const selectedBlock = links.find(l => l.id === selectedBlockId) ?? null;
const selectedDef = selectedBlock ? linkinbioRegistry.defs[selectedBlock.link_type] : null;

const contentSlot = selectedBlock ? (
  <SectionDetail
    title={selectedDef?.label ?? 'Block'}
    icon={selectedDef?.icon}
    backLabel="Back to blocks"
    onBack={() => setSelectedBlockId(null)}
  >
    <BlockBody
      link={selectedBlock}
      update={updateSelected}
      updateMeta={updateSelectedMeta}
      openImagePicker={() => { /* existing image-picker trigger goes here */ }}
      products={products}
    />
  </SectionDetail>
) : (
  <SectionList
    items={links}
    registry={linkinbioRegistry}
    typeOf={(l) => l.link_type}
    onReorder={handleReorder}
    onToggleVisible={handleToggleVisible}
    onDuplicate={handleDuplicate}
    onDelete={handleDelete}
    onSelect={setSelectedBlockId}
    onAdd={handleAdd}
    pinned={
      <button
        onClick={() => setView('content') /* profile editor opens via its own row; see Step 4 */}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-2.5 text-left transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--text-secondary)]"><User className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[var(--text-primary)]">Profile header</span><span className="block truncate text-xs text-[var(--text-tertiary)]">Avatar, name, bio, socials</span></span>
        <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
      </button>
    }
  />
);
```

- [ ] **Step 4: Wire Profile into the Content view**

Add a profile-open flag and render `BioProfileEditor` in the content slot when active:
```tsx
const [profileOpen, setProfileOpen] = useState(false);
```
Change the pinned button's `onClick` to `() => setProfileOpen(true)`, and at the top of `contentSlot` short-circuit:
```tsx
const contentSlot = profileOpen ? (
  <SectionDetail title="Profile header" icon={User} backLabel="Back to blocks" onBack={() => setProfileOpen(false)}>
    <BioProfileEditor data={profile} onChange={setProfile} />
  </SectionDetail>
) : selectedBlock ? ( /* …as Step 3… */ ) : ( /* …SectionList as Step 3… */ );
```
(`BioProfileEditor` is already imported in the page.)

- [ ] **Step 5: Build Design + Settings slots and render the shell**

`designSlot` = the existing templates grid + `BioAppearanceEditor` (move the JSX currently under the `templates`/`appearance` tabs into a `designSlot` variable, unchanged except wrapping `<div className="space-y-5">`). `settingsSlot` = the existing settings tab JSX (slug, SEO, publish, watermark, share), unchanged.

Replace the entire returned JSX (the old mini-sidebar + tabs + preview tree) with:
```tsx
return (
  <SiteEditorShell
    title={displayTitle}
    typeLabel="Link-in-bio"
    typeIcon={Link2}
    onBack={() => router.push('/dashboard/sites')}
    saving={saving}
    saved={saved}
    onSave={handleSave}
    canUndo={canUndo}
    canRedo={canRedo}
    onUndo={handleUndo}
    onRedo={handleRedo}
    theme={theme}
    onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    previewUrl={previewUrl}
    displayUrl={site ? getSiteDisplayUrl(site) : null}
    iframeRef={iframeRef}
    previewKey={previewKey}
    onRefresh={() => setPreviewKey(Date.now())}
    device={device}
    onDeviceChange={setDevice}
  >
    <EditorPanel
      view={view}
      onViewChange={setView}
      content={contentSlot}
      design={designSlot}
      settings={settingsSlot}
    />
  </SiteEditorShell>
);
```

- [ ] **Step 6: Typecheck, lint (remove dead imports/vars), commit**

Run: `npx tsc --noEmit && npm run lint`
Expected: exit 0. Resolve any "unused" lint errors by deleting the now-dead mini-sidebar markup, the old `TABS`/`activeTab` machinery, and unused imports. Confirm `device` still defaults to `'mobile'` (the linkinbio default) where it's declared.
```bash
git add app/dashboard/sites/edit/linkinbio/[id]/page.tsx
git commit -m "feat(linkinbio): migrate editor onto SiteEditorShell + section model"
```

---

## Task 10: Manual verification in the running app

**Files:** none (verification only)

- [ ] **Step 1: Run the app**

Run: `npm run dev` → open `http://localhost:3000/dashboard/sites/edit/linkinbio/<an-existing-linkinbio-site-id>`

- [ ] **Step 2: Walk the checklist in LIGHT then DARK mode**

Verify, toggling theme with the header button:
- Loads existing data; preview renders (mobile by default).
- Content: each block row shows icon + title + summary; hidden block dims + says "Hidden".
- Drag reorder persists order; preview updates after Save.
- Hide / Duplicate / Delete per row work.
- Click a row → drill-in shows that block's editor; typing updates the preview live; "Back to blocks" returns.
- Profile header row → drill-in `BioProfileEditor`; edits reflect in preview.
- Add block → categorized picker → new block appears and opens.
- Design view: template apply + appearance changes reflect in preview.
- Settings view: slug check (available/taken/invalid), SEO fields, publish toggle, watermark/share.
- Save → reload page → all changes persisted.
- Undo/redo (buttons + Ctrl+Z / Ctrl+Shift+Z) work.
- Device switcher (desktop/tablet/mobile) + Open + Link (copy) + refresh work.
- No mini app-sidebar present.

- [ ] **Step 3: Confirm the other editors still work**

Open `/dashboard/sites/edit/main/<id>`, `/singlepage/<id>`, `/payment/<id>` — each still loads and saves unchanged (they were not modified).

- [ ] **Step 4: Hardcoded-color grep gate**

Run (from `dashboard-design.md`):
```bash
grep -rnE "bg-(white|gray|zinc|emerald|red|amber|yellow|blue|indigo|purple|pink|violet|sky|rose|fuchsia)|text-(gray|zinc|emerald|red|amber|yellow|blue|indigo|purple|pink|violet|sky|rose|fuchsia)|border-(gray|zinc|emerald|amber|indigo|purple|violet)|dark:bg-|dark:text-|dark:border-" app/dashboard/sites/edit/linkinbio src/components/dashboard/site-edit/shell
```
Expected: zero hits (acceptable false positives per `dashboard-design.md`: `text-[var(--text-on-brand)]`, `bg-white/N` opacity overlays, literal toggle knobs — none expected here). Fix any real hits and re-commit.

---

## Task 11: Docs + final gate

**Files:**
- Modify: `docs/reference/dashboard-map.md`

- [ ] **Step 1: Update the dashboard map**

In `docs/reference/dashboard-map.md`, update the `app/dashboard/sites/edit/linkinbio` entry to describe the new structure: composes `SiteEditorShell` + `EditorPanel` (Content/Design/Settings) with a registry-driven `SectionList` + drill-in `SectionDetail`; note the new `shell/` package and `tabs/linkinbio/sectionRegistry.tsx`. Note that `main`/`singlepage`/`payment` are unchanged pending later specs.

- [ ] **Step 2: Full verification gate**

Run:
```bash
npx tsc --noEmit
npm run lint
npx vitest run
```
Expected: all exit 0 (vitest: the new `reorder` + `summarize` suites pass alongside existing tests).

- [ ] **Step 3: Commit**

```bash
git add docs/reference/dashboard-map.md
git commit -m "docs(reference): dashboard-map for linkinbio shell migration"
```

---

## Self-Review Notes (author)

- **Spec coverage:** shell package (§5.3) → Tasks 1,4–8; section registry + DX (§5.3) → Tasks 2–3; linkinbio mapping incl. accordion→drill-in, pinned Profile, tab→view mapping, mini-sidebar removal (§5.4) → Task 9; preserved data/save/preview/undo (§6) → Task 9 (explicit "preserve verbatim"); tokenized styling (§7) → tokens used throughout + Task 10 grep; verification (§10) → Tasks 10–11; docs drift → Task 11.
- **§11 open questions resolved:** drag stays manual (no `@dnd-kit`) — Task 5; `BioLinksEditor` is **superseded** by `SectionList` (the page no longer renders it) but the file is kept because `BLOCK_CATEGORIES` is imported from it (Task 3) — it is not deleted in this spec.
- **Type consistency:** `SectionItem`/`SectionDef`/`SectionRegistry` (Task 1) are consumed unchanged by `AddSectionPicker` (4), `SectionList` (5), `sectionRegistry` (3). `EditorView` defined in Task 7, imported in Task 9. `BlockEditorProps` callback names (`update`, `updateMeta`, `openImagePicker`) match Task 9's `BlockBody` usage.
- **Known follow-up (not a blocker):** Step 9.3's `openImagePicker` is stubbed; the real image-picker trigger (the existing `ImagePickerModal` wiring) must be reconnected during Task 9 — called out inline so it is not forgotten.
