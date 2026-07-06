---
noteId: "phase6c-tax-exports-plan-20260706"
tags: []
---

# Phase 6c — Government Return Data Exports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A terminal admin tool that exports accountant-ready CSVs for DigiOne's three ECO tax returns — GSTR-8 (TCS), 26Q (TDS), GSTR-1 (output GST on commission) — per period, per the approved spec `docs/superpowers/specs/2026-07-06-phase6c-tax-exports-design.md`.

**Architecture:** A pure, unit-tested core (`src/lib/server/tax-export.ts`) does all aggregation + CSV formatting from typed input rows; a thin terminal script (`scripts/tax-export.ts`) fetches from the DB via the service client, decrypts PANs only for 26Q, and writes CSVs to a gitignored `./tax-exports/`. No tables, migration, routes, or UI.

**Tech Stack:** TypeScript, `tsx` (run scripts), Supabase service client, Vitest.

**Execution notes:**
- Work directly on `main` (user preference). Commit after every task with the message given.
- No DB migration, no type regen (reads `tax_transactions`, `creator_payouts`, `creator_kyc`).
- Mirrors the existing admin scripts (`scripts/subscription-admin.ts`, `refund-admin.ts`): pure lib + thin CLI, run via `npx tsx --env-file=.env.local scripts/tax-export.ts …`.

**File structure:**

| File | Responsibility |
|---|---|
| `src/lib/server/tax-export.ts` (new) | Pure builders `buildGstr8Rows`/`build26qRows`/`buildGstr1Rows` + `toCsv` |
| `src/lib/server/tax-export.test.ts` (new) | Unit tests |
| `scripts/tax-export.ts` (new) | Terminal CLI: fetch → decrypt PANs (26q) → build → write CSV |
| `.gitignore` | add `tax-exports/` |
| Docs: `docs/db/money-path.md`, blueprint `11(half)` §0 | same change-set |

---

### Task 1: Pure export builders + toCsv (TDD)

**Files:**
- Create: `src/lib/server/tax-export.ts`
- Test: `src/lib/server/tax-export.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/server/tax-export.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { buildGstr8Rows, build26qRows, buildGstr1Rows, toCsv } from './tax-export';

describe('toCsv', () => {
  it('escapes commas, quotes, and newlines (RFC 4180)', () => {
    const csv = toCsv(['a', 'b'], [['x,y', 'he said "hi"'], ['plain', 'li\nne']]);
    expect(csv).toBe('a,b\n"x,y","he said ""hi"""\nplain,"li\nne"\n');
  });
});

describe('buildGstr8Rows', () => {
  it('groups registered creators, nets refunds, ignores unregistered', () => {
    const out = buildGstr8Rows([
      { creator_id: 'c1', gstin: '27AAAAA0000A1Z5', gross_amount: 1000, tcs_amount: 5, status: 'posted' },
      { creator_id: 'c1', gstin: '27AAAAA0000A1Z5', gross_amount: 400, tcs_amount: 2, status: 'reversed' },
      { creator_id: 'c2', gstin: null, gross_amount: 500, tcs_amount: 0, status: 'posted' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ creator_id: 'c1', gross_supplies: 1000, returned_supplies: 400, net_supplies: 600, tcs_amount: 3 });
  });
});

describe('build26qRows', () => {
  it('sums TDS per deductee, attaches PAN, keeps only tds > 0', () => {
    const ids = new Map([['c1', { pan: 'AAAAA0000A', name: 'Asha' }]]);
    const out = build26qRows(
      [{ creator_id: 'c1', tds_withheld: 1 }, { creator_id: 'c1', tds_withheld: 2 }, { creator_id: 'c2', tds_withheld: 0 }],
      [{ creator_id: 'c1', gross_amount: 3000, status: 'posted' }, { creator_id: 'c1', gross_amount: 500, status: 'reversed' }],
      ids,
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ creator_id: 'c1', pan: 'AAAAA0000A', deductee_name: 'Asha', amount_credited: 2500, tds_deducted: 3, section: '194O' });
  });
});

describe('buildGstr1Rows', () => {
  it('splits B2B (registered) from an aggregated B2C row, net of refunds', () => {
    const out = buildGstr1Rows([
      { creator_id: 'c1', gstin: '27AAAAA0000A1Z5', commission_net: 84.75, gst_on_commission: 15.25, status: 'posted' },
      { creator_id: 'c2', gstin: null, commission_net: 84.75, gst_on_commission: 15.25, status: 'posted' },
      { creator_id: 'c3', gstin: null, commission_net: 84.75, gst_on_commission: 15.25, status: 'posted' },
    ]);
    const b2b = out.find((r) => r.supply_type === 'B2B');
    const b2c = out.find((r) => r.supply_type === 'B2C');
    expect(b2b).toMatchObject({ recipient_gstin: '27AAAAA0000A1Z5', taxable_value: 84.75, gst_amount: 15.25 });
    expect(b2c).toMatchObject({ recipient_gstin: '', taxable_value: 169.5, gst_amount: 30.5 });
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/lib/server/tax-export.test.ts` → FAIL (cannot resolve `./tax-export`).

- [ ] **Step 3: Write the implementation**

Create `src/lib/server/tax-export.ts`:
```typescript
// Pure aggregation + CSV for DigiOne's ECO tax returns (GSTR-8 / 26Q / GSTR-1).
// No DB — the terminal script (scripts/tax-export.ts) fetches rows and calls these.

const round2 = (n: number) => Math.round(n * 100) / 100;

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n') + '\n';
}

// ── GSTR-8 (TCS) ────────────────────────────────────────────────────────────
export interface Gstr8SaleRow {
  creator_id: string; gstin: string | null; gross_amount: number; tcs_amount: number; status: string;
}
export interface Gstr8OutRow {
  creator_id: string; gstin: string; gross_supplies: number; returned_supplies: number; net_supplies: number; tcs_amount: number;
}
export function buildGstr8Rows(rows: Gstr8SaleRow[]): Gstr8OutRow[] {
  const byCreator = new Map<string, Gstr8OutRow>();
  for (const r of rows) {
    if (!r.gstin) continue; // registered creators only
    const o = byCreator.get(r.creator_id) ?? {
      creator_id: r.creator_id, gstin: r.gstin, gross_supplies: 0, returned_supplies: 0, net_supplies: 0, tcs_amount: 0,
    };
    if (r.status === 'reversed') {
      o.returned_supplies += Number(r.gross_amount);
      o.tcs_amount -= Number(r.tcs_amount);
    } else {
      o.gross_supplies += Number(r.gross_amount);
      o.tcs_amount += Number(r.tcs_amount);
    }
    byCreator.set(r.creator_id, o);
  }
  const out = [...byCreator.values()].map((o) => ({
    ...o,
    gross_supplies: round2(o.gross_supplies),
    returned_supplies: round2(o.returned_supplies),
    net_supplies: round2(o.gross_supplies - o.returned_supplies),
    tcs_amount: round2(o.tcs_amount),
  }));
  return out.filter((o) => o.net_supplies !== 0 || o.tcs_amount !== 0);
}

// ── 26Q (TDS) ───────────────────────────────────────────────────────────────
export interface Q26PayoutRow { creator_id: string; tds_withheld: number; }
export interface Q26SaleRow { creator_id: string; gross_amount: number; status: string; }
export interface Q26Identity { pan: string; name: string; }
export interface Q26OutRow {
  creator_id: string; pan: string; deductee_name: string; amount_credited: number; tds_deducted: number; section: string;
}
export function build26qRows(
  payouts: Q26PayoutRow[], sales: Q26SaleRow[], identities: Map<string, Q26Identity>,
): Q26OutRow[] {
  const tds = new Map<string, number>();
  for (const p of payouts) tds.set(p.creator_id, (tds.get(p.creator_id) ?? 0) + Number(p.tds_withheld));
  const credited = new Map<string, number>();
  for (const s of sales) {
    const sign = s.status === 'reversed' ? -1 : 1;
    credited.set(s.creator_id, (credited.get(s.creator_id) ?? 0) + sign * Number(s.gross_amount));
  }
  const out: Q26OutRow[] = [];
  for (const [creator_id, tdsAmt] of tds) {
    const t = round2(tdsAmt);
    if (t <= 0) continue;
    const id = identities.get(creator_id);
    out.push({
      creator_id, pan: id?.pan ?? '', deductee_name: id?.name ?? '',
      amount_credited: round2(credited.get(creator_id) ?? 0), tds_deducted: t, section: '194O',
    });
  }
  return out;
}

// ── GSTR-1 (DigiOne output GST on commission) ───────────────────────────────
export interface Gstr1SaleRow {
  creator_id: string; gstin: string | null; commission_net: number; gst_on_commission: number; status: string;
}
export interface Gstr1OutRow {
  supply_type: 'B2B' | 'B2C'; recipient_gstin: string; taxable_value: number; gst_amount: number;
}
export function buildGstr1Rows(rows: Gstr1SaleRow[]): Gstr1OutRow[] {
  const b2b = new Map<string, Gstr1OutRow>();
  let b2cTaxable = 0, b2cGst = 0;
  for (const r of rows) {
    const sign = r.status === 'reversed' ? -1 : 1;
    const tv = sign * Number(r.commission_net);
    const gst = sign * Number(r.gst_on_commission);
    if (r.gstin) {
      const o = b2b.get(r.gstin) ?? { supply_type: 'B2B' as const, recipient_gstin: r.gstin, taxable_value: 0, gst_amount: 0 };
      o.taxable_value += tv;
      o.gst_amount += gst;
      b2b.set(r.gstin, o);
    } else {
      b2cTaxable += tv;
      b2cGst += gst;
    }
  }
  const out: Gstr1OutRow[] = [...b2b.values()].map((o) => ({
    ...o, taxable_value: round2(o.taxable_value), gst_amount: round2(o.gst_amount),
  }));
  if (round2(b2cTaxable) !== 0 || round2(b2cGst) !== 0) {
    out.push({ supply_type: 'B2C', recipient_gstin: '', taxable_value: round2(b2cTaxable), gst_amount: round2(b2cGst) });
  }
  return out;
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/lib/server/tax-export.test.ts` → all pass. Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/tax-export.ts src/lib/server/tax-export.test.ts
git commit -m "feat(tax-export): pure GSTR-8/26Q/GSTR-1 builders + toCsv (TDD)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Terminal script + .gitignore

**Files:**
- Create: `scripts/tax-export.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Add `tax-exports/` to `.gitignore`**

Append a line to `.gitignore`:
```
tax-exports/
```

- [ ] **Step 2: Write the script**

Create `scripts/tax-export.ts`:
```typescript
// Terminal admin: accountant-ready CSV exports of DigiOne's ECO tax returns. Service-role.
//   npx tsx --env-file=.env.local scripts/tax-export.ts gstr8 <YYYY-MM>
//   npx tsx --env-file=.env.local scripts/tax-export.ts 26q   <YYYY-YY> <Q1|Q2|Q3|Q4>
//   npx tsx --env-file=.env.local scripts/tax-export.ts gstr1 <YYYY-MM>
// Writes to ./tax-exports/ (gitignored). The 26q file contains decrypted PANs — handle securely.
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createServiceClient } from '../lib/supabase/service';
import { decryptField } from '../src/lib/server/kyc-crypto';
import {
  buildGstr8Rows, build26qRows, buildGstr1Rows, toCsv, type Q26Identity,
} from '../src/lib/server/tax-export';

function monthBounds(month: string): { start: string; end: string } {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!m) throw new Error('month must be YYYY-MM');
  const y = Number(m[1]), mo = Number(m[2]);
  return {
    start: new Date(Date.UTC(y, mo - 1, 1)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 10),
  };
}
function quarterBounds(fy: string, q: string): { start: string; end: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(fy);
  if (!m) throw new Error('fy must be YYYY-YY (e.g. 2026-27)');
  const y = Number(m[1]);
  // month offsets from Jan of the FY-start year; Q4 spans into the next calendar year.
  const map: Record<string, [number, number]> = { Q1: [3, 6], Q2: [6, 9], Q3: [9, 12], Q4: [12, 15] };
  const qq = map[q.toUpperCase()];
  if (!qq) throw new Error('quarter must be Q1|Q2|Q3|Q4');
  return {
    start: new Date(Date.UTC(y, qq[0], 1)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(y, qq[1], 1)).toISOString().slice(0, 10),
  };
}
function outDir(): string {
  const d = join(process.cwd(), 'tax-exports');
  mkdirSync(d, { recursive: true });
  return d;
}
function write(name: string, csv: string): string {
  const p = join(outDir(), name);
  writeFileSync(p, csv, 'utf8');
  return p;
}

async function main() {
  const [cmd, a, b] = process.argv.slice(2);
  const db = createServiceClient();

  if (cmd === 'gstr8') {
    if (!a) throw new Error('usage: tax-export gstr8 <YYYY-MM>');
    const { start, end } = monthBounds(a);
    const { data } = await db.from('tax_transactions')
      .select('creator_id, gstin, gross_amount, tcs_amount, status')
      .gte('created_at', start).lt('created_at', end);
    const rows = buildGstr8Rows((data ?? []).map((r) => ({
      creator_id: r.creator_id, gstin: r.gstin, gross_amount: Number(r.gross_amount), tcs_amount: Number(r.tcs_amount), status: r.status,
    })));
    const csv = toCsv(
      ['creator_id', 'gstin', 'gross_supplies', 'returned_supplies', 'net_supplies', 'tcs_amount', 'month'],
      rows.map((r) => [r.creator_id, r.gstin, r.gross_supplies, r.returned_supplies, r.net_supplies, r.tcs_amount, a]),
    );
    const p = write(`gstr8-${a}.csv`, csv);
    console.log(`GSTR-8 ${a}: ${rows.length} registered creators, TCS total INR ${rows.reduce((s, r) => s + r.tcs_amount, 0).toFixed(2)} -> ${p}`);
  } else if (cmd === '26q') {
    if (!a || !b) throw new Error('usage: tax-export 26q <YYYY-YY> <Q1|Q2|Q3|Q4>');
    const { start, end } = quarterBounds(a, b);
    const { data: payouts } = await db.from('creator_payouts')
      .select('creator_id, tds_withheld, status, processed_at, created_at')
      .eq('status', 'success');
    const inQuarter = (payouts ?? []).filter((p) => {
      const w = String(p.processed_at ?? p.created_at).slice(0, 10);
      return w >= start && w < end;
    });
    const { data: sales } = await db.from('tax_transactions')
      .select('creator_id, gross_amount, status')
      .gte('created_at', start).lt('created_at', end);
    const creatorIds = [...new Set(inQuarter.map((p) => p.creator_id))];
    const identities = new Map<string, Q26Identity>();
    if (creatorIds.length) {
      const { data: kycs } = await db.from('creator_kyc').select('creator_id, legal_name, pan_enc').in('creator_id', creatorIds);
      for (const k of kycs ?? []) {
        let pan = '';
        try { pan = k.pan_enc ? decryptField(k.pan_enc) : ''; } catch { pan = ''; }
        identities.set(k.creator_id, { pan, name: k.legal_name ?? '' });
      }
    }
    const rows = build26qRows(
      inQuarter.map((p) => ({ creator_id: p.creator_id, tds_withheld: Number(p.tds_withheld ?? 0) })),
      (sales ?? []).map((s) => ({ creator_id: s.creator_id, gross_amount: Number(s.gross_amount), status: s.status })),
      identities,
    );
    const csv = toCsv(
      ['creator_id', 'pan', 'deductee_name', 'amount_credited', 'tds_deducted', 'section', 'quarter'],
      rows.map((r) => [r.creator_id, r.pan, r.deductee_name, r.amount_credited, r.tds_deducted, r.section, `${a} ${b.toUpperCase()}`]),
    );
    const p = write(`26q-${a}-${b.toUpperCase()}.csv`, csv);
    console.log(`26Q ${a} ${b.toUpperCase()}: ${rows.length} deductees, TDS total INR ${rows.reduce((s, r) => s + r.tds_deducted, 0).toFixed(2)} -> ${p} (contains PANs — handle securely)`);
  } else if (cmd === 'gstr1') {
    if (!a) throw new Error('usage: tax-export gstr1 <YYYY-MM>');
    const { start, end } = monthBounds(a);
    const { data } = await db.from('tax_transactions')
      .select('creator_id, gstin, commission_net, gst_on_commission, status')
      .gte('created_at', start).lt('created_at', end);
    const rows = buildGstr1Rows((data ?? []).map((r) => ({
      creator_id: r.creator_id, gstin: r.gstin, commission_net: Number(r.commission_net), gst_on_commission: Number(r.gst_on_commission), status: r.status,
    })));
    const csv = toCsv(
      ['supply_type', 'recipient_gstin', 'taxable_value', 'gst_amount', 'month'],
      rows.map((r) => [r.supply_type, r.recipient_gstin, r.taxable_value, r.gst_amount, a]),
    );
    const p = write(`gstr1-${a}.csv`, csv);
    console.log(`GSTR-1 ${a}: ${rows.length} lines, output GST total INR ${rows.reduce((s, r) => s + r.gst_amount, 0).toFixed(2)} -> ${p}`);
  } else {
    throw new Error('usage: tax-export <gstr8 YYYY-MM | 26q YYYY-YY Q1..Q4 | gstr1 YYYY-MM>');
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('tax-export FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
```

- [ ] **Step 3: Compile**

Run: `npx tsc --noEmit` → exit 0. (If tsc flags a selected column not on the generated type — e.g. `pan_enc`, `legal_name`, `commission_net`, `gstin`, `tcs_amount` — report NEEDS_CONTEXT with the exact error; all exist as of Phase 0/5.)

- [ ] **Step 4: Commit**

```bash
git add scripts/tax-export.ts .gitignore
git commit -m "feat(tax-export): terminal GSTR-8/26Q/GSTR-1 CSV export script (gitignored output)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Docs + blueprint + final verification

**Files:**
- Modify: `docs/db/money-path.md`, `.claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md`

- [ ] **Step 1: Full local gauntlet**
- `npx tsc --noEmit` → exit 0
- `npx eslint src/lib/server/tax-export.ts scripts/tax-export.ts` → clean
- `npm test` → all pass (adds the `tax-export` suite)

- [ ] **Step 2: `docs/db/money-path.md`** — in the tax section (§9), append a short note:
```markdown
**Government return data (Phase 6c):** DigiOne's own ECO filings are exported as accountant-ready CSVs via the terminal script `scripts/tax-export.ts` — `gstr8 <YYYY-MM>` (TCS, registered creators, from `tax_transactions`), `26q <YYYY-YY> <Q>` (TDS, from `creator_payouts.tds_withheld`, with decrypted deductee PANs — **sensitive, gitignored output**), `gstr1 <YYYY-MM>` (DigiOne output GST on commission, B2B/B2C). CSVs land in `./tax-exports/`. Not portal-ready JSON / not e-filing — a CA files from these.
```

- [ ] **Step 3: Update the blueprint §0**

In `.claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md`: set Phase **6c**'s row to **BUILT** with spec/plan links (`docs/superpowers/specs/2026-07-06-phase6c-tax-exports-design.md` · `docs/superpowers/plans/2026-07-06-phase6c-tax-exports.md`); note it's accountant-ready CSV via `scripts/tax-export.ts` (portal JSON/FVU + e-filing deferred; 26Q CSV holds decrypted PANs). Since 6c completes Phase 6, change "Next planned phase" to note **Phase 6 complete — remaining money-surface work is the deferred items in the Plan-state deferral notes** (or "none — overhaul feature-complete pending the deferred go-live items"). Update the header status/date line to include 6c.

- [ ] **Step 4: Commit**

```bash
git add docs/db/money-path.md ".claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md"
git commit -m "docs(phase6c): tax-export script noted in money-path; blueprint 6c BUILT (phase 6 complete)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Out of scope (spec non-goals — do NOT build)

Portal-ready JSON/FVU formats · actual e-filing / API submission · GSTR-3B / annual returns · an admin UI (→ admin app) · scheduled/automated exports · multi-GSTIN (DigiOne assumed single-registration).

## References
- Spec: `docs/superpowers/specs/2026-07-06-phase6c-tax-exports-design.md`
- Pattern: `scripts/subscription-admin.ts` / `scripts/refund-admin.ts` (pure lib + thin CLI)
- Data: Phase 5 `tax_transactions`, `creator_payouts.tds_withheld`/`tcs_withheld`; `src/lib/server/kyc-crypto.ts` (`decryptField`)
