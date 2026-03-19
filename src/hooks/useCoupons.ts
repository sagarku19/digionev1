"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database.types';

type CouponInsert = Database['public']['Tables']['coupons']['Insert'];

export function useCoupons() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: coupons = [], isLoading, error } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newCoupon: Omit<CouponInsert, 'creator_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data, error } = await supabase
        .from('coupons')
        .insert({ ...newCoupon, creator_id: user.id } as CouponInsert)
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
