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
