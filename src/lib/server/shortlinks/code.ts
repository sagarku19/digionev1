// Pure helpers for short-link codes: generation, normalization, validation.

// base31 — omits ambiguous 0/o/1/l/i so hand-typed codes are unambiguous.
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

export const RESERVED_CODES = new Set([
  '', 'robots.txt', 'sitemap.xml', 'report', 'favicon.ico', 'api', '_next',
]);

export function generateCode(length = 7): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function normalizeCode(input: string): string {
  return (input ?? '').trim().toLowerCase();
}

export function isValidCode(input: string): boolean {
  const code = normalizeCode(input);
  if (RESERVED_CODES.has(code)) return false;
  // 3–50 chars, starts alphanumeric, then alphanumeric / hyphen / underscore
  return /^[a-z0-9][a-z0-9_-]{2,49}$/.test(code);
}
