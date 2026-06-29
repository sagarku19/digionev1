# Dashboard Trash — Products & Sites

**Date:** 2026-06-29
**Status:** Approved (design)
**Surface:** Dashboard (`app/dashboard/products`, `app/dashboard/sites`, `src/components/dashboard/**`, `src/hooks/**`)
**Agent role:** Dashboard

---

## Summary

Add a **Trash** capability to the Products and Sites dashboard pages. Deleting an item from the list moves it to Trash (soft delete). A new **Trash** button beside the page's create button opens a drawer listing trashed items, where each can be **Restored** or **Deleted permanently** (hard DB delete, guarded).

No DB migration and no API route are required — both `products` and `sites` already have a `deleted_at` column and owner-scoped `_all_own` RLS policies (`FOR ALL`, so client-side `DELETE` is permitted).

---

## Motivation / current state

- `products.deleted_at` and `sites.deleted_at` already exist (`types/database.types.ts:1701`, `:2498`).
- `useProducts.deleteProduct` already soft-deletes (`deleted_at` + `is_published:false`), **but the list query does not filter `deleted_at IS NULL`** — so soft-deleted products currently still appear. This spec fixes that.
- `useSites.deleteSite` currently only sets `is_active:false`, conflating "delete" with "Unpublish." This spec repoints it to a real soft delete.
- The products grid has **no delete affordance today** (cards only have Edit / View). This spec adds one.

---

## Constraints discovered (drive the design)

### RLS
`products_all_own` and `sites_all_own` are `FOR ALL TO authenticated USING (creator_id = current_profile_id())`. Owner can UPDATE (soft delete / restore) and DELETE (permanent) their own rows from the browser client. No service-role route needed.

### Foreign keys on hard delete

**Products** (`products.id` referenced by):
| Referencing | On delete | Effect of hard-deleting the product |
|---|---|---|
| `order_items.product_id` | SET NULL | Order history preserved ✅ |
| `storage_files.product_id` | SET NULL | Deliverable files orphaned — `/api/deliverables/[productId]` returns nothing ❌ |
| `user_product_access.product_id` | **CASCADE** | Buyer access rows deleted — buyer loses the product ❌ |
| `site_singlepage.product_id` | **RESTRICT** | DELETE throws (23503) if product powers a Product Site |
| `product_files`, `user_carts`, `user_wishlist`, `creator_revenue_shares`, `upsell_pages.primary_product_id`, `linkinbio_analytics.product_id` | CASCADE | Removed with the product |
| `linkinbio_items.product_id` | SET NULL | Link kept, product detached |

**Consequence:** a product that **has buyers** must NOT be hard-deleted — doing so destroys their access and download path. Such a product stays archived in Trash (its row, `user_product_access`, and `storage_files` survive intact).

**Sites** (`sites.id` referenced by): `site_main`, `site_singlepage`, `linkinbio_pages`, `forms`, `guest_leads` → CASCADE; `order_items.site_id` → SET NULL; `sites.parent_site_id` → CASCADE (child sites). Hard delete is clean — children cascade, order history preserved. No buyer-content tie.

---

## Behavior

### Move to Trash (soft delete)
- Triggered from the list. Opens a light `ConfirmDialog` ("Move to Trash?" / non-destructive / "You can restore it from Trash later." / confirm "Move to Trash").
- Sets `deleted_at = now()`. Products also set `is_published:false`; sites also set `is_active:false`.
- Item leaves the main list, appears in the Trash drawer.

### Trash drawer
- Opened by a **Trash** button placed **before** the primary create button in the `PageHeader` action slot (wrap both in `flex items-center gap-2`). Button is secondary style with `Trash2` icon + a count badge when count > 0.
- Lists trashed items, newest-deleted first. Each row: title, "deleted {relative time}", **Restore** and **Delete permanently** actions. Empty → `EmptyState`.

### Restore
- Sets `deleted_at = null`. Item returns to the main list.
- Sites return as a **draft** (`is_active` stays false) — restore never auto-publishes.

### Delete permanently (hard delete)
- Opens `ConfirmDialog` (`isDestructive`, "Delete permanently?", confirm "Delete permanently").
- **Products** are guarded before/around the DB delete:
  1. If the product has completed purchases (count > 0 via the creator's own `order_items`→`orders`), **block**: "{n} customer(s) own this product, so it can't be permanently deleted. It stays archived so their downloads keep working."
  2. Attempt `DELETE`. On FK violation (Postgres `23503`, from `site_singlepage` RESTRICT), **block**: "This product powers a Product Site. Detach or delete that site first, then try again."
  3. Otherwise delete (order history preserved via SET NULL).
- **Sites** hard-delete directly (children cascade).
- Blocked-delete messaging: `ConfirmDialog.handleConfirm` always calls `onClose` after `onConfirm` (even when it throws), so a blocked delete cannot keep the dialog open. The page handler catches the thrown `Error` and surfaces its message as **drawer-level inline state** (an alert row near the top of the drawer body), not via the dialog.

---

## Data layer

### `src/hooks/products/useProducts.ts`
- **List query** (`['products','list']`): add `.is('deleted_at', null)`.
- **New** `['products','trash']` query: `.not('deleted_at','is',null).order('deleted_at',{ascending:false})`. Expose as `trashedProducts` + `isLoadingTrash`.
- `deleteProduct` (existing): keep as the Move-to-Trash soft delete.
- **New** `restoreProduct(id)`: `update({ deleted_at: null })`.
- **New** `permanentlyDeleteProduct(id)`:
  - Query completed purchases: `order_items` joined to `orders` (creator-owned, `status='completed'`) where `product_id = id`. If count > 0 → `throw new Error('{n} customer(s) own this product…')`.
  - `await supabase.from('products').delete().eq('id', id)`. If `error?.code === '23503'` → `throw new Error('This product powers a Product Site…')`; else if `error` → rethrow.
- All mutations `invalidateQueries({ queryKey: ['products'] })` (covers both `list` and `trash`).
- No `any`; reuse existing typed `ProductUpdate`.

### `src/hooks/sites/useSites.ts`
- **List query** (`['sites','list']`): add `.is('deleted_at', null)`.
- **Change** `deleteSite`: `update({ deleted_at: new Date().toISOString(), is_active: false })`.
- **New** `['sites','trash']` query: `.not('deleted_at','is',null).order('deleted_at',{ascending:false})`, scoped to the same resolved `profile.id`. Expose as `trashedSites` + `isLoadingTrash`.
- **New** `restoreSite(id)`: `update({ deleted_at: null })` (leaves `is_active` false → draft).
- **New** `permanentlyDeleteSite(id)`: `delete().eq('id', id)`.
- `toggleActive` (Publish/Unpublish) unchanged and kept separate from Trash.
- All mutations `invalidateQueries({ queryKey: ['sites'] })`.

---

## UI layer

### Shared component — `src/components/dashboard/TrashDrawer.tsx`
Generic, presentational, isolated. Props:

```ts
interface TrashItem { id: string; title: string; subtitle?: string; deletedAt: string | null; }
interface TrashDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;                       // e.g. "Trashed products"
  items: TrashItem[];
  isLoading: boolean;
  emptyLabel: string;
  onRestore: (id: string) => Promise<void>;
  onPermanentDelete: (id: string) => Promise<void>;  // may throw → drawer shows message
}
```

- Built on `SideDrawer` (`size="md"`).
- Renders rows; per-row Restore + Delete-permanently buttons (tokens, focus rings, lucide `RotateCcw` + `Trash2`).
- Holds `confirmTarget` state → renders one `ConfirmDialog` (destructive) for permanent delete.
- Holds `error` string state; on a thrown `onPermanentDelete`, catch and show an inline alert (`--danger-bg`/`--danger`) at top of the drawer body; clears on next action.
- Empty state via `EmptyState`.

### `app/dashboard/products/page.tsx`
- Header: wrap `action` in `flex items-center gap-2`; add Trash button (secondary recipe + `Trash2` + count badge from `trashedProducts.length`) before "Add Product". Mirror in the empty-state header if needed (Trash button only shown when trash count > 0).
- Product cards: add a **hover-revealed ghost `Trash2` icon button** at the cover's **top-left** (mirroring the existing status badge at top-right). `opacity-0 group-hover:opacity-100`, `e.stopPropagation()` so it doesn't open the product. Click → "Move to Trash?" `ConfirmDialog`.
- Wire `<TrashDrawer>` with `trashedProducts`, `restoreProduct`, `permanentlyDeleteProduct`.

### `app/dashboard/sites/page.tsx`
- Header: same Trash-button-before-create treatment (count from `trashedSites.length`).
- Repurpose the row More-menu "Delete" → opens "Move to Trash?" `ConfirmDialog` calling `deleteSite`. The existing type-the-name `DeleteModal` is removed (replaced by the lighter confirm for trashing; permanent delete lives in the drawer with its own destructive confirm).
- Wire `<TrashDrawer>` with `trashedSites`, `restoreSite`, `permanentlyDeleteSite`.

---

## Design-system compliance (`.claude/rules/dashboard-design.md`)
- CSS-variable tokens only — no hardcoded hex / Tailwind color names. Destructive uses `--danger`.
- Reach for primitives: `SideDrawer`, `ConfirmDialog`, `EmptyState`, `PageHeader`.
- `focus-visible:shadow-[var(--focus-ring)]` on every interactive element.
- `lucide-react` icons only (`Trash2`, `RotateCcw`).
- Works in light and dark via tokens (no `dark:` overrides).

## Other rules
- `data-patterns` / `hooks-reference`: all DB access via hooks; no raw Supabase in components; `[domain, kind, …]` query keys; no `useEffect` fetching.
- `anti-patterns`: no `any`, no `console.log`, no new packages.
- Touching dashboard pages → update `docs/reference/dashboard-map.md` in the same change-set (Stop hook `check-doc-drift.mjs` enforces).

---

## Out of scope (YAGNI)
- Bulk trash / multi-select.
- Auto-purge / retention windows.
- A global cross-entity trash page.
- Trash for any entity other than products and sites.
- Server-side permanent-delete route (RLS + FK analysis show it's unnecessary).

---

## Verification
1. `npx tsc --noEmit`
2. `npm run lint`
3. Manual (light + dark):
   - Move a product and a site to Trash → leave list, appear in drawer, count badge updates.
   - Restore both → return to list (site as draft).
   - Permanent-delete a product **with no buyers / not on a site** → row gone.
   - Permanent-delete a product **with buyers** → blocked with the archive message; row remains in trash; buyer's `/account/library` download still works.
   - Permanent-delete a product **attached to a Product Site** → blocked with the detach message.
   - Permanent-delete a site → gone, children cascade, related orders keep their history.
4. Update `docs/reference/dashboard-map.md`.

---

## Files touched
- `src/hooks/products/useProducts.ts`
- `src/hooks/sites/useSites.ts`
- `src/components/dashboard/TrashDrawer.tsx` (new)
- `app/dashboard/products/page.tsx`
- `app/dashboard/sites/page.tsx`
- `docs/reference/dashboard-map.md`

**Do not touch:** the `toggleActive`/Publish flow, any `/api/*` route, revenue tables, storefront/marketing files, `types/database.types.ts`, or anything outside the list above.
