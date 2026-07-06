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
