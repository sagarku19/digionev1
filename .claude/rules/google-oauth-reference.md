---
noteId: "569769405cdc11f1b92a4b3b6ebe345a"
tags: []

---

# Google OAuth Reference

Working reference for editing the Google sign-in flow. DigiOne uses Supabase Auth's Google provider with the PKCE flow handed off through our `/api/auth/callback` route.

> Related: [`supabase-reference.md`](./supabase-reference.md), [`security-model.md`](./security-model.md), [`env-vars.md`](./env-vars.md).

## Flow at a glance

```
[/login or /signup]                       (client)
   └─ supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/api/auth/callback', queryParams } })
       ↓
   [accounts.google.com consent screen]   (Google)
       ↓
   GET /api/auth/callback?code=<auth_code>  (server)
       └─ supabase.auth.exchangeCodeForSession(code)  →  sets sb-* cookies
       ↓
   302 → /dashboard (or ?next=...)         then proxy.ts decides where to land
```

Underlying spec: OAuth 2.0 Authorization Code flow with **PKCE**. Supabase generates the code verifier in the browser, stores it, and exchanges it server-side when you call `exchangeCodeForSession`.

## Code paths in this repo

| File | Role |
|---|---|
| `app/(auth)/login/page.tsx:120-134` | `handleGoogleLogin` — calls `signInWithOAuth` |
| `app/(auth)/signup/page.tsx:52-59` | `handleGoogleSignup` — same call, signup label |
| `app/api/auth/callback/route.ts` | Exchanges code → session, redirects to `next` or `/login` on failure |
| `proxy.ts:34-75` | Reads `user_metadata.role` from JWT, gates `/dashboard/*` and `/account/*` |

## Initiating the OAuth flow (client)

The exact call used in both `login` and `signup`:

```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/api/auth/callback`,
    queryParams: { access_type: 'offline', prompt: 'consent' },
  },
});
```

Why each option:

| Option | Why |
|---|---|
| `redirectTo` | Tells Supabase where to land after the OAuth round-trip. **Must** point at our callback route, not at a page — we need server-side code exchange. |
| `access_type: 'offline'` | Asks Google to return a refresh token. Without this, the session can't be silently refreshed after expiry. |
| `prompt: 'consent'` | Forces Google to re-show the consent screen (and re-issue a refresh token) even for returning users. Safe default. |

If `error` is non-null the redirect never happened — surface it inline. Don't `setGoogleLoading(false)` on success; the browser will navigate away.

## Handling the callback (server)

`app/api/auth/callback/route.ts`:

```typescript
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=...`);
}
```

Three rules:

1. **`exchangeCodeForSession` must run on the server with the cookie-bound client** (`lib/supabase/server.ts`). It writes the `sb-*` auth cookies on the response. If you call it from the browser client, the cookies don't get set on the right surface.
2. **Always honor `?next=`** if present (capped to same-origin paths in stricter setups — DigiOne currently trusts it).
3. **Never log the `code`** — it's a short-lived single-use credential.

## Roles after sign-in

Supabase OAuth doesn't know about DigiOne's `buyer` / `creator` / `super_admin` distinction. Strategies in use:

- **Email/password signup** sets `options.data: { full_name, role }` so the role goes straight into `user_metadata`. Reference: `app/(auth)/signup/page.tsx:66-69`.
- **Google signup** does not set a role at sign-up time. The user lands in the callback with no role in metadata, gets bounced by `proxy.ts:70` if they try to hit `/dashboard`.

**Implication:** If you add a "Sign up with Google" creator path, you must either:
- Add a post-callback role-selection step before redirecting to `/dashboard`, OR
- Set the role via a server-side `supabase.auth.admin.updateUserById(user.id, { user_metadata: { role: 'creator' } })` call from the callback (requires service role).

Currently neither is wired — Google signups default to buyer.

## What's in the JWT

After successful sign-in the user object looks like:

```jsonc
{
  "id": "uuid",
  "email": "user@gmail.com",
  "app_metadata": { "provider": "google", "providers": ["google"] },
  "user_metadata": {
    "avatar_url": "...",
    "full_name": "User Name",
    "iss": "https://accounts.google.com",
    "picture": "...",
    "provider_id": "1234...",
    "sub": "1234...",
    "email": "user@gmail.com",
    "email_verified": true
    // role is NOT here unless we put it there
  },
  "identities": [{ "provider": "google", "identity_data": { ... } }]
}
```

- **`app_metadata`** is server-controlled — safe for authorization data once we start setting it.
- **`user_metadata`** is client-editable — `role` lives here today but should move to `app_metadata` if we ever expose `updateUser`.

## Supabase dashboard config (one-time)

For each environment (sandbox project + prod project):

1. **Authentication → Providers → Google** → enable
2. Paste **Google Client ID** + **Client Secret** from Google Cloud Console (OAuth 2.0 Client of type "Web application")
3. **Authentication → URL Configuration**:
   - **Site URL:** `https://digione.ai` (prod) or `http://localhost:3000` (dev)
   - **Redirect URLs:** add every domain we want to allow back, e.g. `https://digione.ai/api/auth/callback`, `http://localhost:3000/api/auth/callback`, all Vercel preview origins
4. In **Google Cloud Console → APIs & Services → Credentials**:
   - **Authorized redirect URIs** must include `https://<project-ref>.supabase.co/auth/v1/callback` (Supabase is the OAuth client to Google; Google calls back to Supabase, which then calls back to us)

If `signInWithOAuth` redirects to Google and Google immediately bounces with `redirect_uri_mismatch`, fix step 4. If Google returns to us but `exchangeCodeForSession` throws `invalid_grant`, fix step 3.

## Cookies set by Supabase

After a successful exchange, the auth state lives in a single cookie:

- `sb-{project-ref}-auth-token` — chunked if large (`.0`, `.1`, ...). Base64url-encoded. Contains the access token + refresh token + (default) the user object.

`proxy.ts` refreshes this on every request. Don't manually `cookies().delete()` it on logout — call `supabase.auth.signOut()`, which clears it via the cookie handlers.

## Common tasks

### Add a new OAuth provider

1. Add provider in Supabase dashboard (Authentication → Providers).
2. Add a button in `login/page.tsx` and `signup/page.tsx` calling `signInWithOAuth({ provider: '<name>' })`.
3. **No callback changes needed** — `/api/auth/callback` is provider-agnostic.

### Sign out

```typescript
await supabase.auth.signOut();
window.location.href = '/login';
```

Clears the cookies through the configured handlers. The next middleware run sees no user.

### Read the user on the server

```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

Don't trust `user_metadata.role` for revenue-touching actions — re-read from the DB.

## Gotchas

- **`signInWithOAuth` returns immediately with a redirect URL but doesn't navigate.** Setting `setLoading(false)` after a successful call rapidly hides the spinner before the browser starts the redirect. Only set loading false in the error branch.
- **PKCE state is stored in `sessionStorage`.** A page reload or new tab between "click Google" and the callback will fail with `invalid_grant`. Don't open the consent screen in a new tab.
- **`?next=` is server-trusted.** If you ever accept it from a user-controlled source, validate it's a same-origin path before redirecting (open-redirect risk).
- **Multiple Vercel preview URLs.** Every preview origin must be in Supabase's Redirect URLs list, OR Google's allowlist for the Supabase callback. The cleaner pattern is to use the project's canonical URL via `NEXT_PUBLIC_APP_URL` and route through there.
- **Email collision.** If a user previously signed up with email/password and then clicks "Continue with Google" using the same email, Supabase will (by default) link the identities. If you've changed that setting, the second sign-in throws.
- **Google's offline access has limits.** Refresh tokens can be silently revoked. Re-prompting consent on next sign-in is fine; relying on offline refresh forever is not.

## Reference

- Supabase OAuth guide: https://supabase.com/docs/guides/auth/social-login/auth-google
- PKCE flow explained: https://supabase.com/docs/guides/auth/sessions/pkce-flow
- `signInWithOAuth` reference: https://supabase.com/docs/reference/javascript/auth-signinwithoauth
- `exchangeCodeForSession` reference: https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession
