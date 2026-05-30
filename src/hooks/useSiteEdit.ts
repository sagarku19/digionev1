// Multi-table read for the site edit screens + the small payment-config upsert.
// DB tables: sites, site_main, site_navigation, site_design_tokens, site_sections_config, site_product_assignments
// Query keys: ['sites','edit-state', siteId, { include }]
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export type SiteEditInclude = 'main' | 'nav' | 'tokens' | 'sections' | 'assignments';

const DEFAULT_INCLUDE: SiteEditInclude[] = ['main', 'nav', 'tokens'];

// Consumers cast to their own row types — keep these loose to match the
// existing untyped (`any`) local state in the four edit screens.
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface SiteEditData {
  site: any;
  main?: any;
  nav?: any;
  tokens?: { color_palette?: unknown } | null;
  sections?: { sections?: unknown } | null;
  assignments?: { product_id: string }[];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function useSiteEditQuery(siteId: string | undefined, opts?: { include?: SiteEditInclude[] }) {
  const include = (opts?.include ?? DEFAULT_INCLUDE).slice().sort();

  return useQuery({
    queryKey: ['sites', 'edit-state', siteId, { include }] as const,
    enabled: !!siteId,
    queryFn: async (): Promise<SiteEditData> => {
      try {
        const id = siteId!;
        const out: SiteEditData = { site: null };

        const siteRes = await supabase.from('sites').select('*').eq('id', id).single();
        if (siteRes.error) throw siteRes.error;
        out.site = siteRes.data as Record<string, unknown>;

        const promises: Promise<void>[] = [];
        if (include.includes('main')) {
          promises.push((async () => {
            const { data } = await supabase.from('site_main').select('*').eq('site_id', id).maybeSingle();
            out.main = (data as Record<string, unknown> | null) ?? null;
          })());
        }
        if (include.includes('nav')) {
          promises.push((async () => {
            const { data } = await supabase.from('site_navigation').select('*').eq('site_id', id).maybeSingle();
            out.nav = (data as Record<string, unknown> | null) ?? null;
          })());
        }
        if (include.includes('tokens')) {
          promises.push((async () => {
            const { data } = await supabase.from('site_design_tokens').select('color_palette').eq('site_id', id).maybeSingle();
            out.tokens = (data as { color_palette?: unknown } | null) ?? null;
          })());
        }
        if (include.includes('sections')) {
          promises.push((async () => {
            const { data } = await supabase.from('site_sections_config').select('sections').eq('site_id', id).maybeSingle();
            out.sections = (data as { sections?: unknown } | null) ?? null;
          })());
        }
        if (include.includes('assignments')) {
          promises.push((async () => {
            const { data } = await supabase.from('site_product_assignments').select('product_id').eq('site_id', id);
            out.assignments = (data ?? []) as { product_id: string }[];
          })());
        }
        await Promise.all(promises);

        return out;
      } catch (err) {
        console.error('useSiteEditQuery error:', err);
        throw err;
      }
    },
  });
}

export function useSiteEditMutations(siteId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sites', 'edit-state', siteId] });

  // The payment edit screen does a tiny upsert into site_main only. Larger editor saves stay inline per spec §5.
  const savePaymentConfig = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!siteId) throw new Error('siteId required');
      const { data: existing } = await supabase.from('site_main').select('site_id').eq('site_id', siteId).maybeSingle();
      if (existing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from('site_main').update(payload as any).eq('site_id', siteId);
        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from('site_main').insert({ site_id: siteId, title: 'Untitled', ...payload } as any);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  return {
    savePaymentConfig: savePaymentConfig.mutateAsync,
    isSavingPayment: savePaymentConfig.isPending,
  };
}
