"use client";
// useSites hook — fetches all sites belonging to the current creator.
// DB tables: sites, site_main (read)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export type SiteWithMain = {
  id: string;
  slug: string | null;
  child_slug: string | null;
  parent_site_id: string | null;
  parent_site?: { slug: string | null } | null;
  creator_id: string;
  site_type: string;
  is_active: boolean;
  custom_domain: string | null;
  ssl_status: string | null;
  created_at: string;
  site_main: {
    title: string | null;
    banner_url: string | null;
    logo_url: string | null;
    meta_description: string | null;
  } | null;
  site_blog: { title: string | null } | null;
  site_singlepage: { title: string | null } | null;
  linkinbio_pages: { display_name: string | null } | null;
};

export function useSites() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: sites = [], isLoading, error } = useQuery<SiteWithMain[]>({
    queryKey: ['creator-sites'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Resolve creator's internal users.id from auth uid
      const { data: publicUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_provider_id', user.id)
        .maybeSingle();

      if (!publicUser) return [];

      // Resolve profiles.id (which is creator_id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', publicUser.id)
        .maybeSingle();

      if (!profile) return [];

      const { data, error } = await supabase
        .from('sites')
        .select(`
          id, slug, child_slug, parent_site_id, creator_id, site_type, is_active, custom_domain, ssl_status, created_at,
          site_main(title, banner_url, logo_url, meta_description),
          site_blog(title),
          site_singlepage(title),
          linkinbio_pages(display_name),
          parent_site:sites(slug)
        `)
        .eq('creator_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as SiteWithMain[]) ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const { error } = await supabase
        .from('sites')
        .update({ is_active: false })
        .eq('id', siteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creator-sites'] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ siteId, isActive }: { siteId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('sites')
        .update({ is_active: isActive })
        .eq('id', siteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creator-sites'] }),
  });

  return {
    sites,
    isLoading,
    error,
    deleteSite: deleteMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
  };
}
