# DigiOne — Claude Code Team Handbook

You are working on **DigiOne**, a SaaS platform for Indian creators to sell digital products, manage storefronts, and grow their audience. Read this entire file before every session. These rules are non-negotiable.

> **Resuming after a break or a killed terminal?** Read **`WORKLOG.md`** first (local, **git-ignored** — create it if absent) — it has the current state (branch, unpushed commits, in-flight work, immediate next steps) plus a dated session log. Update it freely after each chunk of work; it's intentionally untracked, so no commits needed.

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
| Storage | Cloudflare R2 (S3-compatible) via @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner |
| Image Processing | sharp (image → WebP on upload) |
| PDF generation | @react-pdf/renderer (server-side invoices + tax statements) |
| Email | Resend (transactional — buyer purchase confirmations) |
| QR codes | qrcode.react (site-editor share/QR modal) |
| Testing | Vitest (unit + DB-backed integration) · Playwright (E2E: smoke, auth-stall repro, perf) — see `docs/reference/testing.md` |
| CI | GitHub Actions — `ci.yml` (lint · typecheck · test · build) + `e2e.yml` (Playwright) + Dependabot |

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
| `docs/reference/dashboard-map.md` | Starting ANY `app/dashboard/**` task — read this first instead of globbing pages |
| `docs/reference/storefront-map.md` | Starting ANY storefront task (`app/(storefront)/**`, `src/components/storefront/**`) — read this first |
| `docs/reference/dashboard-guides.md` | Adding/editing an in-dashboard Guide, or changing a guided page's workflow (Products, Sites, Short Links, Marketing/*) — keep `guides/content.ts` in sync |
| `docs/reference/testing.md` | Writing or running any test — Vitest (unit/integration) or Playwright (E2E); adding an e2e spec; the auth-stall reproduction; enabling the secret-gated login/checkout flows; the CI + E2E GitHub workflows |

## Deferred Work — `.claude/todo-later/`

Items consciously punted from earlier sessions live here as `N(status)-YYYY-MM-DD-<topic>.md`, where `N` is the order added (1 = oldest) and `status` is the file's current state: **`(left)`** = open/not started, **`(half)`** = partially done, **`(done)`** = complete. Keep the status tag current — when work on a file finishes or progresses, `git mv` it to the new tag and fix references (they're inline-code paths, so a scoped find/replace works). **Not** auto-loaded — read them only when picking up that topic again or when the user asks "what's left on X."

| File | What |
|---|---|
| `.claude/todo-later/1(half)-2026-06-03-storage-followups.md` | Storage/upload deferred items, re-checked 2026-07-07 against the R2 surface: audit-trail done (`/api/upload/confirm`), per-plan quota unblocked (subscriptions live), upload rate-limit / resumable uploads / N+1 signing / 50-file cap still open. Read when touching upload/deliverables/download routes. |
| `.claude/todo-later/5(done)-2026-06-13-db-production-audit.md` | **DB audit (2026-06-13).** Live-state production-readiness review (post-RLS rollout): table structure, FKs, indexes, RLS, functions/triggers, auth flow, referral system, payout logic, admin permissions — with a severity-ordered punch-list. For current schema use `docs/db/schema-reference.md` (resynced 2026-07-07). |
| `.claude/todo-later/6(half)-2026-06-14-post-dashboard-followups.md` | **DB hardening + maturity backlog**, re-checked 2026-07-07: money-lib unit tests (114) + reconcile RPC built; still open: staging branch, CI gate, integration/E2E tests, remaining dead tables, naming + enum cleanup, coupon-create identity bug, scale/ops. Read when resuming DB hardening or asking "what's left on the DB?". |
| `.claude/todo-later/7(left)-2026-06-14-dashboard-refactor-followups.md` | **Remaining items from the dashboard production refactor** (Areas 1–7 done): the `products/[productId]` dynamic-`any` + `is_free`/`tags` latent bugs (schema decision), site-edit editor-internal `any`, sizing-discipline drift, and the agent-review re-run. Read when resuming dashboard polish or asking "what's left on the dashboard refactor?". |
| `.claude/todo-later/8(half)-2026-06-15-dashboard-health-findings.md` | **Dashboard health-check findings**, re-checked 2026-07-07: the media/dropped-bucket issue is FIXED (R2 media rebuild); the `autodm` rules-of-hooks violation is now FIXED (autodm rebuilt on real data, `feat/instagram-auto-dm`); still open: the site-edit `any` lint errors (cross-refs todo-later 7). |
| `.claude/todo-later/9(left)-2026-06-19-linkinbio-folder-reorg.md` | **Link-in-bio `blockEditors/` folder reorg — deferred** until the main/single-page/payment editors get the same upgrade the link-in-bio editor received; includes the shared-component constraints and the exact import edits. Read before restructuring `site-edit/tabs/**`. |
| `.claude/todo-later/10(done)-2026-06-25-cloudflare-r2-storage-migration.md` | **Cloudflare R2 storage migration — SHIPPED.** Decision record + what was built: 4 R2 buckets, `storage_files` metadata table, `src/lib/storage/` provider abstraction, `sharp` WebP conversion, `kyc_access_log`. The current storage truth lives in `api-routes.md` → Storage and `supabase-reference.md` → Storage; keep this as the decision history. |
| `.claude/todo-later/11(left)-2026-06-29-discover-performance-and-product-metrics.md` | **`/discover` perf + real product metrics (decisions locked, not started).** Part A (pure front-end, no schema): Cloudflare Image Resizing thumbnails (`/cdn-cgi/image/`), infinite-scroll pagination (page 24), cheaper card paint. Part B: a real popularity/metrics pipeline (`product_events` + `product_stats` + `increment_product_stat` RPC + pg_cron `trending_score`) to replace the fake "Trending" sort and power creator analytics. Read before touching `/discover`, product ranking, or product analytics. |
| `.claude/todo-later/12(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md` | **The money/KYC/tax/invoices overhaul blueprint — all 7 phases (0–6) BUILT**; §0 is the live phase index. `(half)` only because deferred go-live items remain (Cashfree Payouts + refund-webhook sandbox e2e, provider KYC auto-verify, real subscription billing, `DIGIONE_*` env). Read for any money-path work or "what's left before go-live?". |
| `.claude/todo-later/13(left)-2026-07-01-admin-app-scratch-plan.md` | **Separate admin-app scratch plan (not started).** Where admin UI (KYC verify, payout ops, refunds, support lookups) moves; terminal scripts (`kyc-admin`, `subscription-admin`, `refund-admin`, `tax-export`) are the interim. Read before building any admin UI. |
| `.claude/todo-later/14(left)-2026-07-09-guest-email-delivery-hardening.md` | **Guest-email & delivery hardening (not started).** 4 items from the 2026-07-09 purchase→delivery→tracking flow review: (1) server-side email validation in `/api/checkout/create`, (2) guest email-confirm step at checkout (the valid-but-wrong-email case is otherwise unrecoverable), (3) a `entitlement-admin` re-key script, (4) product decision on the discover external-`product_link` Buy Now that bypasses checkout. Read before touching guest checkout, `guest_entitlements`, or discover buy paths. |
| `.claude/todo-later/15(left)-2026-07-13-short-links-phase3-and-remaining.md` | **Short Links — Phase 3 (attribution) + remaining deferred work (not started).** Phases 1–2 are shipped on `feat/short-links`; this captures Phase 3 (click→order revenue attribution — *modifies the checkout/money path*, needs its own spec + security review), the deferred Phase 2 per-creator branded domains (needs a full custom-domain/DNS/cert system — the `/_custom` rewrite has no handler yet), and smaller polish (list sort/tag-filter/archived toggle, analytics `DateRangePicker`, favicon → `next/image`, redirect-cache shared invalidation). Read for short-link growth work or "what's left on short links?". |
| `.claude/todo-later/16(left)-2026-07-13-instagram-auto-dm-followups.md` | **Instagram Auto DM — Phase 1 BUILT on `feat/instagram-auto-dm` (builds green); follow-ups not started.** Captures go-live blockers (Meta App Review + business verification, prod `INSTAGRAM_*` env, webhook registration, the two `CRON_SECRET` crons), verification owed (manual demo e2e, doc-confirm the `graph.ts`/`event-parse.ts` Meta endpoints/shapes), optional cleanup (Posts-view stub, history tidy), and Phase 2/3 + deferred infra (`instaauto_daily_stats`, `instaauto_flows`). Read for any Instagram-automation work or "what's left on Auto DM?". |

Scratch pads (no status tag): `0-TD.txt` (raw idea inbox) and `To-Do` (the prioritized master roadmap — read this for "what should I work on next?").

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
│   │   ├── products/             # Product management
│   │   ├── sites/                # Storefront builder
│   │   ├── earnings/
│   │   ├── customers/
│   │   ├── orders/
│   │   ├── marketing/            # Coupons, affiliates, leads, referrals, services, community
│   │   ├── integrations/         # Email, WhatsApp, Telegram, Google Sheets
│   │   ├── settings/             # Profile, billing, subscription
│   │   └── …                     # admin (payouts), autodm, help, links (short links), media, notifications, payouts
│   ├── api/                      # Server-side route handlers — 14+ routes (partial list)
│   │   ├── checkout/             # Cashfree payment creation
│   │   ├── webhook/cashfree/     # Payment confirmation (source of truth)
│   │   ├── upload/               # Cloudflare R2 presigned uploads
│   │   └── …                     # auth, sites, leads, coupons, payouts, products, linkinbio, media, deliverables
│   └── …                         # account, actions, link-home (linkln.me landing), payment, user-login (buyer login)
├── src/
│   ├── components/
│   │   ├── dashboard/            # Dashboard UI (Sidebar, TopBar, editors)
│   │   ├── storefront/           # Public creator page components
│   │   ├── marketing/            # Landing page sections
│   │   ├── store/                # Shared (ProductCard, CartButton)
│   │   ├── account/              # Buyer account/library UI
│   │   ├── auth/                 # Buyer auth modal + provider
│   │   ├── providers/            # App-level context providers
│   │   ├── ui/                   # Atomic primitives (DataTable, SideDrawer, etc.)
│   │   └── assets/               # Shared SVG/image assets (DigiOneLogo, etc.)
│   ├── hooks/                    # All TanStack Query hooks (domain subfolders)
│   ├── lib/                      # Supabase clients, utilities, theme helpers
│   ├── contexts/                 # React contexts (DashboardThemeContext)
│   └── stores/                   # Zustand stores (useBuyerAuth)
├── types/
│   └── database.types.ts         # Supabase schema types — source of truth
├── supabase/                     # Config and migrations
├── e2e/                          # Playwright E2E specs (smoke · auth-stall repro · perf) — see docs/reference/testing.md
├── playwright.config.ts          # Playwright config (chromium + mobile-chrome projects)
└── .github/                      # CI: workflows/ci.yml, workflows/e2e.yml, dependabot.yml
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
- When you change a dashboard route or a storefront renderer/registry, update the matching map in `docs/reference/` in the same change-set (or confirm it's unaffected). The Stop hook in `.claude/hooks/check-doc-drift.mjs` enforces this.
- When you change the workflow of a guided dashboard page (see `docs/reference/dashboard-guides.md`), update that page's guide content in `src/components/dashboard/guides/content.ts` in the same change-set.

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
npm run typecheck    # tsc --noEmit (strict type check — CI gate)
npm run test         # Vitest unit tests
npm run test:integration # DB-backed money-path integration suite
npm run e2e          # Playwright E2E (smoke + secret-gated flows) — see docs/reference/testing.md
npm run e2e:ui       # Playwright interactive UI mode
npm run update-types # Regenerate Supabase types from schema
```
