"use client";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useStoreProducts(creatorId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['store-products', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!creatorId
  });
}
