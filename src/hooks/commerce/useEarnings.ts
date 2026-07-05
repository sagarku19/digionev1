// Fetches creator earnings, payout history, and KYC status.
// DB tables: creator_balances, creator_payouts, creator_kyc, users, profiles (read only)
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import { availableBalance } from '@/lib/shared/balance';

export function useEarnings() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['earnings', 'summary'],
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
        const derivedBalance = rawBal
          ? { ...rawBal, available_balance: availableBalance(rawBal) }
          : { available_balance: 0, pending_payout: 0, total_earnings: 0, total_platform_fees: 0, total_paid_out: 0, frozen_balance: 0 };

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
      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to submit KYC details.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['earnings', 'summary'] }),
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch('/api/payouts/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Payout request failed.');
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['earnings', 'summary'] }),
  });

  const updatePayoutMethodMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/kyc/payout-method', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to update payout method.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['earnings', 'summary'] }),
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
    requestPayout: requestPayoutMutation.mutateAsync,
    isRequestingPayout: requestPayoutMutation.isPending,
    updatePayoutMethod: updatePayoutMethodMutation.mutateAsync,
    isUpdatingPayoutMethod: updatePayoutMethodMutation.isPending,
  };
}
