// lib/supabase/service.ts
// Supabase service-role client — SERVER ONLY. Never import in client components.
// DB tables touched: creator_balances, transaction_ledger, orders (server writes),
//                    creator_revenue_shares, user_product_access, product_licenses.

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Creates a Supabase client with the service role key.
 *
 * ONLY use in:
 *   - app/api/* Route Handlers
 *   - server-side scripts
 *
 * NEVER use in:
 *   - Client Components
 *   - Server Components (use createClient from ./server.ts instead)
 *
 * This bypasses RLS — all writes go straight to the DB.
 * Used for: orders INSERT, creator_balances UPDATE, transaction_ledger INSERT.
 */
export function createServiceClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      '[createServiceClient] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY is missing. ' +
      'This client must only be used in server-side Route Handlers.'
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  });
}
