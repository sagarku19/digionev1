// Referral codes + redemption (order_referrals) for a creator: list reads + CRUD.
// DB tables: referral_codes, order_referrals (loose Supabase types — page types own the shape)
// Query keys: ['referrals','codes'], ['referrals','redemptions']
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export type ReferralCode = {
  id: string;
  code: string;
  is_active: boolean | null;
  created_at: string | null;
  metadata: { reward_percent?: number } | null;
};

export type Referral = {
  id: string;
  referral_code_id: string | null;
  commission_amount: number | null;
  status: string | null;
  created_at: string | null;
};

export function useReferrals() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['referrals', 'codes'] as const,
    queryFn: async (): Promise<{ creatorId: string; codes: ReferralCode[]; redemptions: Referral[] }> => {
      try {
        const creatorId = await getCreatorProfileId();
        const { data: codes, error: codesErr } = await supabase
          .from('referral_codes').select('*')
          .eq('owner_creator_id', creatorId)
          .order('created_at', { ascending: false });
        if (codesErr) throw codesErr;

        const codeIds = (codes ?? []).map((c) => c.id);
        let redemptions: Referral[] = [];
        if (codeIds.length > 0) {
          const { data: reds, error: redsErr } = await supabase
            .from('order_referrals').select('*').in('referral_code_id', codeIds)
            .order('created_at', { ascending: false });
          if (redsErr) throw redsErr;
          redemptions = (reds ?? []) as Referral[];
        }
        return { creatorId, codes: (codes ?? []) as ReferralCode[], redemptions };
      } catch (err) {
        console.error('useReferrals error:', err);
        throw err;
      }
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['referrals'] });
  const creatorId = query.data?.creatorId;

  const createCode = useMutation({
    mutationFn: async (payload: { code: string; reward_percent: number }) => {
      if (!creatorId) throw new Error('creator not loaded');
      const { error } = await supabase.from('referral_codes').insert({
        code: payload.code,
        owner_creator_id: creatorId,
        is_active: true,
        metadata: { reward_percent: payload.reward_percent },
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleActive = useMutation({
    mutationFn: async (code: ReferralCode) => {
      const { error } = await supabase.from('referral_codes').update({ is_active: !code.is_active }).eq('id', code.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteCode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('referral_codes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const totalCommission = (query.data?.redemptions ?? []).reduce(
    (sum, r) => sum + (Number(r.commission_amount) || 0),
    0
  );

  return {
    codes: query.data?.codes ?? [],
    redemptions: query.data?.redemptions ?? [],
    totalCommission,
    isLoading: query.isLoading,
    createCode: createCode.mutateAsync,
    toggleActive: toggleActive.mutateAsync,
    deleteCode: deleteCode.mutateAsync,
  };
}
