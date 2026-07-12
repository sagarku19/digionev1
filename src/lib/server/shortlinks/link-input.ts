// Validates + normalizes the Phase 2 link fields shared by the create and
// update routes. Password hashing is handled in the routes (needs the plaintext).

import { validateDestinationUrl } from './url-safety';

export interface Phase2Fields {
  ios_url: string | null;
  android_url: string | null;
  geo: Record<string, string> | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  max_clicks: number | null;
}

type Result =
  | { ok: true; fields: Partial<Phase2Fields> }
  | { ok: false; error: string };

interface Input {
  ios_url?: string | null;
  android_url?: string | null;
  geo?: Record<string, unknown> | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  max_clicks?: number | string | null;
}

export function sanitizePhase2Fields(
  body: Input,
  opts: { shortDomain?: string; appHost?: string }
): Result {
  const fields: Partial<Phase2Fields> = {};

  for (const key of ['ios_url', 'android_url', 'og_image'] as const) {
    if (body[key] === undefined) continue;
    const raw = (body[key] ?? '').toString().trim();
    if (!raw) { fields[key] = null; continue; }
    const check = validateDestinationUrl(raw, opts);
    if (!check.ok) return { ok: false, error: `${key}: ${check.error}` };
    fields[key] = check.url!;
  }

  if (body.og_title !== undefined) fields.og_title = (body.og_title ?? '').trim().slice(0, 120) || null;
  if (body.og_description !== undefined) fields.og_description = (body.og_description ?? '').trim().slice(0, 200) || null;

  if (body.geo !== undefined) {
    if (!body.geo || typeof body.geo !== 'object' || Object.keys(body.geo).length === 0) {
      fields.geo = null;
    } else {
      const map: Record<string, string> = {};
      for (const [rawCc, rawUrl] of Object.entries(body.geo)) {
        const cc = rawCc.trim().toUpperCase();
        if (!/^[A-Z]{2}$/.test(cc)) return { ok: false, error: `Invalid country code: ${rawCc}` };
        const url = (rawUrl ?? '').toString().trim();
        const check = validateDestinationUrl(url, opts);
        if (!check.ok) return { ok: false, error: `geo ${cc}: ${check.error}` };
        map[cc] = check.url!;
      }
      fields.geo = map;
    }
  }

  if (body.max_clicks !== undefined) {
    if (body.max_clicks === null || body.max_clicks === '') {
      fields.max_clicks = null;
    } else {
      const n = Number(body.max_clicks);
      if (!Number.isInteger(n) || n < 1) return { ok: false, error: 'max_clicks must be a positive integer' };
      fields.max_clicks = n;
    }
  }

  return { ok: true, fields };
}
