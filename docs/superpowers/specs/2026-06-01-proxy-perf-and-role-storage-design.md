---
noteId: "b4af2fd05d9b11f1b92a4b3b6ebe345a"
tags: []

---

# proxy.ts — Performance + Role Storage — Design

**Date:** 2026-06-01
**Author:** Claude (sagarkushwaha5599@gmail.com)
**Status:** Approved — ready for implementation plan

---

## 1. Goal

Reduce middleware overhead from 250–999 ms per request to ~0 ms on anonymous traffic, and close a client-side role-spoof hole in the `/dashboard` guard. Tighten host-header matching and the matcher config along the way.

Single file is the centre of gravity (`proxy.ts`), plus a new auth-finalization endpoint and a one-time DB backfill.

---

## 2. Problem

Dev-server logs across a representative session showed `proxy.ts` running 250–999 ms on every routed request — including anonymous storefront, discover, and public-API hits. Six issues identified, ranked by severity:

| # | Issue | Severity |
|---|---|---|
| **A** | `supabase.auth.getUser()` (one network call to the auth server) runs on every request, regardless of whether the route is guarded or the visitor has a session. | Perf — high |
| **B** | The `/dashboard` role check reads `user.user_metadata.role`. `user_metadata` is mutable by the authenticated user (`supabase.auth.updateUser({ data: { role: 'creator' } })`), so a logged-in buyer can self-promote into the creator dashboard. | **Security — high** |
| **C** | Host detection uses `hostname.includes(...)` with substrings (`'digione.ai'`, `'vercel.app'`, `'localhost'`). `Host` is attacker-controlled — values like `digione.ai.evil.com` bypass the custom-domain rewrite. | Security — medium |
| **D** | Middleware runs on `/api/webhook/cashfree` (adds ~300 ms per Cashfree retry) and on every public API route, none of which need it. | Perf + correctness |
| **E** | Login redirect builds `returnUrl` from `request.nextUrl.pathname` only — the original query string is silently dropped. | UX |
| **F** | `getUser()` executes **before** the custom-domain rewrite branch, so even custom-domain traffic that is about to be rewritten pays the auth round-trip. | Perf |

All six are in scope.

---

## 3. Scope

### In

- Rewrite `proxy.ts` to fix A, C, D, E, F (Section 5).
- Migrate role storage from `user_metadata` to `app_metadata`, gated by a new server endpoint and a backfill SQL migration (Section 6).
- Update the three docs that pin the auth contract (Section 9.4).

### Out

- Observability / metrics for middleware timing.
- Rate limiting at the middleware layer.
- Closing the "self-elected creator at signup" hole — i.e. gating creator role behind admin approval or KYC. Documented as future work.
- Switching to `supabase.auth.getClaims()` for JWT verification. Stays on `getUser()`; the cookie probe is what avoids the network call.

---

## 4. Architecture overview

Single-file change preserves the current contract — auth checks live in middleware — but reorders branches so the expensive call is gated behind cheap ones:

```
proxy.ts (request enters)
   │
   ├─ 1. Host detection
   │     └─ if custom domain → rewrite to /_custom/[host]/* and return
   │        (no Supabase client created)
   │
   ├─ 2. Path classification
   │     └─ if path is NOT /dashboard/* or /account/*
   │        → return NextResponse.next() (no Supabase call)
   │
   ├─ 3. Cookie probe
   │     └─ if no sb-*-auth-token cookie present
   │        → treat as anon (user = null), skip Supabase entirely
   │
   ├─ 4. Supabase client + getUser()
   │     └─ only reached when cookie present AND path is guarded
   │
   └─ 5. Guards (existing intent)
         └─ /dashboard → require role ∈ {'creator','super_admin'} from app_metadata
         └─ /account   → require any user
```

Net effect on overhead:

| Request | Before | After |
|---|---|---|
| Anon `GET /discover` | 250–999 ms | ~0 ms (skipped at step 2) |
| Anon `GET /api/discover` | 250–999 ms | not run (matcher excluded) |
| Logged-out `GET /` | 250–999 ms | ~0 ms (step 2) |
| Custom domain page | 250–999 ms then rewrite | ~0 ms (step 1) |
| `POST /api/webhook/cashfree` | 250–999 ms | not run (matcher excluded) |
| Logged-in `GET /dashboard` | 250–999 ms | 250–999 ms (still needed) |
| Anon `GET /dashboard` | 250–999 ms then redirect | ~0 ms (no cookie → step 3 → redirect) |

---

## 5. New `proxy.ts` shape

### 5.1 File outline

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export default async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // 1. Custom domain rewrite — no Supabase needed
  if (!isMainDomain(hostname)) {
    url.pathname = `/_custom/${hostname}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // 2. Short-circuit unguarded paths
  const isGuarded =
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/account');
  if (!isGuarded) return NextResponse.next();

  // 3. Cookie probe — only continue if there's a session to check
  const hasAuthCookie = request.cookies
    .getAll()
    .some(c => c.name.startsWith('sb-'));

  let user: User | null = null;
  let supabaseResponse = NextResponse.next({ request: { headers: request.headers } });

  if (hasAuthCookie) {
    // 4. Supabase client + getUser (gated)
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            );
          },
        },
      },
    );
    ({ data: { user } } = await supabase.auth.getUser());
  }

  // 5. Guards
  if (url.pathname.startsWith('/dashboard')) {
    if (!user) return redirectToLogin(url, request);
    const role = user.app_metadata?.role;            // ← changed from user_metadata
    if (role !== 'creator' && role !== 'super_admin') {
      url.pathname = '/account/library';
      return NextResponse.redirect(url);
    }
  }

  if (url.pathname.startsWith('/account')) {
    if (!user) return redirectToLogin(url, request);
  }

  return supabaseResponse;
}

function redirectToLogin(url: URL, request: NextRequest) {
  url.pathname = '/login';
  url.searchParams.set(
    'returnUrl',
    request.nextUrl.pathname + request.nextUrl.search,  // preserves query string
  );
  return NextResponse.redirect(url);
}
```

### 5.2 Host allowlist (closes C)

```typescript
function isMainDomain(hostname: string): boolean {
  const host = hostname.toLowerCase().split(':')[0];   // strip port
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').toLowerCase().split(':')[0];

  if (root && (host === root || host === `www.${root}`)) return true;
  if (host.endsWith('.vercel.app')) return true;

  if (process.env.NODE_ENV !== 'production') {
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
  }
  return false;
}
```

Attacks now blocked:

| Attack `Host:` header | Old | New |
|---|---|---|
| `digione.ai.evil.com` | passed (`.includes('digione.ai')`) | rewritten to `/_custom/` |
| `vercel.app.evil.com` | passed (`.includes('vercel.app')`) | rewritten to `/_custom/` |
| `localhost.evil.com` in prod | passed | rewritten to `/_custom/` |
| `LOCALHOST` (case) | passed | matched correctly (lowercased) |

### 5.3 Matcher (closes D)

```typescript
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)',
  ],
};
```

**`/api/*` excluded entirely.** Justified because every authenticated API route already calls `await supabase.auth.getUser()` and returns 401 inline (see `app/api/payouts/request/route.ts:7-12`, `app/api/sites/create/route.ts:65-69`). Middleware-level guards on API routes only do redirects, which are meaningless for JSON endpoints — the route handlers do their own authz.

Side effect: `/api/webhook/cashfree` retries get ~300 ms faster.

---

## 6. Role storage fix (B)

### 6.1 Current picture

- `auth.users.raw_user_meta_data.role` — set at signup via `options.data.role`. **Client-editable.** This is the spoof hole.
- `public.users.role` — exists, populated at signup, is the source of truth for non-middleware lookups (e.g. `app/(auth)/login/page.tsx:100-103`).
- Only `proxy.ts:68` reads `user_metadata.role`. Confirmed by `grep user_metadata[\.\?]\.?role` returning a single hit.

So the fix is narrow: stop trusting `user_metadata`, populate `app_metadata.role` server-side from `public.users.role`, point `proxy.ts` at it.

### 6.2 New endpoint — `POST /api/auth/finalize-signup`

Idempotent. Reads role from the canonical DB source and mirrors it into `auth.users.raw_app_meta_data` so `proxy.ts` can read it from the JWT without a DB hit. **One-shot:** refuses to overwrite an existing `app_metadata.role` — changing role is an admin action, not a self-service endpoint.

```typescript
// app/api/auth/finalize-signup/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.app_metadata?.role) {
    return NextResponse.json({ already_set: true });
  }

  const admin = createServiceClient();
  const { data: pub } = await admin
    .from('users')
    .select('role')
    .eq('auth_provider_id', user.id)
    .maybeSingle();

  const role = pub?.role ?? 'buyer';   // fallback for races where the trigger hasn't run

  await admin.auth.admin.updateUserById(user.id, { app_metadata: { role } });
  return NextResponse.json({ role });
}
```

### 6.3 Callers (client-side)

| File | When | Failure mode |
|---|---|---|
| `app/(auth)/signup/page.tsx` | After `supabase.auth.signUp(...)` resolves with no error | Network flake → user lands without `app_metadata.role`; self-heals on next login (login also calls finalize-signup) |
| `app/(auth)/login/page.tsx` | After login succeeds | Network flake → user briefly has no role in JWT until next login; bounced to `/account/library` if they hit `/dashboard` |
| `app/api/auth/callback/route.ts` | After `exchangeCodeForSession` succeeds | Same — covers Google OAuth and email-confirm |

All call sites: fire-and-forget (await but swallow errors and continue). Idempotency makes retries free.

Google OAuth signups default to `'buyer'` (current behaviour, documented gap). Adding a role-picker on the Google path is future work.

### 6.4 Backfill SQL — one-time

```sql
-- supabase/migrations/<ts>_backfill_app_metadata_role.sql
UPDATE auth.users au
SET raw_app_meta_data = COALESCE(au.raw_app_meta_data, '{}'::jsonb)
                      || jsonb_build_object('role', pu.role)
FROM public.users pu
WHERE pu.auth_provider_id = au.id
  AND (au.raw_app_meta_data->>'role') IS NULL
  AND pu.role IS NOT NULL;
```

Idempotent — skips users already mirrored. Safe to re-run.

### 6.5 `proxy.ts` change for B

```diff
- const role = user.user_metadata?.role;
+ const role = user.app_metadata?.role;
```

No fallback to `user_metadata`. Once we ship, `app_metadata` is the exclusive trust source.

### 6.6 Residual risk

`app_metadata.role` is no longer client-editable, but the value still originated from a self-selected radio button on `/signup`. A logged-out attacker can still register fresh as `creator`. To close that, "becoming a creator" needs a gated flow (KYC, admin approval). Out of scope here. Tracked as future work.

What this fix *does* close: a logged-in buyer self-promoting via `supabase.auth.updateUser({ data: { role: 'creator' } })` — the documented spoof in `.claude/rules/security-model.md`.

---

## 7. Rollout sequence

The order matters: ship the *capability* before the *enforcement*. Otherwise existing logged-in users get bounced from `/dashboard` until they re-login.

| # | Ship | Behaviour change | Safe to roll back? |
|---|---|---|---|
| 1 | `/api/auth/finalize-signup` route handler + backfill SQL file (not yet executed) | None — endpoint exists but nothing calls it yet | Yes, just revert |
| 2 | Wire client calls from `signup/page.tsx`, `login/page.tsx`, `api/auth/callback/route.ts` | None visible — `app_metadata.role` populated going forward, but `proxy.ts` still reads `user_metadata` | Yes |
| 3 | Run backfill SQL against the DB | None visible — existing users now also have `app_metadata.role` populated | Reversible: `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data - 'role'` |
| 4 | `proxy.ts` rewrite (everything in Section 5) + doc updates (Section 9.4) | Enforced: middleware reads `app_metadata.role`, anon traffic skips Supabase, host hardened, matcher tightened | `git revert` the `proxy.ts` commit |

Run step 3 after step 2 has been deployed for at least 24 h, so the long tail of users who logged in during that window already have `app_metadata` populated by `finalize-signup` and the backfill only handles the rest.

---

## 8. Verification

### 8.1 Local — after step 4 lands

Anonymous traffic (the perf win):

- `GET /` → `proxy.ts: < 10ms` in the dev log (was ~380 ms).
- `GET /discover` → `proxy.ts: < 10ms` (was ~999 ms).
- `GET /api/discover` → middleware did not run (matcher excluded).
- `POST /api/webhook/cashfree` → middleware did not run.

Auth still works:

- Logged-out → `GET /dashboard` → `302 /login?returnUrl=/dashboard`.
- Logged-out → `GET /dashboard/products?from=email` → `302 /login?returnUrl=/dashboard/products%3Ffrom%3Demail` (query preserved).
- Logged-in buyer → `GET /dashboard` → `302 /account/library`.
- Logged-in creator → `GET /dashboard` → `200`.
- Logged-in any → `GET /account` → `200`.

Host hardening:

- `curl -H 'Host: digione.ai.evil.com' http://localhost:3000/` → rewritten to `/_custom/...`.
- `curl -H 'Host: vercel.app.evil.com' http://localhost:3000/` → rewritten to `/_custom/...`.
- In a production build (`NODE_ENV=production`), `Host: localhost` → rewritten to `/_custom/...`.

Role spoof closed:

- As logged-in buyer in the browser console: `await supabase.auth.updateUser({ data: { role: 'creator' } })`, then `GET /dashboard` → still `302 /account/library`.

### 8.2 Lane 1 checks

- `npx tsc --noEmit` — 0 errors.
- `npm run lint` — 0 errors.
- `/verify` slash command — passes on all changed files.

---

## 9. Rollback + doc updates

### 9.1 Rollback per step

| Step | Rollback |
|---|---|
| 1 | `git revert` the route handler commit. No data effect. |
| 2 | `git revert` the client-call commit. Users stop getting `app_metadata.role` populated on new flows; existing populated values stay. |
| 3 | `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data - 'role';` — strips the mirrored key. `user_metadata` is untouched. |
| 4 | `git revert` the `proxy.ts` commit. Middleware reverts to reading `user_metadata.role` and running `getUser()` on every request. Doc revert too. |

### 9.2 Highest-risk failure modes for step 4

- **Missing `app_metadata.role` for a legit creator** → bounced to `/account/library`. Mitigated by steps 2 + 3 running ahead of 4. If still seen post-deploy, run the backfill SQL again.
- **Host allowlist too tight** → legitimate hosts (new Vercel preview slug, future custom domain) get rewritten to `/_custom/...`. Add the host to the allowlist or revert.
- **Matcher regex error** → Next.js validates at startup and refuses to boot the middleware. Caught by `npm run dev` before deploy.
- **`/api/*` excluded but some path needed middleware** → none of the currently-guarded paths start with `/api/`. Verify before merge with: `grep -r 'startsWith.\\/api' proxy.ts` — should return no guards.

### 9.3 Sequencing safety

Steps 1–3 are no-op until step 4 lands. They can sit in `main` for days without changing behaviour. If step 4 has to be reverted, steps 1–3 stay in and continue populating `app_metadata.role` for future re-deploy.

### 9.4 Doc updates (same PR as step 4)

| Doc | Change |
|---|---|
| `.claude/rules/security-model.md` | "Roles" section: role lives in `app_metadata`, not `user_metadata`. Note the middleware-vs-DB caching pattern (DB is source of truth, `app_metadata` is the JWT-side cache). |
| `.claude/rules/supabase-reference.md` | New "Role storage" subsection: source of truth = `public.users.role`, cache = `app_metadata.role`, sync = `/api/auth/finalize-signup`. |
| `.claude/rules/api-routes.md` | New row for `POST /api/auth/finalize-signup` with full contract. |
| `CLAUDE.md` | Update the role-check bullet under "Database & Supabase" to point at `app_metadata`. |

---

## 10. Open follow-ups (out of scope, future work)

1. **Gate creator role behind admin approval / KYC.** Closes the residual "self-elected creator at signup" hole.
2. **Add middleware observability** — emit timing metrics so future regressions are visible without staring at dev logs.
3. **Rate limiting** — `/api/leads`, `/api/upload`, `/api/coupons/validate` are still open public endpoints. Documented gap in `.claude/rules/security-model.md`.
4. **Switch to `getClaims()`** — once the Supabase project is on asymmetric JWT keys, swap `getUser()` for `getClaims()` to skip the network call even for authenticated traffic.
5. **Role-picker for Google OAuth signup** — currently defaults to `buyer`. UX fix once (1) lands.

---

## 11. Assumptions to verify during implementation

- `public.users.role` is populated for every existing user (verified for the small DB; spot-check before backfill).
- There is a DB trigger that creates `public.users` from `auth.users` on signup, or signup explicitly inserts the row. If neither, finalize-signup needs to upsert into `public.users` before mirroring. To be checked in the migrations history during step 1.
- No code outside `proxy.ts` reads `user_metadata.role`. Confirmed by grep at design time; re-run before step 4.
- Next.js 16's `proxy.ts` middleware naming is fully supported in our deploy target (Vercel + local). Confirmed in `package.json` (`next@16.1.7`) and by the running dev server.
