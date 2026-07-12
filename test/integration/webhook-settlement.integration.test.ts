import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import crypto from 'crypto';
import { POST as pgWebhook } from '@/app/api/webhook/cashfree/route';
import { POST as payoutWebhook } from '@/app/api/webhook/cashfree-payout/route';
import { fulfillOrder } from '@/lib/server/fulfillment';
import { initiateRefund } from '@/lib/server/refunds';
import { World, hasCreds } from './world';

// Covers the two remaining webhook gates end-to-end (signature verified + settlement RPC
// executed) with a test-set secret — no external creds needed. Stub only the refund
// gateway so begin_refund/settle_refund run for real.
vi.mock('@/lib/server/cashfree-refunds', () => ({
  createRefund: vi.fn(async () => ({ accepted: true, cfRefundId: 'cf_ref_test', httpStatus: 200, raw: {} })),
  getRefund: vi.fn(async () => ({ status: 'SUCCESS', cfRefundId: 'cf_ref_test', httpStatus: 200, raw: {} })),
}));

const PG_SECRET = 'int_test_pg_secret';
const PAYOUT_SECRET = 'int_test_payout_secret';

const signJson = (raw: string) => crypto.createHmac('sha256', PG_SECRET).update(raw).digest('base64');
const signLegacy = (params: Record<string, string>) => {
  const data = Object.keys(params).filter((k) => k !== 'signature').sort().map((k) => params[k]).join('');
  return crypto.createHmac('sha256', PAYOUT_SECRET).update(data).digest('base64');
};

async function callPayoutWebhook(params: Record<string, string>, opts?: { badSig?: boolean }) {
  const signature = opts?.badSig ? 'Zm9yZ2Vk' : signLegacy(params);
  const body = new URLSearchParams({ ...params, signature }).toString();
  const res = await payoutWebhook(
    new Request('http://localhost/api/webhook/cashfree-payout', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    })
  );
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

async function processingPayout(world: World, amount: number) {
  const creator = await world.createUser('creator');
  await world.setKyc(creator.profileId, { panLast4: '4242' });
  const productId = await world.createProduct(creator.profileId, { price: 1000 });
  const { orderId } = await world.createPendingOrder({
    creatorId: creator.profileId,
    productId,
    price: 1000,
    email: `b-${world.runId}@example.test`,
  });
  await fulfillOrder(orderId, { gatewayPaymentId: `cf_${world.runId}_${orderId.slice(0, 6)}` });
  const { data: payout } = await world.db
    .from('creator_payouts')
    .insert({ creator_id: creator.profileId, amount, status: 'processing', currency: 'INR' })
    .select('id')
    .single();
  await world.db.from('creator_balances').update({ pending_payout: amount }).eq('creator_id', creator.profileId);
  return { creator, payoutId: payout!.id };
}

describe.skipIf(!hasCreds())('webhook settlement — payout webhook + PG refund routing', () => {
  const world = new World();
  let origPg: string | undefined;
  let origPayout: string | undefined;

  beforeAll(() => {
    origPg = process.env.CASHFREE_CLIENT_SECRET;
    origPayout = process.env.CASHFREE_PAYOUT_WEBHOOK_SECRET;
    process.env.CASHFREE_CLIENT_SECRET = PG_SECRET;
    process.env.CASHFREE_PAYOUT_WEBHOOK_SECRET = PAYOUT_SECRET;
  });
  afterAll(async () => {
    if (origPg === undefined) delete process.env.CASHFREE_CLIENT_SECRET;
    else process.env.CASHFREE_CLIENT_SECRET = origPg;
    if (origPayout === undefined) delete process.env.CASHFREE_PAYOUT_WEBHOOK_SECRET;
    else process.env.CASHFREE_PAYOUT_WEBHOOK_SECRET = origPayout;
    vi.restoreAllMocks();
    await world.cleanup();
  });

  // ── Cashfree Payouts webhook ──

  it('rejects a payout webhook with a forged signature (401)', async () => {
    const { status } = await callPayoutWebhook({ event: 'TRANSFER_SUCCESS', transferId: crypto.randomUUID() }, { badSig: true });
    expect(status).toBe(401);
  });

  it('TRANSFER_SUCCESS settles the payout: pays net, releases pending, writes ledger debit', async () => {
    const { creator, payoutId } = await processingPayout(world, 300);

    const { status } = await callPayoutWebhook({ event: 'TRANSFER_SUCCESS', transferId: payoutId, referenceId: 'cfpo_1' });
    expect(status).toBe(200);

    const bal = await world.balance(creator.profileId);
    expect(Number(bal?.total_paid_out)).toBe(300);
    expect(Number(bal?.pending_payout)).toBe(0);

    const { count } = await world.db
      .from('transaction_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('payout_id', payoutId)
      .eq('tx_type', 'payout');
    expect(count).toBe(1);

    const { data: row } = await world.db.from('creator_payouts').select('status').eq('id', payoutId).single();
    expect(row?.status).toBe('success');
  });

  it('TRANSFER_FAILED releases the reservation without paying out', async () => {
    const { creator, payoutId } = await processingPayout(world, 250);

    const { status } = await callPayoutWebhook({ event: 'TRANSFER_FAILED', transferId: payoutId, reason: 'bank_reject' });
    expect(status).toBe(200);

    const bal = await world.balance(creator.profileId);
    expect(Number(bal?.total_paid_out)).toBe(0);
    expect(Number(bal?.pending_payout)).toBe(0);

    const { count } = await world.db
      .from('transaction_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('payout_id', payoutId);
    expect(count).toBe(0);

    const { data: row } = await world.db.from('creator_payouts').select('status').eq('id', payoutId).single();
    expect(row?.status).toBe('failed');
  });

  it('acknowledges a valid-signature event for an unknown transfer without erroring (200)', async () => {
    const { status, body } = await callPayoutWebhook({ event: 'TRANSFER_SUCCESS', transferId: crypto.randomUUID(), referenceId: 'x' });
    expect(status).toBe(200);
    expect(body.received).toBe(true);
  });

  // ── PG refund-status webhook routing (/api/webhook/cashfree) ──

  it('REFUND_STATUS_WEBHOOK SUCCESS settles the refund: reverses balance, marks order refunded', async () => {
    const creator = await world.createUser('creator');
    const buyer = await world.createUser('buyer');
    await world.setKyc(creator.profileId, { panLast4: '4242' });
    const productId = await world.createProduct(creator.profileId, { price: 1000 });
    const { orderId } = await world.createPendingOrder({
      creatorId: creator.profileId,
      productId,
      price: 1000,
      buyerUserId: buyer.authId,
      email: buyer.email,
    });
    await fulfillOrder(orderId, { gatewayPaymentId: `cf_${world.runId}_rw` });
    const refund = await initiateRefund(world.db, { orderId, amount: null, initiatedBy: 'creator', initiatorId: creator.profileId });

    const payload = JSON.stringify({
      type: 'REFUND_STATUS_WEBHOOK',
      data: { refund: { refund_id: refund.merchantRefundId, cf_refund_id: 'cf_ref_1', refund_status: 'SUCCESS' } },
    });
    const res = await pgWebhook(
      new Request('http://localhost/api/webhook/cashfree', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-webhook-signature': signJson(payload) },
        body: payload,
      })
    );
    expect(res.status).toBe(200);

    const { data: order } = await world.db.from('orders').select('status').eq('id', orderId).single();
    expect(order?.status).toBe('refunded');
    const { data: r } = await world.db.from('refunds').select('status').eq('id', refund.refundId).single();
    expect(r?.status).toBe('success');
    const bal = await world.balance(creator.profileId);
    expect(Number(bal?.total_earnings)).toBe(0);
    expect(Number(bal?.frozen_balance)).toBe(0);
  });
});
