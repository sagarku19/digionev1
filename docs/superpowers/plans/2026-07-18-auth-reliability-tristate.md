---
noteId: "9b3210f0822011f1a3b34f18ce8d8fe6"
tags: []

---

# Auth Reliability — Tri-State Client Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Classify browser auth outcomes into `authenticated | unauthenticated | degraded`, so transient network stalls stop masquerading as logout (the open `Not logged in` bug), the dashboard safely redirects genuinely signed-out users to `/login`, sign-in auto-retries one stall, and a dev telemetry flag makes the ~13s refresh cadence diagnosable.

**Spec:** `docs/superpowers/specs/2026-07-18-auth-reliability-design.md` (approved). Read it for the why; this plan is the how.

**Architecture:** A pure classification core (`classifyAuthOutcome` + `resolveAuthSnapshot`, dependency-injected) inside `lib/supabase/current-user.ts`, consumed by a `getAuthSnapshot()` single-flight; `getCurrentUser()` survives as a compat façade. `getCreatorProfileId` and `useAuthSession` become status-aware; a new `<AuthGuard>` owns the redirect; `useLoginMutation` gains one auto-retry; `lib/supabase/auth-debug.ts` is the flag-gated telemetry sink fed by `auth-timing.ts` and the auth-event listener.

**Tech Stack:** TypeScript strict, `@supabase/ssr`/`auth-js` 2.99.2, TanStack Query v5, Vitest 4 (node env), Next.js 16 App Router.

**Commit policy (user-directed):** NO per-task commits. All edits land as ONE commit after full verification (vitest + tsc + eslint + `npm run build`).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `lib/supabase/auth-errors.ts` | Create | `NotLoggedInError`, `AuthUnavailableError` |
| `lib/supabase/auth-debug.ts` | Create | Flag-gated telemetry: ring buffer, request/event log, `window.__authDebug()` |
| `lib/supabase/auth-debug.test.ts` | Create | `describeAuthUrl` + disabled-in-node |
| `lib/supabase/auth-timing.ts` | Modify | Log `/auth/v1/*` request outcomes when debug enabled |
| `lib/supabase/current-user.ts` | Rework | Tri-state: `classifyAuthOutcome`, `resolveAuthSnapshot`, `getAuthSnapshot`, `getCurrentUser` façade, auth-event subscription |
| `lib/supabase/current-user.test.ts` | Rework | Classification table + resolution behaviors (keep `createSingleFlight` suite) |
| `src/lib/getCreatorProfileId.ts` | Modify | Status-aware: degraded-cached / degraded-uncached / unauthenticated paths |
| `src/lib/getCreatorProfileId.test.ts` | Modify | Snapshot-based deps; four-path coverage |
| `src/hooks/auth/useAuthSession.ts` | Modify | Snapshot-based queryFn (race deleted), `authStatus` field, `signInWithRetry` |
| `src/hooks/auth/useAuthSession.test.ts` | Create | `signInWithRetry` retry-once semantics |
| `src/components/dashboard/AuthGuard.tsx` | Create | Redirect on definitive logout only + auth-event query invalidation |
| `src/components/dashboard/AuthGuard.test.ts` | Create | `shouldRedirectToLogin` truth table |
| `app/dashboard/layout.tsx` | Modify | Mount `<AuthGuard>` |
| `app/providers.tsx` | Modify | Global query `retry`: skip `NotLoggedInError` |
| `.claude/rules/hooks-reference.md` | Modify | `useAuthSession` return shape row |
| `docs/reference/dashboard-map.md` | Modify | Shell note: layout mounts `AuthGuard` |
| `.claude/todo-later/17(left)-…-auth-refresh-cadence.md` | Modify | Record that the diagnosis kit shipped + usage |

---

## Task 1: Error classes — `lib/supabase/auth-errors.ts`

- [ ] **Step 1: Create the module** (no dedicated test; behavior covered by Tasks 4–6 tests)

```ts
// lib/supabase/auth-errors.ts
// Error vocabulary for the tri-state client auth layer. NotLoggedInError = the
// server definitively has no session (fail fast; AuthGuard owns the redirect).
// AuthUnavailableError = auth is temporarily unreachable (network stall / rate
// limit); marked retryable so TanStack Query's backoff self-heals it.

export class NotLoggedInError extends Error {
  readonly isNotLoggedIn = true;
  constructor() {
    super('Not logged in');
    this.name = 'NotLoggedInError';
  }
}

export class AuthUnavailableError extends Error {
  readonly retryable = true;
  constructor() {
    super('Auth temporarily unreachable — will retry');
    this.name = 'AuthUnavailableError';
  }
}
```

---

## Task 2: Telemetry sink — `lib/supabase/auth-debug.ts`

- [ ] **Step 1: Write the failing test** — `lib/supabase/auth-debug.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { describeAuthUrl, isAuthDebugEnabled } from './auth-debug';

describe('auth-debug', () => {
  it('describes auth urls as path + grant_type only (no tokens/PII)', () => {
    expect(describeAuthUrl('https://x.supabase.co/auth/v1/token?grant_type=refresh_token')).toBe(
      '/auth/v1/token?grant_type=refresh_token',
    );
    expect(describeAuthUrl('https://x.supabase.co/auth/v1/user')).toBe('/auth/v1/user');
    expect(describeAuthUrl('not a url')).toBe('not a url');
  });

  it('is disabled outside the browser', () => {
    expect(isAuthDebugEnabled()).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run lib/supabase/auth-debug.test.ts` → FAIL (module not found)

- [ ] **Step 3: Implement**

```ts
// lib/supabase/auth-debug.ts
// Dev-only auth telemetry, enabled via localStorage['digione.auth.debug'] = '1'.
// The sanctioned exception to the no-console rule: every line is gated by the
// flag, which cannot be set in production usage paths. Used to diagnose the
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
```

- [ ] **Step 4: Run** the test → PASS

---

## Task 3: Wire telemetry into the fetch wrapper — `lib/supabase/auth-timing.ts`

- [ ] **Step 1: Modify `makeFetchWithTimeout`** — replace the current try/finally body with:

```ts
import { isAuthDebugEnabled, logAuthRequest } from './auth-debug';
// (add to existing imports at top of file)

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
    const debug = isAuthDebugEnabled() && isAuthEndpoint(url);
    const startedAt = Date.now();
    try {
      const res = await baseFetch(input, { ...init, signal });
      if (debug) logAuthRequest(url, Date.now() - startedAt, `status ${res.status}`);
      return res;
    } catch (err) {
      if (debug) logAuthRequest(url, Date.now() - startedAt, err instanceof Error ? err.name || 'error' : 'error');
      throw err;
    } finally {
      clearTimeout(timer);
    }
  };
}
```

- [ ] **Step 2: Run** `npx vitest run lib/supabase/auth-timing.test.ts` → all 8 existing tests still PASS (debug is a no-op in node).

---

## Task 4: Tri-state core — rework `lib/supabase/current-user.ts`

- [ ] **Step 1: Rewrite the test file** — `lib/supabase/current-user.test.ts`. Keep the `createSingleFlight` suite verbatim; replace the `resolveCurrentUser` suite:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { User } from '@supabase/supabase-js';
import {
  createSingleFlight,
  classifyAuthOutcome,
  resolveAuthSnapshot,
  __resetCurrentUserCacheForTests,
} from './current-user';

const USER_A = { id: 'a', email: 'a@x.com' } as unknown as User;
const USER_B = { id: 'b', email: 'b@x.com' } as unknown as User;
const lockTimeout = () => Object.assign(new Error('Acquiring process lock ... timed out'), { isAcquireTimeout: true });
const authError = (name: string, status?: number) => ({ name, status, message: name });

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

describe('classifyAuthOutcome', () => {
  it('user present → authenticated', () => {
    expect(classifyAuthOutcome(USER_A, null)).toBe('authenticated');
  });
  it('no user, no error → unauthenticated', () => {
    expect(classifyAuthOutcome(null, null)).toBe('unauthenticated');
  });
  it('AuthSessionMissingError → unauthenticated (genuinely signed out)', () => {
    expect(classifyAuthOutcome(null, authError('AuthSessionMissingError', 400))).toBe('unauthenticated');
  });
  it('AuthRetryableFetchError (abort/network/5xx-gateway) → transient', () => {
    expect(classifyAuthOutcome(null, authError('AuthRetryableFetchError', 0))).toBe('transient');
  });
  it('AuthUnknownError (garbled response) → transient', () => {
    expect(classifyAuthOutcome(null, authError('AuthUnknownError'))).toBe('transient');
  });
  it('AuthApiError 429 (rate limit) → transient, NOT a logout', () => {
    expect(classifyAuthOutcome(null, authError('AuthApiError', 429))).toBe('transient');
  });
  it('AuthApiError 500 → transient', () => {
    expect(classifyAuthOutcome(null, authError('AuthApiError', 500))).toBe('transient');
  });
  it('AuthApiError 401/403 (server rejected token) → unauthenticated', () => {
    expect(classifyAuthOutcome(null, authError('AuthApiError', 401))).toBe('unauthenticated');
    expect(classifyAuthOutcome(null, authError('AuthApiError', 403))).toBe('unauthenticated');
  });
});

describe('resolveAuthSnapshot', () => {
  beforeEach(() => { vi.useFakeTimers(); __resetCurrentUserCacheForTests(); });
  afterEach(() => vi.useRealTimers());

  it('authenticated: returns and caches the user', async () => {
    const snap = await resolveAuthSnapshot(vi.fn().mockResolvedValue({ user: USER_A, error: null }));
    expect(snap).toEqual({ status: 'authenticated', user: USER_A });
  });

  it('transient error degrades WITHOUT clobbering the cached user', async () => {
    await resolveAuthSnapshot(vi.fn().mockResolvedValue({ user: USER_A, error: null }));
    const snap = await resolveAuthSnapshot(
      vi.fn().mockResolvedValue({ user: null, error: authError('AuthRetryableFetchError', 0) }),
    );
    expect(snap).toEqual({ status: 'degraded', user: USER_A });
    const again = await resolveAuthSnapshot(vi.fn().mockResolvedValue({ user: USER_A, error: null }));
    expect(again.status).toBe('authenticated');
  });

  it('transient error with no cached user degrades to null user (still not unauthenticated)', async () => {
    const snap = await resolveAuthSnapshot(
      vi.fn().mockResolvedValue({ user: null, error: authError('AuthRetryableFetchError', 0) }),
    );
    expect(snap).toEqual({ status: 'degraded', user: null });
  });

  it('unauthenticated clears the cached user', async () => {
    await resolveAuthSnapshot(vi.fn().mockResolvedValue({ user: USER_A, error: null }));
    await resolveAuthSnapshot(vi.fn().mockResolvedValue({ user: null, error: authError('AuthSessionMissingError') }));
    const snap = await resolveAuthSnapshot(
      vi.fn().mockResolvedValue({ user: null, error: authError('AuthRetryableFetchError', 0) }),
    );
    expect(snap.user).toBeNull();
  });

  it('lock-acquire timeout retries once then succeeds', async () => {
    const raw = vi.fn().mockRejectedValueOnce(lockTimeout()).mockResolvedValueOnce({ user: USER_A, error: null });
    const p = resolveAuthSnapshot(raw);
    await vi.runAllTimersAsync();
    expect(await p).toEqual({ status: 'authenticated', user: USER_A });
    expect(raw).toHaveBeenCalledTimes(2);
  });

  it('persistent lock timeout degrades to the cached user', async () => {
    await resolveAuthSnapshot(vi.fn().mockResolvedValue({ user: USER_A, error: null }));
    const raw = vi.fn().mockRejectedValue(lockTimeout());
    const p = resolveAuthSnapshot(raw);
    await vi.runAllTimersAsync();
    expect(await p).toEqual({ status: 'degraded', user: USER_A });
    expect(raw).toHaveBeenCalledTimes(2);
  });

  it('non-lock throws stay loud', async () => {
    await expect(resolveAuthSnapshot(vi.fn().mockRejectedValue(new Error('boom')))).rejects.toThrow('boom');
  });
});
```

- [ ] **Step 2: Run** → FAIL (`classifyAuthOutcome` not exported)

- [ ] **Step 3: Rewrite the module** — `lib/supabase/current-user.ts`:

```ts
// lib/supabase/current-user.ts
// Tri-state auth snapshot for the browser: authenticated | unauthenticated | degraded.
// auth-js getUser() RESOLVES with { user: null, error } on network failures
// (fetch.js wraps any fetch rejection in AuthRetryableFetchError; _getUser returns
// AuthErrors instead of throwing) — so "no user" alone must never be read as
// "signed out". classifyAuthOutcome encodes the distinction; degraded keeps the
// last-known user and never clobbers the cache. getCurrentUser() remains the
// compat façade for existing call sites. Design:
// docs/superpowers/specs/2026-07-18-auth-reliability-design.md

import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { logAuthEvent } from '@/lib/supabase/auth-debug';

export type AuthStatus = 'authenticated' | 'unauthenticated' | 'degraded';
export interface AuthSnapshot {
  status: AuthStatus;
  user: User | null;
}
export type AuthClassification = 'authenticated' | 'unauthenticated' | 'transient';

interface RawAuthOutcome {
  user: User | null;
  error: unknown;
}
type RawGetUser = () => Promise<RawAuthOutcome>;

const LOCK_RETRY_DELAY_MS = 800;

let lastKnownUser: User | null = null;

function isLockAcquireTimeout(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    (err as { isAcquireTimeout?: boolean }).isAcquireTimeout === true
  );
}

function errorName(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('name' in error)) return null;
  return String((error as { name: unknown }).name);
}

function errorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object' || !('status' in error)) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

export function classifyAuthOutcome(user: User | null, error: unknown): AuthClassification {
  if (user) return 'authenticated';
  if (!error) return 'unauthenticated';
  const name = errorName(error);
  if (name === 'AuthRetryableFetchError' || name === 'AuthUnknownError') return 'transient';
  const status = errorStatus(error);
  if (status === 429 || (status !== null && status >= 500)) return 'transient';
  return 'unauthenticated';
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

// Pure orchestration over an injected raw getUser outcome (unit-tested directly).
// Lock-acquire timeouts THROW out of getUser (they happen before _getUser runs)
// and fail fast (~5s), so they get one retry; network errors arrive in the
// error field having already burned the 12s fetch budget, so they degrade
// immediately.
export async function resolveAuthSnapshot(rawGetUser: RawGetUser): Promise<AuthSnapshot> {
  let outcome: RawAuthOutcome;
  try {
    outcome = await rawGetUser();
  } catch (err) {
    if (!isLockAcquireTimeout(err)) throw err;
    await delay(LOCK_RETRY_DELAY_MS);
    try {
      outcome = await rawGetUser();
    } catch (err2) {
      if (!isLockAcquireTimeout(err2)) throw err2;
      return { status: 'degraded', user: lastKnownUser };
    }
  }
  const classification = classifyAuthOutcome(outcome.user, outcome.error);
  if (classification === 'authenticated') {
    lastKnownUser = outcome.user;
    return { status: 'authenticated', user: outcome.user };
  }
  if (classification === 'unauthenticated') {
    lastKnownUser = null;
    return { status: 'unauthenticated', user: null };
  }
  return { status: 'degraded', user: lastKnownUser };
}

// Keeps the cache fresh for free (refresh/sign-in events carry the user) and
// clears it on definitive sign-out. Lazy so tests importing pure functions
// never touch the real client.
let authEventsSubscribed = false;
function ensureAuthEventSubscription(): void {
  if (authEventsSubscribed || typeof window === 'undefined') return;
  authEventsSubscribed = true;
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      lastKnownUser = null;
    } else if (session?.user) {
      lastKnownUser = session.user;
    }
    logAuthEvent(event, session?.expires_at ?? null);
  });
}

export const getAuthSnapshot: () => Promise<AuthSnapshot> = createSingleFlight<AuthSnapshot>(() => {
  ensureAuthEventSubscription();
  return resolveAuthSnapshot(async () => {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user ?? null, error };
  });
});

export async function getCurrentUser(): Promise<User | null> {
  return (await getAuthSnapshot()).user;
}

export function __resetCurrentUserCacheForTests(): void {
  lastKnownUser = null;
}
```

- [ ] **Step 4: Run** `npx vitest run lib/supabase/current-user.test.ts` → PASS (17 tests)

---

## Task 5: Status-aware identity — `src/lib/getCreatorProfileId.ts`

- [ ] **Step 1: Rewrite the test file** — `src/lib/getCreatorProfileId.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { createProfileIdResolver } from './getCreatorProfileId';
import { AuthUnavailableError, NotLoggedInError } from '@/lib/supabase/auth-errors';
import type { AuthSnapshot } from '@/lib/supabase/current-user';

const authed = (id: string): AuthSnapshot => ({ status: 'authenticated', user: { id } as AuthSnapshot['user'] });
const degraded = (id: string | null): AuthSnapshot => ({
  status: 'degraded',
  user: id ? ({ id } as AuthSnapshot['user']) : null,
});
const signedOut: AuthSnapshot = { status: 'unauthenticated', user: null };

describe('createProfileIdResolver', () => {
  it('resolves and returns the profile id', async () => {
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValue(authed('auth-a')),
      fetchProfileId: vi.fn().mockResolvedValue('profile-a'),
    });
    expect(await resolve()).toBe('profile-a');
  });

  it('caches a successful resolution — second call does not re-hit the DB', async () => {
    const fetchProfileId = vi.fn().mockResolvedValue('profile-a');
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValue(authed('auth-a')),
      fetchProfileId,
    });
    expect(await resolve()).toBe('profile-a');
    expect(await resolve()).toBe('profile-a');
    expect(fetchProfileId).toHaveBeenCalledTimes(1);
  });

  it('collapses concurrent callers onto ONE DB lookup', async () => {
    const fetchProfileId = vi.fn().mockResolvedValue('profile-a');
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValue(authed('auth-a')),
      fetchProfileId,
    });
    const results = await Promise.all([resolve(), resolve(), resolve()]);
    expect(results).toEqual(['profile-a', 'profile-a', 'profile-a']);
    expect(fetchProfileId).toHaveBeenCalledTimes(1);
  });

  it('re-resolves when the authenticated user changes (cache keyed on user.id)', async () => {
    const fetchProfileId = vi.fn(async (id: string) => (id === 'auth-a' ? 'profile-a' : 'profile-b'));
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValueOnce(authed('auth-a')).mockResolvedValueOnce(authed('auth-b')),
      fetchProfileId,
    });
    expect(await resolve()).toBe('profile-a');
    expect(await resolve()).toBe('profile-b');
    expect(fetchProfileId).toHaveBeenCalledTimes(2);
  });

  it('does NOT cache a failed lookup — a later call retries', async () => {
    const fetchProfileId = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('profile-a');
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValue(authed('auth-a')),
      fetchProfileId,
    });
    await expect(resolve()).rejects.toThrow('boom');
    expect(await resolve()).toBe('profile-a');
  });

  it('unauthenticated → NotLoggedInError, no DB hit', async () => {
    const fetchProfileId = vi.fn();
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValue(signedOut),
      fetchProfileId,
    });
    await expect(resolve()).rejects.toBeInstanceOf(NotLoggedInError);
    expect(fetchProfileId).not.toHaveBeenCalled();
  });

  it('degraded WITH a cached id → returns the cache (UI survives the stall)', async () => {
    const fetchProfileId = vi.fn().mockResolvedValue('profile-a');
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValueOnce(authed('auth-a')).mockResolvedValueOnce(degraded('auth-a')),
      fetchProfileId,
    });
    expect(await resolve()).toBe('profile-a');
    expect(await resolve()).toBe('profile-a');
    expect(fetchProfileId).toHaveBeenCalledTimes(1);
  });

  it('degraded WITHOUT a cache → AuthUnavailableError (retryable), no DB hit', async () => {
    const fetchProfileId = vi.fn();
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValue(degraded('auth-a')),
      fetchProfileId,
    });
    await expect(resolve()).rejects.toBeInstanceOf(AuthUnavailableError);
    expect(fetchProfileId).not.toHaveBeenCalled();
  });

  it('degraded with NO known user → AuthUnavailableError, not NotLoggedInError', async () => {
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValue(degraded(null)),
      fetchProfileId: vi.fn(),
    });
    await expect(resolve()).rejects.toBeInstanceOf(AuthUnavailableError);
  });

  it('does not return a stale cached id after the user logs out', async () => {
    const resolve = createProfileIdResolver({
      getSnapshot: vi.fn().mockResolvedValueOnce(authed('auth-a')).mockResolvedValueOnce(signedOut),
      fetchProfileId: vi.fn().mockResolvedValue('profile-a'),
    });
    expect(await resolve()).toBe('profile-a');
    await expect(resolve()).rejects.toBeInstanceOf(NotLoggedInError);
  });
});
```

- [ ] **Step 2: Run** → FAIL (deps shape changed)

- [ ] **Step 3: Modify the module** — `src/lib/getCreatorProfileId.ts` (keep `fetchProfileIdFromDb` exactly as it is; replace the resolver + wiring):

```ts
// Shared helper to resolve the profiles.id for the current Supabase auth user.
// Uses: users (auth_provider_id → id) → profiles (user_id → id)
// DB tables: users, profiles (read only)
//
// Memoized per verified auth user.id with concurrent dedup. Status-aware
// (tri-state snapshot): degraded auth serves the cached id when present, throws
// retryable AuthUnavailableError when not (TanStack backoff self-heals);
// unauthenticated throws NotLoggedInError (AuthGuard owns the redirect). See
// docs/superpowers/specs/2026-07-18-auth-reliability-design.md and
// .claude/todo-later/18(half)-2026-07-17-identity-profile-resolution-caching.md
"use client";

import { supabase } from '@/lib/supabase/client';
import { getAuthSnapshot, type AuthSnapshot } from '@/lib/supabase/current-user';
import { AuthUnavailableError, NotLoggedInError } from '@/lib/supabase/auth-errors';

interface ProfileIdDeps {
  getSnapshot: () => Promise<AuthSnapshot>;
  fetchProfileId: (authUserId: string) => Promise<string>;
}

export function createProfileIdResolver(deps: ProfileIdDeps): () => Promise<string> {
  let cachedUserId: string | null = null;
  let cachedProfileId: string | null = null;
  let inFlightUserId: string | null = null;
  let inFlight: Promise<string> | null = null;

  return async () => {
    const snapshot = await deps.getSnapshot();
    if (!snapshot.user) {
      // degraded-with-no-known-user is a stall, not a logout — stay retryable.
      throw snapshot.status === 'degraded' ? new AuthUnavailableError() : new NotLoggedInError();
    }
    const authUserId = snapshot.user.id;
    if (cachedUserId === authUserId && cachedProfileId) return cachedProfileId;
    if (snapshot.status === 'degraded') {
      // No cache to serve and the identity may be stale — don't query on it.
      throw new AuthUnavailableError();
    }
    if (inFlight && inFlightUserId === authUserId) return inFlight;

    inFlightUserId = authUserId;
    inFlight = deps
      .fetchProfileId(authUserId)
      .then((profileId) => {
        cachedUserId = authUserId;
        cachedProfileId = profileId;
        return profileId;
      })
      .finally(() => {
        inFlight = null;
        inFlightUserId = null;
      });
    return inFlight;
  };
}

/* fetchProfileIdFromDb — UNCHANGED, keep the existing function body */

export const getCreatorProfileId = createProfileIdResolver({
  getSnapshot: getAuthSnapshot,
  fetchProfileId: fetchProfileIdFromDb,
});
```

- [ ] **Step 4: Run** `npx vitest run src/lib/getCreatorProfileId.test.ts` → PASS (10 tests)

---

## Task 6: Session hook + sign-in retry — `src/hooks/auth/useAuthSession.ts`

- [ ] **Step 1: Write the failing test** — `src/hooks/auth/useAuthSession.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signInWithRetry } from './useAuthSession';

const retryable = { name: 'AuthRetryableFetchError', message: 'stalled' };
const wrongPassword = { name: 'AuthApiError', message: 'Invalid login credentials' };

describe('signInWithRetry', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the first result when it succeeds', async () => {
    const signIn = vi.fn().mockResolvedValue({ error: null });
    expect(await signInWithRetry(signIn)).toEqual({ error: null });
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('retries ONCE on a retryable network error', async () => {
    const signIn = vi.fn().mockResolvedValueOnce({ error: retryable }).mockResolvedValueOnce({ error: null });
    const p = signInWithRetry(signIn);
    await vi.runAllTimersAsync();
    expect(await p).toEqual({ error: null });
    expect(signIn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on a credentials error', async () => {
    const signIn = vi.fn().mockResolvedValue({ error: wrongPassword });
    expect(await signInWithRetry(signIn)).toEqual({ error: wrongPassword });
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('surfaces the second failure when the retry also stalls', async () => {
    const signIn = vi.fn().mockResolvedValue({ error: retryable });
    const p = signInWithRetry(signIn);
    await vi.runAllTimersAsync();
    expect(await p).toEqual({ error: retryable });
    expect(signIn).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run** → FAIL (`signInWithRetry` not exported)

- [ ] **Step 3: Rework the hook file.** Full new queryFn + retry helper; the rest of the file structure stays:

```ts
// (imports change: drop the direct getCurrentUser import, add:)
import { getAuthSnapshot, type AuthStatus } from '@/lib/supabase/current-user';

export interface AuthSessionData {
  isLoggedIn: boolean;
  userEmail: string | null;
  profile: { full_name: string | null; avatar_url: string | null } | null;
  userRole: string | null;
  authStatus: AuthStatus;
}

export function useAuthSession() {
  const query = useQuery({
    queryKey: ['auth', 'session'] as const,
    queryFn: async (): Promise<AuthSessionData> => {
      // The snapshot always settles (fetch aborts at 12s; lock retry is bounded)
      // and classifies stalls as 'degraded' — the old 10s race-to-null treated
      // slow auth as logged-out, which is exactly the false-logout bug.
      const snapshot = await getAuthSnapshot();
      if (!snapshot.user) {
        return { isLoggedIn: false, userEmail: null, profile: null, userRole: null, authStatus: snapshot.status };
      }
      const base = {
        isLoggedIn: true,
        userEmail: snapshot.user.email ?? null,
        userRole: (snapshot.user.app_metadata?.role as string) ?? null,
        authStatus: snapshot.status,
      };
      if (snapshot.status === 'degraded') {
        // Don't attempt the profile join over a network that just stalled.
        return { ...base, profile: null };
      }
      const { data } = await supabase
        .from('users')
        .select('id, profiles(full_name, avatar_url)')
        .eq('auth_provider_id', snapshot.user.id)
        .maybeSingle();

      const joined: unknown = data?.profiles;
      const raw = (Array.isArray(joined) ? joined[0] : joined) as
        | { full_name: string | null; avatar_url: string | null }
        | null
        | undefined;
      return {
        ...base,
        profile: raw ? { full_name: raw.full_name ?? null, avatar_url: raw.avatar_url ?? null } : null,
      };
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    isLoggedIn: query.data?.isLoggedIn ?? false,
    userEmail: query.data?.userEmail ?? null,
    profile: query.data?.profile ?? null,
    userRole: query.data?.userRole ?? null,
    // No data (still loading, or the query errored) means "unknown", which must
    // read as degraded — never as a definitive logout the guard would act on.
    authStatus: (query.data?.authStatus ?? 'degraded') as AuthStatus,
    isLoading: query.isLoading,
  };
}

// Retry-once wrapper for sign-in: a stalled fetch surfaces as
// AuthRetryableFetchError (never a thrown rejection), so one automatic retry on
// a fresh connection absorbs the common dead-socket case before the user sees
// an error. Injectable for tests.
export async function signInWithRetry<T extends { error: { name?: string } | null }>(
  signIn: () => Promise<T>,
  retryDelayMs = 1000,
): Promise<T> {
  const first = await signIn();
  if (first.error?.name !== 'AuthRetryableFetchError') return first;
  await new Promise((r) => setTimeout(r, retryDelayMs));
  return signIn();
}
```

And inside `useLoginMutation`, replace the single race with a per-attempt race fed through the retry wrapper:

```ts
    mutationFn: async ({ email, password }) => {
      const attempt = () =>
        Promise.race([
          supabase.auth.signInWithPassword({ email, password }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Sign-in timed out after 15s. Try again.')), 15_000),
          ),
        ]);

      const { data, error } = await signInWithRetry(attempt);
      if (error) {
        if (error.name === 'AuthRetryableFetchError') {
          throw new Error('Could not reach the sign-in server even after retrying — check your connection and try again.');
        }
        throw new Error(error.message || 'Invalid email or password.');
      }
      if (!data.user) throw new Error('Sign-in returned no user. Please try again.');
      return data.user;
    },
```

- [ ] **Step 4: Run** `npx vitest run src/hooks/auth/useAuthSession.test.ts` → PASS (4 tests)

---

## Task 7: Guard — `src/components/dashboard/AuthGuard.tsx` + layout mount

- [ ] **Step 1: Write the failing test** — `src/components/dashboard/AuthGuard.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { shouldRedirectToLogin } from './AuthGuard';

describe('shouldRedirectToLogin', () => {
  it('redirects only on a definitive logout after loading settles', () => {
    expect(shouldRedirectToLogin('unauthenticated', false)).toBe(true);
  });
  it('never redirects while loading', () => {
    expect(shouldRedirectToLogin('unauthenticated', true)).toBe(false);
  });
  it('never redirects on degraded (network stall must not eject a user)', () => {
    expect(shouldRedirectToLogin('degraded', false)).toBe(false);
  });
  it('never redirects when authenticated', () => {
    expect(shouldRedirectToLogin('authenticated', false)).toBe(false);
  });
});
```

- [ ] **Step 2: Run** → FAIL (module not found)

- [ ] **Step 3: Create the component**:

```tsx
'use client';
// Client-side auth boundary for /dashboard/**. proxy.ts gates initial
// navigations server-side; this covers session-death-while-open and cross-tab
// sign-out. Redirects ONLY on a definitive logout — degraded (stall) states
// render normally and self-heal via query retries + refetchOnReconnect.

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuthSession } from '@/hooks/auth/useAuthSession';
import type { AuthStatus } from '@/lib/supabase/current-user';

export function shouldRedirectToLogin(status: AuthStatus, isLoading: boolean): boolean {
  return !isLoading && status === 'unauthenticated';
}

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { authStatus, isLoading } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // MarketingNav owns this invalidation on marketing pages but is not mounted
  // on the dashboard — without it, cross-tab sign-out wouldn't reach this guard
  // until staleTime expires.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  useEffect(() => {
    if (shouldRedirectToLogin(authStatus, isLoading)) {
      router.replace(`/login?returnUrl=${encodeURIComponent(pathname ?? '/dashboard')}`);
    }
  }, [authStatus, isLoading, pathname, router]);

  return <>{children}</>;
}
```

- [ ] **Step 4: Mount in `app/dashboard/layout.tsx`** — add the import and wrap:

```tsx
import AuthGuard from '@/components/dashboard/AuthGuard';
// ...
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardThemeProvider>
      <AuthGuard>
        <DashboardShell>{children}</DashboardShell>
      </AuthGuard>
    </DashboardThemeProvider>
  );
}
```

- [ ] **Step 5: Run** `npx vitest run src/components/dashboard/AuthGuard.test.ts` → PASS (4 tests)

---

## Task 8: Global query retry — `app/providers.tsx`

- [ ] **Step 1: Modify** the QueryClient defaults:

```tsx
import { NotLoggedInError } from '@/lib/supabase/auth-errors';
// ...
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        // NotLoggedInError is definitive — retrying it just burns auth calls.
        // Everything else keeps the default 3× backoff (this is also what turns
        // AuthUnavailableError stalls into self-healing).
        retry: (failureCount, error) => !(error instanceof NotLoggedInError) && failureCount < 3,
      },
    },
  }));
```

---

## Task 9: Docs + todo sync (same change-set, per CLAUDE.md)

- [ ] **Step 1:** `.claude/rules/hooks-reference.md` — update the `useAuthSession()` row to `{ isLoggedIn, userEmail, profile, userRole, authStatus, isLoading }` and note: `authStatus: 'authenticated' | 'unauthenticated' | 'degraded'` — `degraded` = auth temporarily unreachable, never treated as logout.
- [ ] **Step 2:** `docs/reference/dashboard-map.md` — add a shell note under the header: layout mounts `AuthGuard` (client redirect to `/login?returnUrl=…` only on definitive logout).
- [ ] **Step 3:** `.claude/todo-later/19(half)-2026-07-17-auth-refresh-cadence.md` — record: diagnosis kit shipped (`lib/supabase/auth-debug.ts`, enable `localStorage['digione.auth.debug']='1'`, dump `window.__authDebug()`), and the decision tree from the spec §5.

---

## Task 10: Final verification, then ONE commit

- [ ] **Step 1:** `npx vitest run` → all suites green (expect ~275+ tests).
- [ ] **Step 2:** `npx tsc --noEmit` → clean.
- [ ] **Step 3:** `npx eslint` on every touched `.ts`/`.tsx` → no new errors.
- [ ] **Step 4:** `npm run build` → succeeds (layout + providers changed; build is the safety net).
- [ ] **Step 5:** Single commit of everything (code, tests, spec, plan, docs, todo).

## Self-Review

**Spec coverage:** §1→Task 4, §2→Tasks 1+5+8, §3→Tasks 6+7, §4→Task 6, §5→Tasks 2+3+9, testing section→Tasks 2–7 test steps + Task 10. Phase 2 (§6) intentionally has no task. **Placeholders:** none — every step has complete code (Task 5 marks `fetchProfileIdFromDb` as verbatim-unchanged, which is explicit, not a placeholder). **Type consistency:** `AuthStatus`/`AuthSnapshot` exported from `current-user.ts` and imported by `getCreatorProfileId.ts`, `useAuthSession.ts`, `AuthGuard.tsx`; `signInWithRetry<T extends { error: { name?: string } | null }>` matches both the test fakes and `signInWithPassword`'s response shape; `getAuthSnapshot` returns `Promise<AuthSnapshot>` everywhere it's consumed.
