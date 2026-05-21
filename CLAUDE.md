# DigiOne — Claude Code Team Handbook

You are working on **DigiOne**, a SaaS platform for Indian creators to sell digital products, manage storefronts, and grow their audience. Read this entire file before every session. These rules are non-negotiable.

---

## What DigiOne Is

DigiOne is a creator monetization platform. Creators sign up, build a storefront, upload digital products (ebooks, templates, courses, presets), and sell them. Buyers discover and purchase through creator storefronts. Payments go through **Cashfree** (Indian gateway). Currency is always **INR (₹)**.

| User Type | Description |
|---|---|
| **Creator** | Authenticated user who sells products and manages their dashboard |
| **Buyer** | Anonymous or logged-in user purchasing from a storefront |
| **Admin** | Platform-level access (Supabase RLS-gated) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict mode, no exceptions) |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| State | Zustand + TanStack Query v5 |
| Payments | Cashfree SDK |
| Icons | lucide-react **only** |
| Animation | framer-motion |
| Charts | recharts |
| Drag & Drop | @dnd-kit |
| Image Crop | react-easy-crop |

---

## Project Structure

```
digionev1/
├── app/
│   ├── (auth)/                   # Login, signup, password reset
│   ├── (marketing)/              # Public landing pages, blog, pricing
│   ├── (storefront)/             # Creator public pages (link-in-bio, store, product pages)
│   ├── (buyer)/                  # Checkout and cart experience
│   ├── dashboard/                # Authenticated creator CRM
│   │   ├── analytics/
│   │   ├── products/             # Product management + upsells
│   │   ├── sites/                # Storefront builder
│   │   ├── earnings/
│   │   ├── customers/
│   │   ├── orders/
│   │   ├── marketing/            # Coupons, affiliates, leads, referrals
│   │   ├── automation/           # Email, WhatsApp, Telegram, Google Sheets
│   │   └── settings/             # Profile, billing, subscription
│   └── api/                      # Server-side route handlers only
│       ├── checkout/             # Cashfree payment creation
│       ├── webhook/cashfree/     # Payment confirmation (source of truth)
│       └── upload/               # Supabase Storage
├── src/
│   ├── components/
│   │   ├── dashboard/            # Dashboard UI (Sidebar, TopBar, editors)
│   │   ├── storefront/           # Public creator page components
│   │   ├── marketing/            # Landing page sections
│   │   ├── store/                # Shared (ProductCard, CartButton)
│   │   └── ui/                   # Atomic primitives (DataTable, SideDrawer, etc.)
│   ├── hooks/                    # All TanStack Query hooks
│   ├── lib/                      # Supabase clients, utilities, theme helpers
│   ├── contexts/                 # React contexts (DashboardThemeContext)
│   └── types/                    # database.types.ts (auto-generated — never edit)
├── types/
│   └── database.types.ts         # Supabase schema types — source of truth
└── supabase/                     # Config and migrations
```

---

## Absolute Rules — Never Break These

### Database & Supabase
- **Never call `createClient()` inside a client component.** Import from `@/lib/supabase/client` (browser) or `@/lib/supabase/server` (server).
- **Never mutate `orders`, `creator_balances`, or `transaction_ledger` from client-side code.** These must only be written via `/api/*` server route handlers.
- **Never use `any` for database rows.** Use types from `types/database.types.ts`.
- **Never bypass RLS.** Every query must go through Row Level Security.

### TypeScript
- Strict mode always. Zero `any` without a documented reason.
- Never redefine types that exist in `database.types.ts`.
- Use discriminated unions for variants (site types, product types, etc.).

### Styling
- Tailwind CSS only. Never create new CSS files — extend `globals.css` only.
- Dashboard UI must use CSS variables: `var(--bg-primary)`, `var(--bg-secondary)`, `var(--border)`. Never hardcode hex colors in dashboard components.
- Storefront UI must use creator variables: `var(--creator-primary)`, `var(--creator-text)`, `var(--creator-bg)`, etc.
- Dark mode via `dark:` Tailwind prefix. Dashboard dark mode is on `#dashboard-root.dark`.
- Icons: `lucide-react` only. Any other icon library is a hard NO.

### Currency & Formatting
- Prices always in **INR with ₹ symbol**: `₹1,234` (Indian number system).
- Never show decimal paise unless explicitly required.

### API Routes
- `/api/*` routes are server-only. Never import them into client components.
- Payment flows always go through `/api/checkout/*`. Never call Cashfree from the browser.
- `/api/webhook/cashfree` is the single source of truth for payment confirmation. Never confirm payments elsewhere.

### Code Quality
- No `console.log` in production code.
- No `useEffect` for data fetching — use TanStack Query hooks.
- No new packages without asking first.
- No comments explaining what code does — write self-documenting names instead.

---

## Data Fetching Patterns

### Client Components (dashboard)
```typescript
// Always use TanStack Query via custom hooks — never raw Supabase in components
const { products } = useProducts();
const { profile } = useCreator();
const { unreadCount } = useNotifications();
```

### Server Components (storefront, marketing)
```typescript
// Server supabase client is correct here
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
```

### Route Handlers (API)
```typescript
import { createClient } from '@/lib/supabase/server';
// server client only — never browser client in route handlers
```

---

## Key Hooks Reference

| Hook | Returns |
|---|---|
| `useCreator()` | `{ profile }` — authenticated creator's profile |
| `useProducts()` | `{ products }` — creator's product list |
| `useNotifications()` | `{ unreadCount, notifications }` |
| `useOrders()` | `{ orders }` |
| `useEarnings()` | `{ earnings, stats }` |
| `useCustomers()` | `{ customers }` |
| `useSites()` | `{ sites }` — creator's storefront sites |
| `useStorefront(slug)` | Storefront data for a given slug |
| `useCart()` | Cart state for buyer checkout |
| `useAnalytics()` | Analytics data |
| `useCoupons()` | Coupon management |
| `useAffiliates()` | Affiliate program data |

---

## Component Patterns

### Dashboard component shell
```typescript
'use client';
// 1. React imports
// 2. Next.js imports (Link, useRouter, etc.)
// 3. Third-party (lucide-react, framer-motion)
// 4. Internal hooks (@/hooks/*)
// 5. Internal components (@/components/*)
// 6. Types

export default function MyComponent() {
  // hooks first
  // local state
  // derived values
  // event handlers
  // return JSX
}

// Small sub-components go at the bottom of the same file (not separate files)
```

---

## Theming System

### Dashboard (light/dark)
- Provider: `DashboardThemeProvider` in `src/contexts/DashboardThemeContext.tsx`
- Persisted in `localStorage` as `'dashboard-theme'`
- Applied as `.dark` class on `#dashboard-root` and `<html>`
- Hook: `useTheme()` → `{ theme, setTheme }`
- CSS vars defined in `globals.css` under `:root` and `.dark`

### Storefront (per-creator)
- Fetched from `site_design_tokens` table in Supabase
- Injected as inline `<style>` on storefront layout
- Variables: `--creator-primary`, `--creator-secondary`, `--creator-accent`, `--creator-surface`, `--creator-text`, `--creator-text-muted`, `--creator-bg`
- Helper: `src/lib/storefront-theme.ts` → `getStorefrontTheme(siteId)`

### Brand
- DigiOne brand red: **`#E83A2E`** — CTAs, badges, active states, avatar backgrounds only.

---

## Storefront Site Types

| Type | URL | Description |
|---|---|---|
| Link-in-Bio | `/link/[username]` | Social profile with product links |
| Single Page | `/site/[slug]` | Full sales page with sections |
| Store | `/store/[slug]` | Product grid store |

Each type has its own editor under `src/components/dashboard/site-edit/tabs/`.

---

## Payment Flow

```
Buyer clicks "Buy"
  → POST /api/checkout/create   (server creates Cashfree order)
  → Cashfree payment page
  → POST /api/webhook/cashfree  (Cashfree confirms payment server-side)
  → DB: orders + creator_balances updated
  → Buyer redirected to /payment/status
```

Never short-circuit this. Never confirm payments client-side.

---

## Agent Roles (for parallel tasks)

Each agent owns one domain. Agents must not touch files outside their domain.

### Frontend Agent
**Owns:** `src/components/`, `app/(marketing)/`, `app/(auth)/`, `app/globals.css`
**Job:** UI components, layouts, responsiveness, animations, accessibility
**Never:** Database queries, API route changes, imports from other icon libraries

### Dashboard Agent
**Owns:** `app/dashboard/`, `src/components/dashboard/`
**Job:** Creator CRM — products, analytics, earnings, settings, site builder
**Never:** Direct Supabase calls in components (use hooks), hardcoded colors (use CSS vars)

### Storefront Agent
**Owns:** `app/(storefront)/`, `src/components/storefront/`, `src/components/store/`
**Job:** Public creator pages, checkout UX, product display, theme rendering
**Never:** Dashboard imports, hardcoded colors (use `var(--creator-*)`)

### Backend Agent
**Owns:** `app/api/`, `src/lib/`, `supabase/`
**Job:** API routes, Supabase queries, Cashfree integration, webhooks
**Never:** Expose secrets to client, skip input validation, use browser Supabase client

### Review Agent
**Owns:** Everything (read-only)
**Job:** Audit for TS errors, security issues, broken rules, UX regressions
**Output format:** `FILE → LINE → PROBLEM → SUGGESTED FIX` — one line per issue

---

## How to Add a New Feature (checklist)

### New dashboard feature
1. `app/dashboard/[feature]/page.tsx` — page
2. `src/hooks/use[Feature].ts` — TanStack Query hook
3. `src/components/dashboard/` — UI components
4. `src/components/dashboard/Sidebar.tsx` — add nav link
5. `app/api/[feature]/route.ts` — any data mutations

### New storefront section
1. `src/components/storefront/sections/` — component
2. `src/components/dashboard/site-edit/section-defs.ts` — register it
3. `src/components/storefront/SectionRenderer.tsx` — add case
4. Add editor tab if user needs to configure it

### Bug fix
1. Find the exact file and line
2. Fix only that — no surrounding cleanup or refactoring
3. Run `npx tsc --noEmit` to confirm TypeScript passes

---

## MCP Tools: code-review-graph

**Use the knowledge graph BEFORE Grep/Glob/Read when exploring the codebase.** It is faster, uses fewer tokens, and provides structural context (callers, dependents, test coverage) that file scanning cannot.

| Tool | Use when |
|---|---|
| `semantic_search_nodes` | Finding functions/classes by name or concept |
| `query_graph` | Tracing callers, callees, imports, tests |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `get_architecture_overview` | High-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

Fall back to Grep/Glob/Read only when the graph doesn't cover what you need. The graph auto-updates on file changes via hooks.

---

## What NOT to Do

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

---

## Running the Project

```bash
npm run dev          # Dev server → http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run update-types # Regenerate Supabase types from schema
```
