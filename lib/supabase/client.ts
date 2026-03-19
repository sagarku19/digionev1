// lib/supabase/client.ts
// Supabase browser client — safe to use in Client Components.
// DB tables touched: depends on usage (read-only via RLS).

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

/**
 * Creates a Supabase client for browser (Client Component) usage.
 * Always import THIS function — never call createClient() directly in components.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
