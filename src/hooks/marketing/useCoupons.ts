"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import { Database } from '@/types/database.types';

type CouponInsert = Database['public']['Tables']['coupons']['Insert'];

export function useCoupons() {
  const queryClient = useQueryClient();

  const { data: coupons = [], isLoading, error } = useQuery({
    queryKey: ['coupons', 'list'],
    queryFn: async () => {
      const creatorId = await getCreatorProfileId();

      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newCoupon: Omit<CouponInsert, 'creator_id'>) => {
      const creatorId = await getCreatorProfileId();

      const { data, error } = await supabase
        .from('coupons')
        .insert({ ...newCoupon, creator_id: creatorId } as CouponInsert)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    }
  });

  return {
    coupons,
    isLoading,
    error,
    createCoupon: createMutation.mutateAsync,
    isCreating: createMutation.isPending
  };
}
