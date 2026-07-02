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

The middleware refreshes the session cookie on every request, then enforces route guards by reading `user.app_metadata.role` from the verified JWT (no DB hit). `app_metadata` is server-controlled; `user_metadata` is client-editable and must never gate access.

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

File storage has moved from Supabase Storage → **Cloudflare R2** (S3-compatible). Supabase Storage is no longer used. The old dead file subsystem (`storage_file_usages`, `media_library`, `product_files`, `product_licenses`, `storage_provider_type` enum) was dropped; `storage_files` was recreated as the single bucket-aware metadata table. The `sum_bucket_bytes_for_prefix` RPC is **retired** — quota is now a `SELECT sum(size)` query against `storage_files`.

**Provider abstraction:** all storage calls go through `src/lib/storage/index.ts` (exports the `storage` provider + helpers). Concrete implementation: `src/lib/storage/r2.ts`. Routes never import the aws-sdk directly.

**`kyc_documents` (Phase 2):** links a creator's uploaded KYC files (`storage_files` rows, `kind='kyc'`, `bucket=creator-private`) to their KYC by `doc_type` (`pan_card`/`bank_proof`/`aadhaar`). Cols: `id, creator_id → profiles, file_id → storage_files, doc_type, created_at`. RLS: creator INSERT/SELECT-own + super_admin SELECT; no client UPDATE/DELETE. Written via `POST /api/kyc/documents` after the upload→confirm flow. Admin views docs via the terminal `scripts/kyc-admin.ts view` (signed URLs + `kyc_access_log`) — no admin UI in this app (see `.claude/todo-later/12(left)-…admin-app`).

**`storage_files` metadata table (single source of truth):**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `owner_id` | uuid | `profiles.id` (creator) |
| `bucket` | text | logical bucket name (`creator-content`, `creator-private`, etc.) |
| `object_key` | text | `{creator_id}/{...}/{ts}_{filename}` |
| `file_name` | text | Original filename |
| `mime_type` | text | |
| `size` | bigint | Bytes |
| `visibility` | text | `private` or `public` |
| `kind` | text | `cover`, `avatar`, `deliverable`, `kyc`, `contract`, `banner`, `other` |
| `product_id` | uuid? | FK `products(id)` when applicable |
| `parent_file_id` | uuid? | Set on derivative (cropped) files; originals are NULL |
| `crop` | jsonb? | Saved crop params for derivatives |
| `created_at` | timestamptz | |
| `deleted_at` | timestamptz? | Soft-delete for derivatives; hard-delete for originals cascades to derivatives |

Partial unique: `(bucket, object_key) WHERE deleted_at IS NULL`.

RLS: owner SELECT (`owner_id = current_profile_id()`) + super_admin SELECT. Writes are **service-role only** (no creator INSERT/UPDATE/DELETE policy). Helpers in `src/lib/storage/files.ts`, including `sumOwnerBytes(ownerId)` for quota.

See [`api-routes.md`](./api-routes.md) → Storage section for the full upload/media/download route reference, and [`env-vars.md`](./env-vars.md) → Cloudflare R2 for env var inventory.

## Subscriptions & platform fee

`subscription_plans` (free/plus/pro — `platform_fee_percent`, monthly/yearly price, `features` jsonb `string[]`) and `subscriptions` (the creator's active plan — `current_platform_fee_percent` **snapshotted** at activation, `status`, `renewal_date`, `billing_cycle`) are wired as of Phase 3.

- **Platform fee is subscription-driven.** `getPlatformFeeRate(creatorId)` in `src/lib/server/platform-fee.ts` reads the creator's active `subscriptions` row and returns its snapshotted `current_platform_fee_percent / 100`. It **fails safe to Free 0.10** (the higher fee) on no-sub / expired (`renewal_date < now`) / error — never under-charges. The pure core `resolveFeeRate(row)` is unit-tested. This one function tiers the whole money path (`fulfillOrder`/`fulfillPaymentLinkSubmission`), so a Plus creator's sale splits at 7% and Pro at 5%.
- **Activation is service-role / terminal for now.** `scripts/subscription-admin.ts` (`view`/`activate`/`cancel`, run via `npx tsx --env-file=.env.local`) uses the shared `src/lib/server/subscription.ts` (`activateSubscription`/`cancelSubscription` + pure `subscriptionRowFromPlan`). One active sub per creator (activation supersedes any prior active row). Real PG/recurring billing is deferred — the `activateSubscription` lib is the seam a future billing webhook reuses.
- **RLS:** `subscriptions` SELECT-own (`creator_id = current_profile_id()`) + super_admin SELECT, **writes service-role only**; `subscription_plans` readable by `authenticated` (the picker reads it via the browser client). Client hooks: `useSubscription` / `useSubscriptionPlans` (`src/hooks/creator/useSubscription.ts`).

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
- **`app_metadata.role`** is read out of the verified JWT in `proxy.ts` (server-controlled, set by `/api/auth/callback`). RLS additionally exposes a read-everything `super_admin` tier via `public.is_super_admin()`. For sensitive writes, re-read from the DB / use service-role — JWT metadata gates reads, not money writes.
- **`.single()` throws if 0 or 2+ rows.** Use `.maybeSingle()` when 0 rows is expected.
- **Service client throws at construction** if env vars are missing — fail fast at the route boundary, not deep in business logic.
- **The browser client is exported as a singleton** (`export const supabase = createClient()`) for convenience. Don't pass it around server boundaries; create per-request server clients instead.
- **RLS does not protect what service role writes.** Every service-role write is a place a bug bypasses authz — keep the surface narrow and test these routes specifically.

## Reference

- `@supabase/ssr` API: https://github.com/supabase/ssr
- `@supabase/supabase-js` reference: https://supabase.com/docs/reference/javascript
- Auth flows: https://supabase.com/docs/guides/auth
