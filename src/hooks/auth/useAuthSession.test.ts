import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signInWithRetry } from './useAuthSession';

const retryable = { name: 'AuthRetryableFetchError', message: 'stalled' };
const wrongPassword = { name: 'AuthApiError', message: 'Invalid login credentials' };

describe('signInWithRetry', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the first result when it succeeds', async () => {
    const signIn = vi.fn().mockResolvedValue({ error: null });
    expect(await signInWithRetry(signIn)).toEqual({ error: null });
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('retries ONCE on a retryable network error', async () => {
    const signIn = vi.fn().mockResolvedValueOnce({ error: retryable }).mockResolvedValueOnce({ error: null });
    const p = signInWithRetry(signIn);
    await vi.runAllTimersAsync();
    expect(await p).toEqual({ error: null });
    expect(signIn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on a credentials error', async () => {
    const signIn = vi.fn().mockResolvedValue({ error: wrongPassword });
    expect(await signInWithRetry(signIn)).toEqual({ error: wrongPassword });
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('surfaces the second failure when the retry also stalls', async () => {
    const signIn = vi.fn().mockResolvedValue({ error: retryable });
    const p = signInWithRetry(signIn);
    await vi.runAllTimersAsync();
    expect(await p).toEqual({ error: retryable });
    expect(signIn).toHaveBeenCalledTimes(2);
  });
});
