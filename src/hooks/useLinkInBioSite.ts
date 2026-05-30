// Linkinbio editor read-only fetch: sites + tokens + linkinbio_pages + linkinbio_blocks + linkinbio_items + products.
// save() orchestration stays inline in the editor page per spec §5.
// DB tables: sites, site_design_tokens, linkinbio_pages*, linkinbio_blocks*, linkinbio_items*, products
//   (* missing from database.types.ts; (supabase as any) used for those)
// Query keys: ['sites','linkinbio', siteId]
"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

// (supabase as any) required for linkinbio_pages/blocks/items (missing from generated types).
// Consumer state is also untyped; keep these loose to match.
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface LinkInBioSiteData {
  site: any;
  tokens: { color_palette?: unknown } | null;
  page: any;
  blocks: any[];
  items: any[];
  products: { id: string; name: string; price: number; thumbnail_url: string | null; is_published: boolean | null }[];
}

export function useLinkInBioSiteQuery(siteId: string | undefined) {
  return useQuery({
    queryKey: ['sites', 'linkinbio', siteId] as const,
    enabled: !!siteId,
    queryFn: async (): Promise<LinkInBioSiteData> => {
      try {
        const id = siteId!;
        const [siteRes, tokensRes] = await Promise.all([
          supabase.from('sites').select('*').eq('id', id).single(),
          supabase.from('site_design_tokens').select('color_palette').eq('site_id', id).maybeSingle(),
        ]);
        if (siteRes.error) throw siteRes.error;

        const { data: page } = await (supabase.from('linkinbio_pages' as any) as any)
          .select('*').eq('site_id', id).maybeSingle();

        let blocks: any[] = [];
        let items: any[] = [];
        if (page?.id) {
          const { data: blockRows } = await (supabase.from('linkinbio_blocks' as any) as any)
            .select('*').eq('page_id', page.id).order('sort_order', { ascending: true });
          blocks = blockRows ?? [];
          if (blocks.length > 0) {
            const blockIds = blocks.map((b) => b.id);
            const { data: itemRows } = await (supabase.from('linkinbio_items' as any) as any)
              .select('*').in('block_id', blockIds).order('sort_order', { ascending: true });
            items = itemRows ?? [];
          }
        }

        let products: LinkInBioSiteData['products'] = [];
        if (siteRes.data?.creator_id) {
          const { data: prods } = await supabase
            .from('products')
            .select('id, name, price, thumbnail_url, is_published')
            .eq('creator_id', siteRes.data.creator_id)
            .order('created_at', { ascending: false });
          products = (prods ?? []) as LinkInBioSiteData['products'];
        }

        return {
          site: siteRes.data,
          tokens: tokensRes.data,
          page,
          blocks,
          items,
          products,
        };
      } catch (err) {
        console.error('useLinkInBioSiteQuery error:', err);
        throw err;
      }
    },
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */
