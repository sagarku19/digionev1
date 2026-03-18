# DigiOne — Agent Rules

## Project
DigiOne is a SaaS platform for Indian digital creators.
Stack: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4,
Framer Motion, Zustand, Supabase (PostgreSQL + Auth + Storage), Cashfree.

## Non-negotiable rules
- NEVER write `createClient()` in a component — always import from `lib/supabase/client.ts`
- NEVER hardcode Supabase URL or keys — always use `process.env.NEXT_PUBLIC_SUPABASE_URL`
- NEVER write to `creator_balances`, `transaction_ledger`, or `orders` from the browser client
  → These tables have no client-write RLS policies. All writes go through `/api/*` Route Handlers
- NEVER use `supabase.auth.admin.*` in client components — server-only via service role key
- ALL currency is INR. Format as `₹X,XXX` (Indian number formatting)
- ALL database column names come from `src/types/database.types.ts` — never guess column names

## File conventions
- Components: `src/components/{domain}/{ComponentName}.tsx`
- Hooks: `src/hooks/use{Resource}.ts`
- API routes: `app/api/{resource}/route.ts`
- Types: extend `src/types/database.types.ts`, never redefine base types
- Styles: Tailwind utility classes only — no inline style objects except for dynamic CSS variables

## Code style
- TypeScript strict mode — no `any`, no non-null assertions without comment explaining why
- Every async function must have try/catch with typed error handling
- All Supabase queries must handle both `data` and `error` return values
- React Query for server state, Zustand for client/UI state — never mix
- Every new file must have a 2-line comment at top: what it does + which DB tables it touches

## Reference docs (read before building the relevant feature)
- Design spec: docs/digione_dashboard_design.md (dashboard pages §3-26)
- Public pages spec: docs/digione_public_pages_design.md (all public pages §2-24)
- Schema: docs/digione_complete.sql (72 tables, full column reference)
- PRD: docs/digione_prd.docx (product requirements)
