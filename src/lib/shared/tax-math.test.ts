import { describe, it, expect } from 'vitest';
import { splitCommission, accrueSaleTax } from './tax-math';

const RATES = {
  gstCommissionRate: 0.18, tdsRatePan: 0.001, tdsRateNoPan: 0.05,
  tcsRate: 0.005, tdsThresholdFy: 500000,
};

describe('splitCommission', () => {
  it('carves GST out of a GST-inclusive commission', () => {
    expect(splitCommission(100, 0.18)).toEqual({ commissionNet: 84.75, gstOnCommission: 15.25 });
  });
  it('rejects non-finite inputs', () => {
    expect(() => splitCommission(Number.NaN, 0.18)).toThrow(RangeError);
    expect(() => splitCommission(100, -1)).toThrow(RangeError);
  });
});

describe('accrueSaleTax', () => {
  it('no TDS below the ₹5L FY threshold (PAN present)', () => {
    expect(accrueSaleTax({ gross: 1000, fyGrossBefore: 0, panPresent: true, registered: false, rates: RATES }))
      .toEqual({ tdsAmount: 0, tcsAmount: 0 });
  });
  it('0.1% TDS once FY gross crosses ₹5L (PAN)', () => {
    expect(accrueSaleTax({ gross: 1000, fyGrossBefore: 600000, panPresent: true, registered: false, rates: RATES }))
      .toEqual({ tdsAmount: 1, tcsAmount: 0 });
  });
  it('the crossing sale is taxed on full gross', () => {
    expect(accrueSaleTax({ gross: 1000, fyGrossBefore: 499500, panPresent: true, registered: false, rates: RATES }).tdsAmount)
      .toBe(1);
  });
  it('5% TDS from ₹1 when no PAN (no threshold benefit)', () => {
    expect(accrueSaleTax({ gross: 1000, fyGrossBefore: 0, panPresent: false, registered: false, rates: RATES }).tdsAmount)
      .toBe(50);
  });
  it('unregistered creator accrues no TCS', () => {
    expect(accrueSaleTax({ gross: 1000, fyGrossBefore: 600000, panPresent: true, registered: false, rates: RATES }).tcsAmount)
      .toBe(0);
  });
  it('registered creator accrues 0.5% TCS', () => {
    expect(accrueSaleTax({ gross: 1000, fyGrossBefore: 600000, panPresent: true, registered: true, rates: RATES }))
      .toEqual({ tdsAmount: 1, tcsAmount: 5 });
  });
  it('rejects non-finite gross', () => {
    expect(() => accrueSaleTax({ gross: Number.NaN, fyGrossBefore: 0, panPresent: true, registered: false, rates: RATES }))
      .toThrow(RangeError);
  });
});
