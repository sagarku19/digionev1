import { describe, it, expect, afterAll } from 'vitest';
import crypto from 'crypto';
import { fulfillOrder, fulfillPaymentLinkSubmission } from '@/lib/server/fulfillment';
import { availableBalance } from '@/lib/shared/balance';
import { World, hasCreds } from './world';

const saleHash = (orderId: string, cfPaymentId: string) =>
  crypto.createHash('sha256').update(`${orderId}:${cfPaymentId}`).digest('hex');

// transaction_ledger.record_hash is a bytea column holding the UTF8 bytes of the
// hex digest, so PostgREST returns it as '\x…'. Decode back to the logical hex.
const decodeHash = (v: unknown) => Buffer.from(String(v).replace(/^\\x/, ''), 'hex').toString('utf8');

// The full credit path exercised against real RPCs (credit_creator_balance,
// record_sale_tax) and real tables. This is the heart of "money enters DigiOne".
describe.skipIf(!hasCreds())('fulfillment — money credit + idempotency', () => {
  const world = new World();
  afterAll(() => world.cleanup());

  it('credits gross earnings, writes the sale ledger + tax rows, grants access, and is idempotent on replay', async () => {
    const creator = await world.createUser('creator');
    const buyer = await world.createUser('buyer');
    await world.setKyc(creator.profileId, { status: 'verified', panLast4: '4242' }); // PAN present, under ₹5L → TDS 0
    const productId = await world.createProduct(creator.profileId, { price: 1000 });
    const { orderId } = await world.createPendingOrder({
      creatorId: creator.profileId,
      productId,
      price: 1000,
      buyerUserId: buyer.authId,
      email: buyer.email,
    });

    const cfPaymentId = `cfpay_${world.runId}_1`;
    const res = await fulfillOrder(orderId, { gatewayPaymentId: cfPaymentId });
    expect(res).toEqual({ fulfilled: true, alreadyFulfilled: false });

    // Order flipped to completed with the payment id recorded.
    const { data: order } = await world.db
      .from('orders')
      .select('status, gateway_payment_id, payment_verified_at')
      .eq('id', orderId)
      .single();
    expect(order?.status).toBe('completed');
    expect(order?.gateway_payment_id).toBe(cfPaymentId);
    expect(order?.payment_verified_at).toBeTruthy();

    // Balance holds GROSS earnings; availableBalance subtracts the fee.
    const bal = await world.balance(creator.profileId);
    expect(Number(bal?.total_earnings)).toBe(1000);
    expect(Number(bal?.total_platform_fees)).toBe(100); // 10% Free-tier fee
    expect(availableBalance(bal)).toBe(900);

    // Ledger sale row with the deterministic replay-safe hash.
    const { data: ledger } = await world.db
      .from('transaction_ledger')
      .select('amount, direction, tx_type, record_hash, meta')
      .eq('order_id', orderId)
      .eq('tx_type', 'sale');
    expect(ledger).toHaveLength(1);
    expect(Number(ledger![0].amount)).toBe(1000);
    expect(ledger![0].direction).toBe('credit');
    expect(decodeHash(ledger![0].record_hash)).toBe(saleHash(orderId, cfPaymentId));
    expect(Number((ledger![0].meta as { platform_fee: number }).platform_fee)).toBe(100);
    expect(Number((ledger![0].meta as { net_amount: number }).net_amount)).toBe(900);

    // Tax snapshot: 18% GST-inclusive commission split, TDS/TCS 0 for this creator.
    const { data: tax } = await world.db
      .from('tax_transactions')
      .select('gross_amount, commission_gross, commission_net, gst_on_commission, tds_amount, tcs_amount, status')
      .eq('order_id', orderId)
      .eq('status', 'posted');
    expect(tax).toHaveLength(1);
    expect(Number(tax![0].gross_amount)).toBe(1000);
    expect(Number(tax![0].commission_gross)).toBe(100);
    expect(Number(tax![0].commission_net)).toBe(84.75);
    expect(Number(tax![0].gst_on_commission)).toBe(15.25);
    expect(Number(tax![0].tds_amount)).toBe(0);
    expect(Number(tax![0].tcs_amount)).toBe(0);

    // Access granted to the logged-in buyer, with the durable snapshot.
    const { data: access } = await world.db
      .from('user_product_access')
      .select('product_name, snapshot_metadata')
      .eq('order_id', orderId)
      .eq('user_id', buyer.authId);
    expect(access).toHaveLength(1);
    expect(access![0].product_name).toBeTruthy();

    // ── Replay: the atomic claim makes a second fulfillment a no-op ──
    const replay = await fulfillOrder(orderId, { gatewayPaymentId: cfPaymentId });
    expect(replay).toEqual({ fulfilled: false, alreadyFulfilled: true });

    const bal2 = await world.balance(creator.profileId);
    expect(Number(bal2?.total_earnings)).toBe(1000); // NOT 2000 — no double credit
    expect(Number(bal2?.total_platform_fees)).toBe(100);

    const { count: ledgerCount } = await world.db
      .from('transaction_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .eq('tx_type', 'sale');
    expect(ledgerCount).toBe(1);

    const { count: taxCount } = await world.db
      .from('tax_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .eq('status', 'posted');
    expect(taxCount).toBe(1);
  });

  it('routes a guest purchase to guest_entitlements (no user_product_access)', async () => {
    const creator = await world.createUser('creator');
    await world.setKyc(creator.profileId, { panLast4: '4242' });
    const productId = await world.createProduct(creator.profileId, { price: 500 });
    const guestEmail = `guest-${world.runId}-${crypto.randomUUID().slice(0, 6)}@example.test`;
    const { orderId } = await world.createPendingOrder({
      creatorId: creator.profileId,
      productId,
      price: 500,
      buyerUserId: null,
      email: guestEmail,
    });

    await fulfillOrder(orderId, { gatewayPaymentId: `cfpay_${world.runId}_g` });

    const { data: guest } = await world.db
      .from('guest_entitlements')
      .select('product_id, email')
      .eq('order_id', orderId);
    expect(guest).toHaveLength(1);
    expect(guest![0].product_id).toBe(productId);

    const { count: accessCount } = await world.db
      .from('user_product_access')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId);
    expect(accessCount).toBe(0);
  });

  it('a free order (total 0) credits nothing and still grants access (no sale ledger row for ₹0)', async () => {
    const creator = await world.createUser('creator');
    const buyer = await world.createUser('buyer');
    await world.setKyc(creator.profileId, { panLast4: '4242' });
    const productId = await world.createProduct(creator.profileId, { price: 0 });
    const { orderId } = await world.createPendingOrder({
      creatorId: creator.profileId,
      productId,
      price: 0,
      buyerUserId: buyer.authId,
      email: buyer.email,
    });

    const res = await fulfillOrder(orderId);
    expect(res).toEqual({ fulfilled: true, alreadyFulfilled: false });

    // Balance row exists at zero; nothing was earned.
    const bal = await world.balance(creator.profileId);
    expect(Number(bal?.total_earnings ?? 0)).toBe(0);

    // No sale ledger row: fulfillment skips the ledger insert for ₹0 orders
    // (transaction_ledger enforces amount > 0 — a free order moves no money).
    const { count: ledgerCount } = await world.db
      .from('transaction_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .eq('tx_type', 'sale');
    expect(ledgerCount).toBe(0);

    // Access is still granted — a free product is a real entitlement.
    const { count } = await world.db
      .from('user_product_access')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId);
    expect(count).toBe(1);
  });

  it('funds referral commission from the platform fee, leaving seller proceeds intact', async () => {
    const seller = await world.createUser('creator');
    const referrer = await world.createUser('creator');
    await world.setKyc(seller.profileId, { panLast4: '4242' });
    const productId = await world.createProduct(seller.profileId, { price: 1000 });
    const { orderId } = await world.createPendingOrder({
      creatorId: seller.profileId,
      productId,
      price: 1000,
      email: `buyer-${world.runId}@example.test`,
    });
    const codeId = await world.createReferralCode(referrer.profileId);
    await world.addPendingReferral(orderId, codeId, referrer.profileId, 5); // 5% reward

    await fulfillOrder(orderId, { gatewayPaymentId: `cfpay_${world.runId}_r` });

    // Seller unchanged by the referral (commission comes from the platform's fee).
    const sellerBal = await world.balance(seller.profileId);
    expect(Number(sellerBal?.total_earnings)).toBe(1000);
    expect(Number(sellerBal?.total_platform_fees)).toBe(100);

    // Referrer credited min(5% * 1000 = 50, platformFee 100) = 50.
    const refBal = await world.balance(referrer.profileId);
    expect(Number(refBal?.total_earnings)).toBe(50);
    expect(Number(refBal?.total_platform_fees)).toBe(0);

    const { data: ref } = await world.db
      .from('order_referrals')
      .select('status, commission_amount')
      .eq('order_id', orderId)
      .single();
    expect(ref?.status).toBe('settled');
    expect(Number(ref?.commission_amount)).toBe(50);

    const { data: refLedger } = await world.db
      .from('transaction_ledger')
      .select('amount, tx_type')
      .eq('order_id', orderId)
      .eq('tx_type', 'referral_commission');
    expect(refLedger).toHaveLength(1);
    expect(Number(refLedger![0].amount)).toBe(50);
  });

  it('redeems the coupon (increments current_uses) when the order carries a coupon_id', async () => {
    const creator = await world.createUser('creator');
    await world.setKyc(creator.profileId, { panLast4: '4242' });
    const productId = await world.createProduct(creator.profileId, { price: 1000 });
    const couponId = await world.createCoupon(creator.profileId, { percent: 10 });
    const { orderId } = await world.createPendingOrder({
      creatorId: creator.profileId,
      productId,
      price: 900, // 10% off — the route already computed the discounted total
      email: `buyer-${world.runId}@example.test`,
      couponId,
    });

    await fulfillOrder(orderId, { gatewayPaymentId: `cfpay_${world.runId}_c` });

    const { data: coupon } = await world.db
      .from('coupons')
      .select('current_uses')
      .eq('id', couponId)
      .single();
    expect(coupon?.current_uses).toBe(1);
  });

  it('fulfillPaymentLinkSubmission credits the creator resolved via site ownership', async () => {
    const creator = await world.createUser('creator');
    await world.setKyc(creator.profileId, { panLast4: '4242' });
    const { submissionId } = await world.createPaymentLinkSubmission(creator.profileId, 500);

    const cfPaymentId = `cfpay_${world.runId}_pl`;
    const res = await fulfillPaymentLinkSubmission(submissionId, cfPaymentId);
    expect(res).toEqual({ fulfilled: true, alreadyFulfilled: false });

    const { data: sub } = await world.db
      .from('payment_submissions')
      .select('payment_status')
      .eq('id', submissionId)
      .single();
    expect(sub?.payment_status).toBe('completed');

    const bal = await world.balance(creator.profileId);
    expect(Number(bal?.total_earnings)).toBe(500);
    expect(Number(bal?.total_platform_fees)).toBe(50);

    const plHash = crypto.createHash('sha256').update(`pl:${submissionId}:${cfPaymentId}`).digest('hex');
    const { data: ledger } = await world.db
      .from('transaction_ledger')
      .select('record_hash, tx_type')
      .eq('record_hash', plHash);
    expect(ledger).toHaveLength(1);
    expect(ledger![0].tx_type).toBe('payment_link');

    // Idempotent replay.
    const replay = await fulfillPaymentLinkSubmission(submissionId, cfPaymentId);
    expect(replay).toEqual({ fulfilled: false, alreadyFulfilled: true });
    const bal2 = await world.balance(creator.profileId);
    expect(Number(bal2?.total_earnings)).toBe(500);
  });
});
