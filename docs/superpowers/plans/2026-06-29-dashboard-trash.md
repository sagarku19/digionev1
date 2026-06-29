---
noteId: "b4ad18e073d411f193a7f790bf9449ed"
tags: []

---

# Dashboard Trash (Products & Sites) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Trash flow (move-to-trash, restore, guarded permanent delete) to the Products and Sites dashboard pages, using the existing `deleted_at` columns.

**Architecture:** Soft delete sets `deleted_at`; the main lists filter it out; a shared `TrashDrawer` lists trashed rows with Restore / Delete-permanently. Products with buyers or attached to a Product Site are blocked from permanent delete (kept archived). All DB access flows through the existing `useProducts` / `useSites` TanStack hooks (browser client + owner RLS). No migration, no API route.

**Tech Stack:** Next.js 16 App Router, TypeScript (strict), TanStack Query v5, Supabase browser client, Tailwind v4 tokens, lucide-react, framer-motion (via existing primitives).

**Testing note (read before starting):** This repo's verification is `npx tsc --noEmit` + `npm run lint` + manual click-through (`.claude/rules/verification.md`, CLAUDE.md). Vitest is deliberately sparse and runs `environment: 'node'` — there is no jsdom/React-Testing-Library or Supabase-client mock harness, and adding one is out of scope. Per the project's instruction priority, these tasks use tsc/lint/manual gates instead of forced unit tests. Spec: `docs/superpowers/specs/2026-06-29-dashboard-trash-design.md`.

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `src/hooks/products/useProducts.ts` | Product data + mutations | Modify: filter list, add trash query + restore + guarded permanent delete |
| `src/hooks/sites/useSites.ts` | Site data + mutations | Modify: filter list, repoint delete to soft-trash, add trash query + restore + permanent delete |
| `src/components/dashboard/TrashDrawer.tsx` | Reusable trash drawer UI | Create |
| `app/dashboard/products/page.tsx` | Products list page | Modify: header Trash button, hover trash icon on cards, move-to-trash confirm, wire drawer |
| `app/dashboard/sites/page.tsx` | Sites list page | Modify: header Trash button, repurpose menu Delete → move-to-trash confirm, remove type-name DeleteModal, wire drawer |
| `docs/reference/dashboard-map.md` | Dashboard route/component map | Modify: update products + sites rows (Stop-hook enforced) |

---

## Task 1: Extend `useProducts` — filter list, trash query, restore, guarded permanent delete

**Files:**
- Modify: `src/hooks/products/useProducts.ts`

- [ ] **Step 1: Filter soft-deleted rows out of the main list**

In the `['products','list']` query's `.select('*')` chain, add a `deleted_at IS NULL` filter. Change:

```ts
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('creator_id', profileId)
          .order('created_at', { ascending: false });
```

to:

```ts
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('creator_id', profileId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
```

- [ ] **Step 2: Add the trash query**

Immediately after the existing `useQuery` for the list (after its closing `});`), add:

```ts
  const { data: trashedProducts = [], isLoading: isLoadingTrash } = useQuery({
    queryKey: ['products', 'trash'],
    queryFn: async () => {
      const profileId = await getCreatorProfileId();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('creator_id', profileId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
```

- [ ] **Step 3: Add restore + guarded permanent-delete mutations**

After the existing `deleteMutation` (the soft-delete) and before the final `return {`, add:

```ts
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: null })
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      revalidateStorefrontPaths(['/', '/dashboard/products']);
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const profileId = await getCreatorProfileId();

      // Guard: never destroy a product someone has already bought — its row,
      // user_product_access grants, and deliverable files must survive.
      const { count, error: countError } = await supabase
        .from('order_items')
        .select('id, orders!inner(creator_id, status)', { count: 'exact', head: true })
        .eq('product_id', id)
        .eq('orders.creator_id', profileId)
        .eq('orders.status', 'completed');
      if (countError) throw countError;
      if ((count ?? 0) > 0) {
        throw new Error(
          `${count} customer${count === 1 ? '' : 's'} own this product, so it can't be permanently deleted. It stays archived in Trash so their downloads keep working.`,
        );
      }

      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        if (error.code === '23503') {
          throw new Error('This product powers a Product Site. Detach or delete that Product Site first, then try again.');
        }
        throw error;
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      revalidateStorefrontPaths(['/', '/dashboard/products']);
    },
  });
```

- [ ] **Step 4: Export the new values**

Replace the `return { … }` block at the end of `useProducts` with:

```ts
  return {
    products,
    trashedProducts,
    isLoading,
    isLoadingTrash,
    error,
    createProduct: createMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync,
    deleteProduct: deleteMutation.mutateAsync,
    restoreProduct: restoreMutation.mutateAsync,
    permanentlyDeleteProduct: permanentDeleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). If the embedded filter `orders!inner(...)` produces a type complaint, the `order_items`→`orders` relationship name is correct (FK `fk_oi_product` is to products; the order FK is `order_items.order_id`); keep `orders!inner` — it resolves by table name.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/products/useProducts.ts
git commit -m "feat(products): trash query + restore + guarded permanent delete"
```

---

## Task 2: Extend `useSites` — filter list, soft-trash delete, trash query, restore, permanent delete

**Files:**
- Modify: `src/hooks/sites/useSites.ts`

- [ ] **Step 1: Import the profile resolver**

At the top, below the existing imports, add:

```ts
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
```

- [ ] **Step 2: Filter soft-deleted rows out of the list query**

In the `['sites','list']` query, add `.is('deleted_at', null)` before `.order('created_at', …)`:

```ts
        .eq('creator_id', profile.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
```

- [ ] **Step 3: Add the trash query**

Immediately after the list `useQuery` closing `});`, add (mirrors the list select so the drawer can compute titles):

```ts
  const { data: trashedSites = [], isLoading: isLoadingTrash } = useQuery<SiteWithMain[]>({
    queryKey: ['sites', 'trash'],
    queryFn: async () => {
      const profileId = await getCreatorProfileId();
      const { data, error } = await supabase
        .from('sites')
        .select(`
          id, slug, child_slug, parent_site_id, creator_id, site_type, is_active, custom_domain, ssl_status, created_at,
          site_main(title, banner_url, logo_url, meta_description),
          site_singlepage(title),
          linkinbio_pages(display_name),
          parent_site:sites(slug)
        `)
        .eq('creator_id', profileId)
        .not('deleted_at', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as SiteWithMain[]) ?? [];
    },
  });
```

- [ ] **Step 4: Repoint `deleteSite` to a real soft-trash**

Change the `deleteMutation` body from `update({ is_active: false })` to set `deleted_at` too:

```ts
  const deleteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const { error } = await supabase
        .from('sites')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', siteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sites'] }),
  });
```

(Note: `onSuccess` invalidates the whole `['sites']` domain so both list and trash refresh.)

- [ ] **Step 5: Add restore + permanent-delete mutations**

After `toggleActiveMutation` and before the `return {`, add:

```ts
  const restoreMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const { error } = await supabase
        .from('sites')
        .update({ deleted_at: null })
        .eq('id', siteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sites'] }),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const { error } = await supabase.from('sites').delete().eq('id', siteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sites'] }),
  });
```

- [ ] **Step 6: Export the new values**

Replace the final `return { … }` with:

```ts
  return {
    sites,
    trashedSites,
    isLoading,
    isLoadingTrash,
    error,
    deleteSite: deleteMutation.mutateAsync,
    restoreSite: restoreMutation.mutateAsync,
    permanentlyDeleteSite: permanentDeleteMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
  };
```

- [ ] **Step 7: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add src/hooks/sites/useSites.ts
git commit -m "feat(sites): soft-trash delete + trash query + restore + permanent delete"
```

---

## Task 3: Create the shared `TrashDrawer` component

**Files:**
- Create: `src/components/dashboard/TrashDrawer.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/dashboard/TrashDrawer.tsx` with exactly:

```tsx
'use client';

import { useState } from 'react';
import { RotateCcw, Trash2, Package } from 'lucide-react';
import { SideDrawer } from '@/components/ui/SideDrawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';

export interface TrashItem {
  id: string;
  title: string;
  subtitle?: string;
  deletedAt: string | null;
}

interface TrashDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: TrashItem[];
  isLoading: boolean;
  emptyLabel: string;
  onRestore: (id: string) => Promise<unknown>;
  onPermanentDelete: (id: string) => Promise<unknown>;
}

export function TrashDrawer({
  isOpen, onClose, title, items, isLoading, emptyLabel, onRestore, onPermanentDelete,
}: TrashDrawerProps) {
  const [confirmTarget, setConfirmTarget] = useState<TrashItem | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const handleRestore = async (id: string) => {
    setError('');
    setBusyId(id);
    try { await onRestore(id); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to restore.'); }
    finally { setBusyId(null); }
  };

  const handlePermanentDelete = async () => {
    if (!confirmTarget) return;
    const id = confirmTarget.id;
    setError('');
    setBusyId(id);
    try { await onPermanentDelete(id); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete.'); }
    finally { setBusyId(null); }
  };

  return (
    <SideDrawer isOpen={isOpen} onClose={onClose} title={title} size="md">
      {error && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--danger)]/20 bg-[var(--danger-bg)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Trash2} title={emptyLabel} description="Items you move to Trash will show up here." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-tertiary)]">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                <p className="truncate text-xs text-[var(--text-tertiary)]">
                  {item.subtitle ? `${item.subtitle} · ` : ''}Deleted {fmt(item.deletedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => handleRestore(item.id)}
                  disabled={busyId === item.id}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                </button>
                <button
                  onClick={() => { setError(''); setConfirmTarget(item); }}
                  disabled={busyId === item.id}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-bg)] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handlePermanentDelete}
        title="Delete permanently?"
        description={`"${confirmTarget?.title ?? ''}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete permanently"
        cancelLabel="Cancel"
        isDestructive
      />
    </SideDrawer>
  );
}
```

Note: `onRestore`/`onPermanentDelete` are typed `Promise<unknown>` so the hooks' `mutateAsync` (which resolves the id/void) passes directly. `ConfirmDialog` closes itself after `onConfirm`, so a blocked permanent delete surfaces via the drawer's `error` banner — that's intended.

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add src/components/dashboard/TrashDrawer.tsx
git commit -m "feat(dashboard): reusable TrashDrawer component"
```

---

## Task 4: Wire Trash into the Products page

**Files:**
- Modify: `app/dashboard/products/page.tsx`

- [ ] **Step 1: Update imports**

Change the hook destructure import line and icon/primitive imports.

In the lucide import, add `Trash2`:

```ts
import {
  Plus, Package, FileText, Tag, BookOpen, Search, Edit3, Eye, ImageIcon, Filter, Trash2,
} from 'lucide-react';
```

Add two imports after the `CreateProductModal` import:

```ts
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TrashDrawer, TrashItem } from '@/components/dashboard/TrashDrawer';
```

- [ ] **Step 2: Pull the new hook values**

Change:

```ts
  const { products, isLoading, createProduct, isCreating } = useProducts();
```

to:

```ts
  const {
    products, trashedProducts, isLoading, isLoadingTrash, createProduct, isCreating,
    deleteProduct, restoreProduct, permanentlyDeleteProduct,
  } = useProducts();
```

- [ ] **Step 3: Add Trash UI state**

After the existing `const [createError, setCreateError] = useState('');` line, add:

```ts
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashTarget, setTrashTarget] = useState<{ id: string; name: string } | null>(null);

  const trashItems: TrashItem[] = trashedProducts.map((p) => ({
    id: p.id,
    title: p.name ?? 'Untitled',
    subtitle: p.category ?? undefined,
    deletedAt: p.deleted_at,
  }));
```

- [ ] **Step 4: Replace the header action with Trash + Add**

Replace the `addProductButton` constant with a combined actions block:

```tsx
  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setTrashOpen(true)}
        className="inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <Trash2 className="h-4 w-4" />
        Trash
        {trashedProducts.length > 0 && (
          <span className="rounded-full bg-[var(--surface-hover)] px-1.5 py-0.5 text-xs font-bold text-[var(--text-secondary)]">
            {trashedProducts.length}
          </span>
        )}
      </button>
      <button
        onClick={openModal}
        className="inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-[var(--text-on-brand)] shadow-[var(--shadow-xs)] transition hover:bg-[var(--brand-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <Plus className="h-4 w-4" />
        Add Product
      </button>
    </div>
  );
```

Then change the `<PageHeader … action={addProductButton} />` prop to `action={headerActions}`.

- [ ] **Step 5: Add the hover trash icon to product cards**

Inside the product card, locate the status-badge block:

```tsx
                  <div className="absolute right-3 top-3">
                    <span className={`rounded-full border px-3 py-1.5 ...
```

Immediately BEFORE that `<div className="absolute right-3 top-3">`, add a top-left hover trash button:

```tsx
                  <button
                    onClick={(e) => { e.stopPropagation(); setTrashTarget({ id: product.id, name: product.name ?? 'this product' }); }}
                    className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]/90 text-[var(--text-secondary)] opacity-0 shadow-[var(--shadow-xs)] backdrop-blur transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    title="Move to Trash"
                    aria-label="Move to Trash"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
```

- [ ] **Step 6: Render the move-to-trash confirm + the drawer**

Just before the closing `</div>` of the page's outer `<div className="space-y-6 pb-12">` (i.e. right after the `{modal && ( … )}` block), add:

```tsx
      <ConfirmDialog
        isOpen={!!trashTarget}
        onClose={() => setTrashTarget(null)}
        onConfirm={async () => { if (trashTarget) await deleteProduct(trashTarget.id); }}
        title="Move to Trash?"
        description={`"${trashTarget?.name ?? ''}" will be moved to Trash. You can restore it from Trash later.`}
        confirmLabel="Move to Trash"
        cancelLabel="Cancel"
      />

      <TrashDrawer
        isOpen={trashOpen}
        onClose={() => setTrashOpen(false)}
        title="Trashed products"
        items={trashItems}
        isLoading={isLoadingTrash}
        emptyLabel="Trash is empty"
        onRestore={restoreProduct}
        onPermanentDelete={permanentlyDeleteProduct}
      />
```

- [ ] **Step 7: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: PASS.
Run: `npm run lint`
Expected: no new errors for `app/dashboard/products/page.tsx`.

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/products/page.tsx
git commit -m "feat(products): trash button, hover move-to-trash, trash drawer"
```

---

## Task 5: Wire Trash into the Sites page

**Files:**
- Modify: `app/dashboard/sites/page.tsx`

- [ ] **Step 1: Update imports**

In the lucide import block, `Trash2`, `X`, `AlertTriangle` are already imported. Add the new primitives after the `PageHeader` import:

```ts
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TrashDrawer, TrashItem } from '@/components/dashboard/TrashDrawer';
```

- [ ] **Step 2: Remove the in-file `DeleteModal` component**

Delete the entire `function DeleteModal({ … }) { … }` block (the `// ─── Delete Confirmation Modal ───` section). It is replaced by `ConfirmDialog`. Leave `AlertTriangle`/`X` imports — they are still used elsewhere in the file (if lint flags them as unused after removal, drop them from the import in this step).

- [ ] **Step 3: Add a site-title helper**

Just above `export default function SitesPage()`, add:

```tsx
function siteTitle(site: SiteWithMain): string {
  const sm = Array.isArray(site.site_main) ? site.site_main[0] : site.site_main;
  const sp = Array.isArray(site.site_singlepage) ? site.site_singlepage[0] : site.site_singlepage;
  const sl = Array.isArray(site.linkinbio_pages) ? site.linkinbio_pages[0] : site.linkinbio_pages;
  return sm?.title ?? sp?.title ?? sl?.display_name ?? site.slug ?? 'Untitled';
}
```

- [ ] **Step 4: Pull new hook values + trash state**

Change:

```ts
  const { sites, isLoading, deleteSite, toggleActive } = useSites();
  const [activeFilter, setActiveFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
```

to:

```ts
  const {
    sites, trashedSites, isLoading, isLoadingTrash,
    deleteSite, restoreSite, permanentlyDeleteSite, toggleActive,
  } = useSites();
  const [activeFilter, setActiveFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);

  const trashItems: TrashItem[] = trashedSites.map((s) => ({
    id: s.id,
    title: siteTitle(s),
    subtitle: s.site_type,
    deletedAt: (s as { deleted_at?: string | null }).deleted_at ?? null,
  }));
```

(Note: `SiteWithMain` does not declare `deleted_at`; cast inline as shown. Do NOT edit the `SiteWithMain` type.)

- [ ] **Step 5: Add the Trash button before "Create New Site"**

Replace the `PageHeader` `action={ <button …>Create New Site</button> }` with a wrapped pair:

```tsx
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTrashOpen(true)}
                className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <Trash2 className="w-4 h-4" />
                Trash
                {trashedSites.length > 0 && (
                  <span className="rounded-full bg-[var(--surface-hover)] px-1.5 py-0.5 text-xs font-bold text-[var(--text-secondary)]">
                    {trashedSites.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => router.push('/dashboard/sites/new')}
                className="inline-flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-3 py-2 rounded-[var(--radius-sm)] font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <Plus className="w-4 h-4" />
                Create New Site
              </button>
            </div>
          }
```

- [ ] **Step 6: Swap the delete confirmation modal for move-to-trash**

The row More-menu already calls `onRequestDelete(site.id, title)` → `setDeleteTarget(...)`. Keep that. Replace the bottom `{deleteTarget && ( <DeleteModal … /> )}` block with a `ConfirmDialog` and add the `TrashDrawer`:

```tsx
      {/* Move-to-trash confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) await deleteSite(deleteTarget.id); }}
        title="Move to Trash?"
        description={`"${deleteTarget?.name ?? ''}" will be moved to Trash. You can restore it from Trash later.`}
        confirmLabel="Move to Trash"
        cancelLabel="Cancel"
      />

      <TrashDrawer
        isOpen={trashOpen}
        onClose={() => setTrashOpen(false)}
        title="Trashed sites"
        items={trashItems}
        isLoading={isLoadingTrash}
        emptyLabel="Trash is empty"
        onRestore={restoreSite}
        onPermanentDelete={permanentlyDeleteSite}
      />
```

The existing `handleDelete` helper (`await deleteSite(id)`) is now unused — remove it if lint flags it; otherwise the inline `onConfirm` above covers the flow.

- [ ] **Step 7: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: PASS.
Run: `npm run lint`
Expected: no new errors for `app/dashboard/sites/page.tsx`. Resolve any unused-symbol warnings from the removed `DeleteModal`/`handleDelete`.

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/sites/page.tsx
git commit -m "feat(sites): trash button, move-to-trash confirm, trash drawer"
```

---

## Task 6: Update the dashboard map + final verification

**Files:**
- Modify: `docs/reference/dashboard-map.md`

- [ ] **Step 1: Update the products + sites rows**

In `docs/reference/dashboard-map.md`, update the `/dashboard/products` row's Key components to include `TrashDrawer` and its Purpose to mention "move-to-trash, restore, and guarded permanent delete (products with buyers / attached Product Sites are blocked) via `TrashDrawer`". Update the `/dashboard/sites` row similarly: Purpose add "move-to-trash, restore, permanent delete via `TrashDrawer`"; Key components add `ConfirmDialog`, `TrashDrawer`. Bump the `> Last synced:` date at the top to `2026-06-29`.

- [ ] **Step 2: Full verification pass**

Run: `npx tsc --noEmit`
Expected: PASS.
Run: `npm run lint`
Expected: no new errors.
Run a residual hardcoded-color grep on both pages and the new component:

```bash
grep -nE "bg-(white|gray|zinc|emerald|red|amber|blue|indigo)|text-(gray|zinc|emerald|red|amber|blue)|dark:bg-|dark:text-" app/dashboard/products/page.tsx app/dashboard/sites/page.tsx src/components/dashboard/TrashDrawer.tsx
```
Expected: zero hits (acceptable false positives only: `bg-[var(--surface)]/90`, `bg-black/...` overlays inside primitives — none expected in these three files).

- [ ] **Step 3: Manual click-through (`npm run dev`, light + dark)**

Verify each:
- Products: hover a card → trash icon appears → click → "Move to Trash?" → confirm → card leaves grid, header Trash count +1.
- Open Trash drawer → product listed → Restore → returns to grid.
- Trash a product with no buyers and not on a site → Delete permanently → row gone.
- Trash a product attached to a Product Site → Delete permanently → blocked with the "powers a Product Site" message in the drawer banner; row stays.
- Trash a product that has a completed order → Delete permanently → blocked with the "customers own this" message; row stays; confirm `/dashboard/settings/library` download for that buyer still works.
- Sites: row More menu → Delete → "Move to Trash?" → confirm → leaves list, Trash count +1.
- Sites Trash drawer → Restore (returns as Draft) and Delete permanently (gone).
- Toggle dark mode and re-check the drawer, confirm dialog, and hover icon render with tokens.

- [ ] **Step 4: Commit**

```bash
git add docs/reference/dashboard-map.md
git commit -m "docs(dashboard-map): note trash on products & sites"
```

---

## Self-review notes (author)

- **Spec coverage:** list filtering (T1.1/T2.2), trash queries (T1.2/T2.3), soft-trash incl. sites repoint (T2.4 + page confirms), restore (T1.3/T2.5), guarded permanent delete with buyer + site-attachment blocks (T1.3), shared drawer (T3), header Trash-before-create (T4.4/T5.5), hover trash icon on products (T4.5), sites menu repurpose + DeleteModal removal (T5.2/T5.6), docs (T6). All spec sections covered.
- **Type consistency:** hook exports (`trashedProducts`, `restoreProduct`, `permanentlyDeleteProduct`, `trashedSites`, `restoreSite`, `permanentlyDeleteSite`, `isLoadingTrash`) match their page consumers; `TrashItem`/`TrashDrawer` props match both call sites; `onRestore`/`onPermanentDelete` typed `Promise<unknown>` to accept `mutateAsync`.
- **No placeholders:** every code step shows full code; messages and class strings are literal.
