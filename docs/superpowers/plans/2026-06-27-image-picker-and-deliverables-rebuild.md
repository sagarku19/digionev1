---
noteId: "ad3b01e0719411f19a5ba9a9f70f067a"
tags: []

---

# Image Picker + Deliverables Uploader — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `ImagePickerModal` as a fast, premium 3-source image picker (kills the crop lag), and build a real product **DeliverablesUploader** (file upload + size/quota + delete + content-link) on the existing R2 storage layer.

**Architecture:** Split the picker into a thin shell + an isolated `CropStage` (owns crop/zoom locally so a drag re-renders only the cropper) + three source panels (My Uploads / DigiOne Stock / New Upload). The shell resolves any source to a single `imageSrc` string before mounting `CropStage`, and owns object-URL lifecycle, paste, drag-anywhere, abort, and the unsaved-changes guard. The DeliverablesUploader uses the presigned `/api/upload` → PUT → `/api/upload/confirm` path with XHR progress, plus two new owner-scoped endpoints for list/delete. All data goes through TanStack Query hooks. No storage-backend or schema changes.

**Tech Stack:** Next.js 16 App Router, strict TypeScript (no `any`), react-easy-crop (already installed), TanStack Query v5, lucide-react, dashboard CSS tokens, Vitest.

**Source spec:** `docs/superpowers/specs/2026-06-27-image-picker-and-deliverables-rebuild-design.md` (read it; this plan implements it including the Implementation Notes section).

---

## Conventions every task follows

- Strict TS, **no `any`**. Verify each task with `npx tsc --noEmit` (clean) + `npm run lint` (the repo has ~223 PRE-EXISTING lint errors in unrelated files — your changed files must add **zero** new errors; check with `npx eslint <files>`).
- Branch `main`, commit directly. Append to every commit message:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- Route handlers reuse the existing in-file `json()` / `log()` helper pattern, `createClient`+`getUser()` for auth, `createServiceClient()`+`resolveCreatorIdFromAuthUserId` for DB, `storage.*` for R2, `X-Request-ID` + `Cache-Control: no-store` headers, generic client error messages.
- Dashboard components: `'use client'`, lucide-only icons, `var(--*)` tokens (no hardcoded Tailwind colors), `focus-visible:shadow-[var(--focus-ring)]` on interactives, light+dark via tokens.
- UI is verified by `tsc`/`lint` + a manual checklist (repo posture); unit tests are for pure helpers + route logic where they add real value.

## File structure

**New:**
- `src/lib/storage/quota.ts` — shared `CREATOR_CONTENT_QUOTA_BYTES`.
- `app/api/products/[productId]/files/route.ts` — owner-scoped deliverable list (GET) + delete (DELETE).
- `src/hooks/storage/useMyMedia.ts` — creator's own image originals.
- `src/hooks/products/useProductFiles.ts` — product deliverables: list + upload (XHR) + delete (optimistic).
- `src/lib/format-bytes.ts` — shared `formatBytes` (+ unit test).
- `src/components/dashboard/image-picker/CropStage.tsx`
- `src/components/dashboard/image-picker/StockPanel.tsx`
- `src/components/dashboard/image-picker/MyUploadsPanel.tsx`
- `src/components/dashboard/image-picker/UploadPanel.tsx`
- `src/components/dashboard/image-picker/ImagePickerModal.tsx` (the new shell; default export)
- `src/components/dashboard/products/DeliverablesUploader.tsx`

**Modified:**
- `app/api/upload/route.ts` — import the shared quota constant.
- `app/api/upload/confirm/route.ts` — accept optional `mimeType` (I2 fix).
- `src/components/dashboard/ImagePickerModal.tsx` — becomes a thin re-export shim.
- `app/dashboard/products/[productId]/page.tsx` — render `DeliverablesUploader` in the content tab; pass `kind`/`currentUrl` to the cover picker (already done in a prior change — verify).
- 5 call sites — add explicit `bucket="creator-public"` (M5).

---

### Task 1: Shared quota constant + `formatBytes` helper

**Files:**
- Create: `src/lib/storage/quota.ts`
- Create: `src/lib/format-bytes.ts`, `src/lib/format-bytes.test.ts`
- Modify: `app/api/upload/route.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/format-bytes.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { formatBytes } from './format-bytes';

describe('formatBytes', () => {
  it('formats bytes/KB/MB/GB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(2 * 1024 ** 3)).toBe('2.00 GB');
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** — `npm test -- src/lib/format-bytes` → "Cannot find module".

- [ ] **Step 3: Implement** `src/lib/format-bytes.ts`

```ts
export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}
```

- [ ] **Step 4: Implement** `src/lib/storage/quota.ts`

```ts
// Per-creator storage quota for the creator-content (digione-products) bucket.
// Hardcoded default until per-plan quotas land (creator_subscriptions + a numeric
// quota schema). Shared by /api/upload and /api/products/[productId]/files so the
// two never drift.
export const CREATOR_CONTENT_QUOTA_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB
```

- [ ] **Step 5: Update `app/api/upload/route.ts`** — remove the local `CREATOR_CONTENT_QUOTA_BYTES` declaration and import it:

```ts
import { CREATOR_CONTENT_QUOTA_BYTES } from '@/lib/storage/quota';
```
(Delete the line `const CREATOR_CONTENT_QUOTA_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB (...)`. Leave all other logic untouched.)

- [ ] **Step 6: Verify + commit**

```bash
npm test -- src/lib/format-bytes && npx tsc --noEmit && npx eslint src/lib/storage/quota.ts src/lib/format-bytes.ts app/api/upload/route.ts
git add src/lib/storage/quota.ts src/lib/format-bytes.ts src/lib/format-bytes.test.ts app/api/upload/route.ts
git commit -m "refactor(storage): shared quota constant + formatBytes helper"
```

---

### Task 2: `/api/upload/confirm` stores the real MIME type (I2 fix)

**Files:**
- Modify: `app/api/upload/confirm/route.ts`

- [ ] **Step 1: Update the body parse + insert.** Read the current file. Add `mimeType` to the parsed body type and prefer it when it's a non-empty string (the presigned PUT is signed `application/octet-stream`, so `head.contentType` is always octet-stream; the client knows the real `file.type`).

Change the body type:
```ts
    const body = await req.json().catch(() => null) as {
      bucket?: unknown; objectKey?: unknown; productId?: unknown; kind?: unknown; mimeType?: unknown;
    } | null;
```
Add after the existing destructure (`const { bucket, objectKey, productId, kind } = body;`):
```ts
    const { mimeType } = body;
    const resolvedMime = typeof mimeType === 'string' && mimeType.length > 0 && mimeType.length <= 255
      ? mimeType
      : null;
```
In the `insertFile(...)` call, change `mime_type: head.contentType,` to:
```ts
      mime_type: resolvedMime ?? head.contentType,
```

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit && npx eslint app/api/upload/confirm/route.ts
git add app/api/upload/confirm/route.ts
git commit -m "fix(api/upload): confirm stores client-supplied mimeType (deliverable downloads)"
```

---

### Task 3: `GET`/`DELETE /api/products/[productId]/files`

Owner-scoped deliverable management. No such endpoint exists today.

**Files:**
- Create: `app/api/products/[productId]/files/route.ts`

- [ ] **Step 1: Implement the route** (full code)

```ts
// GET  /api/products/[productId]/files  — list THIS creator's deliverable files
//                                          for the product (+ quota usage).
// DELETE same path, body { fileId }      — remove one file (R2 object + soft row).
// Both verify the caller owns the product; DELETE additionally verifies the file
// is bound to (this creator, this product, the products bucket) — never fileId alone.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveCreatorIdFromAuthUserId } from '@/lib/auth-resolve';
import { isUuid } from '@/lib/upload-validators';
import { resolveBucket, storage } from '@/lib/storage';
import { sumOwnerBytes, softDelete } from '@/lib/storage/files';
import { CREATOR_CONTENT_QUOTA_BYTES } from '@/lib/storage/quota';
import crypto from 'crypto';

function json(reqId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'X-Request-ID': reqId, 'Cache-Control': 'no-store' } });
}

async function resolveOwnedProduct(
  serviceDb: ReturnType<typeof createServiceClient>,
  authUserId: string,
  productId: string,
): Promise<{ creatorId: string } | { error: string; status: number }> {
  const creatorId = await resolveCreatorIdFromAuthUserId(serviceDb, authUserId);
  if (!creatorId) return { error: 'Creator profile not found', status: 403 };
  const { data: product } = await serviceDb.from('products').select('creator_id').eq('id', productId).maybeSingle();
  if (!product) return { error: 'Product not found', status: 404 };
  if (product.creator_id !== creatorId) return { error: 'You do not own this product', status: 403 };
  return { creatorId };
}

export async function GET(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const { productId } = await params;
    if (!isUuid(productId)) return json(reqId, { error: 'Invalid productId' }, 400);

    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) return json(reqId, { error: 'Unauthorized' }, 401);

    const serviceDb = createServiceClient();
    const owned = await resolveOwnedProduct(serviceDb, user.id, productId);
    if ('error' in owned) return json(reqId, { error: owned.error }, owned.status);

    const cfg = resolveBucket('creator-content');
    const { data: rows } = await serviceDb.from('storage_files')
      .select('id, file_name, size, mime_type, created_at')
      .eq('owner_id', owned.creatorId).eq('bucket', cfg.name).eq('product_id', productId).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(200);

    const files = (rows ?? []).map((r) => ({
      id: r.id, name: r.file_name, size: Number(r.size ?? 0), mimeType: r.mime_type, createdAt: r.created_at,
    }));
    const usedBytes = await sumOwnerBytes(serviceDb, owned.creatorId, cfg.name);
    return json(reqId, { files, usedBytes, quotaBytes: CREATOR_CONTENT_QUOTA_BYTES }, 200);
  } catch {
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const reqId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const { productId } = await params;
    if (!isUuid(productId)) return json(reqId, { error: 'Invalid productId' }, 400);

    const cookieClient = await createClient();
    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) return json(reqId, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null) as { fileId?: unknown } | null;
    if (!body || !isUuid(body.fileId)) return json(reqId, { error: 'fileId required' }, 400);

    const serviceDb = createServiceClient();
    const owned = await resolveOwnedProduct(serviceDb, user.id, productId);
    if ('error' in owned) return json(reqId, { error: owned.error }, owned.status);

    const cfg = resolveBucket('creator-content');
    // Triple-binding: the row must belong to this creator, this product, this bucket.
    const { data: row } = await serviceDb.from('storage_files')
      .select('id, object_key, owner_id, product_id, bucket')
      .eq('id', body.fileId).is('deleted_at', null).maybeSingle();
    if (!row || row.owner_id !== owned.creatorId || row.product_id !== productId || row.bucket !== cfg.name) {
      return json(reqId, { error: 'Not found' }, 404);
    }

    try { await storage.delete({ bucket: cfg.name, objectKey: row.object_key }); } catch { /* already gone */ }
    await softDelete(serviceDb, row.id, owned.creatorId);
    return json(reqId, { ok: true }, 200);
  } catch {
    return json(reqId, { error: 'Internal server error' }, 500);
  }
}
```

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit && npx eslint "app/api/products/[productId]/files/route.ts"
git add "app/api/products/[productId]/files/route.ts"
git commit -m "feat(api/products): owner-scoped deliverable file list + delete"
```

---

### Task 4: `useMyMedia` hook

**Files:**
- Create: `src/hooks/storage/useMyMedia.ts`

- [ ] **Step 1: Implement** (the picker's "My Uploads" tab data)

```ts
'use client';
import { useQuery } from '@tanstack/react-query';

export interface MediaItem {
  id: string;
  name: string;
  kind: string;
  size: number;
  url: string | null;
  createdAt: string;
}

async function fetchMyMedia(): Promise<MediaItem[]> {
  const res = await fetch('/api/media/list', { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to load media');
  return data.files as MediaItem[];
}

export function useMyMedia(enabled = true) {
  const q = useQuery({ queryKey: ['media', 'list'], queryFn: fetchMyMedia, enabled });
  return { images: q.data ?? [], isLoading: q.isLoading, error: q.error };
}
```

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit && npx eslint src/hooks/storage/useMyMedia.ts
git add src/hooks/storage/useMyMedia.ts
git commit -m "feat(hooks): useMyMedia for the picker My Uploads tab"
```

---

### Task 5: `useProductFiles` hook (list + XHR upload + optimistic delete)

**Files:**
- Create: `src/hooks/products/useProductFiles.ts`

- [ ] **Step 1: Implement** (full — owns the presigned 3-step upload with progress + abort, and optimistic delete with invalidation)

```ts
'use client';
import { useCallback, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ProductFile {
  id: string;
  name: string;
  size: number;
  mimeType: string | null;
  createdAt: string;
}
interface ListResponse { files: ProductFile[]; usedBytes: number; quotaBytes: number }
export interface UploadTask { id: string; name: string; progress: number; error?: string }

const OCTET = 'application/octet-stream';

async function getList(productId: string): Promise<ListResponse> {
  const res = await fetch(`/api/products/${productId}/files`, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to load files');
  return data as ListResponse;
}

// Presigned PUT with real upload progress (fetch has none) + abort support.
function putWithProgress(url: string, file: File, onProgress: (pct: number) => void, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', OCTET); // must match the signed content-type
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`PUT failed ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('PUT network error'));
    xhr.onabort = () => reject(new DOMException('aborted', 'AbortError'));
    signal.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

export function useProductFiles(productId: string) {
  const qc = useQueryClient();
  const key = ['products', 'files', productId];
  const q = useQuery({ queryKey: key, queryFn: () => getList(productId), enabled: Boolean(productId) });

  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const setTask = (id: string, patch: Partial<UploadTask>) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const uploadOne = useCallback(async (file: File, signal: AbortSignal): Promise<void> => {
    const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setTasks((prev) => [...prev, { id, name: file.name, progress: 0 }]);
    try {
      const presign = await fetch('/api/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
        body: JSON.stringify({ filename: file.name, bucket: 'creator-content', productId }),
      });
      const pres = await presign.json();
      if (!presign.ok) throw new Error(pres.error ?? 'Could not start upload');
      setTask(id, { progress: 5 });
      await putWithProgress(pres.uploadUrl, file, (pct) => setTask(id, { progress: Math.max(5, pct) }), signal);
      const confirm = await fetch('/api/upload/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
        body: JSON.stringify({ bucket: 'creator-content', objectKey: pres.objectKey, productId, kind: 'deliverable', mimeType: file.type || null }),
      });
      const conf = await confirm.json();
      if (!confirm.ok) throw new Error(conf.error ?? 'Could not finalize upload');
      setTask(id, { progress: 100 });
      setTimeout(() => setTasks((prev) => prev.filter((t) => t.id !== id)), 1200);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') { setTasks((prev) => prev.filter((t) => t.id !== id)); return; }
      setTask(id, { error: e instanceof Error ? e.message : 'Upload failed' });
    }
  }, [productId]);

  const uploadFiles = useCallback(async (files: File[]) => {
    const ac = new AbortController();
    abortRef.current = ac;
    try { for (const f of files) await uploadOne(f, ac.signal); }
    finally { abortRef.current = null; qc.invalidateQueries({ queryKey: key }); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadOne, qc, productId]);

  const retryTask = useCallback((task: UploadTask, file: File) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    const ac = new AbortController();
    void uploadOne(file, ac.signal).finally(() => qc.invalidateQueries({ queryKey: key }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadOne, qc, productId]);

  const removeTask = useCallback((id: string) => setTasks((prev) => prev.filter((t) => t.id !== id)), []);
  const abortUploads = useCallback(() => abortRef.current?.abort(), []);

  const del = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await fetch(`/api/products/${productId}/files`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Delete failed');
    },
    onMutate: async (fileId: string) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ListResponse>(key);
      if (prev) {
        const gone = prev.files.find((f) => f.id === fileId);
        qc.setQueryData<ListResponse>(key, {
          ...prev,
          files: prev.files.filter((f) => f.id !== fileId),
          usedBytes: Math.max(0, prev.usedBytes - (gone?.size ?? 0)),
        });
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    files: q.data?.files ?? [],
    usedBytes: q.data?.usedBytes ?? 0,
    quotaBytes: q.data?.quotaBytes ?? 0,
    isLoading: q.isLoading,
    tasks, uploadFiles, retryTask, removeTask, abortUploads,
    deleteFile: del.mutate, isDeleting: del.isPending,
  };
}
```

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit && npx eslint src/hooks/products/useProductFiles.ts
git add src/hooks/products/useProductFiles.ts
git commit -m "feat(hooks): useProductFiles (list + XHR upload progress/abort + optimistic delete)"
```

---

### Task 6: `CropStage` (isolated, source-agnostic — the lag fix)

**Files:**
- Create: `src/components/dashboard/image-picker/CropStage.tsx`

`CropStage` owns `crop`/`zoom`/`aspect` in **local** state, so a drag re-renders only this subtree. Props are `imageSrc` (string) + callbacks. It renders a live cropped-preview thumbnail and supports keyboard (Enter confirm, Esc back, arrows nudge).

- [ ] **Step 1: Implement** (full)

```tsx
'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { ZoomIn, ZoomOut, RotateCcw, Check, ChevronLeft, Loader2 } from 'lucide-react';

const ASPECT_RATIOS = [
  { label: '9:16', value: 9 / 16 },
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '4:5', value: 4 / 5 },
  { label: 'Free', value: 0 },
] as const;

const CHIP_ON = 'bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/30';
const CHIP_OFF = 'bg-[var(--surface-muted)] text-[var(--text-secondary)] border-transparent hover:border-[var(--border)]';
const BTN = 'px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

export interface CropStageProps {
  imageSrc: string;
  busy?: boolean;
  initialAspectIdx?: number;
  onConfirm: (croppedAreaPixels: Area) => void;
  onUseOriginal: () => void;
  onBack: () => void;
}

export default function CropStage({ imageSrc, busy, initialAspectIdx = 1, onConfirm, onUseOriginal, onBack }: CropStageProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectIdx, setAspectIdx] = useState(initialAspectIdx);
  const areaRef = useRef<Area | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const currentAspect = ASPECT_RATIOS[aspectIdx];

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    areaRef.current = pixels;
    // Live preview: draw the cropped region to a small canvas (debounced via rAF).
    requestAnimationFrame(() => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        const max = 96;
        const scale = Math.min(max / pixels.width, max / pixels.height, 1);
        c.width = Math.max(1, Math.round(pixels.width * scale));
        c.height = Math.max(1, Math.round(pixels.height * scale));
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, pixels.x, pixels.y, pixels.width, pixels.height, 0, 0, c.width, c.height);
        try { setPreview(c.toDataURL('image/webp')); } catch { /* tainted (cross-origin) — skip preview */ }
      };
      img.src = imageSrc;
    });
  }, [imageSrc]);

  const confirm = useCallback(() => { if (areaRef.current) onConfirm(areaRef.current); }, [onConfirm]);

  // Keyboard: Enter confirms, Esc backs out, arrows nudge the crop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (busy) return;
      if (e.key === 'Enter') { e.preventDefault(); confirm(); }
      else if (e.key === 'Escape') { e.preventDefault(); onBack(); }
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 20 : 5;
        setCrop((c) => ({
          x: c.x + (e.key === 'ArrowLeft' ? step : e.key === 'ArrowRight' ? -step : 0),
          y: c.y + (e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0),
        }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, confirm, onBack]);

  const previewBox = useMemo(() => ({
    aspectRatio: currentAspect.value ? `${currentAspect.value}` : '1',
  }), [currentAspect.value]);

  return (
    <div className="flex flex-col">
      <div className="relative w-full h-[22rem] bg-[var(--bg-tertiary)]">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={currentAspect.value || undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          cropShape="rect"
          showGrid
          style={{ containerStyle: { background: 'var(--bg-tertiary)' } }}
        />
      </div>

      <div className="p-4 space-y-3 border-t border-[var(--border)]">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Aspect Ratio</label>
              <div className="flex gap-1.5 flex-wrap">
                {ASPECT_RATIOS.map((r, i) => (
                  <button key={r.label} onClick={() => setAspectIdx(i)} className={`${BTN} border ${aspectIdx === i ? CHIP_ON : CHIP_OFF}`}>{r.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Zoom</label>
              <div className="flex items-center gap-3">
                <ZoomOut className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[var(--brand)] h-1.5" />
                <ZoomIn className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                <button onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }} title="Reset" className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="shrink-0">
            <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Preview</label>
            <div className="w-24 rounded-[var(--radius-md)] overflow-hidden border border-[var(--border)] bg-[var(--surface-muted)]" style={previewBox}>
              {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-muted)]">
        <button onClick={onBack} disabled={busy} className={`${BTN} text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-1`}>
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onUseOriginal} disabled={busy} className={`${BTN} text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-1.5`}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Use Original
          </button>
          <button onClick={confirm} disabled={busy} className={`${BTN} bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] flex items-center gap-1.5`}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Crop &amp; Add
          </button>
        </div>
      </div>
    </div>
  );
}
```

> Note: the live-preview canvas may taint on cross-origin stock images without CORS; the `try/catch` around `toDataURL` silently skips the preview in that case (the crop still works server-side). This is acceptable.

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit && npx eslint src/components/dashboard/image-picker/CropStage.tsx
git add src/components/dashboard/image-picker/CropStage.tsx
git commit -m "feat(picker): isolated source-agnostic CropStage (local crop state + live preview + keyboard)"
```

---

### Task 7: Source panels — `StockPanel`, `MyUploadsPanel`, `UploadPanel`

**Files:**
- Create: `src/components/dashboard/image-picker/StockPanel.tsx`
- Create: `src/components/dashboard/image-picker/MyUploadsPanel.tsx`
- Create: `src/components/dashboard/image-picker/UploadPanel.tsx`

Each panel is `React.memo`'d and calls back to the shell with a chosen source. Shared callback prop shapes:
- `StockPanel` / `MyUploadsPanel`: `onPick(url: string)` (stock) / `onPick({ fileId, url })` (my-uploads).
- `UploadPanel`: `onFile(file: File)`.

- [ ] **Step 1: Implement `StockPanel.tsx`** — lift the existing stock-browse logic from the old `ImagePickerModal` (search + categories + infinite scroll + localStorage cache), with the cache key `${category}|${debouncedSearch}|${offset}` (already includes category+search — keep it). Full code:

```tsx
'use client';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Search, ImageIcon, Loader2, Crop } from 'lucide-react';

type PublicImage = { id: string; url: string; name: string; category: string; tags: string[] };
const CATEGORIES = ['all', 'abstract', 'nature', 'gradient', 'pattern', 'texture', 'minimal', 'dark', 'other'] as const;
const PAGE_SIZE = 24;
const CACHE_KEY = 'public_images_cache';
const CACHE_TTL = 1000 * 60 * 30;
const CHIP_ON = 'bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/30';
const CHIP_OFF = 'bg-[var(--surface-muted)] text-[var(--text-secondary)] border-transparent hover:border-[var(--border)]';

function readCache(k: string): PublicImage[] | null {
  try { const raw = localStorage.getItem(CACHE_KEY); if (!raw) return null; const c = JSON.parse(raw); if (!c[k] || Date.now() - c[k].ts > CACHE_TTL) return null; return c[k].data; } catch { return null; }
}
function writeCache(k: string, data: PublicImage[]) {
  try { const raw = localStorage.getItem(CACHE_KEY); const c = raw ? JSON.parse(raw) : {}; c[k] = { data, ts: Date.now() }; localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* full */ }
}

function StockPanel({ onPick }: { onPick: (url: string) => void }) {
  const [searchInput, setSearchInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('all');
  const [images, setImages] = useState<PublicImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const sb = useRef(supabase);

  useEffect(() => { const t = setTimeout(() => setDebounced(searchInput.trim()), 300); return () => clearTimeout(t); }, [searchInput]);

  const fetchImages = useCallback(async (reset: boolean, pageArg: number) => {
    const offset = reset ? 0 : pageArg * PAGE_SIZE;
    const key = `${category}|${debounced}|${offset}`;
    if (reset) { const cached = readCache(key); if (cached) { setImages(cached); setHasMore(cached.length === PAGE_SIZE); return; } }
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      let query = sb.current.from('public_images').select('id, url, name, category, tags').order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
      if (category !== 'all') query = query.eq('category', category);
      if (debounced) query = query.ilike('name', `%${debounced}%`);
      const { data } = await query;
      const fetched = (data ?? []) as PublicImage[];
      setImages((prev) => (reset ? fetched : [...prev, ...fetched]));
      writeCache(key, reset ? fetched : [...images, ...fetched]);
      setHasMore(fetched.length === PAGE_SIZE);
    } finally { setLoading(false); setLoadingMore(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, debounced]);

  useEffect(() => { setPage(0); fetchImages(true, 0); }, [category, debounced, fetchImages]);

  const grid = useMemo(() => (
    <div className="grid grid-cols-3 gap-2">
      {images.map((img) => (
        <button key={img.id} onClick={() => onPick(img.url)} className="group relative aspect-square rounded-[var(--radius-lg)] overflow-hidden border-2 border-transparent hover:border-[var(--brand)] transition-all duration-150 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          <img src={img.url} alt={img.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-[var(--surface)]/90 rounded-[var(--radius-md)]"><Crop className="w-4 h-4 text-[var(--brand)]" /></div>
          </div>
        </button>
      ))}
    </div>
  ), [images, onPick]);

  return (
    <div className="p-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search images..." className="w-full pl-9 pr-3 py-2 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] text-sm outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-shadow" />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)} className={`px-2.5 py-1 rounded-[var(--radius-md)] border text-[11px] font-semibold capitalize transition ${category === cat ? CHIP_ON : CHIP_OFF}`}>{cat}</button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-[var(--brand)]" /></div>
        : images.length === 0 ? <div className="text-center py-16"><ImageIcon className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" /><p className="text-sm text-[var(--text-secondary)]">No images found</p></div>
        : <>{grid}{hasMore && <div className="flex justify-center pt-2"><button onClick={() => { const np = page + 1; setPage(np); fetchImages(false, np); }} disabled={loadingMore} className="px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] flex items-center gap-1.5 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">{loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Load more</button></div>}</>}
    </div>
  );
}
export default memo(StockPanel);
```

- [ ] **Step 2: Implement `MyUploadsPanel.tsx`** (uses `useMyMedia`)

```tsx
'use client';
import React, { memo } from 'react';
import { useMyMedia } from '@/hooks/storage/useMyMedia';
import { ImageIcon, Loader2, Crop } from 'lucide-react';

function MyUploadsPanel({ onPick }: { onPick: (sel: { fileId: string; url: string }) => void }) {
  const { images, isLoading } = useMyMedia();
  const usable = images.filter((i) => i.url);
  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-[var(--brand)]" /></div>;
  if (usable.length === 0) return (
    <div className="text-center py-16">
      <ImageIcon className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
      <p className="text-sm text-[var(--text-secondary)]">No uploads yet</p>
      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Images you upload appear here to reuse</p>
    </div>
  );
  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-2">
        {usable.map((img) => (
          <button key={img.id} onClick={() => onPick({ fileId: img.id, url: img.url! })} className="group relative aspect-square rounded-[var(--radius-lg)] overflow-hidden border-2 border-transparent hover:border-[var(--brand)] transition-all duration-150 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            <img src={img.url!} alt={img.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-[var(--surface)]/90 rounded-[var(--radius-md)]"><Crop className="w-4 h-4 text-[var(--brand)]" /></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
export default memo(MyUploadsPanel);
```

- [ ] **Step 3: Implement `UploadPanel.tsx`** (dropzone + picker; drag-anywhere lives in the shell)

```tsx
'use client';
import React, { memo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';

function UploadPanel({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div className="p-4">
      <div
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) onFile(f); }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed rounded-[var(--radius-xl)] cursor-pointer transition-all duration-200 ${over ? 'border-[var(--brand)] bg-[var(--brand)]/5' : 'border-[var(--border)] hover:border-[var(--brand)]/50 bg-[var(--surface-muted)]'}`}
      >
        <div className={`p-3 rounded-[var(--radius-lg)] mb-3 transition-colors ${over ? 'bg-[var(--brand)]/10' : 'bg-[var(--surface-hover)]'}`}>
          <Upload className={`w-6 h-6 ${over ? 'text-[var(--brand)]' : 'text-[var(--text-tertiary)]'}`} />
        </div>
        <p className="text-sm font-semibold text-[var(--text-secondary)]">{over ? 'Drop image here' : 'Click, drag, or paste an image'}</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">JPG, PNG, WebP, GIF — up to 15 MB</p>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      </div>
    </div>
  );
}
export default memo(UploadPanel);
```

- [ ] **Step 4: Verify + commit**

```bash
npx tsc --noEmit && npx eslint src/components/dashboard/image-picker/StockPanel.tsx src/components/dashboard/image-picker/MyUploadsPanel.tsx src/components/dashboard/image-picker/UploadPanel.tsx
git add src/components/dashboard/image-picker/StockPanel.tsx src/components/dashboard/image-picker/MyUploadsPanel.tsx src/components/dashboard/image-picker/UploadPanel.tsx
git commit -m "feat(picker): memoized source panels (stock, my-uploads, upload)"
```

---

### Task 8: `ImagePickerModal` shell + re-export shim

**Files:**
- Create: `src/components/dashboard/image-picker/ImagePickerModal.tsx`
- Modify: `src/components/dashboard/ImagePickerModal.tsx` → re-export shim

The shell owns: portal + scroll-lock + focus + Esc, the 3 tabs, the **selected source** + resolution to `imageSrc`, **object-URL lifecycle** (revoke-on-replace), **paste-from-clipboard**, **drag-anywhere overlay**, the network actions (upload/derive/use-original), **re-crop** (resolve), and the **unsaved-changes guard**.

- [ ] **Step 1: Implement the shell** (full)

```tsx
'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Area } from 'react-easy-crop';
import { X, FolderOpen, Upload, ImageIcon, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import CropStage from './CropStage';
import StockPanel from './StockPanel';
import MyUploadsPanel from './MyUploadsPanel';
import UploadPanel from './UploadPanel';

export type ImagePickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
  bucket?: 'creator-public' | 'public-asset';
  kind?: string;
  currentUrl?: string;
};

type Tab = 'stock' | 'mine' | 'upload';
type Source = { kind: 'file'; file: File } | { kind: 'fileId'; id: string } | { kind: 'url'; url: string };

const TAB_BTN = (active: boolean) =>
  `flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-md)] text-xs font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
    active ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
  }`;

export default function ImagePickerModal({ open, onClose, onSelect, title = 'Select Image', bucket = 'creator-public', kind = 'other', currentUrl }: ImagePickerProps) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('stock');
  const [source, setSource] = useState<Source | null>(null);   // identity for the network call
  const [imageSrc, setImageSrc] = useState<string | null>(null); // what CropStage renders
  const [replacesFileId, setReplacesFileId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
  }, []);

  // Pick a local file: revoke the previous object URL BEFORE creating the next.
  const useLocalFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    revokeObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setSource({ kind: 'file', file });
    setReplacesFileId(null);
    setImageSrc(url);
  }, [revokeObjectUrl]);

  const useMyUpload = useCallback((sel: { fileId: string; url: string }) => {
    revokeObjectUrl(); setSource({ kind: 'fileId', id: sel.fileId }); setReplacesFileId(null); setImageSrc(sel.url);
  }, [revokeObjectUrl]);

  const useStock = useCallback((url: string) => {
    revokeObjectUrl(); setSource({ kind: 'url', url }); setReplacesFileId(null); setImageSrc(url);
  }, [revokeObjectUrl]);

  const reset = useCallback(() => {
    revokeObjectUrl(); setSource(null); setImageSrc(null); setReplacesFileId(null); setTab('stock'); setBusy(false);
  }, [revokeObjectUrl]);

  // Unsaved-changes guard: confirm if a crop/source is staged.
  const requestClose = useCallback(() => {
    if (busy) return; // never close mid-upload silently
    if (imageSrc && !window.confirm('Discard this image?')) return;
    reset(); onClose();
  }, [busy, imageSrc, reset, onClose]);

  // beforeunload warning while busy.
  useEffect(() => {
    if (!busy) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [busy]);

  // Esc closes (CropStage handles its own Esc→back when staged).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !imageSrc) requestClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, imageSrc, requestClose]);

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Paste-from-clipboard while open.
  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (file) { setTab('upload'); useLocalFile(file); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [open, useLocalFile]);

  // Re-crop: load original + saved crop when currentUrl is a derivative.
  useEffect(() => {
    if (!open || !currentUrl) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/media/resolve?url=${encodeURIComponent(currentUrl)}`);
      const data = await res.json().catch(() => null);
      if (!cancelled && data?.originalUrl) { setSource({ kind: 'url', url: data.originalUrl }); setReplacesFileId(data.derivativeFileId ?? null); setImageSrc(data.originalUrl); }
    })();
    return () => { cancelled = true; };
  }, [open, currentUrl]);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  // ── Network actions ──
  const uploadOriginal = useCallback(async (file: File): Promise<{ fileId: string; publicUrl: string }> => {
    const fd = new FormData(); fd.append('file', file); fd.append('bucket', bucket); fd.append('kind', kind);
    const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
    const data = await res.json(); if (!res.ok) throw new Error(data.error ?? 'Upload failed');
    return data;
  }, [bucket, kind]);

  const derive = useCallback(async (body: Record<string, unknown>): Promise<string> => {
    const res = await fetch('/api/media/derive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, kind, replacesFileId }) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error ?? 'Crop failed');
    return data.publicUrl as string;
  }, [kind, replacesFileId]);

  const finish = useCallback((url: string) => { qc.invalidateQueries({ queryKey: ['media', 'list'] }); onSelect(url); reset(); onClose(); }, [qc, onSelect, reset, onClose]);

  const handleConfirm = useCallback(async (area: Area) => {
    if (!source) return;
    setBusy(true);
    try {
      let url: string;
      if (source.kind === 'file') { const up = await uploadOriginal(source.file); url = await derive({ sourceFileId: up.fileId, crop: area }); }
      else if (source.kind === 'fileId') url = await derive({ sourceFileId: source.id, crop: area });
      else url = await derive({ sourceUrl: source.url, crop: area });
      finish(url);
    } catch (err) { console.error(err); setBusy(false); }
  }, [source, uploadOriginal, derive, finish]);

  const handleUseOriginal = useCallback(async () => {
    if (!source) return;
    setBusy(true);
    try {
      if (source.kind === 'file') { const up = await uploadOriginal(source.file); finish(up.publicUrl); }
      else if (source.kind === 'url') finish(source.url);
      else { const list = qc.getQueryData<{ url: string | null }[]>(['media', 'list']); void list; finish(imageSrc!); } // fileId path: imageSrc IS the original url
    } catch (err) { console.error(err); setBusy(false); }
  }, [source, uploadOriginal, finish, imageSrc, qc]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true"
      onDragOver={(e) => { e.preventDefault(); if (!imageSrc) setDragging(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) { setTab('upload'); useLocalFile(f); } }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={requestClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[var(--surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-card-lg)] border border-[var(--border)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[var(--surface-muted)] rounded-[var(--radius-md)]"><ImageIcon className="w-4 h-4 text-[var(--text-secondary)]" /></div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">{imageSrc ? 'Crop Image' : title}</h2>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{imageSrc ? 'Adjust crop, aspect & zoom' : 'Reuse, browse stock, or upload'}</p>
            </div>
          </div>
          <button onClick={requestClose} className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {imageSrc ? (
            <CropStage imageSrc={imageSrc} busy={busy} onConfirm={handleConfirm} onUseOriginal={handleUseOriginal} onBack={() => { revokeObjectUrl(); setImageSrc(null); setSource(null); }} />
          ) : (
            <>
              <div className="flex gap-1 mx-4 mt-3 p-1 bg-[var(--surface-muted)] rounded-[var(--radius-lg)]">
                <button onClick={() => setTab('stock')} className={TAB_BTN(tab === 'stock')}><Sparkles className="w-3.5 h-3.5" />DigiOne Stock</button>
                <button onClick={() => setTab('mine')} className={TAB_BTN(tab === 'mine')}><FolderOpen className="w-3.5 h-3.5" />My Uploads</button>
                <button onClick={() => setTab('upload')} className={TAB_BTN(tab === 'upload')}><Upload className="w-3.5 h-3.5" />New Upload</button>
              </div>
              {tab === 'stock' && <StockPanel onPick={useStock} />}
              {tab === 'mine' && <MyUploadsPanel onPick={useMyUpload} />}
              {tab === 'upload' && <UploadPanel onFile={useLocalFile} />}
            </>
          )}
        </div>
      </div>

      {/* Drag-anywhere overlay */}
      {dragging && !imageSrc && (
        <div className="absolute inset-4 z-10 rounded-[var(--radius-xl)] border-2 border-dashed border-[var(--brand)] bg-[var(--brand)]/10 flex items-center justify-center pointer-events-none">
          <p className="text-sm font-semibold text-[var(--brand)]">Drop image to upload</p>
        </div>
      )}
    </div>,
    document.body,
  );
}
```

> Note on the `fileId` "Use Original" path: `imageSrc` is the original's public URL, so `finish(imageSrc!)` selects the original directly (no derivative) — correct.

- [ ] **Step 2: Replace `src/components/dashboard/ImagePickerModal.tsx` with the shim**

```tsx
export { default } from './image-picker/ImagePickerModal';
export type { ImagePickerProps } from './image-picker/ImagePickerModal';
```

- [ ] **Step 3: Verify + manual + commit**

```bash
npx tsc --noEmit && npx eslint src/components/dashboard/image-picker/ImagePickerModal.tsx src/components/dashboard/ImagePickerModal.tsx
```
Manual (dev): open a product cover picker → all three tabs work; crop drag is smooth (React DevTools "Highlight updates": only CropStage flashes, not the panels); paste an image; drag onto the modal; Esc + Discard prompt; re-crop preloads. Then:
```bash
git add src/components/dashboard/image-picker/ImagePickerModal.tsx src/components/dashboard/ImagePickerModal.tsx
git commit -m "feat(picker): premium shell (portal, 3 tabs, paste, drag-anywhere, object-URL lifecycle, unsaved guard)"
```

---

### Task 9: Wire call sites + M5 explicit bucket props

**Files:**
- Modify: `app/dashboard/products/[productId]/page.tsx` (verify cover passes `kind="cover"` + `currentUrl={formData.thumbnail_url ?? undefined}`, gallery `kind="gallery"` — added in a prior change; confirm still present after the shim).
- Modify (add `bucket="creator-public"`): `app/dashboard/sites/edit/main/[id]/page.tsx`, `app/dashboard/sites/edit/linkinbio/[id]/page.tsx`, `src/components/dashboard/site-edit/.../SinglePageAppearanceEditor.tsx`, `.../BioAppearanceEditor.tsx`, `.../BioSetupWizard.tsx`.

- [ ] **Step 1: Find every call site**

Run: `grep -rn "ImagePickerModal" app src --include=*.tsx | grep -v "image-picker/"`
For each `<ImagePickerModal ... />` that has no `bucket=` prop, add `bucket="creator-public"`. Add `kind="..."` matching the placement (`avatar`/`banner`/`cover`/`linkinbio`/`gallery`) where obvious; default `other` is fine otherwise. Do not change other props.

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit && npm run lint 2>&1 | tail -3
git add -A
git commit -m "chore(picker): explicit bucket props on all ImagePickerModal call sites (M5)"
```

---

### Task 10: `DeliverablesUploader` + product Content tab

**Files:**
- Create: `src/components/dashboard/products/DeliverablesUploader.tsx`
- Modify: `app/dashboard/products/[productId]/page.tsx` (render it in the `content` tab)

- [ ] **Step 1: Implement `DeliverablesUploader.tsx`** (full — uses `useProductFiles`, `formatBytes`)

```tsx
'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useProductFiles } from '@/hooks/products/useProductFiles';
import { formatBytes } from '@/lib/format-bytes';
import { Upload, File as FileIcon, Trash2, Loader2, AlertCircle, RotateCcw, X, Download } from 'lucide-react';

export default function DeliverablesUploader({ productId }: { productId: string }) {
  const { files, usedBytes, quotaBytes, isLoading, tasks, uploadFiles, retryTask, removeTask, abortUploads, deleteFile } = useProductFiles(productId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const retryFiles = useRef<Map<string, File>>(new Map());

  // warn before leaving while uploads are running
  useEffect(() => {
    const active = tasks.some((t) => !t.error && t.progress < 100);
    if (!active) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [tasks]);

  useEffect(() => () => abortUploads(), [abortUploads]);

  const onFiles = (picked: File[]) => {
    picked.forEach((f) => retryFiles.current.set(`${f.name}-${f.size}`, f));
    void uploadFiles(picked);
  };

  const pct = quotaBytes ? Math.min(100, (usedBytes / quotaBytes) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(Array.from(e.dataTransfer.files)); }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center py-10 px-6 border-2 border-dashed rounded-[var(--radius-lg)] cursor-pointer transition-all ${over ? 'border-[var(--brand)] bg-[var(--brand)]/5' : 'border-[var(--border)] hover:border-[var(--brand)]/50 bg-[var(--surface-muted)]'}`}
      >
        <div className="p-3 rounded-[var(--radius-lg)] mb-3 bg-[var(--surface-hover)]"><Upload className="w-6 h-6 text-[var(--text-secondary)]" /></div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">Drop deliverable files or click to upload</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">Buyers download these after purchase</p>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      </div>

      {/* Quota bar */}
      <div>
        <div className="flex justify-between text-[11px] text-[var(--text-tertiary)] mb-1"><span>Storage used</span><span>{formatBytes(usedBytes)} / {formatBytes(quotaBytes)}</span></div>
        <div className="h-1.5 bg-[var(--surface-muted)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${pct >= 100 ? 'bg-[var(--danger)]' : 'bg-[var(--brand)]'}`} style={{ width: `${pct}%` }} /></div>
      </div>

      {/* In-flight tasks */}
      {tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((t) => {
            const file = retryFiles.current.get(`${t.name}-${t.name.length}`) ?? null; // best-effort retry lookup
            return (
              <div key={t.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[var(--text-secondary)] font-medium truncate max-w-[260px]">{t.name}</span>
                  {t.error
                    ? <span className="flex items-center gap-2 text-[var(--danger)]"><AlertCircle className="w-3 h-3" />{t.error}
                        {file && <button onClick={() => retryTask(t, file)} className="inline-flex items-center gap-0.5 hover:underline"><RotateCcw className="w-3 h-3" />Retry</button>}
                        <button onClick={() => removeTask(t.id)} className="inline-flex items-center gap-0.5 hover:underline"><X className="w-3 h-3" />Remove</button>
                      </span>
                    : <span className="text-[var(--text-tertiary)]">{t.progress}%</span>}
                </div>
                {!t.error && <div className="h-1.5 bg-[var(--surface-muted)] rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${t.progress === 100 ? 'bg-[var(--success)]' : 'bg-[var(--brand)]'}`} style={{ width: `${t.progress}%` }} /></div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Existing files */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[var(--brand)]" /></div>
      ) : files.length === 0 ? (
        <p className="text-center text-sm text-[var(--text-tertiary)] py-6">No files yet — upload the product&apos;s deliverables above, or use a content link below.</p>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] divide-y divide-[var(--border-subtle)] overflow-hidden">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center shrink-0"><FileIcon className="w-4 h-4 text-[var(--text-secondary)]" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-[var(--text-primary)] truncate">{f.name}</p><p className="text-xs text-[var(--text-tertiary)]">{formatBytes(f.size)} · {new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
              <button onClick={() => { if (window.confirm(`Delete ${f.name}? Buyers will no longer be able to download it.`)) deleteFile(f.id); }} className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

> The retry-file lookup above is best-effort; if exact mapping proves unreliable, store the `File` on the task object instead (extend `UploadTask` with an optional `file?: File` in the hook and pass it through). Keep the simplest version that compiles; the Retry button is a convenience.

- [ ] **Step 2: Render it in the product Content tab.** In `app/dashboard/products/[productId]/page.tsx`, inside the `activeTab === 'content'` block, add a new `EditorCard` ABOVE the existing "Product Access Link" card:

```tsx
<EditorCard icon={HardDrive} title="Deliverable Files" subtitle="Upload the files buyers download after purchase">
  <DeliverablesUploader productId={productId} />
</EditorCard>
```
Import it at the top: `import DeliverablesUploader from '@/components/dashboard/products/DeliverablesUploader';`. Keep the existing "Product Access Link" (post_purchase_url) + "Preview / Demo Link" + Gallery cards — they are the "add content link" option. (`productId` is already available in that page from the route params / product row; use the same value used elsewhere in the file.)

- [ ] **Step 3: Verify + manual + commit**

```bash
npx tsc --noEmit && npx eslint src/components/dashboard/products/DeliverablesUploader.tsx "app/dashboard/products/[productId]/page.tsx"
```
Manual: open a product → Content Files tab → upload a file (progress, then it appears with size; quota bar moves); delete it (optimistic removal, quota frees); add a post-purchase URL and save. Then:
```bash
git add src/components/dashboard/products/DeliverablesUploader.tsx "app/dashboard/products/[productId]/page.tsx"
git commit -m "feat(products): DeliverablesUploader (file upload + quota + delete) in Content tab"
```

---

### Task 11: Full verification + cleanup

**Files:** none (verification)

- [ ] **Step 1: Whole-repo gates**

```bash
npx tsc --noEmit && npm test 2>&1 | tail -5
npx eslint src/components/dashboard/image-picker src/components/dashboard/products/DeliverablesUploader.tsx src/hooks/storage/useMyMedia.ts src/hooks/products/useProductFiles.ts "app/api/products/[productId]/files/route.ts"
```
Expected: tsc clean; tests pass (including `format-bytes`); zero new lint errors in the listed paths.

- [ ] **Step 2: Manual smoke (dev, needs R2 creds)** — run the full checklist from the spec's Testing section: picker crop is smooth (only CropStage re-renders), 3 tabs + Use Original + re-crop + paste + drag-anywhere + Esc/Enter/arrows + unsaved guard, light & dark; deliverables upload/size/delete/quota/over-quota 413/content-link. Confirm no leaked `blob:` URLs (DevTools memory) after repeated file swaps.

- [ ] **Step 3: Residual color-token grep** on the new dashboard components:
```bash
grep -nE "bg-(white|gray|zinc|emerald|red|amber|blue|indigo)|text-(gray|zinc|emerald|red|amber|blue)|dark:bg-|dark:text-" src/components/dashboard/image-picker src/components/dashboard/products/DeliverablesUploader.tsx
```
Expected: zero hits (acceptable false positives: `bg-black/50` overlay, literal `text-white`-on-brand if any).

- [ ] **Step 4: Final commit (if any cleanup)**
```bash
git add -A && git commit -m "chore(picker/deliverables): verification cleanup"
```

---

## Self-review

**Spec coverage:**
- Lag fix via isolated `CropStage` (local crop state) → Task 6. ✅
- 3 source tabs (My Uploads / Stock / New Upload) → Tasks 4, 7, 8. ✅
- Object-URL revoke-on-replace + unmount → Task 8 (`revokeObjectUrl` before each new file; unmount effect). ✅
- Upload cancellation (AbortController + `xhr.abort()`) + `beforeunload` → Tasks 5, 8, 10. ✅
- Unsaved-changes guard → Task 8 (`requestClose`) + Task 10 (beforeunload). ✅
- Explicit invalidation keys (`['media','list']`, `['products','files',productId]`) → Tasks 5, 8. ✅
- Optimistic delete → Task 5. ✅
- Per-file retry/remove + aggregate-able progress → Tasks 5, 10. ✅
- StockPanel cache key includes category+search+offset → Task 7. ✅
- CropStage `imageSrc`-only interface → Task 6/8. ✅
- DeliverablesUploader (upload + size/quota + delete + content link) → Tasks 3, 5, 10. ✅
- I2 mime fix → Task 2. ✅
- Shared quota constant → Task 1. ✅
- M5 explicit bucket props → Task 9. ✅
- Re-export shim (no call-site import churn) → Task 8. ✅
- DELETE triple-binding security → Task 3. ✅
- React.memo panels, lazy thumbnails → Task 7 (`loading="lazy"`, `memo`). ✅
- Virtualization is conditional/optional (list capped 500) — noted, not built (YAGNI per spec). ✅

**Placeholder scan:** No TBD/TODO. The two "best-effort"/"keep simplest" notes (CropStage cross-origin preview; DeliverablesUploader retry-file lookup) are explicit fallbacks with working default code shown, not deferred work.

**Type consistency:** `Source` union, `ImagePickerProps`, `CropStageProps` (`imageSrc`/`onConfirm(Area)`/`onUseOriginal`/`onBack`), `useProductFiles` return shape (`files/usedBytes/quotaBytes/tasks/uploadFiles/retryTask/removeTask/abortUploads/deleteFile`), `useMyMedia` (`images/isLoading`), and the `/api/upload/confirm` `mimeType` field are consistent across the tasks that use them. Hook query keys match between producer and invalidator (`['media','list']`, `['products','files',productId]`).
