import { describe, it, expect, vi } from 'vitest';
import { createProfileIdResolver } from './getCreatorProfileId';

const USER_A = { id: 'auth-a' };
const USER_B = { id: 'auth-b' };

describe('createProfileIdResolver', () => {
  it('resolves and returns the profile id', async () => {
    const resolve = createProfileIdResolver({
      getUser: vi.fn().mockResolvedValue(USER_A),
      fetchProfileId: vi.fn().mockResolvedValue('profile-a'),
    });
    expect(await resolve()).toBe('profile-a');
  });

  it('caches a successful resolution — second call does not re-hit the DB', async () => {
    const fetchProfileId = vi.fn().mockResolvedValue('profile-a');
    const resolve = createProfileIdResolver({
      getUser: vi.fn().mockResolvedValue(USER_A),
      fetchProfileId,
    });
    expect(await resolve()).toBe('profile-a');
    expect(await resolve()).toBe('profile-a');
    expect(fetchProfileId).toHaveBeenCalledTimes(1);
  });

  it('collapses concurrent callers onto ONE DB lookup', async () => {
    const fetchProfileId = vi.fn().mockResolvedValue('profile-a');
    const resolve = createProfileIdResolver({
      getUser: vi.fn().mockResolvedValue(USER_A),
      fetchProfileId,
    });
    const [a, b, c] = await Promise.all([resolve(), resolve(), resolve()]);
    expect([a, b, c]).toEqual(['profile-a', 'profile-a', 'profile-a']);
    expect(fetchProfileId).toHaveBeenCalledTimes(1);
  });

  it('re-resolves when the authenticated user changes (cache keyed on user.id)', async () => {
    const fetchProfileId = vi.fn(async (authUserId: string) =>
      authUserId === 'auth-a' ? 'profile-a' : 'profile-b',
    );
    const resolve = createProfileIdResolver({
      getUser: vi.fn().mockResolvedValueOnce(USER_A).mockResolvedValueOnce(USER_B),
      fetchProfileId,
    });
    expect(await resolve()).toBe('profile-a');
    expect(await resolve()).toBe('profile-b');
    expect(fetchProfileId).toHaveBeenCalledTimes(2);
  });

  it('does NOT cache a failed lookup — a later call retries', async () => {
    const fetchProfileId = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('profile-a');
    const resolve = createProfileIdResolver({
      getUser: vi.fn().mockResolvedValue(USER_A),
      fetchProfileId,
    });
    await expect(resolve()).rejects.toThrow('boom');
    expect(await resolve()).toBe('profile-a');
    expect(fetchProfileId).toHaveBeenCalledTimes(2);
  });

  it('throws "Not logged in" and never hits the DB when there is no user', async () => {
    const fetchProfileId = vi.fn();
    const resolve = createProfileIdResolver({
      getUser: vi.fn().mockResolvedValue(null),
      fetchProfileId,
    });
    await expect(resolve()).rejects.toThrow('Not logged in');
    expect(fetchProfileId).not.toHaveBeenCalled();
  });

  it('does not return a stale cached id after the user logs out', async () => {
    const resolve = createProfileIdResolver({
      getUser: vi.fn().mockResolvedValueOnce(USER_A).mockResolvedValueOnce(null),
      fetchProfileId: vi.fn().mockResolvedValue('profile-a'),
    });
    expect(await resolve()).toBe('profile-a');
    await expect(resolve()).rejects.toThrow('Not logged in');
  });
});
