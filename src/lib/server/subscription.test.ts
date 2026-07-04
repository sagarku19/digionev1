import { describe, it, expect } from 'vitest';
import { subscriptionRowFromPlan } from './subscription';

const plan = { id: 'plan-pro', plan_type: 'pro', platform_fee_percent: 5, monthly_price: 1000, yearly_price: 10000 };
const NOW = new Date('2026-07-02T00:00:00.000Z');

describe('subscriptionRowFromPlan', () => {
  it('snapshots fee + monthly price and renews in 1 month', () => {
    const r = subscriptionRowFromPlan('creator-1', plan, 'monthly', NOW);
    expect(r.creator_id).toBe('creator-1');
    expect(r.subscription_plan_id).toBe('plan-pro');
    expect(r.status).toBe('active');
    expect(r.billing_cycle).toBe('monthly');
    expect(r.current_price).toBe(1000);
    expect(r.current_platform_fee_percent).toBe(5);
    expect(r.auto_renew).toBe(false);
    expect(r.renewal_date).toBe('2026-08-02T00:00:00.000Z');
  });
  it('uses yearly price and renews in 1 year', () => {
    const r = subscriptionRowFromPlan('c', plan, 'yearly', NOW);
    expect(r.current_price).toBe(10000);
    expect(r.renewal_date).toBe('2027-07-02T00:00:00.000Z');
  });
  it('clamps month-end overflow (Jan 31 +1mo → last day of Feb, not Mar)', () => {
    // Local-time construction + local-time assertions: subscriptionRowFromPlan does local Date math,
    // so read the result back with local getters to stay timezone-robust.
    const r = subscriptionRowFromPlan('c', plan, 'monthly', new Date(2026, 0, 31));
    const d = new Date(r.renewal_date);
    expect(d.getMonth()).toBe(1); // February — clamped, not March
    expect(d.getDate()).toBe(28); // 2026 is not a leap year
  });
});
