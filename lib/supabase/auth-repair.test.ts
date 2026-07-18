import { describe, it, expect, vi } from 'vitest';
import {
  storageKeyForUrl,
  readPersistedSession,
  detectRefreshStorm,
  createSessionAdoptionGuard,
} from './auth-repair';

const KEY = 'sb-qcendfisvyjnwmefruba-auth-token';

function base64UrlEncode(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}

function sessionCookieValue(accessToken: string): string {
  return `base64-${base64UrlEncode(JSON.stringify({ access_token: accessToken, refresh_token: 'rt', expires_at: 9999999999 }))}`;
}

describe('storageKeyForUrl', () => {
  it('derives sb-<ref>-auth-token from the project URL', () => {
    expect(storageKeyForUrl('https://qcendfisvyjnwmefruba.supabase.co')).toBe(KEY);
  });

  it('returns null for an unparsable URL', () => {
    expect(storageKeyForUrl('not a url')).toBeNull();
  });
});

describe('readPersistedSession', () => {
  it('reads a plain JSON cookie', () => {
    const cookie = `${KEY}=${encodeURIComponent(JSON.stringify({ access_token: 'tok-plain' }))}`;
    expect(readPersistedSession(cookie, KEY)).toEqual({
      accessToken: 'tok-plain',
      cookieNames: [KEY],
    });
  });

  it('reads a base64url-encoded cookie', () => {
    const cookie = `${KEY}=${sessionCookieValue('tok-b64')}; other=1`;
    expect(readPersistedSession(cookie, KEY)).toEqual({
      accessToken: 'tok-b64',
      cookieNames: [KEY],
    });
  });

  it('reassembles chunked cookies in order', () => {
    const full = sessionCookieValue('tok-chunked');
    const mid = Math.floor(full.length / 2);
    const cookie = `${KEY}.0=${full.slice(0, mid)}; ${KEY}.1=${full.slice(mid)}`;
    expect(readPersistedSession(cookie, KEY)).toEqual({
      accessToken: 'tok-chunked',
      cookieNames: [`${KEY}.0`, `${KEY}.1`],
    });
  });

  it('returns null accessToken when no auth cookie exists', () => {
    expect(readPersistedSession('unrelated=1; foo=bar', KEY)).toEqual({
      accessToken: null,
      cookieNames: [],
    });
  });

  it('survives a corrupt cookie without throwing', () => {
    const cookie = `${KEY}=base64-%%%not-base64%%%`;
    expect(readPersistedSession(cookie, KEY).accessToken).toBeNull();
  });

  it('ignores the pkce code-verifier cookie', () => {
    const cookie = `${KEY}-code-verifier=xyz; ${KEY}=${sessionCookieValue('tok')}`;
    expect(readPersistedSession(cookie, KEY)).toEqual({
      accessToken: 'tok',
      cookieNames: [KEY],
    });
  });
});

describe('detectRefreshStorm', () => {
  it('flags 3+ refreshes inside the window', () => {
    const now = 1_000_000;
    expect(detectRefreshStorm([now - 30_000, now - 15_000, now], now)).toBe(true);
  });

  it('does not flag a healthy hourly cadence', () => {
    const now = 10_000_000;
    expect(detectRefreshStorm([now - 7_200_000, now - 3_600_000, now], now)).toBe(false);
  });

  it('does not flag a sign-in double event', () => {
    const now = 1_000_000;
    expect(detectRefreshStorm([now - 1_000, now], now)).toBe(false);
  });
});

describe('createSessionAdoptionGuard', () => {
  function makeDeps(overrides: Partial<Parameters<typeof createSessionAdoptionGuard>[0]> = {}) {
    let cookie = `${KEY}=${sessionCookieValue('stale-token')}`;
    const deps = {
      storageKey: KEY,
      getCookieString: () => cookie,
      purgeCookies: vi.fn((names: string[]) => {
        void names;
        cookie = '';
      }),
      persistSession: vi.fn(async (s: { access_token: string; refresh_token: string }) => {
        cookie = `${KEY}=${sessionCookieValue(s.access_token)}`;
      }),
      warn: vi.fn(),
      now: () => 1_000_000,
      ...overrides,
    };
    return deps;
  }

  const session = { access_token: 'fresh-token', refresh_token: 'rt-fresh' };

  it('reports healthy when storage matches the event session', async () => {
    const deps = makeDeps();
    const guard = createSessionAdoptionGuard(deps);
    const result = await guard({ access_token: 'stale-token', refresh_token: 'rt' });
    expect(result).toBe('healthy');
    expect(deps.purgeCookies).not.toHaveBeenCalled();
    expect(deps.persistSession).not.toHaveBeenCalled();
  });

  it('purges and re-persists on mismatch, then verifies', async () => {
    const deps = makeDeps();
    const guard = createSessionAdoptionGuard(deps);
    const result = await guard(session);
    expect(result).toBe('repaired');
    expect(deps.purgeCookies).toHaveBeenCalledWith([KEY]);
    expect(deps.persistSession).toHaveBeenCalledWith(session);
    expect(deps.warn).toHaveBeenCalled();
  });

  it('reports failed when the rewrite still does not stick', async () => {
    const deps = makeDeps({
      persistSession: vi.fn(async () => {
        /* cookie unchanged — write silently failing */
      }),
    });
    const guard = createSessionAdoptionGuard(deps);
    const result = await guard(session);
    expect(result).toBe('failed');
    expect(deps.warn).toHaveBeenCalled();
  });

  it('skips when a repair ran inside the cooldown window', async () => {
    let t = 1_000_000;
    const deps = makeDeps({ now: () => t });
    const guard = createSessionAdoptionGuard(deps);
    expect(await guard(session)).toBe('repaired');
    t += 10_000; // inside the 60s cooldown
    expect(await guard({ access_token: 'another', refresh_token: 'rt2' })).toBe('skipped');
    t += 120_000; // past cooldown
    expect(await guard({ access_token: 'third', refresh_token: 'rt3' })).toBe('repaired');
  });

  it('treats missing storage as a mismatch and repairs it', async () => {
    const deps = makeDeps({ getCookieString: () => '' });
    let written = '';
    deps.persistSession = vi.fn(async (s: { access_token: string; refresh_token: string }) => {
      written = `${KEY}=${sessionCookieValue(s.access_token)}`;
    });
    deps.getCookieString = () => written;
    const guard = createSessionAdoptionGuard(deps);
    expect(await guard(session)).toBe('repaired');
  });
});
