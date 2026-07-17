import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isAuthEndpoint,
  resolveRequestUrl,
  timeoutForUrl,
  makeFetchWithTimeout,
  AUTH_FETCH_TIMEOUT_MS,
  DATA_FETCH_TIMEOUT_MS,
  AUTHJS_REFRESH_RETRY_CEILING_MS,
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

  it('aborts an AUTH request at 12s (still pending at 11.999s)', async () => {
    const wrapped = makeFetchWithTimeout(hangingFetch());
    const p = wrapped('https://x/auth/v1/user');
    const rejected = vi.fn();
    p.catch(rejected);

    await vi.advanceTimersByTimeAsync(AUTH_FETCH_TIMEOUT_MS - 1);
    expect(rejected).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await expect(p).rejects.toBeTruthy();
  });

  it('gives DATA requests the longer 20s budget (still pending at 12.001s)', async () => {
    const wrapped = makeFetchWithTimeout(hangingFetch());
    const p = wrapped('https://x/rest/v1/orders');
    const rejected = vi.fn();
    p.catch(rejected);

    await vi.advanceTimersByTimeAsync(AUTH_FETCH_TIMEOUT_MS + 1);
    expect(rejected).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DATA_FETCH_TIMEOUT_MS - AUTH_FETCH_TIMEOUT_MS);
    await expect(p).rejects.toBeTruthy();
  });

  it('SLOW-BUT-VALID: an auth request that resolves at 3s is NOT aborted', async () => {
    const slowFetch = vi.fn((_i: RequestInfo | URL, _init?: RequestInit) =>
      new Promise<Response>((res) => setTimeout(() => res(new Response('ok')), 3_000)),
    );
    const wrapped = makeFetchWithTimeout(slowFetch);
    const p = wrapped('https://x/auth/v1/token');

    await vi.advanceTimersByTimeAsync(3_000);
    const res = await p;
    expect(res.ok).toBe(true);
  });

  it('honours a caller-supplied abort signal', async () => {
    const wrapped = makeFetchWithTimeout(hangingFetch());
    const caller = new AbortController();
    const p = wrapped('https://x/auth/v1/user', { signal: caller.signal });
    caller.abort(new Error('caller cancelled'));
    await expect(p).rejects.toBeTruthy();
  });
});
