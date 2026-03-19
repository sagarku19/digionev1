"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database.types';

type PayoutInsert = any;

export function usePayoutRequests() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: payouts = [], isLoading, error } = useQuery({
    queryKey: ['payout-requests'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data, error } = await (supabase as any)
        .from('payout_requests')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const requestPayout = useMutation({
    mutationFn: async (amount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const payload: PayoutInsert = {
        creator_id: user.id,
        amount,
        status: 'pending'
      };

      const { data, error } = await (supabase as any)
        .from('payout_requests')
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-requests'] });
      queryClient.invalidateQueries({ queryKey: ['creator-balances'] });
    }
  });

  return {
    payouts,
    isLoading,
    error,
    requestPayout: requestPayout.mutateAsync,
    isRequesting: requestPayout.isPending
  };
}
