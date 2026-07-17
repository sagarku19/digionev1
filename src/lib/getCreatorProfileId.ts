// Shared helper to resolve the profiles.id for the current Supabase auth user.
// Uses: users (auth_provider_id → id) → profiles (user_id → id)
// DB tables: users, profiles (read only)
//
// The resolution is memoized per authenticated user.id (with concurrent-call
// dedup) so the ~23 dashboard hooks that call this don't each re-run the
// getUser + users→profiles round-trip on every mount/navigation. The auth
// user.id is re-verified via getCurrentUser() on every call (JWT check, not
// getSession()); the cache is only a filter value, never a credential, and RLS
// still gates every downstream query. See
// .claude/todo-later/18(half)-2026-07-17-identity-profile-resolution-caching.md
"use client";

import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/current-user';

interface ProfileIdDeps {
  getUser: () => Promise<{ id: string } | null>;
  fetchProfileId: (authUserId: string) => Promise<string>;
}

// Factory holds the per-user cache + in-flight promise in a closure so it can be
// unit-tested with injected deps (mirrors createSingleFlight in current-user.ts).
export function createProfileIdResolver(deps: ProfileIdDeps): () => Promise<string> {
  let cachedUserId: string | null = null;
  let cachedProfileId: string | null = null;
  let inFlightUserId: string | null = null;
  let inFlight: Promise<string> | null = null;

  return async () => {
    // getCurrentUser() verifies the JWT with Supabase Auth before we trust user.id.
    // getSession() alone is insecure for reads of user fields.
    const user = await deps.getUser();
    if (!user) throw new Error('Not logged in');

    if (cachedUserId === user.id && cachedProfileId) return cachedProfileId;
    if (inFlight && inFlightUserId === user.id) return inFlight;

    const authUserId = user.id;
    inFlightUserId = authUserId;
    inFlight = deps
      .fetchProfileId(authUserId)
      .then((profileId) => {
        // Cache only on success — a failed/transient lookup must not become sticky.
        cachedUserId = authUserId;
        cachedProfileId = profileId;
        return profileId;
      })
      .finally(() => {
        inFlight = null;
        inFlightUserId = null;
      });
    return inFlight;
  };
}

async function fetchProfileIdFromDb(authUserId: string): Promise<string> {
  // users.auth_provider_id stores the Supabase auth UID
  // profiles.user_id → users.id  (not the auth UID)
  const { data, error } = await supabase
    .from('users')
    .select('id, profiles(id)')
    .eq('auth_provider_id', authUserId)
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

export const getCreatorProfileId = createProfileIdResolver({
  getUser: getCurrentUser,
  fetchProfileId: fetchProfileIdFromDb,
});
