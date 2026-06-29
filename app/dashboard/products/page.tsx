'use client';
// Products list page — full-width product grid with status tabs, filters, bulk select.
// DB tables: products (via useProducts)

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProducts } from '@/hooks/products/useProducts';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatINR } from '@/lib/format';
import CreateProductModal from '@/components/dashboard/products/CreateProductModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TrashDrawer, TrashItem } from '@/components/dashboard/TrashDrawer';
import {
  Plus, Package, FileText, Tag, BookOpen, Search, Edit3, Eye, ImageIcon, Filter, Trash2,
} from 'lucide-react';

type StatusTab = 'all' | 'published' | 'draft';
type CategoryFilter = 'all' | 'digital' | 'course' | 'template' | 'other';

// ─── Page ────────────────────────────────────────────────────
export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsPageInner />
    </Suspense>
  );
}

function ProductsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    products, trashedProducts, isLoading, isLoadingTrash, createProduct, isCreating,
    deleteProduct, restoreProduct, permanentlyDeleteProduct,
  } = useProducts();

  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('digital');
  const [price, setPrice] = useState('');
  const [createError, setCreateError] = useState('');
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashTarget, setTrashTarget] = useState<{ id: string; name: string } | null>(null);

  const trashItems: TrashItem[] = trashedProducts.map((p) => ({
    id: p.id,
    title: p.name ?? 'Untitled',
    subtitle: p.category ?? undefined,
    deletedAt: p.deleted_at,
  }));

  // Hydration guard — client-only product data must not drive the SSR render
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const showLoading = !mounted || isLoading;

  const publishedCount = products.filter((p) => p.is_published).length;
  const draftCount = products.filter((p) => !p.is_published).length;

  const filtered = products.filter((p) => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusTab === 'all' ? true : statusTab === 'published' ? p.is_published : !p.is_published;
    const matchCategory = categoryFilter === 'all' ? true : p.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreateError('');
    try {
      const p = await createProduct({ name: name.trim(), category, price: parseFloat(price) || 0, is_published: false });
      if (p) { setModal(false); router.push(`/dashboard/products/${p.id}`); }
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create product. Please try again.');
    }
  };

  const openModal = () => { setName(''); setCategory('digital'); setPrice(''); setCreateError(''); setModal(true); };

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      openModal();
      router.replace('/dashboard/products');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Products"
        description={
          showLoading ? ' '
            : products.length > 0
              ? `${products.length} product${products.length !== 1 ? 's' : ''} in your catalog`
              : 'No products yet — create your first one.'
        }
        action={headerActions}
      />

      {/* Status tabs */}
      {!showLoading && products.length > 0 && (
        <div className="flex w-fit items-center gap-1 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-1">
          {([
            { key: 'all', label: 'All', count: products.length },
            { key: 'published', label: 'Published', count: publishedCount },
            { key: 'draft', label: 'Drafts', count: draftCount },
          ] as { key: StatusTab; label: string; count: number }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${statusTab === tab.key ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {tab.label}
              <span className="rounded-full bg-[var(--surface-muted)] px-1.5 py-0.5 text-xs font-bold text-[var(--text-secondary)]">{tab.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search + category filter */}
      {!showLoading && products.length > 0 && (
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="group relative max-w-md flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)] transition-colors group-focus-within:text-[var(--brand)]" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name…"
              className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] shadow-[var(--shadow-xs)] transition focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
            <div className="flex flex-wrap gap-1.5">
              {([
                { key: 'all', label: 'All Types' },
                { key: 'digital', label: 'Digital' },
                { key: 'course', label: 'Course' },
                { key: 'template', label: 'Template' },
                { key: 'other', label: 'Other' },
              ] as { key: CategoryFilter; label: string }[]).map((f) => (
                <button
                  key={f.key} onClick={() => setCategoryFilter(f.key)}
                  className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${categoryFilter === f.key ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {showLoading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]">
              <Skeleton className="mb-5 aspect-[4/3] w-full" rounded="lg" />
              <Skeleton className="mb-3 h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!showLoading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] py-32 text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--brand)]/10 shadow-inner">
            <Package className="h-10 w-10 text-[var(--brand)]" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">No products yet</h2>
          <p className="mb-8 max-w-sm text-base text-[var(--text-secondary)]">Your digital shelf is empty. Create your first product and start earning in minutes.</p>
          <button onClick={openModal} className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--brand)] px-6 py-3.5 text-sm font-semibold text-[var(--text-on-brand)] shadow-[var(--shadow-xs)] transition hover:bg-[var(--brand-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            <Plus className="h-5 w-5" />
            Create First Product
          </button>
        </div>
      )}

      {/* Product grid */}
      {!showLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => {
            const isFree = product.price === 0;
            const canPreview = !!(product.is_published || product.is_on_discover_page);
            return (
              <div
                key={product.id}
                onClick={() => router.push(`/dashboard/products/${product.id}`)}
                role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/dashboard/products/${product.id}`); }}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-[var(--radius-lg)] border-2 border-[var(--border)] bg-[var(--surface)] transition-all duration-300 hover:border-[var(--brand)]/50 hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <div className="relative mx-2 mt-2 aspect-[4/3] w-[calc(100%-1rem)] overflow-hidden rounded-[16px] bg-[var(--surface-muted)]">
                  {product.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.thumbnail_url} alt={product.name} className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-[var(--text-tertiary)]">
                      <ImageIcon className="mb-2 h-12 w-12 opacity-50" />
                      <span className="text-xs font-medium uppercase tracking-widest opacity-50">No Cover</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setTrashTarget({ id: product.id, name: product.name ?? 'this product' }); }}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]/90 text-[var(--text-secondary)] opacity-0 shadow-[var(--shadow-xs)] backdrop-blur transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    title="Move to Trash"
                    aria-label="Move to Trash"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="absolute right-3 top-3">
                    <span className={`rounded-full border px-3 py-1.5 text-xs font-bold shadow-[var(--shadow-xs)] ${product.is_published ? 'border-[var(--success)]/20 bg-[var(--success-bg)] text-[var(--success)]' : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]'}`}>
                      {product.is_published ? 'Live' : 'Draft'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h3 className="line-clamp-1 text-base font-bold leading-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--brand)]">{product.name}</h3>
                    <span className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 text-base font-bold text-[var(--text-primary)]">
                      {isFree ? 'Free' : formatINR(product.price || 0)}
                    </span>
                  </div>

                  <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    {product.category === 'digital' && <FileText className="h-3.5 w-3.5" />}
                    {product.category === 'course' && <BookOpen className="h-3.5 w-3.5" />}
                    {product.category === 'template' && <Tag className="h-3.5 w-3.5" />}
                    {(!product.category || product.category === 'other') && <Package className="h-3.5 w-3.5" />}
                    <span>{product.category || 'Digital'}</span>
                  </div>

                  <p className="mb-6 line-clamp-2 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {product.description || 'No description provided yet. Add one to boost conversions.'}
                  </p>

                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/products/${product.id}`); }}
                      className="flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--brand)] py-2.5 text-sm font-semibold text-[var(--text-on-brand)] shadow-[var(--shadow-xs)] transition hover:bg-[var(--brand-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <Edit3 className="h-4 w-4" /> Edit
                    </button>
                    <button
                      disabled={!canPreview}
                      onClick={(e) => { e.stopPropagation(); window.open(`/discover/${product.id}`, '_blank'); }}
                      className="flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--surface-muted)] disabled:hover:text-[var(--text-secondary)]"
                      title={canPreview ? 'Preview product' : 'Publish or list on Discover to preview'}
                    >
                      <Eye className="h-4 w-4" /> View
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add-product tile */}
          <button
            onClick={openModal}
            className="group flex min-h-[320px] flex-col overflow-hidden rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <div className="mx-2 mt-2 flex aspect-[4/3] w-[calc(100%-1rem)] flex-col items-center justify-center gap-2 rounded-[16px] bg-[var(--surface-muted)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-hover)]">
                <Plus className="h-5 w-5 text-[var(--text-tertiary)] transition-colors group-hover:text-[var(--text-secondary)]" />
              </div>
              <span className="text-xs font-semibold text-[var(--text-tertiary)]">Add product</span>
            </div>
            <div className="flex flex-1 flex-col justify-between p-5">
              <div className="space-y-2.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-full" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Skeleton className="h-9 rounded-[var(--radius-sm)]" />
                <Skeleton className="h-9 rounded-[var(--radius-sm)]" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* No matches */}
      {!showLoading && products.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={Search}
          title="No products match your filters"
          description="Try adjusting your search or filters."
          action={
            <button
              onClick={() => { setSearch(''); setStatusTab('all'); setCategoryFilter('all'); }}
              className="text-sm font-semibold text-[var(--brand)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              Clear all filters
            </button>
          }
        />
      )}

      {modal && (
        <CreateProductModal
          name={name} setName={setName}
          category={category} setCategory={setCategory}
          price={price} setPrice={setPrice}
          isCreating={isCreating}
          error={createError}
          onSubmit={handleCreate}
          onClose={() => setModal(false)}
        />
      )}

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
    </div>
  );
}
