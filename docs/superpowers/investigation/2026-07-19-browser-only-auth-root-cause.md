---
noteId: "a781e6b082f611f196844f9dd6ee89fe"
tags: []

---

# Investigation — Browser-Only Supabase Auth Instability

- **Date:** 2026-07-19
- **Status:** FORENSICS SHIPPED + REVIEWED + HARDENED (Phase 4 → 4.1). The 3 review-blocking correctness fixes are DONE (in-flight request records, monotonic clock, TAO-aware correlation); tests 63/63, tsc + lint clean. Correlation now **never emits a definitive/phase-specific networking finding from unavailable cross-origin data** — networking caps at `strong` + recommends NetLog. Residual limits (transport ground truth, cross-tab, SSR sync) require NetLog / server telemetry. Phase 1 §10 (`navigator.locks`) retracted. Root cause still isolated, not confirmed. No production behavior changed.
- **Method:** Read-only, first-principles investigation (systematic-debugging discipline). Every claim cites the code or production log it rests on.
- **Symptoms in scope:** browser-only `TimeoutError: Supabase request timed out` and `ProcessLockAcquireTimeoutError`; ~13s refresh replay storm. Same Supabase project + accounts work on mobile.

---

## TL;DR

The browser-only symptoms are **not** a Supabase-project problem and **not** primarily a lock problem. They are downstream noise of **one structural fact**: the web client stores its session in **chunked `document.cookie` shared origin-wide under a single storage key**, refreshed by a **per-tab lock (`processLock`) that provides zero cross-tab serialization**. Mobile has none of that (AsyncStorage: single-owner, non-chunked, non-shared, no cookies, no `navigator.locks`, different connection reuse). Every custom layer added over time is a correct-but-symptomatic patch on a consequence of that one fact. The nine-commit patch cascade is the textbook signal that the *architecture*, not the latest bug, needs the decision.

---

## 1. Auth architecture (as-built)

```
BROWSER TAB (client.ts singleton `supabase`)
 │  createBrowserClient (@supabase/ssr 0.9.0)  ── SINGLETON in browser (verified)
 │    storage      = document.cookie, chunked, base64url  ← the browser-only surface
 │    lock         = processLock (in-memory, PER-TAB)      ← no cross-tab coordination
 │    autoRefresh  = ON  (every ~30s tick checks expiry)
 │    global.fetch = makeFetchWithTimeout (12s auth / 20s data abort + 1 GET retry)
 │
 ├─ every data query → auth-js getSession() → TAKES processLock → reads cookie
 ├─ every ~30s tick  → _autoRefreshTokenTick → if near expiry → POST /auth/v1/token
 │                      (TAKES processLock, writes session back to cookie)
 ├─ onAuthStateChange → current-user.ts: cache lastKnownUser + scheduleAdoptionCheck
 │                      (auth-repair: verify cookie actually holds new token; re-persist)
 └─ getAuthSnapshot() (single-flight) → resolveAuthSnapshot → tri-state
        authenticated | unauthenticated | degraded   (degraded = keep last user)

SERVER (proxy.ts middleware)  — guarded /dashboard,/account only
 │  cookie present? no → redirect (zero network)
 │  yes → getClaims()  ← LOCAL JWT verify (ES256/JWKS, no network, NO refresh)
 │        fallback getUser() only if claims can't be produced (expired/HS256/JWKS miss)
 └  gateGuardedRoute(role)

SERVER (server.ts / route handlers)
 │  createServerClient → getUser() (money/KYC/admin) or getVerifiedIdentity() (hot routes)
 └  /api/auth/callback → exchangeCodeForSession + one-time refreshSession (login only)
```

Sources: `lib/supabase/client.ts:10-38`, `node_modules/@supabase/ssr/.../createBrowserClient.js:8-15` (singleton), `node_modules/@supabase/ssr/.../cookies.js:91-105,151-192` (cookie storage), `lib/supabase/auth-timing.ts`, `lib/supabase/current-user.ts`, `lib/supabase/auth-repair.ts`, `proxy.ts:82-127`, `app/api/auth/callback/route.ts:14-27`.

---

## 2. Browser vs Mobile — the difference that matters

| Dimension | Web (this repo) | Mobile (RN/Flutter + supabase-js/gotrue) | Consequence |
|---|---|---|---|
| **Session storage** | `document.cookie`, **chunked** `.0/.1…`, base64url | AsyncStorage — one KV value, no chunks | Cookie read-back can go **stale**; AsyncStorage can't |
| **Storage sharing** | **One `sb-<ref>-auth-token` per project, shared by every tab + every account in the profile** | One store per app install (one session) | Multi-tab/multi-account **cookie thrash** — web only |
| **Refresh lock** | `processLock` (per-tab, in-memory) | processLock or none | **No cross-tab serialization** → N tabs refresh in parallel |
| **Server co-writer** | middleware/route handlers also read/write the same cookies | none | client/server can desync the cookie (now mitigated by `getClaims`) |
| **Connection reuse** | browser reuses pooled HTTP sockets; dead after sleep/resume/redirect | RN networking, different pooling | **dead-socket stalls** on `/auth/v1/*` — web only |
| **`navigator.locks`** | exists (abandoned here for processLock) | absent | dev deadlock class exists only on web |

**"What exists only in the browser?"** → chunked cookie storage, a single shared storage key across tabs/accounts, a per-tab lock with no cross-tab coordination, a server co-writer, and dead pooled sockets. Every custom layer exists to compensate for an item in this column.

> Caveat: there is no mobile code in this repo — mobile is a separate app. This comparison is against how the mobile SDK stack works *by design*, not against mobile source.

---

## 3. Lock ownership analysis

- **Who takes it:** every `getSession()` (auth-js attaches the token to *every* PostgREST/data request → each query takes the lock), every auto-refresh tick, `setSession`, `signOut`, `getUser`. Confirmed by `auth-timing.ts:19-21` + auth-js behavior.
- **Max hold:** bounded by the fetch abort — a stalled `/auth/v1/*` request can pin the lock up to **12s** (`AUTH_FETCH_TIMEOUT_MS`, `auth-timing.ts:17`).
- **Max wait:** `LOCK_ACQUIRE_TIMEOUT_MS = 15s` (`auth-timing.ts:27`), deliberately > the 12s hold so waiters ride out a single stall.
- **The overlay crash (root):** old default wait was **5s < 12s hold** → during *any* single stall every concurrent waiter threw `ProcessLockAcquireTimeoutError` (`.claude/todo-later/19(half)-...:69-71`). Fixed by the ceiling raise — correct fix.
- **Structural flaw:** `processLock` is **per-tab** → cannot serialize refresh across tabs. 2–4 tabs each run their own refresh and rewrite the shared cookie → the thrash in §5.

---

## 4. Network lifecycle

- **Can stall:** any `/auth/v1/*` on a dead pooled socket — the `TimeoutError: Supabase request timed out` in the console is **our own** abort firing (`auth-timing.ts:78`), i.e. proof the stall is real.
- **Retried:** idempotent GET/HEAD once on a fresh connection (`auth-timing.ts:96-102`); `signInWithPassword` retried once (`useAuthSession.ts:86-94`).
- **Not safely retried:** `POST /auth/v1/token` refresh (non-idempotent, rotates the refresh token) — correctly excluded.
- **Blocks the lock:** the refresh POST holds `processLock` for its whole life → the 12s cap bounds it.

---

## 5. Session lifecycle & the confirmed race

From `.claude/todo-later/19(half)-2026-07-17-auth-refresh-cadence.md` (real production logs, 2026-07-17, API logs + SQL):

> Browser POSTed `/auth/v1/token?grant_type=refresh_token` **every ~13s for ~19 min, all 200**, while the DB minted **exactly one** refresh token; session `refreshed_at` kept advancing. ⇒ the client **replayed the same stale refresh token** — the refreshed session never reached cookie storage, so every 30s tick saw "near expiry" forever. Context: **4 concurrent sessions + 2 accounts sharing one browser cookie**.

The race: tick reads cookie → sees stale near-expiry session → refreshes → writes new session to cookie → **next read returns stale again** → repeat. GoTrue *tolerates* replay of a used refresh token (200, no new row minted), so it loops silently. auth-js re-reads storage as source-of-truth every tick (`__loadSession`), so a persistence failure becomes an infinite loop. Per-tab processLock + one shared cookie key across tabs/accounts is the mechanism that makes the write not "stick" from another owner's view.

---

## 6. Browser-specific issues — verified vs eliminated

| Candidate | Verdict | Evidence |
|---|---|---|
| Chunked-cookie stale read-back | **Confirmed contributor** | `cookies.js:135-149` reassembles chunks; todo-19 prod logs |
| Single storage key shared across tabs/accounts | **Confirmed contributor** | todo-19 (4 sessions/2 accounts, one cookie); `client.ts:20-24` |
| Dead pooled socket after sleep/resume/redirect | **Confirmed** | our own `TimeoutError` fires; `auth-timing.ts:15-18` |
| processLock per-tab → no cross-tab serialization | **Confirmed design flaw** | `client.ts:20-24`; todo-19:79-81 watch-item |
| Multiple GoTrueClients in prod | **Eliminated** | `createBrowserClient.js:8-15` — browser singleton; repeated `createClient()` returns the cached one |
| HttpOnly cookie blocking `document.cookie` read | **Eliminated** | no `httpOnly` on auth cookies (only the shortlink password cookie, `api/s/[code]:154`) |
| Custom cookie domain/options divergence | **Eliminated** | no `cookieOptions`/`domain` configured anywhere; SDK defaults used |
| Server refreshing per request, racing the client | **Eliminated (now)** | `proxy.ts:107` uses `getClaims()` local verify, no per-request refresh |
| `navigator.locks` itself being "the bug" | **Eliminated as root** | it merely made *stalled-fetch-holds-lock* origin-wide; processLock has the same root, per-tab |
| React StrictMode / dev double-exec / HMR | **Possible (dev-only)** | plausible amplifier for the original `navigator.locks` dev deadlock; not a prod cause |
| Short access-token TTL | **Possible, unverified** | can't read the dashboard; would inflate baseline refresh rate (not the 13s loop) |

---

## 7. Upstream

`@supabase/ssr 0.9.0`, `@supabase/supabase-js 2.99.2`, `@supabase/auth-js 2.99.2`. Findings, **not** a recommendation to upgrade:
- `createBrowserClient` is a **browser singleton by default** (`isSingleton` unset + `isBrowser()`); the singleton captures the **first** call's options — the module-load `supabase = createClient()` config wins.
- The chunked-cookie storage adapter has a **known stale-chunk edge** — its own comments: *"TODO: detect and log stale chunks error"* (`cookies.js:46`) and *"Only 5 chunks are fetched… does not solve those with very large sessions"* (`cookies.js:28-31`). `auth-repair.ts` is essentially a userland implementation of that missing "detect stale chunks and repair."

---

## 8. Complexity audit

| Layer | Purpose | Keep? |
|---|---|---|
| `makeFetchWithTimeout` (12s/20s abort + 1 GET retry) | bound dead-socket stalls; free the lock | **Keep** — compensates a real browser behavior; not a hack |
| `LOCK_ACQUIRE_TIMEOUT_MS = 15s` | waiters ride out one stall | **Keep** — invariant (12<15<30) correct + tested |
| `current-user.ts` tri-state (`degraded`) | stop network stalls masquerading as logout | **Keep** — the *right* fix for false-logout |
| `resolveAuthSnapshot` lock-retry + single-flight | absorb rare double-stall / dedupe | **Keep** (small, correct) |
| `signInWithRetry` + 15s login race | absorb dead-socket on sign-in | **Keep** (thin) |
| **`auth-repair.ts` (adoption guard, purge+re-persist)** | patch the refresh replay storm | **Candidate to DELETE** if the storm root (cross-tab thrash) is removed |
| `auth-debug.ts` | diagnostics | Keep (dev-gated, cheap) |
| `processLock` choice | avoid dev `navigator.locks` deadlock | **This is the decision to revisit** (see §10) |

The only layer *hiding* a root cause rather than compensating a real constraint is **`auth-repair.ts`** — it repairs the consequence of no cross-tab serialization instead of preventing it.

---

## 9. Root cause — ranked

**Primary (high confidence):** The browser session lives in a **single, chunked, origin-wide cookie**, refreshed by a **per-tab lock** that cannot serialize across tabs. Concurrent tabs/accounts overwrite each other's shared cookie; chunked writes can read back stale → refreshed sessions don't "stick" → `/auth/v1/token` replay storm. Amplified by real dead-socket stalls that pin the (per-tab) lock. Mobile is immune because AsyncStorage is single-owner, non-chunked, non-shared.

**Secondary (medium):** dead pooled sockets after sleep/resume/redirect — a genuine, unavoidable browser behavior; appropriately handled by abort+retry (bound it, don't "fix it away").

**Possible, unverified (user must check):**
- Access-token TTL in the Supabase project (Dashboard → Auth → Sessions). Raise to 3600s if lower — pure config.
- Cookie size approaching the 4KB/cookie limit (worse since the 2026-07-18 ES256 rotation enlarged tokens) causing silent write drops.

**Eliminated:** multiple prod clients, HttpOnly, custom cookie domain, per-request server refresh, "navigator.locks is the bug."

---

## 10. Recommended fix (smallest architecture) + migration plan

Highest-leverage, complexity-*reducing* move — attacks the **primary** root cause instead of patching it:

> **Re-adopt `navigatorLock` (origin-wide Web Locks) — now that auth fetches are bounded by the 12s abort.**

Rationale, tied to evidence:
- `navigatorLock` serializes refresh **across all tabs of the origin** → only one tab refreshes and persists at a time; others read the fresh cookie. Removes multi-tab cookie thrash **at the root** (strongest confirmed contributor, §5).
- The *reason it was abandoned* — a dev deadlock — was caused by an **unbounded stalled fetch holding the origin-wide lock forever**. That precondition no longer exists: `makeFetchWithTimeout` caps any auth fetch at 12s and `lockAcquireTimeout` caps waits at 15s.
- If cross-tab serialization holds, **`auth-repair.ts` and its wiring can be deleted** — net complexity goes *down*.

Validation-first rollout (no blind swap):

1. **Measure the storm on a clean single-account profile.** Clear all `sb-*` cookies + site data, one tab, `localStorage['digione.auth.debug']='1'`, browse 2 min, `window.__authDebug()`. If the 13s loop **does not** reproduce → storm is largely a multi-account/dev artifact and `auth-repair` is defensive-only. *(USER runs this.)*
2. **Check access-token TTL** (dashboard); raise to 3600s if lower. *(USER runs this.)*
3. **Prototype `navigatorLock`** in `client.ts` (keep fetch-abort + `lockAcquireTimeout`). Re-test the original trigger: multiple tabs + HMR + forced stall. Expected: no origin-wide deadlock, because the fetch is now bounded.
4. **Re-run the multi-tab storm repro.** If gone → remove `auth-repair.ts` + `scheduleAdoptionCheck`/guard wiring in `current-user.ts`; keep storm telemetry only if wanted.
5. **Keep permanently:** tri-state `degraded`, fetch-abort+retry, lock ceiling — correct compensations for real browser networking, not hacks.

Fallback if step 3 still deadlocks in dev: stay on `processLock`, keep `auth-repair`, treat the storm as a known, mitigated multi-tab limitation. No new layers.

---

## Open items for reviewer

- [ ] User step 1 result: does the 13s storm reproduce on a clean single-account profile? (`__authDebug()` dump)
- [ ] User step 2 result: Supabase access-token TTL value
- [ ] Decision: prototype `navigatorLock` (steps 3–4) vs. stay on `processLock`
- [ ] If storm confirmed dev/multi-account only → downgrade `auth-repair.ts` priority to "defensive, removable"

## Related
- `.claude/todo-later/19(half)-2026-07-17-auth-refresh-cadence.md` (prod-log evidence)
- `docs/superpowers/specs/2026-07-18-auth-reliability-design.md`
- `docs/superpowers/specs/2026-07-18-middleware-jwt-and-prefetch-design.md`
- `docs/reference/auth-timeouts-and-locks.md`

---
---

# Phase 2 — Validation / Falsification (2026-07-19)

Goal of this pass: **disprove** the Phase 1 hypothesis. It partially broke.

## Two Phase-1 claims did NOT survive

1. **"Switch to `navigator.locks` solves the original timeout" — FALSIFIED.** Within one tab both locks are *one lock per storage key* (`GoTrueClient.js:1300`). A stalled refresh holds it; swapping the implementation does not release it sooner. `navigator.locks` changes **cross-tab** behavior only, and makes a single stall's blast radius **worse** (origin-wide → one tab's stalled refresh blocks auth in all tabs), while `processLock` confines it to one tab.
2. **"One structural fact explains everything" — OVERSTATED.** There are **two distinct failures**; Phase 1 conflated them:
   - **Family A — replay storm** (13s cadence, all 200): a *persistence* failure. Cross-tab / multi-account precondition.
   - **Family B — stall → `ProcessLockAcquireTimeoutError`** (the actual overlay crash): a *networking + serialization* failure. **Single-tab**, unrelated to shared cookies.

## New mechanism evidence (this pass)

- `getSession()` acquires the lock: `GoTrueClient.js:1267-1270`.
- Every PostgREST/Storage request attaches the token via `getSession()`: `supabase-js index.cjs:388,492-496`.
- **Reentrancy fast-path** `GoTrueClient.js:1282-1298`: ops arriving after `lockAcquired=true` **queue** (`pendingInLock`) rather than each calling the real lock. ⇒ steady-state queries do NOT each throw an acquire-timeout — only a **burst** of independent ops reaching the true-acquire path (load / nav / focus) does. This **contradicts** the todo-19 "every waiter throws" framing.
- `processLock` acquire-timeout mechanism: `locks.js:255-290` — each true-acquire waiter races the holder against its own `acquireTimeout` timer.
- **No service worker** exists (grep) — eliminated as a stall cause.
- Cookie chunk cap = 3180 bytes (`ssr utils/chunker.js`), auth cookies are **not** HttpOnly → `document.cookie` read-back works.

## Confidence re-grade (Proven / Strong / Weak / Speculation)

| Phase-1 conclusion | Grade |
|---|---|
| Browser chunked-cookie vs mobile AsyncStorage | Proven |
| Browser singleton (no multi-client in prod) | Proven |
| `getSession()` → lock on every query | Proven |
| Stalled refresh blocks same-tab auth ops | Proven |
| Replay storm was real in prod | Strong |
| Storm root = cross-tab/multi-account thrash | Weak (single-account repro untested) |
| "Any stall → every waiter throws" | Weak / contradicted (reentrancy) |
| **Dead pooled socket is WHY it stalls** | **Speculation** (only asserted in comments; retry destroys the evidence) |
| 9-patch cascade = architecture smell | Proven (observation) |
| §10 switch to `navigator.locks` | **Falsified** |

## Why the request stalls (Task 2) — ranked, all browser-side

1. Stale/dead keep-alive socket reused after idle/sleep/redirect — **Weak (leading)**
2. Silently-dead HTTP/2 connection (auth+data multiplexed) — **Weak**, testable (do data queries stall together?)
3. The retry mitigation **hides the root** (evidence destroyed before capture) — **Strong (meta)**
4. Server-side slowness — **Eliminated as primary** (mobile hits same backend, is fine)
5. Extension / corporate TLS-inspection / AV proxy — **Weak**
6. DNS re-resolve after resume — **Speculation**
7. `next dev` HMR / dev-proxy — **Speculation**
8. Service worker — **Eliminated** (none exists)

## Lock verdict (Task 5)

`processLock` is an **amplifier + exposer, not the root**. `navigator.locks` would reduce **Family-A frequency**, would **not** fix the **Family-B timeout**, and would **worsen** per-stall blast radius. Net: not an evidence-supported fix for the stated goal.

## Decision (Task 7): Option C — instrument the stall first, change nothing

The one load-bearing fact (why the request stalls) is **Speculation-grade**, and the retry mitigation destroys the evidence. Before any lock/architecture change:

1. **Capture one real stall** — temporarily disable the idempotent-GET retry (`auth-timing.ts:96-102`) or run `chrome://net-export` during a post-sleep/post-redirect stall; read the DevTools **Timing** breakdown (Stalled vs Waiting(TTFB) vs DNS/TLS) → decides candidates #1/#2/#5. **(user-run)**
2. **Two cheap values** — Supabase access-token TTL; and whether data queries stall *simultaneously* with auth (H2 hypothesis). **(user-run)**
3. **todo-19 step 1** — clean single-account profile: does the 13s storm reproduce? grades Family A. **(user-run)**

Confidence Option C is the right next step: **High**. Confidence in any lock change today: **Low**.

## Open items for reviewer (updated)

- [ ] Measurement 1: DevTools/net-export timing of a captured stall
- [ ] Measurement 2: access-token TTL value + do data queries stall with auth?
- [ ] Measurement 3: clean single-account profile — storm reproduces? (`__authDebug()`)
- [ ] Decision deferred until measurements land; `navigator.locks` recommendation retracted pending evidence

---
---

# Phase 3 — Browser Networking Root Cause (2026-07-19)

Scope: below the auth layer. Goal: why does the browser request itself stop making progress ~12s?

## Framing correction (evidence)

The identical symptom is reported upstream across THREE families, not one:
- **Networking** — HTTP/2 dead-socket / GOAWAY zombie reuse (Chromium-documented).
- **Lock-orphan** — Web Locks never released (`supabase-js#2111`, `#1594`, `gotrue-js#762`, `supabase#41968`).
- **Cookie/session** — the closest match `supabase#35754` is **OPEN + UNDIAGNOSED**; only fix is clearing cookies.

So "it's networking" is a lead, not a proven premise. This phase isolates networking and builds a discriminating measurement plan. No fix recommended.

## Two load-bearing facts

- App talks to default `qcendfisvyjnwmefruba.supabase.co` → **Cloudflare edge over HTTP/2**, in **both** local dev and prod. `next dev` only changes the app-server connection, not the Supabase one ⇒ the auth stall is **environment-independent at transport level**.
- **"12s" is our own cutoff** (`AUTH_FETCH_TIMEOUT_MS`), not natural. Chromium's documented dead-socket stall is **~2 min** before Chrome gives up. We never observe the true duration — an evidence gap our own code creates.

## Leading mechanism

**HTTP/2 dead-socket / GOAWAY zombie reuse** at the Supabase edge after idle / sleep-resume / redirect. Server sends `GOAWAY NO_ERROR`, final close is lost, Chrome returns the socket to the pool, the next auth request reuses the zombie and hangs. **Windows amplifier:** Chrome runs idle-socket cleanup on a **10s timer on Windows only** (user is on Windows 11). **Why the refresh POST is the visible stall:** Chrome auto-retries idempotent GETs on a fresh socket but **not non-idempotent POSTs** — `POST /auth/v1/token` surfaces the hang while GETs self-heal. (`auth-timing.ts` GET/HEAD-only retry mirrors Chrome's own rule — coincidentally correct.)

## Existing instrumentation destroys evidence (Phase 5 answer: YES)

`auth-timing.ts` caps at 12s (hides natural duration), retries GETs (heals + hides the stalled attempt), and collapses to a generic `TimeoutError` (loses Stalled/TTFB/DNS/TLS phase). **Recommended temporary, reversible, debug-gated instrumentation** (NOT a behavior change): in the fetch wrapper `finally`, capture Resource Timing (`domainLookupStart/End`, `connectStart/End`, `secureConnectionStart`, `requestStart`, `responseStart`) to pinpoint the stalled phase; add a debug-flag override to raise the auth timeout to ~180s to observe natural duration. Gate behind `localStorage['digione.auth.debug']`.

## Confidence matrix (honest — no candidate >50%)

| Hyp | Conf | Confirming experiment | Expected signal |
|---|---|---|---|
| H1 HTTP/2 dead-socket / GOAWAY reuse | 40% | M3 NetLog | `HTTP2_SESSION_RECV_GOAWAY` + `SOCKET_POOL_STALLED_MAX_SOCKETS_PER_GROUP` + timestamp gap |
| H2 Cookie/session read-hang (#35754) | 20% | M1 + M5 | hang with NO pending request; stale `sb-` cookie |
| H3 processLock orphan (StrictMode/HMR) | 10% | M1 + M6 | hang, no request, indefinite natural duration |
| H4 Extension/AV/VPN/TLS-inspection | 10% | M4 | vanishes in clean profile/incognito |
| H5 Non-H2 resume stall (DNS/TCP/TLS) | 10% | M2 | Timing spike in DNS/Connect/SSL, not TTFB |
| H6 QUIC/HTTP3 race | 5% | M3 | QUIC session errors in NetLog |
| H7 Supabase edge GOAWAY storm | 5% | M3 | GOAWAY without local socket fault |

## Measurement plan (each step eliminates multiple hypotheses)

- **M1 — the fork (2 min, no code):** reproduce a hang (return after 30+ min idle, or post Cashfree→/payment/status redirect), DevTools→Network open. **Pending `/auth/v1/*` row?** Yes → networking (H1/H5/H7), eliminates H2/H3. No request at all → NOT networking (H2/H3), overturns the premise.
- **M2 — Timing:** Stalled↑ → pool; TTFB↑ → dead socket/edge; DNS/Connect/SSL↑ → H5/H4.
- **M3 — NetLog (definitive):** `chrome://net-export` → netlog-viewer. GOAWAY + SOCKET_POOL_STALLED + gap ⇒ H1.
- **M4 — Env isolation:** clean profile + incognito + different network. Vanishes ⇒ H4.
- **M5 — Cookie discriminator:** during hang, is `sb-<ref>-auth-token` fresh? `window.__authDebug()` TOKEN_REFRESHED healthy while requests fire ⇒ H2.
- **M6 — Natural duration:** debug-raise timeout to 180s. ~2 min self-resolve ⇒ H1; never ⇒ H3.
- **Order:** M1 → M2 → M3; M4 in parallel. M1 alone halves the space.

## Upstream (confirmed vs similar vs unrelated)

- Confirmed networking: Chromium HTTP/2 GOAWAY dead-socket (`40775994`, xangelo.ca); Windows 10s idle-socket timer (net-dev thread).
- Confirmed lock-orphan (alternative): `supabase-js#2111`, `#1594`, `gotrue-js#762`, `supabase#41968`, `auth-js#213`.
- Similar/closest/UNDIAGNOSED: `supabase#35754` (Next.js SSR + @supabase/ssr + Chrome + Vercel; same 10s-timeout workaround; clear-cookies fix).
- Unrelated: free-tier pause-prevention repos; refresh-lifetime discussions.

## Open items for reviewer (updated)

- [ ] M1 result: pending `/auth/v1/*` request during the hang? (the fork)
- [ ] M3 result: NetLog GOAWAY / SOCKET_POOL_STALLED present?
- [ ] M4 result: does it survive a clean/incognito profile + different network?
- [ ] If M1 shows NO request → networking premise is wrong; re-open lock/cookie families
- [ ] Approve the temporary debug-gated Resource-Timing instrumentation to stop evidence destruction? → **SHIPPED in Phase 4**

---
---

# Phase 4 — Browser Auth Forensics Mode (SHIPPED 2026-07-19)

Objective: make the NEXT stall self-diagnosing. Not a fix. Debug-only, zero production behavior change, reversible.

## Verified

`npx tsc --noEmit` clean · `npx vitest run` on the 4 auth suites = **57 passed** (11 new + 46 unchanged) · `eslint` clean on all touched files.

## How to use

1. Console: `localStorage['digione.auth.debug']='1'` then reload (or `window.__authForensicsEnable()`).
2. Reproduce the stall (idle return / Cashfree→/payment/status redirect / sleep-resume).
3. `window.__authDebugReport()` (or `window.__authDebugDownload()` → JSON file).
4. Read `report.findings[]` — the correlation engine labels which hypothesis (H1 networking / H2 cookie / H3 lock / H5 lifecycle / H7 edge) the capture supports, with severity `smoking-gun|suspicious|info`.

## What it records (all no-op when disabled)

- **Requests** (`auth-timing.ts` fetch wrapper): id, path, method, start/finish, duration, aborted, timedOut, retry+reason, status, errorType.
- **Resource timing** (PerformanceObserver, `/auth/v1/` only): DNS/TCP/TLS/TTFB/download, `nextHopProtocol` (h2/h3), `reused` heuristic, transferSize. Absence of an entry for a timed-out request is itself the dead-socket signature.
- **Auth events** (`current-user.ts` onAuthStateChange): event, expiry, access-token tail (rotation detection, no secret).
- **Lock timeline** (transparent `wrapLockWithForensics` in `client.ts`): requested/granted/released/timeout, waitMs, holdMs, caller. (True acquisitions only — auth-js reentrant piggybackers don't call the lock; documented.)
- **Lifecycle**: visibility/pageshow/pagehide/freeze/resume/online/offline/focus/blur.
- **Env snapshot** auto-captured on request-timeout and lock-timeout: UA/OS, online, visibility, route, outstanding auth/data requests, outstanding lock waiters, auth status, session expiry.

## Correlation engine (the discriminators)

- `request-timeout / socket sent, no first byte` + `reused=true h2` → **smoking-gun H1** dead-socket reuse.
- `request-timeout / no resource-timing entry` → request never hit the network (dead socket or pre-network).
- `request-timeout / slow connection setup` (DNS/TCP/TLS large) → **H5/H4**.
- `request-timeout / slow server first byte` (live socket, TTFB large) → **H7 edge**.
- `lock-timeout WITHOUT any network request` → **smoking-gun H3/H2** (holder did no network) — this flips the premise if it fires.
- `lock-timeout WITH in-flight auth request` → **H1** (stalled fetch held the lock).
- `lifecycle → request → timeout` → **H5**.
- `refresh storm (≥3 token POSTs in 2 min)` → **smoking-gun H2** persistence.

## Files (all changes tagged `[auth-forensics]` for one-grep removal)

- NEW `lib/supabase/auth-forensics.ts`, `lib/supabase/auth-forensics.test.ts`
- EDIT `lib/supabase/auth-timing.ts` (record attempts; additive), `client.ts` (wrap lock + install), `current-user.ts` (record auth events + context)

## Rollback

Inert unless the flag is set (safe to leave). Full removal = delete the 2 new files + revert the 5 tagged lines. No deps/schema/config touched.

## Open items for reviewer (updated)

- [ ] Run a capture on the next stall; paste `report.findings` + the timed-out request's `resources` entry
- [ ] Confirm which family the finding lands on → then (and only then) choose the fix
- [ ] After root cause confirmed: remove forensics via the `[auth-forensics]` grep

---
---

# Phase 4 — Review of the Forensics Implementation (2026-07-19)

Reviewing the diagnostics itself (not the auth issue): is it sufficient to identify the root cause at the next stall?

## Headline verdict

Strong on **in-process datasets** (lock timeline, auth events, lifecycle, storm detection); **unreliable on the network-phase dataset** the leading hypothesis (H1) depends on. As written it will emit **false-positive `smoking-gun H1 dead-socket` findings**. Not yet trustworthy for the networking question without 3 fixes or an external NetLog pairing.

## THE critical finding — cross-origin Timing-Allow-Origin (verified)

Per the Resource Timing spec / MDN: without a `Timing-Allow-Origin` response header, **cross-origin** resources have `domainLookupStart/End`, `connectStart/End`, `requestStart`, `responseStart`, `secureConnectionStart`, `transferSize` **zeroed** and `nextHopProtocol` `""`. Supabase (`*.supabase.co`) is cross-origin and almost certainly omits TAO on `/auth/v1/*`. Consequence: `deriveResourceMetrics` yields `dns=tcp=tls=ttfb=0, protocol="", reused=true` for EVERY auth entry, and `correlate()` rule #1 (`ttfbMs===0` + `reused`) emits **smoking-gun H1** for every timed-out request regardless of cause. **Verify in console:** `performance.getEntriesByType('resource').filter(e=>e.name.includes('supabase.co')).map(e=>[e.nextHopProtocol,e.connectEnd,e.responseStart])` — all `["",0,0]` on a completed request ⇒ the resource dataset is blind.

## Prove / eliminate per hypothesis

| Hypothesis | Prove? | Eliminate? | Missing |
|---|---|---|---|
| H1 HTTP/2 dead-socket reuse | ❌ (TAO false-positive) | ❌ | TAO header OR NetLog |
| Generic networking stall | ⚠️ (`responseEnd===0` survives cross-origin) | ⚠️ | phase localization |
| H2 cookie/session persistence | ⚠️ (storm proxy only) | ❌ | cookie-token vs event-token compare |
| Lock contention (Family B) | ✅ (wait/hold/timeout + caller) | ✅ | — strongest |
| Lock orphan (H3) | ⚠️ (dangling `granted`, no rule) | ❌ | orphan-holder finding + in-flight records |
| Browser lifecycle (H5) | ✅ if enabled early | ⚠️ | monotonic clock |
| SSR/browser sync | ❌ (client-only, no Set-Cookie visibility) | ❌ | server correlation / cookie observer |
| Supabase SDK behavior | ⚠️ (auth events + caller) | ⚠️ | reentrant queue invisible (by design) |

## Blind spots (prioritized)

- **B1 critical — TAO zeroes resource timing** → false-positive H1 (above).
- **B2 critical — settle-only request recording.** `recordRequestAttempt` fires only after the fetch resolves/aborts → no in-flight entry; `outstanding*Requests` always 0; the stalling request is invisible mid-hang until the 12s abort.
- **B3 high — `Date.now()` non-monotonic across sleep/resume** (the primary scenario) corrupts `durationMs`/ordering. Durations should use `performance.now()`.
- **B4 high — no hard lock↔request linkage** (temporal only; mis-links under storm). Inherent; `caller` is the partial mitigation.
- **B5 high — resource↔request match by nearest-1500ms** fails under a storm (repeated same path).
- **B6 med — H2 not directly provable** (no cookie-vs-event token compare).
- **B7 med — multi-tab invisible** (per-tab store, no tab id / aggregation).
- **B8 med — orphan-holder has no finding** (`granted` without `released`).
- **B9 low — `caller` unreliable in minified builds.**
- **B10 low — enable-before-sleep unenforced; buffered observer backfills only ~250 entries; pre-enable lifecycle lost.**

## Implementation quality

Overhead-when-disabled: excellent (cached-boolean early return). Memory: bounded (1000-cap ring buffers). Production safety: good (flag-gated, inert, tagged for removal, 46 tests unaffected). Weaknesses: **timestamp consistency** (mixes `Date.now()` + `performance.timeOrigin`; non-monotonic on resume), **no cross-dataset IDs** (all cross-links temporal), **no listener/observer teardown**.

## Final assessment

- **Completeness: ~60%** (reliable: lock/storm/lifecycle; unreliable: network sub-hypotheses). With the 3 essential fixes → ~85% (residual gap intrinsic — precise socket/GOAWAY evidence lives only in NetLog).
- **Essential diagnostic fixes (only these):**
  1. **TAO-aware correlation** — add `taoRestricted` heuristic (`isAuth && responseEnd>0 && all phase fields 0`); stop emitting smoking-gun H1 from zeroed fields; base the network finding on `responseEnd===0` vs `duration`.
  2. **Record requests at start, patch on settle** — real in-flight visibility + live `outstanding*Requests`.
  3. **`performance.now()` for durations** — survive resume clock jumps.
  - Optional: cookie-token-vs-event compare (H2), orphan-holder finding (H3), tab id (multi-tab).
- **Ready for capture?** Partially. Ready for lock-contention / storm / lifecycle today; will **mislabel** the networking families until B1/B2 are fixed or every capture is paired with `chrome://net-export`.

## Open items for reviewer (updated)

- [x] Apply the 3 essential diagnostic fixes → **DONE in Phase 4.1**
- [ ] Confirm TAO absence with the one-line console check above (still worth a 5s check)
- [ ] Accept that dead-socket/GOAWAY ground truth requires NetLog regardless of tool fixes

---
---

# Phase 4.1 — Forensics Hardening (2026-07-19)

The three review-blocking correctness fixes. Not a feature expansion; no new datasets; no auth behavior change. Verified: `tsc` clean, **63/63 tests**, `eslint` clean.

## Changes

1. **In-flight request records** — `recordRequestAttempt` (settle-only) → `recordRequestStart()` (record at start, `inFlight:true`, stable id) + `recordRequestSettle(id,…)` (patch same record). `auth-timing.ts` calls start before `await`, settle in both branches. A mid-stall report now shows the hanging request; `outstanding*Requests` are real (were dead-0). Closes B2.
2. **Monotonic clock** — `nowMono()` (`performance.now()`) for every `at`/`waitMs`/`holdMs`/`durationMs`; `nowWall()` kept for display; report carries `timeOrigin` (`wall = timeOrigin + at`). Resource `startedAt = entry.startTime` (same base) → single-clock request↔resource matching. Survives sleep/resume clock jumps. Closes B3, partially B5.
3. **TAO-aware correlation** — `deriveResourceMetrics` detects `taoRestricted` (all phase markers 0 + empty `nextHopProtocol`), sets `reused:null`, `protocol:''`, adds `responseEndMs`. `correlate()` never infers a phase from zeroed cross-origin fields. `Finding.severity(info|suspicious|smoking-gun)` → `Finding.confidence(definitive|strong|suggestive|insufficient)` + optional `recommend` (NetLog). Closes B1 (the false-positive H1).

## Confidence per rule (post-fix)

| Rule | Confidence |
|---|---|
| timeout / no resource entry | Insufficient (+NetLog) |
| timeout / TAO, no completion | Strong — transport stall, PHASE NOT OBSERVABLE (+NetLog) |
| timeout / TAO, completed | Suggestive (inconclusive, +NetLog) |
| timeout / same-origin, no first byte | Strong (H1, +NetLog) |
| timeout / same-origin, slow connect | Strong (H5/H4) |
| timeout / same-origin, slow TTFB | Suggestive (H7) |
| request in-flight at capture | Suggestive (+NetLog) |
| lock-timeout WITH in-flight request | Strong (H1) |
| lock-timeout WITHOUT request | Strong (H3/H2) |
| lifecycle → timeout | Suggestive (H5) |
| refresh storm | Strong (H2) |

**Validation:** no rule emits `definitive` — reserved because browser data alone cannot prove a transport root cause. Networking caps at `strong`; unavailable-data cases are `insufficient` or explicitly "PHASE NOT OBSERVABLE" + NetLog. Enforced by the `noDefinitive` test assertion across TAO / no-entry / dead-socket / lock cases.

## Remaining limits (external tools required)

- Transport phase + dead-socket/GOAWAY ground truth → **NetLog** (`chrome://net-export`). TAO blocks browser phase timing for `*.supabase.co`; GOAWAY is never in the DOM.
- Cross-tab storm (Family A) → per-tab store; needs multi-tab capture merge.
- SSR/server `Set-Cookie` desync → server telemetry.
- Hard lock↔request linkage → still temporal (`caller` is the partial aid).

Deliberately unaddressed per "only these three changes": B4, B6–B10.
