---
noteId: "c9ec46a0750411f193a7f790bf9449ed"
tags: []

---

# Phase 2 — KYC verification (terminal-admin + creator doc upload) — design spec

**Date:** 2026-07-01 · **Status:** design (approved-in-session, pending written review)
**Parent blueprint:** `.claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md` (§8 Phase 2)
**Builds on:** Phase 0 (encrypted KYC + `/api/kyc/submit` + the 4-step wizard) and Phase 1 (payout flow gated on `status='verified'`).

> **Architecture decision (this phase):** admin functionality does NOT live in the DigiOne creator app.
> It moves to a **separate super_admin Next.js app** (planned in
> `.claude/todo-later/12(left)-2026-07-01-admin-app-scratch-plan.md`, built later). Until then, KYC
> **verify/reject is a terminal operation**. Phase 2's *creator-facing* half (document upload) stays in
> this app; its *admin-facing* half is a terminal script. The Phase 1 `/dashboard/admin/payouts` UI +
> `/api/admin/*` routes are now **transitional** — slated to migrate to the admin app.

---

## 0. Goals / non-goals

**Goals:**
1. A creator can upload KYC **documents** (PAN card, bank proof, optional Aadhaar) to the private R2 bucket,
   linked to their KYC record — so a manual review has something to look at.
2. A super_admin can **review + verify/reject** a creator's KYC **from the terminal** (no admin UI in this app):
   view masked details + signed doc URLs, then `verify` (→ `status='verified'`) or `reject` (+ reason).
3. **Provider-ready:** the verify logic records `verification_provider` (+ per-field) so a real PAN/bank
   verification API (Cashfree/Signzy) can slot in later without reworking the data model. `'manual'` for now.
4. Verifying a creator **unblocks the Phase 1 payout flow** end-to-end (the payout gate is `status='verified'`).

**Non-goals (deferred):**
- Any **admin UI in this app** → the separate admin app (planned this pass, built later).
- **Automated provider verification** (PAN validity / bank name-match API) → needs provider creds; structure is ready.
- Migrating the existing `/api/admin/*` + `/dashboard/admin/payouts` out of this app → the admin-app plan owns that.
- Re-notifying / emailing the creator on verify/reject → later.
- Document OCR / auto-extraction → out of scope.

---

## 1. Current state (grounded live, 2026-07-01)

| Object | State | Phase 2 action |
|---|---|---|
| `creator_kyc` | encrypted PII (Phase 0); verification cols exist: `status, kyc_level, pan/bank/upi_verified, *_verified_at, *_verification_provider, *_verification_ref, verification_provider, rejection_reason, admin_notes`. **0 verified**, only `pending`. Re-submit now resets `*_verified`/`beneficiary_id` (Phase 0 review fix). | Verify script SETS these; no schema change to `creator_kyc`. |
| `storage_files` | R2 metadata table; has `kind`, `owner_id`, `bucket`, `object_key`, `visibility`, `deleted_at`. | KYC docs are rows with `kind='kyc'`, `bucket='creator-private'`. |
| `/api/upload` + `/api/upload/confirm` | presigned PUT to private buckets (`creator-private`, `category:'kyc'`) + writes `storage_files`. | Reused as-is for the doc upload. |
| `/api/admin/kyc/[creatorId]/download` | super_admin route; mints a signed URL for the KYC bucket, logs `kyc_access_log`. | The **terminal `view`** mints doc URLs directly (service-role) + logs `kyc_access_log`; this cookie-gated route stays (transitional). |
| `kyc_access_log` | `id, admin_id, creator_id, file_id, object_key, created_at`. | Terminal `view` writes a row per doc URL minted. |

**New:** a `kyc_documents` child table (below). No change to `creator_kyc` columns.

---

## 2. Schema delta (one migration)

**`public.kyc_documents`** — a KYC record has several documents:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk default `gen_random_uuid()` | |
| `creator_id` | uuid not null → `profiles(id)` on delete cascade | the KYC owner |
| `file_id` | uuid not null → `storage_files(id)` on delete cascade | the uploaded object |
| `doc_type` | text not null, CHECK in (`pan_card`, `bank_proof`, `aadhaar`) | |
| `created_at` | timestamptz not null default now() | |

- Partial-unique `(creator_id, doc_type) WHERE ...` is **not** used — allow re-upload/replace by inserting a new
  row and soft-deleting the old file; the terminal `view` + wizard show the latest per `doc_type`.
- **RLS:** creator INSERT-own + SELECT-own (`creator_id = current_profile_id()`); super_admin SELECT
  (`is_super_admin()`); no client UPDATE/DELETE (deletes cascade from `storage_files` soft-delete handling).
- `storage_files.kind = 'kyc'` for these objects (already a supported string; no enum change).

---

## 3. Build-now components (this app)

### 3.1 Creator document upload

**Route `POST /api/kyc/documents` (auth required):** after the client has uploaded a file via the existing
`/api/upload` (presigned PUT to `creator-private`, `category:'kyc'`) → `/api/upload/confirm` (writes the
`storage_files` row), it calls this route with `{ fileId, docType }`. The route (service-role):
- resolves `profileId` (`resolveProfileId`), verifies the `storage_files` row is owned by this creator +
  `bucket='creator-private'` + `kind='kyc'` (else 403),
- upserts a `kyc_documents` row (`creator_id, file_id, doc_type`).
- Returns `{ ok: true, documentId }`. Errors: 400 (bad docType/fileId), 401, 403 (ownership), 500.

**Hook + UI:** a new **"Documents"** step in the KYC wizard (`Identity → Address → Bank → Documents → Review`).
Each doc slot (PAN card*, Bank proof*, Aadhaar) shows: empty → upload button; uploaded → filename + Replace.
Upload flow reuses the existing media/upload plumbing for private files. **Required to submit:** PAN card + bank
proof present (the Review step + submit guard check this). No document content is ever shown back to the creator
(write-only bucket) — only the filename + a "Uploaded ✓" state.

### 3.2 Terminal admin: `scripts/kyc-admin.ts` (run via `npx tsx`, service-role)

Server-only, no HTTP/auth — the runner holds `SUPABASE_SERVICE_KEY` (= the trusted admin). Subcommands:

- **`view <creatorId>`** — prints the creator's KYC (masked: `pan_last4`, `bank_last4`, legal_name, ifsc,
  address, status), lists `kyc_documents`, and mints a short-TTL **signed URL per doc** (via `storage.getSignedUrl`
  on `creator-private`). Writes one `kyc_access_log` row per URL minted (`admin_id` = a passed `--admin <profileId>`
  or a `'terminal'` sentinel, `creator_id`, `file_id`, `object_key`). The admin opens the URLs in a browser to eyeball.
- **`verify <creatorId> [--provider manual] [--admin <profileId>]`** — calls the shared `verifyKyc()` lib:
  `status='verified'`, `pan_verified=bank_verified=upi_verified=true` (upi only if a UPI is on file),
  `*_verified_at=now()`, `verification_provider=<provider>`, per-field `*_verification_provider=<provider>`,
  clears `rejection_reason`. Prints the before/after status.
- **`reject <creatorId> "<reason>" [--admin <profileId>]`** — `status='rejected'`, `rejection_reason=<reason>`.

**Shared lib `src/lib/server/kyc-verify.ts`** — `verifyKyc(db, creatorId, { provider })` and
`rejectKyc(db, creatorId, reason)`. Pure-ish (takes the service client), unit-testable for the field-set it writes.
**Provider-ready:** `provider` defaults to `'manual'`; a future provider integration calls the same lib with
`provider:'cashfree'` after an API check, plus stores `*_verification_ref` (the provider's reference id).

### 3.3 What this unblocks

Once `verify` sets `status='verified'`, the Phase 1 `/api/payouts/request` KYC gate passes and the withdraw →
approve → transfer flow is exercisable end-to-end (still pending Cashfree Payouts creds for the live transfer).

---

## 4. Security

- **No new admin HTTP surface.** Verify/reject is a terminal script gated by possession of the service key.
  The existing cookie-gated `/api/admin/kyc/.../download` stays for the future app; the script mints URLs directly.
- **KYC docs are write-only for creators** (existing `creator-private` bucket rule) — the upload route never
  returns doc contents; only the admin (terminal / future app) mints signed URLs, and every mint logs `kyc_access_log`.
- `kyc_documents` RLS: creator insert/select-own, super_admin select; no client mutation of `creator_kyc`
  verification fields (Phase 0 lockdown holds — the script writes via service-role).
- The doc-link route strictly validates `storage_files` ownership + bucket + kind before inserting a `kyc_documents` row.
- No PII (doc contents, full PAN/bank) is logged by the script — only masked `*_last4` + object keys.

---

## 5. Testing

- **Unit:** `verifyKyc`/`rejectKyc` field-set (asserts the exact columns written, `provider` propagation, UPI-only
  skip); the doc-link route's ownership/bucket/kind guard (pure validation extracted + tested).
- **Manual (terminal):** upload a doc as a creator → run `kyc-admin.ts view <id>` (URLs open, `kyc_access_log`
  row written) → `verify <id>` → confirm `status='verified'` + flags set → confirm a Phase 1 withdraw request now
  passes the KYC gate. Then `reject` a second creator → confirm `status='rejected'` + reason.
- The migration + RLS: verify creator can insert/select own `kyc_documents`, cannot see others'; super_admin can select.

---

## 6. Files

| File | Responsibility | Status |
|---|---|---|
| `supabase/migrations/20260701000003_kyc_documents.sql` | `kyc_documents` table + RLS | create |
| `src/lib/server/kyc-verify.ts` (+`.test.ts`) | `verifyKyc`/`rejectKyc` provider-ready field-set | create |
| `scripts/kyc-admin.ts` | terminal `view`/`verify`/`reject` | create |
| `app/api/kyc/documents/route.ts` | link an uploaded file → `kyc_documents` | create |
| `src/hooks/creator/useKycDocuments.ts` (or fold into `useEarnings`) | upload + list creator KYC docs | create |
| `app/dashboard/settings/billing/page.tsx` | new "Documents" wizard step | modify |
| `types/database.types.ts` | regen (kyc_documents) | regenerate |
| `.claude/rules/api-routes.md`, `docs/reference/dashboard-map.md`, `.claude/rules/supabase-reference.md`, blueprint | docs | modify |

---

## 7. What carries forward

- **Provider auto-verify** (PAN validity + bank name-match) → wire into `verifyKyc` when provider creds arrive.
- **The whole admin surface** (this verify flow, the Phase 1 payout queue, refunds, ledger) → the separate admin app
  (`.claude/todo-later/12(left)-2026-07-01-admin-app-scratch-plan.md`). The terminal script is the interim.
- **Creator notification** on verify/reject (email/in-app) → later.

---

## 8. Reference

- Phase 0/1 specs+plans under `docs/superpowers/`; blueprint `.claude/todo-later/11(half)-…`
- Storage: `.claude/rules/api-routes.md` (Storage), `.claude/rules/supabase-reference.md`; `src/lib/storage/*`
- Admin-app plan: `.claude/todo-later/12(left)-2026-07-01-admin-app-scratch-plan.md`
- KYC: `src/lib/server/kyc-crypto.ts`, `kyc-row.ts`, `app/api/kyc/submit/route.ts`, the billing wizard
