import { describe, it, expect, vi } from 'vitest';
import {
  identityFromClaims,
  shouldFallBackToGetUser,
  createJwksCache,
  verifyIdentity,
} from './auth-claims';

const CLAIMS = {
  sub: 'auth-user-1',
  email: 'a@b.com',
  app_metadata: { role: 'creator' },
};

describe('identityFromClaims', () => {
  it('extracts userId, email, role', () => {
    expect(identityFromClaims(CLAIMS)).toEqual({
      userId: 'auth-user-1',
      email: 'a@b.com',
      role: 'creator',
    });
  });

  it('returns null without a sub', () => {
    expect(identityFromClaims({ email: 'a@b.com' })).toBeNull();
    expect(identityFromClaims({ sub: '' })).toBeNull();
  });

  it('nulls missing email and non-string role', () => {
    expect(identityFromClaims({ sub: 'x', app_metadata: { role: 42 } })).toEqual({
      userId: 'x',
      email: null,
      role: null,
    });
  });
});

describe('shouldFallBackToGetUser', () => {
  it('does not fall back when the session is simply missing', () => {
    expect(shouldFallBackToGetUser({ name: 'AuthSessionMissingError' })).toBe(false);
  });

  it('does not fall back when there is no error at all', () => {
    expect(shouldFallBackToGetUser(null)).toBe(false);
  });

  it('falls back on any other auth error (JWKS outage, invalid JWT)', () => {
    expect(shouldFallBackToGetUser({ name: 'AuthApiError' })).toBe(true);
    expect(shouldFallBackToGetUser({ name: 'AuthInvalidJwtError' })).toBe(true);
    expect(shouldFallBackToGetUser({})).toBe(true);
  });
});

describe('createJwksCache', () => {
  const KEYS = { keys: [{ kid: 'k1' }] };

  it('fetches once and serves from cache within the TTL', async () => {
    const fetchJwks = vi.fn(async () => KEYS);
    let t = 0;
    const get = createJwksCache({ fetchJwks, now: () => t, ttlMs: 1000 });
    expect(await get()).toEqual(KEYS);
    t = 500;
    expect(await get()).toEqual(KEYS);
    expect(fetchJwks).toHaveBeenCalledTimes(1);
  });

  it('refetches after the TTL expires', async () => {
    const fetchJwks = vi.fn(async () => KEYS);
    let t = 0;
    const get = createJwksCache({ fetchJwks, now: () => t, ttlMs: 1000 });
    await get();
    t = 1500;
    await get();
    expect(fetchJwks).toHaveBeenCalledTimes(2);
  });

  it('serves stale keys when a refetch fails', async () => {
    let fail = false;
    const fetchJwks = vi.fn(async () => {
      if (fail) throw new Error('network');
      return KEYS;
    });
    let t = 0;
    const get = createJwksCache({ fetchJwks, now: () => t, ttlMs: 1000 });
    await get();
    fail = true;
    t = 2000;
    expect(await get()).toEqual(KEYS);
  });

  it('does not cache an empty key set (pre-rotation project)', async () => {
    const fetchJwks = vi.fn(async () => ({ keys: [] }));
    const get = createJwksCache({ fetchJwks, now: () => 0, ttlMs: 1000 });
    expect(await get()).toBeNull();
    expect(await get()).toBeNull();
    expect(fetchJwks).toHaveBeenCalledTimes(2);
  });

  it('single-flights concurrent fetches', async () => {
    let resolveFetch: (v: typeof KEYS) => void = () => undefined;
    const fetchJwks = vi.fn(
      () => new Promise<typeof KEYS>((r) => { resolveFetch = r; }),
    );
    const get = createJwksCache({ fetchJwks, now: () => 0, ttlMs: 1000 });
    const p1 = get();
    const p2 = get();
    resolveFetch(KEYS);
    expect(await p1).toEqual(KEYS);
    expect(await p2).toEqual(KEYS);
    expect(fetchJwks).toHaveBeenCalledTimes(1);
  });
});

describe('verifyIdentity', () => {
  const JWKS = { keys: [{ kid: 'k1' }] };
  const getJwks = async () => JWKS;

  function fakeClient(overrides: {
    claims?: { data: { claims: Record<string, unknown> } | null; error: { name?: string } | null };
    claimsThrows?: boolean;
    user?: { id: string; email?: string | null; app_metadata?: Record<string, unknown> } | null;
  }) {
    const getClaims = vi.fn(async () => {
      if (overrides.claimsThrows) throw new Error('boom');
      return overrides.claims ?? { data: null, error: null };
    });
    const getUser = vi.fn(async () => ({ data: { user: overrides.user ?? null }, error: null }));
    return { client: { auth: { getClaims, getUser } }, getClaims, getUser };
  }

  it('returns identity from locally verified claims without calling getUser', async () => {
    const { client, getClaims, getUser } = fakeClient({
      claims: { data: { claims: CLAIMS }, error: null },
    });
    expect(await verifyIdentity(client, getJwks)).toEqual({
      userId: 'auth-user-1',
      email: 'a@b.com',
      role: 'creator',
    });
    expect(getUser).not.toHaveBeenCalled();
    expect(getClaims).toHaveBeenCalledWith(undefined, { jwks: JWKS });
  });

  it('returns null on a missing session without calling getUser', async () => {
    const { client, getUser } = fakeClient({
      claims: { data: null, error: { name: 'AuthSessionMissingError' } },
    });
    expect(await verifyIdentity(client, getJwks)).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it('falls back to getUser on other claim errors', async () => {
    const { client, getUser } = fakeClient({
      claims: { data: null, error: { name: 'AuthApiError' } },
      user: { id: 'u1', email: 'e@f.com', app_metadata: { role: 'creator' } },
    });
    expect(await verifyIdentity(client, getJwks)).toEqual({
      userId: 'u1',
      email: 'e@f.com',
      role: 'creator',
    });
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it('falls back to getUser when getClaims throws', async () => {
    const { client } = fakeClient({
      claimsThrows: true,
      user: { id: 'u1' },
    });
    expect(await verifyIdentity(client, getJwks)).toEqual({
      userId: 'u1',
      email: null,
      role: null,
    });
  });

  it('returns null when the fallback also finds no user', async () => {
    const { client } = fakeClient({ claimsThrows: true, user: null });
    expect(await verifyIdentity(client, getJwks)).toBeNull();
  });

  it('omits the jwks option when the cache has none', async () => {
    const { client, getClaims } = fakeClient({
      claims: { data: { claims: CLAIMS }, error: null },
    });
    await verifyIdentity(client, async () => null);
    expect(getClaims).toHaveBeenCalledWith(undefined, undefined);
  });
});
