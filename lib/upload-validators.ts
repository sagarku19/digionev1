// Pure validators for /api/upload. No Next.js or Supabase imports — keeps
// the route handler focused on orchestration and these functions trivially testable.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILENAME_MAX = 200;
// Allowlist: letters, digits, dot, hyphen, underscore. Blocks path separators
// (/, \), parent refs (..), control chars, and unicode lookalikes.
const FILENAME_SAFE_RE = /^[A-Za-z0-9._-]+$/;

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

export function sanitizeFilename(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const collapsed = trimmed.replace(/\s+/g, '_');
  if (collapsed.length > FILENAME_MAX) return null;
  if (!FILENAME_SAFE_RE.test(collapsed)) return null;
  // Reject any name that resolves to a parent ref or starts with a dot
  // (defense in depth on top of the regex).
  if (collapsed === '.' || collapsed === '..' || collapsed.startsWith('.')) return null;
  return collapsed;
}
