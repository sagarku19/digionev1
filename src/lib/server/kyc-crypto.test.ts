import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';
import { encryptField, decryptField, isEncrypted, last4 } from './kyc-crypto';

beforeAll(() => {
  process.env.KYC_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
});

describe('kyc-crypto', () => {
  it('round-trips a value', () => {
    const enc = encryptField('ABCDE1234F');
    expect(isEncrypted(enc)).toBe(true);
    expect(enc).not.toContain('ABCDE1234F');
    expect(decryptField(enc)).toBe('ABCDE1234F');
  });

  it('produces a different ciphertext each call (random IV) but same plaintext', () => {
    const a = encryptField('1234567890123456');
    const b = encryptField('1234567890123456');
    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe(decryptField(b));
  });

  it('returns empty string for empty/whitespace input', () => {
    expect(encryptField('')).toBe('');
    expect(encryptField('   ')).toBe('');
    expect(decryptField('')).toBe('');
  });

  it('throws when decrypting a tampered ciphertext', () => {
    const enc = encryptField('sensitive');
    const tampered = enc.slice(0, -2) + (enc.endsWith('A') ? 'B' : 'A') + enc.slice(-1);
    expect(() => decryptField(tampered)).toThrow();
  });

  it('rejects legacy plaintext (not enc:v1)', () => {
    expect(isEncrypted('ABCDE1234F')).toBe(false);
    expect(() => decryptField('ABCDE1234F')).toThrow();
  });

  it('last4 strips whitespace and takes the tail', () => {
    expect(last4('1234 5678 9012 3456')).toBe('3456');
    expect(last4('ABCDE1234F')).toBe('234F');
  });
});
