---
noteId: "9d08a8d082e811f187d6a9233bc04df8"
tags: []

---

# Auth timeouts & the per-tab lock — what those dev-overlay errors mean and how they were fixed

Written 2026-07-19 after the second `ProcessLockAcquireTimeoutError` report. Read this
when the Next.js dev overlay shows **"Supabase request timed out"** or **"Acquiring
process lock … timed out"**, before changing any auth timing code.

---

## The one-paragraph version

On this machine, requests to Supabase sometimes **stall on a dead socket** (typical
after sleep/resume, a redirect, or a network switch — a dev-environment quirk, not a
Supabase outage). Our client aborts such a request after 12s. While a stalled auth
request is in flight it holds the **per-tab auth lock** that every other auth
operation — and every data query, which fetches its access token via `getSession()` —
must wait for. Until 2026-07-19 the lock wait ceiling (5s) was **shorter** than the
stall abort (12s), so during any single stall every waiter was mathematically
guaranteed to throw. That inconsistency is fixed: waiters now wait up to 15s, riding
out a single stall; the remaining error surfaces are wrapped.

---

## The two errors, decoded

### 1. `Console TimeoutError: Supabase request timed out`

- **What it is:** OUR own 12s abort firing on a genuinely stalled fetch, logged by
  auth-js's internal `console.error` (fetch.js), which the Next dev overlay promotes
  into an error card. **It is telemetry, not a crash** — the abort is the fix
  working: it frees the socket and the lock so a retry can open a fresh connection.
- **When you'll still see it:** when a request stalls on BOTH attempts (idempotent
  GETs are auto-retried once on a fresh connection and usually self-heal silently),
  or on a stalled POST (refresh/sign-in — those have their own safe retry paths).
- **What to do:** nothing, unless it appears repeatedly within a minute — that means
  the network path to Supabase is genuinely broken at that moment.

### 2. `Runtime Error: Acquiring process lock with name "lock:sb-…-auth-token" timed out`

- **What it is:** some code waited for the per-tab auth lock longer than the acquire
  timeout and threw `ProcessLockAcquireTimeoutError`, and nothing caught it.
- **Why it happened even in incognito:** it has nothing to do with cookies or stale
  state. Any single stalled request holding the lock 12s + a 5s wait ceiling =
  every concurrent waiter throws. Incognito changes nothing about that math.
- **Status: fixed 2026-07-19** (see below). If it EVER reappears, the thrower is a
  new unprotected lock-taker — click the overlay's stack trace, find the call site,
  and wrap it like the sign-out handlers in `TopBar.tsx` / `MarketingNav.tsx`.

---

## The timing architecture (single source of truth: `lib/supabase/auth-timing.ts`)

| Constant | Value | Meaning |
|---|---|---|
| `AUTH_FETCH_TIMEOUT_MS` | 12s | Abort bound for `/auth/v1/*` requests (dead-socket breaker) |
| `DATA_FETCH_TIMEOUT_MS` | 20s | Abort bound for data requests |
| `LOCK_ACQUIRE_TIMEOUT_MS` | 15s | How long any lock waiter waits before throwing |
| `AUTHJS_REFRESH_RETRY_CEILING_MS` | 30s | auth-js's own cap on a refresh retry loop (upstream, mirrored) |

**The invariant (regression-tested in `auth-timing.test.ts`):**

```
AUTH_FETCH_TIMEOUT_MS (12s)  <  LOCK_ACQUIRE_TIMEOUT_MS (15s)  <  RETRY_CEILING (30s)
```

- Lock waiters must outlast a **single** stall (12s) → no throw in the common case.
- Lock waiters must NOT outlast the **worst-case** hold (~30s, a refresh retrying
  under the lock) → the rare double-stall still times out instead of freezing the
  tab, and those paths degrade gracefully via `lib/supabase/current-user.ts`.

Who takes the lock: `getSession()` (called internally by **every browser data
query** to fetch the access token), `getUser()`, `signOut()`, `setSession()`,
`refreshSession()`, auth-js's own refresh/recovery. Who is protected against the
residual timeout: `getCurrentUser()` (single-flight + retry + degrade), the
session-adoption guard (skip + retry), sign-out handlers (catch + local sign-out +
navigate), TanStack queryFns (rejections become query errors, never overlays).

---

## Timeline of causes and fixes (full history: memory `signin-timeout-saga`, todo-later 19)

| Date | Problem | Fix |
|---|---|---|
| 07-12 | navigator.locks deadlock in dev | per-tab `processLock` |
| 07-13 | `signInWithPassword` stalls forever | 12s fetch abort wrapper |
| 07-17 | lock waiters crash (5s < 12s, first sighting) | `getCurrentUser()` single-flight + degrade; 11 call sites migrated |
| 07-18 | transient null read as logout | tri-state auth (`degraded` never logs out) |
| 07-18 | 13s refresh replay storm | session-adoption guard (`auth-repair.ts`) |
| 07-19 | guard's `setSession` threw on busy lock (unhandled) | lock-timeout → quiet skip + retry; persist-first ordering |
| 07-19 | **root inconsistency: 5s wait < 12s hold** | `LOCK_ACQUIRE_TIMEOUT_MS = 15s` + invariant test; sign-out handlers hardened |

The 07-19 entries are the durable fix: earlier rounds protected individual callers
(whack-a-mole); aligning the timing invariant removes the guarantee-of-crash for
ALL waiters at once.

## Verification (2026-07-19)

- 337/337 unit tests (fake-timer simulations of stall/abort/retry/lock cases).
- `tsc` clean — note: `@supabase/ssr`'s narrowed auth-options type omits
  `lockAcquireTimeout`; `client.ts` forwards it with a documented cast (auth-js
  declares and reads the option — verified in the installed package).
- HTTP smoke against the running app: `/login` 200, `/dashboard` without session →
  307 `/login?returnUrl=…`, `/api/media/list` without session → 401, public pages 200.
- What only a human/browser can still observe: absence of overlay errors across a
  real stall episode (they occur randomly). If one appears, use its stack trace —
  the class-level causes documented here are eliminated.
