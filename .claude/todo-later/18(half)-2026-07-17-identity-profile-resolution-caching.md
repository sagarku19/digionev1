---
noteId: "b621e66081fd11f1a3b34f18ce8d8fe6"
tags: []

---

# Identity / profile-id resolution is re-fetched by every hook (not cached)

**Status:** Option A SHIPPED 2026-07-18 (`getCreatorProfileId` memoized per verified
`user.id` + concurrent dedup, 7 unit tests, `src/lib/getCreatorProfileId.ts`). Remaining:
(1) manual log verification — restart `npm run dev`, browse dashboards, confirm the
`auth/v1/user` + `users→profiles` calls drop to ~1/session; (2) optional Option B
(TanStack-query identity) only if identity becomes broader shared state.
**Found:** 2026-07-17, while reviewing Supabase logs after the processLock-timeout fix.

## The finding

`getCreatorProfileId()` (`src/lib/getCreatorProfileId.ts`) resolves the current creator's
`profiles.id` by doing TWO network calls every time:
1. `getCurrentUser()` → `GET /auth/v1/user`
2. `GET /rest/v1/users?select=id,profiles(id)&auth_provider_id=eq.<authUid>`

It is called **inline inside the queryFn of ~23 dashboard hooks** (not as its own cached
query), so every hook re-resolves identity from scratch on mount/refetch. Opening one
dashboard page fires this pair several times; navigating fires it again per page.

**Evidence (Supabase logs, 21:19–21:20 on 2026-07-17):** the same
`GET /auth/v1/user` and `GET /rest/v1/users?select=id,profiles(id)&auth_provider_id=eq.…`
repeat 10+ times per minute of ordinary browsing. All 200 — pure redundancy, not errors.

Callers (23, via grep `getCreatorProfileId`):
`useSites`, `useMarketingStats`, `useCreator`, `useOrderEarnings`, `useStatements`,
`useInvoices`, `useInstaAutomations`, `useShortLinks`, `useTax`, `useEarnings`,
`useOrders`, `useSubscription`, `useKycDocuments`, `useProducts`, `useReferrals`,
`useNotifications`, `useCustomers`, `useAffiliates`, `useAnalytics`, `useCoupons`,
`useAbTests`, `useServices`, `useCommunity` (+ the helper itself).

## Why it matters

Redundant GoTrue + PostgREST load that grows linearly per active user — the "scale-risk #2"
from the 2026-07-17 auth work (see [[signin-timeout-saga]] chapter 3 and
`docs/superpowers/plans/2026-07-17-supabase-auth-lock-timeout-resilience.md`). The new
`getCurrentUser()` single-flight (`lib/supabase/current-user.ts`) only collapses
*concurrent* `getUser()` calls in one tick; it does NOT help sequential re-resolution
across navigation, and it does NOT cache the `users→profiles` query at all.

Not fixed by this (out of scope, separate): the **server-side** (`node` UA)
`/auth/v1/user` + `users`/`profiles` calls in route handlers / SSR are per-request by
design and unaffected by any client cache.

## Recommended fix (pick one)

**Option A (minimal, ~15 lines — preferred): memoize in `getCreatorProfileId`.**
- Keep three module-level pieces: `cachedUserId`, `cachedProfileId`, `inFlightPromise`
  (sequential cache + concurrent dedup in one place; same pattern as `lastKnownUser` /
  `createSingleFlight` in `lib/supabase/current-user.ts`).
- Flow: `await getCurrentUser()` (keeps JWT verification) → if `cachedUserId === user.id`
  return `cachedProfileId` → else if `inFlightPromise` await it → else resolve
  `users→profiles`, store `{ cachedUserId, cachedProfileId }` **on success only**, and
  clear `inFlightPromise` in a `finally`.
- **Invalidation = key on the verified `user.id`.** That is the complete correctness
  invariant: `profiles.id` is immutable for a given `user.id`, so a different `user.id` is
  a cache miss and re-resolves. A `SIGNED_OUT` listener is OPTIONAL memory cleanup (the
  helper throws on a null user before reading the cache anyway) — not load-bearing.
- **Do NOT clear on `TOKEN_REFRESHED`** — `user.id` is unchanged across refresh and
  refreshes are frequent (see todo `19` — cadence resolved as healthy); clearing re-runs the `users→profiles` query
  every refresh and defeats the optimization. **Do NOT clear on `USER_UPDATED`** —
  `profiles.id`/`user.id` don't change there. **No time-based TTL** — the `user.id` key is
  the invalidation; a TTL only re-adds churn.
- **Never cache failures / transient null.** On a 500/network error or a `getCurrentUser()`
  null (e.g. its degraded lock-timeout fallback), do not populate the cache; the `finally`
  that nulls `inFlightPromise` keeps the lookup retryable so an error can't become sticky.
- Result: ~10+ round-trips/min → ~1 per session, across all 23 hooks, no hook refactor.

**Option B (idiomatic, larger): a cached `useCreatorProfileId()` TanStack query.**
- One query key e.g. `['creator','profile-id']` with a long `staleTime`; the 23 hooks
  depend on it (`enabled: !!profileId`) instead of calling `getCreatorProfileId()` inline.
- Cleaner cache semantics but touches all 23 hooks — bigger change / review.

## Security (no compromise IF built as below)

- **Verified current-user-only:** `getCreatorProfileId()` is parameterless
  (`getCreatorProfileId.ts:9`) — it can only ever resolve the *current* authenticated
  creator (`getCurrentUser()` → `users.auth_provider_id = user.id`). No call path passes an
  arbitrary creator, so keying the cache on the auth `user.id` is sufficient. (Admin
  cross-creator lookups go through server `/api/admin/*` routes, not this helper.)
- `profileId` is a **filter, not a credential**. Authorization is enforced server-side by
  **RLS + JWT on every query** — caching the id does not change that boundary.
- Worst case of a stale module cache (User A logs out → User B logs in in the SAME tab
  without a reload) is a **wrong/empty result, not a cross-user leak**: B's JWT can't read
  A's rows, RLS denies. So invalidation is a *correctness* requirement, not the security
  guarantee. **Mandatory:** key the cache on the verified auth `user.id` and re-resolve on
  change; clear on `onAuthStateChange` `SIGNED_OUT`.
- **Keep the JWT check.** `getCreatorProfileId.ts:10-11` deliberately uses
  `getCurrentUser()` (network-verified `getUser`) not `getSession()` (local, unverified).
  Build Option A as "cache only the `users→profiles` DB lookup, keyed by the verified
  `user.id`, still call `getCurrentUser()` each time" — do NOT skip `getUser` based on a
  stale cached identity. This preserves today's security posture exactly.

## Verify after implementing
- Restart `npm run dev` (the browser `supabase` singleton is built at import — a running
  dev server won't pick up client changes without a restart).
- Browse several dashboard pages; confirm `GET /auth/v1/user` and the
  `users?...profiles(id)...` query drop to ~once per session in Supabase logs.
- `npm run test` green.

Read before touching `getCreatorProfileId` or dashboard identity resolution.
