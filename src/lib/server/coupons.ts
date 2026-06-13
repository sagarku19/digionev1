// Shared coupon validation — used by /api/coupons/validate and /api/checkout/create.
// Server-only (service-role client passed in by the caller).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export type CouponValidation =
  | {
      valid: true;
      coupon: { id: string; code: string };
      discountAmount: number;
      finalPrice: number;
    }
  | { valid: false; reason: string; status: number };

export async function validateCoupon(
  db: SupabaseClient<Database>,
  code: string,
  creatorId: string,
  cartAmount: number
): Promise<CouponValidation> {
  const { data: coupon, error } = await db
    .from('coupons')
    .select('id, code, discount_type, discount_value, is_active, valid_from, valid_until, max_uses, current_uses')
    .eq('code', code.toUpperCase())
    .eq('creator_id', creatorId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !coupon) {
    return { valid: false, reason: 'Invalid coupon', status: 404 };
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
    return { valid: false, reason: 'Coupon expired', status: 400 };
  }
  if (coupon.valid_from && new Date(coupon.valid_from) > new Date()) {
    return { valid: false, reason: 'Coupon not yet active', status: 400 };
  }
  if (coupon.max_uses != null && (coupon.current_uses ?? 0) >= coupon.max_uses) {
    return { valid: false, reason: 'Coupon usage limit reached', status: 400 };
  }

  let discountAmount = 0;
  if (coupon.discount_type === 'percentage') {
    discountAmount = (cartAmount * coupon.discount_value) / 100;
  } else if (coupon.discount_type === 'fixed') {
    discountAmount = Math.min(coupon.discount_value, cartAmount);
  }

  return {
    valid: true,
    coupon: { id: coupon.id, code: coupon.code },
    discountAmount,
    finalPrice: cartAmount - discountAmount,
  };
}
