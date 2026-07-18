// lib/supabase/auth-repair.ts
// Detect-and-repair for the refresh replay storm (todo-later 19). Symptom: the
// browser POSTs /auth/v1/token?grant_type=refresh_token every ~13s forever
// because a refreshed session never reaches cookie storage — auth-js re-reads
// storage on every tick, keeps seeing the stale near-expiry session, and
// replays the same refresh token. After each TOKEN_REFRESHED / SIGNED_IN event
// we verify the cookie actually holds the event's access token; on mismatch we
// purge the (possibly stale-chunked) auth cookies and re-persist via
// setSession. Leaf module: no supabase client import (client.ts depends on our
// sibling auth-timing.ts — wiring lives in current-user.ts).

interface PersistedSession {
  accessToken: string | null;
  cookieNames: string[];
}

export interface AdoptionSession {
  access_token: string;
  refresh_token: string;
}

export type AdoptionResult = 'healthy' | 'repaired' | 'failed' | 'skipped';

export interface AdoptionDeps {
  storageKey: string;
  getCookieString: () => string;
  purgeCookies: (names: string[]) => void;
  persistSession: (session: AdoptionSession) => Promise<void>;
  warn?: (message: string) => void;
  now?: () => number;
}

const REPAIR_COOLDOWN_MS = 60_000;
const STORM_WINDOW_MS = 120_000;
const STORM_THRESHOLD = 3;
const BASE64_PREFIX = 'base64-';
const MAX_CHUNKS = 10;

export function storageKeyForUrl(supabaseUrl: string): string | null {
  try {
    const ref = new URL(supabaseUrl).hostname.split('.')[0];
    return ref ? `sb-${ref}-auth-token` : null;
  } catch {
    return null;
  }
}

function parseCookieString(cookieString: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const pair of cookieString.split(';')) {
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const raw = pair.slice(eq + 1).trim();
    if (!name) continue;
    try {
      out.set(name, decodeURIComponent(raw));
    } catch {
      out.set(name, raw);
    }
  }
  return out;
}

function decodeBase64Url(value: string): string {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Mirrors @supabase/ssr storage: value under `key`, or chunked `key.0..key.N`,
// optionally `base64-` + base64url-encoded JSON.
export function readPersistedSession(cookieString: string, storageKey: string): PersistedSession {
  const cookies = parseCookieString(cookieString);
  const cookieNames: string[] = [];
  let joined = cookies.get(storageKey) ?? null;
  if (joined !== null) {
    cookieNames.push(storageKey);
  } else {
    let assembled = '';
    for (let i = 0; i < MAX_CHUNKS; i += 1) {
      const chunk = cookies.get(`${storageKey}.${i}`);
      if (chunk === undefined) break;
      cookieNames.push(`${storageKey}.${i}`);
      assembled += chunk;
    }
    joined = assembled || null;
  }
  if (joined === null) return { accessToken: null, cookieNames };
  try {
    const decoded = joined.startsWith(BASE64_PREFIX)
      ? decodeBase64Url(joined.slice(BASE64_PREFIX.length))
      : joined;
    const session = JSON.parse(decoded) as { access_token?: unknown };
    return {
      accessToken: typeof session.access_token === 'string' ? session.access_token : null,
      cookieNames,
    };
  } catch {
    return { accessToken: null, cookieNames };
  }
}

// Telemetry only — 3+ refresh events inside 2 minutes is never a healthy
// cadence (normal is ~1/hour plus a sign-in double).
export function detectRefreshStorm(timestampsMs: number[], nowMs: number): boolean {
  const recent = timestampsMs.filter((t) => nowMs - t <= STORM_WINDOW_MS);
  return recent.length >= STORM_THRESHOLD;
}

export function createSessionAdoptionGuard(
  deps: AdoptionDeps,
): (session: AdoptionSession) => Promise<AdoptionResult> {
  const now = deps.now ?? Date.now;
  const warn = deps.warn ?? (() => undefined);
  let lastRepairAt = Number.NEGATIVE_INFINITY;
  let inFlight: Promise<AdoptionResult> | null = null;

  const run = async (session: AdoptionSession): Promise<AdoptionResult> => {
    const before = readPersistedSession(deps.getCookieString(), deps.storageKey);
    if (before.accessToken === session.access_token) return 'healthy';

    if (now() - lastRepairAt < REPAIR_COOLDOWN_MS) return 'skipped';
    lastRepairAt = now();

    if (before.cookieNames.length > 0) deps.purgeCookies(before.cookieNames);
    await deps.persistSession(session);

    const after = readPersistedSession(deps.getCookieString(), deps.storageKey);
    if (after.accessToken === session.access_token) {
      warn(
        '[auth-repair] refreshed session had not reached cookie storage — purged stale auth cookies and re-persisted (see todo-later 19)',
      );
      return 'repaired';
    }
    warn(
      '[auth-repair] session re-persist did not stick — cookie storage is not adopting writes; auth requests may loop until a fresh sign-in',
    );
    return 'failed';
  };

  return (session) => {
    if (inFlight) return inFlight;
    inFlight = run(session).finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}
