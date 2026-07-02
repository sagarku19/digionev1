// Platform fee policy. The rate is the creator's active-subscription platform fee (snapshotted on the
// sub, so a later plan-price change never retroactively alters an active subscriber). Fails SAFE to the
// Free tier (0.10 = the higher platform fee) on no-sub / expired / error — never under-charges. Server-only.
import { createServiceClient } from '@/lib/supabase/service';

const DEFAULT_PLATFORM_FEE_RATE = 0.10;

export function resolveFeeRate(sub: { current_platform_fee_percent: number | string | null } | null | undefined): number {
  const raw = sub?.current_platform_fee_percent;
  // Number(null) === 0 (finite!) so guard against null/undefined before converting.
  const pct = raw != null ? Number(raw) : NaN;
  if (Number.isFinite(pct) && pct >= 0) return pct / 100;
  return DEFAULT_PLATFORM_FEE_RATE;
}

export async function getPlatformFeeRate(creatorId: string | null): Promise<number> {
  if (!creatorId) return DEFAULT_PLATFORM_FEE_RATE;
  try {
    const db = createServiceClient();
    const { data } = await db
      .from('subscriptions')
      .select('current_platform_fee_percent, renewal_date')
      .eq('creator_id', creatorId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);
    const sub = (data ?? [])[0];
    if (!sub) return DEFAULT_PLATFORM_FEE_RATE;
    if (sub.renewal_date && new Date(sub.renewal_date).getTime() < Date.now()) return DEFAULT_PLATFORM_FEE_RATE;
    return resolveFeeRate(sub);
  } catch {
    return DEFAULT_PLATFORM_FEE_RATE; // fail safe to the higher (Free) fee
  }
}
