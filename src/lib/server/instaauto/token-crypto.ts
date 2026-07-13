// Server-only. AES-256-GCM for the Instagram long-lived token before it lands in
// instaauto_accounts.access_token_enc. Key from INSTAAUTO_TOKEN_ENCRYPTION_KEY (base64 32 bytes).
import crypto from 'crypto';

const PREFIX = 'igenc:v1:';
const IV_BYTES = 12;

function getKey(): Buffer {
  const raw = process.env.INSTAAUTO_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('INSTAAUTO_TOKEN_ENCRYPTION_KEY is not set.');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('INSTAAUTO_TOKEN_ENCRYPTION_KEY must decode to 32 bytes (AES-256).');
  return key;
}

export function encryptToken(plaintext: string): string {
  const value = plaintext?.trim();
  if (!value) return '';
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ct = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

export function decryptToken(encoded: string): string {
  if (!encoded) return '';
  if (!isEncryptedToken(encoded)) throw new Error('decryptToken: not igenc:v1 format.');
  const [ivB64, tagB64, ctB64] = encoded.slice(PREFIX.length).split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}

export function isEncryptedToken(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}
