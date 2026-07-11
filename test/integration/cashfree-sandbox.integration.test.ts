import { describe, it, expect, afterAll, vi } from 'vitest';
import { POST as checkout } from '@/app/api/checkout/create/route';
import { World, hasCashfree, cashfreeBaseUrl } from './world';

// ─────────────────────────────────────────────────────────────────────────────
// LIVE Cashfree sandbox e2e — SELF-SKIPS unless real PG sandbox creds are present.
//
// Enable by adding to .env.local (sandbox merchant creds from the Cashfree dashboard):
//   CASHFREE_ENVIRONMENT=SANDBOX
//   CASHFREE_CLIENT_ID=...
//   CASHFREE_CLIENT_SECRET=...
//   NEXT_PUBLIC_CASHFREE_ENV=SANDBOX
// then: npm run test:integration
//
// What this DOES cover (fully automatable): /api/checkout/create makes a REAL Cashfree
// sandbox order and returns a real payment_session_id, and the order can be read back
// from Cashfree with order_status ACTIVE + the correct amount (the same GET the
// /payment/status reconciliation path uses).
//
// What it CANNOT cover automatically (documented, do manually):
//   • Completing the hosted payment — needs a human on the Cashfree sandbox checkout
//     page (test card / UPI). There is no public "auto-pay" API for a session.
//   • Receiving the real webhook — Cashfree delivers to NEXT_PUBLIC_APP_URL/api/webhook/
//     cashfree, which must be a publicly reachable, deployed endpoint (not this test
//     process). The webhook signature gate itself is covered by webhook-security.*.
//   • After a real payment, drive /payment/status?order_id=… once — it polls Cashfree,
//     sees PAID, and runs fulfillOrder (the reconciliation path).
// ─────────────────────────────────────────────────────────────────────────────

const authState = vi.hoisted(() => ({ user: null as null | { id: string; email: string } }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: authState.user }, error: null }) } }),
}));

describe.skipIf(!hasCashfree())('LIVE Cashfree sandbox — order creation + status read', () => {
  const world = new World();
  afterAll(async () => {
    vi.restoreAllMocks();
    await world.cleanup();
  });

  it('creates a real sandbox order via /api/checkout/create and it reads back ACTIVE', async () => {
    const creator = await world.createUser('creator');
    await world.setKyc(creator.profileId, { panLast4: '4242' });
    const productId = await world.createProduct(creator.profileId, { price: 100 });
    authState.user = null; // guest checkout

    const req = new Request('http://localhost/api/checkout/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
      body: JSON.stringify({
        items: [{ id: productId }],
        contact: { name: 'Sandbox Buyer', email: 'sandbox-buyer@example.test', phone: '9999999999' },
      }),
    });
    const res = await checkout(req);
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.payment_session_id).toBeTruthy(); // real session from Cashfree sandbox
    expect(Number(body.amount)).toBe(100);
    world.trackOrder(body.orderId as string);

    const { data: order } = await world.db
      .from('orders')
      .select('status, total_amount, gateway_order_id')
      .eq('id', body.orderId as string)
      .single();
    expect(order?.status).toBe('pending');
    expect(Number(order?.total_amount)).toBe(100);

    // The same read the /payment/status reconciliation path performs.
    const cfRes = await fetch(`${cashfreeBaseUrl()}/orders/${order?.gateway_order_id}`, {
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID!,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET!,
      },
      cache: 'no-store',
    });
    const cfData = (await cfRes.json()) as { order_status?: string; order_amount?: number };
    expect(cfRes.ok).toBe(true);
    expect(cfData.order_status).toBe('ACTIVE');
    expect(Number(cfData.order_amount)).toBe(100);
  });
});
