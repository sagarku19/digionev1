---
noteId: "08b04200732111f19a5ba9a9f70f067a"
tags: []

---

# Discover performance + real product metrics (deferred)

Status: **left** (not started). Added 2026-06-29.
Origin: `/discover` page felt laggy. Brainstormed the fix + a proper popularity/metrics
system (the "Trending" sort is currently fake — no backing metric). Two related but
separable workstreams below. Do Part A first (pure perf, no schema); Part B (metrics)
is what makes "Trending/Popular" real and unlocks creator analytics.

Decisions already locked in brainstorming:
- Catalog scale: **medium (hundreds)** of published products → need thumbnails **and** pagination.
- Thumbnail strategy: **Cloudflare Image Resizing** (`/cdn-cgi/image/...`), on-the-fly, covers existing images.
- Pagination UX: **infinite scroll** (IntersectionObserver sentinel), page size 24.

---

## Part A — `/discover` performance (no schema change)

Root causes found (`app/(marketing)/discover/page.tsx`):
1. Every grid card loads the **full 2048px WebP** original (`src/lib/storage/images.ts:8` caps uploads at 2048w; there are no thumbnail variants). Hundreds of KB each → decode/bandwidth lag.
2. Page fetches `limit(100)` and renders all of them; the "All" view groups client-side, forcing a full fetch.
3. `backdrop-blur` on all three card badges (category / price / Hot) × many cards → GPU scroll/hover jank.
4. Creator avatars (`discover/page.tsx:394`) are **eager** (no `loading="lazy"`).
5. Query key includes category with no `staleTime` → refetch on every pill click.

### A1. Thumbnail helper — new `src/lib/storage/cdn.ts`
- `cdnImage(url, { width, quality = 70 })` rewrites a media URL:
  `https://media.digione.ai/<key>` → `https://media.digione.ai/cdn-cgi/image/width=400,quality=70,format=auto/<key>`
- `format=auto` → AVIF/WebP per browser.
- **Pass-through unchanged for non-media origins** (creator avatars can be Google OAuth `googleusercontent.com` URLs — Cloudflare can't transform those). Only rewrite URLs whose origin === `NEXT_PUBLIC_R2_MEDIA_URL` (and optionally `NEXT_PUBLIC_R2_BUCKET_PUBLIC_URL`).
- Grid thumbnails request ~400w; avatars ~48–96w.
- Add a small unit test (mirror `src/lib/storage/images.test.ts`): media URL is rewritten, foreign URL is untouched, query-string/edge cases handled.

**Dependency / risk to verify first:** Cloudflare Image Resizing must be enabled on the zone serving `NEXT_PUBLIC_R2_MEDIA_URL` (paid feature — Pro-plan zone or the Cloudflare Images product) and that domain must be Cloudflare-proxied. If a URL isn't resizable the `/cdn-cgi/image/` path 404s — the pass-through fallback keeps the original working, so ship is safe either way, but thumbnails only "win" once it's on.

### A2. Server-side pagination — replace `limit(100)` + client grouping
- Convert the fetch to `useInfiniteQuery` with `.range(from, to)`, **page size 24**.
- IntersectionObserver sentinel at the bottom of the grid → fetch next page. `getNextPageParam`: more pages while last page length === 24.
- **Move sorting server-side** (`.order()`): `latest`→`created_at desc`, `price_low`→`price asc`, `price_high`→`price desc`.
- **Drop the "Trending/Popular" sort pill for now** (it has no real metric — see Part B). Re-add once Part B ships.
- **Replace the per-category client-side rails** (featured + 4-per-category) with: one "Trending/Latest" strip (first 6 of page 1) + a single paginated grid. Category browsing happens through the existing pills (now server-filtered + paginated). Lightweight category rails can come back later as their own `limit(8)` queries per rail if desired.
- Add `staleTime: 60_000` to avoid instant refetch when re-selecting a category.

### A3. Cheaper card paint (`ProductCard` in same file)
- Drop `backdrop-blur` on the three badges → solid `bg-[#16130F]` (price badge keeps the emerald variant for free).
- Add `loading="lazy"` to the creator avatar `<img>`.
- Route both `<img>` srcs through `cdnImage(...)`.
- Keep `aspect-[4/3]` box (already there — prevents layout shift).

### A4. Out of scope for Part A (flag only)
- Converting the page to a server-rendered first page (stays `'use client'`).
- next/image migration (team deliberately avoids it; `next.config.ts` has no `images.remotePatterns`).

**Net effect:** card image ~2048px (100s of KB) → ~400px AVIF (~15–30KB), render 24 not 100. First paint + scroll get marketplace-light.

**Verify:** `npx tsc --noEmit`, `npm run lint`, manual `/discover` (light/dark N/A — marketing is light only), Network tab shows `/cdn-cgi/image/` thumbnails + paged requests. Update `docs/reference/storefront-map.md` only if discover is listed there (it's marketing, likely not — confirm).

---

## Part B — Real product metrics & popularity (how marketplaces/SaaS do it)

Goal: replace the fake "Trending" with a real, time-decayed popularity score, and give
creators product analytics (views → conversion → revenue). This is the standard
event-pipeline-then-aggregate pattern (Flipkart/Amazon/Gumroad/most SaaS).

There is already a working reference pattern in this repo to mirror:
`linkinbio_analytics` table + `increment_link_click_count` RPC + `POST /api/linkinbio/track`
(fire-and-forget, rate-limited via `rate_limits` + `check_rate_limit`, IP SHA256-hashed,
30s dedupe, always 2xx). Reuse that shape for products — don't reinvent it.

### B1. Event capture (append-only)
- New table `product_events` (or extend the analytics pattern):
  `id, product_id (fk), creator_id, event_type ('impression'|'product_view'|'add_to_cart'|'purchase'), session_or_ip_hash (text, 16 chars), referrer text, created_at`.
  - RLS: public **insert** via service role only (route-guarded), creator **select** of their own (`creator_id = current_profile_id()`), super_admin select.
  - Indexes: `(product_id, created_at)`, `(creator_id, created_at)`, `(event_type, created_at)`.
- New route `POST /api/products/track` modeled on `linkinbio/track`:
  - Body `{ product_id, event_type }`. Always returns 2xx (never block UX).
  - Rate-limit 60/min/IP fail-open; 30s per `ip_hash + product_id + event_type` dedupe (kills refresh/bot inflation of views).
  - `purchase` events are NOT trusted from the client — they're emitted server-side from `fulfillOrder` (`src/lib/server/fulfillment.ts`) so they can't be spoofed. Only `impression`/`product_view`/`add_to_cart` come from the browser.
- Client wiring: fire `impression` when a card scrolls into view (reuse the IntersectionObserver from A2, debounced/once per card), `product_view` on the product detail page mount, `add_to_cart` from the cart hook.

### B2. Aggregates (don't COUNT the event table on every read)
- New table `product_stats` (1 row per product):
  `product_id pk, view_count bigint, impression_count bigint, add_to_cart_count bigint, sales_count bigint, revenue_total numeric, last_event_at, updated_at`.
  - Maintained by an `increment_product_stat(product_id, field, delta)` RPC (mirror `increment_link_click_count`), called from the track route + `fulfillOrder`.
  - Or: a Postgres trigger on `product_events` insert that bumps the counter. RPC is simpler/cheaper; trigger is more automatic. Pick RPC to match existing conventions.
  - RLS: creator select own; public select of the **read-only** popularity columns is acceptable (or expose only via the discover query). Writes service-role only.

### B3. Popularity / "Trending" score (time-decayed)
- Marketplaces don't rank by lifetime totals (old products would dominate). Use a **rolling, decayed score**. Two options:
  - **a) Rolling-window score (simple, recommended to start):** a nightly/in-RPC computed `trending_score = w1 * views_7d + w2 * add_to_cart_7d + w3 * sales_7d`, where the `_7d` come from `product_events` aggregated over the last 7 days. Store on `product_stats.trending_score` + `trending_window_start`. Refresh via Supabase **pg_cron** (hourly or 6-hourly). Weights tunable; sales weighted highest (e.g., 1 / 3 / 10).
  - **b) Continuous time-decay (Hacker-News / Reddit style):** `score = (sales*W + views) / pow(age_hours + 2, gravity)`. No window; decays smoothly. More elegant, harder to index/sort efficiently at scale without periodic recompute.
  - Start with (a) + pg_cron; revisit (b) if needed.
- `/discover` "Trending" sort then becomes `.order('trending_score', { desc })` on the joined `product_stats` — re-enable the pill dropped in A2.
- Guardrails: exclude unpublished/deleted; floor the score; consider a small "new product" boost so fresh listings aren't invisible (cold-start).

### B4. Creator-facing analytics (the SaaS deliverable)
- Surface `product_stats` in the dashboard product editor / a per-product analytics tab:
  impressions → views → add-to-cart → purchases funnel, conversion rate, revenue, 7/30-day sparkline (recharts, per `dashboard-design.md`).
- New hook `useProductAnalytics(productId)` in `src/hooks/analytics/`.
- Ties into the existing `/dashboard/analytics` page for an account-wide roll-up.

### B5. Abuse / accuracy notes
- Dedupe + rate-limit (B1) prevent view inflation.
- Bot filtering: optionally drop events with no/identical UA or known crawler UAs.
- Keep `product_events` prunable (e.g., pg_cron deletes raw events > 90 days once aggregated) so the table doesn't grow unbounded — aggregates in `product_stats` are the long-term record.

### B6. Migration/order-of-work for Part B
1. Migration: `product_events`, `product_stats`, `increment_product_stat` RPC (+ RLS + indexes). Apply via Supabase MCP (Windows CLI broken), then `npm run update-types`.
2. `/api/products/track` route + client wiring (impression/view/add_to_cart).
3. `fulfillOrder` emits `purchase` + bumps `sales_count`/`revenue_total`.
4. pg_cron job to compute `trending_score`.
5. Re-enable Trending sort on `/discover`.
6. Creator analytics UI + `useProductAnalytics`.
7. Update `.claude/rules/api-routes.md`, `.claude/rules/security-model.md` (new public write surface), `docs/db/schema-reference.md`, and the dashboard/storefront maps.

---

## Suggested sequencing
- **Ship Part A alone first** — pure front-end perf, no schema, immediate win. Drop the Trending pill in A2.
- **Then Part B** as a proper feature (schema + pipeline + cron + creator analytics), which re-enables Trending with a real metric.
