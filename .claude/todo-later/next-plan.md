---
noteId: "f56977b0812c11f1a3b34f18ce8d8fe6"
tags: []

---

# DigiOne — Next Serial Update Plan

> **Written:** 2026-07-16 · **Owner:** Sagar · **Author lens:** senior product manager + senior UI designer
> **Inputs:** every `.claude/todo-later/*` file (audited against the live codebase on main), `docs/reference/dashboard-map.md` + `storefront-map.md` (both synced 2026-07-16), `.env.example`, and a competitor scan (Stan Store, Beacons, Gumroad, Linktree, SuperProfile, TagMango, Topmate).
>
> **The governing constraint:** the company is **not yet registered**. That blocks: Cashfree **production** PG credentials, Cashfree **Payouts** credentials (all three env vars empty), Meta **Graph API** app secrets (Instagram Auto DM + WhatsApp), and real `DIGIONE_GSTIN`/`DIGIONE_PAN` (commission invoices). Everything else — Supabase, R2, Resend, Cashfree **sandbox**, Telegram Bot API, Anthropic API — works today.
>
> **The strategy in one line:** build and polish everything that does NOT need those secrets until the product is a finished, tested, competitor-beating platform on sandbox; enter the feature freeze (§7.5); register the company; run the "Secrets Day" integration sprint (§7); run the pre-launch gauntlet (§8); launch — and judge the launch against the launch metrics (§8.5).

---

## 1. Findings — todo-file audit vs the live codebase

Every claim below was verified against main on 2026-07-16.

| Todo file | Status tag | Verified reality | Action |
|---|---|---|---|
| `1(half)` storage follow-ups | half | Correct. Still open: upload/download **rate limiting** (infra exists, not applied), **resumable uploads** (blocks course-video products), N+1 signing, 50-file cap, per-plan quota (unblocked by live `subscriptions`). | Fold into **Update 9** (storage hardening) + per-plan quota into **Update 5**. |
| `5(done)`, `10(done)` | done | Decision records; nothing to do. | None. |
| `6(half)` DB hardening | half | Mostly correct. **C1 coupon-create identity bug is FIXED** (`useCoupons` uses `getCreatorProfileId()` → `profiles.id`). Still open: CI gate, staging branch, dead tables (B1), enum conversion (B3), `updated_at` triggers (B4), leaked-password toggle (A3, one click), `public-asset` listing WARN (C2), pg_cron scheduling of `reconcile_creator_balances()`. | C1 → mark closed in the file. Rest → **Updates 1 & 9**. |
| `7(left)` dashboard refactor follow-ups | left → **stale** | **Item 1 (`is_free`/`tags` latent bugs) is FIXED** — the product editor now round-trips free/tags/compare-at/SEO through `products.metadata` (`app/dashboard/products/[productId]/page.tsx:4`). Item 2 (site-edit `any`) shrunk but still real: ~9 occurrences in `src/components/dashboard/site-edit/**` + ~23 in `app/dashboard/sites/edit/**` (largest: linkinbio page, 17). Item 3 (sizing-discipline drift) unverified, assume open. Item 4 (agent re-review) open. | Re-tag `(half)`; items 2–4 → **Update 4**. |
| `8(half)` dashboard health findings | half | Correct — #1 and #2 fixed as recorded; #3 (`any`) is the same item as todo 7 item 2. | Fold into **Update 4**. |
| `9(left)` linkinbio blockEditors reorg | left | **Trigger condition is now MET** — main, single-page, and payment editors all migrated to the premium `EditorShell` (dashboard-map §Editor packages). The reorg is unblocked. | Do in **Update 4** alongside the `any` cleanup (same files, one review). |
| `11(left)` discover perf + product metrics | left | Correct — `/discover` still fetches `.limit(100)` with full-size 2048px images and fake "Trending". | **Update 3** (Part A then Part B). |
| `12(half)` money/KYC/tax overhaul | half | Correct — all 7 phases built; every deferred item needs Cashfree Payouts creds / providers / registration. | Deferred list → **§7 Secrets Day**. |
| `13(left)` admin app | left | Correct — terminal scripts + `/dashboard/admin/payouts` interim remain. | Keep deferred; schedule **post-launch** (§9). |
| `14(left)` guest email hardening | left | Correct — `/api/checkout/create` still has **no `isValidEmail` guard** (only `normalizeEmail`); no guest email-confirm step; no `entitlement-admin` re-key script; discover external `product_link` Buy Now **still bypasses checkout** (`discover/[productId]/page.tsx:317`). | Items 1–3 → **Update 2**. Item 4 → product decision recorded in §5 (drop the bypass). |
| `15(left)` short links Phase 3 | left → **stale header** | Code is **merged to main** (branch `feat/short-links` deleted; `/api/s/[code]`, `/dashboard/links` live). Phase 3 attribution + branded domains + list polish still not started. | Fix branch reference; Phase 3 → **Update 10**; branded domains → custom-domain project (§9). |
| `16(left)` Instagram Auto DM follow-ups | left → **stale header** | Code is **merged to main** (`src/lib/server/instaauto/*`, `/dashboard/autodm` live, demo mode works). Blockers A1–A4 are all Meta/registration-gated. Verification item B6 (doc-confirm Graph endpoints) is doable now — it's read-only research. | Fix branch reference; B5 manual demo e2e → **Update 8**; A1–A4 → **§7**; B6 → **§7 prep**, can be done any time. |
| `0-TD.txt` + `To-Do` | scratch | Master roadmap Phase 0 (staging + deploy + CI + observability) is still the single biggest un-started risk item. Several 0-TD ideas map onto updates below (AI "Ava", entitlement-claim OTP, onboarding questions, template previews, discover cart). | Phase 0 → **Update 1**. Ideas absorbed into §5/§6. |

**Other codebase facts established:**

- Working tree is clean; last commit `e1f9c57` ("env fix and todo update").
- `.env.example` confirms exactly which secrets are blocked: `CASHFREE_PAYOUT_CLIENT_ID/SECRET/WEBHOOK_SECRET` ("no value yet"), `INSTAGRAM_APP_ID/APP_SECRET` ("no value yet"), `DIGIONE_GSTIN/PAN/ADDRESS` (placeholders). Everything else has local values, including Cashfree PG **sandbox** and `RESEND_API_KEY`.
- The 4 integrations pages (`/dashboard/integrations/{email,whatsapp,telegram,google-sheets}`) are **UI-only prototypes with no persistence** — the biggest gap between what the dashboard *shows* and what the product *does*.
- The upsell-pages feature was **removed** ("to be rebuilt under `/pay`") — so DigiOne currently has **no upsell/order-bump**, which is Stan Store's core conversion feature.
- Custom domains are **not functional** — `proxy.ts` rewrites unknown hosts to `/_custom/[domain]/*` but no handler exists.
- All four editors save via **direct `createClient()` in the client component** (flagged in dashboard-map) — works under RLS but bypasses server validation; a robustness item, not a security hole.

---

## 2. Where DigiOne stands vs competitors

Scan of Stan Store, Beacons, Gumroad, Linktree, SuperProfile, TagMango, Topmate (July 2026).

### What DigiOne already does at or above parity
- **Storefront variety:** 4 site types (link-in-bio, single-page, store, payment link) with a premium editor shell, live preview, undo/redo, templates — this is genuinely competitive with Linktree/Beacons editing and ahead of Stan's fixed layout.
- **Full native checkout** on our own rails (Stan's differentiator vs Beacons; Beacons still links out for some checkout paths).
- **Marketplace discovery** (`/discover`) — Gumroad-class feature no Indian link-in-bio tool has (needs the perf + real-trending work to be credible).
- **Money engine depth:** ledger, refunds with freeze-then-settle, KYC with encrypted PII, GST/TDS/TCS engine, invoices, annual statements — far beyond every competitor at this stage; TagMango/SuperProfile don't expose creator-grade tax artifacts.
- **Short links with analytics** on an owned domain (`linkln.me`) — Bitly-class, none of the storefront competitors have this.
- **Instagram Auto DM** — built (Topmate has this; Stan/Beacons partner with ManyChat). Blocked only on Meta review.

### The gaps that matter (ranked by buyer/creator impact)
| # | Gap | Who has it | DigiOne state | Planned |
|---|---|---|---|---|
| 1 | **Email marketing** (broadcasts + automated flows to leads/customers) | Stan, Beacons, TagMango, Gumroad | UI mockup only; Resend key already works | Update 6 |
| 2 | **Upsells / order bumps at checkout** | Stan (core feature), Gumroad | Removed, pending rebuild | Update 5 |
| 3 | **AI assist** (product descriptions, page copy, email drafts) | Beacons (heavily marketed) | None ("Ava" concept in 0-TD) | Update 7 |
| 4 | **1:1 bookings with real scheduling** (availability, calendar, meet link) | Topmate, SuperProfile, Stan | `services` page = CRUD list, no calendar/payments tie-in | Update 8 |
| 5 | **Product reviews/ratings** | Gumroad marketplace | None (store has manual testimonials) | Update 3B/5 |
| 6 | **Real trending/popularity + creator funnel analytics** | Gumroad | Fake trending; no product events | Update 3 |
| 7 | **Course/video delivery** (player, modules, progress) | TagMango, Graphy | Files + links only; no resumable upload | Post-launch (§9), resumable upload prep in Update 9 |
| 8 | **Custom domains** | Stan, Beacons (paid) | Rewrite exists, no handler | Post-launch (§9) |
| 9 | **Buyer memberships/subscriptions** | TagMango | Needs recurring mandates → blocked on Cashfree anyway | Post-launch (§9) |
| 10 | **Tip jar** | Beacons, Topmate | Payment-link flexible amount already covers it | Update 5 (package as a template, zero new code) |

**Positioning takeaway:** DigiOne's honest pitch after this plan = "Stan Store's selling power + Beacons' editor + Gumroad's marketplace + Indian rails (UPI via Cashfree, GST/TDS handled for you) + built-in short links & IG automation." No single competitor covers that set. The tax/compliance engine is the moat — lean into it in marketing surfaces.

---

## 3. The serial plan — overview

Each update is a shippable release: build → verify (`tsc` + lint + vitest + manual light/dark) → commit to main → move on. Order is dependency-aware; sizes are S (≤1 day), M (2–4 days), L (1–2 weeks).

| # | Update | Theme | Size | Needs secrets? |
|---|---|---|---|---|
| 0 | Housekeeping & quick wins | hygiene | S | No |
| 1 | Foundations: staging, CI, observability | risk | M | No |
| 2 | Buyer funnel hardening | revenue path | M | No |
| 3 | Discover: performance + real metrics | marketplace | L | No |
| 4 | Editor excellence I — robustness | editors | L | No |
| 5 | Editor excellence II — conversion features | editors | L | No |
| 6 | Email marketing v1 + honest integrations | automation | L | No (Resend live) |
| 7 | AI layer — "Ava" v1 | differentiation | M–L | Anthropic key only |
| 8 | Bookings & services upgrade + Auto DM e2e | creator tools | M–L | No |
| 9 | Storage & DB hardening | robustness | M | No |
| 10 | Short-link revenue attribution (Phase 3) | growth | M | No |
| 7S | **Secrets Day sprint** (after registration) | integration | M | **Yes — the gate** |
| 8S | Pre-launch gauntlet | testing | L | Sandbox + prod |

Updates 0–10 are all executable **today**. 7S/8S wait for the company registration. **After Update 10 ships, the feature freeze (§7.5) is in force** — nothing new gets built until launch is stable.

---

## 4. Updates 0–3 in detail

### Update 0 — Housekeeping & quick wins (S)
The cheap, verified items; clears stale state so every later session starts from truth.

1. Fix stale todo-later files: re-tag `7` → `(half)` (item 1 fixed), fix branch references in `15`/`16` (merged to main), mark `6` C1 closed (coupon fix verified).
2. `/api/checkout/create`: add the `isValidEmail` **400 guard** (todo 14 item 1 — ~15 min, closes a real fulfillment hole where a malformed guest email keys `guest_entitlements` to garbage). Mirror in `payment-link`.
3. Supabase dashboard: enable **leaked-password protection** (todo 6 A3 — one toggle) and drop the `public-asset` broad SELECT policy (C2).
4. **Product decision (recommended: drop it):** remove the external `product_link` Buy Now branch on `/discover/[productId]` (todo 14 item 4). Now that cart + library + checkout exist, an untracked exit path costs earnings, analytics, and buyer trust. Keep `product_link` strictly as the post-purchase access link.

**Acceptance:** tsc/lint/tests green; checkout rejects `foo@` with 400; discover always routes through checkout.

### Update 1 — Foundations: staging, CI, observability (M)
The master roadmap's Phase 0 — still the single biggest un-started risk. Everything after this gets faster and safer. **No feature work until this lands.**

1. **Supabase staging branch** (or second project) + seeded test data. All future migrations validate here first.
2. **Deploy pipeline:** pick Vercel (Next.js API routes deploy with the app), wire preview deploys per branch, document env-var management per environment.
3. **CI gate:** GitHub Actions running `tsc` + `lint` + `vitest` (114+ unit tests already exist) on every push. Playwright joins in Update 8S.
4. **Observability:** Sentry (client + server) + structured logging for `/api/*` (today's `console.error`s go nowhere). A prod failure you can't see is a refund you can't explain.
5. Schedule `reconcile_creator_balances()` via pg_cron (RPC already built — alert-only drift detection on the money tables).

**Acceptance:** a PR with a failing test cannot merge; a thrown error in `/api/checkout/create` appears in Sentry; the reconcile job writes to `balance_reconciliation_log` on schedule.

### Update 2 — Buyer funnel hardening (M)
The rest of todo 14 + funnel UX. The buyer experience is the revenue path; every papercut here is lost sales at launch.

1. **Guest email-confirm step** at checkout (the valid-but-wrong-email case is otherwise unrecoverable): inline "We'll email your access to **{email}** — correct?" confirm for the guest branch only; same on the discover BuyNow form. No friction for logged-in buyers.
2. **`scripts/entitlement-admin.ts`** re-key tool (mirrors `kyc-admin`/`refund-admin` pattern) — support recovery for mistyped guest emails; logs every re-key.
3. **Funnel polish pass** (UI-designer eyes, mobile-first — most Indian buyers arrive from Instagram on a phone): cart drawer → checkout → Cashfree sandbox → `/payment/status` → access email → `/account/library`. Fix hierarchy, spacing, empty/error states; make the post-purchase "here's how you get your files" moment unmistakable.
4. Claim-entitlements trust: the 0-TD note about verifying identity before buyer→creator upgrade — add a confirm/verification modal on `upgrade-to-creator`.

**Acceptance:** a guest typo is either caught at checkout or recoverable via script within minutes; the full sandbox purchase flow feels launch-grade on a 360px screen.

### Update 3 — Discover: performance + real metrics (L)
Todo 11 verbatim — decisions are already locked; this makes the marketplace credible (gap #6, #5-prep).

**Part A (pure front-end, ship alone first):** `cdnImage()` helper (Cloudflare Image Resizing, pass-through for foreign origins), `useInfiniteQuery` pagination at 24/page with server-side sort, drop the fake Trending pill, kill `backdrop-blur` on card badges, lazy avatars. *Verify Cloudflare Image Resizing is enabled on the media zone first — the fallback keeps it safe either way.*

**Part B (the pipeline):** `product_events` + `product_stats` + `increment_product_stat` RPC (mirror the proven `linkinbio_analytics` shape — rate-limited, IP-hashed, deduped, always-2xx), server-side `purchase` events from `fulfillOrder`, pg_cron `trending_score` (7-day weighted window), re-enable Trending, then the **creator payoff**: per-product funnel analytics tab (impressions → views → add-to-cart → purchases, conversion %, revenue) via `useProductAnalytics` + a roll-up in `/dashboard/analytics`.

**Acceptance:** discover first-paint requests ~400px AVIFs and 24 cards; Trending is backed by `product_stats.trending_score`; a creator can see a real funnel per product. Update maps/rules docs in the same change-set.

---

## 5. Updates 4–5: Editor excellence (the "advanced version of other tools" mandate)

### Update 4 — Editor robustness (L)
Make the 4 editors *engineering-grade* before adding features. All items verified open.

1. **Zero-`any` pass** across `src/components/dashboard/site-edit/**` (~9) and `app/dashboard/sites/edit/**` (~23, linkinbio page worst at 17). Type the section/draft shapes off `site_design_tokens`/`site_sections_config` row types + local discriminated unions. Then turn on a **lint gate: no new `no-explicit-any` errors** in CI.
2. **`blockEditors/` folder reorg** (todo 9 — trigger met, plan already written in the todo: `git mv` to `blocks/`, glue-file import edits enumerated there). Same files as #1 — one review.
3. **Move editor saves behind hooks/API routes.** Today all four editors write via direct `createClient()` in the page. Wrap saves in `useSiteEditMutations`-style hooks with server-side validation (slug rules, section-shape validation, size caps). This is what makes "robust" true: a malformed save can't corrupt a live storefront.
4. **Autosave + recovery:** debounced draft autosave (localStorage first, DB draft column if cheap), so a tab crash never loses 20 minutes of editing. Keep the explicit Save as the publish-to-live action. This is a Beacons/Linktree table-stakes behavior we currently lack.
5. **Block parity fixes** (storefront-map found them): add a `DividerBlock` editor (renderer exists, editor can't create one); migrate/alias `email_capture` → `lead_form` cleanly.
6. **Sizing-discipline pass** (todo 7 item 3): eyes-on sweep of the ~24 files using `font-extrabold`/oversized titles vs the design system, light + dark.
7. Re-run the multi-agent editor code review (todo 7 item 4).

**Acceptance:** lint zero-`any` in editor scope; a hard refresh mid-edit restores the draft; saves round-trip through validated hooks; divider block creatable end-to-end.

### Update 5 — Editor conversion features (L)
Now out-build the competition where it changes creator revenue.

1. **Rebuild upsells under `/pay`** (gap #2 — Stan's flagship). One-click post-payment upsell + order-bump checkbox at checkout. Sandbox-testable end-to-end; the money math already flows through `fulfillOrder`.
2. **Link-in-bio advanced blocks** (Linktree/Beacons parity+): countdown, FAQ, testimonial, YouTube-latest embed, **scheduled/limited-time links** (publish window on any block), lead-magnet delivery (lead form → auto-email the file via Resend — pairs with Update 6).
3. **Template gallery expansion** (0-TD: "create all site skeletons with rich content… preview all at one place"): 8–12 rich, pre-filled templates per site type with a visual gallery picker. Templates are the #1 activation lever — a new creator should reach a beautiful live page in <5 minutes.
4. **Tip-jar packaging** (gap #10): a "Tips" template preset over the existing flexible-amount payment link + a link-in-bio tip block. Zero new plumbing; pure packaging.
5. **Product reviews v1** (gap #5): `product_reviews` table (verified-buyer-only via `user_product_access`), star summary on discover cards + product page, moderation toggle in the product editor. (RLS + migration in the same change-set per CLAUDE.md.)
6. **Per-plan storage quota** (todo 1 #3 — now unblocked): replace the fixed quota in `/api/upload` with a plan lookup; surfaces the Free→Pro upgrade path honestly.
7. **Onboarding interview** (0-TD): first-dashboard-visit questionnaire (niche, product type, goals) → drives template suggestions + is the future personalization seed.

**Acceptance:** a creator can build a store with upsell + tips + reviews and every piece works in sandbox; new-creator time-to-first-published-page < 5 min with templates.

---

## 6. Updates 6–10: automation, AI, and growth (all unblocked today)

### Update 6 — Email marketing v1 + honest integrations (L)
Gap #1 — the single most-cited competitor feature DigiOne lacks, and **Resend already works**.

1. **Broadcasts:** compose (subject/body + product/coupon insert) → send to segments (all customers, buyers of product X, leads from site Y — data already in `orders`/`lead_form`). Rate-limited, unsubscribe link + suppression list (legal requirement), send log table.
2. **Automated flows v1** (keep it to 3 proven ones, not a flow-builder): welcome email on lead capture; post-purchase follow-up (D+3); abandoned-checkout nudge (pending order > 2h). Cron-driven via the existing `CRON_SECRET` pattern.
3. **Telegram integration (real):** Bot API is free, no company needed — new-sale + new-lead notifications to a creator's chat; replaces the mock page with something real.
4. **Honesty pass on integrations hub:** WhatsApp + Google Sheets prototypes get an explicit "Coming soon — waitlist" state (WhatsApp Business API is Meta-verification-gated anyway). A dashboard that pretends is worse than a dashboard that promises.
5. All email tables get RLS + migrations in the same change-set; every send writes a log row (deliverability debugging).

**Acceptance:** a real broadcast lands in an inbox with a working unsubscribe; the 3 flows fire from seeded events in staging; no dashboard page claims a capability that doesn't exist.

### Update 7 — AI layer: "Ava" v1 (M–L)
Gap #3. Needs only an Anthropic API key (no registration dependency). New dependency → the CLAUDE.md ask-first rule applies — get sign-off on the SDK, budget caps, and per-plan rate limits before building.

1. **Server-only `/api/ai/*`** (key never in the browser), per-creator daily quota keyed off the subscriptions tier — an organic Plus/Pro upsell.
2. **v1 surfaces (writing assist only — deliberately scoped):** product description generator (product editor), page-copy suggestions (single-page hero/about in the editors), email subject/body drafts (Update 6 composer), bio/tagline suggestions (link-in-bio profile).
3. Brand it **Ava** (per 0-TD), one consistent assist affordance across surfaces — same trigger, same panel, same tone. Design it once as a primitive, not four one-offs.
4. Defer: AI site generation, smart DM replies (`smart_ai` is already stubbed disabled in autodm), chat. v2 material.

**Acceptance:** generate → edit → apply works in all four v1 surfaces; quota enforced; zero client-side key exposure.

### Update 8 — Bookings upgrade + Auto DM demo e2e (M–L)
1. **Services → real bookings** (gap #4, Topmate parity): availability windows per service, slot picker on a new storefront booking block/page, booking → **payment via existing checkout** (sandbox), confirmation email (Update 6), ICS calendar attachment. Defer native Google-Calendar/Meet OAuth integration if it drags — ICS + email covers the core loop.
2. **Auto DM manual demo e2e** (todo 16 B5): run the full simulated-account script (demo account → keyword automation → simulate → lead + sent DM + counters; follow-gate; negative-keyword veto). This also produces the **screencast material Meta App Review requires** — record it now so 7S isn't blocked on it.
3. Doc-confirm the Graph API endpoints/shapes (todo 16 B6 — read-only research, de-risks 7S).

**Acceptance:** a buyer can book + pay for a 1:1 slot in sandbox and both sides get confirmations; the Auto DM demo screencast is recorded and archived.

### Update 9 — Storage & DB hardening (M)
The robustness debt that becomes dangerous at launch scale.

1. **Rate limiting** on `/api/upload`, `/api/media/*`, `/api/deliverables/*`, `/api/private/download` (todo 1 #1 — `rate_limits` infra exists, just apply it).
2. **Resumable/multipart uploads** for `creator-content` (todo 1 #2 — S3 multipart via R2). This is the prerequisite for course-video products (gap #7) and for flaky-4G creators generally.
3. **Dead-table decision** (todo 6 B1): drop `user_wallets`, `user_wallet_transactions`, `creator_revenue_shares`, `creator_subscription_orders`, `conversion_events`, `product_view_events`, `site_page_views`, `site_templates`, `user_carts`, `user_wishlist`, `email_events` — except any that Updates 3B/5/6 now claim (e.g. reviews/email tables supersede; `user_wishlist` only if a wishlist gets prioritized).
4. Enum conversion for status columns (B3) + `updated_at` trigger convention (B4). Skip the invasive naming pass (B2) until post-launch — churn risk exceeds value right now.
5. `/api/deliverables` N+1 signing fix if course products (many files) become real; otherwise leave.

**Acceptance:** upload abuse is bounded; a 200MB file survives a connection drop; schema contains no dead tables; advisors clean.

### Update 10 — Short-link revenue attribution (M)
Todo 15 Phase 3 — the feature that makes `linkln.me` strictly better than Bitly for creators. It touches the checkout route (metadata-only) → follow the todo's own rule: **own spec + security review before code.**

- Additive `linksh_links` columns (`link_target`, `product_id`, `site_id`, `referral_code`); one-click "shorten my product/site" in the create modal; query-param carrier across the `linkln.me` → `digione.ai` domain gap → captured into localStorage → stamped into `orders.metadata.shortlink_code` at checkout; "₹ driven" per link on the analytics page.
- Sandbox-testable end-to-end (sandbox orders attribute fine).
- List polish from todo 15 §3 (tag filter, sort, archived toggle) rides along.

**Acceptance:** click a product short link → buy in sandbox → the link's analytics page shows the revenue.

---

## 7. Secrets Day — the integration sprint (after company registration)

Everything here is **prepared but blocked**. The day the entity + bank account + GSTIN exist, run this as one focused sprint. Prep items marked ◆ can be done before registration.

**Cashfree (PG production + Payouts):**
1. Complete Cashfree merchant KYB → production PG keys → set `CASHFREE_ENVIRONMENT=PRODUCTION` + creds in prod env only (sandbox stays in staging).
2. Apply for Cashfree **Payouts** → fill `CASHFREE_PAYOUT_CLIENT_ID/SECRET/WEBHOOK_SECRET`.
3. Run the **Phase 1 contract spike** (todo 12): confirm the Payouts V2 API end-to-end in sandbox — bearer auth, beneficiary create + idempotency, transfer, `getTransfer`, and **which webhook signature variant Cashfree actually sends** (two verifiers exist in `cashfree-payouts.ts`; delete the dead one). ◆ *the sandbox portion may be attemptable earlier if Cashfree grants payouts sandbox pre-registration — check once.*
4. Full payout e2e: request → admin approve → beneficiary + transfer → webhook → `settle_payout` → balance released. Then the refund-webhook sandbox e2e (Phase 4 deferral).
5. Wire the payout-sync + reconcile crons in prod scheduler.

**Meta (Instagram Auto DM):**
6. Business verification → App Review for `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments` (weeks of lead time — **submit this first on Secrets Day**). ◆ Screencast recorded in Update 8; ◆ Graph endpoints doc-confirmed in Update 8.
7. Set `INSTAGRAM_APP_ID/APP_SECRET/WEBHOOK_VERIFY_TOKEN` in prod; register the webhook (`/api/webhook/instagram`, fields `comments`, `messages`, `message_postbacks`); schedule the two crons (`drain` ~1min, `maintenance` daily).

**Identity & tax:**
8. Real `DIGIONE_LEGAL_NAME/GSTIN/PAN/ADDRESS/STATE(_CODE)` in prod env → commission tax invoices go live.
9. KYC provider credentials (Cashfree Verification/Signzy) → wire the provider hooks in `kyc-verify.ts` (auto PAN/penny-drop); until then terminal `kyc-admin` continues.
10. Subscription **real billing** (Cashfree mandates/AutoPay) — this converts the informational plan picker into self-serve revenue. Failed renewal → auto-downgrade to Free (never block sales).

**Also unblocked by registration:** WhatsApp Business API (integrations), legal pages with real entity details (terms/privacy/refund — shells exist in marketing).

---

## 7.5 Feature freeze — the gate before launch

**Very important — otherwise launch keeps moving forever.**

**The gate:** after Update 10 ships (and again after the Secrets Day sprint §7), the platform enters **feature freeze** until launch + 2 stable weeks.

During the freeze, **no new features.** Only:

- **bug fixes**
- **security** (patches, dependency updates, hardening findings)
- **polish** (states, copy, spacing — no new capability)
- **docs** (reference maps, rules, runbooks)
- **tests** (unit, integration, Playwright — coverage only goes up)

**Rules:**
- Any "small feature, it'll only take a day" during the freeze goes into `.claude/todo-later/` instead. No exceptions — the freeze exists precisely because every exception feels reasonable.
- The pre-launch gauntlet (§8) runs entirely inside the freeze — testing against a moving target is not testing.
- The freeze lifts only when the launch metrics (§8.5) are green for 2 consecutive weeks post-launch; then the post-launch backlog (§9) opens.

---

## 8. Pre-launch gauntlet (after 7S, before real traffic)

1. **Playwright E2E on staging** (plan already in todo 6 A2): login, signup+role promotion, purchase (free-order deterministic path + sandbox paid path), withdraw (KYC-verified seeded creator), admin approve. Wire into CI.
2. **Integration suite green** (`npm run test:integration`) against staging.
3. **Security re-review** of the full money path + a Cloudflare pass (WAF, bot rules, rate limits at the edge — To-Do #14) once the domain is on Cloudflare.
4. **Go-live checklist** (To-Do 4c): rotate any exposed secrets, advisors clean, backups/PITR confirmed on the Supabase tier, load smoke test, all prod env vars set, DNS/domains (app, `linkln.me`, `media.`/`assets.`) verified.
5. **Manual creator-journey dress rehearsal:** new creator signs up → onboarding → template → product → publish → share short link → buyer purchases on a phone → files delivered → creator sees earnings → requests payout → payout settles. Every step screenshotted, light + dark. If any step needs an explanation, it's not done.

---

## 8.5 Launch metrics — how we know launch succeeded

**Without numbers, "launch succeeded" is a feeling, not a fact.** Success criteria for the first 30 days after go-live, each with its measurement source so it's checkable, not aspirational:

| Metric | Target | Measured from |
|---|---|---|
| Creators onboarded (published ≥1 site or product) | **10** | `profiles` joined to `sites`/`products` (`is_active`/published) |
| Completed orders | **100** | `orders` where `status = 'completed'` |
| Payment success rate | **≥ 95%** | webhook `SUCCESS` ÷ all terminal payment events (`orders.status` completed vs failed; track `USER_DROPPED` separately as checkout abandonment) |
| Fulfillment success rate | **≥ 99%** | orders completed with `user_product_access`/`guest_entitlements` granted + receipt email sent ÷ completed orders (Sentry alerts on any `fulfillOrder` step failure) |
| Payout failures | **0** | `creator_payouts` where `status = 'failed'` (excluding admin rejects) + `balance_reconciliation_log` drift rows |
| Invoice failures | **0** | Sentry errors on `/api/invoices/*` + `issue_invoice` RPC errors |
| Lost entitlements | **0** | support re-keys via `scripts/entitlement-admin.ts` (every run is logged) + buyer "can't access my purchase" tickets |
| Median checkout time (cart → payment confirmed) | measure, then set target | `orders.created_at` → webhook completion timestamp; supplement with client timing events |
| Median page load (storefront + discover) | measure, then set target | Vercel Analytics / Sentry performance (ties to the performance budget, §10.5) |
| Support tickets | count + categorize weekly | whatever inbox is live at launch (email); every ticket tagged: payment / delivery / editor / KYC / other |

**Rules:**
- Review these weekly for the first month. A red metric halts feature work (see §7.5) until it's green.
- The "measure, then set target" rows get real targets after week 1 of data — don't invent numbers without a baseline.
- Instrumentation for all of these lands in Update 1 (observability) and Update 3 (events pipeline) — verify during the gauntlet (§8) that each metric is actually queryable before launch, not after.

---

## 9. Explicitly deferred (post-launch backlog — do not start before launch)

- **Separate admin app** (todo 13) — terminal scripts + `/dashboard/admin/payouts` are sufficient at launch volume.
- **Custom domains** (+ per-creator branded short domains, todo 15 §2) — needs the full DNS/TXT-verify/cert system; the `/_custom` handler doesn't exist yet.
- **Course player** (modules/progress/video streaming) — Update 9's resumable uploads is the prerequisite; the player is post-launch.
- **Buyer memberships/recurring products** — needs mandates (Cashfree), design after subscription billing proves out.
- **Mobile apps** (To-Do #16) — after the web product is stable in production.
- **DB naming overhaul** (todo 6 B2) — invasive, low user value; batch with a quiet period.
- **Auto DM Phases 2–3** (smart AI replies, flows, checkout links in DMs) — after Meta approval and Update 7's AI foundation.

---

## 10. Design-quality bar (applies to every update above)

The UI-designer standard each release must clear — this is what "robust and matching" means in practice:

1. **One design language per surface** — dashboard = token system (`dashboard-design.md`), marketing/auth/account = engineered-ledger (`ledger-design.md`), storefront = creator vars. No drift, no hardcoded hex.
2. **Every page, both themes** — light + dark verified by eyes, not assumption.
3. **All five states designed** — loading (`Skeleton`), empty (`EmptyState` with a CTA), error (recoverable message, never a dead end), partial data, and success. Most "robustness" complaints are really missing-state design.
4. **Mobile-first for anything a buyer touches** — Instagram traffic is ~90% phones; the funnel gets designed at 360px and adapted up.
5. **Keyboard + focus rings** on every interactive element (`--focus-ring` — already the rule, enforce in review).
6. **Money is sacred UI:** `tabular-nums`, ₹ Indian formatting, withheld amounts shown *before* confirm, destructive actions behind `ConfirmDialog`.
7. **No fake UI.** A control that doesn't work yet is labeled "Coming soon" or removed. (Integrations pages are the current violation — fixed in Update 6.)
8. Docs stay true: `docs/reference/*` maps + `.claude/rules/*` updated in the same change-set as any route/renderer change (the Stop hook enforces it).

---

## 10.5 Performance budget (engineering constraints, per release)

§10 defines design quality; this section defines the **engineering budgets**. These are constraints, not aspirations — a PR that blows a budget is a failing PR, same as a failing test.

| Surface | Budget |
|---|---|
| Storefront LCP (link/site/store/pay/discover) | **< 2.5s** (4G, mid-range Android — the actual buyer device) |
| Storefront CLS | **< 0.1** |
| Storefront JS bundle (first load, per route) | **< 250KB** |
| Storefront images | **< 150KB each, AVIF/WebP** (enforced by the Update 3 `cdnImage()` work — no full-size 2048px originals in grids) |
| Dashboard interaction latency (click → visible response) | **< 100ms** (optimistic UI / instant skeleton, never a dead click) |
| Checkout API (`/api/checkout/create`) | **< 500ms** p50 |
| Search (`/api/products/search`, discover filters) | **< 300ms** p50 |

**Enforcement:**
- Wire Lighthouse CI (or `next build` bundle-size check + Vercel Analytics thresholds) into the Update 1 CI gate so budgets are checked per PR, not discovered at launch.
- Measure API latencies via the Update 1 observability work (Sentry performance / route timing logs).
- Budgets apply from Update 3 onward (that update does the heavy image/pagination lifting that makes them reachable).

---

## 11. Competitor-scan sources

- [Stan Store vs Gumroad (2026)](https://stan.store/blog/stan-store-vs-gumroad/) · [Stan Store vs Beacons (2026)](https://stan.store/blog/stan-store-vs-beacons/) · [Stan Store alternatives (Sellfy)](https://sellfy.com/blog/best-stan-store-alternatives/) · [Stan Store alternatives (Fourthwall)](https://fourthwall.com/blog/8-stan-store-alternatives-to-help-boost-your-sales-today)
- [Topmate — content monetization platforms 2026](https://topmate.io/blog/what-are-content-monetization-platforms) · [Topmate alternatives India (Peerseek)](https://peerseek.io/blogs/topmate-alternatives-india) · [Best creator platforms India (Fancall)](https://www.fancall.in/best-creator-platforms-india)
- [SuperProfile alternative analysis (Playto)](https://www.playto.so/blogs/superprofile-alternative-india) · [TagMango overview](https://blog.tagmango.com/what-does-tagmango-actually-do/) · [TagMango alternatives (SuperProfile)](https://superprofile.bio/blog/tagmango-alternatives)
