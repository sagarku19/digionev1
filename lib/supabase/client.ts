// lib/supabase/client.ts
// Supabase browser client — safe to use in Client Components.
// DB tables touched: depends on usage (read-only via RLS).

import { createBrowserClient } from '@supabase/ssr';
import { processLock } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { makeFetchWithTimeout, LOCK_ACQUIRE_TIMEOUT_MS } from '@/lib/supabase/auth-timing';
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
      // BroadcastChannel (MarketingNav / useAuthSession). lockAcquireTimeout is raised
      // above the single-stall fetch abort (12s) so lock waiters ride out a stall
      // instead of throwing — see the invariant note in auth-timing.ts; recovery in
      // lib/supabase/current-user.ts still absorbs the rare double-stall timeout.
      // lockAcquireTimeout is runtime-supported by auth-js (types.d.ts declares
      // it; GoTrueClient reads settings.lockAcquireTimeout) but @supabase/ssr's
      // narrowed auth-option type omits it — the cast forwards it past the
      // excess-property check without loosening anything else.
      auth: {
        // [auth-forensics] wrapper delegates to processLock unchanged when disabled
        lock: wrapLockWithForensics(processLock as LockFn),
        lockAcquireTimeout: LOCK_ACQUIRE_TIMEOUT_MS,
      } as NonNullable<NonNullable<Parameters<typeof createBrowserClient>[2]>['auth']>,
    },
  );
}

export const supabase = createClient();

// [auth-forensics] installs lifecycle listeners + PerformanceObserver + window hooks; no-op on the server and when disabled
if (typeof window !== 'undefined') installForensics();
