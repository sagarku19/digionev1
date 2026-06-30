// Server-only. AES-256-GCM encryption for KYC PII (PAN, bank account, UPI) before it lands in
// the creator_kyc *_enc columns. Key from KYC_ENCRYPTION_KEY (base64-encoded 32 bytes).
// Phase 0 of the payments overhaul — closes the "*_enc columns hold plaintext" hole.
// Phase 2 may layer provider tokenization on top; this stays as the at-rest floor.

import crypto from 'crypto';

const PREFIX = 'enc:v1:';
const IV_BYTES = 12; // GCM standard nonce length

function getKey(): Buffer {
  const raw = process.env.KYC_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('KYC_ENCRYPTION_KEY is not set — cannot encrypt/decrypt KYC PII.');
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('KYC_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256).');
  }
  return key;
}

// Returns "enc:v1:<ivB64>:<tagB64>:<ciphertextB64>". Empty/whitespace input → ''.
export function encryptField(plaintext: string): string {
  const value = plaintext?.trim();
  if (!value) return '';
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ct = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

// Inverse of encryptField. Throws on tamper (GCM auth failure) or malformed input.
export function decryptField(encoded: string): string {
  if (!encoded) return '';
  if (!isEncrypted(encoded)) {
    throw new Error('decryptField: value is not in enc:v1 format (legacy plaintext?).');
  }
  const [ivB64, tagB64, ctB64] = encoded.slice(PREFIX.length).split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

// Last N chars of the raw value, for masked display (stored as the plaintext *_last4 column).
export function last4(value: string, n = 4): string {
  const v = (value ?? '').replace(/\s+/g, '');
  return v.slice(-n);
}
