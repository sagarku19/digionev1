// Pure validators for /api/upload. No Next.js or Supabase imports — keeps
// the route handler focused on orchestration and these functions trivially testable.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILENAME_MAX = 200;

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

export function sanitizeFilename(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Replace any run of disallowed characters (whitespace, parentheses, slashes,
  // unicode, etc.) with a single underscore so ordinary names like
  // "digionev1-main (2).zip" are accepted instead of rejected. Path separators
  // (/, \) become "_", so traversal is impossible.
  let safe = trimmed.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_{2,}/g, '_');
  if (safe.length > FILENAME_MAX) safe = safe.slice(0, FILENAME_MAX);
  // Defense in depth: never allow a name that is only dots, a hidden/dotfile,
  // or that resolves to a parent ref.
  if (!safe || safe === '.' || safe === '..' || safe.startsWith('.')) return null;
  return safe;
}
