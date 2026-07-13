// lib/supabase/client.ts
// Supabase browser client — safe to use in Client Components.
// DB tables touched: depends on usage (read-only via RLS).

import { createBrowserClient } from '@supabase/ssr';
import { processLock } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Supabase attaches no timeout to its requests, and a browser fetch can stay
// pending forever when it lands on a dead pooled connection (typical after
// sleep/resume or a network switch). One such stalled request used to pin the
// UI until its race timers gave up — the "Sign-in timed out after 15s" login
// failure where the POST never reaches the server (verified against GoTrue
// logs). Aborting settles the promise so a retry can open a fresh connection.
// 12s sits above any legit request (server round-trips are <1s) and below the
// UI-level safety nets (15s login race, 20s+).
const FETCH_TIMEOUT_MS = 12_000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: fetchWithTimeout },
      // Use the in-memory processLock instead of auth-js's default
      // navigator.locks-based lock. The Web Locks API deadlocks in dev when
      // several getUser()/signInWithPassword() callers contend for the
      // origin-wide lock — which surfaces to the user as
      // "Sign-in timed out after 15s". processLock serializes auth calls within
      // a tab without touching the cross-tab Web Lock. Cross-tab auth state is
      // already synced via onAuthStateChange + BroadcastChannel (see
      // MarketingNav / useAuthSession), so the built-in Web Lock isn't needed.
      auth: { lock: processLock },
    }
  );
}

export const supabase = createClient();
