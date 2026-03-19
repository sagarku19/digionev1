"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useAffiliateLinks() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: links = [], isLoading, error } = useQuery({
    queryKey: ['affiliate-links'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data, error } = await supabase
        .from('referral_codes') // Note: In DigiOne, affiliates use referral_codes
        .select('*')
        .eq('owner_creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  return {
    links,
    isLoading,
    error
  };
}
