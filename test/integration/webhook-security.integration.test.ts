import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import crypto from 'crypto';
import { POST as webhook } from '@/app/api/webhook/cashfree/route';
import { World, hasCreds } from './world';

// The webhook's HMAC gate is the ONLY thing standing between the public internet and
// crediting a creator balance. These tests hit the real route end-to-end: forge the
// signature, confirm rejection; send a valid one, confirm real fulfillment + replay
// safety. CASHFREE_CLIENT_SECRET isn't in .env.local, so we set a test value here.
const SECRET = 'integration_test_webhook_secret';
const sign = (raw: string) => crypto.createHmac('sha256', SECRET).update(raw).digest('base64');

async function callWebhook(bodyObj: unknown, opts?: { signature?: string | null }) {
  const raw = JSON.stringify(bodyObj);
  const sig = opts && 'signature' in opts ? opts.signature : sign(raw);
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (sig !== null && sig !== undefined) headers['x-webhook-signature'] = sig;
  const res = await webhook(new Request('http://localhost/api/webhook/cashfree', { method: 'POST', headers, body: raw }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const paymentBody = (gatewayOrderId: string, status: string, cfPaymentId = `cfpay_wh_${Date.now()}`) => ({
  type: `PAYMENT_${status}_WEBHOOK`,
  data: { order: { order_id: gatewayOrderId }, payment: { payment_status: status, cf_payment_id: cfPaymentId } },
});

describe.skipIf(!hasCreds())('webhook/cashfree — signature gate + idempotent fulfillment', () => {
  const world = new World();
  let originalSecret: string | undefined;

  beforeAll(() => {
    originalSecret = process.env.CASHFREE_CLIENT_SECRET;
    process.env.CASHFREE_CLIENT_SECRET = SECRET;
  });
  afterAll(async () => {
    if (originalSecret === undefined) delete process.env.CASHFREE_CLIENT_SECRET;
    else process.env.CASHFREE_CLIENT_SECRET = originalSecret;
    vi.restoreAllMocks();
    await world.cleanup();
  });

  it('rejects a request with no signature (401)', async () => {
    const { status } = await callWebhook(paymentBody('ord_nope', 'SUCCESS'), { signature: null });
    expect(status).toBe(401);
  });

  it('rejects a forged signature (401)', async () => {
    const { status } = await callWebhook(paymentBody('ord_nope', 'SUCCESS'), { signature: 'Zm9yZ2Vk' });
    expect(status).toBe(401);
  });

  it('acknowledges an unknown envelope with a valid signature (200, no side effects)', async () => {
    const { status, body } = await callWebhook({ type: 'SOME_OTHER_EVENT', data: {} });
    expect(status).toBe(200);
    expect(body.received).toBe(true);
  });

  it('acknowledges a valid-signature SUCCESS for an unknown order without throwing (200)', async () => {
    const { status, body } = await callWebhook(paymentBody(`ord_${crypto.randomUUID().replace(/-/g, '')}`, 'SUCCESS'));
    expect(status).toBe(200);
    expect(body.received).toBe(true);
  });

  it('fulfills a real order on valid-signature SUCCESS, and is idempotent on replay', async () => {
    const creator = await world.createUser('creator');
    await world.setKyc(creator.profileId, { panLast4: '4242' });
    const productId = await world.createProduct(creator.profileId, { price: 1000 });
    const { orderId, gatewayOrderId } = await world.createPendingOrder({
      creatorId: creator.profileId,
      productId,
      price: 1000,
      email: `buyer-${world.runId}@example.test`,
    });

    const body = paymentBody(gatewayOrderId, 'SUCCESS', `cfpay_wh_${world.runId}`);
    const first = await callWebhook(body);
    expect(first.status).toBe(200);

    const order = await world.db.from('orders').select('status').eq('id', orderId).single();
    expect(order.data?.status).toBe('completed');
    const bal = await world.balance(creator.profileId);
    expect(Number(bal?.total_earnings)).toBe(1000);
    expect(Number(bal?.total_platform_fees)).toBe(100);

    // Replay the identical webhook — no double credit.
    const replay = await callWebhook(body);
    expect(replay.status).toBe(200);
    const bal2 = await world.balance(creator.profileId);
    expect(Number(bal2?.total_earnings)).toBe(1000);
    expect(Number(bal2?.total_platform_fees)).toBe(100);
  });

  it('marks the order failed on valid-signature FAILED', async () => {
    const creator = await world.createUser('creator');
    const productId = await world.createProduct(creator.profileId, { price: 1000 });
    const { orderId, gatewayOrderId } = await world.createPendingOrder({
      creatorId: creator.profileId,
      productId,
      price: 1000,
      email: `buyer-${world.runId}@example.test`,
    });

    const { status } = await callWebhook(paymentBody(gatewayOrderId, 'FAILED'));
    expect(status).toBe(200);

    const order = await world.db.from('orders').select('status').eq('id', orderId).single();
    expect(order.data?.status).toBe('failed');

    // No balance credited for a failed payment.
    const bal = await world.balance(creator.profileId);
    expect(Number(bal?.total_earnings ?? 0)).toBe(0);
  });
});
