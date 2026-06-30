// Single source of truth for a creator's withdrawable balance. Pure + isomorphic so the
// payout route (server) and useEarnings (client) compute it identically — they used to
// duplicate this formula and could drift.

export interface BalanceComponents {
  total_earnings: number;
  total_platform_fees: number;
  total_paid_out: number;
  pending_payout: number;
  frozen_balance?: number; // Phase 4 — absent until migration + type-regen; treated as 0.
}

export function availableBalance(b: Partial<BalanceComponents> | null | undefined): number {
  if (!b) return 0;
  return (
    (b.total_earnings ?? 0) -
    (b.total_platform_fees ?? 0) -
    (b.total_paid_out ?? 0) -
    (b.pending_payout ?? 0) -
    (b.frozen_balance ?? 0)
  );
}
