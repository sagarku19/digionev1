// Per-order earnings economics, derived from what the sale actually recorded.
//
// The platform cut is NOT a fixed rate — it depends on the creator's plan and the
// buy path (e.g. discover-page purchases can carry a different fee, premium plans
// vary). The real fee is frozen in transaction_ledger.meta.platform_fee at
// fulfillment, so the effective percent MUST be derived from that per order — never
// hardcoded — or a plan/path change would misreport historical orders.

export interface OrderEarnings {
  gross: number;
  fee: number;
  net: number;
  /** Effective platform cut for THIS order (fee ÷ gross × 100), one decimal. */
  feePercent: number;
}

export function computeOrderEarnings(gross: number | string, fee: number | string): OrderEarnings {
  const g = Math.max(0, Number(gross) || 0);
  const f = Math.min(g, Math.max(0, Number(fee) || 0));
  const net = Math.round((g - f) * 100) / 100;
  const feePercent = g > 0 ? Math.round((f / g) * 1000) / 10 : 0;
  return { gross: g, fee: f, net, feePercent };
}

/** "10%", "50%", "12.5%" — drops the trailing ".0" for whole percentages. */
export function formatFeePercent(percent: number): string {
  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`;
}
