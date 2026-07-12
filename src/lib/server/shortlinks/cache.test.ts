import { describe, it, expect } from 'vitest';
import { TtlCache } from './cache';

describe('TtlCache', () => {
  it('returns a stored value before expiry', () => {
    let now = 0;
    const c = new TtlCache<number>(1000, () => now);
    c.set('a', 42);
    now = 500;
    expect(c.get('a')).toBe(42);
  });

  it('evicts after the TTL', () => {
    let now = 0;
    const c = new TtlCache<number>(1000, () => now);
    c.set('a', 42);
    now = 1000;
    expect(c.get('a')).toBeUndefined();
  });

  it('distinguishes a cached null from a miss', () => {
    const now = 0;
    const c = new TtlCache<number | null>(1000, () => now);
    c.set('a', null);
    expect(c.get('a')).toBeNull();      // cached negative lookup
    expect(c.get('b')).toBeUndefined(); // never set
  });
});
