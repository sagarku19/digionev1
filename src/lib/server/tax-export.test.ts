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
