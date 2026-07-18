// lib/supabase/auth-timing.ts
// Pure helpers deciding a per-request fetch timeout for the Supabase browser client.
// Auth endpoints (tiny payloads) get a tighter, slow-network-safe bound; data queries
// get more room. Both stay BELOW auth-js's refresh retry ceiling
// (AUTO_REFRESH_TICK_DURATION_MS = 30s) so a dead-socket fetch aborts and frees the
// per-tab auth lock instead of hanging the whole retry window.

import { isAuthDebugEnabled, logAuthRequest } from './auth-debug';

// auth-js caps a stalled refresh's retry loop at this. Exported so a regression test
// can assert our fetch timeouts never drift above it. Mirror of
// @supabase/auth-js AUTO_REFRESH_TICK_DURATION_MS.
export const AUTHJS_REFRESH_RETRY_CEILING_MS = 30_000;

// 12s is far above any legitimate auth round-trip (a token/user endpoint returns in
// well under a second even on slow 3G), so this only fires on a genuinely dead socket.
export const AUTH_FETCH_TIMEOUT_MS = 12_000;

// Lock-wait ceiling for every auth-lock waiter (getSession under EVERY data
// query, signOut, setSession, …). Invariant: MUST exceed AUTH_FETCH_TIMEOUT_MS —
// a single stalled fetch holds the lock for up to that long, and auth-js's 5s
// default guaranteed every concurrent waiter threw ProcessLockAcquireTimeoutError
// during any single stall (the recurring dev-overlay crash). At 15s, waiters
// ride out a single stall; only a rare double-stall (~24s+) still times out,
// and those paths degrade via current-user.ts. Kept below the 30s refresh
// retry ceiling so a waiter can never outlast the worst-case hold.
export const LOCK_ACQUIRE_TIMEOUT_MS = 15_000;

// Data queries can be legitimately heavy (large lists, cold starts); give them more
// headroom than auth so slow-network reads are not falsely aborted.
export const DATA_FETCH_TIMEOUT_MS = 20_000;

export function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/v1/');
}

export function timeoutForUrl(url: string): number {
  return isAuthEndpoint(url) ? AUTH_FETCH_TIMEOUT_MS : DATA_FETCH_TIMEOUT_MS;
}

function resolveRequestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

// Uses an explicit AbortController + setTimeout (not AbortSignal.timeout) so the timer
// is deterministic under Vitest fake timers and is always cleared on settle.
//
// Dead-socket self-heal: when OUR timer aborts an idempotent (GET/HEAD) request,
// it is retried once immediately — the retry opens a fresh connection, which is
// exactly what a stalled pooled socket needs, so the common post-sleep/redirect
// stall resolves invisibly instead of surfacing a TimeoutError. Non-idempotent
// requests and caller-initiated aborts are never retried (refresh/sign-in have
// their own safe retry paths; checkout POSTs go to our API, not Supabase).
export function makeFetchWithTimeout(baseFetch: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const url = resolveRequestUrl(input as RequestInfo | URL);
    const ms = timeoutForUrl(url);
    const idempotent = ['GET', 'HEAD'].includes(resolveRequestMethod(input as RequestInfo | URL, init));
    const debug = isAuthDebugEnabled() && isAuthEndpoint(url);

    type AttemptResult =
      | { ok: true; res: Response }
      | { ok: false; err: unknown; timedOut: boolean };

    const runAttempt = async (): Promise<AttemptResult> => {
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort(new DOMException('Supabase request timed out', 'TimeoutError'));
      }, ms);
      const signal = init?.signal
        ? AbortSignal.any([init.signal, controller.signal])
        : controller.signal;
      const startedAt = Date.now();
      try {
        const res = await baseFetch(input, { ...init, signal });
        if (debug) logAuthRequest(url, Date.now() - startedAt, `status ${res.status}`);
        return { ok: true, res };
      } catch (err) {
        if (debug) logAuthRequest(url, Date.now() - startedAt, err instanceof Error ? err.name || 'error' : 'error');
        return { ok: false, err, timedOut };
      } finally {
        clearTimeout(timer);
      }
    };

    const first = await runAttempt();
    if (first.ok) return first.res;
    if (first.timedOut && idempotent && !init?.signal?.aborted) {
      const second = await runAttempt();
      if (second.ok) return second.res;
      throw second.err;
    }
    throw first.err;
  };
}
