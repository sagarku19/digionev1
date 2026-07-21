---
noteId: "f382509084ef11f18d3b85f38283563a"
tags: []

---

# Testing & CI Reference

How DigiOne is tested and gated. Read this when writing or running any test, adding an E2E spec, or touching the GitHub workflows. The philosophy/roadmap (why these tools) lives in `CI-CD-AND-OBSERVABILITY.md`; this is the **how**.

## At a glance

| Layer | Command | What it covers | Needs |
|---|---|---|---|
| Unit | `npm run test` | Pure logic — money lib, helpers, hooks logic | nothing (hermetic dummy env) |
| Integration | `npm run test:integration` | Real money-path (fulfillment/refund/route handlers) against a live **test** Supabase | test Supabase + secrets |
| E2E | `npm run e2e` | Real browser journeys (public smoke + secret-gated login/checkout + auth-stall repro) | nothing for smoke; `E2E_*` for the gated flows |
| Types | `npm run typecheck` | `tsc --noEmit`, strict | nothing |
| Lint | `npm run lint` | ESLint | nothing |

---

## Unit — Vitest

- `npm run test` → `vitest run`, config `vitest.config.ts`, globs **`{src,app,lib}/**/*.test.{ts,tsx}`**.
- **Hermetic:** dummy env is injected in `vitest.config.ts` (`KYC_ENCRYPTION_KEY`, fake `NEXT_PUBLIC_SUPABASE_URL`/anon key) — no real credentials, no network.
- **Add one:** colocate `foo.test.ts` next to `foo.ts`. The money lib (`src/lib/**`) is the backbone — 356 tests today.

## Integration — Vitest (DB-backed)

- `npm run test:integration` → `vitest.integration.config.ts`, specs in `test/integration/`.
- Runs the **real** `fulfillOrder`/refund/route-handler code against a live **test** Supabase project, **serially** (`fileParallelism: false` — shared DB + per-IP rate limits).
- Network-bound + needs secrets → run on merge/nightly, **not** every PR.

## E2E — Playwright

- Config `playwright.config.ts`. Specs `e2e/*.spec.ts` (Vitest ignores these — it only globs `*.test.ts`). Projects: **`chromium`** (Desktop Chrome) + **`mobile-chrome`** (Pixel 5).
- **Boots the app itself:** `npm run dev` locally / `next start` in CI. To target a deployed URL instead (e.g. a Vercel preview) set **`PLAYWRIGHT_BASE_URL=<url>`** — the local server is skipped.
- Commands: `npm run e2e` (headless), `npm run e2e:ui` (interactive), `npm run e2e:report` (open last HTML report).

| Spec | What | Needs |
|---|---|---|
| `smoke.spec.ts` | Public routes render (title / login form / linkln hero). Backend-free — green under placeholder CI env because these pages are statically prerendered. | — |
| `auth.spec.ts` | Real creator login → lands on `/dashboard`. Guards the auth-timeout saga. | `E2E_USER_EMAIL` + `E2E_USER_PASSWORD` (else **skips**) |
| `checkout-free.spec.ts` | ₹0 order → `/payment/status` (money path, no gateway — the free-order short-circuit). | `E2E_FREE_PRODUCT_PATH` (else **skips**) |
| `auth-investigation.spec.ts` | Deterministically reproduces the sign-in-timeout stall by black-holing `/auth/v1/token`, and asserts the mitigations (12s abort, one retry, "Reconnecting…" feedback, clean error, no lock-overlay crash). **chromium-only.** | — |
| `perf.spec.ts` | Diagnostic page-load metrics (nav timing, paint, JS weight). **chromium-only, not a gate.** | — |

- **Enable the gated flows:** `E2E_USER_EMAIL=… E2E_USER_PASSWORD=… npm run e2e` locally, or add those (+ `E2E_FREE_PRODUCT_PATH`) as GitHub **repo secrets**. Use a throwaway test creator, never a real one.
- **Add an e2e test:** create `e2e/<name>.spec.ts` → `import { test, expect } from '@playwright/test'` → `page.goto('/path')` (baseURL is preset). For a chromium-only / diagnostic spec, gate it with a `beforeEach` project skip (copy the pattern in `auth-investigation.spec.ts`).

---

## CI (GitHub Actions)

- **`.github/workflows/ci.yml`** — on push to `main` + every PR. Four parallel jobs:
  - **ESLint** — *advisory* (`continue-on-error: true`, ~95 pre-existing `no-explicit-any` in data hooks). Delete that line to make it a hard gate once cleared.
  - **typecheck**, **Vitest**, **build** — hard gates.
  - Build uses non-empty `NEXT_PUBLIC_*` **placeholders** (falls back to repo secrets when present). **Never** put real server secrets here. (The build is hermetic — no route may instantiate a service client at module scope; do it inside the handler.)
- **`.github/workflows/e2e.yml`** — `npm ci` → install chromium → build → `npm run e2e` → uploads the HTML report artifact. Same placeholder env; add `E2E_*` secrets to switch on the real flows.
- **`.github/dependabot.yml`** — weekly npm + github-actions bumps, minor/patch grouped, majors individual.
- **Watch runs:** repo → **Actions** tab (or the Actions API with your GitHub token).

---

## Gotchas

- **Stale dev compile (OneDrive + Turbopack):** after editing a file the dev server can serve the *old* compiled route on the first hit — reload / re-run to pick it up. If unsure, check the served JS contains your change before trusting a test result.
- **`getByText` strict mode:** a regex matching 2+ elements throws. Target the button with `getByRole('button', { name: … })` or a unique string.
- **Dev ≠ prod perf:** `next dev` compiles each route on first visit (~seconds); warm/prod loads are ~1s. Measure production (`npm run build && npx next start -p 3100`, then `PLAYWRIGHT_BASE_URL=http://localhost:3100 npm run e2e`) for real numbers.
- **The auth-stall repro** simulates the *symptom* (a hung auth POST) — it cannot summon the real QUIC/H3 transport blackhole. Background: project memory `signin-timeout-saga` + `docs/reference/auth-timeouts-and-locks.md`.

## Cross-references

- Wiring: `vitest.config.ts`, `vitest.integration.config.ts`, `playwright.config.ts`, `test/integration/`, `e2e/`.
- Env vars CI needs as secrets: `.claude/rules/env-vars.md`.
- Tooling philosophy + adoption roadmap (Sentry, PostHog, Semgrep, Lighthouse, k6, …): `CI-CD-AND-OBSERVABILITY.md`.
