import { describe, it, expect } from 'vitest';
import { generateCode, normalizeCode, isValidCode, RESERVED_CODES } from './code';

describe('short-link code', () => {
  it('generates a 7-char code from the safe alphabet', () => {
    const code = generateCode();
    expect(code).toHaveLength(7);
    expect(/^[a-z0-9]+$/.test(code)).toBe(true);
    expect(/[01lio]/.test(code)).toBe(false); // no ambiguous chars
  });

  it('generates a code of a requested length', () => {
    expect(generateCode(10)).toHaveLength(10);
  });

  it('normalizes to trimmed lowercase', () => {
    expect(normalizeCode('  SpringSale ')).toBe('springsale');
  });

  it('accepts valid custom codes', () => {
    expect(isValidCode('spring-sale')).toBe(true);
    expect(isValidCode('AbC123')).toBe(true); // normalized internally
  });

  it('rejects too-short, spaced, dotted, and reserved codes', () => {
    expect(isValidCode('ab')).toBe(false);
    expect(isValidCode('has space')).toBe(false);
    expect(isValidCode('has.dot')).toBe(false);
    expect(isValidCode('report')).toBe(false);
    expect(RESERVED_CODES.has('robots.txt')).toBe(true);
  });
});
