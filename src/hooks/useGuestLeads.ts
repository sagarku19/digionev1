"use client";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useGuestLeads(filterSiteId?: string) {
  const supabase = createClient();

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['guest-leads', filterSiteId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Resolve profile.id from auth user_id (sites.creator_id = profiles.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Get user's sites
      const { data: sites } = await supabase
        .from('sites')
        .select('id, slug, site_type')
        .eq('creator_id', profile.id);

      if (!sites || sites.length === 0) return [];

      const siteIds = filterSiteId ? [filterSiteId] : sites.map(s => s.id);
      const sitesMap = Object.fromEntries(sites.map(s => [s.id, s]));

      // Fetch leads joined with forms
      const { data, error } = await supabase
        .from('lead_form')
        .select('*, forms(title, description)')
        .in('site_id', siteIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((lead: any) => ({
        ...lead,
        sites: sitesMap[lead.site_id] || null,
      }));
    },
  });

  return { leads, isLoading, error };
}
