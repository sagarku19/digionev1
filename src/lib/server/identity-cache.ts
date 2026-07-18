// Server-side authUserId → profiles.id cache, shared by both resolvers
// (src/lib/server/resolve-profile.ts and lib/auth-resolve.ts). The mapping is
// immutable once a profile exists, so positive results never need invalidation.
// NEVER cache a null result: a buyer who upgrades to creator gains a profile
// mid-session, and a cached miss would 403 them until the instance recycles.
// Module scope = per warm serverless instance; bounded FIFO to cap memory.

export const IDENTITY_CACHE_MAX_ENTRIES = 5000;

const cache = new Map<string, string>();

export function getCachedProfileId(authUserId: string): string | undefined {
  return cache.get(authUserId);
}

export function setCachedProfileId(authUserId: string, profileId: string): void {
  if (cache.has(authUserId)) cache.delete(authUserId);
  cache.set(authUserId, profileId);
  if (cache.size > IDENTITY_CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

export function __resetIdentityCacheForTests(): void {
  cache.clear();
}
