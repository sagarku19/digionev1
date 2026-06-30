import { describe, it, expect } from 'vitest';
import { availableBalance } from './balance';

describe('availableBalance', () => {
  it('subtracts fees, paid-out and pending from earnings', () => {
    expect(availableBalance({
      total_earnings: 1000,
      total_platform_fees: 100,
      total_paid_out: 200,
      pending_payout: 50,
    })).toBe(650);
  });

  it('also subtracts frozen_balance when present', () => {
    expect(availableBalance({
      total_earnings: 1000,
      total_platform_fees: 0,
      total_paid_out: 0,
      pending_payout: 0,
      frozen_balance: 300,
    })).toBe(700);
  });

  it('treats missing fields and null as zero', () => {
    expect(availableBalance(null)).toBe(0);
    expect(availableBalance({})).toBe(0);
    expect(availableBalance({ total_earnings: 500 })).toBe(500);
  });
});
