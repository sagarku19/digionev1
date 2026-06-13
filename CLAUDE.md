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

## Reference Files

Files in `.claude/rules/` are **auto-loaded by Claude Code** on every session.

| File | Read when |
|---|---|
| `.claude/rules/agent-roles.md` | Assigning work across agents or checking which agent owns a file |
| `.claude/rules/mcp-tools.md` | Exploring the codebase — pick the right graph tool before grepping |
| `.claude/rules/feature-checklists.md` | Adding a new dashboard feature, storefront section, or fixing a bug |
| `.claude/rules/hooks-reference.md` | You need data in a client component and are unsure which hook to use |
| `.claude/rules/data-patterns.md` | Writing data fetching code in any component or route handler |
| `.claude/rules/anti-patterns.md` | About to do something that feels like it might be wrong — check here first |
| `.claude/rules/env-vars.md` | Adding, removing, or reading an environment variable |
| `.claude/rules/security-model.md` | Touching `app/api/`, `proxy.ts`, RLS, or any revenue table (`orders`, `creator_balances`, `transaction_ledger`) |
| `.claude/rules/api-routes.md` | Adding a new route handler, or calling an existing one from a hook |
| `.claude/rules/supabase-reference.md` | Editing any Supabase client, auth call, RLS query, or storage upload |
| `.claude/rules/google-oauth-reference.md` | Editing the Google sign-in flow, `/api/auth/callback`, or anything that depends on `user_metadata.role` |
| `.claude/rules/cashfree-reference.md` | Editing checkout, the Cashfree webhook, payment status pages, or the browser checkout SDK |
| `.claude/rules/dashboard-design.md` | Building or modifying any page under `app/dashboard/**`, or any component in `src/components/dashboard/**` or `src/components/ui/**` — the dashboard design language (tokens, primitives, page anatomy, light + dark) |
| `.claude/rules/ledger-design.md` | Building or modifying any marketing (`app/(marketing)/**`), auth (`app/(auth)/**`), or account (`app/account/**`) surface, the shared `MarketingNav`/`MarketingFooter` chrome — or porting the engineered-ledger language (rails, `>>` kickers, ink/vermilion/paper, flat mockups) to new surfaces, including dashboard redesigns |

## Deferred Work — `.claude/todo-later/`

Items consciously punted from earlier sessions live here as `N(status)-YYYY-MM-DD-<topic>.md`, where `N` is the order added (1 = oldest) and `status` is the file's current state: **`(left)`** = open/not started, **`(half)`** = partially done, **`(done)`** = complete. Keep the status tag current — when work on a file finishes or progresses, `git mv` it to the new tag and fix references (they're inline-code paths, so a scoped find/replace works). **Not** auto-loaded — read them only when picking up that topic again or when the user asks "what's left on X."

| File | What |
|---|---|
| `.claude/todo-later/1(left)-2026-06-03-storage-followups.md` | 12 deferred items for `/api/upload`, `/api/deliverables/*`, `/api/private/download`, bucket policies. Read when touching any of those routes/buckets or asking "what's left on storage?" |
| `.claude/todo-later/5(done)-2026-06-13-db-production-audit.md` | **The current DB audit.** Live-state production-readiness review (post-RLS rollout): table structure, FKs, indexes, RLS, functions/triggers, auth flow, referral system, payout logic, admin permissions — with a severity-ordered punch-list. Read for any DB/schema/RLS/money-path work. Supersedes the removed 2026-06-03 audits (see `supabase/CLEANUP-2026-06-13.md`). |
| `.claude/todo-later/6(left)-2026-06-14-post-dashboard-followups.md` | **Deferred DB hardening + maturity backlog** (user picks up after dashboard work): staging branch, money-route tests + CI, drop/build the ~20 dead tables, naming + enum cleanup, the coupon-create identity bug, scale/ops. Read when resuming DB hardening or asking "what's left on the DB?". |

---

## Project Structure

```
digionev1/
├── app/
│   ├── (auth)/                   # Login, signup, password reset
│   ├── (marketing)/              # Public landing pages, blog, pricing
│   ├── (storefront)/             # Creator public pages (link-in-bio, store, product, pay, upsells)
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
│   │   ├── settings/             # Profile, billing, subscription
│   │   └── …                     # autodm, help, integration, media, notifications, payouts
│   ├── api/                      # Server-side route handlers — 14+ routes (partial list)
│   │   ├── checkout/             # Cashfree payment creation
│   │   ├── webhook/cashfree/     # Payment confirmation (source of truth)
│   │   ├── upload/               # Supabase Storage
│   │   └── …                     # auth, sites, leads, coupons, payouts, products, linkinbio
│   └── …                         # account, actions, payment
├── src/
│   ├── components/
│   │   ├── dashboard/            # Dashboard UI (Sidebar, TopBar, editors)
│   │   ├── storefront/           # Public creator page components
│   │   ├── marketing/            # Landing page sections
│   │   ├── store/                # Shared (ProductCard, CartButton)
│   │   ├── ui/                   # Atomic primitives (DataTable, SideDrawer, etc.)
│   │   └── assets/               # Shared SVG/image assets (DigiOneLogo, etc.)
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
- **Keep the schema in sync with the code.** When you edit code, add a feature, or change behavior and it needs a new table/column/constraint/index/RLS policy — make that DB change too, in the same change-set. Do not work around a missing column with `as any`, JSON `metadata` stuffing, or a client-side hack. The correct order: (1) write the migration (idempotent SQL → `supabase/migrations/`, apply via the Supabase MCP since the Windows CLI is broken), (2) regenerate types (`npm run update-types`, or the MCP fallback in `.claude/rules/supabase-reference.md`), (3) then write the code against the new types. New tables in the `public` schema MUST get RLS enabled + a policy before they ship. See `docs/db/schema-reference.md` for the current schema and `docs/db/money-path.md` for the money tables.

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

## Running the Project

```bash
npm run dev          # Dev server → http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run update-types # Regenerate Supabase types from schema
```
