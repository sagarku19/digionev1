// Aggregated counts for the marketing dashboard index page.
// DB tables: coupons, lead_form, sites, affiliates, referral_codes, order_referrals
// Query keys: ['marketing','stats']
"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import { getCurrentUser } from '@/lib/supabase/current-user';

export type MarketingStats = {
  coupons: number;
  activeCoupons: number;
  leads: number;
  affiliates: number;
  referralCodes: number;
  referrals: number;
};

const EMPTY_STATS: MarketingStats = {
  coupons: 0, activeCoupons: 0, leads: 0, affiliates: 0, referralCodes: 0, referrals: 0,
};

export function useMarketingStats() {
  const query = useQuery({
    queryKey: ['marketing', 'stats'] as const,
    queryFn: async (): Promise<MarketingStats> => {
      try {
        const creatorId = await getCreatorProfileId();
        const user = await getCurrentUser();
        const uid = user?.id ?? '';

        const sitesRes = await supabase.from('sites').select('id').eq('creator_id', creatorId);
        const siteIds = (sitesRes.data ?? []).map((s) => s.id);

        const [couponsRes, leadsRes, affiliatesRes, refCodesRes] = await Promise.all([
          supabase.from('coupons').select('id, is_active').eq('creator_id', uid),
          siteIds.length > 0
            ? supabase.from('lead_form').select('id', { count: 'exact', head: true }).in('site_id', siteIds)
            : Promise.resolve({ count: 0 } as { count: number | null }),
          supabase.from('affiliates').select('id').eq('creator_id', creatorId),
          supabase.from('referral_codes').select('id').eq('owner_creator_id', creatorId),
        ]);

        const codeIds = (refCodesRes.data ?? []).map((r) => r.id);
        const refCount = codeIds.length > 0
          ? (await supabase.from('order_referrals').select('id', { count: 'exact', head: true }).in('referral_code_id', codeIds)).count ?? 0
          : 0;

        return {
          coupons: couponsRes.data?.length ?? 0,
          activeCoupons: couponsRes.data?.filter((c) => c.is_active).length ?? 0,
          leads: leadsRes.count ?? 0,
          affiliates: affiliatesRes.data?.length ?? 0,
          referralCodes: refCodesRes.data?.length ?? 0,
          referrals: refCount,
        };
      } catch (err) {
        console.error('useMarketingStats error:', err);
        throw err;
      }
    },
  });

  return {
    stats: query.data ?? EMPTY_STATS,
    isLoading: query.isLoading,
  };
}
