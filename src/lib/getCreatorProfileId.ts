// Shared helper to resolve the profiles.id for the current Supabase auth user.
// Uses: users (auth_provider_id → id) → profiles (user_id → id)
// DB tables: users, profiles (read only)
"use client";

import { createClient } from '@/lib/supabase/client';

/**
 * Returns the profiles.id (creator_id) for the currently logged-in user.
 * products, sites, creator_balances, etc. all use profiles.id as creator_id FK.
 * Throws if the user isn't found or no profile exists (signup trigger may have failed).
 */
export async function getCreatorProfileId(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not logged in');

  // users.auth_provider_id stores the Supabase auth UID
  // profiles.user_id → users.id  (not the auth UID)
  const { data, error } = await supabase
    .from('users')
    .select('id, profiles(id)')
    .eq('auth_provider_id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('User account not found in database. Try logging out and back in.');

  const profileRow = Array.isArray(data.profiles)
    ? data.profiles[0]
    : (data.profiles as { id: string } | null);

  if (!profileRow?.id) {
    throw new Error('Profile not found. Your account may not have completed setup.');
  }

  return profileRow.id;
}
