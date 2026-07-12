---
noteId: "6877ec607dad11f1b7ddffeec518d7f9"
tags: []

---

# Short Links — Design Spec

**Date:** 2026-07-12
**Branch:** `feat/short-links`
**Status:** Approved design → ready for implementation plan
**Owner domain:** Backend (`app/api/`, `src/lib/`, `supabase/`) + Dashboard (`app/dashboard/`, `src/components/dashboard/`)

---

## 1. Summary

A link shortener for DigiOne creators. Creators mint short links on a dedicated branded domain (`{shortdomain}/{code}`), share them anywhere, and see click analytics in their dashboard. Links are managed entirely from a single **Short Links** page in the dashboard's **Grow** group.

**Why in-app, not a separate product.** The strategic value of a DigiOne shortener is *attribution* — tying a click to an actual `orders` row and creator earnings ("this link drove ₹12,400 in sales"). That join only exists inside DigiOne because DigiOne owns checkout. A standalone shortener is a commodity that competes with free Bitly/Dub and has no moat. Creator identity, auth, RLS, the service client, rate-limiting, the dashboard shell, and the design system already live here — a separate app would duplicate all of it for no gain. The one real risk (phishing abuse poisoning domain reputation) is neutralized by using a separate *domain*, not a separate *app*. The redirect hop is kept thin enough to extract into an edge worker later **if** volume ever justifies it; that is a future optimization, not a second app.

---

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Where it lives | Inside DigiOne (this app) |
| Domain | Dedicated short domain, configurable via `NEXT_PUBLIC_SHORTLINK_DOMAIN`. Never hardcoded. |
| Path shape | Bare root — `{shortdomain}/{code}` (whole domain is the shortener) |
| Bare root `/` | 302 → `NEXT_PUBLIC_APP_URL` (digione.ai) |
| Reserved codes | Small set: `robots.txt`, `sitemap.xml`, `report`, empty string (matcher already excludes `/api`, `_next`, `favicon.ico`, image assets) |
| UA parsing | Inline lightweight regex (device / browser / OS) + bot-skip regex. **No new package.** |
| Attribution | Pure MVP — links model a generic external destination only. No `product_id` / `referral_code` / `link_target`, no order stamping. Attribution lands wholesale in Phase 3. |
| Access | All creators, free plan included (same as coupons / affiliates). Not plan-gated in Phase 1. |
| Redirect status | `302` + `Cache-Control: no-store` (never `301` — cached 301s break edits + analytics) |
| UI aesthetic | Modern link-shortener look (Dub.co / Bitly idiom) — favicon-led link rows, inline copy + QR, click badges, live-preview create panel, dedicated analytics page — rebuilt entirely on DigiOne CSS-var tokens (no hardcoded hex, lucide-only, compact density, brand red reserved for the primary CTA). |
| Analytics surface | Dedicated detail page `/dashboard/links/[id]` (resolves the earlier drawer-vs-page question in favor of the modern-tool feel). |
| Redirect caching | Short-TTL (30s) **in-process** cache of the `code → link` resolution to cut DB reads on popular links. 302 stays `no-store` for clients. Trade-off: pause/edit/disable propagate after ≤TTL on the hot path. Shared-cache cross-instance invalidation (Redis) deferred. |
| Click idempotency | Insert + counter bump collapsed into one atomic RPC `linksh_record_click` guarded by a UNIQUE `dedup_hash` — double-processing a click is a no-op. |

---

## 3. Phase overview

Phase 1 is the full scope of this spec. Phases 2 and 3 are described briefly so the Phase 1 schema and code boundaries are drawn with them in mind, but they are **out of scope** here and each get their own spec → plan cycle later.

### Phase 1 — MVP (this spec)
The complete create → share → track loop. Two tables + one RPC, the redirect route, validated write routes, the dashboard page, and the `useShortLinks` hook. Details in §4–§8.

- Create / edit / pause / archive links; auto 7-char code or custom code.
- Editable destination (change after sharing).
- UTM builder (stored as columns, appended to the destination on redirect).
- QR code per link (`qrcode.react`, already installed — client-side).
- Per-link analytics: total + unique clicks, time series, referrer, country, device / browser / OS.
- Tags + search; denormalized `click_count` for the list view.
- Expiration date + fallback redirect URL.
- Open-redirect defenses, bot filtering, rate-limited creation.

### Phase 2 — Standard paid-tier features
Layers onto the Phase 1 tables without reshaping them.

- **Password-protected links** — `password_hash` column + an interstitial verify page before the redirect.
- **Device targeting** — `ios_url` / `android_url` columns; redirect picks per parsed OS.
- **Geo targeting** — `geo jsonb` column (country → destination map); redirect picks per `x-vercel-ip-country`.
- **Custom OG preview cards** — `og_title` / `og_description` / `og_image` columns; the redirect route serves an OG meta shell to social crawlers before bouncing humans.
- **Max-click limits** — `max_clicks` column; link deactivates once `click_count` crosses it (reuses the `expired_redirect_url` fallback).
- **Per-creator branded short domains** — new `linksh_domains` table (`creator_id`, `domain`, `verified_at`) plugging into the existing custom-domain rewrite, so creators can bring their own short domain.

### Phase 3 — Attribution (the differentiator)
The reason this is a DigiOne feature and not a Bitly clone. Ships as its own migration + reporting layer.

- **One-click shorten** for the creator's own products / sites (pre-fills destination from the storefront).
- **Auto-attach referral codes** to shortened product/site links.
- **Click → order attribution** — stamp the resolved short-link code into `orders.metadata` at checkout, then report revenue per link ("this link drove ₹12,400 in sales"). Requires the `link_target` / `product_id` / `referral_code` columns deferred from Phase 1 and a rollup or query layer over `orders` ⋈ `linksh_click_events`.
- **Note:** because Phase 1 defers attribution entirely, Phase 3 cannot retroactively attribute links created before it ships. Accepted trade-off.

### Future extraction (not a phase)
If redirect volume ever demands independent scaling, lift **only** the `GET /api/s/[code]` hop into a Cloudflare Worker / edge function reading the same Supabase. The route is designed self-contained specifically to keep this cheap. Not planned; noted so the boundary stays clean.

---

## 4. Data model — 2 tables + 1 RPC

All objects are prefixed `linksh_`.

### `linksh_links`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `creator_id` | uuid | → `profiles(id)` on delete cascade |
| `code` | citext | **UNIQUE**. Auto 7-char base62 or custom. |
| `destination_url` | text | Validated http/https only |
| `title` | text? | Optional label |
| `utm_source` | text? | |
| `utm_medium` | text? | |
| `utm_campaign` | text? | |
| `utm_term` | text? | |
| `utm_content` | text? | |
| `tags` | text[] | default `'{}'`, GIN index |
| `is_active` | bool | default `true` (pause = `false`) |
| `expires_at` | timestamptz? | |
| `expired_redirect_url` | text? | Fallback when expired / inactive |
| `click_count` | bigint | default `0`, denormalized for list view |
| `unique_click_count` | bigint | default `0` |
| `last_clicked_at` | timestamptz? | |
| `archived_at` | timestamptz? | Soft-archive (hidden from default list) |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` |

**Indexes:** unique on `code`; GIN on `tags`; btree on `creator_id`.

### `linksh_click_events`
Mirrors the `linkinbio_analytics` shape.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `link_id` | uuid | → `linksh_links(id)` on delete cascade |
| `creator_id` | uuid | → `profiles(id)`. Denormalized for cheap RLS SELECT-own. |
| `ip_hash` | text? | sha256(ip) first 16 chars |
| `country` | text? | from `x-vercel-ip-country` |
| `device_type` | text? | mobile / tablet / desktop |
| `browser` | text? | Chrome / Safari / … |
| `os` | text? | iOS / Android / Windows / … |
| `referrer_url` | text? | |
| `user_agent` | text? | raw UA retained |
| `resolved_destination_url` | text? | Where this click was actually sent at click time. Survives later `destination_url` edits, so historical analytics stay accurate. |
| `dedup_hash` | text | `sha256(link_id : ip_hash : floor(epoch/30))`. **UNIQUE** — the idempotency + 30s-dedupe guard. |
| `is_unique` | bool | default `false` |
| `created_at` | timestamptz | default `now()` |

**Indexes:** UNIQUE on `dedup_hash`; btree on `link_id`, `creator_id`, `created_at`.

### RPC `linksh_record_click(...)`
`SECURITY DEFINER`. **Atomic + idempotent** — the single write path for a click, replacing a separate SELECT-dedupe + insert + increment (mirrors the `transaction_ledger` `record_hash`-UNIQUE idiom already used in fulfillment). Given the parsed click fields + `p_dedup_hash`:

1. `INSERT INTO linksh_click_events (…) ON CONFLICT (dedup_hash) DO NOTHING` — a duplicate delivery (retry, double `after()` fire, same IP within the 30s bucket) inserts nothing.
2. **Only when a row was actually inserted**, bump `linksh_links.click_count` (+1), `unique_click_count` (+1 when this is the first-ever event for `(link_id, ip_hash)`), and set `last_clicked_at = now()`.
3. Return whether the click counted.

Double-processing the same event is therefore a guaranteed no-op — counters never inflate.

### RLS

| Table | Policies |
|---|---|
| `linksh_links` | Creator full CRUD-own (`creator_id = current_profile_id()`); super_admin SELECT. **No anon/public read** — the redirect route uses the service client. |
| `linksh_click_events` | Creator SELECT-own (`creator_id = current_profile_id()`); super_admin SELECT. **Writes: service-role only** (no creator INSERT/UPDATE/DELETE policy). |

Both tables get RLS **enabled + policies in the same migration** before ship (project rule).

**Deferred tables:** `linksh_domains` (Phase 2 — single platform domain via env var needs no table now) and `linksh_daily_stats` (aggregate from events until volume demands a rollup).

---

## 5. Redirect path

### 5.1 `proxy.ts` — new host branch (before the custom-domain rewrite)

```
if host === NEXT_PUBLIC_SHORTLINK_DOMAIN:
    if pathname === '/'          → 302 to NEXT_PUBLIC_APP_URL
    code = pathname.slice(1)
    if isReserved(code)          → NextResponse.next()   // 404s naturally
    else                         → rewrite /{code} → /api/s/{code}
```

This branch sits **above** the existing `isMainHost` / `/_custom/` logic so short-domain traffic never touches the storefront custom-domain resolver. Host match is exact (lower-cased, port-stripped), consistent with `isMainHost`.

The proxy `config.matcher` excludes `/api`, but that only means the proxy does not *run* on direct `/api/*` requests — an internal `rewrite` **to** `/api/s/{code}` still resolves to the route handler. The handler lives under `/api/` (not an underscore-private folder) so it routes cleanly.

### 5.2 `GET /api/s/[code]` — the redirect handler

Service client (`createServiceClient()`), no auth.

1. Look up `code` in `linksh_links`.
2. **Not found** → 302 → `NEXT_PUBLIC_APP_URL`.
3. **Inactive / archived / expired** → 302 → `expired_redirect_url` or `NEXT_PUBLIC_APP_URL`.
4. **Live** → build final URL: `destination_url` + appended UTM params (only those set) → **302 + `Cache-Control: no-store`**.
5. **Tracking** runs post-response via `after()` (from `next/server`), wrapped in try/catch so it never blocks or fails the redirect — mirrors the best-effort, always-2xx spirit of `app/api/linkinbio/track/route.ts`:
   - Skip bots via a UA bot-skip regex.
   - `ip_hash` = sha256(ip).slice(0,16).
   - `country` from `x-vercel-ip-country` (fallback `cf-ipcountry`).
   - Inline UA parse → `device_type` / `browser` / `os`.
   - Capture `resolved_destination_url` = the URL this click was sent to (step 4's final destination).
   - Compute `dedup_hash = sha256(link_id : ip_hash : floor(epoch/30))`.
   - Call **`linksh_record_click(...)`** — one atomic, idempotent RPC that dedupes via the UNIQUE `dedup_hash`, inserts the event, and bumps counters only on a real insert (see §4). No separate SELECT-dedupe or increment call.

### 5.3 Bare-root and reserved handling
`{shortdomain}/` → digione.ai. `isReserved()` covers `robots.txt`, `sitemap.xml`, `report`, and empty. Everything else is treated as a code.

### 5.4 Redirect lookup cache
The hot path (resolve `code` → link row) is wrapped in a **short-TTL in-process cache** (a `Map<code, { row, expiresAt }>` with a 30s TTL, zero dependencies) so a viral link doesn't hit Postgres on every click. Negative lookups (unknown code) are cached briefly too, to blunt enumeration/scan traffic.

- **Client caching is unchanged:** every 302 still carries `Cache-Control: no-store`. Only the *server-side* row resolution is cached.
- **Propagation delay:** because the cached row carries `is_active` / `archived_at` / `expires_at`, a pause / edit / disable takes effect on the hot path after **≤ TTL (30s)**. Accepted at this TTL; abuse takedowns tolerate a ≤30s tail.
- **Serverless caveat:** the cache is per-lambda-instance and ephemeral across cold starts, so it helps warm instances under sustained traffic but is not a global guarantee. Cross-instance invalidation on edit (a shared Redis/Upstash cache with explicit bust-on-write) is a **Phase 2 upgrade**, not MVP — it would need a new dependency (ask first).
- Tracking in `after()` still reads/writes the DB (the cache only covers resolution), so analytics remain exact regardless of cache hits.

---

## 6. Creator surface (dashboard)

**Aesthetic target:** the modern link-shortener idiom (Dub.co / Bitly), which is itself a Vercel-like SaaS look — the same target as `dashboard-design.md`. Every piece below is rebuilt on DigiOne CSS-var tokens: no hardcoded hex (except the literal-white QR canvas / toggle knobs), lucide-react icons only, compact density, focus rings on every interactive, brand red (`--brand`) reserved for the primary CTA + active/click accents, light + dark both verified.

```
┌── Short Links ─────────────────────────────  [ + Create link ]──┐
│  🔎 Search    ⌄ Tags    ⌄ Sort: Recent            ⟳ Archived    │
├─────────────────────────────────────────────────────────────────┤
│ ▢fav  linkme.you/spring-sale   ⧉ copy   ▪ QR   ● Active    •••   │
│       → creators.digione.ai/p/xyz…   #promo #ig                  │
│                                            ▮ 1,204 clicks  ›     │
├─────────────────────────────────────────────────────────────────┤
│ ▢fav  linkme.you/aB3xK9p       ⧉ copy   ▪ QR   ⏸ Paused    •••   │
│       → youtube.com/watch?v=…                                    │
│                                              ▮ 87 clicks   ›     │
└─────────────────────────────────────────────────────────────────┘
```

- **Sidebar:** add **Short Links** (`Link2` lucide icon) to the **Grow** group `NAV` array in `src/components/dashboard/Sidebar.tsx`.

- **List page** `app/dashboard/links/page.tsx` — list archetype with a **link-card stack instead of a `DataTable`** (the signature shortener look; a deliberate, justified deviation from the DataTable default):
  - `PageHeader` "Short Links" + description, brand-red **Create link** button on the right.
  - `Toolbar`: search (code / destination / title), tag filter, sort (Recent / Most clicks), archived toggle.
  - Each **link card** (custom row composition on `Card`/tokens, hover `--surface-hover`):
    - **Favicon** of the destination in a rounded `--surface-muted` well (fetched from a favicon service — Google `s2/favicons` or DuckDuckGo `icons.duckduckgo.com` — with a `Link2` fallback). *Privacy note: this leaks the destination host to the favicon provider; acceptable for MVP, revisit with an own-proxy later.*
    - Short URL `{domain}/{code}` in `text-sm font-semibold` with an inline **copy** button (`Copy` → `Check`) and a **QR** trigger (`QrCode`); destination URL truncated in `--text-secondary` beneath, with token-colored **tag chips**.
    - Right side: a **click badge** (`BarChart2` + formatted count) linking to analytics, a `StatusPill` (Active / Paused / Expired / Archived), and a `MoreHorizontal` overflow menu (Edit, Copy link, QR, Share, Pause/Resume, Archive, Delete).
  - `EmptyState` (`Link2`) with a "Create your first link" CTA; `Skeleton` rows while loading.

- **Create / edit** — `SideDrawer` in the Dub idiom, two regions:
  - **Live preview** at the top: the `{domain}/{code}` chip + a live **QR** (`qrcode.react`) that re-renders as the code changes, with a copy affordance.
  - **Form:** Destination URL (favicon auto-pulls once valid), **Short link** = read-only domain + editable `code` field with live availability (`GET /api/links/check-code`, green check / red taken) or auto-generate; **Tags**; collapsible **UTM builder** (source / medium / campaign / term / content); collapsible **Expiration** (date + fallback URL). Brand-red **Save** in the footer.

- **Analytics** — dedicated detail page `/dashboard/links/[id]` (Dub-style, room for charts):
  - Header: the link chip + copy/QR + edit + `DateRangePicker`.
  - `KpiGrid` of `StatCard`s: Total clicks, Unique clicks, Top country, Top referrer.
  - recharts **area/line time-series** of clicks, themed with tokens per `dashboard-design.md`.
  - **Breakdown panels** as horizontal-bar lists (label + `--brand` mini progress bar + count): Countries, Devices, Browsers, OS, Referrers — aggregated **client-side from RLS-read `linksh_click_events`** at MVP scale. QR PNG download available here too.

- **Hook:** `useShortLinks` in `src/hooks/marketing/` — query key `['short-links','list']`, reads via the browser client + RLS (mirrors `useCoupons`). A per-link `['short-links','analytics', id]` query reads that link's events (RLS SELECT-own). Mutations call the write routes in §7 and invalidate `['short-links']`.

---

## 7. Writes & validation

**All mutations go through route handlers** to centralize open-redirect defense and code checks; **reads stay on the browser client + RLS.**

| Route | Purpose |
|---|---|
| `POST /api/links` | Create. Validate `destination_url`, validate/generate `code`, per-creator creation rate-limit. |
| `PATCH /api/links/[id]` | Edit (destination, UTM, tags, expiry, active/archived). Re-validate destination + code on change. Ownership enforced. |
| `DELETE /api/links/[id]` | Permanent delete. Ownership enforced. |
| `GET /api/links/check-code?code=` | Live code availability (modeled on `/api/sites/check-slug`). |

**`destination_url` validation:** http / https only; reject `javascript:`, `data:`, `file:`, `vbscript:` schemes; reject self-loops to the short domain; reject DigiOne auth/login URLs (anti-credential-phishing). **`code` validation:** regex `^[a-zA-Z0-9][a-zA-Z0-9_-]{1,49}$`, not reserved, citext-unique. **Rate limit:** existing `check_rate_limit` RPC via `src/lib/server/rate-limit.ts`, per-creator on create.

Auth-required routes use `createClient()` from `lib/supabase/server.ts` + `getUser()`, then `createServiceClient()` for writes, resolving `creator_id` via the standard profile hop.

---

## 8. Compliance / same-change-set chores

Per project rules, the following ship **in the same change-set**:

- **Migration** via the Supabase MCP (Windows CLI is broken): both tables + RLS enable + policies + the RPC. Idempotent SQL into `supabase/migrations/`.
- **Regenerate types** — `npm run update-types`, or the Supabase MCP `generate_typescript_types` fallback for Windows (per `supabase-reference.md`). Must precede code that references the new tables/RPC.
- **Env var** — add `NEXT_PUBLIC_SHORTLINK_DOMAIN` to `.claude/rules/env-vars.md` + `.env.example`.
- **Docs** — update `docs/reference/dashboard-map.md` (Stop-hook enforced), `.claude/rules/api-routes.md` (redirect + `/api/links` routes), `.claude/rules/hooks-reference.md` (`useShortLinks` key), and the Sidebar **Grow** entry.
- **Verify** — `npx tsc --noEmit` + `npm run lint` + `/verify` + manual click-through in light and dark, plus a residual hardcoded-color grep on `app/dashboard/links`.

---

## 9. Risks & gotchas

- **Open-redirect abuse** — public redirector is a phishing magnet. Mitigated by: scheme allowlist, self-loop + auth-URL blocks, per-creator creation rate-limit, links tied to KYC-able creator accounts, separate domain (reputation firewall). A "report this link" footer is a Phase 2+ nicety.
- **302 not 301** — cached 301s silently break edited destinations and click counts. Always 302/307 + `Cache-Control: no-store`.
- **Bot inflation** — without a UA bot-skip, analytics inflate fast. The bot regex is mandatory in the tracking step.
- **Redirect latency** — tracking must not block the 302. Use `after()` (or inline try/catch that always returns the redirect first).
- **Cache propagation delay** — the 30s in-process resolution cache (§5.4) means pause/edit/disable lags ≤30s on the hot path. Keep the TTL short; treat abuse-disable as tolerating a ≤30s tail. Don't raise the TTL without moving to a shared cache with bust-on-write.
- **Click idempotency** — the click write must go through `linksh_record_click` with its UNIQUE `dedup_hash`; never insert `linksh_click_events` + bump counters as two separate un-guarded steps, or a retried `after()` double-counts.
- **Type sync** — the `/api/links` and redirect routes reference the new tables/RPC; regenerate types before writing them or `tsc` fails on `never`.
- **No slug collision with existing storefronts** — the short domain is bare-root and separate; `/link/`, `/site/`, `/store/`, `/pay/` live on the main domain and never interact.

---

## 10. Out of scope (Phase 1)

Password protection, device/geo targeting, custom OG cards, max-click limits, per-creator branded short domains, daily rollups, and the entire Phase 3 attribution wedge. See §3 for what each later phase covers.
