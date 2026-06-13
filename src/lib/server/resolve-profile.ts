// Resolves a Supabase auth user id to the profiles.id used as creator_id
// across the schema. Server-only (service role — RLS blocks cross-user reads).

import { createServiceClient } from '@/lib/supabase/service';

export async function resolveProfileId(
  authUserId: string,
  email?: string | null
): Promise<string | null> {
  const db = createServiceClient();

  let publicUserId: string | null = null;

  const { data: byAuthId, error: authIdErr } = await db
    .from('users')
    .select('id')
    .eq('auth_provider_id', authUserId)
    .maybeSingle();

  if (authIdErr) {
    console.error('[resolve-profile] users lookup failed:', authIdErr.message);
    return null;
  }

  publicUserId = byAuthId?.id ?? null;

  if (!publicUserId && email) {
    const { data: byEmail } = await db
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    publicUserId = byEmail?.id ?? null;
  }

  if (!publicUserId) return null;

  const { data: profile, error: profileErr } = await db
    .from('profiles')
    .select('id')
    .eq('user_id', publicUserId)
    .maybeSingle();

  if (profileErr) {
    console.error('[resolve-profile] profiles lookup failed:', profileErr.message);
    return null;
  }

  return profile?.id ?? null;
}
