// Shared helper to resolve the profiles.id for the current Supabase auth user.
// Uses: users (auth_provider_id → id) → profiles (user_id → id)
// DB tables: users, profiles (read only)
"use client";

import { supabase } from '@/lib/supabase/client';

export async function getCreatorProfileId(): Promise<string> {
  // getUser() verifies the JWT with Supabase Auth before we trust user.id.
  // getSession() alone is insecure for reads of user fields.
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
