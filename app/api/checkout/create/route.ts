import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import crypto from 'crypto';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // server only
);

const CASHFREE_ENV = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

export async function POST(req: Request) {
  try {
    const { items, buyerId, couponCode, contact, upsellPageId } = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Empty cart" }, { status: 400 });
    }

    // Verify price dynamically scaling 
    const productIds = items.map((i: any) => i.id);
    const { data: dbProducts } = await supabase
      .from('products')
      .select('id, price, creator_id')
      .in('id', productIds);

    if (!dbProducts || dbProducts.length !== items.length) {
      return NextResponse.json({ error: "Invalid products" }, { status: 400 });
    }

    let subtotal = 0;
    dbProducts.forEach(p => subtotal += p.price);
    
    // Apply coupon
    let discount = 0;
    if (couponCode) {
      const { data: coupon } = await supabase.from('coupons').select('*').eq('code', couponCode).eq('is_active', true).single();
      const couponAny = coupon as any;
      if (couponAny && couponAny.discount_percentage) {
        discount = (subtotal * couponAny.discount_percentage) / 100;
      } else if (couponAny && couponAny.discount_amount) {
        discount = couponAny.discount_amount;
      }
    }

    const total = Math.max(0, subtotal - discount);

    const orderId = crypto.randomUUID();
    const gatewayOrderId = `ord_${orderId.replace(/-/g, '')}`;

    // Server-level RLS bypass write
    const { error: orderError } = await (supabase.from('orders') as any)
      .insert({
        id: orderId,
        gateway_order_id: gatewayOrderId,
        user_id: buyerId || null,
        total_amount: total,
        status: 'pending',
        customer_name: contact?.name || null,
        customer_email: contact?.email || null,
        customer_phone: contact?.phone || null,
        metadata: upsellPageId ? { upsell_page_id: upsellPageId } : undefined,
      });

    if (orderError) throw orderError;

    // Relational tracking insertions
    const orderItems = dbProducts.map(p => ({
      order_id: orderId,
      product_id: p.id,
      price_at_purchase: p.price,
    }));
    await (supabase as any).from('order_items').insert(orderItems);

    // If total is 0 (free), skip payment gateway
    if (total === 0) {
      await (supabase.from('orders') as any)
        .update({ status: 'completed' })
        .eq('id', orderId);
      return NextResponse.json({ orderId, amount: 0, status: 'completed' });
    }

    // Create Cashfree payment session
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
      return NextResponse.json(
        { error: cfData.message ?? 'Payment gateway unavailable' },
        { status: 502 },
      );
    }

    // Update order with gateway order id
    await (supabase.from('orders') as any)
      .update({ gateway_order_id: gatewayOrderId })
      .eq('id', orderId);

    return NextResponse.json({
      orderId,
      gatewayOrderId,
      amount: total,
      payment_session_id: cfData.payment_session_id,
      environment: process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION' ? 'production' : 'sandbox',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
