import { describe, it, expect } from 'vitest';
import { computeRefundSplit } from './refund-math';

describe('computeRefundSplit', () => {
  it('full refund reverses the full fee (order nets to zero)', () => {
    expect(computeRefundSplit(1000, 100, 1000)).toEqual({
      amount: 1000, feeReversed: 100, netClawback: 900, completes: true,
    });
  });

  it('partial refund reverses the fee proportionally', () => {
    expect(computeRefundSplit(1000, 100, 400)).toEqual({
      amount: 400, feeReversed: 40, netClawback: 360, completes: false,
    });
  });

  it('rounds proportional fee to 2dp', () => {
    // fee 100 on 333 of 1000 → 33.3
    expect(computeRefundSplit(1000, 100, 333).feeReversed).toBe(33.3);
  });

  it('completing refund takes the fee remainder exactly (no paisa residue)', () => {
    const first = computeRefundSplit(1000, 100, 333);           // 33.3
    const second = computeRefundSplit(1000, 100, 667, 333, first.feeReversed);
    expect(second.completes).toBe(true);
    expect(first.feeReversed + second.feeReversed).toBe(100);   // 33.3 + 66.7
  });

  it('sums of partials never exceed the original fee', () => {
    const a = computeRefundSplit(999, 99.9, 500);
    const b = computeRefundSplit(999, 99.9, 499, 500, a.feeReversed);
    expect(b.completes).toBe(true);
    expect(Math.round((a.feeReversed + b.feeReversed) * 100) / 100).toBe(99.9);
  });

  it('rejects amounts below ₹1', () => {
    expect(() => computeRefundSplit(1000, 100, 0.5)).toThrow(RangeError);
    expect(() => computeRefundSplit(1000, 100, 0)).toThrow(RangeError);
    expect(() => computeRefundSplit(1000, 100, -5)).toThrow(RangeError);
  });

  it('rejects over-refund past the remaining amount', () => {
    expect(() => computeRefundSplit(1000, 100, 601, 400)).toThrow(RangeError);
  });
});
