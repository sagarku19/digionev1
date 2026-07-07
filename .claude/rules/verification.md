---
noteId: "1bc324105b9e11f183978dfe119e58b2"
tags: []

---

# Verification Workflow

Every change goes through three lanes. Where DigiOne currently sits is marked.

## Lane 1 — Local self-check (must pass before commit) ✅ in place

| Step | Command | Catches |
|---|---|---|
| 1 | `npx tsc --noEmit` | Type errors, missing imports, broken refactors |
| 2 | `npm run lint` | Unused vars, unsafe patterns, React hook rules |
| 3 | `npm test` | Regressions in the Vitest suite (25 files / 114 tests, all money-path pure libs) — see Lane 2 |
| 4 | `/verify` (this project's slash command) | Rule violations on changed files + smoke-test checklist |
| 5 | `npm run dev` + manual click-through | UI regressions, runtime errors |

This is what `/verify` automates. Run it before every commit.

## Lane 2 — Automated tests 🟡 partially in place

**In place now:**
- **Vitest** is installed and configured (`vitest.config.ts` — `environment: 'node'`, `include: ['{src,app,lib}/**/*.test.{ts,tsx}']`). Run with `npm test` (`vitest run`).
- **25 suites / 114 tests** (as of 2026-07-07) covering the money-path pure libs: referrals, balance, kyc-crypto, platform-fee, subscriptions, `refund-math`, `tax-math`, `gstin`, invoice/statement builders + PDF render smokes, `tax-export` builders, and more. Add new `*.test.ts` (or `.test.tsx`) files next to the `src/`, `app/`, or `lib/` code they cover and they're picked up automatically.

**Still missing (what a mature setup adds):**
- **Unit tests** (Vitest + React Testing Library) for hooks (`src/hooks/use*.ts`) and the rest of the pure utilities in `src/lib/`.
- **Integration tests** for API route handlers (`app/api/**`) using a real Supabase test schema or `supabase/migrations` snapshot.
- **E2E tests** (Playwright) for the three critical flows: signup → create site, buyer checkout, dashboard product publish.
- **Visual regression** (optional — Chromatic) for storefront sections.

> Note: the glob now covers `src/`, `app/`, and `lib/` (`.test.ts`/`.test.tsx`). The environment is `node`, so React-component (`.test.tsx`) tests that touch the DOM will need `environment: 'jsdom'` (per-file `// @vitest-environment jsdom` or a config split) before they pass.

## Lane 3 — CI / pre-deploy gates ❌ not in place

A mature setup adds:
- **GitHub Actions** running Lane 1 + Lane 2 on every PR.
- **Preview deployments** (Vercel) — auto URL per branch for stakeholder review.
- **Type/lint blocking merges** via branch protection.
- **Secret scanning** (gitleaks) — would have caught the `.claude/settings.local.json` leak earlier.

## Lane 4 — Production observability (separate concern) ❌ not in place

- **Sentry** for client + server errors.
- **PostHog** or **Plausible** for funnel analytics (signup → first sale).
- **Supabase logs** + alerts on auth + RLS denials.
- **Cashfree dashboard** for payment failure rate.

## How to read this

| Question | Answer |
|---|---|
| What should I run *today* before committing? | `/verify` → all of Lane 1 |
| Where should I invest next? | Expand Lane 2 — the harness exists; add unit tests for the money-path libs (`src/lib/server/*`) and the 27 hooks in `src/hooks/`. Cheapest, highest ROI. |
| When does Lane 3 become worth it? | When more than one person commits, or when a regression hits prod |
| Why this test shape? | Solo project, fast iteration. Every money-path **pure lib** is unit-tested (114 tests); hooks/routes/E2E are not. Type system + Supabase RLS + the atomic-RPC design catch most of the rest. Trade-off, not negligence. |
