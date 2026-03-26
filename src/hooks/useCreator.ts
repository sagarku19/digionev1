"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export function useCreator() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['creator-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // auth UID → users.auth_provider_id → users.id → profiles.user_id
      const { data, error } = await supabase
        .from('users')
        .select('id, profiles(*)')
        .eq('auth_provider_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('User account not found');

      const profileRow = Array.isArray(data.profiles)
        ? data.profiles[0]
        : (data.profiles as Profile | null);

      if (!profileRow) throw new Error('Profile not found');
      return profileRow;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      if (!profile?.id) throw new Error("No profile loaded");

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-profile'] });
    }
  });

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
