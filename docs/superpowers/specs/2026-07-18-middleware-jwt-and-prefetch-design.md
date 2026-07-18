---
noteId: "a4b4f560828511f187d6a9233bc04df8"
tags: []

---

# Middleware local JWT verification + sidebar prefetch tuning — Design

**Date:** 2026-07-18
**Status:** Approved
**Related:** `.claude/todo-later/19(half)-2026-07-17-auth-refresh-cadence.md` (auth request-volume saga), `proxy.ts`, `.claude/rules/security-model.md`

## Problem

Every request to a guarded path (`/dashboard`, `/account`) runs `supabase.auth.getUser()` in the middleware (`proxy.ts:95`) — a network round-trip to `/auth/v1/user`. Next.js prefetches every visible sidebar/TopBar `<Link>` on dashboard load, and each prefetch passes through the middleware. Observed result: **~55 server-side `GET /auth/v1/user` calls in ~6 seconds** for a single dashboard visit (Supabase API logs, 2026-07-18 13:08).

The middleware only reads `user.app_metadata.role` — it needs authentication and the role claim, not fresh user data. Both are inside the JWT itself.

## Decisions (locked with user)

1. **Migrate the Supabase project to asymmetric JWT signing keys** (ES256), then verify tokens locally in middleware via `supabase.auth.getClaims()`. Rejected: importing the legacy HS256 secret as an env var (extra high-value secret, deprecated path); doing nothing.
2. **Expired token → network fallback.** Local verify first; only on failure fall back to the existing `getUser()` path (which refreshes the session and writes cookies). Rejected: redirect-to-login on any failure (bounces users holding valid refresh tokens); pass-through (server role gate stops working).
3. **Hover-gated prefetch for rarely used dashboard links**; common links keep default viewport prefetch. Rejected: flat `prefetch={false}` (loses hover preload); leaving prefetch untouched.

## Part A — One-time pre-step: asymmetric signing keys (manual, user)

Supabase Dashboard → Project Settings → JWT / Signing Keys → create a standby **ES256** key → **Rotate**.

- Verified 2026-07-18: the project's JWKS endpoint (`/auth/v1/.well-known/jwks.json`) is currently **empty** — the project is on the legacy HS256 shared secret. Migration is required before the middleware change ships; until then `getClaims()` falls back to a network call and nothing improves.
- After rotation, new access tokens are ES256-signed and locally verifiable against the public JWKS. Old HS256 tokens remain valid until expiry (≤1h transition window; `getClaims` transparently network-checks those).
- Nothing in this repo verifies JWTs with the legacy secret (audited: all server code uses Supabase clients that defer verification to the auth server), so no other consumers break.
- No env var changes.

## Part B — `proxy.ts` step 4: verify locally, network only on expiry

Replace the unconditional `getUser()` with:

1. Create the `@supabase/ssr` server client (unchanged construction, cookie adapters kept — the fallback path needs write-back).
2. Call **`supabase.auth.getClaims()`**. On an asymmetric token this verifies the signature locally via WebCrypto against the JWKS (fetched once per middleware instance, cached in-process). **Zero network for every live token**, including all prefetch requests.
3. **Valid claims** → run the role gates against `claims.app_metadata.role`:
   - `/dashboard/**` requires `creator` or `super_admin`, else redirect `/account/library`.
   - `/dashboard/admin/**` requires `super_admin`, else redirect `/dashboard`.
   - No cookie writes on this path; return `NextResponse.next()`-style response.
4. **Invalid / expired claims, or JWKS unavailable** → fallback: `supabase.auth.getUser()` (current behavior — refreshes via the refresh token, writes cookies back through the existing `setAll` adapter), then the same role gates on `user.app_metadata.role`. Fires ~once per user per token expiry (~1/hour), not per request.
5. **Both fail** → redirect `/login?returnUrl=…` (unchanged).

**Shared gate helper.** Extract the role-gate decision into a small pure function (claims-shaped input → `allow | redirect(target)`), used by both paths and unit-testable without a Supabase client. Location: `src/lib/shared/route-gate.ts` (consistent with `src/lib/shared/balance.ts`; pure function, edge-safe, no Node-only imports).

**Steps 0–3 of the middleware are untouched** (short-link host, custom-domain rewrite, unguarded fast path, no-cookie redirect).

### Accepted trade-offs (explicit)

- **Revocation lag ≤1h:** a banned/deleted user or revoked session passes the middleware until the access token expires. Defense-in-depth holds — every `/api/*` route still calls `getUser()` per request, and all data access is RLS-gated. The middleware gate is a router, not the security boundary.
- **Role staleness:** not a regression. The buyer→creator upgrade flow already calls `refreshSession()` after `/api/account/upgrade-to-creator`, minting a token with the new role immediately.

### Implementation notes (verified against installed auth-js, 2026-07-18)

- `getClaims()` returns `{ data: { claims, header, signature } | null, error }`; `claims` is `JwtPayload` with `app_metadata?: UserAppMetadata` — same type the current `getUser()` path reads.
- **Finding:** `getClaims()` with no jwt argument calls `getSession()` internally, which auto-refreshes an expired session (network + cookie write-back through the ssr adapter). So on expiry the refresh usually happens *inside* `getClaims()` and the explicit `getUser()` fallback rarely fires — it remains as the safety net for thrown errors/null claims. Net behavior matches the design: one network call per expiry, zero for live tokens.
- HS256 tokens (pre-rotation): `getClaims()` internally falls back to a `getUser()` network call — identical to old behavior, so shipping before key rotation is safe but improves nothing.
- JWKS fetch failures surface as auth errors (`{ data: null, error }`); the middleware additionally try/catches and falls back to `getUser()`.
- Middleware runs on the edge runtime — the gate helper (`src/lib/shared/route-gate.ts`) is a pure function with no Node-only imports.

## Part C — Sidebar/TopBar: hover-gated prefetch for rare links

Next.js App Router (verified against current docs): `prefetch={false}` disables prefetch entirely, including hover. The supported hover pattern is `prefetch={active ? undefined : false}` toggled by `onMouseEnter`.

Implement one `HoverPrefetchLink` behavior in the sidebar's existing shared link component (a `prefetchPolicy: 'default' | 'hover'` knob or equivalent) — one component change, not 20 per-link edits. TopBar menu links and quick actions reuse it.

**Hot — default viewport prefetch (unchanged):**
`/dashboard` (Overview), Products, My Sites, Orders, **Customers**, **Media**, Analytics, Earnings, **Auto DM**, **Short Links**.

**Rare — hover-prefetch only:**
Integrations, Community, Marketing + its 5 children (Coupons, Leads, Affiliates, Referrals, Services), Settings, Help Center, admin payouts, TopBar menu links (profile, billing, subscription, library), quick actions.

Mobile has no hover: rare links simply never prefetch there; tap navigates normally (acceptable — pages are thin client shells).

## Verification

1. Vitest unit tests for the role-gate helper: claims → allow/redirect matrix (creator, super_admin, buyer, missing role; `/dashboard`, `/dashboard/admin`, `/account`).
2. `npx tsc --noEmit`, `npm run lint`, `npm run build`.
3. Manual, against Supabase API logs:
   - Dashboard visit with a live token → **~0** `node`-UA `/auth/v1/user` calls (baseline today: ~55).
   - Idle past token expiry, then navigate → exactly **one** refresh/getUser, then quiet again.
   - Buyer account → `/dashboard` still redirects to `/account/library`; non-admin → `/dashboard/admin` still redirects to `/dashboard`.
   - Hover a rare sidebar link → prefetch request fires; a rare link never hovered → no request on page load.
4. Rollout order matters: **Part A (key rotation) first**, then deploy Parts B–C. Shipping B before A silently keeps the network path via `getClaims`' HS256 fallback.

## Docs to update in the same change-set

- `.claude/rules/security-model.md` — middleware auth description (local verify + fallback).
- `.claude/todo-later/19(half)-2026-07-17-auth-refresh-cadence.md` — note the middleware-side amplification fix (client-side replay storm remains its own open item).

## Out of scope

- The client-side refresh replay storm (todo 19) — separate investigation.
- Custom-domain (`/_custom`) and short-link routing — untouched.
- Any change to API-route auth (`getUser()` per request stays).
