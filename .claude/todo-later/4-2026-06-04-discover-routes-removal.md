---
noteId: "0a4c0f205f8211f1b5532decc08dd652"
tags:
  - "api-routes"
  - "refactor"
  - "discover"
  - "server-components"

---

> **DONE 2026-06-13.** Both `/api/discover` and `/api/discover/[productId]` routes deleted. `useDiscoverProduct` hook deleted. The `/discover` pages stayed as Client Components querying Supabase directly via the browser client (not Server Components) — same security and cost outcome since public RLS allows anon reads.

# `/api/discover*` Removal / Inlining

Captured 2026-06-04 after auditing whether the public discover routes earn their keep. **Verdict: they don't.** Deferred — not blocking, no security bug, but every `/discover` page view pays an unnecessary HTTP hop and an over-privileged service-role query.

## Routes in question

| Route | File | Service role? | Auth? |
|---|---|---|---|
| `GET /api/discover` | `app/api/discover/route.ts` | yes (`:4`) | none |
| `GET /api/discover/[productId]` | `app/api/discover/[productId]/route.ts` | yes (`:4`) | none |

## Why they are unnecessary

Every query in both routes is covered by existing public RLS:

- `products_select_published` (`supabase/migrations/20260602000000_rls_policies.sql:217-220`) grants `anon` SELECT where `is_published = true AND deleted_at IS NULL` — matches every filter in both routes.
- `profiles_select_public` (`:58-59`) is open to `anon`, so the `profiles!fk_products_creator` join works with the anon key.
- No mutations, no signed URLs, no cross-tenant lookups, no rate limiting, no caching headers, no auth. The route handler adds zero behavior the anon key + RLS doesn't already provide.

The service-role client (`createServiceClient()` at `:4` in both files) is **over-privileged** for this access pattern. It bypasses RLS to do something RLS already allows, and the module-scope singleton throws at import time if `SUPABASE_SERVICE_KEY` is missing — a footgun a Server Component using `@/lib/supabase/server.ts` avoids.

Also: error envelopes at `route.ts:38-40` and `[productId]/route.ts:61-63` leak raw Supabase `error.message` to the client. Typed SC fetches sidestep this.

## What to do when picking this up

1. Find the consuming pages — likely `app/(marketing)/discover/page.tsx` and the product detail page (confirm via Glob).
2. Inline the queries from `app/api/discover/route.ts:13-34` into the `/discover` Server Component using `createClient()` from `@/lib/supabase/server.ts`.
3. Inline the three queries from `app/api/discover/[productId]/route.ts:14-54` (product + related + creatorProducts) into the product detail Server Component.
4. Decide the fate of `useDiscoverProduct(productId)` (`.claude/rules/hooks-reference.md`):
   - If the page becomes a pure SC: delete the hook, pass props.
   - If parts stay client-rendered: repoint the hook at a direct browser-client Supabase query (RLS allows anon read).
5. Delete both route files.
6. Update `.claude/rules/api-routes.md` — remove the two `/api/discover*` rows from the at-a-glance table and the dedicated sections.
7. Update `.claude/rules/hooks-reference.md` if `useDiscoverProduct` shape changes or goes away.
8. `npx tsc --noEmit` + `npm run lint`.

## Edge cases worth noting before refactor

- Related-products query (`[productId]/route.ts:33-44`) uses `.or('category.eq.X,creator_id.eq.Y')`. PostgREST `.or()` works from the anon client — no behavior change.
- Creator-own list (`:47-54`) intentionally **omits** `is_on_discover_page` (lists all published products by that creator, even non-discover ones). Preserve this.
- Main list (`route.ts:26-32`) uses `ilike('name', '%q%')` for search. Trivial to inline; if search ever needs ranking or fuzzy matching, that's the moment to reconsider a route handler.

## When the route would actually be justified

Skip the deletion and keep the routes if you decide to add any of:

- Server-side ranking / personalization for "related" or main feed.
- Rate limiting on public search (`?q=`) to prevent enumeration.
- Server-side caching (`Cache-Control`, `revalidate`) you don't want to duplicate across SC callsites.
- Analytics side-effects on view.

None of these exist today.
