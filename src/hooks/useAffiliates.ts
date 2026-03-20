"use client";
// Full affiliate management — invite, list, toggle, update commission.
// DB tables: affiliates (read/write), profiles (read via getCreatorProfileId)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import { Database } from '@/types/database.types';

type AffiliateRow = Database['public']['Tables']['affiliates']['Row'];
type AffiliateInsert = Database['public']['Tables']['affiliates']['Insert'];

export function useAffiliates() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: affiliates = [], isLoading, error } = useQuery({
    queryKey: ['affiliates'],
    queryFn: async () => {
      const profileId = await getCreatorProfileId(supabase);
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('creator_id', profileId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { affiliate_user_id: string; commission_percent: number }) => {
      const profileId = await getCreatorProfileId(supabase);
      const { data, error } = await supabase
        .from('affiliates')
        .insert({
          creator_id: profileId,
          affiliate_user_id: payload.affiliate_user_id,
          commission_percent: payload.commission_percent,
          is_active: true,
        } as AffiliateInsert)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['affiliates'] })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AffiliateRow> }) => {
      const { data, error } = await supabase
        .from('affiliates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['affiliates'] })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('affiliates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['affiliates'] })
  });

  return {
    affiliates,
    isLoading,
    error,
    inviteAffiliate: createMutation.mutateAsync,
    updateAffiliate: updateMutation.mutateAsync,
    removeAffiliate: deleteMutation.mutateAsync,
    isInviting: createMutation.isPending,
  };
}
