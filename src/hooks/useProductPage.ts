"use client";

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useProductPage(creatorId: string, slug: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['product', creatorId, slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!creatorId && !!slug
  });
}
