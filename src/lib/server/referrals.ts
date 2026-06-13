// Shared referral validation + commission math — used by /api/checkout/create
// and src/lib/server/fulfillment.ts. Server-only (service-role client passed in).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/** Platform-fee-funded commission: reward_percent of total, capped at the platform fee. */
export function computeReferralCommission(total: number, rewardPercent: number, platformFee: number): number {
  if (total <= 0 || rewardPercent <= 0) return 0;
  const raw = Math.round(((total * rewardPercent) / 100) * 100) / 100;
  return Math.min(raw, platformFee);
}

export type ReferralValidation = {
  referralCodeId: string;
  referrerCreatorId: string | null;  // null → tracked but no commission (user-owned code)
  rewardPercent: number;
} | null;

/**
 * Validate a referral code at checkout. Returns attribution info, or null if the
 * code is invalid/inactive or a self-referral. v1: only owner_creator_id codes pay
 * commission; owner_user_id-only codes are tracked (referrerCreatorId = null).
 */
export async function validateReferral(
  db: SupabaseClient<Database>,
  code: string,
  ctx: { buyerUserId: string | null; sellingCreatorId: string | null }
): Promise<ReferralValidation> {
  const { data: rc, error } = await db
    .from('referral_codes')
    .select('id, owner_creator_id, owner_user_id, is_active, metadata')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !rc) return null;

  // Reject self-referral: referrer is the buyer, or the selling creator.
  if (rc.owner_creator_id && rc.owner_creator_id === ctx.sellingCreatorId) return null;
  if (rc.owner_user_id && ctx.buyerUserId && rc.owner_user_id === ctx.buyerUserId) return null;

  const rewardPercent = Number((rc.metadata as { reward_percent?: number } | null)?.reward_percent ?? 0);
  return {
    referralCodeId: rc.id,
    referrerCreatorId: rc.owner_creator_id ?? null,
    rewardPercent: rc.owner_creator_id ? rewardPercent : 0,
  };
}
