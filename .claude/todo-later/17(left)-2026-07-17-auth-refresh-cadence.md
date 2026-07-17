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

Hypotheses to test (add temporary client instrumentation: log each getUser/refresh with
timestamp + lock-acquire wait + hold duration; enable auth-js lock debug via
`localStorage['supabase.gotrue-js.locks.debug'] = 'true'`):
1. Short project JWT expiry (Supabase → Auth → Sessions → Access token TTL). If TTL is
   low (e.g. 60–120s), auto-refresh fires far more often. Fix = raise TTL.
2. Abort-driven retry storm: a stalled refresh aborts (AuthRetryableFetchError) and the
   auto-refresh tick re-attempts on the next tick. The dead-socket abort at 12s (this
   fix) should reduce it; re-measure after the fix ships.
3. The /payment/status reconciliation poll re-triggering session validation. Confirm the
   poll interval and whether each cycle forces a refresh.

Read before touching browser auth timers or the payment-status poll.
