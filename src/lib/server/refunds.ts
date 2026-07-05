// Refund engine — SERVER ONLY. Single initiation path shared by the creator route
// and scripts/refund-admin.ts. Architecture (spec §5): begin_refund RPC freezes the
// clawback atomically → Cashfree create → gateway reject settles 'failed' immediately
// (freeze released). Terminal states arrive via the PG webhook or syncProcessingRefunds.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database.types';
import { createRefund, getRefund } from './cashfree-refunds';

type Db = SupabaseClient<Database>;

export type RefundErrorCode =
  | 'not_found' | 'invalid_state' | 'over_refund' | 'missing_ledger' | 'gateway' | 'internal';

export class RefundError extends Error {
  constructor(public code: RefundErrorCode, message: string) {
    super(message);
    this.name = 'RefundError';
  }
}

// begin_refund raises 'refund:<marker>' — map markers to app-level error codes.
const RPC_ERROR_MAP: Array<{ marker: string; code: RefundErrorCode; message: string }> = [
  { marker: 'refund:order_not_found', code: 'not_found', message: 'Order not found.' },
  { marker: 'refund:order_not_completed', code: 'invalid_state', message: 'Only completed orders can be refunded.' },
  { marker: 'refund:order_not_paid', code: 'invalid_state', message: 'This order has no gateway payment to refund.' },
  { marker: 'refund:order_missing_creator', code: 'invalid_state', message: 'Order has no creator attached.' },
  { marker: 'refund:sale_ledger_missing', code: 'missing_ledger', message: 'Order is missing its sale ledger record — contact support.' },
  { marker: 'refund:amount_too_small', code: 'over_refund', message: 'Minimum refund is ₹1.' },
  { marker: 'refund:over_refund', code: 'over_refund', message: 'Amount exceeds the remaining refundable amount.' },
  { marker: 'refund:fee_split_anomaly', code: 'internal', message: 'Refund split anomaly — contact support.' },
  // Unique partial index uq_refunds_one_processing_per_order (Task 11 migration): only one
  // in-flight refund per order — double-submit dedupe at the DB level.
  { marker: 'uq_refunds_one_processing_per_order', code: 'invalid_state', message: 'A refund for this order is already processing.' },
];

export interface InitiateRefundInput {
  orderId: string;
  amount?: number | null;     // null/undefined = full remaining
  reason?: string | null;
  initiatedBy: 'creator' | 'admin';
  initiatorId?: string | null;
}

export interface InitiatedRefund {
  refundId: string;
  merchantRefundId: string;
  amount: number;
  feeReversed: number;
  netClawback: number;
  creatorId: string;
}

interface BeginRefundResult {
  refund_id: string;
  merchant_refund_id: string;
  gateway_order_id: string;
  creator_id: string;
  amount: number;
  fee_reversed: number;
  net_clawback: number;
}

export async function initiateRefund(db: Db, input: InitiateRefundInput): Promise<InitiatedRefund> {
  const { data, error } = await db.rpc('begin_refund', {
    p_order_id: input.orderId,
    p_amount: input.amount ?? undefined,
    p_reason: input.reason ?? undefined,
    p_initiated_by: input.initiatedBy,
    p_initiator_id: input.initiatorId ?? undefined,
  });

  if (error) {
    const hit = RPC_ERROR_MAP.find((m) => error.message.includes(m.marker));
    if (hit) throw new RefundError(hit.code, hit.message);
    throw new RefundError('internal', `Refund initiation failed: ${error.message}`);
  }

  const begun = data as unknown as BeginRefundResult;

  const cf = await createRefund({
    gatewayOrderId: begun.gateway_order_id,
    refundId: begun.merchant_refund_id,
    amount: begun.amount,
    note: input.reason,
  });

  if (!cf.accepted) {
    // Release the hold immediately — no money moved. Idempotent (status claim).
    await db.rpc('settle_refund', {
      p_refund_id: begun.refund_id,
      p_terminal: 'failed',
      p_failure_reason: 'gateway_reject',
      p_gateway_metadata: { stage: 'create_reject', http_status: cf.httpStatus } as Json,
    });
    throw new RefundError('gateway', 'Payment gateway rejected the refund. The hold was released — try again later.');
  }

  if (cf.cfRefundId) {
    await db.from('refunds').update({ gateway_refund_id: cf.cfRefundId }).eq('id', begun.refund_id);
  }

  return {
    refundId: begun.refund_id,
    merchantRefundId: begun.merchant_refund_id,
    amount: begun.amount,
    feeReversed: begun.fee_reversed,
    netClawback: begun.net_clawback,
    creatorId: begun.creator_id,
  };
}

const SYNC_STALE_MINUTES = 15;  // matches /api/admin/payouts/sync

// Reconcile stuck 'processing' refunds by polling Cashfree. Terminal map is the
// verified contract: SUCCESS → success; CANCELLED/FAILED → failed; PENDING/ONHOLD →
// leave processing. Confirmed 404 past the stale cutoff = the refund never reached
// Cashfree (create failed after begin_refund) → settle failed, releasing the hold.
export async function syncProcessingRefunds(db: Db): Promise<{ checked: number; settled: number }> {
  const cutoff = new Date(Date.now() - SYNC_STALE_MINUTES * 60_000).toISOString();
  const { data: stuck } = await db
    .from('refunds')
    .select('id, merchant_refund_id, created_at, orders(gateway_order_id)')
    .eq('status', 'processing')
    .lt('created_at', cutoff)
    .limit(50);

  let settled = 0;
  for (const r of stuck ?? []) {
    const order = Array.isArray(r.orders) ? r.orders[0] : r.orders;
    if (!order?.gateway_order_id) continue;
    const { status, cfRefundId, httpStatus } = await getRefund(order.gateway_order_id, r.merchant_refund_id);
    const s = (status ?? '').toUpperCase();
    if (s === 'SUCCESS') {
      await db.rpc('settle_refund', {
        p_refund_id: r.id, p_terminal: 'success', p_gateway_refund_id: cfRefundId ?? undefined,
        p_gateway_metadata: { synced: true, status: s } as Json,
      });
      settled++;
    } else if (s === 'CANCELLED' || s === 'FAILED') {
      await db.rpc('settle_refund', {
        p_refund_id: r.id, p_terminal: 'failed', p_gateway_refund_id: cfRefundId ?? undefined,
        p_gateway_metadata: { synced: true, status: s } as Json, p_failure_reason: `synced_${s}`,
      });
      settled++;
    } else if (httpStatus === 404) {
      await db.rpc('settle_refund', {
        p_refund_id: r.id, p_terminal: 'failed',
        p_gateway_metadata: { synced: true, not_found: true } as Json, p_failure_reason: 'refund_not_found',
      });
      settled++;
    }
    // else PENDING/ONHOLD → leave processing.
  }
  return { checked: stuck?.length ?? 0, settled };
}
