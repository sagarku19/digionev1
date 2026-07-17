---
noteId: "ef4464f0821f11f1a3b34f18ce8d8fe6"
tags: []

---

# Auth Reliability — Tri-State Client Auth Design

**Date:** 2026-07-18 · **Status:** approved · **Follows:** commits `63d3d1a` (processLock recovery), `1617510` (profileId memoization)

## Problem

The browser auth layer treats auth as binary (logged-in / logged-out). The third real state — *temporarily unreachable* — keeps being misclassified, producing five recurring symptoms:

1. ~~`processLock` acquire-timeout crash~~ (fixed, `63d3d1a`).
2. **Open bug:** `getUser()` never throws on network failure — it *resolves* `{ data: { user: null }, error: AuthRetryableFetchError }` (`auth-js GoTrueClient.js:1461-1472`, `fetch.js:93-96`). `getCurrentUser()` reads only `data.user`, so a 12s-aborted request ≡ "signed out" → hooks throw `Not logged in` on a healthy session. It also overwrites `lastKnownUser` with the transient null, so the degraded fallback never fires for network errors.
3. "Could not reach the sign-in server" surfaces on every sign-in stall with no automatic retry.
4. ~13s browser refresh cadence (todo 17) multiplies auth traffic ~275×, multiplying every stall window. Undiagnosed.
5. New requirement: a **genuinely** signed-out user on `/dashboard/**` must be redirected to `/login`. Unsafe to build until (2) is fixed — today a stall is indistinguishable from logout and would eject live users.

`proxy.ts:65-102` already gates initial navigations server-side. The client gap is only session-death-while-open and cross-tab sign-out.

## Design

### 1. Tri-state auth snapshot (`lib/supabase/current-user.ts`, reworked)

```
AuthStatus = 'authenticated' | 'unauthenticated' | 'degraded'
AuthSnapshot = { status: AuthStatus; user: User | null }
```

`getAuthSnapshot()` (single-flight) calls `supabase.auth.getUser()` and classifies:

| Outcome of `getUser()` | Classification |
|---|---|
| `data.user` present | `authenticated` (cache user) |
| throws lock-acquire timeout (`isAcquireTimeout`) | retry once after 800ms; still failing → `degraded` |
| `error` is `AuthRetryableFetchError` (abort / network / 502-504) | `degraded` immediately (fetch already waited ≤12s) |
| `error` is `AuthUnknownError` (garbled response) | `degraded` |
| `error` is `AuthApiError` with status 429 or ≥500 | `degraded` (rate-limit / server error is not a logout) |
| `error` is `AuthSessionMissingError`, or no error and no user | `unauthenticated` (clear cached user) |
| any other `AuthError` (server rejected the token) | `unauthenticated` |
| unexpected non-auth throw | rethrow (programming errors stay loud) |

`degraded` returns `user = lastKnownUser` and **never clobbers the cache**. A lazy, once-only `onAuthStateChange` subscription keeps the cache fresh for free (`SIGNED_OUT` → clear; `SIGNED_IN`/`TOKEN_REFRESHED`/`USER_UPDATED` → update from the event session) and feeds the debug log. `getCurrentUser(): Promise<User | null>` stays as a compat façade (`snapshot.user`) so the 11 migrated call sites don't change.

Classification and resolution are pure, dependency-injected functions (`classifyAuthOutcome`, `resolveAuthSnapshot`) so the whole table is unit-testable.

### 2. Identity resolution (`src/lib/getCreatorProfileId.ts`)

New error classes in `lib/supabase/auth-errors.ts`: `NotLoggedInError` (message stays `'Not logged in'`) and `AuthUnavailableError` (`retryable = true`).

| Snapshot | Behavior |
|---|---|
| `authenticated` | as today — memoized per `user.id`, single-flight |
| `degraded`, cached profileId for that user | return the cache (UI keeps working through the stall) |
| `degraded`, no cache | throw `AuthUnavailableError` — TanStack's retry/backoff self-heals; no DB query on a possibly-stale identity over a broken network |
| `unauthenticated` | throw `NotLoggedInError` — fail fast, the guard owns the redirect |

QueryClient default `retry` is updated globally: never retry `NotLoggedInError` (pointless auth traffic), keep 3× backoff otherwise. `refetchOnReconnect` (TanStack default, on) is the reconnect-recovery path — no bespoke `online` listener.

### 3. Session state + dashboard guard

`useAuthSession` is reworked on `getAuthSnapshot()`:
- The 10s race-to-null (`useAuthSession.ts:29-32`) is **deleted** — it was a false-logout generator. The snapshot always settles (fetch aborts at 12s).
- `AuthSessionData` gains `authStatus: AuthStatus`.
- `degraded` + known user → `isLoggedIn: true`, skip the profile join (no 20s hang over a dead network; profile may be briefly null).
- `unauthenticated` → logged-out data as today.

New `src/components/dashboard/AuthGuard.tsx`, mounted in `app/dashboard/layout.tsx`:
- Redirects `router.replace('/login?returnUrl=' + pathname)` **only** when `authStatus === 'unauthenticated'` and not loading. `degraded`/loading render normally — a network blip can never eject a user.
- Owns its own `onAuthStateChange` → invalidate `['auth','session']` subscription. (MarketingNav's subscription does this on marketing pages, but MarketingNav is not mounted on the dashboard — without this, cross-tab sign-out wouldn't reach the guard for up to `staleTime`.)
- Decision logic is a pure exported function (`shouldRedirectToLogin(status, isLoading)`) for tests.

### 4. Sign-in auto-retry (`useLoginMutation`)

On `AuthRetryableFetchError`: wait ~1s, retry once automatically (fresh connection), only then surface the friendly error. Most stall sightings become invisible recoveries. Attempt logic extracted with an injectable sign-in function for testing.

### 5. Refresh-cadence diagnosis kit (todo 17)

Dev-only `lib/supabase/auth-debug.ts`, enabled by `localStorage['digione.auth.debug'] = '1'`:
- `auth-timing.ts` logs every `/auth/v1/*` request (path, grant_type, duration, status/aborted) when enabled.
- The snapshot module logs auth events with `expires_at` / `expires_in`.
- Ring buffer (200 entries) + `window.__authDebug()` dump. Gated `console.info` — the sanctioned exception to the no-console rule.

Diagnosis procedure (recorded in todo 17): read `expires_in` + the Supabase dashboard JWT-TTL setting. Short TTL → raise it (config, no code). TTL fine but `expires_at` not advancing → cookie-persistence bug. Neither → hunt the extra refresh loop (multi-tab is expected; leaked clients are not).

### 6. Phase 2 — server-side scale (separate spec, not in this build)

Migrate `proxy.ts` + server-component auth from network `getUser()` to local `getClaims()` JWT verification (requires enabling asymmetric signing keys); `React.cache()` per-request dedup (kills the 13× `getUser` fan-out per `/payment/status` render); auth rate-limit budget review. Prerequisite: cadence data from §5.

## Testing

- Classification table test — every row above.
- Degraded never clobbers the cached user; lock-timeout retries once; network abort does not double-wait.
- `getCreatorProfileId` four paths (authenticated / degraded-cached / degraded-uncached / unauthenticated).
- `shouldRedirectToLogin` truth table.
- Sign-in retry-once with injected sign-in fn.
- Existing 22 auth tests keep passing (compat façade preserved).
- Manual: DevTools offline→online on dashboard (no redirect, self-heals); Slow-3G sign-in; sign-out in tab B → tab A redirects to `/login`.

## Out of scope

`/account` guard (reuses `AuthGuard` later), Option B TanStack identity centralization, Phase 2 server work, fixing the cadence itself (diagnosis first — the fix depends on the data).
