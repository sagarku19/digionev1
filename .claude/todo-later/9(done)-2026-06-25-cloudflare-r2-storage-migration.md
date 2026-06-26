---
noteId: "cc042b20701711f19a5ba9a9f70f067a"
tags: []

---

# Cloudflare R2 Storage Migration — Decision Record

**Date:** 2026-06-25
**Status:** `(done)` — implemented 2026-06-26
**Author:** Sagar + Claude (acting as senior PM/dev)
**Scope:** Move file storage from Supabase Storage → Cloudflare R2. **Storage only.** The Supabase Postgres schema is NOT being rewritten.

---

## TL;DR verdict

A round of research proposed (a) moving files to Cloudflare R2 and (b) a "clean modern" Supabase schema redesign. After reviewing it against the actual DigiOne codebase:

- ✅ **Adopt the R2 storage architecture** — buckets-by-purpose, presigned URLs, CDN for media, lifecycle rules, and one new `files` metadata table. This is genuinely good and a real upgrade.
- ❌ **Reject the database schema rewrite.** The research was written as if greenfield. DigiOne already has a production schema (62 tables, 87 RLS policies, hardened money-path). The proposed schema has no RLS, no money-path integrity, no referrals/coupons/sites — adopting it would be a regression, not an upgrade.
- 🕒 **Defer** Redis, video/HLS/Cloudflare Stream, and GST/TDS schema work — not needed for this migration.

**The single most important rule: this is a storage migration, not a schema migration. Keep the existing DB.**

---

## Why R2 at all (the business case)

DigiOne sells **downloadable digital products** — an egress-heavy workload. Supabase bills egress; **R2 egress is free.** That's the whole reason. Secondary wins: cheaper per-GB storage (~$0.015/GB), better global CDN for public images.

Migration is feasible because **authorization already lives in API routes**, not in Supabase Storage RLS. The private buckets already work by "check access in the route → mint a short-lived signed URL." R2 uses the identical pattern.

---

## ADOPT — genuinely good ideas from the research

1. **Separate buckets by purpose.** Maps ~1:1 to the current 4 buckets (see mapping table below).
2. **Presigned upload URLs; never stream large files through Next.js.** Already the pattern in `/api/upload` — preserved.
3. **Webhook → grant access → signed download URL.** Already the flow (`/api/webhook/cashfree` → `user_product_access` → `/api/deliverables`). No change to the flow, only to the signing internals.
4. **A universal `files` metadata table.** ← The one real schema improvement. DigiOne currently lists bucket objects by prefix with no metadata table. A `files` table gives quota tracking (replaces the lost `sum_bucket_bytes_for_prefix` RPC), audit trail, and clean deletes.
5. **Lifecycle rule to auto-delete `temp/` uploads** (e.g. 7 days). Cheap hygiene.
6. **Custom domain + CDN for the public media bucket** (`media.digione.ai`).
7. **Split KYC into its own private bucket** — narrower API-token scope, smaller blast radius. (Judgment call; leaning yes.)

---

## REJECT — keep the existing system as-is

The research proposed new tables that DigiOne **already has, better**:

| Research proposed | DigiOne already has | Action |
|---|---|---|
| `creators` table separate from `profiles` | `profiles` **is** the creator | Keep `profiles` |
| `wallets` + `wallet_transactions` | `creator_balances` + `transaction_ledger` (with `record_hash`) | Keep existing |
| `product_access` | `user_product_access` (idempotent UNIQUE) | Keep existing |
| `orders` / `order_items` (simplified) | Existing, with coupon/referral metadata + RLS | Keep existing |
| `profiles.id = auth.users.id` | **Wrong.** Real model is 3-hop: `auth.users → users → profiles` | Do NOT flatten |
| `creator_kyc` w/ `pan_file_id` etc. | `creator_kyc` already exists | Extend if needed, don't replace |

Adopting the research's schema would destroy RLS, referrals, coupons, sites, and money-path integrity. **Non-starter.**

---

## DEFER — not part of this migration

- **Redis (queues/caching)** — no need yet; rate-limiting is Postgres-backed and fine.
- **Video / HLS / Cloudflare Stream / Mux** — future feature. Don't design for it now; integrate Stream when courses-with-video ship.
- **GST/TDS schema** — premature; add when actually handled.

---

## Factual corrections (research oversold a few things)

- **Encryption** — R2 encrypts at rest **by default, automatically**. Nothing to "enable."
- **Audit logs** — R2 has **no** built-in per-object access audit log. Build it yourself (this is another reason for the `files` table + a `download_log`).
- **Image resizing / WebP** — R2 does **not** resize or convert. That's **Cloudflare Images** (paid, separate) or self-conversion with `sharp` in the upload pipeline. Not free/automatic.
- **Cost** — ~2.1 TB ≈ $32/mo storage + negligible op fees. Correct. Egress free = the real win.

---

## Target architecture — bucket mapping

| Current Supabase bucket | → R2 bucket | Public? |
|---|---|---|
| `creator-private` (kyc, contracts) | `digione-kyc-private` | ❌ private |
| `creator-content` (deliverables) | `digione-products` | ❌ private |
| `creator-public` (covers, avatars) | `digione-media` (+ `media.digione.ai`) | ✅ public via CDN |
| `public-asset` (platform stock) | `digione-public-assets` | ✅ public via CDN |

Path layout stays creator-scoped: `{creator_id}/{product_id|category}/{ts}_{filename}`.

---

## KYC access model (RESOLVED 2026-06-25)

KYC is write-only for creators. This is **stricter than current behavior** — today `/api/private/download` lets a creator mint signed URLs for their own KYC docs; this removes that.

| Actor | Upload | View after upload |
|---|---|---|
| Creator (owner) | ✅ upload + preview the file **before submit** (browser-held, pre-upload) | ❌ never — no creator-facing route serves the KYC bucket |
| Admin (`super_admin`) | — | ✅ only — via a **new admin-only route**, short-TTL signed URL |
| Anyone else | ❌ | ❌ |

Implementation consequences:
- `digione-kyc-private` is **dedicated** with its own narrowly-scoped R2 API token.
- KYC signing is **removed** from `/api/private/download` (creator-facing). A **new admin-only route** (e.g. `/api/admin/kyc/[creatorId]/download`, gated on `super_admin`) is the only path that mints a KYC signed URL.
- Creator still sees **status** (`pending`/`verified`/`rejected`) from `creator_kyc` / `files` rows — just no download.
- `files` rows for `kind = 'kyc'`: creator may read the metadata row (status), but the **download URL is admin-only**. RLS on `files` must reflect this (no creator SELECT-to-download path; download authorization lives in the admin route via service role).
- **`kyc_access_log` is MANDATORY** (admin id, creator id, file, timestamp) — R2 has no native audit log, and admins viewing identity docs must be logged. Every admin KYC download writes a row.
- **KYC `files` rows are immutable to creators** — metadata is written server-side (service role) on upload; creators never UPDATE/DELETE them. (This is suggestion #7, generalized: instead of "update only before submit," creators don't UPDATE `files` rows at all.)

---

## New `files` metadata table (the only schema addition)

RLS-protected, in Supabase. Replaces prefix-listing + the dropped quota RPC.

```
files
  id            uuid pk
  owner_id      uuid            -- profiles.id (creator)
  bucket        text            -- digione-kyc-private | digione-products | digione-media | digione-public-assets
  object_key    text            -- {creator_id}/{product_id}/{ts}_{filename}
  file_name     text
  mime_type     text
  size          bigint
  visibility    text            -- private | public
  kind          text            -- cover | avatar | deliverable | kyc | contract | banner | other
  product_id    uuid null       -- fk products(id) when applicable
  created_at    timestamptz default now()
  deleted_at    timestamptz null

  unique (bucket, object_key) where deleted_at is null   -- partial: re-upload after delete allowed
```

- **Writes are server-side only** (service role on upload/delete). Creators do **not** INSERT/UPDATE `files` directly → KYC immutability falls out for free.
- RLS: owner **SELECT** own rows (`owner_id = current_profile_id()`) for status display; **no creator write policy** (writes go through API routes).
- Quota = `SELECT sum(size) FROM files WHERE owner_id = ? AND bucket = ? AND deleted_at IS NULL`.
- Must ship with RLS enabled + policy before going live (per CLAUDE.md DB rules).
- **Intentionally NOT added** (dev-stage YAGNI): `checksum` (migration-verification value only; add R2 ETag later if dedup is ever needed) and `storage_provider` (the `src/lib/storage/` abstraction is the future-proofing; an always-`'r2'` column adds nothing until a 2nd provider is real).

---

## Work breakdown (storage-only, dev big-bang — ~5 chunks)

1. **R2 setup** — Cloudflare account, add `digione.ai`, create 4 buckets, encryption is automatic, create scoped API tokens (KYC bucket gets its own), custom domain for media.
2. **Storage abstraction** (suggestion #2) — `src/lib/storage/index.ts` (the `storage` interface: `createUploadUrl`, `createDownloadUrl`, `delete`, `sumBytes`) + `src/lib/storage/r2.ts` (R2 impl). Routes import `storage`, never the SDK. Keep it thin — one provider. **Needs new packages** → see below.
3. **Swap route internals** (auth checks unchanged, only signing changes; all go through `storage.*`):
   - `/api/upload` → presigned PUT
   - `/api/deliverables/[productId]` → presigned GET
   - `/api/private/download` → presigned GET (**remove KYC bucket from this creator-facing route**)
   - **new** `/api/admin/kyc/[creatorId]/download` → admin-only (`super_admin`) presigned GET + writes `kyc_access_log`
4. **`files` table + `kyc_access_log`** — migration (idempotent SQL → `supabase/migrations/`), RLS (owner SELECT only; writes via service role), partial unique index, regen types (`npm run update-types` or MCP fallback), wire upload/delete to insert/soft-delete rows. Replace `sum_bucket_bytes_for_prefix` with the `files`-table sum.
5. **Cutover (dev — big-bang, no safety apparatus)** — set env vars, flip routes to R2, test locally, delete old Supabase buckets, re-upload test data. **No** rclone/migration scripts, **no** dual-read/fallback, **no** phased rollout, **no** checksum verification — there is no production data to protect.

---

## New packages required (CLAUDE.md requires asking first)

- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`

R2 is S3-compatible; these are the standard, minimal deps. **Treat this doc as the approval ask.**

---

## Env vars to add (update `.env.example` + `.claude/rules/env-vars.md`)

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=            # secret
R2_SECRET_ACCESS_KEY=        # secret
R2_BUCKET_KYC=digione-kyc-private
R2_BUCKET_PRODUCTS=digione-products
R2_BUCKET_MEDIA=digione-media
R2_BUCKET_PUBLIC=digione-public-assets
NEXT_PUBLIC_R2_MEDIA_URL=https://media.digione.ai
```

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Losing the quota RPC | `files`-table sum replaces it (chunk 4) |
| No native audit log | `files` table + **mandatory** `kyc_access_log` |
| Creator can still reach KYC docs | KYC bucket removed from `/api/private/download`; only the admin route signs it |
| Image resize assumed free | Convert with `sharp` on upload (decided) — not Cloudflare Images |
| Scope creep into schema rewrite | **Hard rule: storage only this round** |
| ~~Migration data loss / downtime~~ | N/A — dev/staging, no production data; big-bang chosen |

---

## Refinements reviewed (2026-06-25) — context: dev/staging, no production data

The "no prod data" context sorts the extra suggestions into permanent architecture (keep) vs. production migration-safety (drop).

| Suggestion | Verdict | Rationale |
|---|---|---|
| Storage provider abstraction (`src/lib/storage/`) | ✅ Adopt | Permanent clean architecture; thin, one provider |
| `unique(bucket, object_key)` (partial, `where deleted_at is null`) | ✅ Adopt | Cheap data integrity |
| `kyc_access_log` mandatory | ✅ Adopt | Most sensitive data; R2 has no audit log |
| KYC metadata immutable to creators | ✅ Adopt (simplified) | Creators never write `files` rows; service-role only |
| `checksum` column | ❌ Skip | Migration-verification value only; add R2 ETag later if dedup needed |
| `storage_provider` column | ❌ Skip | Abstraction is the future-proofing; YAGNI until a 2nd provider exists |
| Dual-read + fallback during cutover | ❌ Skip | Production zero-downtime mechanism; irrelevant in dev |

## Decisions — ALL RESOLVED (2026-06-25)

1. **KYC bucket** — ✅ dedicated `digione-kyc-private`, write-only for creators (see KYC access model).
2. **Image conversion** — ✅ self-host `sharp` on upload. Not Cloudflare Images.
3. **Cutover** — ✅ dev big-bang. No migration scripts / dual-read / phased rollout / checksum verification.
4. **New aws-sdk packages** — ✅ approved (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).

---

## Next step

All decisions resolved → ready to produce a step-by-step implementation plan (route-by-route diffs, `files` + `kyc_access_log` migrations + RLS, the `storage` abstraction, quota tracking, dev big-bang cutover) via the `plan` skill, reviewed before any code.
