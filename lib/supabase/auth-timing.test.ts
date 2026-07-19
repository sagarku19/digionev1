import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient as createSupabaseClient, processLock } from '@supabase/supabase-js';
import {
  isAuthEndpoint,
  resolveRequestUrl,
  timeoutForUrl,
  makeFetchWithTimeout,
  bindLockAcquireTimeout,
  type AuthLockFn,
  AUTH_FETCH_TIMEOUT_MS,
  DATA_FETCH_TIMEOUT_MS,
  AUTHJS_REFRESH_RETRY_CEILING_MS,
  LOCK_ACQUIRE_TIMEOUT_MS,
} from './auth-timing';

describe('auth-timing: classification', () => {
  it('detects /auth/v1/ endpoints', () => {
    expect(isAuthEndpoint('https://x.supabase.co/auth/v1/token?grant_type=password')).toBe(true);
    expect(isAuthEndpoint('https://x.supabase.co/auth/v1/user')).toBe(true);
    expect(isAuthEndpoint('https://x.supabase.co/rest/v1/orders')).toBe(false);
    expect(isAuthEndpoint('https://x.supabase.co/storage/v1/object/public/a.png')).toBe(false);
  });

  it('resolves url from string, URL and Request inputs', () => {
    expect(resolveRequestUrl('https://x/auth/v1/user')).toBe('https://x/auth/v1/user');
    expect(resolveRequestUrl(new URL('https://x/auth/v1/user'))).toBe('https://x/auth/v1/user');
    expect(resolveRequestUrl(new Request('https://x/rest/v1/orders'))).toBe('https://x/rest/v1/orders');
  });

  it('picks the auth timeout for auth urls and data timeout otherwise', () => {
    expect(timeoutForUrl('https://x/auth/v1/token')).toBe(AUTH_FETCH_TIMEOUT_MS);
    expect(timeoutForUrl('https://x/rest/v1/orders')).toBe(DATA_FETCH_TIMEOUT_MS);
  });

  it('REGRESSION GUARD: auth timeout stays below the auth-js 30s refresh-retry ceiling and ordering holds', () => {
    expect(AUTH_FETCH_TIMEOUT_MS).toBeGreaterThan(0);
    expect(AUTH_FETCH_TIMEOUT_MS).toBeLessThan(AUTHJS_REFRESH_RETRY_CEILING_MS);
    expect(DATA_FETCH_TIMEOUT_MS).toBeGreaterThanOrEqual(AUTH_FETCH_TIMEOUT_MS);
  });

  it('REGRESSION GUARD: lock waiters must be able to ride out a single stalled fetch', () => {
    // 5s (auth-js default) < 12s single-stall hold guaranteed every waiter threw
    // ProcessLockAcquireTimeoutError during any stall. The wait ceiling must sit
    // strictly between one stall and the 30s worst-case refresh-retry hold.
    expect(LOCK_ACQUIRE_TIMEOUT_MS).toBeGreaterThan(AUTH_FETCH_TIMEOUT_MS);
    expect(LOCK_ACQUIRE_TIMEOUT_MS).toBeLessThan(AUTHJS_REFRESH_RETRY_CEILING_MS);
  });
});

describe('auth-timing: makeFetchWithTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function hangingFetch() {
    // Never resolves on its own; only rejects when its signal aborts.
    return vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_res, rej) => {
        init?.signal?.addEventListener('abort', () =>
          rej((init.signal as AbortSignal).reason ?? new Error('aborted')),
        );
      }),
    );
  }

  it('DEAD-SOCKET SELF-HEAL: a stalled GET aborts at 12s and is retried once on a fresh connection — no error escapes', async () => {
    const baseFetch = vi
      .fn((_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_res, rej) => {
          init?.signal?.addEventListener('abort', () =>
            rej((init.signal as AbortSignal).reason ?? new Error('aborted')),
          );
        }),
      )
      .mockImplementationOnce((_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_res, rej) => {
          init?.signal?.addEventListener('abort', () =>
            rej((init.signal as AbortSignal).reason ?? new Error('aborted')),
          );
        }),
      )
      .mockImplementation(() => Promise.resolve(new Response('ok')));
    const wrapped = makeFetchWithTimeout(baseFetch as unknown as typeof fetch);
    const p = wrapped('https://x/auth/v1/user');

    await vi.advanceTimersByTimeAsync(AUTH_FETCH_TIMEOUT_MS);
    const res = await p;
    expect(res.ok).toBe(true);
    expect(baseFetch).toHaveBeenCalledTimes(2);
  });

  it('a GET that stalls on BOTH attempts rejects only after 2× the budget', async () => {
    const baseFetch = hangingFetch();
    const wrapped = makeFetchWithTimeout(baseFetch);
    const p = wrapped('https://x/auth/v1/user');
    const rejected = vi.fn();
    p.catch(rejected);

    await vi.advanceTimersByTimeAsync(AUTH_FETCH_TIMEOUT_MS - 1);
    expect(rejected).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(AUTH_FETCH_TIMEOUT_MS + 1);
    await expect(p).rejects.toBeTruthy();
    expect(baseFetch).toHaveBeenCalledTimes(2);
  });

  it('a POST (non-idempotent) is NEVER retried — single abort at the budget', async () => {
    const baseFetch = hangingFetch();
    const wrapped = makeFetchWithTimeout(baseFetch);
    const p = wrapped('https://x/auth/v1/token?grant_type=password', { method: 'POST' });
    const rejected = vi.fn();
    p.catch(rejected);

    await vi.advanceTimersByTimeAsync(AUTH_FETCH_TIMEOUT_MS - 1);
    expect(rejected).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await expect(p).rejects.toBeTruthy();
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });

  it('DATA requests keep the longer 20s budget (still pending at 12.001s)', async () => {
    const baseFetch = hangingFetch();
    const wrapped = makeFetchWithTimeout(baseFetch);
    const p = wrapped('https://x/rest/v1/orders', { method: 'POST' });
    const rejected = vi.fn();
    p.catch(rejected);

    await vi.advanceTimersByTimeAsync(AUTH_FETCH_TIMEOUT_MS + 1);
    expect(rejected).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DATA_FETCH_TIMEOUT_MS - AUTH_FETCH_TIMEOUT_MS);
    await expect(p).rejects.toBeTruthy();
  });

  it('SLOW-BUT-VALID: an auth request that resolves at 3s is NOT aborted', async () => {
    const slowFetch = vi.fn(() =>
      new Promise<Response>((res) => setTimeout(() => res(new Response('ok')), 3_000)),
    );
    const wrapped = makeFetchWithTimeout(slowFetch);
    const p = wrapped('https://x/auth/v1/token');

    await vi.advanceTimersByTimeAsync(3_000);
    const res = await p;
    expect(res.ok).toBe(true);
  });

  it('honours a caller-supplied abort signal and does NOT retry a caller abort', async () => {
    const baseFetch = hangingFetch();
    const wrapped = makeFetchWithTimeout(baseFetch);
    const caller = new AbortController();
    const p = wrapped('https://x/auth/v1/user', { signal: caller.signal });
    caller.abort(new Error('caller cancelled'));
    await expect(p).rejects.toBeTruthy();
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });
});

// supabase-js@2.99.2 forwards the `lock` fn but DROPS `lockAcquireTimeout` (fixed
// destructuring allowlist in _initSupabaseAuthClient), so GoTrueClient uses its 5000ms
// default. bindLockAcquireTimeout restores the intended ceiling by binding it into the
// lock fn itself. These guard that the effective timeout is 15s and cannot silently
// regress to 5s. See the WHY block on bindLockAcquireTimeout in auth-timing.ts.
describe('auth-timing: bindLockAcquireTimeout (works around supabase-js dropping the option)', () => {
  it('effective acquire timeout is LOCK_ACQUIRE_TIMEOUT_MS (15000)', async () => {
    const seen: number[] = [];
    const baseLock: AuthLockFn = async (_name, acquireTimeout, fn) => {
      seen.push(acquireTimeout);
      return fn();
    };
    const bound = bindLockAcquireTimeout(baseLock, LOCK_ACQUIRE_TIMEOUT_MS);

    // GoTrueClient hands in its (dropped-option) 5000 default; the base lock must see 15000.
    const result = await bound('lock:sb-ref-auth-token', 5000, async () => 'value');

    expect(result).toBe('value');
    expect(LOCK_ACQUIRE_TIMEOUT_MS).toBe(15000);
    expect(seen).toEqual([15000]);
  });

  it('CANNOT silently regress to the 5000ms default whatever GoTrueClient passes', async () => {
    let effective = -1;
    const baseLock: AuthLockFn = async (_name, acquireTimeout, fn) => {
      effective = acquireTimeout;
      return fn();
    };
    const bound = bindLockAcquireTimeout(baseLock, LOCK_ACQUIRE_TIMEOUT_MS);

    // Every value GoTrueClient could realistically pass — the default, 0, negatives —
    // is erased and replaced with the ceiling.
    for (const passed of [5000, 0, -1, 7000]) {
      effective = -1;
      await bound('lock:x', passed, async () => undefined);
      expect(effective).toBe(LOCK_ACQUIRE_TIMEOUT_MS);
      expect(effective).not.toBe(5000);
    }
  });

  it('stays correct after a future SDK upgrade that forwards 15000 itself (idempotent no-op)', async () => {
    let effective = -1;
    const baseLock: AuthLockFn = async (name, acquireTimeout, fn) => {
      expect(name).toBe('lock:sb-ref');
      effective = acquireTimeout;
      return fn();
    };
    const bound = bindLockAcquireTimeout(baseLock, LOCK_ACQUIRE_TIMEOUT_MS);

    // If supabase-js later forwards the option, GoTrueClient passes 15000 → still 15000.
    const out = await bound('lock:sb-ref', LOCK_ACQUIRE_TIMEOUT_MS, async () => 42);

    expect(out).toBe(42);
    expect(effective).toBe(LOCK_ACQUIRE_TIMEOUT_MS);
  });

  it('propagates rejection from the wrapped lock (no swallowing)', async () => {
    const baseLock: AuthLockFn = async () => {
      throw new Error('acquire failed');
    };
    const bound = bindLockAcquireTimeout(baseLock, LOCK_ACQUIRE_TIMEOUT_MS);
    await expect(bound('lock:x', 5000, async () => 'unused')).rejects.toThrow('acquire failed');
  });

  // CANARY — proves the upstream drop is real in the installed supabase-js, and will
  // FAIL loudly if a future upgrade starts forwarding `lockAcquireTimeout`. If it fails,
  // the bindLockAcquireTimeout override in client.ts can be reconsidered/removed.
  it('CANARY: supabase-js still drops lockAcquireTimeout → GoTrueClient default stays 5000', () => {
    const client = createSupabaseClient('https://canary.supabase.co', 'anon-key', {
      auth: {
        lock: processLock,
        // Deliberately request 15000 the "obvious" way — this is what does NOT reach GoTrueClient.
        lockAcquireTimeout: 15000,
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      } as NonNullable<Parameters<typeof createSupabaseClient>[2]>['auth'],
    });
    const effective = (client.auth as unknown as { lockAcquireTimeout: number }).lockAcquireTimeout;
    expect(effective).toBe(5000);
    expect(effective).not.toBe(15000);
  });
});
