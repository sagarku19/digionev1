import { describe, it, expect } from 'vitest';
import { computeReferralCommission } from './referrals';

describe('computeReferralCommission', () => {
  it('is reward_percent of total, rounded to 2dp', () => {
    expect(computeReferralCommission(1000, 10, 100)).toBe(100);
  });
  it('caps at the platform fee (platform-funded, never negative)', () => {
    expect(computeReferralCommission(1000, 20, 100)).toBe(100);
  });
  it('returns 0 for free orders', () => {
    expect(computeReferralCommission(0, 10, 0)).toBe(0);
  });
  it('returns 0 when reward_percent is 0', () => {
    expect(computeReferralCommission(1000, 0, 100)).toBe(0);
  });
  it('rounds to 2 decimals', () => {
    expect(computeReferralCommission(333, 10, 100)).toBe(33.3);
  });
});
