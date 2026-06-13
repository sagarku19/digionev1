import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { validateCoupon } from '@/lib/server/coupons';
import { rateLimit } from '@/lib/server/rate-limit';

export async function POST(req: Request) {
  try {
    if (!(await rateLimit(req, 'coupons-validate', { max: 10, windowSeconds: 60 }))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { code, cartAmount, creatorId } = await req.json();

    if (!code || !cartAmount || !creatorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = createServiceClient();
    const result = await validateCoupon(db, String(code), String(creatorId), Number(cartAmount));

    if (!result.valid) {
      return NextResponse.json({ error: result.reason }, { status: result.status });
    }

    return NextResponse.json({
      valid: true,
      discount_amount: result.discountAmount,
      final_price: result.finalPrice,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
