import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import crypto from 'crypto';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // server only
);

export async function POST(req: Request) {
  try {
    const { items, buyerId, couponCode } = await req.json();

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

    // Creates Cashfree Order (Mock payload format)
    const orderId = `ord_${crypto.randomUUID().replace(/-/g, '')}`;
    const paymentSessionId = `session_${crypto.randomUUID()}`; 

    // Server-level RLS bypass write
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        buyer_id: buyerId,
        creator_id: dbProducts[0].creator_id,
        total_amount: total,
        status: 'pending',
      });

    if (orderError) throw orderError;

    // Relational tracking insertions
    const orderItems = dbProducts.map(p => ({
      order_id: orderId,
      product_id: p.id,
    }));
    await (supabase as any).from('order_items').insert(orderItems);

    return NextResponse.json({
      orderId,
      paymentSessionId,
      amount: total
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
