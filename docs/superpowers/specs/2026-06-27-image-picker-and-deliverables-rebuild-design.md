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

The crop drag re-render is now contained to `CropStage`. `CropStage` reports the final `croppedAreaPixels` to the shell via an `onConfirm(area)` / `onUseOriginal()` callback (the shell does the network calls). Local files become `URL.createObjectURL(file)` (revoked on unmount), not base64.

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
  3. `POST /api/upload/confirm { bucket: 'creator-content', objectKey, productId, kind: 'deliverable' }` → writes the `storage_files` row with the authoritative size
  - Per-file progress (use `XMLHttpRequest` for the PUT to get upload progress events; fetch has no upload progress). Drag-drop + file picker.
- **List** the product's deliverable files: name, size (formatted), uploaded date; **delete** a file.
- **Size tracking:** a used/quota bar — sum of listed file sizes vs the 1 GB `creator-content` quota constant. (Display only; the real gate stays server-side in `/api/upload`.) To avoid drift, extract the existing `CREATOR_CONTENT_QUOTA_BYTES` constant from `app/api/upload/route.ts` into a shared module (e.g. `src/lib/storage/quota.ts`) and import it in both `/api/upload` and the new files endpoint.
- **Add content link:** keep the existing `post_purchase_url` (delivery link) and `product_link` (preview/demo) fields, presented as the "deliver via link instead of / in addition to files" option. Existing save behavior via the product form's `patch()` is preserved.
- States: empty ("No files yet"), per-file progress/error, delete confirm, light+dark.

#### New endpoints (creator-side deliverable management — none exist today)

`app/api/products/[productId]/files/route.ts`:

- **`GET`** (cookie session) → lists the caller's own files for the product. Resolves `creatorId` (3-hop), verifies the product's `creator_id === creatorId`, returns live `storage_files` rows where `owner_id = creatorId AND bucket = digione-products AND product_id = productId AND deleted_at IS NULL`: `{ files: [{ id, name, size, mimeType, createdAt }], usedBytes, quotaBytes }`.
- **`DELETE`** (cookie session, body `{ fileId }`) → verifies the row belongs to the caller (`owner_id === creatorId`) and to this product, then `storage.delete()` the R2 object + soft-delete the row (`deleted_at`). Returns `{ ok: true }`. (Soft-delete keeps an audit trail and frees quota since the sum excludes `deleted_at`.)

Both follow the existing route conventions: `createClient`/`getUser` for auth, `createServiceClient` + `resolveCreatorIdFromAuthUserId` for the DB, `storage.*` for R2, `X-Request-ID`/`Cache-Control: no-store` headers, generic error messages.

#### Hooks (data-patterns convention — no raw fetch sprinkled in components)

New file `src/hooks/products/useProductFiles.ts`:
- `useProductFiles(productId)` → `{ files, usedBytes, quotaBytes, isLoading, uploadFiles, deleteFile, isUploading }`. Query key `['products','files', productId]`; mutations invalidate it.

New file `src/hooks/storage/useMyMedia.ts` (or colocate in `usePickerImages.ts`):
- `useMyMedia()` → `{ images, isLoading }` from `/api/media/list`. Query key `['media','list']`.

`StockPanel` keeps its direct `public_images` browser-client read (public RLS) — that is an existing, allowed pattern and infinite-scroll + cache logic is already written; it moves into the panel unchanged.

---

## Out of scope (YAGNI)

- No change to `storage_files` schema, RLS, or any `/api/media/*` / `/api/upload*` route behavior (component A reuses them as-is).
- No multi-file image cropping, no image filters/rotation UI beyond crop+zoom.
- No video/HLS, no Cloudflare Images.
- The buyer download flow (`/api/deliverables/[productId]`) is unchanged — this only adds the creator-side uploader that populates it.
- `react-easy-crop` stays the cropper (already a dependency); no new packages.

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

**Unchanged backend:** `src/lib/storage/*`, `/api/media/*`, `/api/upload`, `/api/upload/confirm`.
