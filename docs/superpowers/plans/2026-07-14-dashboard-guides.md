---
noteId: "23a62c607efb11f1b7ddffeec518d7f9"
tags: []

---

# Dashboard Guide System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app "Guide" button to 10 workflow-heavy dashboard pages; clicking it swaps the page body for a full-screen, AutoDM-style guide (numbered steps + pro tips) driven by one content registry.

**Architecture:** A `GuideProvider` in the dashboard layout holds `activeGuideKey`. A shared `GuideButton` (dropped into each page header) calls `openGuide(key)`. A `GuideOutlet` inside the layout's `<main>` renders `GuideScreen` when a guide is active, otherwise the page (`children`) — so the sidebar/TopBar stay mounted and only the content region swaps. All guide copy lives in `content.ts`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript (strict), Tailwind v4 with dashboard CSS-var tokens, lucide-react icons, Vitest (node env) for the registry test.

**Spec:** `docs/superpowers/specs/2026-07-14-dashboard-guides-design.md`

**Conventions for every task:**
- Commit at the end of each task (keeps the working tree clean, which also keeps the `check-doc-drift` Stop hook quiet — it only blocks on *uncommitted* dashboard edits without a `dashboard-map.md` change).
- Dashboard components use CSS-var tokens only (`var(--surface)`, `var(--border)`, `var(--brand)`, `var(--text-*)`, `var(--radius-*)`, `var(--shadow-*)`) — never hardcoded hex. Icons: lucide-react only. No `any`.
- Per-task type check: `npx tsc --noEmit` — Expected: no errors referencing `guides/` or the files you touched. (Pre-existing eslint warnings in `src/components/dashboard/Sidebar.tsx` are unrelated and do **not** appear in `tsc`.)

---

## File Structure

**Create:**
- `src/components/dashboard/guides/content.ts` — types (`GuideKey`, `GuideStep`, `Guide`), `GUIDE_KEYS`, `GUIDES` registry. One responsibility: guide data + types.
- `src/components/dashboard/guides/content.test.ts` — Vitest node test validating the registry.
- `src/components/dashboard/guides/GuideProvider.tsx` — context (`activeGuideKey`/`openGuide`/`closeGuide`) + `useGuide` hook + Escape-to-close.
- `src/components/dashboard/guides/GuideScreen.tsx` — full-screen guide renderer (reads registry).
- `src/components/dashboard/guides/GuideOutlet.tsx` — swaps `GuideScreen` ↔ `children`.
- `src/components/dashboard/guides/GuideButton.tsx` — the shared header button.
- `docs/reference/dashboard-guides.md` — guide-system reference + sync rule.

**Modify:**
- `app/dashboard/layout.tsx` — wrap in `GuideProvider`, render `GuideOutlet` inside `<main>`.
- `app/dashboard/products/page.tsx`, `app/dashboard/sites/page.tsx`, `app/dashboard/links/page.tsx` — add `GuideButton` to `PageHeader` action.
- `app/dashboard/marketing/page.tsx` + `.../coupons`, `.../leads`, `.../affiliates`, `.../referrals`, `.../services`, `.../community` page.tsx — add `GuideButton` to the bespoke header row.
- `CLAUDE.md` — sync rule + reference-table row.
- `docs/reference/dashboard-map.md` — Guides section.

---

## Task 1: Content registry + test (TDD)

**Files:**
- Create: `src/components/dashboard/guides/content.ts`
- Test: `src/components/dashboard/guides/content.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/dashboard/guides/content.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { GUIDES, GUIDE_KEYS } from './content';

describe('dashboard guide registry', () => {
  it('has a guide for every key', () => {
    for (const key of GUIDE_KEYS) {
      expect(GUIDES[key], `missing guide: ${key}`).toBeDefined();
    }
  });

  it('has no registry keys outside GUIDE_KEYS', () => {
    expect(Object.keys(GUIDES).sort()).toEqual([...GUIDE_KEYS].sort());
  });

  it('every guide is well-formed', () => {
    for (const key of GUIDE_KEYS) {
      const g = GUIDES[key];
      expect(g.title.trim().length, `${key}.title`).toBeGreaterThan(0);
      expect(g.intro.trim().length, `${key}.intro`).toBeGreaterThan(0);
      expect(g.steps.length, `${key}.steps`).toBeGreaterThan(0);
      g.steps.forEach((s, i) => {
        expect(s.title.trim().length, `${key}.steps[${i}].title`).toBeGreaterThan(0);
        expect(s.desc.trim().length, `${key}.steps[${i}].desc`).toBeGreaterThan(0);
      });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/dashboard/guides/content.test.ts`
Expected: FAIL — cannot resolve `./content` (module does not exist yet).

- [ ] **Step 3: Write the content registry**

Create `src/components/dashboard/guides/content.ts`:

```ts
import type { LucideIcon } from 'lucide-react';
import {
  Package, IndianRupee, Upload, Globe, Trash2, Store, Plus, Palette, Share2,
  Link2, Hash, BarChart2, Ticket, Users, Network, Gift, Calendar, Percent,
  Clock, Zap, FileText, Filter, Download, CheckCircle, ClipboardList,
  MessageCircle, Heart,
} from 'lucide-react';

export type GuideKey =
  | 'products' | 'sites' | 'links' | 'marketing' | 'coupons'
  | 'leads' | 'affiliates' | 'referrals' | 'services' | 'community';

export type GuideStep = { title: string; desc: string; icon?: LucideIcon };

export type Guide = {
  title: string;
  intro: string;
  steps: GuideStep[];
  tips?: string[];
  links?: { label: string; href: string }[];
};

export const GUIDE_KEYS: GuideKey[] = [
  'products', 'sites', 'links', 'marketing', 'coupons',
  'leads', 'affiliates', 'referrals', 'services', 'community',
];

export const GUIDES: Record<GuideKey, Guide> = {
  products: {
    title: 'Selling products',
    intro: 'Create, price, and deliver your digital products.',
    steps: [
      { title: 'Create a product', desc: 'Click Add Product, then give it a name, category, and description.', icon: Package },
      { title: 'Set your price', desc: 'Price it in ₹, add a compare-at price to show a discount, or make it free.', icon: IndianRupee },
      { title: 'Add what buyers get', desc: 'In the Content tab, upload files or add post-purchase access links delivered after payment.', icon: Upload },
      { title: 'Publish it', desc: 'Hit Publish to make it live on your storefront. You can unpublish anytime.', icon: Globe },
      { title: 'Manage & trash', desc: 'Filter by status, bulk-edit, or move products to Trash — restorable, and buyers keep access.', icon: Trash2 },
    ],
    tips: [
      'A product needs at least one file or access link before it can be published.',
      'Free products still capture buyer emails — great for growing your audience.',
      'Use categories so products group cleanly on your store.',
    ],
    links: [{ label: 'Build a site to sell on', href: '/dashboard/sites' }],
  },
  sites: {
    title: 'Building your storefront',
    intro: 'Create and manage the pages where people discover and buy from you.',
    steps: [
      { title: 'Pick a site type', desc: 'Store, Single-page, Link-in-bio, or Payment link — each suits a different goal.', icon: Store },
      { title: 'Create it', desc: 'Click Create New Site, choose a type, and set your slug (the URL).', icon: Plus },
      { title: 'Design in the editor', desc: 'Open a site to customize sections, theme, and which products appear.', icon: Palette },
      { title: 'Publish & share', desc: 'Publish the site, then copy its link to share anywhere.', icon: Share2 },
      { title: 'Trash', desc: 'Move unused sites to Trash — restorable; child pages cascade.', icon: Trash2 },
    ],
    tips: [
      'Link-in-bio is one per creator — perfect for your social profile link.',
      'Assign products to a Store site to build a product grid.',
      'Payment links use the site ID in the URL — no slug needed.',
    ],
    links: [{ label: 'Add a product first', href: '/dashboard/products' }],
  },
  links: {
    title: 'Short links',
    intro: 'Create trackable short links and see what gets clicked.',
    steps: [
      { title: 'Create a link', desc: 'Click Create link, paste a destination URL, and give it a short code.', icon: Link2 },
      { title: 'Customize the code', desc: 'Use a memorable code, or check availability and let one be generated.', icon: Hash },
      { title: 'Share it', desc: 'Copy the short link and share it across your channels.', icon: Share2 },
      { title: 'Track clicks', desc: 'Open a link to see click counts and analytics over time.', icon: BarChart2 },
    ],
    tips: [
      'Short, memorable codes get shared and typed more often.',
      'Use a different link per channel to compare what performs best.',
    ],
  },
  marketing: {
    title: 'Marketing tools',
    intro: 'Everything to grow your audience and boost sales, in one place.',
    steps: [
      { title: 'Coupons', desc: 'Create discount codes with expiry dates and usage caps.', icon: Ticket },
      { title: 'Leads', desc: 'Collect and export emails captured from your sites.', icon: Users },
      { title: 'Affiliates', desc: 'Let others promote your products for a commission.', icon: Network },
      { title: 'Referrals', desc: 'Reward buyers for bringing in new customers.', icon: Gift },
      { title: 'Services & Community', desc: 'Offer bookable services and post updates to your community.', icon: Calendar },
    ],
    tips: [
      'Start with a coupon to create urgency for a launch.',
      'Referrals turn happy buyers into a growth channel.',
    ],
    links: [
      { label: 'Coupons', href: '/dashboard/marketing/coupons' },
      { label: 'Affiliates', href: '/dashboard/marketing/affiliates' },
      { label: 'Referrals', href: '/dashboard/marketing/referrals' },
    ],
  },
  coupons: {
    title: 'Coupons',
    intro: 'Create discount codes that drive purchases.',
    steps: [
      { title: 'Create a coupon', desc: 'Click New Coupon and set a code, or generate a random one.', icon: Ticket },
      { title: 'Set the discount', desc: 'Choose a percentage or a fixed ₹ amount off.', icon: Percent },
      { title: 'Add limits', desc: 'Set an expiry date and a maximum number of uses.', icon: Clock },
      { title: 'Activate', desc: 'Toggle the coupon active — pause it anytime.', icon: Zap },
    ],
    tips: [
      'Percentage discounts feel bigger on low-priced products; fixed amounts on high-priced ones.',
      'Usage caps create scarcity — think “first 50 buyers”.',
      'Expired or maxed-out coupons stop working automatically.',
    ],
  },
  leads: {
    title: 'Leads',
    intro: 'Capture and manage emails from your storefronts.',
    steps: [
      { title: 'Add a lead form', desc: 'Add a lead-capture block to a site so visitors can subscribe.', icon: FileText },
      { title: 'Watch leads arrive', desc: 'Submissions show up here as people opt in.', icon: Users },
      { title: 'Filter by site', desc: 'Narrow the list to a specific storefront.', icon: Filter },
      { title: 'Export', desc: 'Download your leads as a CSV for your email tools.', icon: Download },
    ],
    tips: [
      'Offer a freebie in exchange for an email to boost signups.',
      'Export regularly to sync with your email provider.',
    ],
  },
  affiliates: {
    title: 'Affiliates',
    intro: 'Recruit partners to promote your products for a cut.',
    steps: [
      { title: 'Create an affiliate', desc: 'Add an affiliate and set their commission rate.', icon: Network },
      { title: 'Share their link', desc: 'Give them their unique referral link to promote.', icon: Share2 },
      { title: 'Track performance', desc: 'See clicks, conversions, and commission owed.', icon: BarChart2 },
      { title: 'Pause or edit', desc: 'Toggle affiliates active or adjust their rate anytime.', icon: Zap },
    ],
    tips: [
      'Higher commissions attract more motivated promoters.',
      'Recruit affiliates who already reach your target audience.',
    ],
  },
  referrals: {
    title: 'Referral program',
    intro: 'Reward customers for bringing in new buyers.',
    steps: [
      { title: 'Create a code', desc: 'Generate a referral code, or let one be created for you.', icon: Gift },
      { title: 'Set the reward', desc: 'Define what the referrer and the new buyer each get.', icon: Percent },
      { title: 'Share', desc: 'Buyers share their code to earn rewards.', icon: Share2 },
      { title: 'Track redemptions', desc: 'View per-code analytics and who redeemed.', icon: BarChart2 },
    ],
    tips: [
      'Two-sided rewards (both sides win) convert best.',
      'Promote referral codes right after a successful purchase.',
    ],
  },
  services: {
    title: 'Services & bookings',
    intro: 'Sell your time — 1:1 calls, audits, or retainers.',
    steps: [
      { title: 'Create a service', desc: 'Add a service with a title, type, and price.', icon: Calendar },
      { title: 'Publish it', desc: 'Activate the service so clients can book it.', icon: Zap },
      { title: 'Manage bookings', desc: 'Review incoming requests and update their status.', icon: ClipboardList },
      { title: 'Deliver & complete', desc: 'Mark bookings complete as you finish the work.', icon: CheckCircle },
    ],
    tips: [
      'Clear scope and duration reduce back-and-forth with clients.',
      'Retainers create predictable, recurring income.',
    ],
  },
  community: {
    title: 'Community',
    intro: 'Post updates and engage the audience around your brand.',
    steps: [
      { title: 'Create a post', desc: 'Share an update, tip, or announcement with your audience.', icon: MessageCircle },
      { title: 'Engage', desc: 'Buyers react to your posts — keep the conversation going.', icon: Heart },
      { title: 'Moderate', desc: 'Delete posts you no longer want shown.', icon: Trash2 },
    ],
    tips: [
      'Post consistently to keep your audience warm.',
      'Tease launches here before they go live.',
    ],
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/dashboard/guides/content.test.ts`
Expected: PASS (3 passing tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/guides/content.ts src/components/dashboard/guides/content.test.ts
git commit -m "feat(guides): guide content registry + validation test"
```

---

## Task 2: GuideProvider + useGuide hook

**Files:**
- Create: `src/components/dashboard/guides/GuideProvider.tsx`

- [ ] **Step 1: Write the provider**

Create `src/components/dashboard/guides/GuideProvider.tsx`:

```tsx
'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { GuideKey } from './content';

interface GuideContextValue {
  activeGuideKey: GuideKey | null;
  openGuide: (key: GuideKey) => void;
  closeGuide: () => void;
}

const GuideContext = createContext<GuideContextValue | null>(null);

export function GuideProvider({ children }: { children: ReactNode }) {
  const [activeGuideKey, setActiveGuideKey] = useState<GuideKey | null>(null);

  const openGuide = useCallback((key: GuideKey) => {
    setActiveGuideKey(key);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }, []);

  const closeGuide = useCallback(() => setActiveGuideKey(null), []);

  useEffect(() => {
    if (!activeGuideKey) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveGuideKey(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeGuideKey]);

  return (
    <GuideContext.Provider value={{ activeGuideKey, openGuide, closeGuide }}>
      {children}
    </GuideContext.Provider>
  );
}

export function useGuide(): GuideContextValue {
  const ctx = useContext(GuideContext);
  if (!ctx) throw new Error('useGuide must be used within GuideProvider');
  return ctx;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `GuideProvider.tsx` / `guides/`.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/guides/GuideProvider.tsx
git commit -m "feat(guides): GuideProvider context + useGuide hook"
```

---

## Task 3: GuideScreen

**Files:**
- Create: `src/components/dashboard/guides/GuideScreen.tsx`

- [ ] **Step 1: Write the screen**

Create `src/components/dashboard/guides/GuideScreen.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useGuide } from './GuideProvider';
import { GUIDES, type GuideKey } from './content';

export function GuideScreen({ guideKey }: { guideKey: GuideKey }) {
  const { closeGuide } = useGuide();
  const guide = GUIDES[guideKey];

  return (
    <div className="pt-4 pb-20 max-w-3xl">
      <button
        type="button"
        onClick={closeGuide}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand)] mb-1">Guide</p>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{guide.title}</h1>
      <p className="text-sm text-[var(--text-secondary)] mt-1 mb-6">{guide.intro}</p>

      <div className="relative space-y-3 before:content-[''] before:absolute before:left-3 before:top-4 before:bottom-4 before:w-px before:bg-[var(--border)]">
        {guide.steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="relative flex gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] px-5 py-4 hover:border-[var(--brand)]/30 hover:shadow-[var(--shadow-xs)] transition-all duration-200"
            >
              <div className="w-6 h-6 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 z-10">
                {Icon ? <Icon className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{s.title}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {guide.tips && guide.tips.length > 0 && (
        <div className="mt-6 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Pro Tips</p>
          {guide.tips.map((t, i) => (
            <div key={i} className="flex gap-2.5 text-xs text-[var(--text-secondary)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--brand)] shrink-0 mt-0.5" />
              {t}
            </div>
          ))}
        </div>
      )}

      {guide.links && guide.links.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-2">Where to next</p>
          <div className="flex flex-wrap gap-2">
            {guide.links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                onClick={closeGuide}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                {l.label} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `GuideScreen.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/guides/GuideScreen.tsx
git commit -m "feat(guides): GuideScreen full-screen renderer"
```

---

## Task 4: GuideOutlet + GuideButton

**Files:**
- Create: `src/components/dashboard/guides/GuideOutlet.tsx`
- Create: `src/components/dashboard/guides/GuideButton.tsx`

- [ ] **Step 1: Write GuideOutlet**

Create `src/components/dashboard/guides/GuideOutlet.tsx`:

```tsx
'use client';

import type { ReactNode } from 'react';
import { useGuide } from './GuideProvider';
import { GuideScreen } from './GuideScreen';

export function GuideOutlet({ children }: { children: ReactNode }) {
  const { activeGuideKey } = useGuide();
  return activeGuideKey ? <GuideScreen guideKey={activeGuideKey} /> : <>{children}</>;
}
```

- [ ] **Step 2: Write GuideButton**

Create `src/components/dashboard/guides/GuideButton.tsx`:

```tsx
'use client';

import { BookOpen } from 'lucide-react';
import { useGuide } from './GuideProvider';
import type { GuideKey } from './content';

export function GuideButton({ guideKey, className = '' }: { guideKey: GuideKey; className?: string }) {
  const { openGuide } = useGuide();
  return (
    <button
      type="button"
      onClick={() => openGuide(guideKey)}
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${className}`}
    >
      <BookOpen className="w-4 h-4" /> Guide
    </button>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `GuideOutlet.tsx` / `GuideButton.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/guides/GuideOutlet.tsx src/components/dashboard/guides/GuideButton.tsx
git commit -m "feat(guides): GuideOutlet swap + shared GuideButton"
```

---

## Task 5: Wire GuideProvider + GuideOutlet into the dashboard layout

**Files:**
- Modify: `app/dashboard/layout.tsx`

- [ ] **Step 1: Add imports**

In `app/dashboard/layout.tsx`, add after the existing `DashboardThemeProvider` import (line 7):

```tsx
import { GuideProvider } from '@/components/dashboard/guides/GuideProvider';
import { GuideOutlet } from '@/components/dashboard/guides/GuideOutlet';
```

- [ ] **Step 2: Wrap the non-editor shell and swap `children`**

Replace the non-editor `return (…)` block in `DashboardShell` (currently lines 21-32) with:

```tsx
  return (
    <GuideProvider>
      <div className="min-h-screen bg-[var(--editor-bg)]">
        <Sidebar />
        <div className="flex-1 flex flex-col md:pl-[256px] min-w-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
          <TopBar />
          <main className="flex-1 px-4 md:px-6 pb-20 overflow-x-hidden bg-[var(--editor-bg)]">
            <div className="w-full">
              <GuideOutlet>{children}</GuideOutlet>
            </div>
          </main>
        </div>
      </div>
    </GuideProvider>
  );
```

Leave the `isEditorPage` early-return branch (lines 13-19) unchanged — guides do not apply to full-screen site editors.

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: build succeeds (compiles the dashboard route group).

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/layout.tsx
git commit -m "feat(guides): mount GuideProvider + GuideOutlet in dashboard layout"
```

---

## Task 6: Add GuideButton to the three PageHeader pages

These three pages use the shared `PageHeader`, whose `action` prop is wrapped in a `flex items-center gap-2` container (`src/components/ui/PageHeader.tsx:29`). So wrap the existing action content in a fragment with `GuideButton` first — the gap handles spacing.

**Files:**
- Modify: `app/dashboard/products/page.tsx`, `app/dashboard/sites/page.tsx`, `app/dashboard/links/page.tsx`

- [ ] **Step 1: Products — import**

In `app/dashboard/products/page.tsx`, add to the imports:

```tsx
import { GuideButton } from '@/components/dashboard/guides/GuideButton';
```

- [ ] **Step 2: Products — add the button**

Find (around line 128):

```tsx
        action={headerActions}
```

Replace with:

```tsx
        action={<><GuideButton guideKey="products" />{headerActions}</>}
```

- [ ] **Step 3: Sites — import**

In `app/dashboard/sites/page.tsx`, add to the imports:

```tsx
import { GuideButton } from '@/components/dashboard/guides/GuideButton';
```

- [ ] **Step 4: Sites — add the button**

Find the action opening (around line 261-262):

```tsx
          action={
            <div className="flex items-center gap-2">
```

Replace with (insert `GuideButton` as the first child inside the existing flex `<div>`):

```tsx
          action={
            <div className="flex items-center gap-2">
              <GuideButton guideKey="sites" />
```

(Leave the rest of the div's children and its closing `</div>` untouched.)

- [ ] **Step 5: Short Links — import**

In `app/dashboard/links/page.tsx`, add to the imports:

```tsx
import { GuideButton } from '@/components/dashboard/guides/GuideButton';
```

- [ ] **Step 6: Short Links — add the button**

Find (around lines 50-57):

```tsx
        action={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <Plus className="w-4 h-4" /> Create link
          </button>
        }
```

Replace with:

```tsx
        action={
          <>
            <GuideButton guideKey="links" />
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <Plus className="w-4 h-4" /> Create link
            </button>
          </>
        }
```

- [ ] **Step 7: Type-check + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run lint`
Expected: no new errors in `products/page.tsx`, `sites/page.tsx`, `links/page.tsx`.

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/products/page.tsx app/dashboard/sites/page.tsx app/dashboard/links/page.tsx
git commit -m "feat(guides): add Guide button to Products, Sites, Short Links"
```

---

## Task 7: Add GuideButton to the seven Marketing pages

These pages use a bespoke header row: a flex container with a left `<div>` (holding the `<h1>`) and, on some pages, a right-side action button. Insert `GuideButton` on the **right** of the header row, grouped with any existing right-side button in a `flex items-center gap-2 shrink-0` wrapper.

For every page below: (a) add the import `import { GuideButton } from '@/components/dashboard/guides/GuideButton';`, then (b) apply the header edit. The `guideKey` per page is in the table. The **Coupons** edit is shown in full as the worked example; the others follow the identical pattern at the given `<h1>` anchor line.

| File | `guideKey` | `<h1>` anchor line | Right-side button present? |
|---|---|---|---|
| `app/dashboard/marketing/coupons/page.tsx` | `coupons` | 157 | Yes ("New Coupon") |
| `app/dashboard/marketing/leads/page.tsx` | `leads` | 98 | Check header (export/filter may be elsewhere) |
| `app/dashboard/marketing/affiliates/page.tsx` | `affiliates` | 100 | Check header |
| `app/dashboard/marketing/referrals/page.tsx` | `referrals` | 78 | Check header |
| `app/dashboard/marketing/services/page.tsx` | `services` | 111 | Check header |
| `app/dashboard/marketing/community/page.tsx` | `community` | 130 | Check header |
| `app/dashboard/marketing/page.tsx` (hub) | `marketing` | 91 | Right side has summary pills |

**Pattern — right-side button present (Coupons, worked example):**

- [ ] **Step 1: Coupons — import**

Add to imports in `app/dashboard/marketing/coupons/page.tsx`:

```tsx
import { GuideButton } from '@/components/dashboard/guides/GuideButton';
```

- [ ] **Step 2: Coupons — header edit**

Find (lines 155-164):

```tsx
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Coupons</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Create and manage discount codes for your products</p>
          </div>
          <button onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-4 py-2.5 rounded-[var(--radius-sm)] font-semibold text-sm shadow-[var(--shadow-xs)] transition shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            <Plus className="w-4 h-4" /> New Coupon
          </button>
        </div>
```

Replace with (wrap the button + GuideButton in a right-side group):

```tsx
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Coupons</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Create and manage discount codes for your products</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <GuideButton guideKey="coupons" />
            <button onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-4 py-2.5 rounded-[var(--radius-sm)] font-semibold text-sm shadow-[var(--shadow-xs)] transition shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
              <Plus className="w-4 h-4" /> New Coupon
            </button>
          </div>
        </div>
```

- [ ] **Step 3: Leads, Affiliates, Referrals, Services, Community — apply the pattern**

For each of `leads` (h1 line 98), `affiliates` (100), `referrals` (78), `services` (111), `community` (130):

1. Add the `GuideButton` import.
2. Read the header block containing the `<h1>` at the anchor line. It is a flex row: `<div className="flex … justify-between …"> <div>…<h1>…</h1>…</div> [maybe a right-side button/controls] </div>`.
3. **If the header already has a right-side element** (a button or controls sibling to the left `<div>`): wrap that element together with `<GuideButton guideKey="KEY" />` inside a new `<div className="flex items-center gap-2 shrink-0">`, with `GuideButton` first — exactly like the Coupons example.
4. **If the header has no right-side element** (only the left title `<div>`): add `<GuideButton guideKey="KEY" />` as a direct second child of the `justify-between` flex row (so it right-aligns opposite the title). Example:

```tsx
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Leads</h1>
            {/* …existing subtitle… */}
          </div>
          <GuideButton guideKey="leads" />
        </div>
```

Use the correct `guideKey` for each file per the table.

- [ ] **Step 4: Marketing hub — apply the pattern**

In `app/dashboard/marketing/page.tsx`, add the import, then find the summary-pills group (lines 96-97):

```tsx
          {/* Live summary pills */}
          <div className="flex flex-wrap gap-2 shrink-0">
```

Insert `GuideButton` as the first child of that group:

```tsx
          {/* Live summary pills */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <GuideButton guideKey="marketing" />
```

(Leave the pills `.map(...)` and the closing `</div>` unchanged.)

- [ ] **Step 5: Type-check + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run lint`
Expected: no new errors in the seven marketing page files.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/marketing
git commit -m "feat(guides): add Guide button to all Marketing pages"
```

---

## Task 8: Docs — guide reference, CLAUDE rule, dashboard-map note

**Files:**
- Create: `docs/reference/dashboard-guides.md`
- Modify: `CLAUDE.md`
- Modify: `docs/reference/dashboard-map.md`

- [ ] **Step 1: Create the guide reference doc**

Create `docs/reference/dashboard-guides.md`:

```markdown
# Dashboard Guides

In-page "how do I use this?" guides on workflow-heavy dashboard pages. A **Guide** button in the page header swaps the content region for a full-screen, step-by-step guide (numbered steps + Pro Tips), leaving the sidebar and top bar in place. Back (or Escape) returns to the page.

## How it works

- **`src/components/dashboard/guides/GuideProvider.tsx`** — context holding `activeGuideKey`; `useGuide()` exposes `openGuide(key)` / `closeGuide()`. Mounted in `app/dashboard/layout.tsx`.
- **`GuideButton.tsx`** — the shared header button (`<GuideButton guideKey="…" />`). Calls `openGuide`.
- **`GuideOutlet.tsx`** — inside the layout's `<main>`; renders `GuideScreen` when a guide is active, otherwise the page.
- **`GuideScreen.tsx`** — renders a guide from the registry (Back row, intro, numbered step cards with a connecting rail, Pro Tips, optional "Where to next" links).
- **`content.ts`** — the single source of guide copy: `GUIDE_KEYS` + `GUIDES: Record<GuideKey, Guide>`. `content.test.ts` validates every key has a well-formed guide.

## Adding or editing a guide

1. Add/extend the entry in `content.ts` (add the `GuideKey` to the union **and** `GUIDE_KEYS`, plus a `GUIDES` entry).
2. Drop `<GuideButton guideKey="yourKey" />` into that page's header.
3. `npx vitest run src/components/dashboard/guides/content.test.ts`.

## Pages with a guide

| Route | `guideKey` |
|---|---|
| `/dashboard/products` | `products` |
| `/dashboard/sites` | `sites` |
| `/dashboard/links` | `links` |
| `/dashboard/marketing` | `marketing` |
| `/dashboard/marketing/coupons` | `coupons` |
| `/dashboard/marketing/leads` | `leads` |
| `/dashboard/marketing/affiliates` | `affiliates` |
| `/dashboard/marketing/referrals` | `referrals` |
| `/dashboard/marketing/services` | `services` |
| `/dashboard/marketing/community` | `community` |

> AutoDM keeps its own in-tab guide (`src/components/dashboard/autodm/GuideView.tsx`) — not part of this system.

## Keeping guides accurate

When you change the workflow of a guided page (new steps, renamed actions, removed features), update that page's entry in `content.ts` in the same change-set.
```

- [ ] **Step 2: Add the sync rule + reference row to CLAUDE.md**

In `CLAUDE.md`, under the **Reference Files** table, add a row:

```markdown
| `docs/reference/dashboard-guides.md` | Adding/editing an in-dashboard Guide, or changing a guided page's workflow (Products, Sites, Short Links, Marketing/*) — keep `guides/content.ts` in sync |
```

And under **Absolute Rules → Code Quality**, add a bullet:

```markdown
- When you change the workflow of a guided dashboard page (see `docs/reference/dashboard-guides.md`), update that page's guide content in `src/components/dashboard/guides/content.ts` in the same change-set.
```

- [ ] **Step 3: Add a Guides note to dashboard-map.md**

In `docs/reference/dashboard-map.md`, bump the `> Last synced:` date to `2026-07-14` and add a section after the Pages table:

```markdown
## Guides

Ten workflow pages carry a header **Guide** button that swaps the content region for a full-screen guide. System + content: `docs/reference/dashboard-guides.md`; components in `src/components/dashboard/guides/`; copy in `guides/content.ts`.

Guided routes: `/dashboard/products`, `/dashboard/sites`, `/dashboard/links`, `/dashboard/marketing`, and `/dashboard/marketing/{coupons,leads,affiliates,referrals,services,community}`.
```

- [ ] **Step 4: Commit**

```bash
git add docs/reference/dashboard-guides.md CLAUDE.md docs/reference/dashboard-map.md
git commit -m "docs(guides): dashboard-guides reference, CLAUDE sync rule, map note"
```

---

## Task 9: Final verification

- [ ] **Step 1: Full test suite**

Run: `npx vitest run src/components/dashboard/guides/content.test.ts`
Expected: PASS.

- [ ] **Step 2: Lint + build**

Run: `npm run lint`
Expected: no new errors from `guides/` or the edited pages (pre-existing warnings in `Sidebar.tsx` are unrelated).
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual smoke (dev server)**

Run: `npm run dev`, open `http://localhost:3000/dashboard/products`.
Verify: a **Guide** button shows in the header → clicking it swaps the content to the Products guide with a working **← Back**; sidebar/top bar stay; Escape closes it. Spot-check one marketing page (e.g. Coupons) and toggle dark mode.

---

## Self-review notes

- **Spec coverage:** container=inline full-page swap (Tasks 3–5); 10 pages (Tasks 6–7); components + registry (Tasks 1–4); docs + documented-rule sync (Task 8). All spec sections map to a task.
- **Type consistency:** `GuideKey`, `GuideStep`, `Guide`, `GUIDE_KEYS`, `GUIDES` defined in Task 1 and used unchanged in Tasks 2–4; `useGuide()` returns `{ activeGuideKey, openGuide, closeGuide }` used consistently in Provider/Outlet/Screen/Button.
- **No placeholders:** all component code is complete; the marketing wiring gives a full worked example (Coupons) + an explicit two-case rule (right-side element present vs absent) with anchor lines — mechanical, not vague.
```
