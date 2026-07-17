import { describe, it, expect, vi } from 'vitest';
import { createProfileIdResolver } from './getCreatorProfileId';
import { AuthUnavailableError, NotLoggedInError } from '@/lib/supabase/auth-errors';
import type { AuthSnapshot } from '@/lib/supabase/current-user';

const authed = (id: string): AuthSnapshot => ({ status: 'authenticated', user: { id } as AuthSnapshot['user'] });
const degraded = (id: string | null): AuthSnapshot => ({
  status: 'degraded',
  user: id ? ({ id } as AuthSnapshot['user']) : null,
});
const signedOut: AuthSnapshot = { status: 'unauthenticated', user: null };

describe('createProfileIdResolver', () => {
  it('resolves and returns the profile id', async () => {
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValue(authed('auth-a')),
      fetchProfileId: vi.fn().mockResolvedValue('profile-a'),
    });
    expect(await resolve()).toBe('profile-a');
  });

  it('caches a successful resolution — second call does not re-hit the DB', async () => {
    const fetchProfileId = vi.fn().mockResolvedValue('profile-a');
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValue(authed('auth-a')),
      fetchProfileId,
    });
    expect(await resolve()).toBe('profile-a');
    expect(await resolve()).toBe('profile-a');
    expect(fetchProfileId).toHaveBeenCalledTimes(1);
  });

  it('collapses concurrent callers onto ONE DB lookup', async () => {
    const fetchProfileId = vi.fn().mockResolvedValue('profile-a');
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValue(authed('auth-a')),
      fetchProfileId,
    });
    const results = await Promise.all([resolve(), resolve(), resolve()]);
    expect(results).toEqual(['profile-a', 'profile-a', 'profile-a']);
    expect(fetchProfileId).toHaveBeenCalledTimes(1);
  });

  it('re-resolves when the authenticated user changes (cache keyed on user.id)', async () => {
    const fetchProfileId = vi.fn(async (id: string) => (id === 'auth-a' ? 'profile-a' : 'profile-b'));
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValueOnce(authed('auth-a')).mockResolvedValueOnce(authed('auth-b')),
      fetchProfileId,
    });
    expect(await resolve()).toBe('profile-a');
    expect(await resolve()).toBe('profile-b');
    expect(fetchProfileId).toHaveBeenCalledTimes(2);
  });

  it('does NOT cache a failed lookup — a later call retries', async () => {
    const fetchProfileId = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('profile-a');
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValue(authed('auth-a')),
      fetchProfileId,
    });
    await expect(resolve()).rejects.toThrow('boom');
    expect(await resolve()).toBe('profile-a');
  });

  it('unauthenticated → NotLoggedInError, no DB hit', async () => {
    const fetchProfileId = vi.fn();
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValue(signedOut),
      fetchProfileId,
    });
    await expect(resolve()).rejects.toBeInstanceOf(NotLoggedInError);
    expect(fetchProfileId).not.toHaveBeenCalled();
  });

  it('degraded WITH a cached id → returns the cache (UI survives the stall)', async () => {
    const fetchProfileId = vi.fn().mockResolvedValue('profile-a');
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValueOnce(authed('auth-a')).mockResolvedValueOnce(degraded('auth-a')),
      fetchProfileId,
    });
    expect(await resolve()).toBe('profile-a');
    expect(await resolve()).toBe('profile-a');
    expect(fetchProfileId).toHaveBeenCalledTimes(1);
  });

  it('degraded WITHOUT a cache → AuthUnavailableError (retryable), no DB hit', async () => {
    const fetchProfileId = vi.fn();
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValue(degraded('auth-a')),
      fetchProfileId,
    });
    await expect(resolve()).rejects.toBeInstanceOf(AuthUnavailableError);
    expect(fetchProfileId).not.toHaveBeenCalled();
  });

  it('degraded with NO known user → AuthUnavailableError, not NotLoggedInError', async () => {
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValue(degraded(null)),
      fetchProfileId: vi.fn(),
    });
    await expect(resolve()).rejects.toBeInstanceOf(AuthUnavailableError);
  });

  it('does not return a stale cached id after the user logs out', async () => {
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValueOnce(authed('auth-a')).mockResolvedValueOnce(signedOut),
      fetchProfileId: vi.fn().mockResolvedValue('profile-a'),
    });
    expect(await resolve()).toBe('profile-a');
    await expect(resolve()).rejects.toBeInstanceOf(NotLoggedInError);
  });
});
