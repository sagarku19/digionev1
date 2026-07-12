import { describe, it, expect } from 'vitest';
import { pickDestination } from './targeting';

const base = { destination_url: 'https://default.com', ios_url: null, android_url: null, geo: null };

describe('pickDestination', () => {
  it('returns the default when nothing matches', () => {
    expect(pickDestination(base, { country: 'US', os: 'Windows' })).toBe('https://default.com');
  });
  it('geo match wins over everything', () => {
    const link = { ...base, ios_url: 'https://ios.com', geo: { IN: 'https://in.com' } };
    expect(pickDestination(link, { country: 'IN', os: 'iOS' })).toBe('https://in.com');
  });
  it('is case-insensitive on country code', () => {
    const link = { ...base, geo: { US: 'https://us.com' } };
    expect(pickDestination(link, { country: 'us', os: 'iOS' })).toBe('https://us.com');
  });
  it('falls back to device when geo misses', () => {
    const link = { ...base, ios_url: 'https://ios.com', android_url: 'https://and.com', geo: { US: 'https://us.com' } };
    expect(pickDestination(link, { country: 'IN', os: 'iOS' })).toBe('https://ios.com');
    expect(pickDestination(link, { country: 'IN', os: 'Android' })).toBe('https://and.com');
  });
  it('falls back to default when device has no url', () => {
    const link = { ...base, ios_url: 'https://ios.com' };
    expect(pickDestination(link, { country: null, os: 'Android' })).toBe('https://default.com');
  });
});
