// Wraps supabase.auth.getUser() + profile join. Subscription/invalidation lives in MarketingNav.
// DB tables: profiles (read via users join), auth.users
// Query keys: ['auth','session']
"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

export interface AuthSessionData {
  isLoggedIn: boolean;
  userEmail: string | null;
  profile: { full_name: string | null; avatar_url: string | null } | null;
}

export function useAuthSession() {
  const query = useQuery({
    queryKey: ['auth', 'session'] as const,
    queryFn: async (): Promise<AuthSessionData> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { isLoggedIn: false, userEmail: null, profile: null };

        const { data } = await supabase
          .from('users')
          .select('id, profiles(full_name, avatar_url)')
          .eq('auth_provider_id', user.id)
          .maybeSingle();

        const raw = Array.isArray(data?.profiles) ? data?.profiles[0] : (data?.profiles as any);
        return {
          isLoggedIn: true,
          userEmail: user.email ?? null,
          profile: raw ? { full_name: raw.full_name ?? null, avatar_url: raw.avatar_url ?? null } : null,
        };
      } catch (err) {
        console.error('useAuthSession error:', err);
        throw err;
      }
    },
    staleTime: 30_000,
  });

  return {
    isLoggedIn: query.data?.isLoggedIn ?? false,
    userEmail: query.data?.userEmail ?? null,
    profile: query.data?.profile ?? null,
    isLoading: query.isLoading,
  };
}

export interface LoginVariables {
  email: string;
  password: string;
}

// Wraps signInWithPassword in a 15s race-timeout: Supabase's auth client uses
// navigator.locks, and competing useAuthSession() callers can deadlock the lock
// in dev — the timeout ensures the form recovers rather than spinning forever.
export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation<User, Error, LoginVariables>({
    mutationFn: async ({ email, password }) => {
      const signInPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Sign-in timed out after 15s. Try again.')), 15_000)
      );

      const { data, error } = await Promise.race([signInPromise, timeoutPromise]);
      if (error) throw new Error(error.message || 'Invalid email or password.');
      if (!data.user) throw new Error('Sign-in returned no user. Please try again.');
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    },
  });
}
