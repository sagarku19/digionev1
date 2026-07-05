import { describe, it, expect } from 'vitest';
import { isValidGstin } from './gstin';

describe('isValidGstin', () => {
  it('accepts a checksum-valid GSTIN', () => {
    expect(isValidGstin('27AAPFU0939F1ZV')).toBe(true);
  });
  it('rejects a wrong checksum digit', () => {
    expect(isValidGstin('27AAPFU0939F1ZX')).toBe(false);
  });
  it('rejects malformed strings', () => {
    expect(isValidGstin('')).toBe(false);
    expect(isValidGstin('27AAPFU0939F1Z')).toBe(false); // 14 chars
    expect(isValidGstin('27aapfu0939f1zv')).toBe(false); // lowercase
    expect(isValidGstin('ZZAAPFU0939F1ZV')).toBe(false); // non-digit state
  });
});
