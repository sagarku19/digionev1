---
noteId: "e71d0a40719211f19a5ba9a9f70f067a"
tags: []

---

# Image Picker + Deliverables Uploader — Rebuild Design

**Date:** 2026-06-27
**Status:** Approved (design)
**Scope:** Two creator-facing storage UI components, built on the just-shipped R2 storage layer (`src/lib/storage/*`, `/api/media/*`, `/api/upload*`). No changes to the storage backend, the `storage_files` schema, or revenue tables.

---

## Why

1. **The image picker lags.** `src/components/dashboard/ImagePickerModal.tsx` keeps `crop` and `zoom` in top-level component state. react-easy-crop fires `onCropChange`/`onZoomChange` on **every pointer-move frame**, so each drag re-renders the entire ~610-line modal (library grid, tabs, all panels), not just the cropper. Large uploads are also loaded as **base64 data URLs** (heavy for the cropper to decode). Result: janky cropping.
2. **The picker should reuse work.** Creators re-upload images they already have. A "your uploads" source removes that.
3. **The product Content Files tab is a placeholder.** It exposes only a post-purchase URL and a gallery; there is **no way to upload actual deliverable files** to `digione-products`. The purchase→download loop (`/api/deliverables/[productId]`) has nothing to serve until files exist. This builds the missing creator-side uploader.

---

## Components

### A. `ImagePickerModal` — premium ground-up rebuild

Replaces `src/components/dashboard/ImagePickerModal.tsx`. Same public props (back-compatible with all call sites):

```ts
export type ImagePickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
  bucket?: 'creator-public' | 'public-asset';
  kind?: string;          // cover | avatar | banner | linkinbio | gallery | other
  currentUrl?: string;    // existing placement value — enables re-crop
};
```

**File layout** (new folder `src/components/dashboard/image-picker/`):
- `ImagePickerModal.tsx` — shell + orchestration (the default export; the import path `@/components/dashboard/ImagePickerModal` is preserved via a re-export shim so existing call sites don't change).
- `CropStage.tsx` — isolated crop step (owns crop/zoom/aspect locally).
- `MyUploadsPanel.tsx`, `StockPanel.tsx`, `UploadPanel.tsx` — the three source panels.
- `usePickerImages.ts` — TanStack Query hooks for the panels (see Hooks).

> Re-export shim: keep `src/components/dashboard/ImagePickerModal.tsx` as `export { default } from './image-picker/ImagePickerModal'; export type { ImagePickerProps } from './image-picker/ImagePickerModal';` so no call site changes.

#### Architecture & the lag fix

| Unit | Owns | Re-renders when |
|---|---|---|
| `ImagePickerModal` (shell) | active tab, selected source (`{kind:'file',file}` \| `{kind:'fileId',id}` \| `{kind:'url',url}`), `uploading`, portal/scroll-lock/focus | tab/source/uploading change only |
| `CropStage` | `crop`, `zoom`, `aspectIdx` (**local** `useState`) | per-frame during a drag — but it's a small subtree |
| Source panels | their own query/loading state | their own data only |

The crop drag re-render is now contained to `CropStage`. **`CropStage` is source-agnostic** — its props are only `{ imageSrc: string; aspectPresets; onConfirm(croppedAreaPixels); onUseOriginal(); onBack() }`. It does NOT know whether the image came from upload / stock / my-uploads / re-crop. The **shell** resolves every source to a single `imageSrc` string before mounting `CropStage` (local file → `URL.createObjectURL`; stock → its https URL; my-upload original → its public URL; re-crop → the resolved `originalUrl`), and the shell remembers the source identity so it can call the right network action on confirm. This keeps `CropStage` purely presentational and reusable.

#### Three source tabs

1. **My Uploads** (`MyUploadsPanel`) — the creator's own image originals from `GET /api/media/list` (originals only, `parent_file_id IS NULL`). Clicking one selects source `{kind:'fileId', id}` and enters CropStage (or "Use Original" → the original's URL). No re-upload.
2. **DigiOne Stock** (`StockPanel`) — the existing `public_images` browse experience: debounced search, category chips, infinite scroll, the existing `localStorage` cache. Clicking selects `{kind:'url', url}`.
3. **New Upload** (`UploadPanel`) — dropzone + file picker. Selecting a file sets `{kind:'file', file}` and enters CropStage.

#### Data flow on confirm (unchanged API)

| Source | Crop & Add | Use Original |
|---|---|---|
| New file | `uploadOriginal(file)` → `derive({sourceFileId}, crop)` | `uploadOriginal(file)` → `publicUrl` |
| My upload (own original) | `derive({sourceFileId: id}, crop)` | the original's public URL |
| Stock URL | `derive({sourceUrl}, crop)` | the stock URL |
| Re-crop (`currentUrl`) | `GET /api/media/resolve` → load original + saved crop into CropStage; confirm passes `replacesFileId` | n/a |

`uploadOriginal` = `POST /api/media/upload` (multipart). `derive` = `POST /api/media/derive`. These already exist; **no API changes for component A.**

#### UX upgrades (all approved)

- **Paste from clipboard:** while `open`, a `window` `paste` listener picks the first image item → routes to Upload/CropStage.
- **Drag-drop anywhere:** the whole modal is a drop target with a full-modal "Drop image" overlay (not just the dropzone).
- **Bigger crop stage + live preview:** taller crop area; a small live thumbnail rendering the exact cropped region at the chosen aspect (canvas or CSS-clip of the source).
- **Keyboard:** Esc closes (or steps back from crop), Enter confirms crop, arrow keys nudge the crop position; visible `--focus-ring` on all controls.
- **A11y/robustness:** portal to body, body-scroll-lock while open, focus trap + return focus on close, `role="dialog"` + `aria-modal`.
- **States:** skeletons for grids, empty states, inline upload progress + error toasts.
- **Visual:** elevated editor-surface tokens (`--radius-xl`, `--shadow-card`/`--shadow-card-lg`) for a premium feel; dashboard color tokens (light+dark); lucide-only icons.

### B. `DeliverablesUploader` — product Content Files tab

New component `src/components/dashboard/products/DeliverablesUploader.tsx`, rendered in the `content` tab of `app/dashboard/products/[productId]/page.tsx` (replacing/augmenting the current placeholder; the gallery picker and SEO/other tabs are untouched).

#### Features

- **Upload files** (any type) for the product via the presigned path:
  1. `POST /api/upload { filename, bucket: 'creator-content', productId }` → `{ uploadUrl, bucket, objectKey }`
  2. `PUT uploadUrl` with the file bytes, `Content-Type: application/octet-stream` (matches what the URL was signed with)
  3. `POST /api/upload/confirm { bucket: 'creator-content', objectKey, productId, kind: 'deliverable', mimeType }` → writes the `storage_files` row with the authoritative size and the **client-supplied real MIME type**. (Fixes review finding I2: the presigned PUT is signed `application/octet-stream`, so `headObject` always returns octet-stream; storing the real `file.type` keeps `/api/deliverables` from labelling every PDF/ZIP as octet-stream. This needs a one-field change to `/api/upload/confirm` to accept and prefer `mimeType` when valid, falling back to the HEAD value.)
  - Per-file progress (use `XMLHttpRequest` for the PUT to get upload progress events; fetch has no upload progress). The PUT sends `Content-Type: application/octet-stream` to match the signed value (avoids R2 403). Drag-drop + file picker.
- **List** the product's deliverable files: name, size (formatted), uploaded date; **delete** a file.
- **Size tracking:** a used/quota bar — sum of listed file sizes vs the 1 GB `creator-content` quota constant. (Display only; the real gate stays server-side in `/api/upload`.) To avoid drift, extract the existing `CREATOR_CONTENT_QUOTA_BYTES` constant from `app/api/upload/route.ts` into a shared module (e.g. `src/lib/storage/quota.ts`) and import it in both `/api/upload` and the new files endpoint.
- **Add content link:** keep the existing `post_purchase_url` (delivery link) and `product_link` (preview/demo) fields, presented as the "deliver via link instead of / in addition to files" option. Existing save behavior via the product form's `patch()` is preserved.
- States: empty ("No files yet"), per-file progress/error, delete confirm, light+dark.

#### New endpoints (creator-side deliverable management — none exist today)

`app/api/products/[productId]/files/route.ts`:

- **`GET`** (cookie session) → lists the caller's own files for the product. Resolves `creatorId` (3-hop), verifies the product's `creator_id === creatorId`, returns live `storage_files` rows where `owner_id = creatorId AND bucket = digione-products AND product_id = productId AND deleted_at IS NULL`: `{ files: [{ id, name, size, mimeType, createdAt }], usedBytes, quotaBytes }`.
- **`DELETE`** (cookie session, body `{ fileId }`) → loads the row and verifies **all three bindings together** — `owner_id === creatorId` AND `product_id === productId` (the route param) AND `bucket === digione-products` — never trusting `fileId` alone. Then `storage.delete()` the R2 object + soft-delete the row via `softDelete(db, fileId, creatorId)`. Returns `{ ok: true }`. (Soft-delete keeps an audit trail and frees quota since the sum excludes `deleted_at`.) *(A more RESTful `DELETE /api/products/[productId]/files/[fileId]` is an acceptable alternative; the body form is fine and keeps it one route file.)*

Both follow the existing route conventions: `createClient`/`getUser` for auth, `createServiceClient` + `resolveCreatorIdFromAuthUserId` for the DB, `storage.*` for R2, `X-Request-ID`/`Cache-Control: no-store` headers, generic error messages.

#### Hooks (data-patterns convention — no raw fetch sprinkled in components)

New file `src/hooks/products/useProductFiles.ts`:
- `useProductFiles(productId)` → `{ files, usedBytes, quotaBytes, isLoading, uploadFiles, deleteFile, isUploading }`. Query key `['products','files', productId]`; mutations invalidate it.

New file `src/hooks/storage/useMyMedia.ts` (or colocate in `usePickerImages.ts`):
- `useMyMedia()` → `{ images, isLoading }` from `/api/media/list`. Query key `['media','list']`.

`StockPanel` keeps its direct `public_images` browser-client read (public RLS) — that is an existing, allowed pattern and infinite-scroll + cache logic is already written; it moves into the panel unchanged. Its cache/query key **must include category + search (+ page)** — e.g. `['stock', category, debouncedSearch, page]` — so filtering doesn't return stale cached results.

---

## Implementation Notes (operational details — must-do unless marked optional)

These came out of design review and are required for a production-grade result.

**Object-URL lifecycle.** Track the current object URL in a ref. When the user picks a new local file (A→B→C), **revoke the previous URL before creating the next** — not only on unmount. Revoke on modal close and on CropStage unmount too. One leaked `blob:` per swap otherwise.

**Upload cancellation.** Every in-flight request is cancellable: `AbortController` for the `fetch` calls (`/api/media/upload`, `/api/media/derive`, confirm) and `xhr.abort()` for the deliverable PUT (`XMLHttpRequest`). On modal close / route change, abort all in-flight transfers. While any deliverable upload is in-flight, attach a `beforeunload` handler that warns before leaving the page.

**Unsaved-changes guard (the review's must-add).** If the user tries to close the picker while in CropStage with an un-added crop, OR while an upload is in-flight, intercept and show a "Discard changes? — Keep editing / Discard" confirm instead of closing silently. `DeliverablesUploader` shows the same guard (and the `beforeunload` warning) during active uploads.

**Explicit React Query invalidation.** Do not rely on automatic refetch. After a media upload/derive that creates a `storage_files` row, invalidate `['media','list']`. After a deliverable upload or delete, invalidate `['products','files', productId]`. Mutations live in the hooks, which own the invalidations.

**Optimistic delete.** For both the deliverables list and the media library, remove the item from the UI immediately on delete and roll back if the request fails — smoother than waiting on the round-trip. (Soft-delete on the server already makes this safe.)

**Per-file error recovery.** A failed upload row shows **Retry / Remove** actions, not a generic "something went wrong" toast. Each file in a multi-file batch tracks its own status.

**Progress.** Per-file percentage; when more than one file uploads at once, also show an aggregate bar.

**M5 — explicit bucket props.** While touching the picker, add explicit `bucket="creator-public"` to the 5 existing call sites that currently rely on the default (`app/dashboard/sites/edit/main/[id]/page.tsx`, `sites/edit/linkinbio/[id]/page.tsx`, `SinglePageAppearanceEditor.tsx`, `BioAppearanceEditor.tsx`, `BioSetupWizard.tsx`) so intent is explicit.

**Performance (apply when the data warrants; otherwise skip — don't pre-optimize).**
- `React.memo` the three source panels so a shell re-render doesn't re-render idle panels.
- Lazy-load grid thumbnails (`loading="lazy"` is already used; add an `IntersectionObserver` only if needed).
- **Virtualize the My Uploads grid only if** a creator can exceed ~200 originals (the list route caps at 500). Use a light windowing approach; don't add a heavy dep.
- Optionally `createImageBitmap()` to decode large local files faster before crop, and start decoding the crop image the moment CropStage mounts so the transition feels instant.

## Out of scope (YAGNI)

- No change to `storage_files` schema, RLS, or any `/api/media/*` / `/api/upload*` route behavior (component A reuses them as-is).
- No multi-file image cropping, no image filters/rotation UI beyond crop+zoom.
- No video/HLS, no Cloudflare Images.
- The buyer download flow (`/api/deliverables/[productId]`) is unchanged — this only adds the creator-side uploader that populates it.
- `react-easy-crop` stays the cropper (already a dependency); no new packages.
- **No duplicate detection.** Re-uploading the same image/file creates a new object + row (acceptable for now). A checksum/`ETag` dedup is a future enhancement, not this round.

---

## Testing

- **Unit (Vitest):** a `formatBytes`/size-sum helper if extracted; the source-selection reducer logic in the shell if extracted to a pure function. (The heavy UI is verified manually — consistent with the repo's testing posture.)
- **Type/lint:** `npx tsc --noEmit` + `npm run lint` clean on all new/changed files.
- **Manual (dev, needs R2 creds):**
  - Picker: crop drag is smooth (no full-modal re-render — verify via React DevTools "highlight updates" that only CropStage flashes); each of the 3 tabs selects + crops + "Use Original"; re-crop loads the saved crop; paste, drag-anywhere, Esc/Enter/arrows all work; light+dark.
  - Deliverables: upload a file → appears with correct size, quota bar moves; delete removes it + frees quota; over-quota upload returns 413; add a content link saves.

---

## File summary

**New:**
- `src/components/dashboard/image-picker/{ImagePickerModal,CropStage,MyUploadsPanel,StockPanel,UploadPanel}.tsx`, `usePickerImages.ts`
- `src/components/dashboard/products/DeliverablesUploader.tsx`
- `app/api/products/[productId]/files/route.ts`
- `src/hooks/products/useProductFiles.ts`, `src/hooks/storage/useMyMedia.ts`

**Modified:**
- `src/components/dashboard/ImagePickerModal.tsx` → thin re-export shim
- `app/dashboard/products/[productId]/page.tsx` → render `DeliverablesUploader` in the content tab
- `app/api/upload/confirm/route.ts` → accept optional `mimeType` and store it (I2 fix)
- `app/api/upload/route.ts` + new `src/lib/storage/quota.ts` → extract the shared `CREATOR_CONTENT_QUOTA_BYTES`
- The 5 `ImagePickerModal` call sites listed under M5 → add explicit `bucket="creator-public"`

**Unchanged backend behavior:** `src/lib/storage/*` (except the new `quota.ts`), `/api/media/*`, `/api/upload` (signing unchanged).
