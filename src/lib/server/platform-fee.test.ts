import { describe, it, expect } from 'vitest';
import { resolveFeeRate } from './platform-fee';

describe('resolveFeeRate', () => {
  it('converts a plan percent to a rate', () => {
    expect(resolveFeeRate({ current_platform_fee_percent: 7 })).toBeCloseTo(0.07);
    expect(resolveFeeRate({ current_platform_fee_percent: 5 })).toBeCloseTo(0.05);
    expect(resolveFeeRate({ current_platform_fee_percent: 10 })).toBeCloseTo(0.10);
  });
  it('accepts a numeric string (PostgREST numeric)', () => {
    expect(resolveFeeRate({ current_platform_fee_percent: '7.0' as unknown as number })).toBeCloseTo(0.07);
  });
  it('falls back to Free 0.10 for null/invalid', () => {
    expect(resolveFeeRate(null)).toBe(0.10);
    expect(resolveFeeRate({ current_platform_fee_percent: null })).toBe(0.10);
    expect(resolveFeeRate({ current_platform_fee_percent: NaN })).toBe(0.10);
  });
  it('passes a configured 0% fee through as 0 (a valid plan value, NOT the Free fallback)', () => {
    expect(resolveFeeRate({ current_platform_fee_percent: 0 })).toBe(0);
  });
});
