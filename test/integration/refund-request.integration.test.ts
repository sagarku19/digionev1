import { describe, it, expect, afterAll, vi } from 'vitest';
import { fulfillOrder } from '@/lib/server/fulfillment';
import { initiateRefund } from '@/lib/server/refunds';
import { createRefundRequest, RefundRequestError } from '@/lib/server/refund-requests';
import { availableBalance } from '@/lib/shared/balance';
import { World, hasCreds } from './world';

// Stub ONLY the Cashfree gateway; the freeze/approve/settle RPCs run for real.
vi.mock('@/lib/server/cashfree-refunds', () => ({
  createRefund: vi.fn(async () => ({ accepted: true, cfRefundId: 'cf_ref_test', httpStatus: 200, raw: {} })),
  getRefund: vi.fn(async () => ({ status: 'SUCCESS', cfRefundId: 'cf_ref_test', httpStatus: 200, raw: {} })),
}));

async function completedOrder(world: World, price: number) {
  const creator = await world.createUser('creator');
  const buyer = await world.createUser('buyer');
  await world.setKyc(creator.profileId, { panLast4: '4242' });
  const productId = await world.createProduct(creator.profileId, { price });
  const { orderId } = await world.createPendingOrder({
    creatorId: creator.profileId,
    productId,
    price,
    buyerUserId: buyer.authId,
    email: buyer.email,
  });
  await fulfillOrder(orderId, { gatewayPaymentId: `cfpay_${world.runId}_${orderId.slice(0, 6)}` });
  return { creator, orderId };
}

describe.skipIf(!hasCreds())('refund requests — freeze on request, admin approve/reject', () => {
  const world = new World();
  afterAll(() => world.cleanup());

  it('request freezes the clawback; approve runs the refund and leaves exactly the refund hold; settle reverses', async () => {
    const { creator, orderId } = await completedOrder(world, 1000);

    // Creator requests a full refund → clawback frozen NOW, no refund row yet.
    const req = await createRefundRequest(world.db, {
      orderId,
      amount: null,
      reason: 'Customer asked for a refund',
      creatorId: creator.profileId,
    });
    expect(req.amount).toBe(1000);
    expect(req.netClawback).toBe(900);

    let bal = await world.balance(creator.profileId);
    expect(Number(bal?.total_earnings)).toBe(1000);
    expect(Number(bal?.frozen_balance)).toBe(900);
    expect(availableBalance(bal)).toBe(0);

    const { data: rr } = await world.db
      .from('refund_requests')
      .select('status, net_clawback, frozen_log_id')
      .eq('id', req.requestId)
      .single();
    expect(rr?.status).toBe('pending');
    expect(Number(rr?.net_clawback)).toBe(900);

    const { data: log } = await world.db
      .from('wallet_frozen_logs')
      .select('status, amount, source')
      .eq('id', rr!.frozen_log_id!)
      .single();
    expect(log?.status).toBe('frozen');
    expect(Number(log?.amount)).toBe(900);
    expect(log?.source).toBe('refund');

    // No refund row exists yet — the gateway hasn't been touched.
    const { count: refundsBefore } = await world.db
      .from('refunds')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId);
    expect(refundsBefore).toBe(0);

    // ── Admin approves: run the real refund engine, then finalize the request ──
    const refund = await initiateRefund(world.db, {
      orderId,
      amount: req.amount,
      reason: 'Customer asked for a refund',
      initiatedBy: 'admin',
      initiatorId: creator.profileId,
    });
    // Both holds are live for a moment (request + refund) — never under-frozen.
    bal = await world.balance(creator.profileId);
    expect(Number(bal?.frozen_balance)).toBe(1800);

    const { data: approved } = await world.db.rpc('approve_refund_request', {
      p_request_id: req.requestId,
      p_reviewer: creator.authId,
      p_refund_id: refund.refundId,
    });
    expect(approved).toBe(true);

    // Request hold released → only the refund's hold remains.
    bal = await world.balance(creator.profileId);
    expect(Number(bal?.frozen_balance)).toBe(900);

    const { data: rr2 } = await world.db
      .from('refund_requests')
      .select('status, refund_id')
      .eq('id', req.requestId)
      .single();
    expect(rr2?.status).toBe('approved');
    expect(rr2?.refund_id).toBe(refund.refundId);

    // ── Terminal settlement (webhook) reverses gross + fee and clears the freeze ──
    await world.db.rpc('settle_refund', { p_refund_id: refund.refundId, p_terminal: 'success', p_gateway_refund_id: 'cf_ref_test' });
    bal = await world.balance(creator.profileId);
    expect(Number(bal?.total_earnings)).toBe(0);
    expect(Number(bal?.total_platform_fees)).toBe(0);
    expect(Number(bal?.frozen_balance)).toBe(0);

    const { data: order } = await world.db.from('orders').select('status').eq('id', orderId).single();
    expect(order?.status).toBe('refunded');
  });

  it('reject releases the hold and moves no money', async () => {
    const { creator, orderId } = await completedOrder(world, 1000);

    const req = await createRefundRequest(world.db, {
      orderId,
      amount: 400,
      reason: 'testing reject',
      creatorId: creator.profileId,
    });
    expect(req.netClawback).toBe(360); // 400 − 40 proportional fee

    let bal = await world.balance(creator.profileId);
    expect(Number(bal?.frozen_balance)).toBe(360);

    const { data: rejected } = await world.db.rpc('reject_refund_request', {
      p_request_id: req.requestId,
      p_reviewer: creator.authId,
      p_reason: 'not a valid reason',
    });
    expect(rejected).toBe(true);

    bal = await world.balance(creator.profileId);
    expect(Number(bal?.frozen_balance)).toBe(0);
    expect(Number(bal?.total_earnings)).toBe(1000); // untouched
    expect(availableBalance(bal)).toBe(900);

    const { data: rr } = await world.db
      .from('refund_requests')
      .select('status, review_reason')
      .eq('id', req.requestId)
      .single();
    expect(rr?.status).toBe('rejected');
    expect(rr?.review_reason).toBe('not a valid reason');

    // No gateway refund was ever created.
    const { count } = await world.db
      .from('refunds')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId);
    expect(count).toBe(0);
  });

  it('rejects an empty reason and blocks a second pending request on the same order', async () => {
    const { creator, orderId } = await completedOrder(world, 500);

    await expect(
      createRefundRequest(world.db, { orderId, amount: null, reason: '   ', creatorId: creator.profileId })
    ).rejects.toMatchObject({ code: 'reason_required' });

    await createRefundRequest(world.db, { orderId, amount: 200, reason: 'first', creatorId: creator.profileId });
    await expect(
      createRefundRequest(world.db, { orderId, amount: 100, reason: 'second', creatorId: creator.profileId })
    ).rejects.toBeInstanceOf(RefundRequestError);
    await expect(
      createRefundRequest(world.db, { orderId, amount: 100, reason: 'second', creatorId: creator.profileId })
    ).rejects.toMatchObject({ code: 'already_pending' });
  });
});
