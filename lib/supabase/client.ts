// lib/supabase/client.ts
// Supabase browser client — safe to use in Client Components.
// DB tables touched: depends on usage (read-only via RLS).

import { createBrowserClient } from '@supabase/ssr';
import { processLock } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { makeFetchWithTimeout, LOCK_ACQUIRE_TIMEOUT_MS, bindLockAcquireTimeout, type AuthLockFn } from '@/lib/supabase/auth-timing';
// [auth-forensics] transparent lock instrumentation + browser-lifecycle capture; no-op unless the debug flag is set
import { wrapLockWithForensics, installForensics, type LockFn } from '@/lib/supabase/auth-forensics';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Per-endpoint fetch timeouts (auth 12s / data 20s). A stalled request on a dead
      // pooled connection (typical after a redirect, sleep/resume or network switch)
      // otherwise pins the per-tab auth lock; aborting frees it so a retry can open a
      // fresh connection. See lib/supabase/auth-timing.ts.
      global: { fetch: makeFetchWithTimeout() },
      // In-memory processLock (per-tab) instead of auth-js's origin-wide navigator.locks,
      // which deadlocked in dev. Cross-tab auth state is synced via onAuthStateChange +
      // BroadcastChannel (MarketingNav / useAuthSession). The lock wait ceiling is raised
      // above the single-stall fetch abort (12s) so waiters ride out a stall instead of
      // throwing — see the invariant note in auth-timing.ts; recovery in
      // lib/supabase/current-user.ts still absorbs the rare double-stall timeout.
      //
      // IMPORTANT: the `lockAcquireTimeout` option below is DROPPED at runtime by
      // @supabase/supabase-js@2.99.2 (`_initSupabaseAuthClient` forwards a fixed
      // allowlist that includes `lock` but not `lockAcquireTimeout`), so GoTrueClient
      // would fall back to its 5000ms default. `bindLockAcquireTimeout` compensates by
      // binding the 15s ceiling into the lock FUNCTION (which IS forwarded). The option
      // is kept for forward-compat. Full trace: bindLockAcquireTimeout in auth-timing.ts.
      auth: {
        // [auth-forensics] wrapper delegates to the bound processLock unchanged when disabled
        lock: wrapLockWithForensics(
          bindLockAcquireTimeout(processLock as AuthLockFn, LOCK_ACQUIRE_TIMEOUT_MS) as LockFn,
        ),
        lockAcquireTimeout: LOCK_ACQUIRE_TIMEOUT_MS,
      } as NonNullable<NonNullable<Parameters<typeof createBrowserClient>[2]>['auth']>,
    },
  );
}

export const supabase = createClient();

// [auth-forensics] installs lifecycle listeners + PerformanceObserver + window hooks; no-op on the server and when disabled
if (typeof window !== 'undefined') installForensics();
