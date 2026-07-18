---
noteId: "5d642c6081f611f1a3b34f18ce8d8fe6"
tags: []

---

# Auth refresh cadence — REOPENED 2026-07-18: REPLAY STORM confirmed (stale-session persistence bug, client-side)

**Corrected diagnosis (2026-07-18, second pass).** The first pass wrongly closed this as
"healthy hourly cadence" — a **methodology error**: it measured `auth.refresh_tokens`
MINT gaps, but GoTrue tolerates replays of an already-used refresh token (200, session
`refreshed_at` updated, **no row minted**), so mint gaps cannot see a replay storm.

**Proof (API logs + SQL, 2026-07-17 21:47–22:07 UTC):** the browser (Chrome UA) POSTed
`/auth/v1/token?grant_type=refresh_token` every **~13s for ~19 minutes, all 200**, while
the DB minted exactly **ONE** token (21:47:36, session `c87e186f`) in that window; the
session's `refreshed_at` advanced to 22:07:34. ⇒ the client was **replaying the same
stale refresh token** — it never adopted/persisted the refreshed session, so every 30s
auto-refresh tick (×2 staggered tabs ≈ 13s) saw "near expiry" forever. Context: 4
concurrent live sessions for the creator account (Chrome, VS Code Simple Browser, older
contexts) + a second account (buyer `sagarkush219@…`) sharing the same browser cookie
(one storageKey per project!).

**Leading hypothesis:** stale/corrupt chunked auth cookies (`sb-…-auth-token.0/.1…`) on
localhost — accumulated across many sessions/two accounts — make the cookie WRITE-back
fail or the READ-back return the old session. auth-js `__loadSession` reads storage each
tick → stale `expires_at` → refresh → replay → forever.

**Next actions (in order):**
1. USER: clear all `sb-*` cookies + localStorage for `localhost:3000` (DevTools →
   Application → Storage → Clear site data), log in fresh once. If the 13s loop stops →
   stale-cookie corruption confirmed.
2. USER: `localStorage['digione.auth.debug']='1'` → 2 min browsing → `window.__authDebug()`.
   TOKEN_REFRESHED events with healthy `expires_in≈3600` while refresh requests keep
   firing = adoption failure confirmed client-side.
3. CODE (if confirmed): detect-and-repair in the auth layer — on TOKEN_REFRESHED,
   compare the event session against what storage returns; on mismatch, force
   session repair or purge stale chunks. Also consider a client-side cap on refresh
   attempts per minute. Needs its own small spec.
4. Avoid logging creator + buyer accounts into the same browser profile during testing
   (same storageKey → cookie thrash); use a separate profile/incognito for the buyer.

**FIX SHIPPED 2026-07-18 (step 3 done):** `lib/supabase/auth-repair.ts` — after every
`TOKEN_REFRESHED`/`SIGNED_IN`, verify the event session actually reached cookie
storage (parses the `sb-…-auth-token` chunked/base64 cookie directly, no client
call); on mismatch: purge the stale auth cookies → `setSession(event tokens)` →
re-verify. 60s repair cooldown + single-flight; deferred out of the auth callback
via `setTimeout` (the event fires while auth-js holds the per-tab lock — calling
`setSession` inline would deadlock). Storm telemetry: 3+ refreshes in 2 min →
one `console.warn` per window. Wired in `current-user.ts`
`ensureAuthEventSubscription`; 16 unit tests in `auth-repair.test.ts`.
This breaks the loop on its first iteration: the first storm tick repairs storage,
so the next tick sees a healthy `expires_at`. Diagnosis steps 1–2 above are
superseded (a fresh sign-out/in happened 2026-07-18 anyway); if the
`[auth-repair]` warn ever fires in the console, that's the confirmation the
stale-persistence hypothesis was right. Step 4 (separate browser profile for the
buyer account) is still good hygiene.

**Hardened 2026-07-19** after a dev-overlay `ProcessLockAcquireTimeoutError`: the
guard's `setSession` takes the per-tab auth lock, and the deferred call had no
rejection handler → unhandled rejection when the lock was busy (stalled-refresh
family, saga ch. 3). Fixes: lock-acquire timeouts are treated as contention, not
corruption (`'skipped'`, cooldown un-stamped so the next auth event retries);
the schedule site `.catch`es everything; and the repair order is now
**persist-first** — purge only as an escalation and always immediately followed by
another persist, because purging without a successful rewrite deletes the only
session cookie (storage would read as signed-out). 19 unit tests.

**Watch-item (unchanged):** per-tab `processLock` = zero cross-tab refresh
serialization; revisit `navigatorLock`-steal only if "randomly logged out" reports
appear.

**Companion fix shipped 2026-07-18:** `auth-timing.ts` now retries an idempotent
(GET/HEAD) request once when OUR timeout aborts it — the dead-socket stall self-heals
on a fresh connection and no TimeoutError reaches the console for single-stall cases.

**Server-side amplification FIXED + VERIFIED 2026-07-18 (separate issue, same log
noise):** the ~55×-per-dashboard-visit `GET /auth/v1/user` (UA `node`) burst was
`proxy.ts` calling `getUser()` per guarded request × Link prefetch fan-out. Shipped
(commit `d9dec56`): local JWT verification via `getClaims()` (JWKS-cached) with
`getUser()` fallback on expiry, + hover-gated prefetch for rare sidebar links. Spec:
`docs/superpowers/specs/2026-07-18-middleware-jwt-and-prefetch-design.md`.
The project WAS rotated to asymmetric ES256 signing keys the same day (kid
`b12ea5b6-2cc4-46e5-94e6-6819e21c9c14`) and the fix verified in production auth logs:
`GET /user` from digione.ai dropped **50/min → 1–2/min**, with the middleware's
one-time JWKS fetch visible. Remaining `/user` calls are per-request `/api/*` route
auth (by design).
**⚠ NEVER revoke the legacy HS256 "previously used" key in Dashboard → JWT Keys:**
`NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_KEY` are legacy JWTs verified
against it — revoking breaks every Supabase call until the app migrates to
`sb_publishable_`/`sb_secret_` API keys (separate future task).
The client-side 13s replay storm above remains OPEN and unrelated.

---

Original note (kept for history):

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
