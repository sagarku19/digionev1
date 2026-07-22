// Refund-request engine — SERVER ONLY. The creator files a request, which FREEZES the
// clawback immediately (create_refund_request RPC, reconcile-safe via wallet_frozen_logs).
// A super_admin later approves — the approve route runs the existing refund engine
// (initiateRefund → begin_refund → Cashfree) and releases the request-time hold — or
// rejects, which releases the hold. Mirrors refunds.ts error mapping.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type Db = SupabaseClient<Database>;

export type RefundRequestErrorCode =
  | 'not_found' | 'not_owner' | 'invalid_state' | 'over_refund'
  | 'missing_ledger' | 'reason_required' | 'already_pending' | 'internal';

export class RefundRequestError extends Error {
  constructor(public code: RefundRequestErrorCode, message: string) {
    super(message);
    this.name = 'RefundRequestError';
  }
}

// create_refund_request raises 'refundreq:<marker>' — map markers to app error codes.
const RPC_ERROR_MAP: Array<{ marker: string; code: RefundRequestErrorCode; message: string }> = [
  { marker: 'refundreq:reason_required', code: 'reason_required', message: 'A reason is required to request a refund.' },
  { marker: 'refundreq:order_not_found', code: 'not_found', message: 'Order not found.' },
  { marker: 'refundreq:not_owner', code: 'not_owner', message: 'You can only request refunds on your own orders.' },
  { marker: 'refundreq:order_not_completed', code: 'invalid_state', message: 'Only completed orders can be refunded.' },
  { marker: 'refundreq:order_not_paid', code: 'invalid_state', message: 'This order has no gateway payment to refund.' },
  { marker: 'refundreq:order_missing_creator', code: 'invalid_state', message: 'Order has no creator attached.' },
  { marker: 'refundreq:already_pending', code: 'already_pending', message: 'A refund request for this order is already awaiting review.' },
  { marker: 'refundreq:refund_in_flight', code: 'invalid_state', message: 'A refund for this order is already processing.' },
  { marker: 'refundreq:sale_ledger_missing', code: 'missing_ledger', message: 'Order is missing its sale ledger record — contact support.' },
  { marker: 'refundreq:amount_too_small', code: 'over_refund', message: 'Minimum refund is ₹1.' },
  { marker: 'refundreq:over_refund', code: 'over_refund', message: 'Amount exceeds the remaining refundable amount.' },
  { marker: 'refundreq:fee_split_anomaly', code: 'internal', message: 'Refund split anomaly — contact support.' },
  { marker: 'uq_refund_requests_one_pending_per_order', code: 'already_pending', message: 'A refund request for this order is already awaiting review.' },
];

export interface CreateRefundRequestInput {
  orderId: string;
  amount?: number | null;  // null/undefined = full remaining
  reason: string;
  creatorId: string;
}

export interface CreatedRefundRequest {
  requestId: string;
  amount: number;
  feeReversed: number;
  netClawback: number;
}

export async function createRefundRequest(db: Db, input: CreateRefundRequestInput): Promise<CreatedRefundRequest> {
  const { data, error } = await db.rpc('create_refund_request', {
    p_order_id: input.orderId,
    p_amount: input.amount ?? undefined,
    p_reason: input.reason,
    p_creator_id: input.creatorId,
  });

  if (error) {
    const hit = RPC_ERROR_MAP.find((m) => error.message.includes(m.marker));
    if (hit) throw new RefundRequestError(hit.code, hit.message);
    throw new RefundRequestError('internal', `Refund request failed: ${error.message}`);
  }

  const r = data as unknown as { request_id: string; amount: number; fee_reversed: number; net_clawback: number };
  return { requestId: r.request_id, amount: r.amount, feeReversed: r.fee_reversed, netClawback: r.net_clawback };
}
