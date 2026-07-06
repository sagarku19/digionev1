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
