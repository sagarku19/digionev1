// lib/supabase/client.ts
// Supabase browser client — safe to use in Client Components.
// DB tables touched: depends on usage (read-only via RLS).

import { createBrowserClient } from '@supabase/ssr';
import { processLock } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { makeFetchWithTimeout } from '@/lib/supabase/auth-timing';

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
      // BroadcastChannel (MarketingNav / useAuthSession). lockAcquireTimeout stays at the
      // 5s default — recovery in lib/supabase/current-user.ts absorbs a stall rather than
      // a longer freeze.
      auth: { lock: processLock },
    },
  );
}

export const supabase = createClient();
