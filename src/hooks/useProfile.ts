// Creator profile reads + updates. Split exports so read-only consumers don't pull mutations into their render closure.
// DB tables: profiles (read/write), users (read join)
// Query keys: ['profiles','detail', creatorId]
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

async function fetchProfile(creatorId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', creatorId)
    .single();
  if (error) throw error;
  return data;
}

export function useProfileQuery(creatorId?: string) {
  return useQuery({
    queryKey: ['profiles', 'detail', creatorId ?? null] as const,
    enabled: !!creatorId,
    queryFn: async () => {
      try {
        return await fetchProfile(creatorId!);
      } catch (err) {
        console.error('useProfileQuery error:', err);
        throw err;
      }
    },
  });
}

export function useProfileMutations() {
  const queryClient = useQueryClient();

  const invalidate = (creatorId: string) => {
    queryClient.invalidateQueries({ queryKey: ['profiles', 'detail', creatorId] });
    queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
  };

  const updateProfile = useMutation({
    mutationFn: async ({ creatorId, updates }: { creatorId: string; updates: ProfileUpdate }) => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', creatorId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => invalidate(vars.creatorId),
  });

  const setEmailVerified = useMutation({
    mutationFn: async (creatorId: string) => {
      const { error } = await supabase.from('profiles').update({ email_verified: true } as ProfileUpdate).eq('id', creatorId);
      if (error) throw error;
    },
    onSuccess: (_d, creatorId) => invalidate(creatorId),
  });

  const setMobileVerified = useMutation({
    mutationFn: async (creatorId: string) => {
      const { error } = await supabase.from('profiles').update({ mobile_verified: true } as ProfileUpdate).eq('id', creatorId);
      if (error) throw error;
    },
    onSuccess: (_d, creatorId) => invalidate(creatorId),
  });

  return {
    updateProfile: updateProfile.mutateAsync,
    setEmailVerified: setEmailVerified.mutateAsync,
    setMobileVerified: setMobileVerified.mutateAsync,
    isUpdating: updateProfile.isPending,
  };
}

export function useProfile(creatorId?: string) {
  const query = useProfileQuery(creatorId);
  const mutations = useProfileMutations();
  return { ...query, ...mutations };
}
