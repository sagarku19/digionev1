import { describe, it, expect, afterAll, vi } from 'vitest';
import { POST as checkout } from '@/app/api/checkout/create/route';
import { World, hasCreds } from './world';

// Checkout allows anonymous buyers, so the cookie client just needs to resolve a
// (null) user. Stub that; everything else — price re-fetch, single-creator rule,
// order insert, free-order fulfillment — runs for real.
const authState = vi.hoisted(() => ({ user: null as null | { id: string; email: string } }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: authState.user }, error: null }) },
  }),
}));

async function callCheckout(payload: unknown, ip: string) {
  const req = new Request('http://localhost/api/checkout/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(payload),
  });
  const res = await checkout(req);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const CONTACT = { name: 'Test Buyer', email: 'checkout-buyer@example.test', phone: '9999999999' };

describe.skipIf(!hasCreds())('checkout/create — server-side price + cart integrity', () => {
  const world = new World();
  afterAll(async () => {
    vi.restoreAllMocks();
    await world.cleanup();
  });

  it('rejects an empty cart (400)', async () => {
    authState.user = null;
    const { status } = await callCheckout({ items: [], contact: CONTACT }, '172.16.0.1');
    expect(status).toBe(400);
  });

  it('rejects an unpublished product (400)', async () => {
    const creator = await world.createUser('creator');
    const productId = await world.createProduct(creator.profileId, { price: 500, published: false });
    authState.user = null;
    const { status, body } = await callCheckout({ items: [{ id: productId }], contact: CONTACT }, '172.16.0.2');
    expect(status).toBe(400);
    expect(String(body.error)).toMatch(/not available/i);
  });

  it('rejects a cart mixing two creators (400)', async () => {
    const a = await world.createUser('creator');
    const b = await world.createUser('creator');
    const pa = await world.createProduct(a.profileId, { price: 100 });
    const pb = await world.createProduct(b.profileId, { price: 100 });
    authState.user = null;
    const { status, body } = await callCheckout({ items: [{ id: pa }, { id: pb }], contact: CONTACT }, '172.16.0.3');
    expect(status).toBe(400);
    expect(String(body.error)).toMatch(/different creators/i);
  });

  it('IGNORES a client-supplied price and charges the DB price (anti-tamper)', async () => {
    const creator = await world.createUser('creator');
    await world.setKyc(creator.profileId, { panLast4: '4242' });
    const productId = await world.createProduct(creator.profileId, { price: 500 });
    authState.user = null;

    // Intercept ONLY the Cashfree order call; let Supabase's own fetch through.
    const realFetch = global.fetch;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('cashfree.com')) {
        return new Response(JSON.stringify({ payment_session_id: 'sess_test', order_status: 'ACTIVE' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return realFetch(input, init);
    });

    try {
      const { status, body } = await callCheckout(
        { items: [{ id: productId, price: 99999 }], contact: CONTACT }, // client lies about price
        '172.16.0.4'
      );
      expect(status).toBe(200);
      expect(Number(body.amount)).toBe(500); // DB price, not 99999
      world.trackOrder(body.orderId as string);

      const { data: order } = await world.db.from('orders').select('total_amount').eq('id', body.orderId as string).single();
      expect(Number(order?.total_amount)).toBe(500);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('short-circuits a free product to completed without touching the gateway, and grants a guest entitlement', async () => {
    const creator = await world.createUser('creator');
    await world.setKyc(creator.profileId, { panLast4: '4242' });
    const productId = await world.createProduct(creator.profileId, { price: 0 });
    authState.user = null;

    const { status, body } = await callCheckout({ items: [{ id: productId }], contact: CONTACT }, '172.16.0.5');
    expect(status).toBe(200);
    expect(body.status).toBe('completed');
    expect(Number(body.amount)).toBe(0);
    world.trackOrder(body.orderId as string);

    const { data: order } = await world.db.from('orders').select('status, total_amount').eq('id', body.orderId as string).single();
    expect(order?.status).toBe('completed');
    expect(Number(order?.total_amount)).toBe(0);

    const { count } = await world.db
      .from('guest_entitlements')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', body.orderId as string);
    expect(count).toBe(1);
  });
});
