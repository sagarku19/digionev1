---
noteId: "ec3215b05d9d11f1b92a4b3b6ebe345a"
tags: []

---

# proxy.ts Performance + Role Storage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-06-01-proxy-perf-and-role-storage-design.md`

**Goal:** Cut middleware overhead on anonymous traffic from 250–999 ms to ~0 ms and close the `user_metadata.role` self-promotion hole, by migrating role storage to `app_metadata`, reordering branches, adding a cookie probe, hardening the host allowlist, and tightening the matcher.

**Architecture:** Single-file rewrite of `proxy.ts` preceded by a new `/api/auth/finalize-signup` route that mirrors `public.users.role` into `auth.users.raw_app_meta_data.role`, plus client wiring on signup/login/OAuth-callback and a one-time SQL backfill for existing users.

**Tech Stack:** Next.js 16 (App Router middleware as `proxy.ts`), `@supabase/ssr` for cookie-bound auth, `@supabase/supabase-js` admin API for service-role writes, PostgreSQL JSONB updates for the backfill.

**Rollout-step ↔ Task mapping (from spec §7):**

| Rollout step | Task | Commit at end? |
|---|---|---|
| 1. Ship endpoint + migration file | Task 1 | Yes |
| 2. Wire client calls | Task 2 | Yes |
| 3. Run backfill SQL | Task 3 | No (manual DB step) |
| 4. Rewrite `proxy.ts` + docs | Task 4 | Yes |

Each task in this plan ends in a commit (where code changes). Verification happens inside the task.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `app/api/auth/finalize-signup/route.ts` | **Create** (Task 1) | One-shot, idempotent endpoint that mirrors `public.users.role` → `auth.users.app_metadata.role`. Cookie-auth required. |
| `supabase/migrations/20260601_backfill_app_metadata_role.sql` | **Create** (Task 1) | One-time `UPDATE auth.users` to mirror role for existing users. Runs manually in Task 3. |
| `app/(auth)/signup/page.tsx` | **Modify** (Task 2) | Fire `POST /api/auth/finalize-signup` after `signUp` succeeds (only when a session exists — email confirm off). |
| `app/(auth)/login/page.tsx` | **Modify** (Task 2) | Fire `POST /api/auth/finalize-signup` on login success (auto-login useEffect and `handleLogin` `onSuccess`). |
| `app/api/auth/callback/route.ts` | **Modify** (Task 2) | Fire `POST /api/auth/finalize-signup` after `exchangeCodeForSession` succeeds (covers Google OAuth + email confirm). |
| `proxy.ts` | **Rewrite** (Task 4) | New branch order, cookie probe, host allowlist, matcher cleanup, role read from `app_metadata`, `returnUrl` preserves query. |
| `.claude/rules/security-model.md` | **Modify** (Task 4) | Update "Roles" section: role lives in `app_metadata`. Source of truth = DB; JWT cache via finalize-signup. |
| `.claude/rules/supabase-reference.md` | **Modify** (Task 4) | New "Role storage" subsection. |
| `.claude/rules/api-routes.md` | **Modify** (Task 4) | Add `POST /api/auth/finalize-signup` row. |
| `CLAUDE.md` | **Modify** (Task 4) | Update role-check bullet under "Database & Supabase". |

---

## Task 1: Add finalize-signup endpoint + backfill SQL file

**Files:**
- Create: `app/api/auth/finalize-signup/route.ts`
- Create: `supabase/migrations/20260601_backfill_app_metadata_role.sql`

This task ships the *capability*. Nothing in the running app calls the endpoint yet, so behaviour is unchanged after merging.

---

- [ ] **Step 1.1: Verify the `public.users` insertion assumption**

The endpoint reads `public.users.role`. Need to confirm that either (a) a DB trigger creates `public.users` from `auth.users` on signup, or (b) the existing signup flow inserts it explicitly. If neither, fall back to `user_metadata.role` (the endpoint already does this — but knowing which path is live shapes the verification step).

Run:

```bash
grep -ri "handle_new_user\|on_auth_user_created\|public\.users" supabase/migrations/ 2>/dev/null || echo "no trigger found in local migrations"
grep -rn "from('users')\.insert\|into users" app/ 2>/dev/null | grep -v node_modules
```

Expected outcome: either a trigger is found (good — `public.users.role` will be present), or no trigger is found (acceptable — endpoint's `?? user.user_metadata?.role ?? 'buyer'` fallback covers it). **Do not change the endpoint design either way.** This step is informational.

If no trigger and no inline insert appears, note it in the PR description so the reviewer knows the fallback is load-bearing.

---

- [ ] **Step 1.2: Create the route handler file**

Create `app/api/auth/finalize-signup/route.ts` with this content:

```typescript
// POST /api/auth/finalize-signup
// Idempotent. Mirrors public.users.role → auth.users.raw_app_meta_data.role
// so proxy.ts can trust the role from the JWT.
//
// One-shot: refuses to overwrite an existing app_metadata.role. Changing role
// is an admin action, not a self-service endpoint. See
// docs/superpowers/specs/2026-06-01-proxy-perf-and-role-storage-design.md.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.app_metadata?.role) {
    return NextResponse.json({ already_set: true, role: user.app_metadata.role });
  }

  const admin = createServiceClient();
  const { data: pub } = await admin
    .from('users')
    .select('role')
    .eq('auth_provider_id', user.id)
    .maybeSingle();

  // Resolution order:
  //   1. public.users.role (canonical, server-managed)
  //   2. auth.users.raw_user_meta_data.role (signup-time selection, untrusted but the
  //      best signal we have if the trigger hasn't run yet)
  //   3. 'buyer' (safe default — buyers can't reach /dashboard)
  const role =
    (pub?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined) ??
    'buyer';

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role },
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ role });
}
```

---

- [ ] **Step 1.3: Create the backfill SQL migration**

Create `supabase/migrations/20260601_backfill_app_metadata_role.sql`:

```sql
-- Backfill auth.users.raw_app_meta_data.role from public.users.role for every
-- existing user. One-time, idempotent (skips users already mirrored).
-- See docs/superpowers/specs/2026-06-01-proxy-perf-and-role-storage-design.md §6.4.

UPDATE auth.users au
SET raw_app_meta_data = COALESCE(au.raw_app_meta_data, '{}'::jsonb)
                      || jsonb_build_object('role', pu.role)
FROM public.users pu
WHERE pu.auth_provider_id = au.id
  AND (au.raw_app_meta_data->>'role') IS NULL
  AND pu.role IS NOT NULL;
```

This file lives in the migrations folder but is **not** auto-run by `supabase db push`. It's executed manually in Task 3.

---

- [ ] **Step 1.4: Type-check and lint**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Expected: both pass with 0 errors. The new route handler is the only TS file added.

---

- [ ] **Step 1.5: Smoke-test the endpoint locally**

Start the dev server (`npm run dev`), log in as any user in the browser to get a session cookie, then in a separate terminal run:

```bash
# Copy your auth cookie from the browser DevTools (Application → Cookies → sb-*-auth-token)
# Or use curl with --cookie:
curl -i -X POST http://localhost:3000/api/auth/finalize-signup \
  -H "Cookie: $(curl -s -c - http://localhost:3000/ | grep '^localhost.*sb-' | awk '{print $6"="$7}' | head -1)"
```

The brittle curl above is fine for a sanity check. Easier: open `http://localhost:3000/api/auth/finalize-signup` via a POST from the browser console:

```javascript
await (await fetch('/api/auth/finalize-signup', { method: 'POST' })).json()
```

Expected:
- First call (not yet mirrored): `{ role: 'creator' }` (or whatever's in `users.role` for the current user)
- Second call: `{ already_set: true, role: 'creator' }`
- Without cookie (incognito): `{ error: 'Unauthorized' }` with 401

Then verify in Supabase Studio (Auth → Users → click your user → Raw User Meta Data) that `app_metadata` now contains `{ "role": "creator" }`.

---

- [ ] **Step 1.6: Commit Task 1**

```bash
git add app/api/auth/finalize-signup/route.ts supabase/migrations/20260601_backfill_app_metadata_role.sql
git commit -m "$(cat <<'EOF'
feat(auth): add finalize-signup endpoint to mirror role into app_metadata

Idempotent one-shot endpoint that reads public.users.role and writes it
to auth.users.raw_app_meta_data so proxy.ts can trust the role from the
JWT without a DB hit. Includes one-time backfill SQL for existing users.

Capability only — nothing calls this endpoint yet. proxy.ts continues
to read from user_metadata until Task 4.

Spec: docs/superpowers/specs/2026-06-01-proxy-perf-and-role-storage-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Wire client calls from signup, login, and OAuth callback

**Files:**
- Modify: `app/(auth)/signup/page.tsx:77-86` (insert call inside the existing `if (data.session && data.user)` block)
- Modify: `app/(auth)/login/page.tsx:84-110` (insert call inside `onSuccess` of the login mutation)
- Modify: `app/(auth)/login/page.tsx:43-71` (insert call inside the auto-redirect useEffect for already-logged-in users)
- Modify: `app/api/auth/callback/route.ts:9-20` (insert call inside the `if (code)` success branch)

All calls are fire-and-forget — `await` the fetch but swallow any error and continue. `app_metadata.role` self-heals on the next call.

---

- [ ] **Step 2.1: Modify signup page**

In `app/(auth)/signup/page.tsx`, locate the block at lines 77–86:

```typescript
    if (data.session && data.user) {
      try {
        const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', data.user.id).maybeSingle();
        if (profile?.id) await supabase.from('notifications').insert({ recipient_creator_id: profile.id, title: '👋 Welcome to DigiOne!', message: "You're all set! Start by creating your first product.", type: 'welcome', action_url: '/dashboard/products' } as any);
      } catch { /* non-critical */ }
      router.push('/dashboard');
    } else {
      setSuccess(true);
    }
```

Add the finalize-signup call **before** the existing `try` block, still inside the `if (data.session && data.user)` guard. Replace those 8 lines with:

```typescript
    if (data.session && data.user) {
      // Mirror role from public.users → auth.users.app_metadata so proxy.ts
      // can trust the role from the JWT. Fire-and-forget — self-heals on next login.
      try { await fetch('/api/auth/finalize-signup', { method: 'POST' }); } catch { /* non-critical */ }

      try {
        const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', data.user.id).maybeSingle();
        if (profile?.id) await supabase.from('notifications').insert({ recipient_creator_id: profile.id, title: '👋 Welcome to DigiOne!', message: "You're all set! Start by creating your first product.", type: 'welcome', action_url: '/dashboard/products' } as any);
      } catch { /* non-critical */ }
      router.push('/dashboard');
    } else {
      setSuccess(true);
    }
```

The `else` branch (email-confirm-pending) intentionally does NOT call finalize-signup — no session exists yet. The OAuth callback handles that case in Step 2.4.

---

- [ ] **Step 2.2: Modify login page — onSuccess handler**

In `app/(auth)/login/page.tsx`, locate the `onSuccess` callback at lines 84–111:

```typescript
        onSuccess: async (user) => {
          setRedirecting(true);

          const returnUrl = searchParams.get('returnUrl');
          if (returnUrl) {
            window.location.href = returnUrl;
            return;
          }

          // Resolve role to decide between /dashboard and /account/library.
          // If the query fails (RLS, missing row), default to the buyer route
          // rather than leaving the form spinning forever.
          let role = 'user';
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('role')
              .eq('auth_provider_id', user.id)
              .single();
            role = userData?.role || 'user';
          } catch {
            // Fall through with role='user'.
          }

          window.location.href = role === 'creator' || role === 'super_admin'
            ? '/dashboard'
            : '/account/library';
        },
```

Insert the finalize-signup call as the **first action** after `setRedirecting(true)`:

```typescript
        onSuccess: async (user) => {
          setRedirecting(true);

          // Mirror role into app_metadata. Fire-and-forget — proxy.ts will
          // pick up the new value on the next page load.
          try { await fetch('/api/auth/finalize-signup', { method: 'POST' }); } catch { /* non-critical */ }

          const returnUrl = searchParams.get('returnUrl');
          if (returnUrl) {
            window.location.href = returnUrl;
            return;
          }

          // ... rest unchanged ...
```

Leave the `// ... rest unchanged ...` lines exactly as they were — only the 3-line block above `const returnUrl` is new.

---

- [ ] **Step 2.3: Modify login page — auto-redirect useEffect**

In `app/(auth)/login/page.tsx`, locate the auto-redirect IIFE around lines 43–71. The relevant section ends with:

```typescript
          role = userData?.role || 'user';
        }
      } catch {
        // Fall through with role='user'.
      }

      window.location.replace(
        role === 'creator' || role === 'super_admin' ? '/dashboard' : '/account/library'
      );
    })();
  }, [sessionLoading, isLoggedIn, searchParams]);
```

Insert the finalize-signup call **before** the `window.location.replace`:

```typescript
          role = userData?.role || 'user';
        }
      } catch {
        // Fall through with role='user'.
      }

      // Mirror role into app_metadata for already-logged-in users hitting /login.
      try { await fetch('/api/auth/finalize-signup', { method: 'POST' }); } catch { /* non-critical */ }

      window.location.replace(
        role === 'creator' || role === 'super_admin' ? '/dashboard' : '/account/library'
      );
    })();
  }, [sessionLoading, isLoggedIn, searchParams]);
```

---

- [ ] **Step 2.4: Modify OAuth callback route**

Open `app/api/auth/callback/route.ts`. Replace the entire `GET` handler with:

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Mirror role from public.users → app_metadata. Server-side fetch — we
      // already have an origin, build the absolute URL and forward the session
      // cookie that exchangeCodeForSession just set.
      try {
        const cookieHeader = request.headers.get('cookie') ?? '';
        await fetch(`${origin}/api/auth/finalize-signup`, {
          method: 'POST',
          headers: { cookie: cookieHeader },
        });
      } catch {
        // non-critical — login or next visit will populate app_metadata
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('Callback error exchanging code:', error);
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/login?error=Could not verify email. Try signing up again or disabling Email Confirmations locally.`);
}
```

**Caveat:** the server-to-server `fetch` with the request's cookie header works because `exchangeCodeForSession` sets the session cookies on the response, but the request we forward to `finalize-signup` is a fresh internal request — it uses the cookies from the **original** request, which don't include the just-issued session. So the first call after Google OAuth signup will return 401 and silently fail. The user's next login (or any subsequent visit hitting login page) populates `app_metadata` then. Document this in the PR description so the reviewer doesn't expect the OAuth-signup path to seed app_metadata on the first round-trip.

If this becomes a problem in practice, the fix is to do the finalize-signup work inline inside the callback handler using `createServiceClient()` directly — but that duplicates the logic and is out of scope for this task.

---

- [ ] **Step 2.5: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: 0 errors. The new `fetch` calls have no type implications.

---

- [ ] **Step 2.6: Manual smoke test**

Start dev server, then:

1. **Existing logged-out user → login flow:**
   - Open an incognito window, go to `/login`, log in.
   - In Supabase Studio (Auth → Users → your user → Raw User Meta Data), verify `app_metadata.role` is now populated.

2. **New signup with email confirm disabled (if applicable):**
   - Sign up with a fresh email. After redirect to `/dashboard`, verify `app_metadata.role` is set in Studio.

3. **Auto-redirect path:**
   - With an active session, navigate to `/login`. The page auto-redirects. Verify `app_metadata.role` was populated (or already present — `already_set: true` response).

`proxy.ts` is unchanged, so behaviour is identical — this step only verifies the mirror happens.

---

- [ ] **Step 2.7: Commit Task 2**

```bash
git add app/\(auth\)/signup/page.tsx app/\(auth\)/login/page.tsx app/api/auth/callback/route.ts
git commit -m "$(cat <<'EOF'
feat(auth): call finalize-signup from signup, login, and OAuth callback

Populates auth.users.app_metadata.role for every signup/login event so
proxy.ts will have a trusted role to read once it's switched over in Task 4.
Fire-and-forget — errors are swallowed and the next session self-heals.

No behaviour change yet: proxy.ts still reads user_metadata.role.

Spec: docs/superpowers/specs/2026-06-01-proxy-perf-and-role-storage-design.md §7 step 2

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Run backfill SQL against the database

**No commit.** This is a manual DB operation. The migration file from Task 1 was added to the repo for traceability but is not auto-run by Supabase migrations because it's a one-off backfill.

Run this **after Task 2 has been deployed and live for at least 24 h**, so any new signups during that window have already populated `app_metadata.role` via finalize-signup and the backfill only handles the long tail.

---

- [ ] **Step 3.1: Sanity-check candidate rows**

Open Supabase Studio → SQL Editor. Run a read-only count first:

```sql
SELECT COUNT(*) AS to_backfill
FROM auth.users au
JOIN public.users pu ON pu.auth_provider_id = au.id
WHERE (au.raw_app_meta_data->>'role') IS NULL
  AND pu.role IS NOT NULL;
```

Expected: a number greater than zero (existing users not yet mirrored). If zero, finalize-signup has already caught everyone and the backfill is a no-op — proceed anyway.

---

- [ ] **Step 3.2: Run the backfill**

In SQL Editor, run the contents of `supabase/migrations/20260601_backfill_app_metadata_role.sql`:

```sql
UPDATE auth.users au
SET raw_app_meta_data = COALESCE(au.raw_app_meta_data, '{}'::jsonb)
                      || jsonb_build_object('role', pu.role)
FROM public.users pu
WHERE pu.auth_provider_id = au.id
  AND (au.raw_app_meta_data->>'role') IS NULL
  AND pu.role IS NOT NULL;
```

Expected output: `UPDATE N` where N equals the count from Step 3.1.

---

- [ ] **Step 3.3: Verify**

Run the same count query from Step 3.1 again:

```sql
SELECT COUNT(*) AS still_missing
FROM auth.users au
JOIN public.users pu ON pu.auth_provider_id = au.id
WHERE (au.raw_app_meta_data->>'role') IS NULL
  AND pu.role IS NOT NULL;
```

Expected: `0`. If not zero, investigate — possibly users with `pu.role = NULL` (legitimately) or a join missing rows.

Spot-check one or two users by hand:

```sql
SELECT au.email,
       au.raw_app_meta_data->>'role' AS app_role,
       au.raw_user_meta_data->>'role' AS user_role,
       pu.role AS db_role
FROM auth.users au
LEFT JOIN public.users pu ON pu.auth_provider_id = au.id
ORDER BY au.created_at DESC
LIMIT 5;
```

Expected: `app_role` matches `db_role` for every row.

---

- [ ] **Step 3.4: Mark this task complete**

No git commit. Note in the team channel (or PR description for Task 4) that the backfill ran and how many rows were updated. Proceed to Task 4.

---

## Task 4: Rewrite `proxy.ts` + update docs

**Files:**
- Rewrite: `proxy.ts` (full replacement)
- Modify: `.claude/rules/security-model.md` ("Roles" section)
- Modify: `.claude/rules/supabase-reference.md` (add "Role storage" subsection)
- Modify: `.claude/rules/api-routes.md` (add `/api/auth/finalize-signup` entry)
- Modify: `CLAUDE.md` (role-check bullet)

This is the enforcement step. Once merged and deployed, anonymous traffic skips Supabase and the role-spoof hole is closed.

---

- [ ] **Step 4.1: Rewrite proxy.ts**

Replace the entire contents of `proxy.ts` with:

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Strict host allowlist. The previous implementation used hostname.includes(...)
// which accepted hostile values like 'digione.ai.evil.com' — Host is attacker-
// controlled. We now match exact hosts (or .vercel.app suffix) and gate
// localhost/192.168.* behind NODE_ENV !== 'production'.
function isMainDomain(hostname: string): boolean {
  const host = hostname.toLowerCase().split(':')[0];
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').toLowerCase().split(':')[0];

  if (root && (host === root || host === `www.${root}`)) return true;
  if (host.endsWith('.vercel.app')) return true;

  if (process.env.NODE_ENV !== 'production') {
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
  }
  return false;
}

function redirectToLogin(url: URL, request: NextRequest) {
  url.pathname = '/login';
  // Preserve the original query string so /dashboard?from=email survives.
  url.searchParams.set(
    'returnUrl',
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.redirect(url);
}

export default async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // 1. Custom domain rewrite — pure routing, no Supabase client created.
  if (!isMainDomain(hostname)) {
    url.pathname = `/_custom/${hostname}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // 2. Short-circuit unguarded paths. Storefront, marketing, /, etc. don't need
  //    the auth round-trip — they pay nothing for middleware now.
  const isGuarded =
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/account');
  if (!isGuarded) return NextResponse.next();

  // 3. Cookie probe — only call getUser() if there's actually a session cookie.
  //    Anonymous hits to /dashboard fall through with user=null and the guard
  //    redirects them to /login the same way it always did.
  const hasAuthCookie = request.cookies
    .getAll()
    .some(c => c.name.startsWith('sb-'));

  let user: User | null = null;
  let supabaseResponse = NextResponse.next({ request: { headers: request.headers } });

  if (hasAuthCookie) {
    // 4. Supabase client + getUser — gated behind cookie presence.
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
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

  // 5. Guards.
  if (url.pathname.startsWith('/dashboard')) {
    if (!user) return redirectToLogin(url, request);
    // Read role from app_metadata (server-controlled, set via finalize-signup).
    // user_metadata.role is client-editable and is no longer trusted.
    const role = user.app_metadata?.role;
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

export const config = {
  matcher: [
    // Excludes:
    //  - api/*           (all API routes — they do their own auth + return 401 inline)
    //  - _next/static    (build output)
    //  - _next/image     (image optimizer)
    //  - favicon.ico, robots.txt, sitemap.xml
    //  - image/font extensions
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)',
  ],
};
```

---

- [ ] **Step 4.2: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: 0 errors. If the `User` import path complains, replace `import type { User } from '@supabase/supabase-js';` with `import type { User } from '@supabase/ssr';` — both packages re-export the same type.

---

- [ ] **Step 4.3: Manual verification — perf wins**

Start `npm run dev`. Open the app in a normal browser (logged out) and click around. Watch the terminal log lines. Expected:

```
 GET /                  proxy.ts: < 10ms
 GET /discover          proxy.ts: < 10ms
 GET /api/discover      (no proxy.ts line at all — matcher excluded)
```

If `proxy.ts: 250ms+` shows up on `/discover`, the cookie probe is firing on a stale `sb-*` cookie. Open DevTools → Application → Cookies → clear all and reload.

---

- [ ] **Step 4.4: Manual verification — auth still works**

Logged-out flows:

- `GET /dashboard` → `302 /login?returnUrl=/dashboard`
- `GET /dashboard/products?from=email` → `302 /login?returnUrl=/dashboard/products%3Ffrom%3Demail` (query preserved)
- `GET /account/profile` → `302 /login?returnUrl=/account/profile`

Logged-in buyer (app_metadata.role = 'buyer'):

- `GET /dashboard` → `302 /account/library`
- `GET /account/library` → `200`

Logged-in creator (app_metadata.role = 'creator'):

- `GET /dashboard` → `200`
- `GET /account/library` → `200`

If a logged-in creator gets bounced to `/account/library`, their `app_metadata.role` is missing — re-run the Task 3 backfill query for that user, then have them refresh.

---

- [ ] **Step 4.5: Manual verification — host hardening**

In a terminal:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: digione.ai.evil.com" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: vercel.app.evil.com" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: localhost"            http://localhost:3000/
```

Expected:
- First two: a non-200 (404 likely, because `/_custom/<hostile-host>/` doesn't exist as a route — that's the correct behaviour: the request was rewritten away from the main domain handlers).
- Third: 200 (dev env allows localhost).

For a production-mode test, build and start:

```bash
NODE_ENV=production npm run build && NODE_ENV=production npm run start
# then in another shell:
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: localhost" http://localhost:3000/
```

Expected: the prod build now rewrites `Host: localhost` away from main-domain routes. Stop the prod server when done.

---

- [ ] **Step 4.6: Manual verification — role spoof closed**

As a logged-in buyer, open the browser console on any page and run:

```javascript
const { error } = await window.supabase?.auth?.updateUser({ data: { role: 'creator' } })
  ?? await (await import('/lib/supabase/client')).supabase.auth.updateUser({ data: { role: 'creator' } });
console.log(error);
```

(If `window.supabase` isn't exposed in your build, just paste this into the network tab of a fresh `/account/library` load, find an `auth.users` update, and verify `user_metadata.role` got set to `creator`.)

Then navigate to `/dashboard`. Expected: still `302 /account/library`. Before this fix, you would have been let in.

Optional: verify `app_metadata.role` was NOT changed:

```sql
SELECT raw_user_meta_data->>'role' AS user_role,
       raw_app_meta_data->>'role'  AS app_role
FROM auth.users
WHERE email = '<your buyer email>';
```

Expected: `user_role = 'creator'` (the user successfully edited their own metadata), `app_role = 'buyer'` (untouched, still trusted).

---

- [ ] **Step 4.7: Update `.claude/rules/security-model.md`**

In `.claude/rules/security-model.md`, find the "Roles" section and replace the existing third paragraph ("Role is read from the JWT in `proxy.ts` for the route guard, and from the DB for anything sensitive.") with:

```markdown
Role lives in two places:

- **`public.users.role`** — source of truth, server-managed.
- **`auth.users.raw_app_meta_data.role`** — JWT-side cache, mirrored from the DB by `POST /api/auth/finalize-signup` on every signup/login/OAuth-callback. Read by `proxy.ts` for the `/dashboard` guard.

`raw_user_meta_data.role` is **not** trusted — it is set at signup time and is editable by the authenticated user via `supabase.auth.updateUser({ data: { role } })`. Treat it as a UI hint only.

Changing role is an admin action. `finalize-signup` is one-shot — it refuses to overwrite an existing `app_metadata.role`.
```

In the same file, find the "Auth flow" section, step 4 ("Inside Route Handlers..."). Append:

```markdown

The middleware in `proxy.ts` short-circuits on three branches before calling `getUser()`:

1. Custom-domain rewrite happens first — no Supabase client created.
2. Unguarded paths (`/`, `/discover`, storefronts, marketing) return `NextResponse.next()` without touching Supabase.
3. Even on guarded paths (`/dashboard`, `/account`), `getUser()` only runs when an `sb-*` auth cookie is present. Anonymous hits to `/dashboard` skip the network call and fall through to the redirect.

`/api/*` routes are excluded from the middleware matcher entirely — they do their own `getUser()` and return 401 inline.
```

---

- [ ] **Step 4.8: Update `.claude/rules/supabase-reference.md`**

In `.claude/rules/supabase-reference.md`, add a new subsection at the end of "Common tasks" (just before "## Storage"):

```markdown
### Role storage and the `finalize-signup` endpoint

- **Source of truth:** `public.users.role`.
- **JWT cache:** `auth.users.raw_app_meta_data.role`. This is what `proxy.ts` reads.
- **Sync mechanism:** `POST /api/auth/finalize-signup`. Idempotent, one-shot, cookie-authed. Reads `public.users.role` for the current user and writes it to `app_metadata` via the admin API. Refuses to overwrite an existing value.

**When to call it:** after every `signUp`, `signInWithPassword`, `signInWithOAuth`, and `exchangeCodeForSession` success. The signup, login, and OAuth callback flows already do this (fire-and-forget). Adding a new auth flow? Call it once after the session is established.

**Do NOT** trust `user.user_metadata.role` for authorization. It is client-editable.
```

---

- [ ] **Step 4.9: Update `.claude/rules/api-routes.md`**

Find the "At a glance" table in `.claude/rules/api-routes.md`. The rows are sorted by category — the auth row currently has only one entry. Replace the existing row:

```markdown
| GET | `/api/auth/callback` | OAuth/email-link code | server (cookie) | sets session cookie |
```

with two rows:

```markdown
| GET | `/api/auth/callback` | OAuth/email-link code | server (cookie) | sets session cookie |
| POST | `/api/auth/finalize-signup` | cookie session | server + service role | `auth.users.raw_app_meta_data` (admin API) |
```

Then in the "## Auth" section after the existing `/api/auth/callback` entry, append:

```markdown

---

### `POST /api/auth/finalize-signup` (auth required)

Idempotent, one-shot. Mirrors `public.users.role` into `auth.users.raw_app_meta_data.role` so `proxy.ts` can trust the role from the JWT.

**Request body:** none.

```json
// Success (first call)
{ "role": "creator" }

// Success (already mirrored)
{ "already_set": true, "role": "creator" }
```

**Errors:** `401` (no session), `500` (admin API failure).

**Fallback chain for role:** `public.users.role` → `user_metadata.role` → `'buyer'`. The last two cover the race where the DB trigger hasn't created `public.users` yet.

**Refuses to overwrite.** Changing role after the first call requires admin action — not exposed via API.
```

---

- [ ] **Step 4.10: Update `CLAUDE.md`**

In `CLAUDE.md`, find the "Database & Supabase" section under "Absolute Rules — Never Break These". The bullets currently read:

```markdown
- **Never call `createClient()` inside a client component.** Import from `@/lib/supabase/client` (browser) or `@/lib/supabase/server` (server).
- **Never mutate `orders`, `creator_balances`, or `transaction_ledger` from client-side code.** These must only be written via `/api/*` server route handlers.
- **Never use `any` for database rows.** Use types from `types/database.types.ts`.
- **Never bypass RLS.** Every query must go through Row Level Security.
```

Add this bullet at the end of that list:

```markdown
- **Never trust `user_metadata.role` for authorization.** It is client-editable. Read `app_metadata.role` instead (set server-side via `/api/auth/finalize-signup`). See `.claude/rules/security-model.md` → Roles.
```

---

- [ ] **Step 4.11: Final type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: 0 errors. The doc updates don't affect type-checking.

---

- [ ] **Step 4.12: Commit Task 4**

```bash
git add proxy.ts .claude/rules/security-model.md .claude/rules/supabase-reference.md .claude/rules/api-routes.md CLAUDE.md
git commit -m "$(cat <<'EOF'
refactor(proxy): gate getUser behind cookie probe + read role from app_metadata

Reorders proxy.ts to skip Supabase entirely on anonymous traffic, custom
domains, and unguarded paths — cuts middleware overhead from 250-999ms to
~0ms for those requests. Tightens host allowlist (exact matches, not
substring includes) and excludes /api/* from the matcher.

Switches role read from user.user_metadata.role (client-editable, spoofable
via supabase.auth.updateUser) to user.app_metadata.role (server-controlled,
populated by /api/auth/finalize-signup).

Preserves the original query string when redirecting to /login.

Spec: docs/superpowers/specs/2026-06-01-proxy-perf-and-role-storage-design.md §7 step 4

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

Ran checks against the spec:

**Spec coverage:**

| Spec requirement | Implementation task |
|---|---|
| Section 5.1 — new branch order | Task 4 Step 4.1 |
| Section 5.2 — host allowlist | Task 4 Step 4.1 (`isMainDomain` function) |
| Section 5.3 — matcher | Task 4 Step 4.1 (`export const config`) |
| Section 6.2 — `POST /api/auth/finalize-signup` endpoint | Task 1 Step 1.2 |
| Section 6.3 — callers (signup, login, OAuth callback) | Task 2 Steps 2.1, 2.2, 2.3, 2.4 |
| Section 6.4 — backfill SQL | Task 1 Step 1.3 (file) + Task 3 (run) |
| Section 6.5 — `proxy.ts` role read switch | Task 4 Step 4.1 (line `const role = user.app_metadata?.role`) |
| Section 7 — rollout sequence | Task 1 / 2 / 3 / 4 mapping at the top of this plan |
| Section 8 — verification | Task 1 Step 1.5, Task 2 Step 2.6, Task 4 Steps 4.3–4.6 |
| Section 9.4 — doc updates | Task 4 Steps 4.7–4.10 |

All covered.

**Placeholder scan:** No `TBD`, `TODO`, "later". Every code step has complete code. The "// ... rest unchanged ..." marker in Step 2.2 is a literal copy-paste boundary, not a placeholder — surrounding lines are explicitly preserved.

**Type/name consistency:** `finalize-signup` spelled consistently throughout (with hyphen, in both path and prose). `app_metadata` / `user_metadata` capitalization consistent. `isMainDomain`, `redirectToLogin` defined in Step 4.1 and not referenced elsewhere by a different name.

**Assumption flagged:** Section 11 of the spec called out the `public.users` trigger uncertainty. Task 1 Step 1.1 explicitly verifies and Task 1 Step 1.2's endpoint design already has the `user_metadata.role` → `'buyer'` fallback that makes the design robust either way.

---

## Open verification items (from the spec — to confirm during execution)

- Whether a `handle_new_user` trigger exists in Supabase (run grep in Step 1.1).
- That no other code reads `user_metadata.role` (re-grep before Step 4.1; one hit in `proxy.ts` was confirmed at design time).
- That `npm run dev` correctly picks up the new `proxy.ts` after Step 4.1 (Next.js validates the matcher regex at startup — a broken regex fails fast).
