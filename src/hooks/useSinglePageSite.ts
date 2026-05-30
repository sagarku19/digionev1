// Singlepage editor read: sites + site_design_tokens + site_singlepage.
// save() orchestration stays inline in the editor page per spec §5.
// DB tables: sites, site_design_tokens, site_singlepage
// Query keys: ['sites','singlepage', siteId]
"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface SinglePageSiteData {
  site: any;
  tokens: { color_palette?: unknown } | null;
  page: any | null;
}

export function useSinglePageSiteQuery(siteId: string | undefined) {
  return useQuery({
    queryKey: ['sites', 'singlepage', siteId] as const,
    enabled: !!siteId,
    queryFn: async (): Promise<SinglePageSiteData> => {
      try {
        const id = siteId!;
        const [siteRes, tokensRes, pageRes] = await Promise.all([
          supabase.from('sites').select('*').eq('id', id).single(),
          supabase.from('site_design_tokens').select('color_palette').eq('site_id', id).maybeSingle(),
          supabase.from('site_singlepage').select('*').eq('site_id', id).maybeSingle(),
        ]);
        if (siteRes.error) throw siteRes.error;
        return { site: siteRes.data, tokens: tokensRes.data, page: pageRes.data };
      } catch (err) {
        console.error('useSinglePageSiteQuery error:', err);
        throw err;
      }
    },
  });
}
