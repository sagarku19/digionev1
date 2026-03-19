// Fetches creator earnings, payout history, and KYC status.
// DB tables: creator_balances, creator_payouts, creator_kyc, users, profiles (read only)
"use client";

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export function useEarnings() {
  const supabase = createClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['creator-earnings'],
    queryFn: async () => {
      try {
        const profileId = await getCreatorProfileId(supabase);

        const [balanceRes, payoutsRes, kycRes] = await Promise.all([
          supabase.from('creator_balances').select('*').eq('creator_id', profileId).maybeSingle(),
          supabase.from('creator_payouts').select('*').eq('creator_id', profileId).order('created_at', { ascending: false }),
          supabase.from('creator_kyc').select('*').eq('creator_id', profileId).maybeSingle()
        ]);

        if (balanceRes.error) throw balanceRes.error;
        if (payoutsRes.error) throw payoutsRes.error;

        const rawBal = balanceRes.data;
        const derivedBalance = rawBal ? {
          ...rawBal,
          available_balance: (rawBal.total_earnings ?? 0) - (rawBal.total_platform_fees ?? 0) - (rawBal.total_paid_out ?? 0) - (rawBal.pending_payout ?? 0),
        } : { available_balance: 0, pending_payout: 0, total_earnings: 0, total_platform_fees: 0, total_paid_out: 0 };

        return {
          balances: derivedBalance,
          payouts: payoutsRes.data ?? [],
          kyc: kycRes.data ?? null
        };
      } catch (err) {
        console.error('useEarnings error:', err);
        throw err;
      }
    }
  });

  return {
    creatorBalances: data?.balances,
    payouts: data?.payouts || [],
    kyc: data?.kyc,
    isLoading,
    error,
    refreshEarnings: refetch
  };
}
