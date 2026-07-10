import { describe, it, expect } from 'vitest';
import { orderRef, matchesOrderRef } from './order-ref';

describe('orderRef', () => {
  it('formats a UUID into DO- + 12 uppercase hex', () => {
    expect(orderRef('5c01ebea-1bfd-4702-9a38-ca75914d921c')).toBe('DO-5C01EBEA1BFD');
  });
  it('is deterministic for the same id', () => {
    const id = '5c01ebea-1bfd-4702-9a38-ca75914d921c';
    expect(orderRef(id)).toBe(orderRef(id));
  });
  it('returns empty string for missing ids', () => {
    expect(orderRef('')).toBe('');
    expect(orderRef(null)).toBe('');
    expect(orderRef(undefined)).toBe('');
  });
});

describe('matchesOrderRef', () => {
  const id = '5c01ebea-1bfd-4702-9a38-ca75914d921c';
  it('matches the full code with prefix', () => {
    expect(matchesOrderRef(id, 'DO-5C01EBEA1BFD')).toBe(true);
  });
  it('matches partial queries, case-insensitively, dashes and DO label ignored', () => {
    expect(matchesOrderRef(id, 'do-5c01')).toBe(true);
    expect(matchesOrderRef(id, 'do5c01')).toBe(true);
    expect(matchesOrderRef(id, '5C01')).toBe(true);
  });
  it('does not match an unrelated query', () => {
    expect(matchesOrderRef(id, 'ZZZZ')).toBe(false);
  });
  it('is false for an empty or label-only query', () => {
    expect(matchesOrderRef(id, '')).toBe(false);
    expect(matchesOrderRef(id, 'DO-')).toBe(false);
  });
});
