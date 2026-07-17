'use client';
// Client-side auth boundary for /dashboard/**. proxy.ts gates initial
// navigations server-side; this covers session-death-while-open and cross-tab
// sign-out. Redirects ONLY on a definitive logout — degraded (stall) states
// render normally and self-heal via query retries + refetchOnReconnect.

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuthSession } from '@/hooks/auth/useAuthSession';
import type { AuthStatus } from '@/lib/supabase/current-user';

export function shouldRedirectToLogin(status: AuthStatus, isLoading: boolean): boolean {
  return !isLoading && status === 'unauthenticated';
}

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { authStatus, isLoading } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // MarketingNav owns this invalidation on marketing pages but is not mounted
  // on the dashboard — without it, cross-tab sign-out wouldn't reach this guard
  // until staleTime expires.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  useEffect(() => {
    if (shouldRedirectToLogin(authStatus, isLoading)) {
      router.replace(`/login?returnUrl=${encodeURIComponent(pathname ?? '/dashboard')}`);
    }
  }, [authStatus, isLoading, pathname, router]);

  return <>{children}</>;
}
