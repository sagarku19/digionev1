// Meta webhook X-Hub-Signature-256 verification. HMAC-SHA256 over the RAW body,
// hex-encoded, prefixed 'sha256=', compared in constant time. Mirrors the Cashfree
// webhook discipline (timingSafeEqual).
import crypto from 'crypto';

export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !appSecret) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(header, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
