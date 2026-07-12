import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, unlockToken } from './password';

describe('password', () => {
  it('hashes then verifies the same password', () => {
    const stored = hashPassword('s3cret!');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('s3cret!', stored)).toBe(true);
  });
  it('rejects a wrong password', () => {
    const stored = hashPassword('s3cret!');
    expect(verifyPassword('nope', stored)).toBe(false);
  });
  it('rejects malformed stored values', () => {
    expect(verifyPassword('x', 'garbage')).toBe(false);
    expect(verifyPassword('x', 'scrypt$only')).toBe(false);
  });
  it('produces a deterministic, per-link unlock token', () => {
    expect(unlockToken('abc', 'HASH')).toBe(unlockToken('abc', 'HASH'));
    expect(unlockToken('abc', 'HASH')).not.toBe(unlockToken('xyz', 'HASH'));
    expect(unlockToken('abc', 'HASH')).not.toBe(unlockToken('abc', 'OTHER'));
  });
});
