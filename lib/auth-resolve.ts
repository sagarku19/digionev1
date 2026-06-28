// Helpers for resolving the calling user's profile.id (the value used as
// creator_id across the schema) from an authenticated Supabase user.
// Used by routes that need server-side creator identity.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type Db = SupabaseClient<Database>;

/**
 * 3-hop resolve: auth.users.id -> public.users.id -> public.profiles.id, in a
 * SINGLE round-trip via a PostgREST embed (profiles is FK'd to users.id). Returns
 * null if either hop is missing (orphan auth user / missing profile). Must be
 * called with the service-role client; RLS otherwise blocks the cross-user reads.
 */
export async function resolveCreatorIdFromAuthUserId(
  serviceDb: Db,
  authUserId: string
): Promise<string | null> {
  const { data } = await serviceDb
    .from('users')
    .select('id, profiles(id)')
    .eq('auth_provider_id', authUserId)
    .maybeSingle();
  if (!data) return null;
  const profile = Array.isArray(data.profiles) ? data.profiles[0] : (data.profiles as { id: string } | null);
  return profile?.id ?? null;
}
