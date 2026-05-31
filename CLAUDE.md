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
│   │   └── …                     # auth, sites, leads, coupons, payouts, discover, products, linkinbio
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
- **`proxy.ts` intentionally uses `getSession()` (not `getUser()`) for routing** — the "insecure user" console warning is expected. Sensitive server reads must still call `getUser()`.

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
