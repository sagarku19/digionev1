---
noteId: "d80538e081e911f1a3b34f18ce8d8fe6"
tags: []

---

# Supabase Auth Lock-Timeout Resilience — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the `Acquiring process lock with name "lock:sb-…-auth-token" timed out` runtime crash by reducing browser auth-lock contention and recovering gracefully when the lock can't be acquired during a network stall — without falsely aborting legitimately slow requests.

**Architecture:** Three cooperating layers on the Supabase **browser** client, keeping the per-tab `processLock` (no cross-tab token-rotation risk): (1) single-flight `getCurrentUser()` collapses concurrent `getUser()` callers onto one in-flight request; (2) it recovers from a `ProcessLockAcquireTimeoutError` by retrying once and then degrading to the last-known user instead of throwing; (3) a per-endpoint fetch-timeout wrapper bounds dead-socket hangs (auth 12s, data 20s) so the stalled request aborts and frees the lock, while staying generous enough that slow-but-valid requests are never aborted. `lockAcquireTimeout` stays at the auth-js default (5s) — recovery, not a longer freeze, absorbs the stall.

**Tech Stack:** TypeScript (strict), `@supabase/ssr` `createBrowserClient`, `@supabase/auth-js` `processLock`, Vitest 4 (node env, fake timers), Next.js 16 App Router.

---

## Root cause (for the implementing engineer — assume zero context)

- The browser client (`lib/supabase/client.ts`) serializes every auth op (`getUser`/`getSession`/`refreshSession`/`signIn`) through a per-tab `processLock`.
- auth-js waits **5s** (`lockAcquireTimeout` default, `@supabase/auth-js/GoTrueClient.js:25`) to *acquire* that lock, then throws `ProcessLockAcquireTimeoutError` (`@supabase/auth-js/lib/locks.js:257`).
- The current fetch abort is **12s** (`client.ts:17`), and a stalled **refresh** retries with backoff for up to **~30s** (`AUTO_REFRESH_TICK_DURATION_MS = 30_000`, retry loop at `GoTrueClient.js:1990-2005`).
- So a single stalled auth fetch (dead pooled connection after a Cashfree redirect / sleep-resume / network switch) **holds the lock 12–30s**, while every other auth caller **gives up at 5s and throws** — uncaught → the Next.js error overlay. Heavy concurrency (13 simultaneous `getUser()` observed in server logs on `/payment/status`) amplifies it and can even breach 5s cumulatively with no stall at all.
- Server auth logs show every arriving request returns 200 — the stalled request never leaves the browser, confirming a **client-side** stall.

**Why not just tune timeouts:** raising `lockAcquireTimeout` above 30s = up to a 30s UI freeze; lowering the auth fetch timeout below 5s falsely aborts slow-network auth *and* still loses to the 30s refresh-retry loop. Recovery + dedup is required.

**Alternatives considered & rejected:**
- Raise `lockAcquireTimeout` > 30s — unacceptable freeze.
- Lower auth fetch timeout < 5s — false-aborts legit slow-network auth; doesn't beat the 30s retry ceiling.
- Revert to `navigatorLock` (auth-js 2.99.2 self-heals via lock *stealing*) — self-recovers, but a stolen lock lets two refreshes run concurrently → refresh-token rotation race → spurious "randomly logged out". Kept as a documented fallback, not chosen.

---

## File Structure

| File | Responsibility | New/Modify |
|---|---|---|
| `lib/supabase/auth-timing.ts` | Pure: endpoint detection + per-request fetch-timeout selection + the timeout constants (regression-guarded) + `makeFetchWithTimeout`. | Create |
| `lib/supabase/auth-timing.test.ts` | Unit tests for the above (fake timers, injected fetch). | Create |
| `lib/supabase/current-user.ts` | Single-flight + lock-recovery wrapper: `createSingleFlight`, `resolveCurrentUser`, `getCurrentUser`. | Create |
| `lib/supabase/current-user.test.ts` | Unit tests for dedup + recovery + cached fallback. | Create |
| `lib/supabase/client.ts` | Wire `makeFetchWithTimeout()` into `global.fetch`; keep `processLock`; update comment. | Modify |
| ~12 browser call sites | Swap `supabase.auth.getUser()` → `getCurrentUser()`. | Modify |
| `.claude/todo-later/17(left)-2026-07-17-auth-refresh-cadence.md` | Capture the ~13s refresh-cadence follow-up (diagnostic, not code). | Create |

---

## Task 1: Pure fetch-timeout helper (`auth-timing.ts`)

**Files:**
- Create: `lib/supabase/auth-timing.ts`
- Test: `lib/supabase/auth-timing.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/supabase/auth-timing.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isAuthEndpoint,
  resolveRequestUrl,
  timeoutForUrl,
  makeFetchWithTimeout,
  AUTH_FETCH_TIMEOUT_MS,
  DATA_FETCH_TIMEOUT_MS,
  AUTHJS_REFRESH_RETRY_CEILING_MS,
} from './auth-timing';

describe('auth-timing: classification', () => {
  it('detects /auth/v1/ endpoints', () => {
    expect(isAuthEndpoint('https://x.supabase.co/auth/v1/token?grant_type=password')).toBe(true);
    expect(isAuthEndpoint('https://x.supabase.co/auth/v1/user')).toBe(true);
    expect(isAuthEndpoint('https://x.supabase.co/rest/v1/orders')).toBe(false);
    expect(isAuthEndpoint('https://x.supabase.co/storage/v1/object/public/a.png')).toBe(false);
  });

  it('resolves url from string, URL and Request inputs', () => {
    expect(resolveRequestUrl('https://x/auth/v1/user')).toBe('https://x/auth/v1/user');
    expect(resolveRequestUrl(new URL('https://x/auth/v1/user'))).toBe('https://x/auth/v1/user');
    expect(resolveRequestUrl(new Request('https://x/rest/v1/orders'))).toBe('https://x/rest/v1/orders');
  });

  it('picks the auth timeout for auth urls and data timeout otherwise', () => {
    expect(timeoutForUrl('https://x/auth/v1/token')).toBe(AUTH_FETCH_TIMEOUT_MS);
    expect(timeoutForUrl('https://x/rest/v1/orders')).toBe(DATA_FETCH_TIMEOUT_MS);
  });

  it('REGRESSION GUARD: auth timeout stays below the auth-js 30s refresh-retry ceiling and ordering holds', () => {
    expect(AUTH_FETCH_TIMEOUT_MS).toBeGreaterThan(0);
    expect(AUTH_FETCH_TIMEOUT_MS).toBeLessThan(AUTHJS_REFRESH_RETRY_CEILING_MS);
    expect(DATA_FETCH_TIMEOUT_MS).toBeGreaterThanOrEqual(AUTH_FETCH_TIMEOUT_MS);
  });
});

describe('auth-timing: makeFetchWithTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function hangingFetch() {
    // Never resolves on its own; only rejects when its signal aborts.
    return vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_res, rej) => {
        init?.signal?.addEventListener('abort', () =>
          rej((init.signal as AbortSignal).reason ?? new Error('aborted')),
        );
      }),
    );
  }

  it('aborts an AUTH request at 12s (still pending at 11.999s)', async () => {
    const wrapped = makeFetchWithTimeout(hangingFetch());
    const p = wrapped('https://x/auth/v1/user');
    const rejected = vi.fn();
    p.catch(rejected);

    await vi.advanceTimersByTimeAsync(AUTH_FETCH_TIMEOUT_MS - 1);
    expect(rejected).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await expect(p).rejects.toBeTruthy();
  });

  it('gives DATA requests the longer 20s budget (still pending at 12.001s)', async () => {
    const wrapped = makeFetchWithTimeout(hangingFetch());
    const p = wrapped('https://x/rest/v1/orders');
    const rejected = vi.fn();
    p.catch(rejected);

    await vi.advanceTimersByTimeAsync(AUTH_FETCH_TIMEOUT_MS + 1);
    expect(rejected).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DATA_FETCH_TIMEOUT_MS - AUTH_FETCH_TIMEOUT_MS);
    await expect(p).rejects.toBeTruthy();
  });

  it('SLOW-BUT-VALID: an auth request that resolves at 3s is NOT aborted', async () => {
    const slowFetch = vi.fn((_i: RequestInfo | URL, _init?: RequestInit) =>
      new Promise<Response>((res) => setTimeout(() => res(new Response('ok')), 3_000)),
    );
    const wrapped = makeFetchWithTimeout(slowFetch);
    const p = wrapped('https://x/auth/v1/token');

    await vi.advanceTimersByTimeAsync(3_000);
    const res = await p;
    expect(res.ok).toBe(true);
  });

  it('honours a caller-supplied abort signal', async () => {
    const wrapped = makeFetchWithTimeout(hangingFetch());
    const caller = new AbortController();
    const p = wrapped('https://x/auth/v1/user', { signal: caller.signal });
    caller.abort(new Error('caller cancelled'));
    await expect(p).rejects.toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/supabase/auth-timing.test.ts`
Expected: FAIL — `Cannot find module './auth-timing'`.

- [ ] **Step 3: Write the implementation**

Create `lib/supabase/auth-timing.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/supabase/auth-timing.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/auth-timing.ts lib/supabase/auth-timing.test.ts
git commit -m "feat(auth): per-endpoint fetch timeouts for the supabase browser client"
```

---

## Task 2: Single-flight + lock recovery (`current-user.ts`)

**Files:**
- Create: `lib/supabase/current-user.ts`
- Test: `lib/supabase/current-user.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/supabase/current-user.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { User } from '@supabase/supabase-js';
import {
  createSingleFlight,
  resolveCurrentUser,
  __resetCurrentUserCacheForTests,
} from './current-user';

const USER_A = { id: 'a', email: 'a@x.com' } as unknown as User;
const USER_B = { id: 'b', email: 'b@x.com' } as unknown as User;
const lockTimeout = () => Object.assign(new Error('Acquiring process lock ... timed out'), { isAcquireTimeout: true });

describe('createSingleFlight', () => {
  it('collapses concurrent callers onto ONE underlying call', async () => {
    let resolve!: (u: User) => void;
    const underlying = vi.fn(() => new Promise<User>((r) => { resolve = r; }));
    const sf = createSingleFlight(underlying);

    const p1 = sf(); const p2 = sf(); const p3 = sf();
    expect(underlying).toHaveBeenCalledTimes(1);

    resolve(USER_A);
    expect(await Promise.all([p1, p2, p3])).toEqual([USER_A, USER_A, USER_A]);
  });

  it('runs the underlying call again after the in-flight settles', async () => {
    const underlying = vi.fn().mockResolvedValueOnce(USER_A).mockResolvedValueOnce(USER_B);
    const sf = createSingleFlight(underlying);
    expect(await sf()).toEqual(USER_A);
    expect(await sf()).toEqual(USER_B);
    expect(underlying).toHaveBeenCalledTimes(2);
  });
});

describe('resolveCurrentUser (recovery)', () => {
  beforeEach(() => { vi.useFakeTimers(); __resetCurrentUserCacheForTests(); });
  afterEach(() => vi.useRealTimers());

  it('returns the user on the happy path', async () => {
    expect(await resolveCurrentUser(vi.fn().mockResolvedValue(USER_A))).toEqual(USER_A);
  });

  it('retries once on a lock-acquire timeout, then succeeds', async () => {
    const getUser = vi.fn().mockRejectedValueOnce(lockTimeout()).mockResolvedValueOnce(USER_A);
    const p = resolveCurrentUser(getUser);
    await vi.runAllTimersAsync();
    expect(await p).toEqual(USER_A);
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it('degrades to the last-known user when the lock stays stuck', async () => {
    const getUser = vi.fn()
      .mockResolvedValueOnce(USER_A)                  // seed cache
      .mockRejectedValue(lockTimeout());              // then always time out
    expect(await resolveCurrentUser(getUser)).toEqual(USER_A);

    const p = resolveCurrentUser(getUser);
    await vi.runAllTimersAsync();
    expect(await p).toEqual(USER_A);                  // cached fallback, no throw
  });

  it('returns null (no crash) when it times out with no cached user', async () => {
    const getUser = vi.fn().mockRejectedValue(lockTimeout());
    const p = resolveCurrentUser(getUser);
    await vi.runAllTimersAsync();
    expect(await p).toBeNull();
  });

  it('does NOT swallow non-lock errors', async () => {
    const getUser = vi.fn().mockRejectedValue(new Error('invalid refresh token'));
    await expect(resolveCurrentUser(getUser)).rejects.toThrow('invalid refresh token');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/supabase/current-user.test.ts`
Expected: FAIL — `Cannot find module './current-user'`.

- [ ] **Step 3: Write the implementation**

Create `lib/supabase/current-user.ts`:

```ts
// lib/supabase/current-user.ts
// Single-flight + lock-recovery wrapper around supabase.auth.getUser() for the browser.
// Collapses concurrent callers onto one in-flight request (the "13 concurrent getUser"
// amplifier) and degrades to the last-known user instead of crashing when the per-tab
// auth lock can't be acquired (ProcessLockAcquireTimeoutError) during a network stall.

import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

type GetUser = () => Promise<User | null>;

const RECOVERY_RETRY_DELAY_MS = 800;

let lastKnownUser: User | null = null;

function isLockAcquireTimeout(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    (err as { isAcquireTimeout?: boolean }).isAcquireTimeout === true
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function createSingleFlight<T>(fn: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;
  return () => {
    if (inFlight) return inFlight;
    inFlight = fn().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}

// Pure orchestration over an injected getUser (unit-tested directly).
export async function resolveCurrentUser(getUser: GetUser): Promise<User | null> {
  try {
    lastKnownUser = await getUser();
    return lastKnownUser;
  } catch (err) {
    if (!isLockAcquireTimeout(err)) throw err;
    await delay(RECOVERY_RETRY_DELAY_MS);
    try {
      lastKnownUser = await getUser();
      return lastKnownUser;
    } catch (err2) {
      if (!isLockAcquireTimeout(err2)) throw err2;
      return lastKnownUser; // degrade to cached identity; never crash the tree
    }
  }
}

export const getCurrentUser = createSingleFlight<User | null>(() =>
  resolveCurrentUser(async () => {
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  }),
);

export function __resetCurrentUserCacheForTests(): void {
  lastKnownUser = null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/supabase/current-user.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/current-user.ts lib/supabase/current-user.test.ts
git commit -m "feat(auth): single-flight getCurrentUser with lock-timeout recovery"
```

---

## Task 3: Wire the fetch wrapper into the browser client

**Files:**
- Modify: `lib/supabase/client.ts`

- [ ] **Step 1: Replace the inline fetch wrapper**

Replace the entire body of `lib/supabase/client.ts` with:

```ts
// lib/supabase/client.ts
// Supabase browser client — safe to use in Client Components.
// DB tables touched: depends on usage (read-only via RLS).

import { createBrowserClient } from '@supabase/ssr';
import { processLock } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { makeFetchWithTimeout } from '@/lib/supabase/auth-timing';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Per-endpoint fetch timeouts (auth 12s / data 20s). A stalled request on a dead
      // pooled connection (typical after a redirect, sleep/resume or network switch)
      // otherwise pins the per-tab auth lock; aborting frees it so a retry can open a
      // fresh connection. See lib/supabase/auth-timing.ts.
      global: { fetch: makeFetchWithTimeout() },
      // In-memory processLock (per-tab) instead of auth-js's origin-wide navigator.locks,
      // which deadlocked in dev. Cross-tab auth state is synced via onAuthStateChange +
      // BroadcastChannel (MarketingNav / useAuthSession). lockAcquireTimeout stays at the
      // 5s default — recovery in lib/supabase/current-user.ts absorbs a stall rather than
      // a longer freeze.
      auth: { lock: processLock },
    },
  );
}

export const supabase = createClient();
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from `lib/supabase/client.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/client.ts
git commit -m "refactor(auth): use makeFetchWithTimeout in the supabase browser client"
```

---

## Task 4: Route browser `getUser()` callers through `getCurrentUser()`

Only **browser-client** callers (those importing the `supabase` singleton / `createClient` from `@/lib/supabase/client`). Do **not** touch `/api/*` route handlers or any file using a server/cookie/service client — those have their own per-request lock and are unaffected.

**Files (verify each imports the browser client before editing):**
- Modify: `src/lib/getCreatorProfileId.ts:11`
- Modify: `src/hooks/creator/useCreator.ts:16`
- Modify: `src/hooks/sites/useSites.ts:47`
- Modify: `src/hooks/marketing/useMarketingStats.ts:29`
- Modify: `src/hooks/marketing/useGuestLeads.ts:9`
- Modify: `src/hooks/commerce/useLibrary.ts:51`
- Modify: `src/hooks/site-editor/saveDesignTokens.ts:28`
- Modify: `src/hooks/auth/useAuthSession.ts:29`
- Modify: `src/components/marketing/MarketingNav.tsx:64`
- Modify: `src/components/account/LibraryAccountActions.tsx:47`
- Modify: `app/account/profile/page.tsx:68`

> `refreshSession()` calls (`LibraryAccountActions.tsx:67`, `app/account/profile/page.tsx:142`) and the pre-auth `getUser()` in `app/(auth)/login/page.tsx` + `app/(auth)/reset-password/page.tsx` are **out of scope** — they are singular, user-initiated, low-contention. Leave them.

- [ ] **Step 1: Confirm the caller set**

Run: `npx vitest --version` (sanity) then verify the list:
Run (PowerShell): `Select-String -Path src/**/*.ts,src/**/*.tsx,app/**/*.tsx -Pattern "supabase.auth.getUser\(\)"`
Expected: the files above (browser client). Cross-check each file's Supabase import is `@/lib/supabase/client`.

- [ ] **Step 2: Apply the swap in each file (one representative shown; repeat verbatim per file)**

In each file, add the import (grouped with other `@/lib` imports):

```ts
import { getCurrentUser } from '@/lib/supabase/current-user';
```

…and replace the destructured call. For example, in `src/hooks/creator/useCreator.ts`:

```ts
// before
const { data: { user } } = await supabase.auth.getUser();
// after
const user = await getCurrentUser();
```

For `useAuthSession.ts:29` (inside a `Promise.all([...])`):

```ts
// before
supabase.auth.getUser().then(({ data }) => data.user),
// after
getCurrentUser(),
```

Downstream code already guards `if (!user) …`, so the `User | null` return is compatible. Do not otherwise change control flow.

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit`
Run: `npm run lint`
Expected: zero new errors. If a file no longer references `supabase` after the swap, remove the now-unused `supabase` import to satisfy `no-unused-vars`.

- [ ] **Step 4: Run the full unit suite (no regressions)**

Run: `npm run test`
Expected: PASS, including the new `auth-timing` + `current-user` suites.

- [ ] **Step 5: Commit**

```bash
git add src app
git commit -m "refactor(auth): route browser getUser callers through getCurrentUser (dedup + recovery)"
```

---

## Task 5: Manual verification gauntlet (the "all test cases + slow network" checklist)

No code. Run against `npm run dev` (kill stale node first). Record pass/fail for each.

- [ ] **A — Fast-network happy path.** Load `/dashboard`, `/dashboard/integrations`, `/payment/status`. DevTools Network filtered to `auth/v1/user`: at most **one** `GET /auth/v1/user` per page (dedup working). No console/overlay error.
- [ ] **B — Slow network (legit).** DevTools → Network → **Slow 3G**. Log in, navigate dashboard. Auth requests complete (may be slow), **no false abort**, no crash. Confirms the 12s auth budget doesn't kill slow-but-valid requests.
- [ ] **C — Dead-socket stall (the bug).** Land on `/payment/status`, then DevTools → Network → **Offline** for ~6–8s, then back **Online**. Expected: **no red overlay, no `ProcessLockAcquireTimeoutError`**; UI shows cached identity during the stall and recovers. This is the core regression check.
- [ ] **D — Cashfree sandbox round-trip.** Complete a sandbox payment; return to `/payment/status`. No lock error on return.
- [ ] **E — Sleep/resume or network switch.** Toggle wifi off/on (or sleep the machine briefly), refocus the tab. The visibility-triggered refresh recovers; no crash.
- [ ] **F — Cross-tab safety.** Open two tabs logged in as the same creator. Trigger a refresh in one (wait or force). The other tab is **not** logged out (confirms we kept `processLock` and did not adopt lock-stealing).
- [ ] **G — Build + lint + tests.** Run: `npm run build` → success. `npm run lint` → clean. `npm run test` → green.

- [ ] **Commit (docs/notes only, if any QA notes are captured).**

```bash
git add docs
git commit -m "docs(auth): verification notes for lock-timeout resilience"
```

---

## Task 6: Log the refresh-cadence follow-up (diagnostic, not a code fix)

The server logs showed browser `POST /auth/v1/token?grant_type=refresh_token` roughly **every ~13s**. With `EXPIRY_MARGIN_MS = 90s` a healthy single client should refresh ~hourly, so this is anomalous and increases lock-contention frequency. It is **not** required for the crash fix but should be chased next.

**Files:**
- Create: `.claude/todo-later/17(left)-2026-07-17-auth-refresh-cadence.md`

- [ ] **Step 1: Write the follow-up note**

```markdown
# Auth refresh cadence anomaly (browser refreshes ~every 13s)

Observed 2026-07-17 in Supabase auth logs on /payment/status: browser (Chrome UA)
`POST /auth/v1/token?grant_type=refresh_token` roughly every 13s, all 200. Expected
~hourly given EXPIRY_MARGIN_MS = 90s and AUTO_REFRESH_TICK_DURATION_MS = 30s.

Not the cause of the process-lock crash (fixed via dedup + recovery + per-endpoint fetch
timeouts, plan 2026-07-17-supabase-auth-lock-timeout-resilience.md) but it multiplies
lock-acquisition frequency, so worth closing.

Hypotheses to test (add temporary client instrumentation: log each getUser/refresh with
timestamp + lock-acquire wait + hold duration; enable auth-js lock debug via
localStorage['supabase.gotrue-js.locks.debug'] = 'true'):
1. Short project JWT expiry (Supabase → Auth → Sessions → Access token TTL). If TTL is
   low (e.g. 60–120s), auto-refresh fires far more often. Fix = raise TTL.
2. Abort-driven retry storm: a stalled refresh aborts (AuthRetryableFetchError) and the
   auto-refresh tick re-attempts on the next tick. The dead-socket abort at 12s (this
   plan) should reduce it; re-measure after the fix ships.
3. The /payment/status reconciliation poll re-triggering session validation. Confirm the
   poll interval and whether each cycle forces a refresh.

Read before touching browser auth timers or the payment-status poll.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/todo-later/17\(left\)-2026-07-17-auth-refresh-cadence.md
git commit -m "docs(todo): capture the ~13s browser refresh-cadence follow-up"
```

---

## Self-Review

**Spec coverage:**
- Root cause (5s acquire vs 12–30s hold) → Tasks 1–4 remove the crash via dedup + recovery, and Task 1 documents/guards the timeout ordering.
- "Check all test cases" → Task 1 (classification, timeout selection, abort timing, caller-signal), Task 2 (dedup, retry-once, cached fallback, first-load null, non-lock passthrough), Task 4 Step 4 (full suite), Task 5 (A–G manual).
- "Slow network" → Task 1 "slow-but-valid" unit test (3s auth request not aborted) + Task 5B (Slow 3G) + Task 5C (offline/dead-socket recovery). Auth timeout kept generous (12s) precisely so slow-but-valid requests survive.
- No cross-tab regression → `processLock` retained (Task 3) + Task 5F.

**Placeholder scan:** none — every code/step is concrete.

**Type consistency:** `getCurrentUser(): Promise<User | null>`, `resolveCurrentUser(getUser)`, `createSingleFlight<T>` used identically across Tasks 2 and 4; `makeFetchWithTimeout()` signature identical in Tasks 1 and 3; constant names (`AUTH_FETCH_TIMEOUT_MS`, `DATA_FETCH_TIMEOUT_MS`, `AUTHJS_REFRESH_RETRY_CEILING_MS`) consistent between module and tests.

**Risk notes:** (1) `AbortSignal.any` requires Node ≥ 20.3 / modern Chrome — satisfied (Node 20.19, evergreen browsers). (2) The cached-fallback returns a possibly-stale user id for RLS-scoped reads — acceptable because the server re-validates every request; the next successful `getUser` refreshes the cache. (3) If auth-js internal refresh retries hold the lock the full ~30s, a waiter still hits recovery (retry → cached fallback), never the overlay.
