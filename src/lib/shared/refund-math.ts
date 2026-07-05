// Pure refund split math — isomorphic (client preview + unit tests).
// AUTHORITATIVE computation lives in the begin_refund Postgres RPC; this module
// implements the identical rules for UI previews. Proportional fee reversal:
// the platform returns its fee on the refunded portion; the completing refund
// takes the exact fee remainder so a fully refunded order nets to zero.

export interface RefundSplit {
  amount: number;
  feeReversed: number;
  netClawback: number;
  completes: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * @param priorFeeReversed — must be the sum of feeReversed from all prior
 *   processing/success refunds on the same order (paired with priorAmount);
 *   a mismatched pair produces a wrong completing-branch fee.
 */
export function computeRefundSplit(
  total: number,
  feeOriginal: number,
  amount: number,
  priorAmount = 0,
  priorFeeReversed = 0
): RefundSplit {
  if (!Number.isFinite(total) || total <= 0) throw new RangeError('total must be a positive finite number');
  if (!Number.isFinite(feeOriginal) || feeOriginal < 0) throw new RangeError('feeOriginal must be a non-negative finite number');
  const remaining = round2(total - priorAmount);
  if (!(amount >= 1)) throw new RangeError('Refund amount must be at least ₹1');
  if (amount > remaining) throw new RangeError('Refund amount exceeds the remaining refundable amount');

  const completes = round2(priorAmount + amount) === round2(total);
  const feeReversed = completes
    ? round2(feeOriginal - priorFeeReversed)
    : round2((feeOriginal * amount) / total);
  const netClawback = round2(amount - feeReversed);

  return { amount, feeReversed, netClawback, completes };
}
