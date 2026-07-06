---
noteId: "phase6b-statements-plan-20260706"
tags: []
---

# Phase 6b — Annual Earnings & Tax Statement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A per-creator, per-FY informational "Annual Earnings & Tax Statement" PDF (sales, commission + GST, net earnings, TDS/TCS withheld), reusing the Phase 6a `@react-pdf/renderer` engine and R2 signed-URL delivery — per the approved spec `docs/superpowers/specs/2026-07-06-phase6b-statements-design.md`.

**Architecture:** A pure `buildAnnualStatementModel` aggregates FY figures (earnings from `tax_transactions` net-of-refunds by sale date; TDS/TCS from `creator_payouts` by payout date) into a `StatementModel`; a new `StatementDoc` renders it; a creator-only route regenerates on demand, caches to private R2 (`kind='tax_doc'`), and returns a signed URL. No migration, no money-path changes.

**Tech Stack:** Next.js 16 route handlers (Node runtime), `@react-pdf/renderer` (installed), Supabase, Cloudflare R2 via `src/lib/storage`, TanStack Query v5, Vitest.

**Execution notes:**
- Work directly on `main` (user preference). Commit after every task with the message given.
- No DB migration and no type regen (reuses `storage_files`, reads `tax_transactions`/`creator_payouts`).
- Reuses Phase 6a modules and the storage helpers (`storage.putObject`/`createDownloadUrl`, `insertFile`/`findLiveByKey`, `resolveBucket`).

**File structure (created/modified):**

| File | Responsibility |
|---|---|
| `src/lib/server/invoices/statement.ts` (new) | `StatementModel` type, `buildAnnualStatementModel`, `fyBounds` (pure) |
| `src/lib/server/invoices/statement.test.ts` (new) | unit tests |
| `src/lib/server/invoices/statement-documents.tsx` (new) | `StatementDoc` react-pdf component |
| `src/lib/server/invoices/statement-render.tsx` (new) | `renderStatementPdf` |
| `src/lib/server/invoices/statement-render.test.ts` (new) | render smoke test |
| `app/api/statements/annual/[fy]/route.ts` (new) | creator-only statement route |
| `src/hooks/commerce/useStatements.ts` (new) | `useDownloadAnnualStatement` + `useStatementYears` |
| `app/dashboard/earnings/page.tsx` | "Annual statements" card |
| Docs: `.claude/rules/api-routes.md`, `.claude/rules/hooks-reference.md`, `docs/reference/dashboard-map.md`, blueprint `11(half)` §0 | same change-set |

---

### Task 1: Pure statement builder + fyBounds (TDD)

**Files:**
- Create: `src/lib/server/invoices/statement.ts`
- Test: `src/lib/server/invoices/statement.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/server/invoices/statement.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { buildAnnualStatementModel, fyBounds } from './statement';

describe('fyBounds', () => {
  it('maps an FY label to the April–March window', () => {
    expect(fyBounds('2026-27')).toEqual({ fyStart: '2026-04-01', fyEnd: '2027-04-01' });
  });
  it('rejects a malformed fy', () => {
    expect(() => fyBounds('2026')).toThrow(RangeError);
  });
});

describe('buildAnnualStatementModel', () => {
  it('summarizes earnings and taxes with net = gross - commission', () => {
    const m = buildAnnualStatementModel({
      fyLabel: '2026-27',
      creator: { legalName: 'Asha Verma', gstin: null },
      grossSales: 100000, commission: 10000, gstOnCommission: 1525,
      tdsWithheld: 100, tcsWithheld: 0,
    });
    expect(m.netEarnings).toBe(90000);
    expect(m.creatorName).toBe('Asha Verma');
    const byLabel = Object.fromEntries(m.rows.map((r) => [r.label, r.amount]));
    expect(byLabel['Gross sales']).toBe(100000);
    expect(byLabel['GST on commission (18%)']).toBe(-1525);
    expect(byLabel['Platform commission']).toBe(-8475); // 10000 - 1525
    expect(byLabel['TDS withheld (Sec 194-O)']).toBe(-100);
  });
  it('handles a zero year', () => {
    const m = buildAnnualStatementModel({
      fyLabel: '2025-26', creator: { legalName: 'X' },
      grossSales: 0, commission: 0, gstOnCommission: 0, tdsWithheld: 0, tcsWithheld: 0,
    });
    expect(m.netEarnings).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/lib/server/invoices/statement.test.ts` → FAIL (cannot resolve `./statement`).

- [ ] **Step 3: Write the implementation**

Create `src/lib/server/invoices/statement.ts`:
```typescript
// Pure annual earnings & tax statement model + FY window helper (isomorphic, testable).
// Reuses the Phase 6a PDF engine for rendering; this module is data-only.

export interface StatementRow {
  label: string;
  amount: number; // negative = a deduction from gross
}

export interface StatementModel {
  fyLabel: string;
  creatorName: string;
  creatorGstin?: string | null;
  rows: StatementRow[];
  netEarnings: number;
  note: string;
}

export interface FyBounds {
  fyStart: string; // 'YYYY-MM-DD' inclusive
  fyEnd: string;   // 'YYYY-MM-DD' exclusive
}

// Indian FY label '2026-27' → [2026-04-01, 2027-04-01).
export function fyBounds(fy: string): FyBounds {
  const m = /^(\d{4})-(\d{2})$/.exec(fy);
  if (!m) throw new RangeError('fy must look like 2026-27');
  const startYear = Number(m[1]);
  return { fyStart: `${startYear}-04-01`, fyEnd: `${startYear + 1}-04-01` };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface AnnualStatementInput {
  fyLabel: string;
  creator: { legalName: string; gstin?: string | null };
  grossSales: number;
  commission: number;        // GST-inclusive platform fee (commission_gross)
  gstOnCommission: number;
  tdsWithheld: number;
  tcsWithheld: number;
}

export function buildAnnualStatementModel(input: AnnualStatementInput): StatementModel {
  const gross = round2(input.grossSales);
  const commission = round2(input.commission);
  const gst = round2(input.gstOnCommission);
  const commissionNet = round2(commission - gst);
  const netEarnings = round2(gross - commission);
  const tds = round2(input.tdsWithheld);
  const tcs = round2(input.tcsWithheld);
  return {
    fyLabel: input.fyLabel,
    creatorName: input.creator.legalName,
    creatorGstin: input.creator.gstin ?? null,
    rows: [
      { label: 'Gross sales', amount: gross },
      { label: 'Platform commission', amount: -commissionNet },
      { label: 'GST on commission (18%)', amount: -gst },
      { label: 'Net earnings', amount: netEarnings },
      { label: 'TDS withheld (Sec 194-O)', amount: -tds },
      { label: 'TCS withheld (GST Sec 52)', amount: -tcs },
    ],
    netEarnings,
    note:
      'Informational statement. Earnings are shown on a sale-date basis; TDS/TCS on a payout-date basis. ' +
      'The statutory Form 16A (TDS certificate) is issued via the Income-Tax TRACES portal after 26Q filing.',
  };
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/lib/server/invoices/statement.test.ts` → all pass. `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/invoices/statement.ts src/lib/server/invoices/statement.test.ts
git commit -m "feat(statements): pure annual statement model + fyBounds (TDD)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: StatementDoc + renderStatementPdf + smoke test

**Files:**
- Create: `src/lib/server/invoices/statement-documents.tsx`
- Create: `src/lib/server/invoices/statement-render.tsx`
- Test: `src/lib/server/invoices/statement-render.test.ts`

- [ ] **Step 1: Write the document component**

Create `src/lib/server/invoices/statement-documents.tsx`:
```tsx
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { StatementModel } from './statement';

// Built-in Helvetica lacks the ₹ glyph — render money as "INR 1,234.00".
const inr = (n: number) => `INR ${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signed = (n: number) => (n < 0 ? `- ${inr(n)}` : inr(n));

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica', color: '#16130F' },
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  sub: { color: '#6b6b6b', marginTop: 2 },
  who: { marginTop: 16 },
  bold: { fontFamily: 'Helvetica-Bold' },
  muted: { color: '#6b6b6b' },
  table: { marginTop: 20, borderTopWidth: 1, borderColor: '#dddddd' },
  tr: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  note: { marginTop: 24, fontSize: 8, color: '#6b6b6b' },
});

export function StatementDoc({ model }: { model: StatementModel }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Annual Earnings & Tax Statement</Text>
        <Text style={s.sub}>Financial Year {model.fyLabel}</Text>
        <View style={s.who}>
          <Text style={s.bold}>{model.creatorName}</Text>
          {model.creatorGstin ? <Text style={s.muted}>GSTIN: {model.creatorGstin}</Text> : null}
        </View>
        <View style={s.table}>
          {model.rows.map((r, i) => {
            const strong = r.label === 'Net earnings';
            return (
              <View style={s.tr} key={i}>
                <Text style={strong ? s.bold : undefined}>{r.label}</Text>
                <Text style={strong ? s.bold : undefined}>{signed(r.amount)}</Text>
              </View>
            );
          })}
        </View>
        <Text style={s.note}>{model.note}</Text>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Write the render wrapper**

Create `src/lib/server/invoices/statement-render.tsx`:
```tsx
import { renderToBuffer } from '@react-pdf/renderer';
import { StatementDoc } from './statement-documents';
import type { StatementModel } from './statement';

export async function renderStatementPdf(model: StatementModel): Promise<Buffer> {
  return renderToBuffer(<StatementDoc model={model} />);
}
```

- [ ] **Step 3: Write the smoke test**

Create `src/lib/server/invoices/statement-render.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { renderStatementPdf } from './statement-render';
import { buildAnnualStatementModel } from './statement';

describe('renderStatementPdf', () => {
  it('produces a non-empty PDF buffer', async () => {
    const model = buildAnnualStatementModel({
      fyLabel: '2026-27', creator: { legalName: 'Asha Verma', gstin: null },
      grossSales: 100000, commission: 10000, gstOnCommission: 1525, tdsWithheld: 100, tcsWithheld: 50,
    });
    const buf = await renderStatementPdf(model);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  }, 20000);
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/server/invoices/statement-render.test.ts` → passes. `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/invoices/statement-documents.tsx src/lib/server/invoices/statement-render.tsx src/lib/server/invoices/statement-render.test.ts
git commit -m "feat(statements): react-pdf StatementDoc + renderStatementPdf (smoke-tested)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Route — GET /api/statements/annual/[fy]

**Files:**
- Create: `app/api/statements/annual/[fy]/route.ts`

- [ ] **Step 1: Write the route**

Create `app/api/statements/annual/[fy]/route.ts`:
```typescript
export const runtime = 'nodejs'; // @react-pdf needs Node, not edge

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { storage, resolveBucket } from '@/lib/storage';
import { insertFile, findLiveByKey } from '@/lib/storage/files';
import { buildAnnualStatementModel, fyBounds } from '@/lib/server/invoices/statement';
import { renderStatementPdf } from '@/lib/server/invoices/statement-render';

export async function GET(_req: Request, { params }: { params: Promise<{ fy: string }> }) {
  try {
    const { fy } = await params;
    if (!/^\d{4}-\d{2}$/.test(fy)) {
      return NextResponse.json({ error: 'Invalid financial year (expected YYYY-YY).' }, { status: 400 });
    }
    let bounds;
    try { bounds = fyBounds(fy); } catch { return NextResponse.json({ error: 'Invalid financial year.' }, { status: 400 }); }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });

    const db = createServiceClient();

    // Earnings: tax_transactions in the FY (by sale date), net of refunds.
    const { data: taxRows } = await db
      .from('tax_transactions')
      .select('gross_amount, commission_gross, gst_on_commission, status')
      .eq('creator_id', profileId)
      .gte('created_at', bounds.fyStart)
      .lt('created_at', bounds.fyEnd);

    let gross = 0, commission = 0, gst = 0, hasData = false;
    for (const r of taxRows ?? []) {
      const sign = r.status === 'reversed' ? -1 : 1;
      gross += sign * Number(r.gross_amount);
      commission += sign * Number(r.commission_gross);
      gst += sign * Number(r.gst_on_commission);
      hasData = true;
    }

    // TDS/TCS: creator_payouts settled (success) in the FY (by payout date).
    const { data: payoutRows } = await db
      .from('creator_payouts')
      .select('tds_withheld, tcs_withheld, status, processed_at, created_at')
      .eq('creator_id', profileId)
      .eq('status', 'success');
    let tds = 0, tcs = 0;
    for (const p of payoutRows ?? []) {
      const when = String(p.processed_at ?? p.created_at).slice(0, 10);
      if (when >= bounds.fyStart && when < bounds.fyEnd) {
        tds += Number(p.tds_withheld ?? 0);
        tcs += Number(p.tcs_withheld ?? 0);
        hasData = true;
      }
    }

    if (!hasData) return NextResponse.json({ error: 'No activity for this financial year.' }, { status: 404 });

    const { data: kyc } = await db
      .from('creator_kyc')
      .select('legal_name, gstin')
      .eq('creator_id', profileId)
      .maybeSingle();

    const model = buildAnnualStatementModel({
      fyLabel: fy,
      creator: { legalName: kyc?.legal_name ?? 'Creator', gstin: kyc?.gstin ?? null },
      grossSales: gross, commission, gstOnCommission: gst, tdsWithheld: tds, tcsWithheld: tcs,
    });
    const pdf = await renderStatementPdf(model);

    // Always-fresh: overwrite the deterministic key each request (FY keeps accruing).
    const cfg = resolveBucket('creator-content');
    const objectKey = `${profileId}/statements/annual-${fy}.pdf`;
    await storage.putObject({ bucket: cfg.name, objectKey, body: pdf, contentType: 'application/pdf' });
    const existing = await findLiveByKey(db, cfg.name, objectKey);
    if (!existing) {
      await insertFile(db, {
        owner_id: profileId, bucket: cfg.name, object_key: objectKey, file_name: `annual-statement-${fy}.pdf`,
        mime_type: 'application/pdf', size: pdf.length, visibility: 'private', kind: 'tax_doc', product_id: null,
      });
    }
    const signedUrl = await storage.createDownloadUrl({ bucket: cfg.name, objectKey, ttlSeconds: 600 });
    return NextResponse.json({ signedUrl, ttlSeconds: 600 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[statements/annual]', e);
    return NextResponse.json({ error: 'Could not generate statement.' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Compile + lint**

Run: `npx tsc --noEmit` → exit 0. Run: `npx eslint "app/api/statements/annual/[fy]/route.ts"` → clean.
- If tsc complains that a selected column (e.g. `processed_at`) doesn't exist on `creator_payouts`, report NEEDS_CONTEXT with the exact error rather than guessing (it should exist — Phase 5 added `tds_withheld`/`tcs_withheld`/`net_amount`; `processed_at` predates Phase 5).

- [ ] **Step 3: Commit**

```bash
git add "app/api/statements/annual/[fy]/route.ts"
git commit -m "feat(statements): GET /api/statements/annual/[fy] (creator-only, signed URL)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Hooks — useStatements

**Files:**
- Create: `src/hooks/commerce/useStatements.ts`

- [ ] **Step 1: Write the hooks**

Create `src/hooks/commerce/useStatements.ts`:
```typescript
'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

async function openStatement(url: string) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Could not generate statement.');
  const { signedUrl } = data as { signedUrl: string };
  window.open(signedUrl, '_blank', 'noopener');
  return signedUrl;
}

export function useDownloadAnnualStatement() {
  return useMutation({ mutationFn: (fy: string) => openStatement(`/api/statements/annual/${fy}`) });
}

function fyOfDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return m >= 4 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`;
}

// Financial years that have any posted sale activity, newest first.
export function useStatementYears() {
  return useQuery({
    queryKey: ['statements', 'years'],
    queryFn: async (): Promise<string[]> => {
      const profileId = await getCreatorProfileId();
      const { data, error } = await supabase
        .from('tax_transactions')
        .select('created_at, status')
        .eq('creator_id', profileId);
      if (error) throw error;
      const years = new Set<string>();
      for (const r of data ?? []) {
        if (r.status === 'reversed') continue;
        years.add(fyOfDate(String(r.created_at)));
      }
      return [...years].sort((a, b) => b.localeCompare(a));
    },
  });
}
```

- [ ] **Step 2: Compile + commit**

Run: `npx tsc --noEmit` → exit 0.
```bash
git add src/hooks/commerce/useStatements.ts
git commit -m "feat(hooks): useDownloadAnnualStatement + useStatementYears" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Earnings UI — "Annual statements" card

**Files:**
- Modify: `app/dashboard/earnings/page.tsx`

READ the file first. Phase 6a added a "Tax invoices" card (using `useCommissionMonths`) after the Phase 5 "Tax withheld" card, and imports `Card`, `formatINR`, and lucide `FileText`/`Download`. The new card goes right after the "Tax invoices" card.

- [ ] **Step 1: Wire imports + hooks**

Add `import { useStatementYears, useDownloadAnnualStatement } from '@/hooks/commerce/useStatements';`. (`FileText` and `Download` are already imported from Phase 6a.) Near the other hooks in the component add:
```typescript
  const { data: statementYears } = useStatementYears();
  const downloadStatement = useDownloadAnnualStatement();
```

- [ ] **Step 2: Add the card**

Immediately AFTER the "Tax invoices" `<Card>` (the one gated by `commissionMonths`), insert:
```typescript
      {!isLoading && (statementYears?.length ?? 0) > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={14} className="text-[var(--text-tertiary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Annual statements</h3>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mb-3">Your earnings &amp; tax summary per financial year (informational; the statutory Form 16A comes from TRACES).</p>
          <div className="divide-y divide-[var(--border-subtle)]">
            {statementYears!.map((fy) => (
              <div key={fy} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-[var(--text-primary)]">FY {fy}</span>
                <button
                  onClick={() => downloadStatement.mutate(fy)}
                  disabled={downloadStatement.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] rounded-[var(--radius-sm)] transition disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <Download size={13} />
                  Statement
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → exit 0. Run: `npx eslint app/dashboard/earnings/page.tsx` → no new errors. Run the color grep (zero hits):
```bash
grep -nE "bg-(white|gray|zinc|emerald|red|amber|yellow|blue|indigo|purple|pink|violet|sky|rose|fuchsia)|text-(gray|zinc|emerald|red|amber|yellow|blue|indigo|purple|pink|violet|sky|rose|fuchsia)" app/dashboard/earnings/page.tsx
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/earnings/page.tsx
git commit -m "feat(earnings): Annual statements card — download per-FY earnings & tax statement" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Docs sweep

**Files:**
- Modify: `.claude/rules/api-routes.md`, `.claude/rules/hooks-reference.md`, `docs/reference/dashboard-map.md`

- [ ] **Step 1: `api-routes.md`** — add to the "At a glance" table:
```markdown
| GET | `/api/statements/annual/[fy]` | cookie session | server + service role | reads `tax_transactions` + `creator_payouts`; renders an informational PDF; caches to R2 `storage_files` (`kind='tax_doc'`) |
```
And add a short note in the Invoices/Storage area:
```markdown
### `GET /api/statements/annual/[fy]` (auth required, creator-only)

Informational **Annual Earnings & Tax Statement** PDF (`@react-pdf/renderer`, Node runtime). Aggregates the creator's FY sales/commission/GST from `tax_transactions` (net of refunds, sale-date) and TDS/TCS withheld from `creator_payouts` (successful payouts, payout-date), renders a PDF, caches it (always regenerated) to private R2 (`kind='tax_doc'`), and returns `{ signedUrl, ttlSeconds }`. Not the statutory Form 16A (which comes from TRACES). Errors: `400` (bad fy), `401`, `404` (no profile / no activity), `500`.
```

- [ ] **Step 2: `hooks-reference.md`** — append `useStatements` (`useDownloadAnnualStatement`, `useStatementYears`) to the `commerce/` folder row. Add query-key row: `| `useStatementYears()` | `['statements','years']` |`.

- [ ] **Step 3: `docs/reference/dashboard-map.md`** — update the `/dashboard/earnings` entry to note the "Annual statements" card (per-FY download; hooks `useStatementYears`/`useDownloadAnnualStatement`; route `GET /api/statements/annual/[fy]`).

- [ ] **Step 4: Commit**

```bash
git add .claude/rules/api-routes.md .claude/rules/hooks-reference.md docs/reference/dashboard-map.md
git commit -m "docs(phase6b): annual statement route + hooks + dashboard-map" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Final verification + blueprint state

**Files:**
- Modify: `.claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md`

- [ ] **Step 1: Full local gauntlet**
- `npx tsc --noEmit` → exit 0
- `npx eslint src/lib/server/invoices/statement.ts src/lib/server/invoices/statement-documents.tsx src/lib/server/invoices/statement-render.tsx src/hooks/commerce/useStatements.ts "app/api/statements/annual/[fy]/route.ts" app/dashboard/earnings/page.tsx` → clean
- `npm test` → all pass (adds `statement` + `statement-render` suites)

- [ ] **Step 2: Update the blueprint §0**

In `.claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md`: set Phase **6b**'s row to **BUILT** with spec/plan links (`docs/superpowers/specs/2026-07-06-phase6b-statements-design.md` · `docs/superpowers/plans/2026-07-06-phase6b-statements.md`); note it's an informational annual statement (real Form 16A → TRACES, deferred); change "Next planned phase" to **Phase 6c — GSTR-8/26Q/GSTR-1 government exports**; update the header status/date line to include 6b.

- [ ] **Step 3: Commit**

```bash
git add ".claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md"
git commit -m "docs(blueprint): phase6b annual statement BUILT; next 6c (GSTR exports)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Out of scope (spec non-goals — do NOT build)

Quarterly TDS statements · the real TRACES Form 16A integration · GSTR-8/26Q/GSTR-1 exports (6c) · email delivery · past-FY statement caching/immutability (always regenerated).

## References
- Spec: `docs/superpowers/specs/2026-07-06-phase6b-statements-design.md`
- Phase 6a (PDF engine + storage pattern reused): `src/lib/server/invoices/`, `src/lib/storage`
- Phase 5 (tax data): `tax_transactions`, `creator_payouts.tds_withheld`/`tcs_withheld`
