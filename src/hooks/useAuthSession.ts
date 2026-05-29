// Wraps supabase.auth.getSession() + profile join. Subscription/invalidation lives in MarketingNav.
// DB tables: profiles (read via users join), auth.users
// Query keys: ['auth','session']
"use client";

import { useQuery } from '@tanstack/react-query';
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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return { isLoggedIn: false, userEmail: null, profile: null };

        const { data } = await supabase
          .from('users')
          .select('id, profiles(full_name, avatar_url)')
          .eq('auth_provider_id', session.user.id)
          .maybeSingle();

        const raw = Array.isArray(data?.profiles) ? data?.profiles[0] : (data?.profiles as any);
        return {
          isLoggedIn: true,
          userEmail: session.user.email ?? null,
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
