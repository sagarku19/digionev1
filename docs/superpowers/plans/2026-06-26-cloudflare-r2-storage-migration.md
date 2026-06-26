---
noteId: "ceac285070d511f19a5ba9a9f70f067a"
tags: []

---

# Cloudflare R2 Storage Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move DigiOne's file storage from Supabase Storage to Cloudflare R2 (egress-free), behind a thin provider abstraction, with a repurposed `storage_files` metadata table (consolidating the dead baseline file tables), non-destructive image cropping (materialized derivatives), and a write-only KYC model with mandatory admin audit logging.

**Architecture:** Routes never touch the S3 SDK — they call a `storage` provider (`src/lib/storage/`). Object metadata lives in an RLS'd `storage_files` table — the dead baseline file-metadata subsystem (`storage_files`, `storage_file_usages`, `media_library`, `product_files`, `product_licenses`) is consolidated into this one bucket-aware table (service-role writes only); quota = a `storage_files`-table sum (replaces the dropped `sum_bucket_bytes_for_prefix` RPC). Images are converted to WebP server-side with `sharp`. Cropping is **non-destructive**: the original is stored once and never mutated; a crop produces a separate **derivative** object whose `storage_files` row carries `parent_file_id` + `crop` params, and only the *placement's* link is rewritten to the derivative. Large private files (product deliverables, KYC docs) use presigned PUT direct-to-R2. KYC is write-only for creators; only a new `super_admin`-gated route mints KYC download URLs and writes `kyc_access_log`. Dev big-bang cutover — no migration scripts, dual-read, or checksums (no production data).

**Tech Stack:** Next.js 16 App Router, TypeScript (strict), Supabase (Postgres + RLS), `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (R2 is S3-compatible), `sharp`, Vitest.

---

## Locked decisions (do not re-litigate)

From `.claude/todo-later/9(left)-2026-06-25-cloudflare-r2-storage-migration.md` plus this session's clarifications:

- **4 R2 buckets:** `digione-kyc-private`, `digione-products` (private/presigned), `digione-media`, `digione-public-assets` (public via env URLs).
- **Thin storage abstraction**, one provider (R2). Routes call `storage.*`, never the SDK.
- **Repurposed `storage_files` table** — drop the dead baseline file subsystem (`storage_files`/`storage_file_usages`/`media_library`/`product_files`/`product_licenses`) and recreate `storage_files` with our clean R2 shape (RLS: owner SELECT only; writes service-role only; partial unique `(bucket, object_key) where deleted_at is null`; `parent_file_id` + `crop` for materialized derivatives). Also drop the unused `storage_provider_type` enum and `creator_kyc.document_urls`/`document_hashes`.
- **New `kyc_access_log` table** (mandatory audit of admin KYC downloads).
- **KYC write-only for creators.** Removed from `/api/private/download`. New `/api/admin/kyc/[creatorId]/download` (`super_admin`-gated) mints the URL + logs.
- **Image conversion:** self-host `sharp`. **Cropping non-destructive, materialized:** original immutable; crop = new derivative; placement link rewritten for that placement only; **Media Library always shows originals**.
- **Re-crop:** load original + saved crop params for adjustment (resolve via the derivative URL).
- **Delete an original in Media:** **hard cascade** (original + all its derivatives), behind a confirm dialog stating how many placements/derivatives will be destroyed.
- **Replace/re-crop a placement:** **soft-delete** the orphaned old derivative.
- **Remove the paste-URL option** from the image picker everywhere.
- **Cutover:** dev big-bang.

## Two interface additions beyond the spec's four methods (approved this session)

The spec lists `createUploadUrl, createDownloadUrl, delete, sumBytes`. To support server-side `sharp` and accurate quota for presigned uploads, the provider also gets:
- `putObject` — server writes the converted/cropped WebP (and any server-side bytes) to R2.
- `headObject` — reads authoritative `ContentLength` after a presigned PUT so the `files` row records the true size.

`sumBytes` is implemented as a Supabase `storage_files`-table sum (it is a DB read, not an R2 op) and lives in `src/lib/storage/files.ts` (the module keeps the short `files.ts` name; it operates on the `storage_files` table).

---

## File structure

**New files:**
- `src/lib/storage/buckets.ts` — logical→R2 bucket map, visibility, public URL builder. Pure.
- `src/lib/storage/object-key.ts` — object-key construction per bucket/kind. Pure.
- `src/lib/storage/crop.ts` — crop-param parse/validate/clamp. Pure.
- `src/lib/storage/images.ts` — `sharp` convert/crop helpers (server-only).
- `src/lib/storage/r2.ts` — `StorageProvider` R2 implementation (server-only).
- `src/lib/storage/files.ts` — `storage_files`-table helpers: insert/soft-delete/hard-cascade/sum/resolve-by-url (service-role).
- `src/lib/storage/index.ts` — interface + `storage` singleton + re-exports.
- `src/lib/storage/buckets.test.ts`, `object-key.test.ts`, `crop.test.ts`, `images.test.ts` — Vitest unit tests.
- `supabase/migrations/20260626120000_storage_metadata_repurpose.sql` (drops the dead file subsystem; (re)creates `storage_files`)
- `supabase/migrations/20260626120100_create_kyc_access_log.sql`
- `app/api/upload/confirm/route.ts` — finalize presigned (private) uploads.
- `app/api/media/upload/route.ts` — image bytes → sharp → original in `digione-media`.
- `app/api/media/derive/route.ts` — make a cropped derivative from an original/stock URL.
- `app/api/media/resolve/route.ts` — derivative URL → original + saved crop (re-crop support).
- `app/api/media/list/route.ts` — creator's originals (flat, by kind) for Media Library.
- `app/api/media/delete/route.ts` — hard-cascade delete of an original + its derivatives.
- `app/api/admin/kyc/[creatorId]/download/route.ts` — super_admin KYC signed URL + audit log.

**Modified files:**
- `app/api/upload/route.ts` — presigned PUT for private buckets only (deliverables/KYC); quota via `files` sum.
- `app/api/deliverables/[productId]/route.ts` — list via `files`, sign via `storage`.
- `app/api/private/download/route.ts` — drop `creator-private`; sign via `storage`.
- `src/components/dashboard/ImagePickerModal.tsx` — remove paste-URL; server-side crop; re-crop load.
- `app/dashboard/media/page.tsx` — rebuilt against `digione-media` originals + `/api/media/*`.
- `.env.example` already has the R2 vars (verify only).
- `.claude/rules/{api-routes,env-vars,supabase-reference}.md` — doc sync.
- `types/database.types.ts` — regenerated (never hand-edit).

**Storage call sites being migrated (the must-not-miss list):**

| File:line (current) | Migrated to |
|---|---|
| `app/api/upload/route.ts:106` (quota RPC) | `files` sum (`sumOwnerBytes`) |
| `app/api/upload/route.ts:135` (`createSignedUploadUrl`) | `storage.createUploadUrl` (private) / `storage.putObject` (images) |
| `app/api/upload/route.ts:154` (Supabase public URL) | `publicUrlFor()` from R2 env URLs |
| `app/api/deliverables/[productId]/route.ts:75,88` (`list`+`createSignedUrl`) | `files` query + `storage.createDownloadUrl` |
| `app/api/private/download/route.ts:78` (`createSignedUrl`) | `storage.createDownloadUrl` (KYC removed) |
| `src/components/dashboard/ImagePickerModal.tsx:218-234,269-272` (POST `/api/upload`+PUT, remote passthrough) | `/api/media/upload` + `/api/media/derive`; paste-URL removed |
| `app/dashboard/media/page.tsx:144,199,210,245` (client `supabase.storage.from('uploads')`) | `/api/media/list`, `/api/media/upload`, `/api/media/delete` |

---

## Testing strategy (matches `.claude/rules/verification.md`)

The repo has a single Vitest suite and leans on `tsc`/`lint`/`/verify` + manual click-through. We follow that:
- **Unit tests (Vitest, real value):** the pure modules — `buckets`, `object-key`, `crop` — and `images` (sharp can generate a tiny test PNG in-process, so convert/crop dimensions are testable fast and deterministically).
- **Route + R2 + Supabase wiring:** verified by `tsc`/`lint`/`/verify` + the manual checklist in Task 14. We do **not** fabricate S3/Supabase mocks — there is no such harness in the repo and brittle mocks would test the mock, not the route.

Every task ends with `npx tsc --noEmit`, `npm run lint`, and (where a test exists) `npm test`, then a commit.

---

### Task 0: Dependencies + env sanity

**Files:**
- Modify: `package.json` (via npm)
- Verify: `.env.example`, `.env.local`

- [ ] **Step 1: Install the approved packages**

Run:
```bash
npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner sharp
```
Expected: three packages added to `dependencies`. (`@aws-sdk/*` are spec-approved; `sharp` is the approved image converter.)

- [ ] **Step 2: Confirm env vars exist**

Confirm `.env.example` lines 38-58 contain `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_KYC`, `R2_BUCKET_PRODUCTS`, `R2_BUCKET_MEDIA`, `R2_BUCKET_PUBLIC`, `NEXT_PUBLIC_R2_MEDIA_URL`, `NEXT_PUBLIC_R2_BUCKET_PUBLIC_URL`. Add the same keys with real values to `.env.local`. No code change.

- [ ] **Step 3: Verify build still compiles**

Run: `npx tsc --noEmit`
Expected: PASS (no usages yet).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(storage): add aws-sdk + sharp for R2 migration"
```

---

### Task 1: Pure storage helpers — buckets, object-key, crop

**Files:**
- Create: `src/lib/storage/buckets.ts`
- Create: `src/lib/storage/object-key.ts`
- Create: `src/lib/storage/crop.ts`
- Test: `src/lib/storage/buckets.test.ts`, `src/lib/storage/object-key.test.ts`, `src/lib/storage/crop.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/lib/storage/buckets.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resolveBucket, publicUrlFor, LOGICAL_BUCKETS } from './buckets';

beforeEach(() => {
  process.env.R2_BUCKET_PUBLIC = 'digione-public-assets';
  process.env.R2_BUCKET_MEDIA = 'digione-media';
  process.env.R2_BUCKET_PRODUCTS = 'digione-products';
  process.env.R2_BUCKET_KYC = 'digione-kyc-private';
  process.env.NEXT_PUBLIC_R2_BUCKET_PUBLIC_URL = 'https://assets.example.com';
  process.env.NEXT_PUBLIC_R2_MEDIA_URL = 'https://media.example.com';
});

describe('resolveBucket', () => {
  it('maps creator-public to the media bucket, public', () => {
    const c = resolveBucket('creator-public');
    expect(c.name).toBe('digione-media');
    expect(c.visibility).toBe('public');
  });
  it('maps creator-content to the products bucket, private', () => {
    const c = resolveBucket('creator-content');
    expect(c.name).toBe('digione-products');
    expect(c.visibility).toBe('private');
    expect(c.publicBaseUrl).toBeNull();
  });
  it('maps creator-private to the kyc bucket, private', () => {
    expect(resolveBucket('creator-private').name).toBe('digione-kyc-private');
  });
  it('throws on unknown logical bucket', () => {
    // @ts-expect-error invalid on purpose
    expect(() => resolveBucket('nope')).toThrow();
  });
});

describe('publicUrlFor', () => {
  it('builds a public URL for a public bucket', () => {
    expect(publicUrlFor('creator-public', 'abc/cover/1_x.webp'))
      .toBe('https://media.example.com/abc/cover/1_x.webp');
  });
  it('returns null for a private bucket', () => {
    expect(publicUrlFor('creator-content', 'abc/p/1_x.zip')).toBeNull();
  });
});

describe('LOGICAL_BUCKETS', () => {
  it('lists exactly the four logical buckets', () => {
    expect([...LOGICAL_BUCKETS].sort()).toEqual(
      ['creator-content', 'creator-private', 'creator-public', 'public-asset'],
    );
  });
});
```

`src/lib/storage/object-key.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildObjectKey } from './object-key';

describe('buildObjectKey', () => {
  it('public-asset is platform-scoped under digione/', () => {
    expect(buildObjectKey('public-asset', { ts: 100, safeName: 'a.webp', creatorId: 'C', kind: 'cover' }))
      .toBe('digione/cover/100_a.webp');
  });
  it('creator-public is creator/kind scoped', () => {
    expect(buildObjectKey('creator-public', { ts: 100, safeName: 'a.webp', creatorId: 'C', kind: 'avatar' }))
      .toBe('C/avatar/100_a.webp');
  });
  it('creator-public derivatives go under a derived/ segment', () => {
    expect(buildObjectKey('creator-public', { ts: 100, safeName: 'a.webp', creatorId: 'C', kind: 'cover', derived: true }))
      .toBe('C/cover/derived/100_a.webp');
  });
  it('creator-content uses productId when present, else unassigned', () => {
    expect(buildObjectKey('creator-content', { ts: 1, safeName: 'z.zip', creatorId: 'C', productId: 'P' }))
      .toBe('C/P/1_z.zip');
    expect(buildObjectKey('creator-content', { ts: 1, safeName: 'z.zip', creatorId: 'C' }))
      .toBe('C/unassigned/1_z.zip');
  });
  it('creator-private uses category', () => {
    expect(buildObjectKey('creator-private', { ts: 1, safeName: 'pan.pdf', creatorId: 'C', category: 'kyc' }))
      .toBe('C/kyc/1_pan.pdf');
  });
});
```

`src/lib/storage/crop.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseCrop } from './crop';

describe('parseCrop', () => {
  it('accepts a valid integer box and clamps to source bounds', () => {
    const c = parseCrop({ x: 10, y: 20, width: 100, height: 50, aspect: 1 }, { width: 80, height: 60 });
    expect(c).toEqual({ x: 10, y: 20, width: 70, height: 40, aspect: 1 });
  });
  it('floors fractional pixels', () => {
    const c = parseCrop({ x: 1.9, y: 2.2, width: 10.8, height: 10.1 }, { width: 100, height: 100 });
    expect(c).toEqual({ x: 1, y: 2, width: 10, height: 10, aspect: null });
  });
  it('rejects a zero-area box', () => {
    expect(() => parseCrop({ x: 0, y: 0, width: 0, height: 10 }, { width: 100, height: 100 })).toThrow();
  });
  it('rejects out-of-bounds origin', () => {
    expect(() => parseCrop({ x: 200, y: 0, width: 10, height: 10 }, { width: 100, height: 100 })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/storage`
Expected: FAIL ("Cannot find module './buckets'" etc.).

- [ ] **Step 3: Implement `src/lib/storage/buckets.ts`**

```ts
// Logical bucket names are the stable client/route contract. They map to the
// four R2 buckets + their visibility + public base URL. Routes resolve a
// logical bucket, then hand the resolved R2 name to the storage provider.

export type LogicalBucket =
  | 'public-asset'
  | 'creator-public'
  | 'creator-content'
  | 'creator-private';

export const LOGICAL_BUCKETS: ReadonlySet<LogicalBucket> = new Set([
  'public-asset',
  'creator-public',
  'creator-content',
  'creator-private',
]);

export interface BucketConfig {
  name: string;                 // the R2 bucket name
  visibility: 'public' | 'private';
  publicBaseUrl: string | null; // null for private buckets
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[storage] missing env ${name}`);
  return v;
}

export function resolveBucket(logical: LogicalBucket): BucketConfig {
  switch (logical) {
    case 'public-asset':
      return { name: env('R2_BUCKET_PUBLIC'), visibility: 'public', publicBaseUrl: env('NEXT_PUBLIC_R2_BUCKET_PUBLIC_URL') };
    case 'creator-public':
      return { name: env('R2_BUCKET_MEDIA'), visibility: 'public', publicBaseUrl: env('NEXT_PUBLIC_R2_MEDIA_URL') };
    case 'creator-content':
      return { name: env('R2_BUCKET_PRODUCTS'), visibility: 'private', publicBaseUrl: null };
    case 'creator-private':
      return { name: env('R2_BUCKET_KYC'), visibility: 'private', publicBaseUrl: null };
    default: {
      const _exhaustive: never = logical;
      throw new Error(`[storage] unknown logical bucket ${String(_exhaustive)}`);
    }
  }
}

export function publicUrlFor(logical: LogicalBucket, objectKey: string): string | null {
  const cfg = resolveBucket(logical);
  if (cfg.visibility !== 'public' || !cfg.publicBaseUrl) return null;
  return `${cfg.publicBaseUrl}/${objectKey}`;
}
```

- [ ] **Step 4: Implement `src/lib/storage/object-key.ts`**

```ts
import type { LogicalBucket } from './buckets';

interface KeyArgs {
  ts: number;
  safeName: string;       // already sanitized by lib/upload-validators
  creatorId: string;
  productId?: string;
  kind?: string;          // cover | avatar | banner | linkinbio | gallery | other
  category?: string;      // kyc | contracts | other (creator-private)
  derived?: boolean;      // media derivatives live under a derived/ segment
}

export function buildObjectKey(bucket: LogicalBucket, a: KeyArgs): string {
  const tail = `${a.ts}_${a.safeName}`;
  switch (bucket) {
    case 'public-asset':
      return `digione/${a.kind ?? 'other'}/${tail}`;
    case 'creator-public':
      return a.derived
        ? `${a.creatorId}/${a.kind ?? 'other'}/derived/${tail}`
        : `${a.creatorId}/${a.kind ?? 'other'}/${tail}`;
    case 'creator-content':
      return a.productId
        ? `${a.creatorId}/${a.productId}/${tail}`
        : `${a.creatorId}/unassigned/${tail}`;
    case 'creator-private':
      return `${a.creatorId}/${a.category ?? 'other'}/${tail}`;
  }
}
```

- [ ] **Step 5: Implement `src/lib/storage/crop.ts`**

```ts
// Crop box in SOURCE pixels (react-easy-crop croppedAreaPixels), validated +
// clamped against the source image dimensions. Stored verbatim in files.crop.

export interface CropInput {
  x: number; y: number; width: number; height: number; aspect?: number | null;
}
export interface Crop {
  x: number; y: number; width: number; height: number; aspect: number | null;
}

export function parseCrop(raw: unknown, source: { width: number; height: number }): Crop {
  if (typeof raw !== 'object' || raw === null) throw new Error('crop required');
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, n: string): number => {
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`crop.${n} must be a finite number`);
    return v;
  };
  let x = Math.max(0, Math.floor(num(r.x, 'x')));
  let y = Math.max(0, Math.floor(num(r.y, 'y')));
  if (x >= source.width || y >= source.height) throw new Error('crop origin out of bounds');
  let width = Math.floor(num(r.width, 'width'));
  let height = Math.floor(num(r.height, 'height'));
  width = Math.min(width, source.width - x);
  height = Math.min(height, source.height - y);
  if (width <= 0 || height <= 0) throw new Error('crop has zero area');
  const aspect = typeof r.aspect === 'number' && Number.isFinite(r.aspect) && r.aspect > 0 ? r.aspect : null;
  return { x, y, width, height, aspect };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/lib/storage`
Expected: PASS (buckets, object-key, crop suites green).

- [ ] **Step 7: tsc + lint + commit**

```bash
npx tsc --noEmit && npm run lint
git add src/lib/storage/buckets.ts src/lib/storage/object-key.ts src/lib/storage/crop.ts src/lib/storage/*.test.ts
git commit -m "feat(storage): pure R2 bucket/key/crop helpers + tests"
```

---

### Task 2: `sharp` image helpers

**Files:**
- Create: `src/lib/storage/images.ts`
- Test: `src/lib/storage/images.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/storage/images.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { toWebp, cropToWebp, probe } from './images';

async function redPng(w: number, h: number): Promise<Buffer> {
  return sharp({ create: { width: w, height: h, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toBuffer();
}

describe('images', () => {
  it('probe returns source dimensions', async () => {
    const dim = await probe(await redPng(120, 80));
    expect(dim).toEqual({ width: 120, height: 80 });
  });
  it('toWebp converts and caps width', async () => {
    const out = await toWebp(await redPng(4000, 2000), { maxWidth: 1600 });
    expect(out.contentType).toBe('image/webp');
    expect(out.width).toBe(1600);
    expect(out.size).toBeGreaterThan(0);
  });
  it('cropToWebp extracts the requested box', async () => {
    const out = await cropToWebp(await redPng(200, 200), { x: 10, y: 10, width: 50, height: 40, aspect: null });
    expect(out.width).toBe(50);
    expect(out.height).toBe(40);
    expect(out.contentType).toBe('image/webp');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/storage/images`
Expected: FAIL ("Cannot find module './images'").

- [ ] **Step 3: Implement `src/lib/storage/images.ts`**

```ts
// Server-only sharp helpers. Originals are converted to WebP (capped width);
// derivatives are cropped from the original then converted. One lossy pass.
import sharp from 'sharp';
import type { Crop } from './crop';

export interface WebpResult { data: Buffer; contentType: 'image/webp'; width: number; height: number; size: number }

const DEFAULT_MAX_WIDTH = 2048;
const QUALITY = 82;

export async function probe(input: Buffer): Promise<{ width: number; height: number }> {
  const m = await sharp(input).metadata();
  if (!m.width || !m.height) throw new Error('unreadable image');
  return { width: m.width, height: m.height };
}

export async function toWebp(input: Buffer, opts?: { maxWidth?: number }): Promise<WebpResult> {
  const pipeline = sharp(input).rotate().resize({
    width: opts?.maxWidth ?? DEFAULT_MAX_WIDTH,
    withoutEnlargement: true,
  }).webp({ quality: QUALITY });
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { data, contentType: 'image/webp', width: info.width, height: info.height, size: info.size };
}

export async function cropToWebp(input: Buffer, crop: Crop): Promise<WebpResult> {
  const { data, info } = await sharp(input)
    .rotate()
    .extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
    .webp({ quality: QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { data, contentType: 'image/webp', width: info.width, height: info.height, size: info.size };
}
```

> Note: `.rotate()` (auto-orient from EXIF) runs *before* `.extract()`, so crop coordinates must be computed against the already-oriented dimensions the browser cropper saw. The client cropper works on the rendered (oriented) image, so this matches.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/storage/images`
Expected: PASS.

- [ ] **Step 5: tsc + lint + commit**

```bash
npx tsc --noEmit && npm run lint
git add src/lib/storage/images.ts src/lib/storage/images.test.ts
git commit -m "feat(storage): sharp webp convert + crop helpers + tests"
```

---

### Task 3: R2 provider + `storage` singleton

**Files:**
- Create: `src/lib/storage/r2.ts`
- Create: `src/lib/storage/index.ts`

- [ ] **Step 1: Implement `src/lib/storage/r2.ts`**

```ts
// R2 implementation of StorageProvider. R2 is S3-compatible; the endpoint is
// derived from R2_ACCOUNT_ID. Server-only — never import in a client component.
import {
  S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider } from './index';

const DEFAULT_TTL = 600; // 10 minutes

function client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('[storage/r2] missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY');
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export const r2Storage: StorageProvider = {
  async createUploadUrl({ bucket, objectKey, contentType, ttlSeconds }) {
    const cmd = new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: contentType });
    return getSignedUrl(client(), cmd, { expiresIn: ttlSeconds ?? DEFAULT_TTL });
  },
  async createDownloadUrl({ bucket, objectKey, ttlSeconds }) {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: objectKey });
    return getSignedUrl(client(), cmd, { expiresIn: ttlSeconds ?? DEFAULT_TTL });
  },
  async putObject({ bucket, objectKey, body, contentType }) {
    await client().send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: body, ContentType: contentType }));
  },
  async headObject({ bucket, objectKey }) {
    const res = await client().send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
    return { size: res.ContentLength ?? 0, contentType: res.ContentType ?? null };
  },
  async delete({ bucket, objectKey }) {
    await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
  },
};
```

- [ ] **Step 2: Implement `src/lib/storage/index.ts`**

```ts
// Public surface of the storage layer. Routes import `storage` and the helpers
// here — never the aws-sdk directly.
import { r2Storage } from './r2';

export interface StorageProvider {
  createUploadUrl(a: { bucket: string; objectKey: string; contentType: string; ttlSeconds?: number }): Promise<string>;
  createDownloadUrl(a: { bucket: string; objectKey: string; ttlSeconds?: number }): Promise<string>;
  putObject(a: { bucket: string; objectKey: string; body: Buffer; contentType: string }): Promise<void>;
  headObject(a: { bucket: string; objectKey: string }): Promise<{ size: number; contentType: string | null }>;
  delete(a: { bucket: string; objectKey: string }): Promise<void>;
}

export const storage: StorageProvider = r2Storage;

export { resolveBucket, publicUrlFor, LOGICAL_BUCKETS } from './buckets';
export type { LogicalBucket, BucketConfig } from './buckets';
export { buildObjectKey } from './object-key';
export { parseCrop } from './crop';
export type { Crop, CropInput } from './crop';
export { toWebp, cropToWebp, probe } from './images';
```

- [ ] **Step 3: tsc + lint + commit**

```bash
npx tsc --noEmit && npm run lint
git add src/lib/storage/r2.ts src/lib/storage/index.ts
git commit -m "feat(storage): R2 provider + storage singleton"
```

---

### Task 4: DB migrations — repurpose `storage_files` + cleanup + `kyc_access_log` + types

> **Pre-migration DB audit (this is why this task drops tables).** DigiOne's baseline shipped a **dead, never-wired** file-metadata subsystem — `storage_files`, `storage_file_usages`, `media_library` (table), `product_files`, plus `product_licenses` — all empty, zero code references, already flagged dead in `.claude/todo-later/5(done)-...db-production-audit.md` and the B1 backlog. The unused `storage_provider_type` enum exists only for the dead `storage_files.provider` column. `creator_kyc.document_urls`/`document_hashes` (Json) are also unused in code. Per the decision this session, we **consolidate** that subsystem into ONE bucket-aware metadata table, **reusing the `storage_files` name** with our clean R2 shape, and drop the redundant rest. (Unrelated dead clusters — wallets, payout-v2, analytics — stay on the B1 pass.) Live URL columns elsewhere (`profiles.avatar_url`, `products.thumbnail_url`/`images`, site `logo_url`/`banner_url`/`hero_image_url`/`header_logo_url`/`preview_image_url`/`avatar_url`/`cover_url`, `public_images.url`/`thumbnail_url`) need **no schema change** — the dev big-bang re-upload regenerates their data.

**Files:**
- Create: `supabase/migrations/20260626120000_storage_metadata_repurpose.sql`
- Create: `supabase/migrations/20260626120100_create_kyc_access_log.sql`
- Modify: `types/database.types.ts` (regenerated)

- [ ] **Step 1: Write `supabase/migrations/20260626120000_storage_metadata_repurpose.sql`**

```sql
-- Storage metadata, repurposed. Consolidates the dead baseline file-metadata
-- subsystem (storage_files, storage_file_usages, media_library, product_files,
-- product_licenses) into ONE bucket-aware table, reusing the storage_files name
-- with a clean R2 shape. Also drops the now-unused storage_provider_type enum
-- and the unused creator_kyc URL/hash columns (KYC files are tracked here with
-- kind='kyc'; creator_kyc stays the status/level table). All these tables are
-- empty, so drop+recreate is safe (dev big-bang).

-- 1. Drop the dead subsystem (cascade clears FKs/indexes/policies).
drop table if exists public.storage_file_usages cascade;
drop table if exists public.media_library cascade;
drop table if exists public.product_files cascade;
drop table if exists public.product_licenses cascade;
drop table if exists public.storage_files cascade;

-- 2. Drop the now-unreferenced enum (only the old storage_files.provider used it).
drop type if exists public.storage_provider_type;

-- 3. Drop unused KYC URL/hash columns -- KYC files now live in storage_files.
alter table public.creator_kyc drop column if exists document_urls;
alter table public.creator_kyc drop column if exists document_hashes;

-- 4. Recreate storage_files as the single R2 object-metadata table. Writes are
--    service-role only (no creator INSERT/UPDATE policy) -> KYC immutability and
--    derivative integrity fall out for free. Owners SELECT their rows for status.
create table public.storage_files (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  bucket         text not null,            -- digione-{kyc-private|products|media|public-assets}
  object_key     text not null,            -- {creator_id}/{...}/{ts}_{filename}
  file_name      text not null,
  mime_type      text,
  size           bigint not null default 0,
  visibility     text not null default 'private',  -- private | public
  kind           text not null default 'other',    -- cover|avatar|banner|linkinbio|gallery|deliverable|kyc|contract|other
  product_id     uuid references public.products(id) on delete set null,
  parent_file_id uuid references public.storage_files(id) on delete cascade,  -- set on a crop derivative
  crop           jsonb,                    -- {x,y,width,height,aspect,sourceUrl} for derivatives
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create unique index storage_files_bucket_object_key_live_uniq
  on public.storage_files (bucket, object_key)
  where deleted_at is null;

create index storage_files_owner_bucket_live_idx
  on public.storage_files (owner_id, bucket)
  where deleted_at is null;

create index storage_files_parent_idx
  on public.storage_files (parent_file_id)
  where deleted_at is null;

create index storage_files_owner_product_idx
  on public.storage_files (owner_id, product_id)
  where deleted_at is null;

alter table public.storage_files enable row level security;

-- Owner may read their own rows (status display). No write policy: all
-- INSERT/UPDATE/DELETE go through service-role API routes.
create policy storage_files_owner_select on public.storage_files
  for select using (owner_id = public.current_profile_id());

-- super_admin read-everything (mirrors the rest of the schema).
create policy storage_files_admin_select on public.storage_files
  for select using (public.is_super_admin());
```

- [ ] **Step 2: Write `supabase/migrations/20260626120100_create_kyc_access_log.sql`**

```sql
-- Mandatory audit trail for admin KYC downloads. R2 has no native per-object
-- access log. Every mint of a KYC signed URL writes a row here. Writes are
-- service-role only; super_admins may read.

create table if not exists public.kyc_access_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references auth.users(id),
  creator_id  uuid not null references public.profiles(id) on delete cascade,
  file_id     uuid references public.storage_files(id) on delete set null,
  object_key  text not null,
  created_at  timestamptz not null default now()
);

create index if not exists kyc_access_log_creator_idx on public.kyc_access_log (creator_id, created_at desc);

alter table public.kyc_access_log enable row level security;

drop policy if exists kyc_access_log_admin_select on public.kyc_access_log;
create policy kyc_access_log_admin_select on public.kyc_access_log
  for select using (public.is_super_admin());
```

- [ ] **Step 3: Apply both migrations via the Supabase MCP**

The Windows Supabase CLI is broken (no `win32-x64` binary). Apply through the MCP:
```
mcp__plugin_supabase_supabase__apply_migration
  project_id: qcendfisvyjnwmefruba
  name: storage_metadata_repurpose
  query: <contents of 20260626120000_storage_metadata_repurpose.sql>

mcp__plugin_supabase_supabase__apply_migration
  project_id: qcendfisvyjnwmefruba
  name: create_kyc_access_log
  query: <contents of 20260626120100_create_kyc_access_log.sql>
```
Expected: both succeed. (Helpers `current_profile_id()` and `is_super_admin()` already exist from the RLS rollout. The drops target empty, dead tables — confirm 0 rows first with `mcp__plugin_supabase_supabase__execute_sql` `select count(*) from public.storage_files` etc. if you want belt-and-suspenders.)

- [ ] **Step 4: Regenerate types**

Try: `npm run update-types`. On the Windows "No matching Supabase CLI binary" failure, use the MCP fallback per `.claude/rules/supabase-reference.md`:
```
mcp__plugin_supabase_supabase__generate_typescript_types  project_id: qcendfisvyjnwmefruba
```
then strip the JSON envelope and write to `types/database.types.ts` via the documented Python snippet.

- [ ] **Step 5: Verify the new types landed**

Run: `npx tsc --noEmit`
Expected: PASS, and `types/database.types.ts` contains the reshaped `storage_files` (with `bucket`/`object_key`/`parent_file_id`/`crop`) and `kyc_access_log` table types, and **no longer** contains `media_library`, `product_files`, `storage_file_usages`, `product_licenses`, or `storage_provider_type` (grep to confirm):
```bash
grep -n "storage_files:" types/database.types.ts | head
grep -n "kyc_access_log" types/database.types.ts | head
grep -nE "media_library|product_files|storage_file_usages|product_licenses|storage_provider_type" types/database.types.ts   # expect: no output
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260626120000_storage_metadata_repurpose.sql supabase/migrations/20260626120100_create_kyc_access_log.sql types/database.types.ts
git commit -m "feat(db): repurpose storage_files for R2 + kyc_access_log + drop dead file tables"
```

---

### Task 5: `storage_files`-table helpers

**Files:**
- Create: `src/lib/storage/files.ts`

- [ ] **Step 1: Implement `src/lib/storage/files.ts`**

```ts
// Service-role helpers for the files metadata table. Routes use these so the
// table stays write-restricted to the server. `sumOwnerBytes` is the spec's
// `sumBytes` (a Supabase read, not an R2 op).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { storage } from './index';

type Db = SupabaseClient<Database>;
type FileRow = Database['public']['Tables']['storage_files']['Row'];
type FileInsert = Database['public']['Tables']['storage_files']['Insert'];

export async function insertFile(db: Db, row: FileInsert): Promise<FileRow> {
  const { data, error } = await db.from('storage_files').insert(row).select('*').single();
  if (error || !data) throw new Error(`[files] insert failed: ${error?.message}`);
  return data;
}

// Spec's sumBytes: live bytes for one owner+bucket. Replaces the quota RPC.
export async function sumOwnerBytes(db: Db, ownerId: string, bucket: string): Promise<number> {
  const { data, error } = await db
    .from('storage_files')
    .select('size')
    .eq('owner_id', ownerId)
    .eq('bucket', bucket)
    .is('deleted_at', null);
  if (error) throw new Error(`[files] sum failed: ${error.message}`);
  return (data ?? []).reduce((acc, r) => acc + Number(r.size ?? 0), 0);
}

// Resolve a live row by its (bucket, object_key). Used to map a placement URL
// back to its files row for re-crop / replace.
export async function findLiveByKey(db: Db, bucket: string, objectKey: string): Promise<FileRow | null> {
  const { data } = await db.from('storage_files').select('*')
    .eq('bucket', bucket).eq('object_key', objectKey).is('deleted_at', null).maybeSingle();
  return data ?? null;
}

export async function softDelete(db: Db, fileId: string): Promise<void> {
  const { error } = await db.from('storage_files').update({ deleted_at: new Date().toISOString() }).eq('id', fileId);
  if (error) throw new Error(`[files] soft-delete failed: ${error.message}`);
}

// Hard cascade: delete an original + every derivative (R2 objects then rows).
// Returns how many objects were removed. Used by Media Library delete.
export async function hardDeleteCascade(db: Db, fileId: string): Promise<{ removed: number }> {
  const { data: original } = await db.from('storage_files').select('*').eq('id', fileId).maybeSingle();
  if (!original) return { removed: 0 };
  const { data: derivatives } = await db.from('storage_files').select('*').eq('parent_file_id', fileId);
  const all: FileRow[] = [original, ...(derivatives ?? [])];
  for (const f of all) {
    try { await storage.delete({ bucket: f.bucket, objectKey: f.object_key }); }
    catch { /* object already gone — proceed to remove the row */ }
  }
  await db.from('storage_files').delete().eq('parent_file_id', fileId);
  await db.from('storage_files').delete().eq('id', fileId);
  return { removed: all.length };
}
```

- [ ] **Step 2: tsc + lint + commit**

```bash
npx tsc --noEmit && npm run lint
git add src/lib/storage/files.ts
git commit -m "feat(storage): files-table helpers (insert/sum/resolve/delete-cascade)"
```

---

### Task 6: `/api/upload` — presigned PUT for private buckets only

Auth/validation unchanged. This route now serves **only** `creator-content` and `creator-private` (presigned PUT). Image buckets move to `/api/media/upload` (Task 8). The `files` row for a presigned upload is written by `/api/upload/confirm` (Task 7), since size isn't known until the PUT completes.

**Files:**
- Modify: `app/api/upload/route.ts` (full rewrite of the body; keep `log`/`json` helpers)

- [ ] **Step 1: Rewrite `app/api/upload/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { isUuid, sanitizeFilename } from '@/lib/upload-validators';
import { resolveBucket, buildObjectKey, storage } from '@/lib/storage';
import { sumOwnerBytes } from '@/lib/storage/files';
import crypto from 'crypto';

type PrivateBucket = 'creator-content' | 'creator-private';
const VALID_BUCKETS: ReadonlySet<PrivateBucket> = new Set(['creator-content', 'creator-private']);
const PRIVATE_CATEGORIES = new Set(['kyc', 'contracts', 'other']);
const CREATOR_CONTENT_QUOTA_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB (per-plan version still blocked)

type LogLevel = 'warn' | 'error';
function log(level: LogLevel, reqId: string, event: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({ reqId, ts: new Date().toISOString(), event, ...(data ?? {}) });
  if (level === 'error') console.error('[api/upload]', line); else console.warn('[api/upload]', line);
}
function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId } });
}

export async function POST(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) return json(reqId, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null) as {
      filename?: unknown; bucket?: unknown; productId?: unknown; category?: unknown;
    } | null;
    if (!body) return json(reqId, { error: 'Invalid JSON body' }, 400);

    const { filename: rawFilename, bucket, productId, category } = body;
    if (typeof rawFilename !== 'string') return json(reqId, { error: 'Filename required' }, 400);
    const safeName = sanitizeFilename(rawFilename);
    if (!safeName) return json(reqId, { error: 'Filename invalid (allowed: letters, digits, . _ -, max 200 chars)' }, 400);

    if (typeof bucket !== 'string' || !VALID_BUCKETS.has(bucket as PrivateBucket)) {
      return json(reqId, { error: 'Invalid bucket (images use /api/media/upload)' }, 400);
    }
    const typedBucket = bucket as PrivateBucket;
    if (typedBucket === 'creator-private' && (typeof category !== 'string' || !PRIVATE_CATEGORIES.has(category))) {
      return json(reqId, { error: 'category required (kyc | contracts | other) for creator-private' }, 400);
    }
    if (productId !== undefined && !isUuid(productId)) return json(reqId, { error: 'productId must be a UUID' }, 400);

    const serviceDb = createServiceClient();
    const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, user.id);
    if (!creatorId) { log('warn', reqId, 'profile_lookup_failed', { authId: user.id }); return json(reqId, { error: 'Creator profile not found' }, 403); }

    const cfg = resolveBucket(typedBucket);

    if (typedBucket === 'creator-content') {
      const usedBytes = await sumOwnerBytes(serviceDb, creatorId, cfg.name);
      if (usedBytes >= CREATOR_CONTENT_QUOTA_BYTES) {
        log('warn', reqId, 'quota_exceeded', { creatorId, usedBytes });
        return json(reqId, { error: 'Storage quota exceeded', usedBytes, quotaBytes: CREATOR_CONTENT_QUOTA_BYTES }, 413);
      }
    }

    const ts = Date.now();
    const objectKey = buildObjectKey(typedBucket, {
      ts, safeName, creatorId,
      productId: typeof productId === 'string' ? productId : undefined,
      category: typeof category === 'string' ? category : undefined,
    });

    const uploadUrl = await storage.createUploadUrl({
      bucket: cfg.name,
      objectKey,
      contentType: 'application/octet-stream',
    });

    return json(reqId, { uploadUrl, bucket: typedBucket, objectKey }, 200);
  } catch (err) {
    log('error', reqId, 'unhandled', { message: err instanceof Error ? err.message : String(err) });
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
```

> The client must `PUT` the file to `uploadUrl` with `Content-Type: application/octet-stream` (it was signed with that type), then call `/api/upload/confirm`.

- [ ] **Step 2: tsc + lint + verify + commit**

```bash
npx tsc --noEmit && npm run lint
```
Run `/verify` on the changed route. Then:
```bash
git add app/api/upload/route.ts
git commit -m "feat(api/upload): presigned PUT to R2 for private buckets; files-sum quota"
```

---

### Task 7: `POST /api/upload/confirm` — finalize presigned uploads

**Files:**
- Create: `app/api/upload/confirm/route.ts`

- [ ] **Step 1: Implement `app/api/upload/confirm/route.ts`**

```ts
// POST /api/upload/confirm — after a client completes a presigned PUT, HEAD the
// object for its authoritative size and write the files row. Idempotent on the
// partial-unique (bucket, object_key) live index.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { isUuid } from '@/lib/upload-validators';
import { resolveBucket, storage } from '@/lib/storage';
import { findLiveByKey, insertFile } from '@/lib/storage/files';
import crypto from 'crypto';

type PrivateBucket = 'creator-content' | 'creator-private';
const VALID_BUCKETS: ReadonlySet<PrivateBucket> = new Set(['creator-content', 'creator-private']);

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId, 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) return json(reqId, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null) as {
      bucket?: unknown; objectKey?: unknown; productId?: unknown; kind?: unknown;
    } | null;
    if (!body) return json(reqId, { error: 'Invalid JSON body' }, 400);

    const { bucket, objectKey, productId, kind } = body;
    if (typeof bucket !== 'string' || !VALID_BUCKETS.has(bucket as PrivateBucket)) return json(reqId, { error: 'Invalid bucket' }, 400);
    if (typeof objectKey !== 'string' || objectKey.includes('..') || objectKey.startsWith('/') || objectKey.includes('\\')) {
      return json(reqId, { error: 'Invalid objectKey' }, 400);
    }
    if (productId !== undefined && !isUuid(productId)) return json(reqId, { error: 'productId must be a UUID' }, 400);

    const serviceDb = createServiceClient();
    const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, user.id);
    if (!creatorId) return json(reqId, { error: 'Creator profile not found' }, 403);
    if (!objectKey.startsWith(`${creatorId}/`)) return json(reqId, { error: 'You do not own this object' }, 403);

    const cfg = resolveBucket(bucket as PrivateBucket);

    const existing = await findLiveByKey(serviceDb, cfg.name, objectKey);
    if (existing) return json(reqId, { fileId: existing.id, alreadyConfirmed: true }, 200);

    const head = await storage.headObject({ bucket: cfg.name, objectKey });
    const fileName = objectKey.split('/').pop() ?? objectKey;
    const row = await insertFile(serviceDb, {
      owner_id: creatorId,
      bucket: cfg.name,
      object_key: objectKey,
      file_name: fileName,
      mime_type: head.contentType,
      size: head.size,
      visibility: 'private',
      kind: typeof kind === 'string' ? kind : (bucket === 'creator-content' ? 'deliverable' : 'other'),
      product_id: typeof productId === 'string' ? productId : null,
    });
    return json(reqId, { fileId: row.id, size: row.size }, 200);
  } catch (err) {
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
```

- [ ] **Step 2: tsc + lint + verify + commit**

```bash
npx tsc --noEmit && npm run lint
```
Run `/verify`. Then:
```bash
git add app/api/upload/confirm/route.ts
git commit -m "feat(api): /api/upload/confirm finalizes presigned uploads into files"
```

---

### Task 8: Image routes — `/api/media/upload`, `/api/media/derive`, `/api/media/resolve`

These power the picker. `upload` stores an **original** WebP; `derive` makes a **cropped derivative** (non-destructive); `resolve` maps a placement URL back to its original + crop for re-crop.

**Files:**
- Create: `app/api/media/upload/route.ts`
- Create: `app/api/media/derive/route.ts`
- Create: `app/api/media/resolve/route.ts`

- [ ] **Step 1: Implement `app/api/media/upload/route.ts`**

```ts
// POST /api/media/upload (multipart/form-data) — accepts an ORIGINAL image,
// converts to WebP via sharp, stores it in digione-media (logical creator-public
// or public-asset), writes a files row, returns the public URL + fileId.
// Images are small (<= ~10MB) so streaming through the route is fine; large
// files use the presigned path (/api/upload).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { sanitizeFilename } from '@/lib/upload-validators';
import { resolveBucket, buildObjectKey, publicUrlFor, storage, toWebp, probe } from '@/lib/storage';
import { insertFile } from '@/lib/storage/files';
import type { LogicalBucket } from '@/lib/storage';
import crypto from 'crypto';

const IMAGE_BUCKETS: ReadonlySet<LogicalBucket> = new Set(['creator-public', 'public-asset']);
const PUBLIC_KINDS = new Set(['cover', 'avatar', 'banner', 'linkinbio', 'gallery', 'other']);
const MAX_BYTES = 15 * 1024 * 1024;

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId } });
}

export async function POST(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) return json(reqId, { error: 'Unauthorized' }, 401);

    const form = await req.formData().catch(() => null);
    if (!form) return json(reqId, { error: 'Expected multipart/form-data' }, 400);
    const file = form.get('file');
    const bucket = String(form.get('bucket') ?? 'creator-public') as LogicalBucket;
    const kind = String(form.get('kind') ?? 'other');
    if (!(file instanceof File)) return json(reqId, { error: 'file required' }, 400);
    if (!IMAGE_BUCKETS.has(bucket)) return json(reqId, { error: 'Invalid image bucket' }, 400);
    if (!PUBLIC_KINDS.has(kind)) return json(reqId, { error: 'Invalid kind' }, 400);
    if (file.size > MAX_BYTES) return json(reqId, { error: 'Image too large' }, 413);

    const safeName = sanitizeFilename((file.name || 'image').replace(/\.[^.]+$/, '') + '.webp');
    if (!safeName) return json(reqId, { error: 'Filename invalid' }, 400);

    const serviceDb = createServiceClient();
    const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, user.id);
    if (!creatorId) return json(reqId, { error: 'Creator profile not found' }, 403);

    const input = Buffer.from(await file.arrayBuffer());
    await probe(input); // rejects non-images
    const webp = await toWebp(input);

    const ts = Date.now();
    const objectKey = buildObjectKey(bucket, { ts, safeName, creatorId, kind });
    const cfg = resolveBucket(bucket);
    await storage.putObject({ bucket: cfg.name, objectKey, body: webp.data, contentType: webp.contentType });

    const row = await insertFile(serviceDb, {
      owner_id: creatorId, bucket: cfg.name, object_key: objectKey, file_name: safeName,
      mime_type: webp.contentType, size: webp.size, visibility: 'public', kind, product_id: null,
    });

    return json(reqId, { fileId: row.id, publicUrl: publicUrlFor(bucket, objectKey), objectKey }, 200);
  } catch (err) {
    return json(reqId, { error: 'Failed to upload image' }, 500);
  }
}
```

- [ ] **Step 2: Implement `app/api/media/derive/route.ts`**

```ts
// POST /api/media/derive — produce a non-destructive cropped derivative from a
// source (an owned original via sourceFileId, OR a stock/library public-asset
// URL via sourceUrl). sharp crops+converts; a new files row records
// parent_file_id + crop. Optionally soft-deletes a replaced derivative.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { sanitizeFilename } from '@/lib/upload-validators';
import { resolveBucket, buildObjectKey, publicUrlFor, storage, parseCrop, cropToWebp, probe } from '@/lib/storage';
import { insertFile, softDelete } from '@/lib/storage/files';
import crypto from 'crypto';

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId } });
}

async function fetchSource(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`source fetch failed ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) return json(reqId, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null) as {
      sourceFileId?: unknown; sourceUrl?: unknown; crop?: unknown; kind?: unknown; replacesFileId?: unknown;
    } | null;
    if (!body) return json(reqId, { error: 'Invalid JSON body' }, 400);
    const kind = typeof body.kind === 'string' ? body.kind : 'other';

    const serviceDb = createServiceClient();
    const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, user.id);
    if (!creatorId) return json(reqId, { error: 'Creator profile not found' }, 403);

    // Resolve the source bytes + a pointer for re-crop.
    let sourceBuf: Buffer;
    let parentFileId: string | null = null;
    let sourceUrl: string | null = null;
    if (typeof body.sourceFileId === 'string') {
      const { data: parent } = await serviceDb.from('storage_files').select('*').eq('id', body.sourceFileId).is('deleted_at', null).maybeSingle();
      if (!parent || parent.owner_id !== creatorId) return json(reqId, { error: 'Source not found' }, 404);
      parentFileId = parent.id;
      const pub = parent.visibility === 'public'
        ? publicUrlFor('creator-public', parent.object_key)
        : await storage.createDownloadUrl({ bucket: parent.bucket, objectKey: parent.object_key });
      sourceBuf = await fetchSource(pub!);
    } else if (typeof body.sourceUrl === 'string' && /^https?:\/\//.test(body.sourceUrl)) {
      sourceUrl = body.sourceUrl;
      sourceBuf = await fetchSource(body.sourceUrl);
    } else {
      return json(reqId, { error: 'sourceFileId or sourceUrl required' }, 400);
    }

    const dim = await probe(sourceBuf);
    const crop = parseCrop(body.crop, dim);
    const webp = await cropToWebp(sourceBuf, crop);

    const ts = Date.now();
    const safeName = sanitizeFilename(`crop_${ts}.webp`)!;
    const objectKey = buildObjectKey('creator-public', { ts, safeName, creatorId, kind, derived: true });
    const cfg = resolveBucket('creator-public');
    await storage.putObject({ bucket: cfg.name, objectKey, body: webp.data, contentType: webp.contentType });

    const row = await insertFile(serviceDb, {
      owner_id: creatorId, bucket: cfg.name, object_key: objectKey, file_name: safeName,
      mime_type: webp.contentType, size: webp.size, visibility: 'public', kind,
      product_id: null, parent_file_id: parentFileId,
      crop: { ...crop, sourceUrl },
    });

    // Replace/re-crop: soft-delete the old derivative (orphan cleanup).
    if (typeof body.replacesFileId === 'string') {
      const { data: old } = await serviceDb.from('storage_files').select('id, owner_id').eq('id', body.replacesFileId).maybeSingle();
      if (old && old.owner_id === creatorId) await softDelete(serviceDb, old.id);
    }

    return json(reqId, { fileId: row.id, publicUrl: publicUrlFor('creator-public', objectKey), objectKey }, 200);
  } catch (err) {
    return json(reqId, { error: 'Failed to crop image' }, 500);
  }
}
```

- [ ] **Step 3: Implement `app/api/media/resolve/route.ts`**

```ts
// GET /api/media/resolve?url=<derivative publicUrl> — for re-crop. Maps a
// placement's current derivative URL back to its files row -> the original
// source URL + saved crop params so the picker can reload that crop state.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { resolveBucket, publicUrlFor, storage } from '@/lib/storage';
import crypto from 'crypto';

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId, 'Cache-Control': 'no-store' } });
}

export async function GET(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) return json(reqId, { error: 'Unauthorized' }, 401);

    const url = new URL(req.url).searchParams.get('url');
    if (!url) return json(reqId, { error: 'url required' }, 400);

    const mediaBase = resolveBucket('creator-public').publicBaseUrl!;
    if (!url.startsWith(`${mediaBase}/`)) return json(reqId, { notDerivative: true }, 200);
    const objectKey = url.slice(mediaBase.length + 1);

    const serviceDb = createServiceClient();
    const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, user.id);
    if (!creatorId) return json(reqId, { error: 'Creator profile not found' }, 403);

    const cfg = resolveBucket('creator-public');
    const { data: row } = await serviceDb.from('storage_files').select('*')
      .eq('bucket', cfg.name).eq('object_key', objectKey).is('deleted_at', null).maybeSingle();
    if (!row || row.owner_id !== creatorId) return json(reqId, { error: 'Not found' }, 404);
    if (!row.parent_file_id && !(row.crop as { sourceUrl?: string } | null)?.sourceUrl) {
      return json(reqId, { notDerivative: true, derivativeFileId: row.id }, 200);
    }

    let originalUrl: string | null = (row.crop as { sourceUrl?: string } | null)?.sourceUrl ?? null;
    if (!originalUrl && row.parent_file_id) {
      const { data: parent } = await serviceDb.from('storage_files').select('*').eq('id', row.parent_file_id).maybeSingle();
      if (parent) {
        originalUrl = parent.visibility === 'public'
          ? publicUrlFor('creator-public', parent.object_key)
          : await storage.createDownloadUrl({ bucket: parent.bucket, objectKey: parent.object_key });
      }
    }
    return json(reqId, { derivativeFileId: row.id, originalFileId: row.parent_file_id, originalUrl, crop: row.crop }, 200);
  } catch {
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
```

- [ ] **Step 4: tsc + lint + verify + commit**

```bash
npx tsc --noEmit && npm run lint
```
Run `/verify`. Then:
```bash
git add app/api/media/upload/route.ts app/api/media/derive/route.ts app/api/media/resolve/route.ts
git commit -m "feat(api/media): image upload (sharp), non-destructive crop derive, re-crop resolve"
```

---

### Task 9: ImagePickerModal — server crop, re-crop, no paste-URL

**Files:**
- Modify: `src/components/dashboard/ImagePickerModal.tsx`

The component already crops with react-easy-crop and tracks `croppedAreaRef` (an `Area = {x,y,width,height}` in source pixels — matches `parseCrop`). Changes:
1. Remove the paste-URL block (`:530-559`), `urlInputRef`, and the remote passthrough in `handleUseOriginal` (`:269-272`).
2. Replace `uploadBlob` (client JPEG + two-step presign) with: upload tab → POST the **original** file to `/api/media/upload`, capture `{ fileId, publicUrl }`; then on crop → POST `/api/media/derive` `{ sourceFileId, crop, kind, replacesFileId? }`. "Use Original" selects the original `publicUrl` directly (no derivative).
3. Library tab: uncropped pick → `onSelect(stockUrl)` (already on R2, reference). Cropped pick → `/api/media/derive` `{ sourceUrl: stockUrl, crop, kind }`.
4. Accept new optional props: `kind?: string` (placement kind for the files row) and `currentUrl?: string` (to enable re-crop). On open with `currentUrl`, call `/api/media/resolve?url=` and, if it returns `{ originalUrl, crop }`, preload the cropper at that state.

- [ ] **Step 1: Add props + replace the upload/crop logic**

Replace the props type and `uploadBlob`/`handleCropAndAdd`/`handleUseOriginal` with the following (keep the rest of the component — header, tabs, cropper UI — intact, minus the removed paste-URL markup):

```tsx
export type ImagePickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
  bucket?: 'creator-public' | 'public-asset';
  kind?: string;            // cover | avatar | banner | linkinbio | gallery | other
  currentUrl?: string;      // existing placement value — enables re-crop
};
```

State additions (near the other `useState`s):
```tsx
const [originalFileId, setOriginalFileId] = useState<string | null>(null);
const [sourceUrl, setSourceUrl] = useState<string | null>(null);   // stock/library source
const [replacesFileId, setReplacesFileId] = useState<string | null>(null);
```

Replace `uploadBlob`/`handleCropAndAdd`/`handleUseOriginal`:
```tsx
// Upload tab: send the ORIGINAL bytes; server converts to WebP + stores it.
const uploadOriginal = useCallback(async (file: File): Promise<{ fileId: string; publicUrl: string }> => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('bucket', bucket);
  fd.append('kind', kind);
  const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Upload failed');
  return data;
}, [bucket, kind]);

// Crop -> non-destructive derivative.
const deriveCrop = useCallback(async (crop: Area): Promise<string> => {
  const payload: Record<string, unknown> = { crop, kind };
  if (originalFileId) payload.sourceFileId = originalFileId;
  else if (sourceUrl) payload.sourceUrl = sourceUrl;
  if (replacesFileId) payload.replacesFileId = replacesFileId;
  const res = await fetch('/api/media/derive', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Crop failed');
  return data.publicUrl as string;
}, [originalFileId, sourceUrl, replacesFileId, kind]);

const handleCropAndAdd = useCallback(async () => {
  if (!croppedAreaRef.current) return;
  setUploading(true);
  try {
    // If the source is a freshly chosen local file, upload the original first.
    if (pendingFileRef.current && !originalFileId) {
      const up = await uploadOriginal(pendingFileRef.current);
      setOriginalFileId(up.fileId);
      const url = await deriveCropFrom(up.fileId, croppedAreaRef.current);
      onSelect(url); handleClose(); return;
    }
    const url = await deriveCrop(croppedAreaRef.current);
    onSelect(url); handleClose();
  } catch (err) { console.error(err); }
  finally { setUploading(false); }
}, [originalFileId, uploadOriginal, deriveCrop, onSelect]);

// Helper used right after an original upload (avoids a setState race).
const deriveCropFrom = useCallback(async (fileId: string, crop: Area): Promise<string> => {
  const res = await fetch('/api/media/derive', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceFileId: fileId, crop, kind, replacesFileId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Crop failed');
  return data.publicUrl as string;
}, [kind, replacesFileId]);

const handleUseOriginal = useCallback(async () => {
  setUploading(true);
  try {
    if (pendingFileRef.current && !originalFileId) {
      const up = await uploadOriginal(pendingFileRef.current);
      onSelect(up.publicUrl);
    } else if (sourceUrl) {
      onSelect(sourceUrl);                 // uncropped stock/library reference
    }
    handleClose();
  } finally { setUploading(false); }
}, [originalFileId, sourceUrl, uploadOriginal, onSelect]);
```

> `console.error` here is acceptable — it mirrors the existing component (`ImagePickerModal.tsx:247`) and is dev-facing error surfacing, not a production `console.log`. Keep it.

- [ ] **Step 2: Track the picked local file + remove paste-URL markup**

- Add `const pendingFileRef = useRef<File | null>(null);`.
- In `handleFile` (`:182`), set `pendingFileRef.current = file;` before reading it for preview, and reset `originalFileId`/`sourceUrl` to null.
- In `selectImage` (the library-grid click), set `setSourceUrl(url); pendingFileRef.current = null; setOriginalFileId(null);`.
- Delete the entire "or paste URL" block (`:530-559`) and the `urlInputRef` declaration.
- In `handleClose`, also reset `pendingFileRef.current = null; setOriginalFileId(null); setSourceUrl(null); setReplacesFileId(null);`.

- [ ] **Step 3: Wire re-crop on open**

Add an effect that runs when the modal opens with a `currentUrl`:
```tsx
useEffect(() => {
  if (!open || !currentUrl) return;
  (async () => {
    const res = await fetch(`/api/media/resolve?url=${encodeURIComponent(currentUrl)}`);
    const data = await res.json().catch(() => null);
    if (data?.originalUrl) {
      setSourceUrl(data.originalUrl);
      setReplacesFileId(data.derivativeFileId ?? null);
      setCropSrc(data.originalUrl);
      if (data.crop) { /* optional: preset zoom/aspect from data.crop.aspect */ }
    }
  })();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, currentUrl]);
```

- [ ] **Step 4: Pass `kind`/`currentUrl` from the product editor**

In `app/dashboard/products/[productId]/page.tsx` where `<ImagePickerModal ... bucket="creator-public" />` is used (`:705`), add `kind="cover"` (and `kind="gallery"` for the gallery picker) plus `currentUrl={formData.cover_image ?? undefined}` for the cover picker. (Gallery items are additive, so the gallery picker omits `currentUrl`.)

- [ ] **Step 5: tsc + lint + manual check + commit**

```bash
npx tsc --noEmit && npm run lint
```
Manual (dev server): open a product, upload a cover image → it appears (WebP); re-open the cover picker → it preloads the original for re-crop; saving twice produces a new derivative and the old one is soft-deleted. Then:
```bash
git add src/components/dashboard/ImagePickerModal.tsx "app/dashboard/products/[productId]/page.tsx"
git commit -m "feat(picker): server-side non-destructive crop, re-crop, remove paste-URL"
```

---

### Task 10: `/api/deliverables/[productId]` — list via `files`, sign via R2

**Files:**
- Modify: `app/api/deliverables/[productId]/route.ts`

- [ ] **Step 1: Replace the storage list/sign block**

Keep the auth + `user_product_access` check + product lookup (`:42-72`) unchanged. Replace the `serviceDb.storage.from('creator-content').list(...)` + per-object `createSignedUrl` (`:74-104`) with a `files`-table query + `storage.createDownloadUrl`:

```ts
import { resolveBucket, storage } from '@/lib/storage';
// ...
const cfg = resolveBucket('creator-content');
const { data: rows, error: listError } = await serviceDb
  .from('storage_files')
  .select('object_key, file_name, size, mime_type, created_at')
  .eq('owner_id', product.creator_id)
  .eq('bucket', cfg.name)
  .eq('product_id', productId)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
  .limit(MAX_FILES_RETURNED);
if (listError) {
  log('error', reqId, 'files_list_failed', { productId, message: listError.message });
  return json(reqId, { error: 'Failed to list deliverables' }, 502);
}

const files = await Promise.all((rows ?? []).map(async (r) => {
  try {
    const signedUrl = await storage.createDownloadUrl({ bucket: cfg.name, objectKey: r.object_key, ttlSeconds: SIGNED_URL_TTL_SECONDS });
    return { name: r.file_name, path: r.object_key, signedUrl, bytes: Number(r.size ?? 0), mimeType: r.mime_type, createdAt: r.created_at };
  } catch (e) {
    log('error', reqId, 'storage_sign_failed', { path: r.object_key, message: e instanceof Error ? e.message : String(e) });
    return null;
  }
}));

return json(reqId, { productId, productName: product.name, ttlSeconds: SIGNED_URL_TTL_SECONDS, files: files.filter((f) => f !== null) }, 200);
```

- [ ] **Step 2: tsc + lint + verify + commit**

```bash
npx tsc --noEmit && npm run lint
```
Run `/verify`. Then:
```bash
git add "app/api/deliverables/[productId]/route.ts"
git commit -m "feat(api/deliverables): list from files table, sign via R2"
```

---

### Task 11: `/api/private/download` — drop KYC, sign via R2

**Files:**
- Modify: `app/api/private/download/route.ts`

- [ ] **Step 1: Restrict buckets to `creator-content` and sign via R2**

Change `VALID_BUCKETS` to `creator-content` only and swap the signer:
```ts
import { resolveBucket, storage } from '@/lib/storage';

type PrivateBucket = 'creator-content';
const VALID_BUCKETS: ReadonlySet<PrivateBucket> = new Set(['creator-content']);
// ... auth + ownership prefix check unchanged ...

const cfg = resolveBucket(bucket as PrivateBucket);
try {
  const signedUrl = await storage.createDownloadUrl({ bucket: cfg.name, objectKey: path, ttlSeconds: SIGNED_URL_TTL_SECONDS });
  return json(reqId, { bucket, path, signedUrl, ttlSeconds: SIGNED_URL_TTL_SECONDS }, 200);
} catch (e) {
  log('error', reqId, 'storage_sign_failed', { bucket, path, message: e instanceof Error ? e.message : String(e) });
  return json(reqId, { error: 'Failed to create download URL' }, 502);
}
```
Update the invalid-bucket message to "must be creator-content".

- [ ] **Step 2: tsc + lint + verify + commit**

```bash
npx tsc --noEmit && npm run lint
```
Run `/verify`. Then:
```bash
git add app/api/private/download/route.ts
git commit -m "feat(api/private/download): R2 signing, remove KYC bucket (write-only)"
```

---

### Task 12: `GET /api/admin/kyc/[creatorId]/download` — super_admin + audit log

**Files:**
- Create: `app/api/admin/kyc/[creatorId]/download/route.ts`

- [ ] **Step 1: Implement the admin KYC route**

```ts
// GET /api/admin/kyc/[creatorId]/download — the ONLY path that mints a KYC
// signed URL. super_admin only. Writes a kyc_access_log row on every mint.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isUuid } from '@/lib/upload-validators';
import { resolveBucket, storage } from '@/lib/storage';
import crypto from 'crypto';

const TTL = 600;
function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId, 'Cache-Control': 'no-store' } });
}

export async function GET(req: Request, { params }: { params: Promise<{ creatorId: string }> }) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const { creatorId } = await params;
    if (!isUuid(creatorId)) return json(reqId, { error: 'Invalid creatorId' }, 400);

    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) return json(reqId, { error: 'Unauthorized' }, 401);

    const serviceDb = createServiceClient();
    // Re-read the role from the DB (do not trust JWT metadata for an identity-doc action).
    const { data: pubUser } = await serviceDb.from('users').select('role').eq('auth_provider_id', user.id).maybeSingle();
    const isAdmin = pubUser?.role === 'super_admin' || user.app_metadata?.role === 'super_admin';
    if (!isAdmin) return json(reqId, { error: 'Forbidden' }, 403);

    const cfg = resolveBucket('creator-private');
    const { data: rows } = await serviceDb.from('storage_files').select('id, object_key, file_name, mime_type, created_at')
      .eq('owner_id', creatorId).eq('bucket', cfg.name).eq('kind', 'kyc').is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(50);
    if (!rows || rows.length === 0) return json(reqId, { error: 'No KYC documents found' }, 404);

    const files = await Promise.all(rows.map(async (r) => {
      const signedUrl = await storage.createDownloadUrl({ bucket: cfg.name, objectKey: r.object_key, ttlSeconds: TTL });
      await serviceDb.from('kyc_access_log').insert({
        admin_id: user.id, creator_id: creatorId, file_id: r.id, object_key: r.object_key,
      });
      return { name: r.file_name, signedUrl, mimeType: r.mime_type, createdAt: r.created_at };
    }));

    return json(reqId, { creatorId, ttlSeconds: TTL, files }, 200);
  } catch {
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
```

- [ ] **Step 2: tsc + lint + verify + commit**

```bash
npx tsc --noEmit && npm run lint
```
Run `/verify`. Then:
```bash
git add "app/api/admin/kyc/[creatorId]/download/route.ts"
git commit -m "feat(api/admin): super_admin KYC download with mandatory audit log"
```

---

### Task 13: Media Library rebuild — originals only, flat by kind, hard-cascade delete

**Files:**
- Create: `app/api/media/list/route.ts`
- Create: `app/api/media/delete/route.ts`
- Modify: `app/dashboard/media/page.tsx`

- [ ] **Step 1: Implement `app/api/media/list/route.ts`**

```ts
// GET /api/media/list — the creator's ORIGINAL media assets (digione-media,
// parent_file_id IS NULL), newest first. Derivatives are excluded (per-placement).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { resolveBucket, publicUrlFor } from '@/lib/storage';
import crypto from 'crypto';

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId, 'Cache-Control': 'no-store' } });
}

export async function GET(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) return json(reqId, { error: 'Unauthorized' }, 401);

    const serviceDb = createServiceClient();
    const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, user.id);
    if (!creatorId) return json(reqId, { error: 'Creator profile not found' }, 403);

    const cfg = resolveBucket('creator-public');
    const { data: rows } = await serviceDb.from('storage_files')
      .select('id, object_key, file_name, mime_type, size, kind, created_at')
      .eq('owner_id', creatorId).eq('bucket', cfg.name).is('parent_file_id', null).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(500);

    const files = (rows ?? []).map((r) => ({
      id: r.id, name: r.file_name, kind: r.kind, size: Number(r.size ?? 0),
      url: publicUrlFor('creator-public', r.object_key), createdAt: r.created_at,
    }));
    return json(reqId, { files }, 200);
  } catch {
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
```

- [ ] **Step 2: Implement `app/api/media/delete/route.ts`**

```ts
// POST /api/media/delete — hard cascade: removes the original + ALL its
// derivatives (R2 objects + rows). Caller is warned in the UI that placements
// referencing the derivatives will break.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { isUuid } from '@/lib/upload-validators';
import { hardDeleteCascade } from '@/lib/storage/files';
import crypto from 'crypto';

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId, 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) return json(reqId, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null) as { fileId?: unknown } | null;
    if (!body || !isUuid(body.fileId)) return json(reqId, { error: 'fileId required' }, 400);

    const serviceDb = createServiceClient();
    const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, user.id);
    if (!creatorId) return json(reqId, { error: 'Creator profile not found' }, 403);

    const { data: row } = await serviceDb.from('storage_files').select('id, owner_id').eq('id', body.fileId).maybeSingle();
    if (!row || row.owner_id !== creatorId) return json(reqId, { error: 'Not found' }, 404);

    const { removed } = await hardDeleteCascade(serviceDb, body.fileId);
    return json(reqId, { removed }, 200);
  } catch {
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
```

- [ ] **Step 3: Rebuild `app/dashboard/media/page.tsx`**

Replace the dead-`uploads`-bucket client logic with `/api/media/*`:
- Header comment → "Media Library — originals in digione-media via /api/media/*".
- Remove `BUCKET`, the folder taxonomy (`FOLDERS`, `folderFromKind`, `folderFromPath`) and all `supabase.storage.*` calls.
- `loadFiles`: `GET /api/media/list` → set `files` from `data.files` (each `{ id, name, kind, size, url, createdAt }`). Group/filter by `kind` for the sidebar instead of folders.
- `handleFiles` (upload): for each image, POST to `/api/media/upload` (multipart, `bucket: 'creator-public'`, `kind: 'other'`), then prepend the returned `{ fileId, publicUrl }` to `files`. Non-image files are out of scope for the media library now (images only); show an inline note if a non-image is dropped.
- `confirmDelete`: POST `/api/media/delete` `{ fileId }`. Replace the dialog copy with the **hard-cascade warning**: "Deleting this original also removes every cropped version derived from it. Any product cover, avatar, or banner using those crops will break." Show it as a `ConfirmDialog`-style destructive confirm.
- Keep the grid/list/preview/toast UI; just bind to the new shape (`file.id`, `file.url`, `file.kind`).

> This page predates the dashboard-design tokens refactor and uses raw `rounded-2xl`, `text-2xl font-bold`, etc. Keep this task scoped to the storage swap; a token/sizing cleanup is a separate follow-up (it was already flagged broken in todo-later 8).

- [ ] **Step 4: tsc + lint + manual + commit**

```bash
npx tsc --noEmit && npm run lint
```
Manual: open Media Library → originals load; upload an image → appears; delete → confirm dialog warns about cascade, deletion removes it. Then:
```bash
git add app/api/media/list/route.ts app/api/media/delete/route.ts app/dashboard/media/page.tsx
git commit -m "feat(media): rebuild Media Library on R2 files (originals, cascade delete)"
```

---

### Task 14: Docs sync + dev big-bang cutover

**Files:**
- Modify: `.claude/rules/api-routes.md`, `.claude/rules/env-vars.md`, `.claude/rules/supabase-reference.md`
- Modify: `.claude/todo-later/9(left)-2026-06-25-cloudflare-r2-storage-migration.md` → rename status tag

- [ ] **Step 1: Update the rule docs**

- `api-routes.md`: update the at-a-glance table and per-route sections for `/api/upload` (presigned, private only), add `/api/upload/confirm`, `/api/media/{upload,derive,resolve,list,delete}`, `/api/admin/kyc/[creatorId]/download`; change `/api/deliverables` + `/api/private/download` to R2 + `files`; note KYC is admin-only.
- `env-vars.md`: add the R2 section (the four bucket names, account id, the two secrets, the two public URLs) and mark the two secrets server-only.
- `supabase-reference.md`: replace the "Storage" section (Supabase buckets) with the R2 model (provider abstraction, repurposed `storage_files` table, quota = `storage_files` sum); note `sum_bucket_bytes_for_prefix` is retired and the dead file subsystem (`storage_file_usages`/`media_library`/`product_files`/`product_licenses`/`storage_provider_type`) was dropped.

- [ ] **Step 2: Flip the todo-later status**

```bash
git mv ".claude/todo-later/9(left)-2026-06-25-cloudflare-r2-storage-migration.md" ".claude/todo-later/9(done)-2026-06-25-cloudflare-r2-storage-migration.md"
```
Fix the two inline references to that path in `CLAUDE.md` (the deferred-work table) to the `(done)` name.

- [ ] **Step 3: Commit docs**

```bash
git add .claude/rules/api-routes.md .claude/rules/env-vars.md .claude/rules/supabase-reference.md CLAUDE.md ".claude/todo-later/9(done)-2026-06-25-cloudflare-r2-storage-migration.md"
git commit -m "docs(storage): sync rules + todo-later for R2 migration"
```

- [ ] **Step 4: Run the full dev cutover checklist**

1. Confirm `.env.local` has all R2 vars and the two public buckets have public access enabled in the R2 dashboard (use the r2.dev managed URL for dev if no custom domain yet — set `NEXT_PUBLIC_R2_MEDIA_URL`/`NEXT_PUBLIC_R2_BUCKET_PUBLIC_URL` to those).
2. `npm run dev`. Smoke each path:
   - **Cover image:** product editor → upload cover → renders as WebP from `digione-media`; a `files` row exists (original); re-open picker → preloads for re-crop; save again → new derivative, old derivative soft-deleted.
   - **Deliverable:** upload a product file (presigned PUT to `digione-products`) → `/api/upload/confirm` writes the `files` row with the true size; quota increments.
   - **Buyer download:** `/api/deliverables/[productId]` returns signed R2 URLs that download.
   - **Creator private download:** `/api/private/download` allows an owned `creator-content` file; **rejects any `creator-private`/KYC request** (400 invalid bucket).
   - **Admin KYC:** as a `super_admin`, `GET /api/admin/kyc/[creatorId]/download` returns a signed URL **and** writes a `kyc_access_log` row; as a non-admin → 403.
   - **Media Library:** lists originals only; delete shows the cascade warning and removes original + derivatives.
3. **Quota:** confirm `sumOwnerBytes` matches the sum of live `files.size` for the products bucket; over-quota → 413.
4. **Big-bang:** in the Supabase dashboard, delete the old Storage buckets (`public-asset`, `creator-public`, `creator-content`, `creator-private`); re-upload test assets through the new flows. (Optional: drop the `sum_bucket_bytes_for_prefix` RPC in a follow-up migration — it's now unused.)
5. Final gate: `npx tsc --noEmit && npm run lint && npm test`, then `/verify`.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore(storage): complete dev big-bang cutover to R2"
```

---

## Self-review

**Spec coverage:**
- 4 buckets + mapping → Task 1 (`buckets.ts`). ✅
- Storage abstraction (`createUploadUrl/createDownloadUrl/delete/sumBytes` + approved `putObject/headObject`) → Tasks 1,3,5. ✅
- `storage_files` table repurposed (drop dead subsystem + enum + creator_kyc URL cols; RLS owner-SELECT, service-write, partial unique, quota sum) + `parent_file_id`/`crop` → Task 4. ✅
- `kyc_access_log` mandatory + admin route → Tasks 4,12. ✅
- KYC removed from `/api/private/download` → Task 11. ✅
- sharp conversion → Task 2; image upload → Task 8. ✅
- Non-destructive materialized crop + re-crop + soft-delete on replace → Tasks 8,9. ✅
- Remove paste-URL → Task 9. ✅
- Media Library originals-only + hard-cascade delete → Task 13. ✅
- Route-by-route swaps (`/api/upload`, `/api/deliverables`, `/api/private/download`) → Tasks 6,10,11. ✅
- Types regen → Task 4. ✅
- Dev big-bang cutover checklist → Task 14. ✅
- Docs sync (Stop-hook drift) → Task 14. ✅

**Placeholder scan:** No TBD/TODO; every code step shows real code; manual-verification steps are explicit because the repo has no route/S3 test harness (stated in Testing strategy). The one judgment item left to the implementer is the optional `data.crop` zoom/aspect preset in the re-crop effect (Task 9, Step 3) — non-blocking polish, marked optional.

**Type consistency:** `StorageProvider` methods (`createUploadUrl/createDownloadUrl/putObject/headObject/delete`) are identical across `index.ts` (Task 3), `r2.ts` (Task 3), and all callers (Tasks 6-13). `LogicalBucket` union, `buildObjectKey` args, `parseCrop`/`Crop` shape, and `files` row fields (`owner_id/bucket/object_key/parent_file_id/crop`) match between the migration (Task 4), helpers (Task 5), and routes. `sumOwnerBytes` (the spec's `sumBytes`) is named consistently in Tasks 5,6.

**Known follow-ups (out of scope, noted not silently dropped):** drop the unused `sum_bucket_bytes_for_prefix` RPC; media-page token/sizing cleanup (todo-later 8); per-plan quota when `creator_subscriptions` lands; lifecycle rule to auto-expire `temp/` uploads; tighten `public-asset` creator-write.
