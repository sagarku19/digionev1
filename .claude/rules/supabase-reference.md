---
noteId: "39dc85b05cdc11f1b92a4b3b6ebe345a"
tags: []

---

# Supabase Reference

Working reference for editing anything that touches Supabase in DigiOne. Combines the official `@supabase/ssr` + `@supabase/supabase-js` docs with our actual codebase patterns. Read this before changing any client, auth call, or DB query.

> Related: [`env-vars.md`](./env-vars.md), [`security-model.md`](./security-model.md), [`data-patterns.md`](./data-patterns.md), [`google-oauth-reference.md`](./google-oauth-reference.md).

## The three clients

DigiOne wires three Supabase clients. Always import from the wrapper — never call `createClient` from `@supabase/supabase-js` directly in new code.

| Wrapper | File | Used by | Key | RLS |
|---|---|---|---|---|
| Browser | `lib/supabase/client.ts` | Client Components, hooks (`src/hooks/use*.ts`) | anon | enforced |
| Server (cookie) | `lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers needing the logged-in user | anon | enforced |
| Service | `lib/supabase/service.ts` → `createServiceClient()` | `/api/*` Route Handlers writing revenue tables or doing cross-user lookups | service role | **bypassed** |

### Browser client — `lib/supabase/client.ts`

```typescript
import { createClient } from '@/lib/supabase/client';
const supabase = createClient(); // or use the exported `supabase` singleton
```

Built on `createBrowserClient` from `@supabase/ssr`. Reads `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Safe to use in any `'use client'` file.

### Server client — `lib/supabase/server.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();         // note: async
const { data: { user } } = await supabase.auth.getUser();
```

Built on `createServerClient` from `@supabase/ssr`. Wires `cookies()` from `next/headers` so the auth cookie travels with the request. Per Supabase's own SSR docs, the client is lazy — the session is only loaded on first `getUser()`/`getSession()` call.

### Service client — `lib/supabase/service.ts`

```typescript
import { createServiceClient } from '@/lib/supabase/service';
const db = createServiceClient(); // throws if env vars missing
```

**Server-only.** Bypasses RLS. Required for any write to `orders`, `creator_balances`, `transaction_ledger`, plus auth-user → public-user → profile resolution. Has `autoRefreshToken: false`, `persistSession: false` because there is no user session here.

## Auth — `getUser()` vs `getSession()`

| Method | When to use | Network call? | Trusted? |
|---|---|---|---|
| `getUser()` | **Default.** Anywhere you need a verified identity (route guards, API authorization, server components). | Yes — hits the auth server | Yes |
| `getSession()` | **Only** in `proxy.ts` middleware (validated upstream) and in places where the JWT signature is what matters. | No — reads cookie | Only the JWT, not the user metadata |
| `getClaims()` | When you need only token claims (role, id) and want to skip the network call. | No | Yes (JWT-verified) |

DigiOne's rule (see `.claude/rules/anti-patterns.md` and commit `329b528`): **use `getUser()`** in Route Handlers. `getSession()` is allowed only in `proxy.ts` — and is documented there.

## Middleware — `proxy.ts`

The middleware refreshes the session cookie on every request, then enforces route guards by reading `user.user_metadata.role` from the verified JWT (no DB hit).

Cookie handler pattern (already wired in `proxy.ts`):

```typescript
const supabase = createServerClient<Database>(url, anonKey, {
  cookies: {
    getAll() { return request.cookies.getAll(); },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      supabaseResponse = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) =>
        supabaseResponse.cookies.set(name, value, options)
      );
    },
  },
});
```

**Don't** rewrite this from scratch — extend `proxy.ts` if you need new guards.

## Data fetching — pick the right path

| Context | Use | Don't |
|---|---|---|
| Client Component (dashboard) | TanStack Query hook from `src/hooks/use*.ts` | `useEffect` + `supabase.from()` |
| Client Component (storefront, marketing) | TanStack Query hook | Raw queries |
| Server Component | `await createClient()` from `lib/supabase/server.ts` | The browser client |
| Route Handler reading user data | `await createClient()` + `getUser()` then queries (RLS applies) | Service role unless you need to bypass RLS |
| Route Handler writing revenue | `createServiceClient()` | The anon clients |
| Server-side scripts | `createServiceClient()` | The cookie client (no cookies) |

The full hook inventory is in [`hooks-reference.md`](./hooks-reference.md). All TanStack keys follow `[domain, kind, ...identifiers]` so `queryClient.invalidateQueries({ queryKey: ['sites'] })` clears the whole domain.

## Common tasks

### Read the current user in a Route Handler

```typescript
import { createClient } from '@/lib/supabase/server';
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // ... user.id, user.email, user.user_metadata.role
}
```

### Resolve auth user → public user → profile

This three-hop is needed because RLS-protected tables key off `profiles.id`, not `auth.users.id`. Service role only (RLS blocks cross-user reads). Reference: `app/api/sites/create/route.ts:74-114`.

```typescript
const db = createServiceClient();
const { data: publicUser } = await db.from('users').select('id').eq('auth_provider_id', user.id).maybeSingle();
const { data: profile }    = await db.from('profiles').select('id').eq('user_id', publicUser!.id).maybeSingle();
// profile.id is what every other table calls creator_id
```

### Write to a revenue table

Only `/api/*` routes, only via `createServiceClient()`. Include a `record_hash` on every `transaction_ledger` insert. Update `creator_balances` with optimistic concurrency (re-key on the read value). See [`security-model.md`](./security-model.md) → Revenue integrity rules.

### Use the typed Database schema

Types are auto-generated and live in `types/database.types.ts` (do not edit by hand — run `npm run update-types`). Pass the generic:

```typescript
const supabase = createClient<Database>(url, key);
```

Service and server wrappers already do this. The browser wrapper does too. New service-role inlines (cleanup target) often miss it.

### Subscribe to TanStack invalidation

Hooks should follow the existing convention. Example mutation pattern in `useProducts.ts`:

```typescript
const { mutate } = useMutation({
  mutationFn: async (input) => { /* query */ },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
});
```

## Storage

`POST /api/upload` returns a signed upload URL via service role. See [`api-routes.md`](./api-routes.md) → `/api/upload`. Buckets used in DigiOne:

| Bucket | What lives there | Path prefix |
|---|---|---|
| `products` | Product covers, content files | `{timestamp}_{filename}` |
| `public-asset` | Link-in-bio images, avatars | `linkinbio/{timestamp}_{filename}` |

Public URL pattern: `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`.

**Gap:** the upload route has no auth check. Add a session check before exposing publicly.

## Regenerating types

After any Supabase schema change. **Never edit `types/database.types.ts` by hand** — your edit will be wiped the next time types are regenerated.

### Preferred path — `npm run update-types`

```powershell
npm run update-types
```

Wraps `supabase gen types typescript --project-id qcendfisvyjnwmefruba`. Writes to `types/database.types.ts`.

### Windows fallback — Supabase MCP

The `supabase` npx package ships precompiled binaries for `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`. **It has no `win32-x64` binary**, so `npm run update-types` fails on Windows with:

```
Error: No matching Supabase CLI binary package found for win32-x64
```

When you can't run the CLI, use the Supabase MCP to regenerate types instead. Requires an authenticated MCP session (one-time OAuth via `mcp__plugin_supabase_supabase__authenticate`).

```text
# 1. Call the MCP tool — output exceeds context window, gets saved to a
#    tool-results .txt file wrapped in JSON: {"types":"export type Json = ...\n..."}.
mcp__plugin_supabase_supabase__generate_typescript_types
  project_id: qcendfisvyjnwmefruba

# 2. Strip the JSON envelope and write the TS source to the right path.
#    Python (cross-platform) is the most reliable way:
python3 - <<'PY'
import json
src = r"<path-to-mcp-tool-results-file>.txt"
dst = r"types\database.types.ts"
with open(src, 'r', encoding='utf-8') as f:
    payload = json.load(f)
with open(dst, 'w', encoding='utf-8', newline='\n') as f:
    f.write(payload['types'])
PY

# 3. Verify the new types include the schema change just made.
#    For a new RPC named foo_bar:
#    grep -n "foo_bar" types\database.types.ts

# 4. Confirm consumers still compile:
npx tsc --noEmit
```

The tool-results file lives under `C:\Users\<you>\.claude\projects\<project-slug>\<session-id>\tool-results\` — the Bash tool prints the full path after the MCP call returns.

**Why not just `cp` the file?** The MCP output is `{"types":"export type Json = ...\n..."}` — a raw copy gives you a one-line file of escaped JSON, not valid TypeScript. The Python `json.load` + write step strips the envelope.

### Why this matters

`/api/upload`'s subscription quota check (commit `87c2d41`, 2026-06-03) added a new `sum_bucket_bytes_for_prefix` RPC via `apply_migration`. Without regenerating types in the same session, the route's `serviceDb.rpc('sum_bucket_bytes_for_prefix', {...})` call fails tsc with `Argument of type '"sum_bucket_bytes_for_prefix"' is not assignable to parameter of type 'never'`. **Rule:** any time you add a function / table / column via `apply_migration`, regenerate types before continuing.

## Gotchas

- **Client wrapper is sync, server wrapper is async.** `await createClient()` on the server; not on the browser.
- **`getSession()` does not contact the auth server.** Spoofable if you've already accepted the cookie blindly. Use `getUser()` for anything that gates real action.
- **`user_metadata.role`** is read out of the verified JWT in `proxy.ts:68`. For sensitive checks, re-read from the DB inside the route — metadata is not the source of truth.
- **`.single()` throws if 0 or 2+ rows.** Use `.maybeSingle()` when 0 rows is expected.
- **Service client throws at construction** if env vars are missing — fail fast at the route boundary, not deep in business logic.
- **The browser client is exported as a singleton** (`export const supabase = createClient()`) for convenience. Don't pass it around server boundaries; create per-request server clients instead.
- **RLS does not protect what service role writes.** Every service-role write is a place a bug bypasses authz — keep the surface narrow and test these routes specifically.

## Reference

- `@supabase/ssr` API: https://github.com/supabase/ssr
- `@supabase/supabase-js` reference: https://supabase.com/docs/reference/javascript
- Auth flows: https://supabase.com/docs/guides/auth
