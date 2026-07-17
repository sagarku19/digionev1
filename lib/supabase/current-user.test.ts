import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { User } from '@supabase/supabase-js';
import {
  createSingleFlight,
  resolveCurrentUser,
  __resetCurrentUserCacheForTests,
} from './current-user';

const USER_A = { id: 'a', email: 'a@x.com' } as unknown as User;
const USER_B = { id: 'b', email: 'b@x.com' } as unknown as User;
const lockTimeout = () => Object.assign(new Error('Acquiring process lock ... timed out'), { isAcquireTimeout: true });

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

describe('resolveCurrentUser (recovery)', () => {
  beforeEach(() => { vi.useFakeTimers(); __resetCurrentUserCacheForTests(); });
  afterEach(() => vi.useRealTimers());

  it('returns the user on the happy path', async () => {
    expect(await resolveCurrentUser(vi.fn().mockResolvedValue(USER_A))).toEqual(USER_A);
  });

  it('retries once on a lock-acquire timeout, then succeeds', async () => {
    const getUser = vi.fn().mockRejectedValueOnce(lockTimeout()).mockResolvedValueOnce(USER_A);
    const p = resolveCurrentUser(getUser);
    await vi.runAllTimersAsync();
    expect(await p).toEqual(USER_A);
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it('degrades to the last-known user when the lock stays stuck', async () => {
    const getUser = vi.fn()
      .mockResolvedValueOnce(USER_A)                  // seed cache
      .mockRejectedValue(lockTimeout());              // then always time out
    expect(await resolveCurrentUser(getUser)).toEqual(USER_A);

    const p = resolveCurrentUser(getUser);
    await vi.runAllTimersAsync();
    expect(await p).toEqual(USER_A);                  // cached fallback, no throw
  });

  it('returns null (no crash) when it times out with no cached user', async () => {
    const getUser = vi.fn().mockRejectedValue(lockTimeout());
    const p = resolveCurrentUser(getUser);
    await vi.runAllTimersAsync();
    expect(await p).toBeNull();
  });

  it('does NOT swallow non-lock errors', async () => {
    const getUser = vi.fn().mockRejectedValue(new Error('invalid refresh token'));
    await expect(resolveCurrentUser(getUser)).rejects.toThrow('invalid refresh token');
  });
});
