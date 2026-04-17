import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const { code, cartAmount, creatorId } = await req.json();

    if (!code || !cartAmount || !creatorId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('creator_id', creatorId)
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return NextResponse.json({ error: "Invalid coupon" }, { status: 404 });
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return NextResponse.json({ error: "Coupon expired" }, { status: 400 });
    }

    if (coupon.valid_from && new Date(coupon.valid_from) > new Date()) {
      return NextResponse.json({ error: "Coupon not yet active" }, { status: 400 });
    }

    if (coupon.max_uses != null && (coupon.current_uses ?? 0) >= coupon.max_uses) {
      return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
    }

    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = (cartAmount * coupon.discount_value) / 100;
    } else if (coupon.discount_type === 'fixed') {
      discount = Math.min(coupon.discount_value, cartAmount);
    }

    return NextResponse.json({
      valid: true,
      discount_amount: discount,
      final_price: cartAmount - discount
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
