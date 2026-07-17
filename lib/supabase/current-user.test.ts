import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { User } from '@supabase/supabase-js';
import {
  createSingleFlight,
  classifyAuthOutcome,
  resolveAuthSnapshot,
  __resetCurrentUserCacheForTests,
} from './current-user';

const USER_A = { id: 'a', email: 'a@x.com' } as unknown as User;
const USER_B = { id: 'b', email: 'b@x.com' } as unknown as User;
const lockTimeout = () => Object.assign(new Error('Acquiring process lock ... timed out'), { isAcquireTimeout: true });
const authError = (name: string, status?: number) => ({ name, status, message: name });

describe('createSingleFlight', () => {
  it('collapses concurrent callers onto ONE underlying call', async () => {
    let resolve!: (u: User) => void;
    const underlying = vi.fn(() => new Promise<User>((r) => { resolve = r; }));
    const sf = createSingleFlight(underlying);

    const p1 = sf(); const p2 = sf(); const p3 = sf();
    expect(underlying).toHaveBeenCalledTimes(1);

    resolve(USER_A);
    expect(await Promise.all([p1, p2, p3])).toEqual([USER_A, USER_A, USER_A]);
  });

  it('runs the underlying call again after the in-flight settles', async () => {
    const underlying = vi.fn().mockResolvedValueOnce(USER_A).mockResolvedValueOnce(USER_B);
    const sf = createSingleFlight(underlying);
    expect(await sf()).toEqual(USER_A);
    expect(await sf()).toEqual(USER_B);
    expect(underlying).toHaveBeenCalledTimes(2);
  });
});

describe('classifyAuthOutcome', () => {
  it('user present → authenticated', () => {
    expect(classifyAuthOutcome(USER_A, null)).toBe('authenticated');
  });
  it('no user, no error → unauthenticated', () => {
    expect(classifyAuthOutcome(null, null)).toBe('unauthenticated');
  });
  it('AuthSessionMissingError → unauthenticated (genuinely signed out)', () => {
    expect(classifyAuthOutcome(null, authError('AuthSessionMissingError', 400))).toBe('unauthenticated');
  });
  it('AuthRetryableFetchError (abort/network/5xx-gateway) → transient', () => {
    expect(classifyAuthOutcome(null, authError('AuthRetryableFetchError', 0))).toBe('transient');
  });
  it('AuthUnknownError (garbled response) → transient', () => {
    expect(classifyAuthOutcome(null, authError('AuthUnknownError'))).toBe('transient');
  });
  it('AuthApiError 429 (rate limit) → transient, NOT a logout', () => {
    expect(classifyAuthOutcome(null, authError('AuthApiError', 429))).toBe('transient');
  });
  it('AuthApiError 500 → transient', () => {
    expect(classifyAuthOutcome(null, authError('AuthApiError', 500))).toBe('transient');
  });
  it('AuthApiError 401/403 (server rejected token) → unauthenticated', () => {
    expect(classifyAuthOutcome(null, authError('AuthApiError', 401))).toBe('unauthenticated');
    expect(classifyAuthOutcome(null, authError('AuthApiError', 403))).toBe('unauthenticated');
  });
});

describe('resolveAuthSnapshot', () => {
  beforeEach(() => { vi.useFakeTimers(); __resetCurrentUserCacheForTests(); });
  afterEach(() => vi.useRealTimers());

  it('authenticated: returns and caches the user', async () => {
    const snap = await resolveAuthSnapshot(vi.fn().mockResolvedValue({ user: USER_A, error: null }));
    expect(snap).toEqual({ status: 'authenticated', user: USER_A });
  });

  it('transient error degrades WITHOUT clobbering the cached user', async () => {
    await resolveAuthSnapshot(vi.fn().mockResolvedValue({ user: USER_A, error: null }));
    const snap = await resolveAuthSnapshot(
      vi.fn().mockResolvedValue({ user: null, error: authError('AuthRetryableFetchError', 0) }),
    );
    expect(snap).toEqual({ status: 'degraded', user: USER_A });
    const again = await resolveAuthSnapshot(vi.fn().mockResolvedValue({ user: USER_A, error: null }));
    expect(again.status).toBe('authenticated');
  });

  it('transient error with no cached user degrades to null user (still not unauthenticated)', async () => {
    const snap = await resolveAuthSnapshot(
      vi.fn().mockResolvedValue({ user: null, error: authError('AuthRetryableFetchError', 0) }),
    );
    expect(snap).toEqual({ status: 'degraded', user: null });
  });

  it('unauthenticated clears the cached user', async () => {
    await resolveAuthSnapshot(vi.fn().mockResolvedValue({ user: USER_A, error: null }));
    await resolveAuthSnapshot(vi.fn().mockResolvedValue({ user: null, error: authError('AuthSessionMissingError') }));
    const snap = await resolveAuthSnapshot(
      vi.fn().mockResolvedValue({ user: null, error: authError('AuthRetryableFetchError', 0) }),
    );
    expect(snap.user).toBeNull();
  });

  it('lock-acquire timeout retries once then succeeds', async () => {
    const raw = vi.fn().mockRejectedValueOnce(lockTimeout()).mockResolvedValueOnce({ user: USER_A, error: null });
    const p = resolveAuthSnapshot(raw);
    await vi.runAllTimersAsync();
    expect(await p).toEqual({ status: 'authenticated', user: USER_A });
    expect(raw).toHaveBeenCalledTimes(2);
  });

  it('persistent lock timeout degrades to the cached user', async () => {
    await resolveAuthSnapshot(vi.fn().mockResolvedValue({ user: USER_A, error: null }));
    const raw = vi.fn().mockRejectedValue(lockTimeout());
    const p = resolveAuthSnapshot(raw);
    await vi.runAllTimersAsync();
    expect(await p).toEqual({ status: 'degraded', user: USER_A });
    expect(raw).toHaveBeenCalledTimes(2);
  });

  it('non-lock throws stay loud', async () => {
    await expect(resolveAuthSnapshot(vi.fn().mockRejectedValue(new Error('boom')))).rejects.toThrow('boom');
  });
});
