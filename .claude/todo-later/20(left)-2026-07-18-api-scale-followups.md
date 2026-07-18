---
noteId: "724ceb7082d311f187d6a9233bc04df8"
tags: []

---

# API-scale follow-ups — deferred from the 2026-07-18 concurrent-editing review

Context: the 2026-07-18 review of "what happens when lots of creators edit at once"
found four hotspots. #2 (per-request `getUser()` on hot routes → local JWT
verification via `src/lib/server/auth-claims.ts`) and #3 (3-hop identity resolution →
`src/lib/server/identity-cache.ts`) were FIXED the same day (see
`security-model.md` → two-tier API auth, todo 18). This file captures the two
deliberately deferred items plus the remaining-route decision record.

## 1. `sharp` image processing runs on the serverless function (deferred)

`POST /api/media/upload` converts images to WebP with `sharp` **inside the route
handler** — CPU + memory per invocation. Many creators uploading images
concurrently = slow, expensive lambdas (deliverables are fine — they go browser →
R2 via presigned PUT, `/api/upload`, nearly free).

Options when this matters (real upload volume):
- **Cloudflare Images / Image Resizing** at the CDN edge — upload the ORIGINAL via
  presigned PUT like deliverables, transform on delivery (`/cdn-cgi/image/` —
  same mechanism already planned for `/discover` thumbnails in todo 11). Removes
  sharp from the hot path entirely. Preferred.
- Background/queue processing (upload original → async convert → swap URL).
- Keep sharp but bump function memory + cap concurrent conversions.

Trigger to act: media-upload p95 latency or Vercel function cost becoming visible
in launch metrics (todo 17). Not a launch blocker.

## 2. Same-creator concurrent edits are last-write-wins (deferred)

Site tables (`site_main`, `site_singlepage`, `linkinbio_pages`,
`site_sections_config`, `site_design_tokens`, …) and products have **no optimistic
concurrency** — a creator editing in two tabs silently overwrites their own
changes (instaauto_automations is the exception: `version` guard). Low-stakes
(self-inflicted, no cross-creator effect, no money), so deferred.

If/when editors get real collaboration or "unsaved changes" complaints appear:
add a `version` (or `updated_at` compare-and-set) column to the site tables and
have the editors send it on save — same pattern as `useInstaAutomations`. Pairs
naturally with the editor upgrades planned in todo 9 (blockEditors reorg).

## 3. Decision record: routes deliberately NOT on local JWT verification

Money/KYC/admin/account/checkout routes stay on per-request `getUser()`
(revocation freshness for service-role writes): `checkout/*`, `refunds/*`,
`payouts/*`, `admin/*`, `kyc/*`, `account/*`, `invoices/*`, `statements/*`,
`instaauto/*` (low frequency; also fine to migrate later), `auth/*`. Do not
migrate any of these without a security review. The instaauto routes are the only
"could migrate cheaply if their traffic grows" set — they already benefit from the
identity cache regardless.

Read before touching `/api/media/*`, image upload perf, or editor save-conflict
behavior.
