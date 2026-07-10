import { describe, it, expect, afterAll, vi } from 'vitest';
import { fulfillOrder } from '@/lib/server/fulfillment';
import { initiateRefund, RefundError } from '@/lib/server/refunds';
import { availableBalance } from '@/lib/shared/balance';
import { World, hasCreds } from './world';

// Stub ONLY the Cashfree gateway — begin_refund / settle_refund run for real so the
// money-critical freeze-then-settle math is exercised against the DB.
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
  return { creator, buyer, productId, orderId };
}

describe.skipIf(!hasCreds())('refunds — freeze then settle', () => {
  const world = new World();
  afterAll(() => world.cleanup());

  it('full refund freezes the clawback, then settle reverses gross+fee, revokes access, marks order refunded', async () => {
    const { creator, orderId } = await completedOrder(world, 1000);

    const refund = await initiateRefund(world.db, {
      orderId,
      amount: null, // full remaining
      initiatedBy: 'creator',
      initiatorId: creator.profileId,
    });
    expect(refund.amount).toBe(1000);
    expect(refund.feeReversed).toBe(100);
    expect(refund.netClawback).toBe(900);

    // Freeze held before any settlement — balance not yet reversed.
    const frozenBal = await world.balance(creator.profileId);
    expect(Number(frozenBal?.total_earnings)).toBe(1000);
    expect(Number(frozenBal?.frozen_balance)).toBe(900);
    expect(availableBalance(frozenBal)).toBe(0); // 1000 - 100 fee - 900 frozen

    const { data: refundRow } = await world.db
      .from('refunds')
      .select('status, gateway_refund_id')
      .eq('id', refund.refundId)
      .single();
    expect(refundRow?.status).toBe('processing');
    expect(refundRow?.gateway_refund_id).toBe('cf_ref_test');

    // ── Terminal settlement via the webhook RPC ──
    const { data: settled } = await world.db.rpc('settle_refund', {
      p_refund_id: refund.refundId,
      p_terminal: 'success',
      p_gateway_refund_id: 'cf_ref_test',
    });
    expect(settled).toBe(true);

    const bal = await world.balance(creator.profileId);
    expect(Number(bal?.total_earnings)).toBe(0);
    expect(Number(bal?.total_platform_fees)).toBe(0);
    expect(Number(bal?.frozen_balance)).toBe(0);

    const { data: order } = await world.db.from('orders').select('status').eq('id', orderId).single();
    expect(order?.status).toBe('refunded');

    const { count: accessCount } = await world.db
      .from('user_product_access')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId);
    expect(accessCount).toBe(0); // access revoked on full refund

    const { data: debit } = await world.db
      .from('transaction_ledger')
      .select('amount, direction, tx_type')
      .eq('order_id', orderId)
      .eq('tx_type', 'refund');
    expect(debit).toHaveLength(1);
    expect(debit![0].direction).toBe('debit');
    expect(Number(debit![0].amount)).toBe(1000);

    const { count: reversedTax } = await world.db
      .from('tax_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .eq('status', 'reversed');
    expect(reversedTax).toBe(1);
  });

  it('partial refund reverses proportional fee and keeps the order completed + access intact', async () => {
    const { creator, orderId } = await completedOrder(world, 1000);

    const refund = await initiateRefund(world.db, {
      orderId,
      amount: 400,
      initiatedBy: 'creator',
      initiatorId: creator.profileId,
    });
    expect(refund.amount).toBe(400);
    expect(refund.feeReversed).toBe(40);
    expect(refund.netClawback).toBe(360);

    await world.db.rpc('settle_refund', { p_refund_id: refund.refundId, p_terminal: 'success', p_gateway_refund_id: 'cf_ref_test' });

    const bal = await world.balance(creator.profileId);
    expect(Number(bal?.total_earnings)).toBe(600);
    expect(Number(bal?.total_platform_fees)).toBe(60);
    expect(Number(bal?.frozen_balance)).toBe(0);
    expect(availableBalance(bal)).toBe(540);

    const { data: order } = await world.db.from('orders').select('status').eq('id', orderId).single();
    expect(order?.status).toBe('completed'); // not fully refunded

    const { count: accessCount } = await world.db
      .from('user_product_access')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId);
    expect(accessCount).toBe(1); // access retained on partial refund
  });

  it('refuses to refund an order that has no sale ledger row (begin_refund guard → missing_ledger)', async () => {
    const creator = await world.createUser('creator');
    await world.setKyc(creator.profileId, { panLast4: '4242' });
    const productId = await world.createProduct(creator.profileId, { price: 500 });
    // Completed + paid, but NEVER fulfilled → no transaction_ledger 'sale' row.
    const { orderId } = await world.createPendingOrder({
      creatorId: creator.profileId,
      productId,
      price: 500,
      status: 'completed',
      gatewayPaymentId: `cfpay_${world.runId}_noledger`,
      email: `buyer-${world.runId}@example.test`,
    });

    await expect(
      initiateRefund(world.db, { orderId, amount: null, initiatedBy: 'creator', initiatorId: creator.profileId })
    ).rejects.toMatchObject({ code: 'missing_ledger' });
  });

  it('blocks a second in-flight refund on the same order (one-processing-per-order)', async () => {
    const { creator, orderId } = await completedOrder(world, 1000);

    await initiateRefund(world.db, { orderId, amount: 400, initiatedBy: 'creator', initiatorId: creator.profileId });

    await expect(
      initiateRefund(world.db, { orderId, amount: 400, initiatedBy: 'creator', initiatorId: creator.profileId })
    ).rejects.toBeInstanceOf(RefundError);
    await expect(
      initiateRefund(world.db, { orderId, amount: 400, initiatedBy: 'creator', initiatorId: creator.profileId })
    ).rejects.toMatchObject({ code: 'invalid_state' });
  });
});
