// Helpers for resolving the calling user's profile.id (the value used as
// creator_id across the schema) from an authenticated Supabase user.
// Used by routes that need server-side creator identity.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type Db = SupabaseClient<Database>;

/**
 * 3-hop resolve: auth.users.id -> public.users.id -> public.profiles.id.
 * Returns null if either lookup fails (orphan auth user / missing profile).
 * Must be called with the service-role client; RLS otherwise blocks the
 * cross-user reads.
 */
export async function resolveCreatorIdFromAuthUserId(
  serviceDb: Db,
  authUserId: string
): Promise<string | null> {
  const { data: publicUser } = await serviceDb
    .from('users')
    .select('id')
    .eq('auth_provider_id', authUserId)
    .maybeSingle();
  if (!publicUser) return null;

  const { data: profile } = await serviceDb
    .from('profiles')
    .select('id')
    .eq('user_id', publicUser.id)
    .maybeSingle();
  return profile?.id ?? null;
}
