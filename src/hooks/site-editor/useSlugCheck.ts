'use client';
// Debounced slug-availability check shared by the site editors.
// The regex mirrors the server contract in app/api/sites/check-slug
// (`^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$`, 3–50 chars) so client and server agree.
//
// idle/invalid/checking are derived synchronously; only the remote result is
// stored in state (set inside the fetch callback) — so the effect body never
// calls setState directly.
import { useEffect, useState } from 'react';

export type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

export function useSlugCheck(slug: string, originalSlug: string | null, type: string): SlugStatus {
  const local: SlugStatus | null =
    !slug || slug === originalSlug ? 'idle' : !SLUG_RE.test(slug) ? 'invalid' : null;
  const [result, setResult] = useState<{ slug: string; status: 'available' | 'taken' } | null>(null);

  useEffect(() => {
    if (local !== null) return; // synchronous verdict — no remote check needed
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sites/check-slug?slug=${encodeURIComponent(slug)}&type=${encodeURIComponent(type)}`);
        const json = await res.json();
        if (!cancelled) setResult({ slug, status: json.available ? 'available' : 'taken' });
      } catch {
        /* leave as "checking"; the save guard re-validates */
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [slug, local, type]);

  if (local !== null) return local;
  if (result && result.slug === slug) return result.status;
  return 'checking';
}
