// lib/supabase/auth-timing.ts
// Pure helpers deciding a per-request fetch timeout for the Supabase browser client.
// Auth endpoints (tiny payloads) get a tighter, slow-network-safe bound; data queries
// get more room. Both stay BELOW auth-js's refresh retry ceiling
// (AUTO_REFRESH_TICK_DURATION_MS = 30s) so a dead-socket fetch aborts and frees the
// per-tab auth lock instead of hanging the whole retry window.

// auth-js caps a stalled refresh's retry loop at this. Exported so a regression test
// can assert our fetch timeouts never drift above it. Mirror of
// @supabase/auth-js AUTO_REFRESH_TICK_DURATION_MS.
export const AUTHJS_REFRESH_RETRY_CEILING_MS = 30_000;

// 12s is far above any legitimate auth round-trip (a token/user endpoint returns in
// well under a second even on slow 3G), so this only fires on a genuinely dead socket.
export const AUTH_FETCH_TIMEOUT_MS = 12_000;

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

// Uses an explicit AbortController + setTimeout (not AbortSignal.timeout) so the timer
// is deterministic under Vitest fake timers and is always cleared on settle.
export function makeFetchWithTimeout(baseFetch: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const url = resolveRequestUrl(input as RequestInfo | URL);
    const ms = timeoutForUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new DOMException('Supabase request timed out', 'TimeoutError')),
      ms,
    );
    const signal = init?.signal
      ? AbortSignal.any([init.signal, controller.signal])
      : controller.signal;
    try {
      return await baseFetch(input, { ...init, signal });
    } finally {
      clearTimeout(timer);
    }
  };
}
