// Cashfree PG refunds client (v2023-08-01) — SERVER ONLY. Never import client-side.
// Same PG credentials + base URL convention as /api/checkout/create.
// Contract verified 2026-07-04: POST /orders/{order_id}/refunds { refund_id, refund_amount,
// refund_note? } → { cf_refund_id, refund_status, ... }; GET returns the same entity.
// refund_status ∈ SUCCESS | PENDING | CANCELLED | ONHOLD | FAILED.

const CASHFREE_ENV = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

function headers() {
  return {
    'Content-Type': 'application/json',
    'x-api-version': '2023-08-01',
    'x-client-id': process.env.CASHFREE_CLIENT_ID!,
    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET!,
  };
}

export interface CreateRefundInput {
  gatewayOrderId: string;   // orders.gateway_order_id (Cashfree order_id)
  refundId: string;         // our refunds.merchant_refund_id (idempotency key at Cashfree)
  amount: number;
  note?: string | null;
}

export async function createRefund(input: CreateRefundInput): Promise<{
  accepted: boolean;
  cfRefundId: string | null;
  httpStatus: number;
  raw: unknown;
}> {
  const note = input.note?.trim();
  const body: Record<string, unknown> = {
    refund_id: input.refundId,
    refund_amount: input.amount,
    // refund_note must be 3–100 chars when present
    ...(note && note.length >= 3 ? { refund_note: note.slice(0, 100) } : {}),
  };
  const res = await fetch(
    `${CASHFREE_ENV}/orders/${encodeURIComponent(input.gatewayOrderId)}/refunds`,
    { method: 'POST', headers: headers(), body: JSON.stringify(body), cache: 'no-store' }
  );
  const raw = await res.json().catch(() => ({}));
  const msg = JSON.stringify(raw).toLowerCase();
  // A duplicate refund_id means our earlier attempt reached Cashfree — treat as accepted
  // (the webhook/sync settles it), mirroring the payouts already-exists handling.
  const accepted = res.ok || msg.includes('already exist');
  const cfRefundId = (raw as { cf_refund_id?: string | number })?.cf_refund_id != null
    ? String((raw as { cf_refund_id?: string | number }).cf_refund_id)
    : null;
  return { accepted, cfRefundId, httpStatus: res.status, raw };
}

export async function getRefund(gatewayOrderId: string, refundId: string): Promise<{
  status: string | null;    // SUCCESS | PENDING | CANCELLED | ONHOLD | FAILED
  cfRefundId: string | null;
  httpStatus: number;
  raw: unknown;
}> {
  const res = await fetch(
    `${CASHFREE_ENV}/orders/${encodeURIComponent(gatewayOrderId)}/refunds/${encodeURIComponent(refundId)}`,
    { headers: headers(), cache: 'no-store' }
  );
  const raw = await res.json().catch(() => ({}));
  const entity = raw as { refund_status?: string; cf_refund_id?: string | number };
  return {
    status: entity?.refund_status ?? null,
    cfRefundId: entity?.cf_refund_id != null ? String(entity.cf_refund_id) : null,
    httpStatus: res.status,
    raw,
  };
}
