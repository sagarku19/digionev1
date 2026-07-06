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

  it('adds a discount line so subtotal - discount = total on a coupon order', () => {
    const m = buildSaleInvoiceModel({
      invoiceNumber: 'INV/2026-27/000002', invoiceDate: '2026-06-10',
      creator: { legalName: 'Asha Verma' },
      buyer: { name: 'Ravi' },
      items: [{ name: 'Course', price: 1000 }],
      total: 900,
    });
    expect(m.subtotal).toBe(1000);
    expect(m.discount).toBe(100);
    expect(m.total).toBe(900);
    expect(m.subtotal - (m.discount ?? 0)).toBe(m.total);
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
