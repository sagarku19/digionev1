import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import crypto from 'crypto';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const CASHFREE_ENV = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

export async function POST(req: Request) {
  try {
    const { items, buyerId, couponCode, contact, upsellPageId } = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Empty cart' }, { status: 400 });
    }

    // ── Verify products & prices server-side (prevents price tampering) ──
    const productIds = items.map((i: any) => i.id);
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

    let discount = 0;
    if (couponCode) {
      const { data: coupon } = await (supabase as any)
        .from('coupons')
        .select('*')
        .eq('code', couponCode)
        .eq('is_active', true)
        .single();
      if (coupon?.discount_type === 'percentage') discount = (subtotal * coupon.discount_value) / 100;
      else if (coupon?.discount_type === 'fixed') discount = Math.min(coupon.discount_value, subtotal);
    }

    const total = Math.max(0, subtotal - discount);

    // ── Resolve origin site (first product's site) ──
    const { data: siteRow } = await (supabase as any)
      .from('site_singlepage')
      .select('site_id')
      .eq('product_id', dbProducts[0].id)
      .maybeSingle();
    const originSiteId = siteRow?.site_id ?? null;

    // ── Create order ──
    const orderId = crypto.randomUUID();
    const gatewayOrderId = `ord_${orderId.replace(/-/g, '')}`;

    // Store creator_profile_id in metadata as fallback (always available)
    const orderMeta = { creator_profile_id: creatorProfileId, ...(upsellPageId ? { upsell_page_id: upsellPageId } : {}) };

    const baseInsert: Record<string, any> = {
      id: orderId,
      gateway_order_id: gatewayOrderId,
      user_id: buyerId ?? null,
      origin_site_id: originSiteId,
      total_amount: total,
      status: 'pending',
      customer_name: contact?.name ?? null,
      customer_email: contact?.email ?? null,
      customer_phone: contact?.phone ?? null,
      metadata: orderMeta,
    };

    // Try with creator_id (requires migration); fall back without it
    let { error: orderError } = await (supabase.from('orders') as any).insert({
      ...baseInsert,
      creator_id: creatorProfileId,
    });
    if (orderError?.message?.includes('creator_id')) {
      const fallback = await (supabase.from('orders') as any).insert(baseInsert);
      orderError = fallback.error;
    }

    if (orderError) throw orderError;

    // ── Order items ──
    const orderItems = dbProducts.map(p => ({
      order_id: orderId,
      product_id: p.id,
      price_at_purchase: Number(p.price) || 0,
      origin_site_id: originSiteId,
    }));
    await (supabase as any).from('order_items').insert(orderItems);

    // ── Free product — mark completed immediately ──
    if (total === 0) {
      const freeUpdate: Record<string, any> = { status: 'completed', payment_verified_at: new Date().toISOString() };
      let { error: freeErr } = await (supabase.from('orders') as any).update(freeUpdate).eq('id', orderId);
      if (freeErr?.message?.includes('payment_verified_at')) {
        await (supabase.from('orders') as any).update({ status: 'completed' }).eq('id', orderId);
      }
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
      await (supabase.from('orders') as any).update({ status: 'failed' }).eq('id', orderId);
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
  } catch (error: any) {
    console.error('[checkout/create]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
