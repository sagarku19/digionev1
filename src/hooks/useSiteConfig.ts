"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database.types';

type SiteConfigRow = any;
type SiteConfigUpdate = any;

export function useSiteConfig() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: config, isLoading, error } = useQuery({
    queryKey: ['siteConfig'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data, error } = await (supabase as any)
        .from('site_config')
        .select('*')
        .eq('creator_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows
      return data as SiteConfigRow | null;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: SiteConfigUpdate) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      
      if (!config) {
        // Create if missing
        const { data, error } = await (supabase as any)
          .from('site_config')
          .insert({ ...updates, creator_id: user.id } as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await (supabase as any)
        .from('site_config')
        .update(updates as any)
        .eq('creator_id', user.id)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteConfig'] });
    }
  });

  return {
    config,
    isLoading,
    error,
    updateConfig: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
