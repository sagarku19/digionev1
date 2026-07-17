---
noteId: "5d642c6081f611f1a3b34f18ce8d8fe6"
tags: []

---

# Auth refresh cadence anomaly (browser refreshes ~every 13s)

Observed 2026-07-17 in Supabase auth logs on /payment/status: browser (Chrome UA)
`POST /auth/v1/token?grant_type=refresh_token` roughly every 13s, all 200. Expected
~hourly given EXPIRY_MARGIN_MS = 90s and AUTO_REFRESH_TICK_DURATION_MS = 30s.

Not the cause of the process-lock crash (fixed via dedup + recovery + per-endpoint fetch
timeouts, plan `docs/superpowers/plans/2026-07-17-supabase-auth-lock-timeout-resilience.md`)
but it multiplies lock-acquisition frequency, so worth closing.

**Diagnosis kit SHIPPED (2026-07-18):** `lib/supabase/auth-debug.ts`. Enable with
`localStorage['digione.auth.debug'] = '1'` in the browser console, browse normally, then
dump `window.__authDebug()`. It logs every `/auth/v1/*` request (path + grant_type +
duration + status/abort, fed from the `auth-timing.ts` fetch wrapper) and every auth
event with `expires_in` (fed from the `current-user.ts` listener). Decision tree:
`expires_in` short (≤ ~300s) → raise the Access-token TTL in Supabase Dashboard → Auth →
Sessions (config fix, no code). TTL fine but `expires_at` not advancing between
TOKEN_REFRESHED events → cookie-persistence bug in the storage adapter. Neither → count
distinct refresh loops (multi-tab is expected; leaked clients are not). Also available:
auth-js's own lock debug via `localStorage['supabase.gotrue-js.locks.debug'] = 'true'`.

Hypotheses to test:
1. Short project JWT expiry (Supabase → Auth → Sessions → Access token TTL). If TTL is
   low (e.g. 60–120s), auto-refresh fires far more often. Fix = raise TTL.
2. Abort-driven retry storm: a stalled refresh aborts (AuthRetryableFetchError) and the
   auto-refresh tick re-attempts on the next tick. The dead-socket abort at 12s (this
   fix) should reduce it; re-measure after the fix ships.
3. The /payment/status reconciliation poll re-triggering session validation. Confirm the
   poll interval and whether each cycle forces a refresh.

Read before touching browser auth timers or the payment-status poll.
