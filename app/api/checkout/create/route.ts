import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { validateCoupon } from '@/lib/server/coupons';
import { validateReferral } from '@/lib/server/referrals';
import { fulfillOrder } from '@/lib/server/fulfillment';
import { rateLimit } from '@/lib/server/rate-limit';

const CASHFREE_ENV = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

export async function POST(req: Request) {
  try {
    if (!(await rateLimit(req, 'checkout-create', { max: 10, windowSeconds: 60 }))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = createServiceClient();
    const { items, buyerId, couponCode, contact, upsellPageId, referralCode } = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Empty cart' }, { status: 400 });
    }

    // ── Verify products & prices server-side (prevents price tampering) ──
    const productIds = items.map((i: { id: string }) => i.id);
    const { data: dbProducts } = await supabase
      .from('products')
      .select('id, price, creator_id, is_published')
      .in('id', productIds);

    if (!dbProducts || dbProducts.length !== items.length) {
      return NextResponse.json({ error: 'One or more products not found' }, { status: 400 });
    }

    const unpublished = dbProducts.find(p => !p.is_published);
    if (unpublished) {
      return NextResponse.json({ error: 'One or more products are not available for purchase' }, { status: 400 });
    }

    // All products must belong to the same creator
    const creatorIds = [...new Set(dbProducts.map(p => p.creator_id))];
    if (creatorIds.length > 1) {
      return NextResponse.json({ error: 'Cannot mix products from different creators in one order' }, { status: 400 });
    }
    // products.creator_id is already profiles.id — use it directly
    const creatorProfileId = creatorIds[0] ?? null;

    // ── Price calculation (always use DB price, never trust client) ──
    let subtotal = 0;
    dbProducts.forEach(p => { subtotal += Number(p.price) || 0; });

    // ── Coupon validation (shared with /api/coupons/validate) ──
    let discount = 0;
    let couponId: string | null = null;
    if (couponCode && creatorProfileId) {
      const couponResult = await validateCoupon(supabase, String(couponCode), creatorProfileId, subtotal);
      if (!couponResult.valid) {
        return NextResponse.json({ error: couponResult.reason }, { status: couponResult.status });
      }
      discount = couponResult.discountAmount;
      couponId = couponResult.coupon.id;
    }

    // ── Referral attribution (pending; settled at fulfillment) ──
    let referral: Awaited<ReturnType<typeof validateReferral>> = null;
    if (referralCode && creatorProfileId) {
      referral = await validateReferral(supabase, String(referralCode), {
        buyerUserId: buyerId ?? null,
        sellingCreatorId: creatorProfileId,
      });
    }

    const total = Math.max(0, subtotal - discount);

    // ── Resolve origin site (first product's site) ──
    const { data: siteRow } = await supabase
      .from('site_singlepage')
      .select('site_id')
      .eq('product_id', dbProducts[0].id)
      .maybeSingle();
    const originSiteId = siteRow?.site_id ?? null;

    // ── Create order ──
    const orderId = crypto.randomUUID();
    const gatewayOrderId = `ord_${orderId.replace(/-/g, '')}`;

    const orderMeta = {
      creator_profile_id: creatorProfileId,
      ...(couponId ? { coupon_id: couponId, discount_amount: discount } : {}),
      ...(upsellPageId ? { upsell_page_id: upsellPageId } : {}),
    };

    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      gateway_order_id: gatewayOrderId,
      user_id: buyerId ?? null,
      creator_id: creatorProfileId,
      origin_site_id: originSiteId,
      total_amount: total,
      status: 'pending',
      customer_name: contact?.name ?? null,
      customer_email: contact?.email ?? null,
      customer_phone: contact?.phone ?? null,
      metadata: orderMeta,
    });
    if (orderError) throw orderError;

    // ── Order items ──
    const orderItems = dbProducts.map(p => ({
      order_id: orderId,
      product_id: p.id,
      price_at_purchase: Number(p.price) || 0,
      origin_site_id: originSiteId,
    }));
    await supabase.from('order_items').insert(orderItems);

    if (referral) {
      // upsert on order_id (UNIQUE) so a client retry can't create two pending rows
      await supabase.from('order_referrals').upsert({
        order_id: orderId,
        referral_code_id: referral.referralCodeId,
        referrer_creator_id: referral.referrerCreatorId,
        referred_user_id: buyerId ?? null,
        status: 'pending',
        metadata: { reward_percent: referral.rewardPercent },
      }, { onConflict: 'order_id', ignoreDuplicates: true });
    }

    // ── Free product — grant access + redeem coupon via shared fulfillment ──
    if (total === 0) {
      await fulfillOrder(orderId);
      return NextResponse.json({ orderId, amount: 0, status: 'completed' });
    }

    // ── Create Cashfree payment session ──
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const cfRes = await fetch(`${CASHFREE_ENV}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID!,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET!,
      },
      body: JSON.stringify({
        order_id: gatewayOrderId,
        order_amount: total,
        order_currency: 'INR',
        customer_details: {
          customer_id: orderId,
          customer_name: contact?.name || 'Customer',
          customer_email: contact?.email || 'noreply@digione.ai',
          customer_phone: contact?.phone || '0000000000',
        },
        order_meta: {
          return_url: `${appUrl}/payment/status?order_id=${orderId}`,
          notify_url: `${appUrl}/api/webhook/cashfree`,
        },
      }),
    });

    const cfData = await cfRes.json();

    if (!cfRes.ok || !cfData.payment_session_id) {
      console.error('[checkout/create] Cashfree error:', cfData);
      // Clean up pending order on gateway failure
      await supabase.from('orders').update({ status: 'failed' }).eq('id', orderId);
      return NextResponse.json(
        { error: cfData.message ?? 'Payment gateway unavailable' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      orderId,
      gatewayOrderId,
      amount: total,
      payment_session_id: cfData.payment_session_id,
      environment: process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION' ? 'production' : 'sandbox',
    });
  } catch (error) {
    console.error('[checkout/create]', error);
    const msg = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
