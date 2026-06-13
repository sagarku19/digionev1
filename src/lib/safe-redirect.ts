// Guards against open redirects (findings #6, #7).
// A safe path is same-origin relative: starts with exactly one '/',
// no protocol-relative '//', no backslash tricks.

export function isSafeInternalPath(p: string | null | undefined): p is string {
  return (
    typeof p === 'string' &&
    p.startsWith('/') &&
    !p.startsWith('//') &&
    !p.includes('\\')
  );
}
