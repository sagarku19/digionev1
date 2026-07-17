// lib/supabase/auth-debug.ts
// Dev-only auth telemetry, enabled via localStorage['digione.auth.debug'] = '1'.
// The sanctioned exception to the no-console rule: every line is gated by the
// flag, which is never set in production usage paths. Used to diagnose the
// ~13s refresh-cadence anomaly (todo-later 17). Dump the buffer with
// window.__authDebug().

interface AuthDebugEntry {
  at: string;
  kind: 'request' | 'event';
  detail: string;
  durationMs?: number;
}

const MAX_ENTRIES = 200;
const buffer: AuthDebugEntry[] = [];

declare global {
  interface Window {
    __authDebug?: () => AuthDebugEntry[];
  }
}

export function isAuthDebugEnabled(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem('digione.auth.debug') === '1';
  } catch {
    return false;
  }
}

export function describeAuthUrl(url: string): string {
  try {
    const u = new URL(url);
    const grant = u.searchParams.get('grant_type');
    return `${u.pathname}${grant ? `?grant_type=${grant}` : ''}`;
  } catch {
    return url;
  }
}

function record(entry: AuthDebugEntry): void {
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
  if (typeof window !== 'undefined' && !window.__authDebug) {
    window.__authDebug = () => [...buffer];
  }
  console.info(
    `[auth-debug] ${entry.kind} ${entry.detail}${entry.durationMs != null ? ` (${Math.round(entry.durationMs)}ms)` : ''}`,
  );
}

export function logAuthRequest(url: string, durationMs: number, outcome: string): void {
  if (!isAuthDebugEnabled()) return;
  record({ at: new Date().toISOString(), kind: 'request', detail: `${describeAuthUrl(url)} → ${outcome}`, durationMs });
}

export function logAuthEvent(event: string, expiresAt: number | null): void {
  if (!isAuthDebugEnabled()) return;
  const expiresIn = expiresAt != null ? Math.round(expiresAt - Date.now() / 1000) : null;
  record({
    at: new Date().toISOString(),
    kind: 'event',
    detail: `${event}${expiresIn != null ? ` expires_in=${expiresIn}s` : ''}`,
  });
}
