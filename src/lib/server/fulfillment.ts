// Single shared fulfillment for paid/free orders and payment-link submissions.
// The atomic status claim (pending → completed) is the idempotency mechanism:
// whoever wins the claim (webhook or status page) runs the side effects exactly once.
// Server-only (service role).

import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { getPlatformFeeRate } from './platform-fee';
import { computeReferralCommission } from './referrals';

export interface FulfillResult {
  fulfilled: boolean;
  alreadyFulfilled: boolean;
}

export async function fulfillOrder(
  orderId: string,
  opts?: { gatewayPaymentId?: string }
): Promise<FulfillResult> {
  const db = createServiceClient();

  // 1. Atomic claim — only one caller flips pending → completed
  const { data: claimed, error: claimErr } = await db
    .from('orders')
    .update({
      status: 'completed',
      gateway_payment_id: opts?.gatewayPaymentId ?? null,
      payment_verified_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('id, user_id, total_amount, creator_id, metadata')
    .maybeSingle();

  if (claimErr) throw claimErr;
  if (!claimed) return { fulfilled: false, alreadyFulfilled: true };

  const metadata = (claimed.metadata ?? {}) as Record<string, unknown>;
  const creatorId =
    claimed.creator_id ??
    (typeof metadata.creator_profile_id === 'string' ? metadata.creator_profile_id : null);

  const total = Number(claimed.total_amount) || 0;
  const feeRate = await getPlatformFeeRate(creatorId);
  const platformFee = total * feeRate;
  const creatorProceeds = total - platformFee;

  // 2. Credit creator (atomic RPC — no read-modify-write race)
  if (creatorId) {
    const { error: creditErr } = await db.rpc('credit_creator_balance', {
      p_creator_id: creatorId,
      p_earnings_delta: creatorProceeds,
      p_fees_delta: platformFee,
    });
    if (creditErr) {
      console.error('[fulfillment] credit_creator_balance failed for order', orderId, creditErr.message);
    }
  } else {
    console.error('[fulfillment] order has no creator_id and no metadata.creator_profile_id — needs reconciliation:', orderId);
  }

  // 3. Ledger row — deterministic hash makes replays unique-violation no-ops
  const recordHash = crypto
    .createHash('sha256')
    .update(`${orderId}:${opts?.gatewayPaymentId ?? 'free'}`)
    .digest('hex');

  const { error: ledgerErr } = await db.from('transaction_ledger').insert({
    creator_id: creatorId,
    order_id: orderId,
    amount: total,
    direction: 'credit',
    tx_type: 'sale',
    currency: 'INR',
    record_hash: recordHash,
    meta: {
      platform_fee: platformFee,
      net_amount: creatorProceeds,
      ...(creatorId ? {} : { needs_reconciliation: true }),
    },
  });
  if (ledgerErr) {
    console.error('[fulfillment] ledger insert failed for order', orderId, ledgerErr.message);
  }

  // 4. Grant durable access for logged-in buyers (guests keep status-page links)
  const buyerUserId = claimed.user_id;
  if (buyerUserId) {
    const { data: items, error: itemsErr } = await db
      .from('order_items')
      .select('product_id, price_at_purchase, products(name, product_link)')
      .eq('order_id', orderId);

    if (itemsErr) {
      console.error('[fulfillment] order_items read failed for order', orderId, itemsErr.message);
    }

    for (const item of items ?? []) {
      if (!item.product_id) continue;
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const { error: accessErr } = await db.from('user_product_access').upsert(
        {
          user_id: buyerUserId,
          order_id: orderId,
          product_id: item.product_id,
          product_name: product?.name ?? 'Product',
          product_link: product?.product_link ?? '',
          product_price: Number(item.price_at_purchase) || 0,
        },
        { onConflict: 'order_id,product_id', ignoreDuplicates: true }
      );
      if (accessErr) {
        console.error('[fulfillment] access grant failed for order', orderId, 'product', item.product_id, accessErr.message);
      }
    }
  }

  // 5. Coupon redemption
  const couponId = typeof metadata.coupon_id === 'string' ? metadata.coupon_id : null;
  if (couponId) {
    const { error: couponErr } = await db.rpc('increment_coupon_uses', { p_coupon_id: couponId });
    if (couponErr) {
      console.error('[fulfillment] coupon increment failed for order', orderId, couponErr.message);
    }
  }

  // 6. Notify the creator
  if (creatorId) {
    const { error: notifyErr } = await db.from('notifications').insert({
      recipient_creator_id: creatorId,
      title: 'New Sale!',
      message: `You earned ₹${creatorProceeds.toFixed(0)} from a new order`,
      type: 'sale',
    });
    if (notifyErr) {
      console.error('[fulfillment] notification insert failed for order', orderId, notifyErr.message);
    }
  }

  // 7. Referral commission — platform-fee-funded, idempotent via status claim
  if (creatorId && total > 0) {
    const { data: settled } = await db
      .from('order_referrals')
      .update({ status: 'settled' })
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .select('referrer_creator_id, metadata')
      .maybeSingle();

    if (settled?.referrer_creator_id) {
      const rewardPercent = Number((settled.metadata as { reward_percent?: number } | null)?.reward_percent ?? 0);
      const commission = computeReferralCommission(total, rewardPercent, platformFee);
      if (commission > 0) {
        await db.from('order_referrals').update({ commission_amount: commission }).eq('order_id', orderId);
        const { error: refCreditErr } = await db.rpc('credit_creator_balance', {
          p_creator_id: settled.referrer_creator_id,
          p_earnings_delta: commission,
          p_fees_delta: 0,
        });
        if (refCreditErr) console.error('[fulfillment] referral credit failed for order', orderId, refCreditErr.message);

        const refHash = crypto.createHash('sha256').update(`${orderId}:ref:${opts?.gatewayPaymentId ?? 'free'}`).digest('hex');
        const { error: refLedgerErr } = await db.from('transaction_ledger').insert({
          creator_id: settled.referrer_creator_id,
          order_id: orderId,
          amount: commission,
          direction: 'credit',
          tx_type: 'referral_commission',
          currency: 'INR',
          record_hash: refHash,
          meta: { source_order: orderId, reward_percent: rewardPercent },
        });
        if (refLedgerErr) console.error('[fulfillment] referral ledger failed for order', orderId, refLedgerErr.message);

        await db.from('notifications').insert({
          recipient_creator_id: settled.referrer_creator_id,
          title: 'Referral commission earned!',
          message: `You earned ₹${commission.toFixed(0)} from a referral`,
          type: 'sale',
        });
      }
    }
  }

  return { fulfilled: true, alreadyFulfilled: false };
}

export async function fulfillPaymentLinkSubmission(
  submissionId: string,
  gatewayPaymentId?: string
): Promise<FulfillResult> {
  const db = createServiceClient();

  // 1. Atomic claim on payment_submissions
  const { data: claimed, error: claimErr } = await db
    .from('payment_submissions')
    .update({ payment_status: 'completed' })
    .eq('id', submissionId)
    .eq('payment_status', 'pending')
    .select('id, amount, payment_request_id')
    .maybeSingle();

  if (claimErr) throw claimErr;
  if (!claimed) return { fulfilled: false, alreadyFulfilled: true };

  // 2. Resolve creator: payment_requests → sites.creator_id
  let creatorId: string | null = null;
  const { data: payRequest } = await db
    .from('payment_requests')
    .select('site_id')
    .eq('id', claimed.payment_request_id)
    .maybeSingle();
  if (payRequest?.site_id) {
    const { data: site } = await db
      .from('sites')
      .select('creator_id')
      .eq('id', payRequest.site_id)
      .maybeSingle();
    creatorId = site?.creator_id ?? null;
  }

  const amount = Number(claimed.amount) || 0;
  const feeRate = await getPlatformFeeRate(creatorId);
  const platformFee = amount * feeRate;
  const creatorProceeds = amount - platformFee;

  if (creatorId) {
    const { error: creditErr } = await db.rpc('credit_creator_balance', {
      p_creator_id: creatorId,
      p_earnings_delta: creatorProceeds,
      p_fees_delta: platformFee,
    });
    if (creditErr) {
      console.error('[fulfillment] credit_creator_balance failed for submission', submissionId, creditErr.message);
    }
  } else {
    console.error('[fulfillment] payment-link submission has no resolvable creator — needs reconciliation:', submissionId);
  }

  const recordHash = crypto
    .createHash('sha256')
    .update(`pl:${submissionId}:${gatewayPaymentId ?? ''}`)
    .digest('hex');

  const { error: ledgerErr } = await db.from('transaction_ledger').insert({
    creator_id: creatorId,
    order_id: null,
    amount,
    direction: 'credit',
    tx_type: 'payment_link',
    currency: 'INR',
    record_hash: recordHash,
    meta: {
      submission_id: submissionId,
      platform_fee: platformFee,
      net_amount: creatorProceeds,
      ...(creatorId ? {} : { needs_reconciliation: true }),
    },
  });
  if (ledgerErr) {
    console.error('[fulfillment] ledger insert failed for submission', submissionId, ledgerErr.message);
  }

  if (creatorId) {
    const { error: notifyErr } = await db.from('notifications').insert({
      recipient_creator_id: creatorId,
      title: 'Payment received!',
      message: `You received ₹${creatorProceeds.toFixed(0)} via a payment link`,
      type: 'sale',
    });
    if (notifyErr) {
      console.error('[fulfillment] notification insert failed for submission', submissionId, notifyErr.message);
    }
  }

  return { fulfilled: true, alreadyFulfilled: false };
}
