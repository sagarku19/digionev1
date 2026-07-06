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
