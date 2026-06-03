---
noteId: "1d69cb505f2411f1b5532decc08dd652"
tags: []

---

# Storage / Upload API — Outstanding Work

Captured 2026-06-03 after the storage taxonomy + `/api/upload` hardening sweep (commits `d8a065d`, `09fcc1b`, `7e4431c`, `87c2d41`, `92541a9`). Everything here is deliberately deferred — the routes ship as-is, this is the to-do list for when each item becomes blocking.

## Current state of the storage surface

- **4 buckets:** `public-asset` (DigiOne-managed), `creator-public`, `creator-content` (private), `creator-private` (private)
- **3 routes:** `/api/upload` (POST), `/api/deliverables/[productId]` (GET, buyer-side), `/api/private/download` (POST, creator-side)
- **Audit grade:** 8 PASS / 2 FAIL / 1 DEFERRED / 1 partial (see [`/api/upload` hardening note in api-routes.md](../rules/api-routes.md))

## High-priority gaps (real production blockers)

### 1. Rate limiting — FAIL
**Why it matters:** any logged-in creator can hammer `/api/upload` or `/api/private/download` to mint thousands of signed URLs and fill the Supabase storage quota.
**Mitigation today:** the bucket-level `file_size_limit` and the 1 GB per-creator quota on `creator-content` bound the actual harm.
**Fix:** add `@upstash/ratelimit` (needs Upstash account + env vars). Per-user limit ~30 uploads/hour and ~120 downloads/hour are reasonable starting points. Apply via Next.js middleware or per-route at the top of each handler.
**Effort:** half a day including the Upstash setup.

### 2. Resumable uploads (TUS) for `creator-content` — FAIL
**Why it matters:** `createSignedUploadUrl` returns a single PUT URL. A 200 MB course-video upload over flaky Indian 4G that fails at 80% requires full restart. Indian creators selling course videos will hit this constantly.
**Fix:** new endpoint `/api/upload/resumable` returning a TUS-protocol URL (Supabase Storage exposes `/storage/v1/upload/resumable`). Client uses `tus-js-client` or similar. Auth + quota + sanitization logic from `/api/upload` should be extracted to a shared validator module first so both endpoints share it.
**Effort:** 1-2 days. Largest single remaining item.

## Blocked on schema (not on code)

### 3. Real per-plan storage quota
**Why it matters:** today every creator gets the same 1 GB on `creator-content` (constant in `app/api/upload/route.ts:CREATOR_CONTENT_QUOTA_BYTES`). Free / Plus / Pro tiers all map to the same limit.
**Blocked on:**
- `creator_subscriptions` table doesn't exist — no way to know which plan a creator is on
- `subscription_plans.features` is a tag array (`["basic_analytics","up_to_10_products"]`), not a numeric quota map — no `storage_gb` field anywhere
**Fix sequence:**
1. Design + create `creator_subscriptions` (creator_id → plan_id, status, current_period_end)
2. Either extend `subscription_plans.features` JSON with `{storage_bytes: number}` OR add a `subscription_plans.storage_bytes_quota bigint` column
3. Wire `creator_subscriptions` writes to the Cashfree subscription webhook (separate from product checkout)
4. Replace the constant in `/api/upload` with a lookup: profile → subscription → plan → quota
**Effort:** half a day for the route change ONCE steps 1-3 are done. Steps 1-3 are their own multi-day project.

## Smaller concerns from the implementation (worth knowing, not bugs)

### 4. `/api/deliverables` is N+1 in Supabase calls
Listing then signing 50 files = 51 round-trips. `Promise.all` parallelizes the signing loop so wall-clock isn't catastrophic, but Supabase rate-limits per-project apply to the total call count.
**Fix:** custom RPC `list_and_sign_creator_content(creator_id, product_id, ttl_seconds)` returning rows of `(path, signed_url, bytes, mime)`. Single SQL round-trip.
**Effort:** few hours.

### 5. 50-file pagination cap
`MAX_FILES_RETURNED = 50` in `app/api/deliverables/[productId]/route.ts`. Creator uploads 51+ files for one product → buyer sees only 50.
**Fix:** offset/cursor pagination, or relax the cap.
**Effort:** trivial if needed; probably not needed (most products ship 1-10 files).

### 6. No upload-completion audit trail
The route hands out a signed URL and forgets. No record of "did the buyer/creator actually PUT to the URL." If something gets uploaded, no DB row to query against.
**Fix:** `storage_uploads` audit table populated either by a Storage webhook (Supabase has these) or by a `complete_upload` confirmation endpoint the client calls after PUT succeeds. Pick one — the webhook is more reliable.
**Effort:** half a day.

### 7. No virus scanning
Creators upload anything matching the MIME allowlist; buyers download as-is. ClamAV via Storage webhook is the industry-standard mitigation.
**Effort:** half a day to wire ClamAV + queue, multi-day if you build out per-file quarantine + creator notifications.

### 8. No automated tests
Per `.claude/rules/verification.md` Lane 2 isn't in place. The pure validators (`lib/upload-validators.ts` `isUuid`, `sanitizeFilename` and `lib/auth-resolve.ts` `resolveCreatorIdFromAuthUserId`) are trivially unit-testable when the test setup lands. Routes will need integration tests against a real Supabase schema or fixtures.

### 9. Product UUID stability assumption
Storage paths embed the product UUID at upload time (`creator-content/{creator_id}/{product_id}/`). If a product row is deleted and a same-name product is created with a new UUID, the storage folder still exists at the old UUID and buyers' deliverable links break. Edge case — products are rarely recreated.

### 10. No published-vs-draft separation on `creator-content`
`/api/deliverables` returns ALL files in the product folder. A creator uploading a draft (`notes-draft.docx`) and a finished file (`course.zip`) to the same folder means buyers see both. No metadata flag to filter.
**Fix:** either (a) a `staging/` subfolder for drafts + a "publish" step that moves files, or (b) a `published` boolean on a sibling `product_deliverables` DB table.
**Effort:** half a day for (a), more for (b).

### 11. `public-asset` still writable by authenticated creators
Documented as DigiOne-managed but `/api/upload` still accepts writes when `bucket === 'public-asset'`. Backward-compat for the existing 9 objects + ImagePickerModal defaulting to `public-asset`.
**Fix:** drop `'public-asset'` from `VALID_BUCKETS` in `/api/upload`, flip `ImagePickerModal.tsx:87` default to `'creator-public'`, do a one-time admin upload to seed actual DigiOne stock content into the bucket.
**Effort:** few hours of code, plus actually deciding what stock content to seed.

### 12. RLS policies on the three creator-* buckets
Deferred during the storage taxonomy work. Today `public: false` + service-role-only writes via the routes is the actual protection. Adding policies is defense-in-depth and required if any client-side code ever talks to Storage directly.
**Pattern to use** (matches the dropped `uploads` bucket's pre-cleanup policy):
```sql
create policy "creator_writes_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('creator-public','creator-content','creator-private')
    and (storage.foldername(name))[1] = (
      select id::text from profiles where user_id = auth.uid()
    )
  );
-- + matching update + delete + select policies per bucket
```
**Effort:** half a day, mostly testing.

## Priority order if you decide to push on this

1. **Rate limiting** (#1) — cheapest big win
2. **`public-asset` lockdown** (#11) — cleanup, makes the taxonomy honest
3. **Upload audit table** (#6) — once you start needing real ops/billing data
4. **RLS policies** (#12) — needed before any direct-client Storage access
5. **Per-plan quota work** (#3) — multi-day, blocks public claims about plan tiers
6. **Resumable uploads** (#2) — biggest single project, becomes blocking when you launch course-video products
7. **Virus scanning** (#7) — becomes blocking when first creator uploads malware (will happen eventually)
8. Everything else as needed

## Relevant commits for context

| Commit | What |
|---|---|
| `d8a065d` | Created `creator-content` + `creator-private` buckets |
| `291a454` | Merged `products` → `creator-public` with `{kind}` subfolder |
| `a5bf7bf` | Dropped legacy `uploads` + `user_files` |
| `09fcc1b` | `/api/upload` audit fixes 1, 2, 4, 5 (auth, sanitization) |
| `7e4431c` | `/api/upload` audit fixes 7, 9 + `public-asset` path to `digione/{kind}/` |
| `87c2d41` | `/api/upload` per-creator quota for `creator-content` |
| `92541a9` | `/api/deliverables/[productId]` + `/api/private/download` |
| `cac9fac` | MCP type-regen fallback documented in `supabase-reference.md` |
