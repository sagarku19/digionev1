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

> ⚠️ The 15s ceiling is only real because of `bindLockAcquireTimeout` — see the next
> section. Setting `auth.lockAcquireTimeout` alone does **nothing** on the installed SDK.

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

## The option that never arrived — `lockAcquireTimeout` is dropped by supabase-js (fixed 2026-07-19, Phase 5)

For most of the timeline above, the "15s ceiling" **was dead config**. `client.ts` set
`auth.lockAcquireTimeout = 15000`, TypeScript accepted it, but at runtime the client
kept using auth-js's **5000ms** default. Proof from a real console:

```
@supabase/gotrue-js: Lock "lock:sb-…-auth-token" acquisition timed out after 5000ms.
```

That 5000 < the 12s fetch abort — exactly the "guarantee-of-crash" the 15s value was
supposed to remove. So the lock-ceiling fix appeared to work (fewer stalls by luck)
but never actually took effect.

**Why the option vanished** — traced through the installed packages:

| Layer | File:line | Behaviour |
|---|---|---|
| our client | `lib/supabase/client.ts` | passes `auth: { lock, lockAcquireTimeout: 15000 }` ✅ |
| `@supabase/ssr@0.9.0` | `createBrowserClient.js:34` | spreads `...options?.auth` → both forwarded ✅ |
| `@supabase/supabase-js@2.99.2` | `dist/index.cjs:499` | `_initSupabaseAuthClient({ …, lock, debug, throwOnError })` — a **fixed destructuring allowlist**; `lock` is in it, **`lockAcquireTimeout` is not** → rebuilt options object (`:504-519`) omits it ❌ **dropped here** |
| `@supabase/auth-js@2.99.2` | `GoTrueClient.js:28,104,134` | `settings = { ...DEFAULT_OPTIONS, ...options }`; option now `undefined` → `this.lockAcquireTimeout = 5000` (default) |
| `@supabase/auth-js@2.99.2` | `locks.js:262-266` | `processLock` fires its timer at 5000 and logs the message above |

**The fix (smallest possible, no `node_modules` patch):** the `lock` *function* IS
forwarded, and GoTrueClient calls it as `lock(name, this.lockAcquireTimeout, fn)`. So
`bindLockAcquireTimeout` (`lib/supabase/auth-timing.ts`) wraps `processLock` to ignore
the 5000 GoTrueClient passes in and substitute `LOCK_ACQUIRE_TIMEOUT_MS` (15000).
`client.ts` still also passes `auth.lockAcquireTimeout` for forward-compat — if a
future supabase-js starts forwarding it, the override becomes a harmless no-op.

**Verify it's active (browser):** reproduce a stall (return after long idle, or the
Cashfree → `/payment/status` redirect) and read the console — the message must now say
**`after 15000ms`**, not `5000ms`. The number in that message is the exact value
GoTrueClient handed to the lock, so `15000ms` proves the option reached the running
client. Regression-tested in `auth-timing.test.ts` (`bindLockAcquireTimeout` suite +
the `CANARY` that constructs a real supabase-js client and asserts the raw option is
still dropped — it will fail loudly if a future upgrade forwards it).

**This fix removes ONE contributing factor** (Family B: single-tab stall → lock
acquire-timeout crash). It does **not** address the transport stall that starts the
12s hold, nor the multi-tab/multi-account refresh replay storm (Family A). Those
remain open — see the investigation doc's Phase 5 "Remaining issues".

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
| 07-19 (Phase 5) | **the 15s value never reached the client — supabase-js dropped the option; runtime stayed 5s** | `bindLockAcquireTimeout` binds the ceiling into the forwarded `lock` fn; canary + regression tests |

The 07-19 entries are the durable fix: earlier rounds protected individual callers
(whack-a-mole); aligning the timing invariant removes the guarantee-of-crash for ALL
waiters at once — but only after Phase 5 made the aligned value actually take effect.

## Verification (2026-07-19)

- Auth suite green (`npx vitest run lib/supabase/` → 68/68 as of Phase 5).
- `tsc` clean. Correction to the earlier note here: the documented cast in `client.ts`
  only satisfies the **compiler** — at runtime `@supabase/supabase-js@2.99.2` drops
  `lockAcquireTimeout` entirely (see the "option that never arrived" section above).
  The value is enforced by `bindLockAcquireTimeout`, not by the option/cast.
- HTTP smoke against the running app: `/login` 200, `/dashboard` without session →
  307 `/login?returnUrl=…`, `/api/media/list` without session → 401, public pages 200.
- What only a human/browser can still observe: absence of overlay errors across a
  real stall episode (they occur randomly). If one appears, use its stack trace —
  the class-level causes documented here are eliminated.
