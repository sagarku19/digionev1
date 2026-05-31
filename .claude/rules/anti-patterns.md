---
noteId: "c2f8b5d05a5711f183978dfe119e58b2"
tags: []

---

# What NOT to Do

| Never | Why |
|---|---|
| `createClient()` in client components | Use pre-configured imports from `@/lib/supabase/*` |
| Write to `orders`/`creator_balances` client-side | Revenue integrity — server only |
| Use `any` type | Strict TypeScript is non-negotiable |
| Import from icon libraries other than lucide-react | Consistency |
| Create new CSS files | Extend `globals.css` only |
| Use `useEffect` for data fetching | Use TanStack Query hooks |
| Add `console.log` | Clean production code |
| Call Cashfree from the browser | Security — always via `/api/checkout/*` |
| Install new packages without asking | Intentional stack, no bloat |
| Touch `types/database.types.ts` | Auto-generated — run `npm run update-types` instead |
