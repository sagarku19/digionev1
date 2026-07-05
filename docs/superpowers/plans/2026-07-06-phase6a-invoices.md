---
noteId: "phase6a-invoices-plan-20260706"
tags: []
---

# Phase 6a — Invoice Engine + Core Invoices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A server-side `@react-pdf/renderer` invoice engine that issues the DigiOne→creator monthly commission tax invoice and the buyer Bill-of-Supply invoice on demand, caches them in private R2, and serves them by owner-scoped signed URLs — per the approved spec `docs/superpowers/specs/2026-07-06-phase6a-invoices-design.md`.

**Architecture:** On first request, an atomic idempotent `issue_invoice` RPC allocates a per-series invoice number and stores an `invoices` row with a frozen content snapshot; the route renders the PDF from that snapshot, uploads it to R2 at a deterministic key, and returns a short-TTL signed URL. Fully decoupled from the Phase 4/5 money path — no `fulfillOrder` changes.

**Tech Stack:** Next.js 16 route handlers (Node runtime), `@react-pdf/renderer`, Supabase (Postgres RPC via MCP migration), Cloudflare R2 via `src/lib/storage`, TanStack Query v5, Vitest.

**Execution notes (read first):**
- Work directly on `main` (user preference). Commit after every task with the message given.
- DB migrations are applied **live** via the Supabase MCP (`mcp__plugin_supabase_supabase__apply_migration`, project_id `qcendfisvyjnwmefruba`). The Windows `supabase` CLI is broken. Load MCP tools via ToolSearch first.
- Type regen on Windows uses the MCP fallback in `.claude/rules/supabase-reference.md`.
- **Money-path is untouched** — no changes to `fulfillOrder`, `settle_*`, or balance/tax RPCs.
- **`@react-pdf/renderer` glyph note:** the built-in Helvetica font lacks the ₹ (U+20B9) glyph. PDFs render money as `INR 1,234.00` (not `₹`). Dashboard UI still uses `₹` via `formatINR` — only the PDF avoids the symbol.

**File structure (created/modified):**

| File | Responsibility |
|---|---|
| `supabase/migrations/20260706000001_phase6a_invoices.sql` (new) | `invoices` + `invoice_counters` tables, RLS, `issue_invoice` RPC |
| `src/lib/server/invoices/digione-identity.ts` (new) | DigiOne seller identity from env |
| `src/lib/server/invoices/types.ts` (new) | `InvoiceModel` types |
| `src/lib/server/invoices/build.ts` (new) | `buildSaleInvoiceModel`, `buildCommissionInvoiceModel`, `fyOf` (pure) |
| `src/lib/server/invoices/build.test.ts` (new) | unit tests |
| `src/lib/server/invoices/documents.tsx` (new) | `InvoiceDoc` react-pdf component |
| `src/lib/server/invoices/render.tsx` (new) | `renderInvoicePdf` (renderToBuffer) |
| `src/lib/server/invoices/render.test.ts` (new) | render smoke test |
| `src/lib/server/invoices/issue.ts` (new) | `issueAndCacheInvoice` orchestrator |
| `app/api/invoices/sale/[orderId]/route.ts` (new) | buyer sale invoice route |
| `app/api/invoices/commission/[month]/route.ts` (new) | commission invoice route |
| `src/hooks/commerce/useInvoices.ts` (new) | download hooks + `useCommissionMonths` |
| `app/payment/receipt/page.tsx` | buyer "Download invoice" |
| `app/dashboard/orders/page.tsx` | creator "Invoice" in the order drawer |
| `app/dashboard/earnings/page.tsx` | "Tax invoices" card |
| `package.json`, `.env.example` | dep + env |
| `types/database.types.ts` | regenerated |
| Docs: `.claude/rules/api-routes.md`, `security-model.md`, `hooks-reference.md`, `env-vars.md`, `docs/reference/dashboard-map.md`, blueprint `11(half)` §0 | same change-set |

---

### Task 1: Migration — invoices, invoice_counters, issue_invoice RPC

**Files:**
- Create: `supabase/migrations/20260706000001_phase6a_invoices.sql`

- [ ] **Step 1: Write the migration file**

Write exactly this to `supabase/migrations/20260706000001_phase6a_invoices.sql`:

```sql
-- Phase 6a — invoice engine (2026-07-06)
-- Spec: docs/superpowers/specs/2026-07-06-phase6a-invoices-design.md
-- Idempotent. Apply live via the Supabase MCP, then regenerate types.

-- ── 1. invoice_counters (atomic per-series numbering) ───────────────────────
create table if not exists public.invoice_counters (
  id          uuid primary key default gen_random_uuid(),
  series_key  text not null,
  fy          text not null,
  last_number bigint not null default 0,
  unique (series_key, fy)
);
alter table public.invoice_counters enable row level security;
-- no policies: service-role only.

-- ── 2. invoices (issued-invoice registry) ───────────────────────────────────
create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('sale','commission')),
  issuer          text not null check (issuer in ('creator','digione')),
  creator_id      uuid not null references public.profiles(id),
  order_id        uuid references public.orders(id),
  period_month    text,                          -- 'YYYY-MM' for commission
  fy              text not null,
  invoice_number  text not null unique,
  invoice_date    date not null,
  is_tax_invoice  boolean not null,
  subtotal        numeric not null,
  tax_amount      numeric not null default 0,
  total           numeric not null,
  currency        text not null default 'INR',
  storage_file_id uuid references public.storage_files(id),
  metadata        jsonb,
  created_at      timestamptz not null default now()
);
create unique index if not exists uq_invoices_sale_order       on public.invoices (order_id)                where type = 'sale' and order_id is not null;
create unique index if not exists uq_invoices_commission_month on public.invoices (creator_id, period_month) where type = 'commission' and period_month is not null;
create index if not exists idx_invoices_creator on public.invoices (creator_id, type, invoice_date desc);

alter table public.invoices enable row level security;
drop policy if exists invoices_select_own on public.invoices;
create policy invoices_select_own on public.invoices for select to authenticated
  using (creator_id = (select public.current_profile_id()) or (select public.is_super_admin()));
-- writes service-role only; buyer access is via the API route (service-role).

-- ── 3. issue_invoice() — atomic, idempotent number allocation + row insert ──
create or replace function public.issue_invoice(
  p_type text, p_issuer text, p_creator_id uuid, p_order_id uuid, p_period_month text,
  p_fy text, p_is_tax_invoice boolean, p_subtotal numeric, p_tax_amount numeric, p_total numeric,
  p_series_key text, p_prefix text, p_invoice_date date, p_metadata jsonb
)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.invoices;
  v_seq bigint;
  v_number text;
begin
  -- idempotent: return the existing invoice for this order (sale) / creator-month (commission)
  if p_type = 'sale' then
    select * into v_inv from public.invoices where type = 'sale' and order_id = p_order_id;
  elsif p_type = 'commission' then
    select * into v_inv from public.invoices where type = 'commission' and creator_id = p_creator_id and period_month = p_period_month;
  end if;
  if v_inv.id is not null then return v_inv; end if;

  insert into public.invoice_counters (series_key, fy, last_number)
  values (p_series_key, p_fy, 1)
  on conflict (series_key, fy) do update set last_number = invoice_counters.last_number + 1
  returning last_number into v_seq;

  v_number := p_prefix || '/' || p_fy || '/' || lpad(v_seq::text, 6, '0');

  insert into public.invoices
    (type, issuer, creator_id, order_id, period_month, fy, invoice_number, invoice_date,
     is_tax_invoice, subtotal, tax_amount, total, metadata)
  values
    (p_type, p_issuer, p_creator_id, p_order_id, p_period_month, p_fy, v_number, p_invoice_date,
     p_is_tax_invoice, p_subtotal, p_tax_amount, p_total, p_metadata)
  on conflict do nothing
  returning * into v_inv;

  if v_inv.id is null then
    -- lost a concurrent first-issue race — re-select the winner
    if p_type = 'sale' then
      select * into v_inv from public.invoices where type = 'sale' and order_id = p_order_id;
    else
      select * into v_inv from public.invoices where type = 'commission' and creator_id = p_creator_id and period_month = p_period_month;
    end if;
  end if;

  return v_inv;
end;
$$;
revoke execute on function public.issue_invoice(text, text, uuid, uuid, text, text, boolean, numeric, numeric, numeric, text, text, date, jsonb) from public, anon, authenticated;
```

- [ ] **Step 2: Apply live via MCP**

`ToolSearch` → `select:mcp__plugin_supabase_supabase__apply_migration,mcp__plugin_supabase_supabase__execute_sql`. Call `apply_migration` (project_id `qcendfisvyjnwmefruba`, name `phase6a_invoices`, query = full file). Expected: success.

- [ ] **Step 3: Verify**

`execute_sql`:
```sql
select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and relname in ('invoices','invoice_counters');
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname='issue_invoice';
```
Expected: 2 tables both `relrowsecurity=true`; 1 function.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260706000001_phase6a_invoices.sql
git commit -m "feat(db): phase6a invoices + invoice_counters + issue_invoice RPC" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Regenerate types

**Files:**
- Modify: `types/database.types.ts`

- [ ] **Step 1: Regenerate via MCP fallback**

`ToolSearch` → `select:mcp__plugin_supabase_supabase__generate_typescript_types`; call `generate_typescript_types` (project_id `qcendfisvyjnwmefruba`); strip the JSON envelope from the printed tool-results path:
```bash
python3 - <<'PY'
import json
src = r"<PATH>"
dst = r"types\database.types.ts"
with open(src,'r',encoding='utf-8') as f: p=json.load(f)
with open(dst,'w',encoding='utf-8',newline='\n') as f: f.write(p['types'])
PY
```

- [ ] **Step 2: Verify + compile**

Grep `types/database.types.ts` for `invoices`, `invoice_counters`, `issue_invoice` → present. `npx tsc --noEmit` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add types/database.types.ts
git commit -m "chore(types): regen for phase6a invoices schema" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Install @react-pdf/renderer + DigiOne identity config

**Files:**
- Modify: `package.json` (dependency)
- Create: `src/lib/server/invoices/digione-identity.ts`
- Modify: `.env.example`

- [ ] **Step 1: Install the dependency**

Run: `npm install @react-pdf/renderer`. Expected: adds `@react-pdf/renderer` to `package.json` dependencies, no peer-dep errors (it bundles its own React reconciler).

- [ ] **Step 2: Write the identity config**

Create `src/lib/server/invoices/digione-identity.ts`:
```typescript
// DigiOne's own seller identity for the commission tax invoice (server-only).
// Populate in .env.local. DIGIONE_GSTIN is required to issue a commission invoice.
export interface DigioneIdentity {
  legalName: string;
  gstin: string;
  pan: string;
  address: string;
  state: string;
  stateCode: string;
}

export function getDigioneIdentity(): DigioneIdentity {
  const gstin = process.env.DIGIONE_GSTIN;
  if (!gstin) {
    throw new Error('DIGIONE_GSTIN is not configured — cannot issue a commission tax invoice.');
  }
  return {
    legalName: process.env.DIGIONE_LEGAL_NAME ?? 'DigiOne',
    gstin,
    pan: process.env.DIGIONE_PAN ?? '',
    address: process.env.DIGIONE_ADDRESS ?? '',
    state: process.env.DIGIONE_STATE ?? '',
    stateCode: process.env.DIGIONE_STATE_CODE ?? '',
  };
}
```

- [ ] **Step 3: Document env in `.env.example`**

Append to `.env.example`:
```
# DigiOne seller identity — on the DigiOne→creator commission tax invoice (Phase 6a). Server-only.
DIGIONE_LEGAL_NAME="DigiOne Technologies Pvt Ltd"
DIGIONE_GSTIN="27AAAAA0000A1Z5"
DIGIONE_PAN="AAAAA0000A"
DIGIONE_ADDRESS="Address line, City, PIN"
DIGIONE_STATE="Maharashtra"
DIGIONE_STATE_CODE="27"
```

- [ ] **Step 4: Compile + commit**

Run: `npx tsc --noEmit` → exit 0.
```bash
git add package.json package-lock.json src/lib/server/invoices/digione-identity.ts .env.example
git commit -m "feat(invoices): add @react-pdf/renderer + DigiOne seller identity config" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Invoice model types + pure data-builders (TDD)

**Files:**
- Create: `src/lib/server/invoices/types.ts`
- Create: `src/lib/server/invoices/build.ts`
- Test: `src/lib/server/invoices/build.test.ts`

- [ ] **Step 1: Write the types**

Create `src/lib/server/invoices/types.ts`:
```typescript
export interface InvoiceParty {
  name: string;
  gstin?: string | null;
  address?: string | null;
  stateName?: string | null;
  email?: string | null;
}

export interface InvoiceLine {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceModel {
  type: 'sale' | 'commission';
  title: string;                 // 'Tax Invoice' | 'Bill of Supply'
  invoiceNumber: string;
  invoiceDate: string;           // display date (dd Mon yyyy)
  seller: InvoiceParty;
  buyer: InvoiceParty;
  lines: InvoiceLine[];
  subtotal: number;
  taxLabel?: string | null;
  taxAmount: number;
  total: number;
  note?: string | null;
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/server/invoices/build.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { buildSaleInvoiceModel, buildCommissionInvoiceModel, fyOf } from './build';

describe('fyOf', () => {
  it('maps April onward to the current FY', () => {
    expect(fyOf('2026-06-30')).toBe('2026-27');
  });
  it('maps Jan–Mar to the prior FY', () => {
    expect(fyOf('2027-02-15')).toBe('2026-27');
  });
});

describe('buildSaleInvoiceModel', () => {
  it('produces a GST-free Bill of Supply', () => {
    const m = buildSaleInvoiceModel({
      invoiceNumber: 'INV/2026-27/000001', invoiceDate: '2026-06-10',
      creator: { legalName: 'Asha Verma', gstin: null, address: 'Pune', state: 'Maharashtra' },
      buyer: { name: 'Ravi', email: 'ravi@example.com' },
      items: [{ name: 'React Course', price: 999 }, { name: 'Ebook', price: 1 }],
      total: 1000,
    });
    expect(m.type).toBe('sale');
    expect(m.title).toBe('Bill of Supply');
    expect(m.taxAmount).toBe(0);
    expect(m.subtotal).toBe(1000);
    expect(m.total).toBe(1000);
    expect(m.lines).toHaveLength(2);
    expect(m.seller.name).toBe('Asha Verma');
    expect(m.buyer.name).toBe('Ravi');
  });
});

describe('buildCommissionInvoiceModel', () => {
  it('produces an 18% GST tax invoice with total = net + gst', () => {
    const m = buildCommissionInvoiceModel({
      invoiceNumber: 'DIGI/2026-27/000001', invoiceDate: '2026-06-30',
      periodLabel: 'Jun 2026', salesCount: 3,
      digione: { legalName: 'DigiOne', gstin: '27AAPFU0939F1ZV', pan: '', address: '', state: 'Maharashtra', stateCode: '27' },
      creator: { legalName: 'Asha Verma', gstin: null, address: 'Pune', state: 'Maharashtra' },
      commissionNet: 254.24, gstOnCommission: 45.76,
    });
    expect(m.type).toBe('commission');
    expect(m.title).toBe('Tax Invoice');
    expect(m.subtotal).toBe(254.24);
    expect(m.taxAmount).toBe(45.76);
    expect(m.total).toBe(300);
    expect(m.seller.gstin).toBe('27AAPFU0939F1ZV');
    expect(m.buyer.name).toBe('Asha Verma');
    expect(m.lines[0].description).toContain('Jun 2026');
    expect(m.lines[0].description).toContain('3 sales');
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx vitest run src/lib/server/invoices/build.test.ts` → FAIL (cannot resolve `./build`).

- [ ] **Step 4: Write the implementation**

Create `src/lib/server/invoices/build.ts`:
```typescript
import type { InvoiceModel, InvoiceLine } from './types';
import type { DigioneIdentity } from './digione-identity';

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export function fyOf(dateIso: string): string {
  const d = new Date(dateIso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 4 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`;
}

export interface SaleInvoiceInput {
  invoiceNumber: string;
  invoiceDate: string; // ISO
  creator: { legalName: string; gstin?: string | null; address?: string | null; state?: string | null };
  buyer: { name?: string | null; email?: string | null };
  items: { name: string; price: number }[];
  total: number;
}

export function buildSaleInvoiceModel(input: SaleInvoiceInput): InvoiceModel {
  const lines: InvoiceLine[] = input.items.map((i) => ({
    description: i.name, qty: 1, unitPrice: round2(i.price), amount: round2(i.price),
  }));
  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  return {
    type: 'sale',
    title: 'Bill of Supply', // 6a: registered-creator GST Tax Invoice deferred (spec §6)
    invoiceNumber: input.invoiceNumber,
    invoiceDate: fmtDate(input.invoiceDate),
    seller: {
      name: input.creator.legalName, gstin: input.creator.gstin ?? null,
      address: input.creator.address ?? null, stateName: input.creator.state ?? null,
    },
    buyer: { name: input.buyer.name || 'Customer', email: input.buyer.email ?? null },
    lines,
    subtotal,
    taxLabel: null,
    taxAmount: 0,
    total: round2(input.total),
    note: 'This is a Bill of Supply. No GST is charged on this sale.',
  };
}

export interface CommissionInvoiceInput {
  invoiceNumber: string;
  invoiceDate: string; // ISO
  periodLabel: string;
  salesCount: number;
  digione: DigioneIdentity;
  creator: { legalName: string; gstin?: string | null; address?: string | null; state?: string | null };
  commissionNet: number;
  gstOnCommission: number;
}

export function buildCommissionInvoiceModel(input: CommissionInvoiceInput): InvoiceModel {
  const net = round2(input.commissionNet);
  const gst = round2(input.gstOnCommission);
  return {
    type: 'commission',
    title: 'Tax Invoice',
    invoiceNumber: input.invoiceNumber,
    invoiceDate: fmtDate(input.invoiceDate),
    seller: {
      name: input.digione.legalName, gstin: input.digione.gstin,
      address: input.digione.address, stateName: input.digione.state,
    },
    buyer: {
      name: input.creator.legalName, gstin: input.creator.gstin ?? null,
      address: input.creator.address ?? null, stateName: input.creator.state ?? null,
    },
    lines: [{
      description: `Platform commission — ${input.periodLabel} (${input.salesCount} sale${input.salesCount === 1 ? '' : 's'})`,
      qty: 1, unitPrice: net, amount: net,
    }],
    subtotal: net,
    taxLabel: 'GST @ 18%',
    taxAmount: gst,
    total: round2(net + gst),
    note: `DigiOne GSTIN: ${input.digione.gstin}. GST charged on platform commission for facilitation services.`,
  };
}
```

- [ ] **Step 5: Run to verify they pass**

Run: `npx vitest run src/lib/server/invoices/build.test.ts` → all pass. `npx tsc --noEmit` → exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/invoices/types.ts src/lib/server/invoices/build.ts src/lib/server/invoices/build.test.ts
git commit -m "feat(invoices): pure invoice model builders (sale bill-of-supply + commission tax invoice) (TDD)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: PDF document component + render wrapper + smoke test

**Files:**
- Create: `src/lib/server/invoices/documents.tsx`
- Create: `src/lib/server/invoices/render.tsx`
- Test: `src/lib/server/invoices/render.test.ts`

- [ ] **Step 1: Write the document component**

Create `src/lib/server/invoices/documents.tsx`:
```tsx
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { InvoiceModel, InvoiceParty } from './types';

// Built-in Helvetica lacks the ₹ glyph — render money as "INR 1,234.00".
const inr = (n: number) => `INR ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica', color: '#16130F' },
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  right: { textAlign: 'right' },
  muted: { color: '#6b6b6b' },
  bold: { fontFamily: 'Helvetica-Bold' },
  parties: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  party: { width: '48%' },
  label: { fontSize: 8, color: '#6b6b6b', marginBottom: 3 },
  tableHead: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#dddddd', paddingBottom: 4, marginTop: 20, fontFamily: 'Helvetica-Bold' },
  tr: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  cDesc: { width: '70%' },
  cAmt: { width: '30%', textAlign: 'right' },
  totals: { marginTop: 12, alignSelf: 'flex-end', width: '45%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grand: { fontFamily: 'Helvetica-Bold', borderTopWidth: 1, borderColor: '#dddddd', marginTop: 4, paddingTop: 4 },
  note: { marginTop: 24, fontSize: 8, color: '#6b6b6b' },
});

function Party({ label, p }: { label: string; p: InvoiceParty }) {
  return (
    <View style={s.party}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.bold}>{p.name}</Text>
      {p.gstin ? <Text style={s.muted}>GSTIN: {p.gstin}</Text> : null}
      {p.address ? <Text style={s.muted}>{p.address}</Text> : null}
      {p.stateName ? <Text style={s.muted}>{p.stateName}</Text> : null}
      {p.email ? <Text style={s.muted}>{p.email}</Text> : null}
    </View>
  );
}

export function InvoiceDoc({ model }: { model: InvoiceModel }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.row}>
          <Text style={s.h1}>{model.title}</Text>
          <View style={s.right}>
            <Text style={s.bold}>{model.invoiceNumber}</Text>
            <Text style={s.muted}>{model.invoiceDate}</Text>
          </View>
        </View>

        <View style={s.parties}>
          <Party label="FROM" p={model.seller} />
          <Party label="BILL TO" p={model.buyer} />
        </View>

        <View style={s.tableHead}>
          <Text style={s.cDesc}>Description</Text>
          <Text style={s.cAmt}>Amount</Text>
        </View>
        {model.lines.map((l, i) => (
          <View style={s.tr} key={i}>
            <Text style={s.cDesc}>{l.description}</Text>
            <Text style={s.cAmt}>{inr(l.amount)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalRow}><Text>Subtotal</Text><Text>{inr(model.subtotal)}</Text></View>
          {model.taxAmount > 0 ? (
            <View style={s.totalRow}><Text>{model.taxLabel}</Text><Text>{inr(model.taxAmount)}</Text></View>
          ) : null}
          <View style={[s.totalRow, s.grand]}><Text>Total</Text><Text>{inr(model.total)}</Text></View>
        </View>

        {model.note ? <Text style={s.note}>{model.note}</Text> : null}
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Write the render wrapper**

Create `src/lib/server/invoices/render.tsx`:
```tsx
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoiceDoc } from './documents';
import type { InvoiceModel } from './types';

export async function renderInvoicePdf(model: InvoiceModel): Promise<Buffer> {
  return renderToBuffer(<InvoiceDoc model={model} />);
}
```

- [ ] **Step 3: Write the smoke test**

Create `src/lib/server/invoices/render.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { renderInvoicePdf } from './render';
import { buildCommissionInvoiceModel } from './build';

describe('renderInvoicePdf', () => {
  it('produces a non-empty PDF buffer', async () => {
    const model = buildCommissionInvoiceModel({
      invoiceNumber: 'DIGI/2026-27/000001', invoiceDate: '2026-06-30',
      periodLabel: 'Jun 2026', salesCount: 3,
      digione: { legalName: 'DigiOne', gstin: '27AAPFU0939F1ZV', pan: '', address: 'Pune', state: 'Maharashtra', stateCode: '27' },
      creator: { legalName: 'Asha Verma' },
      commissionNet: 254.24, gstOnCommission: 45.76,
    });
    const buf = await renderInvoicePdf(model);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  }, 20000);
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/server/invoices/render.test.ts` → passes (a real `%PDF-` buffer). `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/invoices/documents.tsx src/lib/server/invoices/render.tsx src/lib/server/invoices/render.test.ts
git commit -m "feat(invoices): react-pdf InvoiceDoc + renderInvoicePdf (smoke-tested)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: issueAndCacheInvoice orchestrator

**Files:**
- Create: `src/lib/server/invoices/issue.ts`

- [ ] **Step 1: Write the orchestrator**

Create `src/lib/server/invoices/issue.ts`:
```typescript
// Issue (number + row via issue_invoice RPC), render from the frozen snapshot,
// cache the PDF in private R2, and return a short-TTL signed URL. Server-only.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database.types';
import { storage, resolveBucket } from '@/lib/storage';
import { insertFile, findLiveByKey } from '@/lib/storage/files';
import { renderInvoicePdf } from './render';
import type { InvoiceModel } from './types';

type Db = SupabaseClient<Database>;
type InvoiceRow = Database['public']['Tables']['invoices']['Row'];

export interface IssueParams {
  type: 'sale' | 'commission';
  issuer: 'creator' | 'digione';
  creatorId: string;
  orderId?: string | null;
  periodMonth?: string | null;
  fy: string;
  isTaxInvoice: boolean;
  subtotal: number;
  taxAmount: number;
  total: number;
  seriesKey: string;
  prefix: string;
  invoiceDate: string;  // 'YYYY-MM-DD'
  model: InvoiceModel;  // built by the caller; stored as the frozen metadata snapshot
}

const TTL_SECONDS = 600;

export async function issueAndCacheInvoice(
  db: Db, p: IssueParams
): Promise<{ invoice: InvoiceRow; signedUrl: string; ttlSeconds: number }> {
  // issue_invoice has no SQL defaults — every param must be passed explicitly (null, not undefined).
  const { data: issued, error } = await db.rpc('issue_invoice', {
    p_type: p.type, p_issuer: p.issuer, p_creator_id: p.creatorId,
    p_order_id: p.orderId ?? null, p_period_month: p.periodMonth ?? null,
    p_fy: p.fy, p_is_tax_invoice: p.isTaxInvoice,
    p_subtotal: p.subtotal, p_tax_amount: p.taxAmount, p_total: p.total,
    p_series_key: p.seriesKey, p_prefix: p.prefix, p_invoice_date: p.invoiceDate,
    p_metadata: p.model as unknown as Json,
  });
  if (error || !issued) throw new Error(`issue_invoice failed: ${error?.message ?? 'no row returned'}`);
  const invoice = issued as unknown as InvoiceRow;

  const cfg = resolveBucket('creator-content');
  const safeNumber = invoice.invoice_number.replace(/\//g, '-');
  const objectKey = `${p.creatorId}/invoices/${safeNumber}.pdf`;

  if (!invoice.storage_file_id) {
    // Render from the STORED snapshot for legal immutability; inject the authoritative number.
    const snapshot = (invoice.metadata ?? p.model) as unknown as InvoiceModel;
    const model: InvoiceModel = { ...snapshot, invoiceNumber: invoice.invoice_number };
    const pdf = await renderInvoicePdf(model);
    await storage.putObject({ bucket: cfg.name, objectKey, body: pdf, contentType: 'application/pdf' });

    let file = await findLiveByKey(db, cfg.name, objectKey);
    if (!file) {
      file = await insertFile(db, {
        owner_id: p.creatorId, bucket: cfg.name, object_key: objectKey, file_name: `${safeNumber}.pdf`,
        mime_type: 'application/pdf', size: pdf.length, visibility: 'private', kind: 'invoice', product_id: null,
      });
    }
    await db.from('invoices').update({ storage_file_id: file.id }).eq('id', invoice.id);
  }

  const signedUrl = await storage.createDownloadUrl({ bucket: cfg.name, objectKey, ttlSeconds: TTL_SECONDS });
  return { invoice, signedUrl, ttlSeconds: TTL_SECONDS };
}
```

- [ ] **Step 2: Compile**

Run: `npx tsc --noEmit` → exit 0. (If the generated `issue_invoice` arg types demand `null` instead of `undefined`, pass `null` to match the signature.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/invoices/issue.ts
git commit -m "feat(invoices): issueAndCacheInvoice — issue_invoice → render → R2 cache → signed URL" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Routes — sale + commission

**Files:**
- Create: `app/api/invoices/sale/[orderId]/route.ts`
- Create: `app/api/invoices/commission/[month]/route.ts`

- [ ] **Step 1: Write the sale invoice route**

Create `app/api/invoices/sale/[orderId]/route.ts`:
```typescript
export const runtime = 'nodejs'; // @react-pdf needs Node, not edge

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { buildSaleInvoiceModel, fyOf } from '@/lib/server/invoices/build';
import { issueAndCacheInvoice } from '@/lib/server/invoices/issue';

export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: 'Invalid orderId.' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createServiceClient();
    const { data: order } = await db
      .from('orders')
      .select('id, creator_id, total_amount, status, customer_name, customer_email, user_id, created_at, order_items(price_at_purchase, products(name))')
      .eq('id', orderId)
      .maybeSingle();
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    if (order.status !== 'completed' || Number(order.total_amount) <= 0) {
      return NextResponse.json({ error: 'No invoice is available for this order.' }, { status: 404 });
    }

    const profileId = await resolveProfileId(user.id, user.email);
    const isCreator = !!profileId && order.creator_id === profileId;
    const isBuyer =
      order.user_id === user.id ||
      (!!order.customer_email && !!user.email && order.customer_email.toLowerCase() === user.email.toLowerCase());
    if (!isCreator && !isBuyer) {
      return NextResponse.json({ error: 'You cannot access this invoice.' }, { status: 403 });
    }
    if (!order.creator_id) return NextResponse.json({ error: 'Order has no creator.' }, { status: 404 });

    const { data: kyc } = await db
      .from('creator_kyc')
      .select('legal_name, gstin, address_line1, city, state')
      .eq('creator_id', order.creator_id)
      .maybeSingle();
    const address = [kyc?.address_line1, kyc?.city].filter(Boolean).join(', ') || null;

    const items = (order.order_items ?? []).map((it) => {
      const prod = Array.isArray(it.products) ? it.products[0] : it.products;
      return { name: prod?.name ?? 'Product', price: Number(it.price_at_purchase) };
    });
    const invoiceDate = String(order.created_at).slice(0, 10);
    const fy = fyOf(invoiceDate);

    const model = buildSaleInvoiceModel({
      invoiceNumber: '', // authoritative number injected by issueAndCacheInvoice
      invoiceDate,
      creator: { legalName: kyc?.legal_name ?? 'Creator', gstin: kyc?.gstin ?? null, address, state: kyc?.state ?? null },
      buyer: { name: order.customer_name, email: order.customer_email },
      items,
      total: Number(order.total_amount),
    });

    const { invoice, signedUrl, ttlSeconds } = await issueAndCacheInvoice(db, {
      type: 'sale', issuer: 'creator', creatorId: order.creator_id, orderId: order.id, periodMonth: null,
      fy, isTaxInvoice: false, subtotal: model.subtotal, taxAmount: 0, total: model.total,
      seriesKey: order.creator_id, prefix: 'INV', invoiceDate, model,
    });

    return NextResponse.json({ signedUrl, ttlSeconds, invoiceNumber: invoice.invoice_number }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[invoices/sale]', e);
    return NextResponse.json({ error: 'Could not generate invoice.' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write the commission invoice route**

Create `app/api/invoices/commission/[month]/route.ts`:
```typescript
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { getDigioneIdentity } from '@/lib/server/invoices/digione-identity';
import { buildCommissionInvoiceModel, fyOf } from '@/lib/server/invoices/build';
import { issueAndCacheInvoice } from '@/lib/server/invoices/issue';

function monthBounds(month: string): { start: string; endExclusive: string; label: string; lastDay: string } | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const endExclusive = new Date(Date.UTC(y, m, 1));
  const lastDay = new Date(Date.UTC(y, m, 0));
  const label = start.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), endExclusive: iso(endExclusive), label, lastDay: iso(lastDay) };
}

export async function GET(_req: Request, { params }: { params: Promise<{ month: string }> }) {
  try {
    const { month } = await params;
    const bounds = monthBounds(month);
    if (!bounds) return NextResponse.json({ error: 'Invalid month (expected YYYY-MM).' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });

    const db = createServiceClient();
    const { data: rows } = await db
      .from('tax_transactions')
      .select('commission_net, gst_on_commission, status')
      .eq('creator_id', profileId)
      .gte('created_at', bounds.start)
      .lt('created_at', bounds.endExclusive);

    let net = 0, gst = 0, count = 0;
    for (const r of rows ?? []) {
      const sign = r.status === 'reversed' ? -1 : 1;
      net += sign * Number(r.commission_net);
      gst += sign * Number(r.gst_on_commission);
      if (r.status !== 'reversed') count++;
    }
    net = Math.round(net * 100) / 100;
    gst = Math.round(gst * 100) / 100;
    if (net <= 0) return NextResponse.json({ error: 'No commission for this period.' }, { status: 404 });

    const { data: kyc } = await db
      .from('creator_kyc')
      .select('legal_name, gstin, address_line1, city, state')
      .eq('creator_id', profileId)
      .maybeSingle();
    const address = [kyc?.address_line1, kyc?.city].filter(Boolean).join(', ') || null;

    const model = buildCommissionInvoiceModel({
      invoiceNumber: '',
      invoiceDate: bounds.lastDay,
      periodLabel: bounds.label,
      salesCount: count,
      digione: getDigioneIdentity(),
      creator: { legalName: kyc?.legal_name ?? 'Creator', gstin: kyc?.gstin ?? null, address, state: kyc?.state ?? null },
      commissionNet: net,
      gstOnCommission: gst,
    });

    const { invoice, signedUrl, ttlSeconds } = await issueAndCacheInvoice(db, {
      type: 'commission', issuer: 'digione', creatorId: profileId, orderId: null, periodMonth: month,
      fy: fyOf(bounds.lastDay), isTaxInvoice: true, subtotal: net, taxAmount: gst, total: model.total,
      seriesKey: 'digione', prefix: 'DIGI', invoiceDate: bounds.lastDay, model,
    });

    return NextResponse.json({ signedUrl, ttlSeconds, invoiceNumber: invoice.invoice_number }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[invoices/commission]', e);
    return NextResponse.json({ error: 'Could not generate invoice.' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Compile + lint**

Run: `npx tsc --noEmit` → exit 0. Run: `npx eslint "app/api/invoices/sale/[orderId]/route.ts" "app/api/invoices/commission/[month]/route.ts"` → clean.

- [ ] **Step 4: Commit**

```bash
git add "app/api/invoices/sale/[orderId]/route.ts" "app/api/invoices/commission/[month]/route.ts"
git commit -m "feat(invoices): GET sale + commission invoice routes (owner-scoped signed URLs)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Invoice hooks

**Files:**
- Create: `src/hooks/commerce/useInvoices.ts`

- [ ] **Step 1: Write the hooks**

Create `src/hooks/commerce/useInvoices.ts`:
```typescript
'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

async function openInvoice(url: string) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Could not generate invoice.');
  const { signedUrl } = data as { signedUrl: string };
  window.open(signedUrl, '_blank', 'noopener');
  return signedUrl;
}

export function useDownloadSaleInvoice() {
  return useMutation({ mutationFn: (orderId: string) => openInvoice(`/api/invoices/sale/${orderId}`) });
}

export function useDownloadCommissionInvoice() {
  return useMutation({ mutationFn: (month: string) => openInvoice(`/api/invoices/commission/${month}`) });
}

// Months (YYYY-MM) in the current data that have commission, for the earnings "Tax invoices" list.
export function useCommissionMonths() {
  return useQuery({
    queryKey: ['invoices', 'commission-months'],
    queryFn: async (): Promise<{ month: string; label: string }[]> => {
      const profileId = await getCreatorProfileId();
      const { data, error } = await supabase
        .from('tax_transactions')
        .select('created_at, gst_on_commission, status')
        .eq('creator_id', profileId);
      if (error) throw error;
      const totals = new Map<string, number>();
      for (const r of data ?? []) {
        const month = String(r.created_at).slice(0, 7);
        const sign = r.status === 'reversed' ? -1 : 1;
        totals.set(month, (totals.get(month) ?? 0) + sign * Number(r.gst_on_commission));
      }
      return [...totals.entries()]
        .filter(([, v]) => v > 0)
        .map(([month]) => ({
          month,
          label: new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
        }))
        .sort((a, b) => b.month.localeCompare(a.month));
    },
  });
}
```

- [ ] **Step 2: Compile + commit**

Run: `npx tsc --noEmit` → exit 0.
```bash
git add src/hooks/commerce/useInvoices.ts
git commit -m "feat(hooks): useDownloadSaleInvoice + useDownloadCommissionInvoice + useCommissionMonths" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: UI — buyer receipt + creator orders-drawer download

**Files:**
- Modify: `app/payment/receipt/page.tsx`
- Modify: `app/dashboard/orders/page.tsx`

READ each file first. The receipt page shows a completed order to the buyer; add a "Download invoice" button wired to `useDownloadSaleInvoice()` using the order id already on the page. The orders page has an `OrderDrawer` (Phase 4 added a refund panel in its footer); add an "Invoice" button next to "Download Receipt" for completed orders, wired to `useDownloadSaleInvoice()` with `order.id`.

- [ ] **Step 1: Receipt page**

In `app/payment/receipt/page.tsx`: if it is a client component, add `import { useDownloadSaleInvoice } from '@/hooks/commerce/useInvoices';`, call `const dl = useDownloadSaleInvoice();`, and add a button near the existing actions:
```tsx
<button
  onClick={() => dl.mutate(orderId)}
  disabled={dl.isPending}
  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-black/[0.1] hover:border-black/[0.25] text-[#16130F] font-semibold text-[14px] transition-colors disabled:opacity-50"
>
  {dl.isPending ? 'Preparing…' : 'Download invoice'}
</button>
```
(Use the `orderId` variable already resolved on the page. If the receipt page is a server component, instead add a small `'use client'` child button component in the same file that takes `orderId` and renders the button above — do not convert the page to client.)

- [ ] **Step 2: Orders drawer**

In `app/dashboard/orders/page.tsx`: extend the hooks import to include `useDownloadSaleInvoice` from `@/hooks/commerce/useInvoices`. Inside `OrderDrawer`, add `const downloadInvoice = useDownloadSaleInvoice();` near the top. In the footer actions block (the one gated by `order.status === 'completed'`, next to "Download Receipt"), add:
```tsx
<button
  onClick={() => downloadInvoice.mutate(order.id)}
  disabled={downloadInvoice.isPending}
  className="flex items-center justify-center gap-2 w-full py-2.5 border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] font-semibold rounded-[var(--radius-sm)] transition text-sm disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
>
  <FileText className="w-4 h-4" />
  {downloadInvoice.isPending ? 'Preparing…' : 'Invoice'}
</button>
```
Add `FileText` to the `lucide-react` import in `app/dashboard/orders/page.tsx` if not already imported.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → exit 0. Run: `npx eslint app/dashboard/orders/page.tsx app/payment/receipt/page.tsx` → no new errors. Run the color grep from `dashboard-design.md` on `app/dashboard/orders/page.tsx` → zero hits (the receipt page uses the marketing/ledger palette, so its hardcoded hex like `#16130F` is expected there — do NOT grep the receipt page for tokens).

- [ ] **Step 4: Commit**

```bash
git add app/payment/receipt/page.tsx app/dashboard/orders/page.tsx
git commit -m "feat(invoices): download invoice on the buyer receipt + creator order drawer" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: UI — earnings "Tax invoices" card

**Files:**
- Modify: `app/dashboard/earnings/page.tsx`

- [ ] **Step 1: Wire imports + hooks**

Add `import { useCommissionMonths, useDownloadCommissionInvoice } from '@/hooks/commerce/useInvoices';`. Add `Download` to the existing `lucide-react` import. Near the other hooks in the component add:
```typescript
  const { data: commissionMonths } = useCommissionMonths();
  const downloadCommission = useDownloadCommissionInvoice();
```

- [ ] **Step 2: Add the card**

Immediately AFTER the "Tax withheld" card (added in Phase 5, `taxSummary`), insert:
```typescript
      {!isLoading && (commissionMonths?.length ?? 0) > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={14} className="text-[var(--text-tertiary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Tax invoices</h3>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mb-3">Monthly DigiOne commission tax invoices (18% GST on platform fees).</p>
          <div className="divide-y divide-[var(--border-subtle)]">
            {commissionMonths!.map((m) => (
              <div key={m.month} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-[var(--text-primary)]">{m.label}</span>
                <button
                  onClick={() => downloadCommission.mutate(m.month)}
                  disabled={downloadCommission.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] rounded-[var(--radius-sm)] transition disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <Download size={13} />
                  Invoice
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
```
(`FileText` was added to the lucide import in Phase 5; if it is not present, add it too.)

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → exit 0. Run: `npx eslint app/dashboard/earnings/page.tsx` → no new errors. Color grep on `app/dashboard/earnings/page.tsx` → zero hits.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/earnings/page.tsx
git commit -m "feat(earnings): Tax invoices card — download monthly commission tax invoices" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Docs sweep

**Files:**
- Modify: `.claude/rules/api-routes.md`, `.claude/rules/security-model.md`, `.claude/rules/hooks-reference.md`, `.claude/rules/env-vars.md`, `docs/reference/dashboard-map.md`

- [ ] **Step 1: `api-routes.md`** — add "At a glance" rows:
```markdown
| GET | `/api/invoices/sale/[orderId]` | cookie session | server + service role | reads `orders`; issues `invoices` + `invoice_counters` (via `issue_invoice`); caches PDF to R2 `storage_files` (`kind='invoice'`) |
| GET | `/api/invoices/commission/[month]` | cookie session | server + service role | reads `tax_transactions`; issues `invoices` + `invoice_counters`; caches PDF to R2 |
```
Add a Storage/Money subsection documenting both routes: on-demand PDF (`@react-pdf/renderer`), owner-scoped (sale = creator or the order's buyer; commission = creator), returns `{ signedUrl, ttlSeconds, invoiceNumber }`, `Cache-Control: no-store`; errors 400/401/403/404/500.

- [ ] **Step 2: `security-model.md`** — RLS table rows:
```markdown
| `invoices` | Creator reads their own. **Writes: service role only** (issue_invoice RPC). Buyer sale-invoice access is via the API route (verifies order ownership), not RLS. |
| `invoice_counters` | No policies — service-role only. |
```

- [ ] **Step 3: `hooks-reference.md`** — append to the `commerce/` row: `useInvoices` (`useDownloadSaleInvoice`, `useDownloadCommissionInvoice`, `useCommissionMonths`). Add query-key row: `| `useCommissionMonths()` | `['invoices','commission-months']` |`.

- [ ] **Step 4: `env-vars.md`** — add a "DigiOne identity (invoices)" table with `DIGIONE_LEGAL_NAME`, `DIGIONE_GSTIN`, `DIGIONE_PAN`, `DIGIONE_ADDRESS`, `DIGIONE_STATE`, `DIGIONE_STATE_CODE` (all server-only, read by `src/lib/server/invoices/digione-identity.ts`; `DIGIONE_GSTIN` required to issue a commission invoice).

- [ ] **Step 5: `docs/reference/dashboard-map.md`** — update the `/dashboard/orders` entry (drawer now has an "Invoice" download) and `/dashboard/earnings` entry (a "Tax invoices" card lists monthly commission invoices); note hooks `useDownloadSaleInvoice`/`useDownloadCommissionInvoice`/`useCommissionMonths` and routes `/api/invoices/*`.

- [ ] **Step 6: Commit**

```bash
git add .claude/rules/api-routes.md .claude/rules/security-model.md .claude/rules/hooks-reference.md .claude/rules/env-vars.md docs/reference/dashboard-map.md
git commit -m "docs(phase6a): invoice routes/RLS/hooks/env/dashboard-map" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12: Final verification + blueprint state

**Files:**
- Modify: `.claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md`

- [ ] **Step 1: Full local gauntlet**
- `npx tsc --noEmit` → exit 0
- `npx eslint src/lib/server/invoices/*.ts src/lib/server/invoices/*.tsx src/hooks/commerce/useInvoices.ts "app/api/invoices/sale/[orderId]/route.ts" "app/api/invoices/commission/[month]/route.ts" app/dashboard/orders/page.tsx app/dashboard/earnings/page.tsx` → clean
- `npm test` → all pass (adds `invoices/build` + `invoices/render` suites)

- [ ] **Step 2: Live SQL sanity via MCP `execute_sql`**
```sql
select count(*) from public.invoices;          -- expect 0 (nothing issued yet)
select count(*) from public.invoice_counters;  -- expect 0
-- idempotency smoke (safe: rolls back nothing, just exercises the RPC twice for a fake order is NOT run here;
-- instead verify the function is callable):
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname='issue_invoice';
```
Expected: 0/0 and the function present. (Real issuance is exercised by the render smoke test + manual download.)

- [ ] **Step 3: Update the blueprint §0**

In `.claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md`: set Phase 6's row to **6a BUILT** (engine + commission tax invoice + buyer bill-of-supply) with spec/plan links (`docs/superpowers/specs/2026-07-06-phase6a-invoices-design.md` · `docs/superpowers/plans/2026-07-06-phase6a-invoices.md`); note the remaining Phase 6 slices **6b** (Form 16A + annual statement) and **6c** (GSTR-8/26Q/GSTR-1 exports) as next; record 6a deferrals: registered-creator sale Tax Invoice (needs product-GST-rate capture), subscription invoice (needs live billing), email delivery, and the 3 CA-flags from spec §7. Update "Last updated" to 2026-07-06.

- [ ] **Step 4: Commit**
```bash
git add ".claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md"
git commit -m "docs(blueprint): phase6a invoices BUILT; next 6b (statements) / 6c (GSTR exports)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Out of scope (spec non-goals — do NOT build)

Registered-creator buyer *Tax Invoice* with sale-GST breakdown (needs product-GST-rate capture) · buyer GSTIN / B2B ITC · subscription SaaS tax invoice (billing deferred) · email delivery · Form 16A + annual earnings statement (6b) · GSTR-8 / 26Q / GSTR-1 exports (6c).

## References
- Spec: `docs/superpowers/specs/2026-07-06-phase6a-invoices-design.md`
- Phase 5 tax engine (data source: `tax_transactions`)
- Storage: `src/lib/storage/index.ts` (`storage.putObject`/`createDownloadUrl`), `src/lib/storage/files.ts` (`insertFile`/`findLiveByKey`), `/api/deliverables` (signed-URL pattern)
- `@react-pdf/renderer` `renderToBuffer`
