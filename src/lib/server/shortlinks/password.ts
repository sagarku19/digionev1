import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'crypto';

// Password hashing for protected short links — scrypt, no external dependency.
// Stored format: "scrypt$<saltHex>$<hashHex>".

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  try {
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    const actual = scryptSync(plain, salt, expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// Unguessable per-link unlock token stored in the visitor's cookie after a
// correct password. Derived from the (secret) stored hash — can't be forged
// without knowing the hash.
export function unlockToken(code: string, passwordHash: string): string {
  return createHash('sha256').update(`${code}:${passwordHash}`).digest('hex');
}
