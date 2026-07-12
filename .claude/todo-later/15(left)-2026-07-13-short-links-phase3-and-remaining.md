---
noteId: "d22d3a407e3211f1b7ddffeec518d7f9"
tags: []

---

# Short Links — Phase 3 (attribution) + remaining deferred work

**Status:** `(left)` — not started.
**Added:** 2026-07-13.
**Branch context:** Short Links **Phase 1** (MVP) and **Phase 2** (password / device / geo / OG / max-clicks) are BUILT on `feat/short-links` (reviewed, tsc + lint + 200 tests green). This file captures everything consciously deferred out of those two phases.

- Spec: `docs/superpowers/specs/2026-07-12-short-links-design.md` (§3 describes all three phases).
- Phase 1 plan: `docs/superpowers/plans/2026-07-12-short-links.md`.
- Phase 2 plan: `docs/superpowers/plans/2026-07-13-short-links-phase2.md`.
- Live tables: `linksh_links`, `linksh_click_events` (+ RPC `linksh_record_click`). Redirect: `app/api/s/[code]/route.ts`. Dashboard: `app/dashboard/links/**`, `src/components/dashboard/links/**`. Libs: `src/lib/server/shortlinks/**`, `src/lib/shared/shortlink.ts`. Hook: `src/hooks/marketing/useShortLinks.ts`.

Read this when picking up short-link growth work, or when asked "what's left on short links?".

---

## 1. Phase 3 — Click → order revenue attribution (the differentiator)

The reason a DigiOne shortener beats a generic Bitly: tie a click to an actual `orders` row + creator earnings ("this link drove ₹12,400 in sales"). Deferred because it **modifies the money path** and needs its own spec → plan → review cycle. **Get explicit sign-off before touching checkout/fulfillment.**

### What it needs

1. **Schema (additive to `linksh_links`):**
   - `link_target text` — `'external' | 'product' | 'site'` (default `'external'`).
   - `product_id uuid?` → `products(id)`; `site_id uuid?` → `sites(id)` (for product/site links).
   - `referral_code text?` — a creator referral code auto-attached to product/site links.
   - Migration via Supabase MCP + regen types (Windows fallback), RLS unchanged (owner-CRUD already covers new columns).

2. **One-click shorten for own products / sites** (dashboard):
   - In the create modal, a "link to my product/site" mode that pre-fills `destination_url` from the storefront URL and sets `link_target` + `product_id`/`site_id`.
   - Optionally auto-attach the creator's `referral_code`.

3. **Click → checkout carrier:**
   - When the redirect resolves a `product`/`site` link, stamp a first-party attribution cookie (e.g. `du_attr=<code>`, short TTL, on the storefront/app domain — NOT the short domain, since checkout happens on the main app) OR pass `?ref=<code>` through to the destination and have the storefront capture it.
   - Note the cross-domain wrinkle: the short link lives on `linkme.you` but checkout is on `digione.ai`. A cookie set on `linkme.you` is NOT readable on `digione.ai`. So the carrier must be a **query param** appended to the destination (which is a digione.ai storefront URL), captured client-side into a `digione.ai` cookie/localStorage, then read at checkout.

4. **Stamp `orders.metadata` at checkout** (`app/api/checkout/create/route.ts`):
   - Read the attribution code from the request (client sends it from the captured cookie/localStorage) and store `orders.metadata.shortlink_code`.
   - **Money-path rule:** never trust the client for price/amounts; the attribution code is metadata-only (does not affect totals), so it's low-risk — but the checkout route + `fulfillOrder` are revenue-integrity code (see `.claude/rules/security-model.md`). Keep the change metadata-only and reviewed.

5. **Reporting — revenue per link:**
   - A query/rollup joining `orders` (where `metadata->>'shortlink_code'` is set + `status='completed'`) to `linksh_links` by code, summing `total`.
   - Surface on the analytics detail page (`/dashboard/links/[id]`): a "Revenue" KPI + a per-link "₹ driven" figure on the list card.
   - Consider a nightly rollup table if volume warrants (mirror the `product_stats` pattern from todo-later 11).

### Accepted trade-off
Because Phase 1/2 store **no** attribution, Phase 3 **cannot retroactively attribute** links created before it ships. New links only.

---

## 2. Phase 2 deferred — per-creator branded short domains

Explicitly cut from the Phase 2 build (user chose "all except branded domains"). This is effectively its own project, not a bolt-on, because:

- The existing custom-domain rewrite target (`proxy.ts` rewrites unknown hosts → `/_custom/${hostname}${path}`) **has no handler** — there is no `app/_custom/**` route in this codebase. Creator custom domains are not actually functional yet.
- A real implementation needs: a `linksh_domains` table (`creator_id`, `domain`, `verified_at`), a DNS TXT verification flow, cert/SSL provisioning (Vercel domains API or equivalent), and a `proxy.ts` branch that maps a verified creator short domain → `/api/s/[code]` (like the platform short-domain branch already does).
- Until the general custom-domain system exists, defer. When built, the short-domain routing is a small addition on top of it.

---

## 3. Smaller remaining items

Low-priority polish consciously punted; none block go-live.

- **List-page controls (spec §6, documented Phase-1 deltas):** dedicated tag-filter dropdown, sort control (Recent / Most clicks), and an archived-hide toggle. Today the list has search (matches tags) + status pills only; archived links show with an `archived` pill rather than being hidden.
- **Analytics `DateRangePicker`:** the detail page (`/dashboard/links/[id]`) shows **all-time** stats. Add a date-range filter when needed.
- **Favicon `<img>` → `next/image`:** `LinkCard.tsx` uses a raw `<img>` for the destination favicon (Google s2 favicon service), which trips the `@next/next/no-img-element` **warning** (not an error; consistent with the Sidebar avatar `<img>`). Switch to `next/image` with a remote pattern if the warning is ever gated.
- **Redirect cache — shared invalidation (spec §5.4):** the 30s in-process `TtlCache` is per-lambda/ephemeral, so a pause/edit/disable propagates after ≤30s on the hot path. For instant cross-instance invalidation, move to a shared cache (Upstash/Redis) with bust-on-write — needs a new dependency (ask first). Not needed at current scale.
- **`password_hash` in the browser read:** `useShortLinks` does `select('*')`, so a protected link's scrypt hash is shipped to the owner's own browser (owner-scoped via RLS; the hash is not the password, low risk). If tightening: select explicit columns excluding `password_hash` and expose a `has_password` boolean instead.
- **`check-code` enumeration:** already mitigated with a 30/min/IP rate limit; a further step would be requiring auth on `GET /api/links/check-code`. Low priority.
- **Guest attribution:** Phase 3 attribution for **guest** (not-logged-in) buyers rides `guest_entitlements` / `orders.metadata` the same way — verify the guest checkout path also forwards the attribution code (cross-refs todo-later 14 guest-email hardening).

---

## 4. When resuming
1. For **Phase 3**: brainstorm → spec → plan → subagent execution, with a dedicated security review on the checkout/fulfillment change (money path). Start from §1 above.
2. For **branded domains**: build (or wait for) the general custom-domain system first, then add the short-domain routing branch.
3. The smaller §3 items can be picked off individually next time anyone is in `app/dashboard/links/**`.
