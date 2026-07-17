// Shared helper to resolve the profiles.id for the current Supabase auth user.
// Uses: users (auth_provider_id → id) → profiles (user_id → id)
// DB tables: users, profiles (read only)
//
// Memoized per verified auth user.id with concurrent dedup. Status-aware
// (tri-state snapshot): degraded auth serves the cached id when present, throws
// retryable AuthUnavailableError when not (TanStack backoff self-heals);
// unauthenticated throws NotLoggedInError (AuthGuard owns the redirect). See
// docs/superpowers/specs/2026-07-18-auth-reliability-design.md and
// .claude/todo-later/18(half)-2026-07-17-identity-profile-resolution-caching.md
"use client";

import { supabase } from '@/lib/supabase/client';
import { getAuthSnapshot, type AuthSnapshot } from '@/lib/supabase/current-user';
import { AuthUnavailableError, NotLoggedInError } from '@/lib/supabase/auth-errors';

interface ProfileIdDeps {
  getSnapshot: () => Promise<AuthSnapshot>;
  fetchProfileId: (authUserId: string) => Promise<string>;
}

export function createProfileIdResolver(deps: ProfileIdDeps): () => Promise<string> {
  let cachedUserId: string | null = null;
  let cachedProfileId: string | null = null;
  let inFlightUserId: string | null = null;
  let inFlight: Promise<string> | null = null;

  return async () => {
    const snapshot = await deps.getSnapshot();
    if (!snapshot.user) {
      // degraded-with-no-known-user is a stall, not a logout — stay retryable.
      throw snapshot.status === 'degraded' ? new AuthUnavailableError() : new NotLoggedInError();
    }
    const authUserId = snapshot.user.id;
    if (cachedUserId === authUserId && cachedProfileId) return cachedProfileId;
    if (snapshot.status === 'degraded') {
      // No cache to serve and the identity may be stale — don't query on it.
      throw new AuthUnavailableError();
    }
    if (inFlight && inFlightUserId === authUserId) return inFlight;

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
  getSnapshot: getAuthSnapshot,
  fetchProfileId: fetchProfileIdFromDb,
});
