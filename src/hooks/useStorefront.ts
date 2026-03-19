"use client";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useStorefront(slug: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['storefront', slug],
    queryFn: async () => {
      // Find the site by slug
      const { data: site, error: siteErr } = await (supabase as any)
        .from('sites')
        .select('creator_id')
        .eq('slug', slug)
        .single();
        
      if (siteErr || !site) throw new Error("Storefront not found");

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', site.creator_id)
        .single();

      const { data: config } = await (supabase as any)
        .from('site_config')
        .select('*')
        .eq('creator_id', site.creator_id)
        .single();

      return { profile, config };
    },
    staleTime: 1000 * 60 * 5 // Cache public store config for 5 mins
  });
}
