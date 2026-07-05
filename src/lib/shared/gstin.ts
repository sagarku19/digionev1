// GSTIN format + checksum validation (offline). Format: 2-digit state, 10-char PAN,
// 1 entity char, 'Z', 1 checksum char. The 15th char is a mod-36 checksum over the first 14.

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function isValidGstin(gstin: string): boolean {
  if (typeof gstin !== 'string' || !GSTIN_RE.test(gstin)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = CHARS.indexOf(gstin[i]);
    const factor = i % 2 === 0 ? 1 : 2;
    const product = value * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }
  const checksum = (36 - (sum % 36)) % 36;
  return CHARS[checksum] === gstin[14];
}
