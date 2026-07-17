"use client";
// useSites hook — fetches all sites belonging to the current creator.
// DB tables: sites, site_main, site_singlepage, linkinbio_pages (read)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import { getCurrentUser } from '@/lib/supabase/current-user';

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
  site_singlepage: { title: string | null } | null;
  linkinbio_pages: { display_name: string | null } | null;
};

// Shared column projection for the list + trash queries so the two never drift.
// `deleted_at` is included for the trash drawer's deletion-date display.
const SITES_SELECT = `
  id, slug, child_slug, parent_site_id, creator_id, site_type, is_active, custom_domain, ssl_status, created_at, deleted_at,
  site_main(title, banner_url, logo_url, meta_description),
  site_singlepage(title),
  linkinbio_pages(display_name),
  parent_site:sites(slug)
`;

export function useSites() {
  const queryClient = useQueryClient();

  const { data: sites = [], isLoading, error } = useQuery<SiteWithMain[]>({
    queryKey: ['sites', 'list'],
    queryFn: async () => {
      const user = await getCurrentUser();
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
        .select(SITES_SELECT)
        .eq('creator_id', profile.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as SiteWithMain[]) ?? [];
    },
  });

  const { data: trashedSites = [], isLoading: isLoadingTrash } = useQuery<SiteWithMain[]>({
    queryKey: ['sites', 'trash'],
    queryFn: async () => {
      const profileId = await getCreatorProfileId();
      const { data, error } = await supabase
        .from('sites')
        .select(SITES_SELECT)
        .eq('creator_id', profileId)
        .not('deleted_at', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as SiteWithMain[]) ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const { error } = await supabase
        .from('sites')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', siteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sites'] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ siteId, isActive }: { siteId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('sites')
        .update({ is_active: isActive })
        .eq('id', siteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sites', 'list'] }),
  });

  const restoreMutation = useMutation({
    mutationFn: async (siteId: string) => {
      // Clears the trash flag only — site stays inactive (draft) until re-published.
      const { error } = await supabase
        .from('sites')
        .update({ deleted_at: null })
        .eq('id', siteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sites'] }),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const { error } = await supabase.from('sites').delete().eq('id', siteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sites'] }),
  });

  return {
    sites,
    trashedSites,
    isLoading,
    isLoadingTrash,
    error,
    deleteSite: deleteMutation.mutateAsync,
    restoreSite: restoreMutation.mutateAsync,
    permanentlyDeleteSite: permanentDeleteMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,
    isPermanentlyDeleting: permanentDeleteMutation.isPending,
  };
}
