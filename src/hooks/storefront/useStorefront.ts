"use client";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useStorefront(slug: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['storefront', 'detail', slug],
    queryFn: async () => {
      const { data: site, error: siteErr } = await supabase
        .from('sites')
        .select('creator_id')
        .eq('slug', slug)
        .single();

      if (siteErr || !site) throw new Error('Storefront not found');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', site.creator_id)
        .single();

      return { profile };
    },
    staleTime: 1000 * 60 * 5, // public store data — 5 min is fine
  });
}
