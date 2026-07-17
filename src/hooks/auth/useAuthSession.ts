// Wraps the tri-state auth snapshot + profile join. Subscription/invalidation
// lives in MarketingNav (marketing pages) and AuthGuard (dashboard).
// DB tables: profiles (read via users join), auth.users
// Query keys: ['auth','session']
"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { getAuthSnapshot, type AuthStatus } from '@/lib/supabase/current-user';

export interface AuthSessionData {
  isLoggedIn: boolean;
  userEmail: string | null;
  profile: { full_name: string | null; avatar_url: string | null } | null;
  userRole: string | null;
  authStatus: AuthStatus;
}

export function useAuthSession() {
  const query = useQuery({
    queryKey: ['auth', 'session'] as const,
    queryFn: async (): Promise<AuthSessionData> => {
      // The snapshot always settles (fetch aborts at 12s; lock retry is bounded)
      // and classifies stalls as 'degraded' — the old 10s race-to-null treated
      // slow auth as logged-out, which was exactly the false-logout bug.
      const snapshot = await getAuthSnapshot();
      if (!snapshot.user) {
        return { isLoggedIn: false, userEmail: null, profile: null, userRole: null, authStatus: snapshot.status };
      }
      const base = {
        isLoggedIn: true,
        userEmail: snapshot.user.email ?? null,
        userRole: (snapshot.user.app_metadata?.role as string) ?? null,
        authStatus: snapshot.status,
      };
      if (snapshot.status === 'degraded') {
        // Don't attempt the profile join over a network that just stalled.
        return { ...base, profile: null };
      }
      const { data } = await supabase
        .from('users')
        .select('id, profiles(full_name, avatar_url)')
        .eq('auth_provider_id', snapshot.user.id)
        .maybeSingle();

      const joined: unknown = data?.profiles;
      const raw = (Array.isArray(joined) ? joined[0] : joined) as
        | { full_name: string | null; avatar_url: string | null }
        | null
        | undefined;
      return {
        ...base,
        profile: raw ? { full_name: raw.full_name ?? null, avatar_url: raw.avatar_url ?? null } : null,
      };
    },
    // Auth changes are propagated by the onAuthStateChange subscriptions in
    // MarketingNav and AuthGuard (cross-tab via BroadcastChannel), so focus
    // refetches add nothing except contention on the per-tab Supabase auth lock.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    isLoggedIn: query.data?.isLoggedIn ?? false,
    userEmail: query.data?.userEmail ?? null,
    profile: query.data?.profile ?? null,
    userRole: query.data?.userRole ?? null,
    // No data (still loading, or the query errored) means "unknown", which must
    // read as degraded — never as a definitive logout the guard would act on.
    authStatus: (query.data?.authStatus ?? 'degraded') as AuthStatus,
    isLoading: query.isLoading,
  };
}

export interface LoginVariables {
  email: string;
  password: string;
}

// Retry-once wrapper for sign-in: a stalled fetch surfaces as
// AuthRetryableFetchError (the browser client aborts any request still pending
// after 12s, and auth-js wraps the rejection), so one automatic retry on a
// fresh connection absorbs the common dead-socket case before the user sees an
// error. Injectable for tests.
export async function signInWithRetry<T extends { error: { name?: string } | null }>(
  signIn: () => Promise<T>,
  retryDelayMs = 1000,
): Promise<T> {
  const first = await signIn();
  if (first.error?.name !== 'AuthRetryableFetchError') return first;
  await new Promise((r) => setTimeout(r, retryDelayMs));
  return signIn();
}

// The 15s race is only a last-resort net in case something outside the fetch
// layer wedges; each attempt gets its own timer.
export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation<User, Error, LoginVariables>({
    mutationFn: async ({ email, password }) => {
      const attempt = () =>
        Promise.race([
          supabase.auth.signInWithPassword({ email, password }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Sign-in timed out after 15s. Try again.')), 15_000),
          ),
        ]);

      const { data, error } = await signInWithRetry(attempt);
      if (error) {
        if (error.name === 'AuthRetryableFetchError') {
          throw new Error(
            'Could not reach the sign-in server even after retrying — check your connection and try again.',
          );
        }
        throw new Error(error.message || 'Invalid email or password.');
      }
      if (!data.user) throw new Error('Sign-in returned no user. Please try again.');
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    },
  });
}
