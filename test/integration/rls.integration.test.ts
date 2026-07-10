import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fulfillOrder } from '@/lib/server/fulfillment';
import { World, hasCreds, anonClient, signInAs, type SeededUser } from './world';

// Proves the RLS policies actually isolate tenants: these use the anon key / a signed-in
// user's JWT (NOT the service role), so the DB enforces the same boundaries as the app.
describe.skipIf(!hasCreds())('RLS — cross-tenant isolation', () => {
  const world = new World();
  let A: SeededUser;
  let B: SeededUser;
  let buyerA: SeededUser;
  let buyerB: SeededUser;
  let orderA = '';
  let orderB = '';

  beforeAll(async () => {
    A = await world.createUser('creator');
    B = await world.createUser('creator');
    buyerA = await world.createUser('buyer');
    buyerB = await world.createUser('buyer');
    await world.setKyc(A.profileId, { panLast4: '4242' });
    await world.setKyc(B.profileId, { panLast4: '4242' });
    const pA = await world.createProduct(A.profileId, { price: 1000 });
    const pB = await world.createProduct(B.profileId, { price: 1000 });
    const oA = await world.createPendingOrder({ creatorId: A.profileId, productId: pA, price: 1000, buyerUserId: buyerA.authId, email: buyerA.email });
    const oB = await world.createPendingOrder({ creatorId: B.profileId, productId: pB, price: 1000, buyerUserId: buyerB.authId, email: buyerB.email });
    await fulfillOrder(oA.orderId, { gatewayPaymentId: `cf_${world.runId}_A` });
    await fulfillOrder(oB.orderId, { gatewayPaymentId: `cf_${world.runId}_B` });
    orderA = oA.orderId;
    orderB = oB.orderId;
  });
  afterAll(() => world.cleanup());

  it('anon cannot read a creator’s orders, balances, or ledger', async () => {
    const anon = anonClient();
    const { data: orders } = await anon.from('orders').select('id').eq('id', orderA);
    expect(orders ?? []).toHaveLength(0);
    const { data: bal } = await anon.from('creator_balances').select('creator_id').eq('creator_id', A.profileId);
    expect(bal ?? []).toHaveLength(0);
    const { data: ledger } = await anon.from('transaction_ledger').select('id').eq('order_id', orderA);
    expect(ledger ?? []).toHaveLength(0);
  });

  it('anon cannot insert into a revenue table', async () => {
    const anon = anonClient();
    const { error } = await anon.from('orders').insert({ total_amount: 1, status: 'pending' });
    expect(error).toBeTruthy();
  });

  it('a creator reads only their own balance + orders, never another creator’s', async () => {
    const clientA = await signInAs(A.email, A.password);

    const { data: ownBal } = await clientA.from('creator_balances').select('total_earnings').eq('creator_id', A.profileId);
    expect(ownBal ?? []).toHaveLength(1);
    const { data: otherBal } = await clientA.from('creator_balances').select('total_earnings').eq('creator_id', B.profileId);
    expect(otherBal ?? []).toHaveLength(0);

    const { data: ownOrders } = await clientA.from('orders').select('id').eq('creator_id', A.profileId);
    expect((ownOrders ?? []).length).toBeGreaterThanOrEqual(1);
    const { data: otherOrders } = await clientA.from('orders').select('id').eq('creator_id', B.profileId);
    expect(otherOrders ?? []).toHaveLength(0);
  });

  it('a creator cannot write to creator_balances (service-role only)', async () => {
    const clientA = await signInAs(A.email, A.password);
    await clientA.from('creator_balances').update({ total_earnings: 999999 }).eq('creator_id', A.profileId);
    // Service-role re-read: the tampered value never landed.
    const bal = await world.balance(A.profileId);
    expect(Number(bal?.total_earnings)).toBe(1000);
  });

  it('a buyer reads only their own product access', async () => {
    const clientBuyerA = await signInAs(buyerA.email, buyerA.password);
    const { data: mine } = await clientBuyerA.from('user_product_access').select('order_id');
    expect((mine ?? []).some((r) => r.order_id === orderA)).toBe(true);
    expect((mine ?? []).some((r) => r.order_id === orderB)).toBe(false);

    const clientBuyerB = await signInAs(buyerB.email, buyerB.password);
    const { data: theirs } = await clientBuyerB.from('user_product_access').select('order_id');
    expect((theirs ?? []).some((r) => r.order_id === orderA)).toBe(false);
  });
});
