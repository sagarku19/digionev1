import { describe, it, expect, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as paymentLink } from '@/app/api/checkout/payment-link/route';
import { World, hasCreds } from './world';

// The payment-link route is public + service-role only (no cookie auth). Stub only the
// Cashfree order call; the site/payment_request/submission writes run for real.
async function callPaymentLink(payload: unknown, ip: string) {
  const req = new NextRequest('http://localhost/api/checkout/payment-link', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(payload),
  });
  const res = await paymentLink(req);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe.skipIf(!hasCreds())('checkout/payment-link — custom-amount submission', () => {
  const world = new World();
  afterAll(async () => {
    vi.restoreAllMocks();
    await world.cleanup();
  });

  it('rejects missing required fields (400)', async () => {
    const { status } = await callPaymentLink({ name: 'X', email: 'x@example.test' }, '192.168.5.1');
    expect(status).toBe(400);
  });

  it('rejects an amount below ₹1 (400)', async () => {
    const creator = await world.createUser('creator');
    const siteId = await world.createPaymentSite(creator.profileId);
    const { status } = await callPaymentLink(
      { siteId, name: 'X', email: 'x@example.test', amount: 0 },
      '192.168.5.2'
    );
    expect(status).toBe(400);
  });

  it('rejects an unknown / non-payment site (404)', async () => {
    const { status, body } = await callPaymentLink(
      { siteId: crypto.randomUUID(), name: 'X', email: 'x@example.test', amount: 100 },
      '192.168.5.3'
    );
    expect(status).toBe(404);
    expect(String(body.error)).toMatch(/not found/i);
  });

  it('creates a pending submission (pl_ gateway id) for a valid payment site', async () => {
    const creator = await world.createUser('creator');
    const siteId = await world.createPaymentSite(creator.profileId);

    const realFetch = global.fetch;
    vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('cashfree.com')) {
        return new Response(JSON.stringify({ payment_session_id: 'sess_pl_test', order_status: 'ACTIVE' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return realFetch(input, init);
    });

    const { status, body } = await callPaymentLink(
      { siteId, name: 'Buyer', email: 'buyer@example.test', amount: 250 },
      '192.168.5.4'
    );
    expect(status).toBe(200);
    expect(String(body.order_id)).toMatch(/^pl_/);
    expect(body.submission_id).toBeTruthy();
    expect(body.payment_session_id).toBe('sess_pl_test');

    const { data: sub } = await world.db
      .from('payment_submissions')
      .select('amount, payment_status, gateway_order_id')
      .eq('id', body.submission_id as string)
      .single();
    expect(Number(sub?.amount)).toBe(250);
    expect(sub?.payment_status).toBe('pending');
    expect(sub?.gateway_order_id).toBe(body.order_id);

    // The route auto-creates the payment_requests row for a valid payment site.
    const { count: prCount } = await world.db
      .from('payment_requests')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId);
    expect(prCount).toBe(1);
  });
});
