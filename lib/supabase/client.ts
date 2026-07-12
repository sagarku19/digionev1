// lib/supabase/client.ts
// Supabase browser client — safe to use in Client Components.
// DB tables touched: depends on usage (read-only via RLS).

import { createBrowserClient } from '@supabase/ssr';
import { processLock } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
