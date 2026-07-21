---
noteId: "03802ac0847411f1bf652b2f04620834"
tags: []

---

# DigiOne — CI/CD, Testing, Security & Observability Tooling

A practical field guide to the pipeline and tooling stack proposed for DigiOne: what each tool is,
what it does, **where it fits** (pull-request gate vs. production runtime), why it matters for a
money-handling Indian creator SaaS specifically, current pricing/licensing (as of mid-2026), and
setup notes tuned to our stack (Next.js 16 App Router · TypeScript · Supabase · Cashfree · Vercel).

> This is a **decision + reference document**, not an implementation. Nothing here is wired up yet
> except the three tools we already run locally (see below).

---

## TL;DR

- **Already in the repo:** ESLint, TypeScript (`tsc`), Vitest (unit + a DB-backed integration suite).
- **Not yet set up:** everything else — there is **no `.github/` CI at all** today.
- **The shape of a mature pipeline:** cheap/fast checks gate every PR; heavier scans run on merge or
  on a schedule; runtime tools (monitoring, analytics, DAST) watch production after deploy.
- **If you adopt only 10 tools** (the shortlist at the end): Playwright · Vitest · Sentry · PostHog ·
  OWASP ZAP · Semgrep · Dependabot · Better Stack · Lighthouse CI · k6.
- **The one gotcha for us:** DigiOne is a **private repo**, so **CodeQL** isn't free — it needs
  GitHub Advanced Security ($30/committer/mo). **Semgrep OSS** covers most of that gap for ₹0, which
  is why CodeQL is *not* in the top-10 shortlist and Semgrep *is*.

---

## The mental model: three rings of defense

```
        ┌──────────────────────────────────────────────────────────────┐
        │  RING 1 — On every Pull Request (fast, blocking, cheap)       │
        │  ESLint · tsc --noEmit · Vitest · Playwright · Semgrep ·      │
        │  Lighthouse CI · Build verification                          │
        └──────────────────────────────────────────────────────────────┘
                                   │ merge
        ┌──────────────────────────────────────────────────────────────┐
        │  RING 2 — On merge / scheduled (slower, deeper)              │
        │  CodeQL · OWASP ZAP (DAST) · Dependabot · full k6 load runs   │
        └──────────────────────────────────────────────────────────────┘
                                   │ deploy
        ┌──────────────────────────────────────────────────────────────┐
        │  RING 3 — In production (always-on runtime observability)     │
        │  Sentry · PostHog · Better Stack · (Vercel Analytics)         │
        └──────────────────────────────────────────────────────────────┘
```

The principle: **the earlier a check runs, the cheaper the bug is to fix.** A type error caught by
`tsc` in a PR costs seconds. The same class of bug reaching a Cashfree webhook in production can
mean a mis-credited creator balance and a manual reconciliation. Push checks left.

---

## Ring 1 — On every pull request

These run on every PR, must be **fast** (target < 5–8 min total), and **block merge** on failure.

### 1. ESLint — *already installed (`eslint ^9` + `eslint-config-next`)*

**What it is:** a static linter for JS/TS. Catches un-used vars, bad imports, React hook-rule
violations, accessibility issues, and — with custom rules — project-specific anti-patterns.

**What it does for DigiOne:** enforces the "Absolute Rules" in `CLAUDE.md` mechanically instead of by
code review. The `.claude/rules/anti-patterns.md` table is a linter waiting to happen — e.g. banning
`createClient` from `@supabase/supabase-js` in client components, banning `console.log`, banning
non-`lucide-react` icon imports. These are exactly the kind of rules `eslint` `no-restricted-imports`
/ `no-console` enforce for free.

**Pipeline slot:** PR gate. Command already exists: `npm run lint`.
**Cost/licensing:** free, MIT/OSS.
**Setup note:** we already have it; the missing piece is a CI job that runs `npm run lint` and fails
the PR on error. Consider tightening `eslint.config` with `no-restricted-imports` rules mirroring
`anti-patterns.md`.

### 2. TypeScript — `tsc --noEmit` — *already installed (`typescript ^5`, strict)*

**What it is:** the type-checker run in "check only, emit nothing" mode.

**Why a separate CI step from the build:** `next build` type-checks, but a dedicated
`tsc --noEmit` step is faster to fail, gives cleaner errors, and runs even when the build is broken
for unrelated reasons. Our design docs already reference running `npx tsc --noEmit` as part of
verification.

**What it does for DigiOne:** strict mode is non-negotiable per `CLAUDE.md` ("Zero `any` without a
documented reason"). The money path leans on generated Supabase types (`types/database.types.ts`) as
the source of truth — `tsc` is what guarantees a schema change that breaks a revenue-table write is
caught before merge, not at runtime.

**Pipeline slot:** PR gate. **Cost:** free, OSS.
**Setup note:** add `"typecheck": "tsc --noEmit"` to `package.json` scripts and a CI job for it.

### 3. Vitest — *already installed (`vitest ^4.1.8`)*

**What it is:** a fast Vite-native unit-test runner (Jest-compatible API).

**Current state in DigiOne — this is well-developed already:**
- `npm run test` → hermetic unit suite (`{src,app,lib}/**/*.test.ts`), no real credentials, dummy
  env injected in `vitest.config.ts`.
- `npm run test:integration` → the **money-path integration suite** (`vitest.integration.config.ts`)
  that runs the *real* fulfillment / refund / route-handler code against a live test Supabase
  project, serially (shared DB + per-IP rate limits → `fileParallelism: false`).

**What it does for DigiOne:** the unit suite already covers the money library (114 tests noted in the
todo-later backlog). This is the backbone of revenue-integrity confidence — platform-fee math,
balance credits, refund proportional-fee reversal, ledger `record_hash` determinism.

**Pipeline slot:** unit tests on the PR gate; integration suite on merge or nightly (it's network-
bound and needs a test Supabase project + secrets, so it's slower and not fully hermetic).
**Cost:** free, MIT/OSS.

### 4. Playwright — *not set up*

**What it is:** Microsoft's browser-automation / end-to-end testing framework. Drives a real
Chromium/Firefox/WebKit browser through user flows and asserts on the result.

**Why it matters for DigiOne specifically:** unit + integration tests verify *code*; Playwright
verifies the **actual user journey through the browser**, which is where our highest-value flows live
and where the Cashfree SDK, redirects, and cookies interact:
- **Buyer:** storefront → add to cart → checkout contact form → Cashfree sandbox → `/payment/status`
  reconciliation → library access grant.
- **Creator:** signup → email/OAuth callback role promotion → build a site → publish a product →
  see a sale.
- **Auth:** the login-timeout saga in our memory (QUIC/H3 blackhole) is *exactly* the class of bug an
  E2E test catches that a unit test never will.

**Pipeline slot:** PR gate (a smoke subset) + full suite on merge. Runs against a Vercel **preview
deployment** of the PR.
**Cost:** free, Apache-2.0/OSS. (Runs on GitHub-hosted runners at no extra cost beyond Actions
minutes.)
**Setup notes:**
- Full checkout E2E needs the **Cashfree sandbox** environment (`CASHFREE_ENVIRONMENT != PRODUCTION`)
  and sandbox test cards; the free-order path (`total === 0`) can be tested with **no gateway at all**
  since it short-circuits through `fulfillOrder` directly — start there.
- Note: Next.js ships an experimental Playwright test-mode helper
  (`next/experimental/testmode/playwright`) already present in `node_modules`.

### 5. Semgrep — *not set up* ⭐ (in the top-10 shortlist)

**What it is:** a fast, open-source **static application security testing (SAST)** tool. You write
(or import) pattern rules; it flags matching code. Think "grep that understands syntax trees."

**Why it's the right SAST choice for DigiOne (over CodeQL) — the key decision in this doc:**
- **Free where it counts.** The **Community Edition CLI** is free and OSS (single-file analysis,
  3,000+ community rules, CI integration). The **Cloud free tier** covers teams of ≤10 contributors
  and ≤10 private repos with the full platform — DigiOne fits comfortably.
- **CodeQL is not free for us** (private repo → GitHub Advanced Security, $30/committer/mo). Semgrep
  gives ~80% of the value at ₹0.
- **Custom rules map directly onto our handbook.** We can encode `anti-patterns.md` and
  `security-model.md` as Semgrep rules: "no service-role client in a client component," "webhook
  handlers must call `crypto.timingSafeEqual`," "no `createClient` from `@supabase/supabase-js` in
  `app/api/`," "no price/amount read from the request body without a DB re-fetch." These are
  security-relevant patterns unique to us that no off-the-shelf ruleset knows about.

**Coverage caveat (be honest about it):** the free CLI's *out-of-the-box* detection rate is modest
(~44–48% on benchmark SAST suites) because cross-file/dataflow analysis is a paid cloud feature. For
DigiOne that's fine — our value is the **custom rules**, and the community secrets/OWASP rulesets
catch the common classes (hardcoded keys, injection, weak crypto).

**Pipeline slot:** PR gate (fast — seconds). **Cost:** CE free/OSS (LGPL); Cloud free ≤10 devs, then
$35/dev/mo.

### 6. CodeQL — *not set up* (conditional — see cost)

**What it is:** GitHub's deep semantic code-analysis engine. You query code like a database; it does
full dataflow/taint tracking across files (e.g. "does untrusted input reach an SQL sink?").

**What it does for DigiOne:** stronger than Semgrep-OSS at *dataflow* bugs — tracing tainted buyer
input from a request body through to a DB write or a Cashfree call. Complements, doesn't replace,
Semgrep.

**The cost reality for us:**
- **Free** only for **public** repositories.
- DigiOne is a **private** repo, so CodeQL requires **GitHub Advanced Security → Code Security**
  add-on: **$30 per active committer per month** (a committer counts if they pushed in the last 90
  days), and you must be on a GitHub Team/Enterprise plan.

**Recommendation:** **defer** until either (a) revenue justifies the GHAS spend, or (b) team size /
compliance (SOC 2, PCI-adjacent) demands it. Run **Semgrep now**, add CodeQL later. If adopted, run
it **scheduled (weekly) or on merge to `main`**, not on every PR — it's slow.
**Pipeline slot:** Ring 2 (scheduled/on-merge).

### 7. Lighthouse CI — *not set up* ⭐ (shortlist)

**What it is:** Google Lighthouse (performance, accessibility, SEO, best-practices audit) automated in
CI, with score budgets that can **fail a PR** on regression.

**Why it matters for DigiOne specifically:** our public surfaces — **creator storefronts, the
`/discover` page, marketing pages** — are the revenue funnel, and our audience is **Indian creators
and buyers often on mobile networks**. A storefront that drops from a 90 to a 60 Lighthouse
performance score because someone shipped an unoptimized hero image directly costs conversions. LCI
turns "the site got slow" from a customer complaint into a red PR check. It also guards the
image-optimization work (`sharp` → WebP, Cloudflare Image Resizing in the discover-perf todo).

**Pipeline slot:** PR gate against preview deploy, with budgets on the storefront/marketing routes.
**Cost:** free, Apache-2.0/OSS. (There's also the Google-hosted PageSpeed API, free.)
**Setup note:** point it at 3–4 canonical URLs (a storefront, a product page, `/discover`, the
marketing home). Set realistic budgets first, then ratchet up.

### 8. Build verification — *`next build`*

**What it is:** simply running `next build` (a production build) in CI.

**Why it's its own gate:** a PR can pass lint + types + unit tests and still fail to build —
server/client component boundary violations, a `NEXT_PUBLIC_*` var read server-side wrong, an env var
that a service client throws on at init, an edge-runtime incompatibility in `proxy.ts`. `next build`
is the closest cheap proxy for "will this actually deploy on Vercel?"

**Pipeline slot:** PR gate. **Cost:** free (Actions minutes only).
**Note:** Vercel already builds every PR into a preview — you can lean on that as the build check and
have Playwright/Lighthouse/ZAP target the preview URL, saving duplicate build time in Actions.

---

## Ring 3 — In production (runtime observability)

These aren't CI checks — they're always-on services watching the deployed app. Grouped here (before
Ring 2's scheduled scans) because they're the other half of "mature pipeline" most teams under-invest
in.

### 9. Sentry — *not set up* ⭐ (shortlist)

**What it is:** error & performance monitoring. Captures unhandled exceptions (client + server) with
full stack traces, breadcrumbs, release/commit attribution, and (with source maps) the exact
TypeScript line — plus tracing/latency.

**Why it matters for DigiOne specifically:** the money path *cannot* fail silently. If `fulfillOrder`
throws after a Cashfree `SUCCESS` webhook, that's a paid-for-but-not-delivered order — you need to
know **within seconds, with the `order_id` and stack**, not from a support ticket. Same for KYC
encryption failures, R2 signing errors, and the auth-timeout class of bug we've been chasing.

**Pipeline slot:** production runtime (+ staging). Ties releases to deploys.
**Cost:** **Free Developer plan** = 5,000 errors + 10,000 performance units/month — ample for our
current scale (a 500-MAU app generating tens–low-hundreds of errors/mo has ~25× headroom). Team plan
$26/mo when you outgrow it.
**Next.js 16 setup notes (important):**
- Use **`instrumentation.ts`** to init Sentry — the App Router needs **separate init for the Node.js
  runtime** (API routes, server components) **and the edge runtime** (our `proxy.ts` middleware runs
  on edge; skip edge init and middleware errors go untracked).
- **Upload source maps** in the build, or production stack traces are minified garbage.
- Scrub PII before sending: KYC fields, buyer emails, PAN/bank — set `beforeSend` filters. This is a
  compliance requirement for us, not optional.

### 10. PostHog — *not set up* ⭐ (shortlist)

**What it is:** product analytics — event capture, funnels, retention, session replay, feature flags,
A/B tests — in one platform. Open-source with a generous cloud free tier.

**Why it matters for DigiOne specifically:** we're a two-sided marketplace and need to see **both
funnels**:
- **Creator activation:** signup → verify → create first site → publish first product → first sale.
  Where do creators drop? That's the growth metric.
- **Buyer conversion:** storefront view → product view → add to cart → checkout → paid. The checkout
  abandonment rate directly maps to lost GMV.
- We already have a homegrown **`linkinbio_analytics`** table and an A/B test feature (`useAbTests`) —
  PostHog can either replace or complement these with proper funnel/retention analysis. Its
  **feature flags** could also drive gradual rollouts (e.g. the Instagram Auto DM or short-links
  features) without redeploys.

**Pipeline slot:** production runtime. **Cost:** **Free = 1M events + 5,000 recordings + 1M flag
requests/month** (no card; >90% of PostHog users stay free). Self-hostable (MIT) if data residency
for Indian users ever becomes a requirement.
**Setup note:** load it client-side; be deliberate about **not** capturing PII in event properties
(same discipline as Sentry). Consider reverse-proxying through our domain to survive ad-blockers.

### 11. Better Stack — *not set up* ⭐ (shortlist)

**What it is:** uptime/heartbeat monitoring + status page + incident management (on-call, escalation,
phone/SMS alerts). (Formerly "Better Uptime.")

**Why it matters for DigiOne specifically:** black-box "is the site actually up and taking money?"
monitoring that's independent of the app itself (Sentry can't report an error if the whole deployment
is down). Monitor from the outside:
- The **Cashfree webhook endpoint** `/api/webhook/cashfree` — if it's down, payments confirm at
  Cashfree but never fulfill.
- A lightweight **`/api/health`** (worth adding) that pings Supabase + R2.
- A representative **storefront** and the **marketing home**.
- **Cron heartbeats** for the scheduled jobs we already have (`/api/admin/payouts/sync`,
  `/api/instaauto/drain`, `/api/instaauto/maintenance`) — Better Stack alerts if a cron *stops
  checking in*, which plain uptime pings can't detect.

**Pipeline slot:** production runtime. **Cost:** **Free = 10 monitors + 1 status page + Slack/email
alerts** (3-min checks). Paid from **$29/mo** for 30-sec checks, phone/SMS, on-call, and
Playwright-based transaction checks (i.e. synthetic checkout monitoring).

### (bonus) Vercel Analytics / Speed Insights — *free-ish, near-zero setup*

Since we deploy on Vercel, its built-in Web Analytics + Speed Insights give real-user Core Web Vitals
with one line — a cheap complement to Lighthouse CI's lab data. Not on the shortlist, but essentially
free to switch on.

---

## Ring 2 — On merge / scheduled (deeper, slower)

### 12. OWASP ZAP — *not set up* ⭐ (shortlist)

**What it is:** the OWASP **Zed Attack Proxy** — the leading open-source **DAST** (Dynamic Application
Security Testing) scanner. Unlike Semgrep/CodeQL (which read *code*), ZAP attacks the **running app**
over HTTP: probing for injection, XSS, security-header gaps, auth/session issues, exposed endpoints.

**Why it matters for DigiOne specifically:** we expose a real attack surface — public unauthenticated
endpoints that write to the DB (`/api/checkout/*`, `/api/leads`, `/api/linkinbio/track`,
`/api/coupons/validate`), the webhook receivers, and the storefront rewrite/custom-domain proxy. ZAP
against a **preview/staging deployment** catches missing security headers, verbose error leakage, and
endpoints that respond when they shouldn't — the runtime half that static analysis can't see. It
pairs naturally with our `security-model.md` "abuse surface" table.

**Pipeline slot:** **scheduled (e.g. weekly)** or on-merge against a non-prod deployment — a full ZAP
active scan is slow and noisy, so it doesn't belong on the per-PR gate. Start with the **ZAP Baseline
scan** (passive, fast, CI-friendly) on PRs and reserve the full active scan for the schedule.
**Cost:** free, Apache-2.0/OSS.
**Caution:** never point an **active** scan at production or the real Cashfree integration — it
submits forms and hammers endpoints. Scan a staging deploy with sandbox credentials.

### 13. Dependabot — *not set up* ⭐ (shortlist)

**What it is:** GitHub's automated dependency updater + vulnerability alerter. Opens PRs to bump
outdated/vulnerable packages and flags known CVEs in your dependency tree.

**Why it matters for DigiOne specifically:** we have a broad, security-sensitive dependency surface —
`@supabase/*`, `@aws-sdk/*` (R2), `@cashfreepayments/cashfree-js`, `next`, `sharp`, `resend`,
`@react-pdf/renderer`. A CVE in any of these (especially `next`, `sharp`, or the AWS SDK) is a direct
risk. Dependabot turns "we're two majors behind on a package with a known RCE" into an automatic PR.

**Pipeline slot:** continuous (opens PRs on a schedule); its PRs then flow through Ring 1.
**Cost:** **free** for all repos (public and private) via a `.github/dependabot.yml`. Security alerts
are free too. (This is the one "GitHub security" feature that *is* free on private repos.)
**Setup note:** start with `ecosystem: npm`, weekly, grouped minor/patch updates to avoid PR spam;
review majors manually.

### 14. k6 — *not set up* ⭐ (shortlist)

**What it is:** Grafana's open-source **load / performance testing** tool. Tests are scripted in
JS/TS; the engine is Go. Simulates thousands of virtual users to find where the app breaks under
load.

**Why it matters for DigiOne specifically:** a creator's product launch or a viral link-in-bio can
send a **traffic spike to a single storefront + checkout** in minutes. k6 answers "what happens at
500 concurrent checkouts?" **before** it happens for real — surfacing Supabase connection-pool
limits, RLS query hotspots, the N+1 signing in the upload path (noted in todo-later), and rate-limit
behavior under load. Also validates the webhook handler stays idempotent and fast under burst.

**Pipeline slot:** **scheduled / pre-release**, not per-PR (load runs are minutes-to-hours and can
cost money against real infra). Run smoke-level load in CI; full runs on demand before big launches.
**Cost:** the **OSS binary is free** (AGPL) and can drive large local/CI tests. **Grafana Cloud k6**
(distributed multi-region, managed) starts ~$99/mo — you likely **don't need the cloud** early;
the free binary on a beefy runner is plenty.
**Caution:** load-test **staging with sandbox Cashfree**, never production/live payments.

---

## The "top 10 for DigiOne" shortlist — why these ten

Your proposed shortlist, re-ordered by what I'd adopt first and mapped to the gap each one closes:

| # | Tool | Ring | Closes the gap of… | Cost at our scale |
|---|------|------|--------------------|-------------------|
| 1 | **Vitest** | 1 | code correctness (already ours — money-lib + integration) | free |
| 2 | **Sentry** | 3 | *silent* production failures on the money path | free tier |
| 3 | **Dependabot** | 2 | vulnerable dependencies (Next/sharp/AWS-SDK CVEs) | **free (private OK)** |
| 4 | **Playwright** | 1 | broken end-to-end user journeys (checkout, auth) | free |
| 5 | **Better Stack** | 3 | "is it up & taking money?" + dead crons | free tier |
| 6 | **Semgrep** | 1 | security anti-patterns in code (custom rules = our handbook) | free ≤10 devs |
| 7 | **PostHog** | 3 | no visibility into creator/buyer funnels | free tier (1M events) |
| 8 | **Lighthouse CI** | 1 | storefront perf regressions (mobile conversion) | free |
| 9 | **OWASP ZAP** | 2 | runtime vulns on public endpoints (DAST) | free |
| 10 | **k6** | 2 | behavior under launch-day load | free (OSS binary) |

**Why this set is well-balanced:** it spans all five disciplines a mature SaaS needs —
**testing** (Vitest, Playwright), **security** (Semgrep, ZAP, Dependabot), **performance**
(Lighthouse, k6), **reliability** (Better Stack, Sentry), and **user behavior** (PostHog) — and
**9 of the 10 are free at our current scale**. The single deliberate omission from your original PR
list is **CodeQL**, dropped purely on the private-repo cost ($30/committer/mo); Semgrep covers most of
its role for free until GHAS is justified.

---

## Suggested adoption order (don't do it all at once)

Sequenced by **value-per-hour-of-setup**, and by "protect the money first":

1. **Wire up what we already have** → a `.github/workflows/ci.yml` running `lint`, `tsc --noEmit`,
   `vitest`, and `next build` on every PR. Zero new tools; immediate value. *(half a day)*
2. **Dependabot** → one `dependabot.yml` file. Free, private-repo-safe, catches CVEs. *(30 min)*
3. **Sentry** → protect the money path from silent failures. Free tier. *(a day, incl. source maps +
   PII scrubbing)*
4. **Playwright smoke suite** → the free-order checkout path + creator signup + login (guards the auth
   saga). *(1–2 days)*
5. **Better Stack** → uptime + webhook + cron heartbeats. Free. *(2 hrs)*
6. **Semgrep** → community rulesets first, then port `anti-patterns.md` / `security-model.md` into
   custom rules. *(1 day + ongoing)*
7. **PostHog** → creator activation + buyer conversion funnels. *(1 day)*
8. **Lighthouse CI** → budgets on storefront/discover/marketing. *(half a day)*
9. **OWASP ZAP baseline** on PRs, full scan weekly. *(1 day)*
10. **k6** → smoke load tests; full runs before launches. *(1–2 days)*
11. *(Later, when justified)* **CodeQL** via GitHub Advanced Security.

A reasonable **first `.github/` layout**:

```
.github/
├── dependabot.yml
└── workflows/
    ├── ci.yml            # PR gate: lint · typecheck · vitest · build · semgrep · lighthouse
    ├── e2e.yml           # Playwright against the Vercel preview deploy
    ├── security.yml      # scheduled: ZAP full scan · (CodeQL later)
    └── load.yml          # manual/scheduled: k6
```

---

## DigiOne-specific cross-references

When you implement any of this, these existing repo docs are the source of truth to wire against:

- **Money path** (what E2E/integration/ZAP must protect): `.claude/rules/security-model.md`,
  `.claude/rules/cashfree-reference.md`, `docs/db/money-path.md`, `src/lib/server/fulfillment.ts`.
- **Anti-patterns to encode as Semgrep/ESLint rules:** `.claude/rules/anti-patterns.md`.
- **Public abuse surface for ZAP/rate-limit testing:** the "Public endpoints" table in
  `security-model.md` and `.claude/rules/api-routes.md`.
- **Env vars CI will need as secrets** (test Supabase, Cashfree sandbox, R2, KYC key):
  `.claude/rules/env-vars.md`.
- **Existing test wiring to build on:** `vitest.config.ts`, `vitest.integration.config.ts`,
  `test/integration/`.
- **Perf targets for Lighthouse/k6:** `.claude/todo-later/11(left)-2026-06-29-discover-performance-and-product-metrics.md`.

---

## Cost summary (mid-2026, at DigiOne's current scale)

| Tool | License | Free tier good enough for us? | First paid tier |
|------|---------|-------------------------------|-----------------|
| ESLint / TypeScript / Vitest | OSS | ✅ (already ours) | — |
| Playwright | Apache-2.0 | ✅ | — (Actions minutes only) |
| Semgrep | LGPL (CE) / SaaS | ✅ (free ≤10 devs, ≤10 private repos) | $35/dev/mo |
| CodeQL | free public / GHAS private | ❌ **not free — private repo** | $30/committer/mo (Code Security) |
| Lighthouse CI | Apache-2.0 | ✅ | — |
| Sentry | BSL / SaaS | ✅ (5k errors + 10k perf/mo) | $26/mo (Team) |
| PostHog | MIT / SaaS | ✅ (1M events + 5k replays/mo) | usage-based after free |
| Better Stack | SaaS | ✅ (10 monitors, 1 status page) | $29/mo |
| Dependabot | free (GitHub) | ✅ (private repos included) | — |
| OWASP ZAP | Apache-2.0 | ✅ | — |
| k6 | AGPL (OSS binary) | ✅ (self-run) | ~$99/mo (Grafana Cloud k6) |

**Net:** a genuinely mature pipeline for DigiOne costs **₹0/month today** — the only paid tools
(CodeQL, and cloud tiers of Semgrep/Sentry/PostHog/Better Stack/k6) are ones you grow into, not start
with.

---

*Document created 2026-07-21. Reflects tool pricing/features current as of mid-2026 — re-verify
free-tier limits before committing, as vendor pricing drifts.*

### Sources

- Sentry: [pricing](https://sentry.io/pricing/), [Next.js guide (2026)](https://stacknotice.com/blog/sentry-nextjs-complete-guide-2026)
- PostHog: [pricing](https://posthog.com/pricing), [product-analytics pricing docs](https://posthog.com/docs/product-analytics/pricing)
- Better Stack: [pricing](https://betterstack.com/pricing), [2026 breakdown](https://www.stackscored.com/pricing/uptime-monitoring/better-stack/)
- Semgrep: [pricing](https://semgrep.dev/pricing/), [OSS vs Cloud (2026)](https://dev.to/rahulxsingh/is-semgrep-free-understanding-oss-vs-semgrep-cloud-in-2026-ge8)
- CodeQL / GitHub Advanced Security: [GHAS billing docs](https://docs.github.com/en/billing/concepts/product-billing/github-advanced-security), [security plans](https://github.com/security/plans)
- k6: [Grafana k6 OSS](https://grafana.com/oss/k6/), [Cloud k6](https://grafana.com/products/cloud/performance-load-testing-k6/)
