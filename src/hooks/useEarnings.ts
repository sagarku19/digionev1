// Fetches creator earnings, payout history, and KYC status.
// DB tables: creator_balances, creator_payouts, creator_kyc, users, profiles (read only)
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export function useEarnings() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['creator-earnings'],
    queryFn: async () => {
      try {
        const profileId = await getCreatorProfileId();

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

  const updateKycMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      try {
        const creatorId = await getCreatorProfileId();
        const { error } = await supabase.from('creator_kyc').upsert({ creator_id: creatorId, ...payload });
        if (error) throw error;
      } catch (err) {
        console.error('useEarnings updateKyc error:', err);
        throw err;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creator-earnings'] }),
  });

  return {
    creatorBalances: data?.balances,
    payouts: data?.payouts || [],
    kyc: data?.kyc,
    isLoading,
    error,
    refreshEarnings: refetch,
    updateKyc: updateKycMutation.mutateAsync,
    isUpdatingKyc: updateKycMutation.isPending,
  };
}
