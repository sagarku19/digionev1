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
  userRole: string | null;
}

// getUser() serializes on the origin-wide Supabase auth lock and its fetch has
// no timeout — a stalled holder (multi-tab dev steal thrash, see the note on
// useLoginMutation) would otherwise pin every consumer in a loading state
// forever. Degrade to logged-out after 10s; the next auth-state invalidation
// corrects the UI once the lock clears.
const AUTH_CHECK_TIMEOUT_MS = 10_000;

export function useAuthSession() {
  const query = useQuery({
    queryKey: ['auth', 'session'] as const,
    queryFn: async (): Promise<AuthSessionData> => {
      try {
        const user = await Promise.race([
          supabase.auth.getUser().then(({ data }) => data.user),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), AUTH_CHECK_TIMEOUT_MS)),
        ]);
        if (!user) return { isLoggedIn: false, userEmail: null, profile: null, userRole: null };

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
          userRole: (user.app_metadata?.role as string) ?? null,
        };
      } catch (err) {
        console.error('useAuthSession error:', err);
        throw err;
      }
    },
    // Auth changes are propagated by the onAuthStateChange subscription in
    // MarketingNav (cross-tab via BroadcastChannel), so focus refetches add
    // nothing except contention on the origin-wide Supabase auth lock —
    // getUser() holds it across a network round-trip, and auth-js recovers
    // from acquire timeouts by stealing the lock, aborting the other caller.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    isLoggedIn: query.data?.isLoggedIn ?? false,
    userEmail: query.data?.userEmail ?? null,
    profile: query.data?.profile ?? null,
    userRole: query.data?.userRole ?? null,
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
