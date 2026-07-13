import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';
import { encryptToken, decryptToken, isEncryptedToken } from './token-crypto';

beforeAll(() => {
  process.env.INSTAAUTO_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
});

describe('instaauto token-crypto', () => {
  it('round-trips a token', () => {
    const enc = encryptToken('IGQVJ-long-lived-token');
    expect(enc.startsWith('igenc:v1:')).toBe(true);
    expect(decryptToken(enc)).toBe('IGQVJ-long-lived-token');
  });
  it('returns empty string for empty input', () => {
    expect(encryptToken('')).toBe('');
    expect(decryptToken('')).toBe('');
  });
  it('detects the encrypted prefix', () => {
    expect(isEncryptedToken(encryptToken('x'))).toBe(true);
    expect(isEncryptedToken('plaintext')).toBe(false);
  });
  it('throws on tampered ciphertext', () => {
    const enc = encryptToken('secret');
    const tampered = enc.slice(0, -2) + (enc.endsWith('A') ? 'B' : 'A');
    expect(() => decryptToken(tampered)).toThrow();
  });
});
