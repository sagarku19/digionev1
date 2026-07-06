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
