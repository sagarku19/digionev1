---
noteId: "fd875b506a8f11f19a5ba9a9f70f067a"
tags: []

---

# Link-in-Bio Editor Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Link-in-Bio editor into a premium 3-zone SaaS shell (sidebar nav · canvas · live preview) with inline-expand block editing, preserving all data/save/preview/undo behavior.

**Architecture:** Extract the existing `SiteEditorShell` chrome into reusable `EditorTopBar` + `PreviewPane`, then compose a new `LinkInBioShell` (TopBar + `EditorSidebar` + active section + `PreviewPane`). The Content section becomes inline-expand `BlockCard`s (replacing drill-in). Premium radius/shadow come from new editor-only CSS tokens; color stays on dashboard tokens so dark mode is automatic.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4 (dashboard CSS-var tokens + new editor tokens), framer-motion, lucide-react, Vitest (node) for pure logic.

**Branch:** `feat/site-editor-shell` (spec committed at `b484add`).

**Spec:** `docs/superpowers/specs/2026-06-18-linkinbio-editor-redesign-design.md`.

**Testing approach (codebase-specific):** UI verifies via `npx tsc --noEmit` + `npx eslint <file>` (scoped — repo-wide lint has pre-existing `any` debt) + manual + the `dashboard-design.md` color grep. Vitest is **node-env only** (no jsdom/RTL — adding them needs owner approval), used for pure functions. Component tasks gate on tsc + scoped eslint + color grep; interaction is verified manually.

---

## File Structure

**New** (`src/components/dashboard/site-edit/editor/`):

| File | Responsibility |
|---|---|
| `EditorTopBar.tsx` | Back · title/type · undo/redo · theme · Save (extracted from `SiteEditorShell` header) |
| `PreviewPane.tsx` | Device switch + zoom iframe + browser chrome (extracted from `SiteEditorShell` preview) |
| `EditorSidebar.tsx` | Nav rail: real sections + Tools group, active state, "Coming soon" badges, collapse |
| `ComingSoon.tsx` | Placeholder section view |
| `LinkInBioShell.tsx` | 3-zone orchestrator; owns active-section + collapsed + mobile-tab state |
| `BlockCard.tsx` | Inline-expandable block card (hosts the block editor when open) |
| `ProfileCard.tsx` | Profile summary card |

**Modified:**

| File | Change |
|---|---|
| `app/globals.css` | Add `--radius-xl`, `--shadow-card`, `--shadow-card-lg` (light + dark) |
| `.claude/rules/dashboard-design.md` | Document the editor-surface premium tokens |
| `src/components/dashboard/site-edit/shell/SiteEditorShell.tsx` | Re-compose `EditorTopBar` + `PreviewPane` (no behavior change) |
| `src/components/dashboard/site-edit/shell/SectionList.tsx` | Render `BlockCard`s; internal single-open expand; `renderEditor` prop; drop `onSelect` drill-in |
| `app/dashboard/sites/edit/linkinbio/[id]/page.tsx` | Compose `LinkInBioShell`; sections as slots; inline-expand editor; remove drill-in |
| `docs/reference/dashboard-map.md` | Update linkinbio editor entry |

**Deleted:** `shell/SectionDetail.tsx`, `shell/EditorPanel.tsx` (linkinbio-only; no other consumer).

**Unchanged:** `AddSectionPicker.tsx`, `sectionRegistry.tsx`, `summarize.ts`, `reorder.ts`, `types.ts`, all `blockEditors/*`, hooks, `/api`, DB, `main`/`single`/`payment` editors.

---

## PHASE 1 — Extract chrome + premium tokens

### Task 1: Premium editor tokens

**Files:**
- Modify: `app/globals.css`
- Modify: `.claude/rules/dashboard-design.md`

- [ ] **Step 1: Add tokens to `:root` and `.dark`**

In `app/globals.css`, inside the existing `:root { … }` block (near the other `--radius-*`/`--shadow-*` vars), add:
```css
  --radius-xl: 20px;
  --shadow-card: 0 8px 22px -14px rgba(20, 20, 30, 0.18);
  --shadow-card-lg: 0 16px 36px -18px rgba(20, 20, 30, 0.28);
```
In the existing `.dark { … }` block, add:
```css
  --shadow-card: 0 8px 22px -12px rgba(0, 0, 0, 0.55);
  --shadow-card-lg: 0 16px 36px -16px rgba(0, 0, 0, 0.7);
```
(`--radius-xl` is theme-independent, so it lives only in `:root`.)

- [ ] **Step 2: Document in `dashboard-design.md`**

Add a short subsection under the Radius/Shadow tables noting: `--radius-xl` (20px), `--shadow-card`, `--shadow-card-lg` are the **editor-surface** premium tokens, used only within `src/components/dashboard/site-edit/editor/**`, and that the editor is a distinct surface from list/form pages.

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit` (expect 0 — CSS-only, no TS impact).
```bash
git add app/globals.css .claude/rules/dashboard-design.md
git commit -m "feat(editor): premium editor-surface tokens (radius-xl, shadow-card)"
```

---

### Task 2: Extract `EditorTopBar`

**Files:**
- Create: `src/components/dashboard/site-edit/editor/EditorTopBar.tsx`
- Reference: `src/components/dashboard/site-edit/shell/SiteEditorShell.tsx` (header markup, the `<div className="flex h-14 …">` block inside LEFT PANEL)

- [ ] **Step 1: Create `EditorTopBar.tsx`** with this exact contract and the header markup lifted from `SiteEditorShell` (re-tokenized identically — it already is):
```tsx
'use client';
import { ArrowLeft, Save, Loader2, CheckCircle2, Undo2, Redo2, Moon, Sun } from 'lucide-react';
import type { ElementType } from 'react';

type Props = {
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
};

export default function EditorTopBar(props: Props) {
  const { title, typeLabel, typeIcon: TypeIcon, onBack, saving, saved, onSave,
    canUndo, canRedo, onUndo, onRedo, theme, onToggleTheme } = props;
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-primary)] px-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Back to sites" className="-ml-2 rounded-[var(--radius-md)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="max-w-[200px] truncate text-sm font-semibold text-[var(--text-primary)]">{title}</h1>
          <p className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-tertiary)]">
            <TypeIcon className="h-3 w-3" /> {typeLabel}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onToggleTheme} title="Toggle theme" aria-label="Toggle theme" className="rounded-[var(--radius-md)] border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        {(onUndo || onRedo) && (
          <div className="flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--border)] p-1">
            <button onClick={onUndo} disabled={!canUndo} title="Undo" aria-label="Undo" className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-secondary)] enabled:hover:bg-[var(--surface-hover)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"><Undo2 className="h-4 w-4" /></button>
            <button onClick={onRedo} disabled={!canRedo} title="Redo" aria-label="Redo" className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-secondary)] enabled:hover:bg-[var(--surface-hover)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"><Redo2 className="h-4 w-4" /></button>
          </div>
        )}
        <button onClick={onSave} disabled={saving} className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50 ${saved ? 'bg-[var(--success)] text-[var(--text-on-brand)]' : 'bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]'}`}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

Run: `npx tsc --noEmit && npx eslint src/components/dashboard/site-edit/editor/EditorTopBar.tsx` (expect 0/clean).
```bash
git add src/components/dashboard/site-edit/editor/EditorTopBar.tsx
git commit -m "feat(editor): extract EditorTopBar"
```

---

### Task 3: Extract `PreviewPane` + re-compose `SiteEditorShell`

**Files:**
- Create: `src/components/dashboard/site-edit/editor/PreviewPane.tsx`
- Modify: `src/components/dashboard/site-edit/shell/SiteEditorShell.tsx`

- [ ] **Step 1: Create `PreviewPane.tsx`** — move the preview logic (ResizeObserver + zoom math + the RIGHT PREVIEW JSX) out of `SiteEditorShell` into this component with contract:
```tsx
'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { ExternalLink, Copy, Check, RefreshCw, Monitor, Tablet, Smartphone } from 'lucide-react';

type Props = {
  previewUrl: string | null;
  displayUrl: string | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  previewKey: number;
  onRefresh: () => void;
  device: string;
  onDeviceChange: (d: string) => void;
};

const DEVICES = [
  { id: 'desktop', icon: Monitor, label: 'Desktop' },
  { id: 'tablet', icon: Tablet, label: 'Tablet' },
  { id: 'mobile', icon: Smartphone, label: 'Mobile' },
];

export default function PreviewPane({ previewUrl, displayUrl, iframeRef, previewKey, onRefresh, device, onDeviceChange }: Props) {
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
            <button key={d.id} onClick={() => onDeviceChange(d.id)} title={d.label} aria-label={d.label}
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
            <button onClick={onRefresh} title="Refresh" aria-label="Refresh preview" className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
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
  );
}
```

- [ ] **Step 2: Re-compose `SiteEditorShell`** to use the two extracted components. Replace its header JSX with `<EditorTopBar {...headerProps} />` and its entire RIGHT PREVIEW block with `<PreviewPane {...previewProps} />`, importing both from `../editor/`. Remove the now-unused preview state/refs/zoom math and header imports from `SiteEditorShell`. Its public Props stay identical (so the linkinbio page is unaffected this phase).

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit && npx eslint src/components/dashboard/site-edit/editor/PreviewPane.tsx src/components/dashboard/site-edit/shell/SiteEditorShell.tsx`.
Manual: `npm run dev` → open the linkinbio editor; confirm header + preview look and behave exactly as before (Save, undo/redo, theme, device switch, live preview updates).
```bash
git add src/components/dashboard/site-edit/editor/PreviewPane.tsx src/components/dashboard/site-edit/shell/SiteEditorShell.tsx
git commit -m "feat(editor): extract PreviewPane; SiteEditorShell re-composes chrome"
```

---

## PHASE 2 — 3-zone shell + sidebar

### Task 4: `ComingSoon`

**Files:** Create `src/components/dashboard/site-edit/editor/ComingSoon.tsx`

- [ ] **Step 1: Create the component**
```tsx
'use client';
import type { ElementType } from 'react';

export default function ComingSoon({ icon: Icon, title }: { icon?: ElementType; title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--surface-muted)] text-[var(--text-tertiary)]">
        {Icon ? <Icon className="h-6 w-6" /> : null}
      </span>
      <div>
        <p className="text-base font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Coming soon.</p>
      </div>
    </div>
  );
}
```
- [ ] **Step 2: Verify + commit**
`npx tsc --noEmit && npx eslint <file>`; commit `feat(editor): ComingSoon placeholder`.

---

### Task 5: `EditorSidebar`

**Files:** Create `src/components/dashboard/site-edit/editor/EditorSidebar.tsx`

- [ ] **Step 1: Create the component**
```tsx
'use client';
import { ChevronsLeft } from 'lucide-react';
import type { ElementType } from 'react';

export type SidebarItem = {
  id: string;
  label: string;
  icon: ElementType;
  group: 'main' | 'tools';
  comingSoon?: boolean;
};

type Props = {
  items: SidebarItem[];
  active: string;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export default function EditorSidebar({ items, active, onSelect, collapsed, onToggleCollapse }: Props) {
  const main = items.filter((i) => i.group === 'main');
  const tools = items.filter((i) => i.group === 'tools');
  const width = collapsed ? 'w-[64px]' : 'w-[210px]';

  const Row = (it: SidebarItem) => {
    const isActive = active === it.id;
    return (
      <button
        key={it.id}
        onClick={() => onSelect(it.id)}
        title={it.label}
        className={`flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${collapsed ? 'justify-center' : ''} ${
          isActive
            ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        <it.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="flex-1 truncate text-left">{it.label}</span>}
        {!collapsed && it.comingSoon && (
          <span className="rounded-full bg-[var(--surface-muted)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">soon</span>
        )}
      </button>
    );
  };

  return (
    <div className={`${width} shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] transition-all duration-200 hidden lg:flex`}>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2.5">
        {main.map(Row)}
        {tools.length > 0 && (
          <>
            {!collapsed && <p className="px-2.5 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Tools</p>}
            {collapsed && <div className="my-2 h-px bg-[var(--border)]" />}
            {tools.map(Row)}
          </>
        )}
      </div>
      <div className="border-t border-[var(--border)] p-2.5">
        <button onClick={onToggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand' : 'Collapse'}
          className={`flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${collapsed ? 'justify-center' : ''}`}>
          <ChevronsLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );
}
```
- [ ] **Step 2: Verify + commit**
`npx tsc --noEmit && npx eslint <file>`; commit `feat(editor): EditorSidebar nav rail`.

---

### Task 6: `LinkInBioShell` orchestrator

**Files:** Create `src/components/dashboard/site-edit/editor/LinkInBioShell.tsx`

- [ ] **Step 1: Create the component** (owns active-section + collapsed state; localStorage persistence; renders TopBar + Sidebar + active section + PreviewPane)
```tsx
'use client';
import { useEffect, useState, type ReactNode, type RefObject, type ElementType } from 'react';
import { LayoutList, User, Palette, Settings2, BarChart3, GraduationCap, Link2, CalendarDays } from 'lucide-react';
import EditorTopBar from './EditorTopBar';
import PreviewPane from './PreviewPane';
import EditorSidebar, { type SidebarItem } from './EditorSidebar';
import ComingSoon from './ComingSoon';

type SectionId = 'content' | 'profile' | 'design' | 'settings';

const NAV: SidebarItem[] = [
  { id: 'content', label: 'Content', icon: LayoutList, group: 'main' },
  { id: 'profile', label: 'Profile', icon: User, group: 'main' },
  { id: 'design', label: 'Design', icon: Palette, group: 'main' },
  { id: 'settings', label: 'Settings', icon: Settings2, group: 'main' },
  { id: 'insights', label: 'Insights', icon: BarChart3, group: 'tools', comingSoon: true },
  { id: 'course', label: 'Course', icon: GraduationCap, group: 'tools', comingSoon: true },
  { id: 'link-shortener', label: 'Link shortener', icon: Link2, group: 'tools', comingSoon: true },
  { id: 'social-planner', label: 'Social planner', icon: CalendarDays, group: 'tools', comingSoon: true },
];

const COMING_SOON: Record<string, { label: string; icon: ElementType }> = {
  insights: { label: 'Insights', icon: BarChart3 },
  course: { label: 'Course', icon: GraduationCap },
  'link-shortener': { label: 'Link shortener', icon: Link2 },
  'social-planner': { label: 'Social planner', icon: CalendarDays },
};

type Props = {
  // top bar
  title: string; typeLabel: string; typeIcon: ElementType; onBack: () => void;
  saving: boolean; saved: boolean; onSave: () => void;
  canUndo?: boolean; canRedo?: boolean; onUndo?: () => void; onRedo?: () => void;
  theme: 'light' | 'dark'; onToggleTheme: () => void;
  // preview
  previewUrl: string | null; displayUrl: string | null;
  iframeRef: RefObject<HTMLIFrameElement | null>; previewKey: number; onRefresh: () => void;
  device: string; onDeviceChange: (d: string) => void;
  // section bodies
  sections: Record<SectionId, ReactNode>;
};

export default function LinkInBioShell(props: Props) {
  const { sections, ...chrome } = props;
  const [active, setActive] = useState<string>('content');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    setCollapsed(localStorage.getItem('linkinbio-editor-sidebar') === 'collapsed');
  }, []);
  const toggleCollapse = () => setCollapsed((c) => {
    const next = !c;
    localStorage.setItem('linkinbio-editor-sidebar', next ? 'collapsed' : 'expanded');
    return next;
  });

  const sectionBody = (active in sections)
    ? sections[active as SectionId]
    : <ComingSoon icon={COMING_SOON[active]?.icon} title={COMING_SOON[active]?.label ?? 'Coming soon'} />;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <EditorTopBar
        title={chrome.title} typeLabel={chrome.typeLabel} typeIcon={chrome.typeIcon} onBack={chrome.onBack}
        saving={chrome.saving} saved={chrome.saved} onSave={chrome.onSave}
        canUndo={chrome.canUndo} canRedo={chrome.canRedo} onUndo={chrome.onUndo} onRedo={chrome.onRedo}
        theme={chrome.theme} onToggleTheme={chrome.onToggleTheme}
      />

      {/* mobile tab switch */}
      <div className="flex shrink-0 gap-1 border-b border-[var(--border)] bg-[var(--bg-primary)] p-2 lg:hidden">
        {(['edit', 'preview'] as const).map((t) => (
          <button key={t} onClick={() => setMobileTab(t)}
            className={`flex-1 rounded-[var(--radius-sm)] py-1.5 text-sm font-medium capitalize transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${mobileTab === t ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-secondary)]'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <EditorSidebar items={NAV} active={active} onSelect={setActive} collapsed={collapsed} onToggleCollapse={toggleCollapse} />

        {/* canvas */}
        <div className={`min-w-0 flex-1 flex-col overflow-y-auto bg-[var(--bg-primary)] ${mobileTab === 'edit' ? 'flex' : 'hidden'} lg:flex`}>
          <div className="mx-auto w-full max-w-2xl p-5">{sectionBody}</div>
        </div>

        {/* preview */}
        <div className={`w-full shrink-0 lg:w-[400px] ${mobileTab === 'preview' ? 'flex' : 'hidden'} lg:flex`}>
          <PreviewPane
            previewUrl={chrome.previewUrl} displayUrl={chrome.displayUrl} iframeRef={chrome.iframeRef}
            previewKey={chrome.previewKey} onRefresh={chrome.onRefresh} device={chrome.device} onDeviceChange={chrome.onDeviceChange}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**
`npx tsc --noEmit && npx eslint src/components/dashboard/site-edit/editor/LinkInBioShell.tsx`; commit `feat(editor): LinkInBioShell 3-zone orchestrator`.

---

### Task 7: Migrate the linkinbio page to `LinkInBioShell`

**Files:** Modify `app/dashboard/sites/edit/linkinbio/[id]/page.tsx`

The page currently builds `contentSlot` (line ~939), `designSlot` (~987), `settingsSlot` (~1022) and renders `<SiteEditorShell>…<EditorPanel content design settings/></SiteEditorShell>` (return ~1130). Keep all slot JSX and all logic (load/save/undo/postMessage) **verbatim**; only swap the shell.

- [ ] **Step 1: Split Content vs Profile.** The current `contentSlot` shows the section list and (via `profileOpen`) the profile editor. For the new sidebar, Profile is its own section. Define:
```tsx
const profileSection = <BioProfileEditor data={profile} onChange={setProfile} />;
```
And simplify `contentSlot` to just the pinned profile summary (kept) + `SectionList` (the `profileOpen`/drill-in profile branch is removed — Profile now lives in its own sidebar section). The pinned "Profile header" button's `onClick` becomes a no-op placeholder for now (Phase 4 wires `ProfileCard` → switch to Profile section); leave `setProfileOpen` removal to Step 3.

- [ ] **Step 2: Replace the return.** Swap imports `SiteEditorShell`/`EditorPanel` for:
```tsx
import LinkInBioShell from '@/components/dashboard/site-edit/editor/LinkInBioShell';
```
Replace the returned `<SiteEditorShell>…</SiteEditorShell>` with:
```tsx
  return (
    <>
      <LinkInBioShell
        title={displayTitle}
        typeLabel="Link-in-bio"
        typeIcon={Link2}
        onBack={() => router.push('/dashboard/sites')}
        saving={saving} saved={saved} onSave={handleSave}
        canUndo={canUndo} canRedo={canRedo} onUndo={handleUndo} onRedo={handleRedo}
        theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        previewUrl={previewUrl} displayUrl={site ? getSiteDisplayUrl(site) : null}
        iframeRef={iframeRef} previewKey={previewKey} onRefresh={() => setPreviewKey(Date.now())}
        device={device} onDeviceChange={setDevice}
        sections={{ content: contentSlot, profile: profileSection, design: designSlot, settings: settingsSlot }}
      />
      {imagePicker.open && (
        <ImagePickerModal
          open={imagePicker.open}
          onClose={() => setImagePicker((p) => ({ ...p, open: false }))}
          onSelect={(url) => {
            if (imagePicker.field === 'thumbnail_url') updateSelected({ thumbnail_url: url });
            else if (imagePicker.field === 'meta_link_url') updateSelectedMeta('link_url', url);
          }}
        />
      )}
    </>
  );
```

- [ ] **Step 3: Typecheck, prune, color-grep, commit.**
Run `npx tsc --noEmit` (fix any reference to removed `profileOpen`/`EditorPanel`/`SiteEditorShell`). Run `npx eslint "app/dashboard/sites/edit/linkinbio/[id]/page.tsx"` and delete now-unused vars/imports until the file is warning-clean (except pre-existing `any`). Run the color grep over the page (expect only the white toggle knob).
Manual: editor loads; sidebar switches Content/Profile/Design/Settings; "Coming soon" renders for Tools items; Save/preview/undo all work.
```bash
git add "app/dashboard/sites/edit/linkinbio/[id]/page.tsx"
git commit -m "feat(linkinbio): editor on LinkInBioShell (sidebar sections)"
```

---

## PHASE 3 — Inline-expand block cards

### Task 8: `BlockCard`

**Files:** Create `src/components/dashboard/site-edit/editor/BlockCard.tsx`

`BlockCard` is the collapsed row + (when expanded) an inline editor region. Uses framer-motion for the expand. `Toggle` is the same success switch already in `SectionList`.

- [ ] **Step 1: Create the component**
```tsx
'use client';
import { GripVertical, Copy, Trash2, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ElementType, ReactNode } from 'react';

type Props = {
  label: string;
  summary: string;
  icon?: ElementType;
  visible: boolean;
  expanded: boolean;
  dragging?: boolean;
  over?: boolean;
  onExpandToggle: () => void;
  onVisibleToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  dragProps: React.HTMLAttributes<HTMLDivElement> & { draggable: boolean };
  editor: ReactNode; // rendered when expanded
};

export default function BlockCard({
  label, summary, icon: Icon, visible, expanded, dragging, over,
  onExpandToggle, onVisibleToggle, onDuplicate, onDelete, dragProps, editor,
}: Props) {
  return (
    <div
      {...dragProps}
      className={`group rounded-[var(--radius-xl)] border bg-[var(--surface)] transition-colors ${
        over ? 'border-[var(--brand)] shadow-[inset_0_2px_0_0_var(--brand)]'
             : expanded ? 'border-[var(--border-strong)] shadow-[var(--shadow-card-lg)]'
             : 'border-[var(--border)] shadow-[var(--shadow-card)] hover:bg-[var(--surface-hover)]'
      } ${dragging ? 'opacity-50' : ''} ${!visible ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-2 py-2.5 pl-1.5 pr-3">
        <span aria-hidden className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center text-[var(--text-tertiary)] opacity-40 transition-opacity group-hover:opacity-100 active:cursor-grabbing">
          <GripVertical className="h-4 w-4" />
        </span>
        <button onClick={onExpandToggle} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-sm)] text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
            {Icon ? <Icon className="h-4 w-4" /> : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{label}</span>
            <span className="block truncate text-xs text-[var(--text-tertiary)]">{summary}</span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <IconBtn label="Duplicate" onClick={onDuplicate}><Copy className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn label="Delete" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
          </div>
          <Toggle checked={visible} onClick={onVisibleToggle} label={visible ? 'Hide block' : 'Show block'} />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }} className="overflow-hidden"
          >
            <div className="border-t border-[var(--border)] p-4">{editor}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
      {children}
    </button>
  );
}

function Toggle({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} title={label} onClick={onClick}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${checked ? 'bg-[var(--success)]' : 'bg-[var(--surface-muted)] border border-[var(--border)]'}`}>
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}
```
- [ ] **Step 2: Verify + commit**
`npx tsc --noEmit && npx eslint <file>`; commit `feat(editor): inline-expand BlockCard`.

---

### Task 9: `SectionList` renders `BlockCard`; retire `SectionDetail`

**Files:**
- Modify `src/components/dashboard/site-edit/shell/SectionList.tsx`
- Delete `src/components/dashboard/site-edit/shell/SectionDetail.tsx`

- [ ] **Step 1: Rework `SectionList`** — remove `onSelect`; add internal `expandedId` (single-open) and a `renderEditor` prop. Replace the inline row markup with `<BlockCard>`, passing the drag handlers as `dragProps` and `renderEditor(item)` as `editor` for the expanded card. The Props become:
```tsx
type Props<TItem extends SectionItem> = {
  items: TItem[];
  registry: SectionRegistry<TItem>;
  typeOf: (item: TItem) => string;
  onReorder: (from: number, to: number) => void;
  onToggleVisible: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (type: string) => void;
  renderEditor: (item: TItem) => ReactNode;
  pinned?: ReactNode;
};
```
Inside the map, build `dragProps` `{ draggable: true, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd }` exactly as the current row uses them, and render:
```tsx
<BlockCard
  key={item.id}
  label={def?.label ?? typeOf(item)}
  summary={def?.summarize(item) ?? ''}
  icon={def?.icon}
  visible={item.is_visible}
  expanded={expandedId === item.id}
  dragging={dragIdx === idx}
  over={overIdx === idx && dragIdx !== null && dragIdx !== idx}
  onExpandToggle={() => setExpandedId((id) => (id === item.id ? null : item.id))}
  onVisibleToggle={() => onToggleVisible(item.id)}
  onDuplicate={() => onDuplicate(item.id)}
  onDelete={() => onDelete(item.id)}
  dragProps={dragProps}
  editor={renderEditor(item)}
/>
```
Keep the count header, empty state, and the filled-brand Add button + `AddSectionPicker` exactly as they are. Import `BlockCard` from `../editor/BlockCard`; remove the now-unused `GripVertical`/`Eye`/etc. and the local `IconBtn`/`Toggle` (they live in `BlockCard` now).

- [ ] **Step 2: Delete `SectionDetail.tsx`** (`git rm`).

- [ ] **Step 3: Verify + commit**
`npx tsc --noEmit` (the page still references the old `SectionList` props — it gets fixed in Task 10; if tsc fails only due to that, proceed to Task 10 and verify there). `npx eslint src/components/dashboard/site-edit/shell/SectionList.tsx`. Commit `feat(editor): SectionList uses BlockCard; drop drill-in`.

---

### Task 10: Wire inline-expand in the page

**Files:** Modify `app/dashboard/sites/edit/linkinbio/[id]/page.tsx`

- [ ] **Step 1:** Change `imagePicker` state to carry the block id:
```tsx
const [imagePicker, setImagePicker] = useState<{ open: boolean; field: string; blockId: string }>({ open: false, field: '', blockId: '' });
```
- [ ] **Step 2:** Replace the per-selection `updateSelected`/`updateSelectedMeta` with id-scoped helpers:
```tsx
const updateBlock = (id: string, updates: Partial<BioLink>) =>
  setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
const updateBlockMeta = (id: string, key: string, value: unknown) =>
  setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, metadata: { ...l.metadata, [key]: value } } : l)));
```
- [ ] **Step 3:** In `contentSlot`, drop the `selectedBlock`/`SectionDetail` branch and pass `renderEditor` to `SectionList`:
```tsx
<SectionList
  items={links}
  registry={linkinbioRegistry}
  typeOf={(l) => l.link_type}
  onReorder={handleReorder}
  onToggleVisible={handleToggleVisible}
  onDuplicate={handleDuplicateBlock}
  onDelete={handleDeleteBlock}
  onAdd={handleAddBlock}
  pinned={/* keep the existing pinned profile button */}
  renderEditor={(l) => (
    <BlockBody
      link={l}
      update={(u) => updateBlock(l.id, u)}
      updateMeta={(k, v) => updateBlockMeta(l.id, k, v)}
      openImagePicker={(field) => setImagePicker({ open: true, field, blockId: l.id })}
      products={products}
    />
  )}
/>
```
- [ ] **Step 4:** Update the `ImagePickerModal` `onSelect` to use `imagePicker.blockId`:
```tsx
onSelect={(url) => {
  if (imagePicker.field === 'thumbnail_url') updateBlock(imagePicker.blockId, { thumbnail_url: url });
  else if (imagePicker.field === 'meta_link_url') updateBlockMeta(imagePicker.blockId, 'link_url', url);
}}
```
- [ ] **Step 5:** Remove `selectedBlockId`/`selectedBlock`/`selectedDef`/`updateSelected`/`updateSelectedMeta`/`SectionDetail` import. `npx tsc --noEmit && npx eslint <page>`; color grep.
Manual: click a block → expands inline; edit title/url → preview updates live; thumbnail picker writes to the right block; only one block open at a time; reorder/toggle/duplicate/delete still work.
```bash
git add "app/dashboard/sites/edit/linkinbio/[id]/page.tsx" src/components/dashboard/site-edit/shell/SectionList.tsx
git commit -m "feat(linkinbio): inline-expand block editing"
```

---

## PHASE 4 — Profile card, polish, Coming-soon, retire EditorPanel

### Task 11: `ProfileCard`

**Files:** Create `src/components/dashboard/site-edit/editor/ProfileCard.tsx`; modify the page.

- [ ] **Step 1: Create `ProfileCard.tsx`**
```tsx
'use client';
import { Pencil } from 'lucide-react';

type Props = {
  name: string;
  username: string;
  bio: string;
  avatarUrl: string;
  onEdit: () => void;
};

export default function ProfileCard({ name, username, bio, avatarUrl, onEdit }: Props) {
  return (
    <div className="mb-5 flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{name || 'Your name'}</p>
        <p className="truncate text-xs text-[var(--text-tertiary)]">{username ? `@${username}` : 'username'}{bio ? ` · ${bio}` : ''}</p>
      </div>
      <button onClick={onEdit}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
        <Pencil className="h-3.5 w-3.5" /> Edit
      </button>
    </div>
  );
}
```
- [ ] **Step 2: Use it in `contentSlot`.** Replace the existing pinned profile button with `<ProfileCard name={profile.displayName} username={site?.slug ?? ''} bio={profile.bioText} avatarUrl={profile.avatarUrl} onEdit={…} />`. The `onEdit` must switch the sidebar to the Profile section — expose an `onGoToProfile` from `LinkInBioShell` via a render-prop OR lift `active` state: simplest is to add an optional `initialSection` + an imperative ref. **Plan decision:** add a `sectionsNav` callback — extend `LinkInBioShell` Props with `onRequestSection?: (id: string) => void` and expose setActive through it by passing a setter; the page stores a `goToSection` ref. (Keep it minimal: `LinkInBioShell` accepts `controlledActive`/`onActiveChange` so the page can drive it.) Implement controlled active:
  - In `LinkInBioShell`, accept optional `active?: string` + `onActiveChange?: (id) => void`; use them if provided, else internal state.
  - Page holds `const [section, setSection] = useState('content')`, passes `active={section} onActiveChange={setSection}`, and `ProfileCard onEdit={() => setSection('profile')}`.
- [ ] **Step 3: Verify + commit** — `tsc`, eslint, color grep; manual: ProfileCard shows live profile, Edit jumps to Profile section. Commit `feat(editor): ProfileCard + controlled section nav`.

---

### Task 12: Premium-polish Design/Settings + delete `EditorPanel`

**Files:** Modify the page's `designSlot`/`settingsSlot`; delete `shell/EditorPanel.tsx`.

- [ ] **Step 1:** Restyle the cards inside `designSlot` and `settingsSlot` to the premium surface: containers use `rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] p-5` (replace the current `rounded-[var(--radius-lg)] … ` card wrappers). No color changes (tokens only). Keep all fields/handlers identical.
- [ ] **Step 2:** `git rm src/components/dashboard/site-edit/shell/EditorPanel.tsx` (no remaining consumer — confirm with `grep -rn "EditorPanel" src app`).
- [ ] **Step 3: Verify + commit** — `tsc`, eslint, color grep over the page + `editor/**` (zero hits). Commit `feat(editor): premium Design/Settings cards; remove EditorPanel`.

---

## PHASE 5 — Mobile + final

### Task 13: Mobile verification + fixes

**Files:** `LinkInBioShell.tsx` (already has the `lg:` responsive + mobile tab from Task 6) — verify and fix.

- [ ] **Step 1:** Manual at a narrow width (e.g. 390px) in light + dark: top bar fits; the `Edit | Preview` tab appears; Edit shows sidebar-less canvas (sidebar is `hidden lg:flex`); Preview shows the phone. Add a mobile section-switcher if the sidebar is hidden on mobile — **the sidebar is `hidden` below `lg`, so on mobile add a compact section dropdown** in the canvas header. Implement a minimal `<select>`-free pill row at the top of the canvas on mobile:
```tsx
{/* inside LinkInBioShell canvas, above section body, mobile only */}
<div className="mb-3 flex gap-1 overflow-x-auto lg:hidden">
  {NAV.filter((n) => n.group === 'main').map((n) => (
    <button key={n.id} onClick={() => setActive(n.id)}
      className={`shrink-0 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${active === n.id ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-secondary)]'}`}>
      {n.label}
    </button>
  ))}
</div>
```
- [ ] **Step 2: Verify + commit** — `tsc`, eslint; manual mobile pass. Commit `feat(editor): mobile section switcher`.

---

### Task 14: Docs + final gate

**Files:** Modify `docs/reference/dashboard-map.md`.

- [ ] **Step 1:** Update the linkinbio editor row + the "Shared editor shell" subsection to describe the new `editor/` package (`LinkInBioShell`, `EditorTopBar`, `PreviewPane`, `EditorSidebar`, `BlockCard`, `ProfileCard`, `ComingSoon`), the 3-zone layout, inline-expand model, and that `SectionDetail`/`EditorPanel` were removed.
- [ ] **Step 2: Full gate**
```bash
npx tsc --noEmit
npx vitest run
grep -rnE "bg-(white|gray|zinc|emerald|red|amber|yellow|blue|indigo|purple|pink|sky|rose|fuchsia)|text-(gray|zinc|emerald|red|amber|blue|indigo|purple|pink|sky|rose)|border-(gray|zinc|emerald)|dark:" src/components/dashboard/site-edit/editor/
```
Expected: tsc 0; vitest all pass; grep zero hits (allowed: white toggle knob).
Manual final checklist (light + dark, desktop + mobile): load · sidebar sections · inline-expand each block type · preview live-updates · reorder/toggle/duplicate/delete/add · Profile/Design/Settings persist on Save · undo/redo · device switch · Coming-soon · mobile tab + section switch. Confirm main/single/payment unaffected.
- [ ] **Step 3: Commit**
```bash
git add docs/reference/dashboard-map.md
git commit -m "docs(reference): dashboard-map for linkinbio editor redesign"
```

---

## Self-Review Notes (author)

- **Spec coverage:** 3-zone layout (§6) → Tasks 6–7; premium tokens/hybrid (§7) → Task 1; inline-expand (§Goal 2) → Tasks 8–10; sidebar + Coming-soon (§5) → Tasks 4–6; profile card (§5) → Task 11; retire SectionDetail/EditorPanel (§6.2) → Tasks 9, 12; mobile (§Goal 5) → Tasks 6, 13; preserved contracts (§8) → Tasks 3,7,10 ("verbatim" + manual preview/save checks); docs (§6.2) → Task 14.
- **§12 open questions resolved:** single-open accordion (Task 9 `expandedId`); sidebar collapse → `localStorage` key `linkinbio-editor-sidebar` (Task 6); mobile breakpoint `lg` (Tasks 6, 13).
- **Type consistency:** `SidebarItem` (Task 5) consumed by `LinkInBioShell` NAV (Task 6); `BlockCard` props (Task 8) consumed by `SectionList` (Task 9); `renderEditor` prop (Task 9) supplied by page (Task 10); `imagePicker.blockId` (Task 10) used in its `onSelect`; controlled `active`/`onActiveChange` added to `LinkInBioShell` in Task 11 and used by the page.
- **Known sequencing note:** Task 9 may leave `tsc` red until Task 10 updates the page's `SectionList` usage — called out in Task 9 Step 3. Treat Tasks 9+10 as one reviewable unit.
