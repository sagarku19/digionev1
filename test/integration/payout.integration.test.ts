import { describe, it, expect, afterAll, vi } from 'vitest';
import { fulfillOrder } from '@/lib/server/fulfillment';
import { POST as requestPayout } from '@/app/api/payouts/request/route';
import { World, hasCreds } from './world';

// The payout route derives identity from the cookie session. Stub only that — the
// service-role balance/KYC/tax logic and all RPCs run for real against the DB.
const authState = vi.hoisted(() => ({ user: null as null | { id: string; email: string } }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: authState.user }, error: null }) },
  }),
}));

async function callPayout(amount: number, ip = '10.0.0.1') {
  const req = new Request('http://localhost/api/payouts/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ amount }),
  });
  const res = await requestPayout(req);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

// Give a creator a real, withdrawable balance by fulfilling a sale.
async function creatorWithBalance(world: World, saleAmount: number, kycStatus = 'verified') {
  const creator = await world.createUser('creator');
  await world.setKyc(creator.profileId, { status: kycStatus, panLast4: '4242' });
  await world.setDefaultPayoutMethod(creator.profileId);
  const productId = await world.createProduct(creator.profileId, { price: saleAmount });
  const { orderId } = await world.createPendingOrder({
    creatorId: creator.profileId,
    productId,
    price: saleAmount,
    email: `buyer-${world.runId}@example.test`,
  });
  await fulfillOrder(orderId, { gatewayPaymentId: `cfpay_${world.runId}_${orderId.slice(0, 6)}` });
  return creator;
}

describe.skipIf(!hasCreds())('payouts — request guards + settlement', () => {
  const world = new World();
  afterAll(() => world.cleanup());

  it('rejects an amount below the ₹100 minimum', async () => {
    const creator = await creatorWithBalance(world, 1000);
    authState.user = { id: creator.authId, email: creator.email };
    const { status, body } = await callPayout(50);
    expect(status).toBe(400);
    expect(String(body.error)).toMatch(/minimum/i);
  });

  it('rejects a payout when KYC is not verified (403)', async () => {
    const creator = await creatorWithBalance(world, 1000, 'pending');
    authState.user = { id: creator.authId, email: creator.email };
    const { status, body } = await callPayout(100);
    expect(status).toBe(403);
    expect(String(body.error)).toMatch(/KYC/i);
  });

  it('rejects a payout that exceeds the available balance (400)', async () => {
    const creator = await creatorWithBalance(world, 200); // available = 200 - 20 fee = 180
    authState.user = { id: creator.authId, email: creator.email };
    const { status, body } = await callPayout(500);
    expect(status).toBe(400);
    expect(String(body.error)).toMatch(/insufficient/i);
  });

  it('records a pending payout with tax withholding, and blocks a second in-flight request (409)', async () => {
    const creator = await creatorWithBalance(world, 1000); // available = 900
    authState.user = { id: creator.authId, email: creator.email };

    const first = await callPayout(300);
    expect(first.status).toBe(200);
    const payout = first.body.payout as Record<string, unknown>;
    expect(payout.status).toBe('pending');
    expect(Number(payout.amount)).toBe(300);
    expect(Number(payout.tds_withheld)).toBe(0); // PAN present, turnover < ₹5L
    expect(Number(payout.tcs_withheld)).toBe(0); // not GST-registered
    expect(Number(payout.net_amount)).toBe(300);

    const bal = await world.balance(creator.profileId);
    expect(Number(bal?.pending_payout)).toBe(300);

    // One in-flight payout at a time.
    const second = await callPayout(100);
    expect(second.status).toBe(409);
    expect(String(second.body.error)).toMatch(/in progress/i);
  });

  it('settle_payout(success) pays the net, releases the reservation, settles tax and writes a ledger debit', async () => {
    const creator = await creatorWithBalance(world, 1000);

    const { data: payout } = await world.db
      .from('creator_payouts')
      .insert({ creator_id: creator.profileId, amount: 500, status: 'pending', currency: 'INR' })
      .select('id')
      .single();
    await world.db.from('creator_balances').update({ pending_payout: 500 }).eq('creator_id', creator.profileId);
    await world.db.rpc('begin_payout_tax', { p_payout_id: payout!.id, p_creator_id: creator.profileId });

    const { data: ok } = await world.db.rpc('settle_payout', {
      p_payout_id: payout!.id,
      p_terminal: 'success',
      p_gateway_payout_id: 'gw_test_1',
    });
    expect(ok).toBe(true);

    const bal = await world.balance(creator.profileId);
    expect(Number(bal?.total_paid_out)).toBe(500);
    expect(Number(bal?.pending_payout)).toBe(0);

    const { data: ledger } = await world.db
      .from('transaction_ledger')
      .select('amount, direction, tx_type')
      .eq('payout_id', payout!.id);
    expect(ledger).toHaveLength(1);
    expect(ledger![0].tx_type).toBe('payout');
    expect(ledger![0].direction).toBe('debit');
    expect(Number(ledger![0].amount)).toBe(500);

    const { data: tax } = await world.db
      .from('tax_transactions')
      .select('settled')
      .eq('settling_payout_id', payout!.id);
    expect(tax!.every((t) => t.settled === true)).toBe(true);
  });

  it('settle_payout(failed) releases the reservation without paying out', async () => {
    const creator = await creatorWithBalance(world, 1000);

    const { data: payout } = await world.db
      .from('creator_payouts')
      .insert({ creator_id: creator.profileId, amount: 300, status: 'pending', currency: 'INR' })
      .select('id')
      .single();
    await world.db.from('creator_balances').update({ pending_payout: 300 }).eq('creator_id', creator.profileId);

    const { data: ok } = await world.db.rpc('settle_payout', {
      p_payout_id: payout!.id,
      p_terminal: 'failed',
      p_failure_reason: 'test_reject',
    });
    expect(ok).toBe(true);

    const bal = await world.balance(creator.profileId);
    expect(Number(bal?.total_paid_out)).toBe(0); // nothing paid
    expect(Number(bal?.pending_payout)).toBe(0); // reservation released

    const { count } = await world.db
      .from('transaction_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('payout_id', payout!.id);
    expect(count).toBe(0); // no payout ledger debit on failure
  });
});
