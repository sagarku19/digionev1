'use client';
// Products list page — product grid (left) + upsell panel (right) + create modals.
// DB tables: products (via useProducts), upsell_pages (via useUpsellPages)

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import { useUpsellPages } from '@/hooks/useUpsellPages';
import { getUpsellPublicPath, getUpsellDisplayUrl } from '@/lib/site-urls';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatINR } from '@/lib/format';
import CreateProductModal from '@/components/dashboard/products/CreateProductModal';
import CreateUpsellModal from '@/components/dashboard/products/CreateUpsellModal';
import DeleteUpsellConfirm from '@/components/dashboard/products/DeleteUpsellConfirm';
import BulkActionConfirm from '@/components/dashboard/products/BulkActionConfirm';
import {
  Plus, X, Package, FileText, Tag, BookOpen, Search, Edit3, Eye,
  Link2, Copy, Trash2, ExternalLink, TrendingUp, CheckCircle2,
  ImageIcon, Filter, Archive, CheckSquare,
  Square,
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
  const { products, isLoading, createProduct, isCreating } = useProducts();
  const {
    upsellPages, isLoading: upsellLoading,
    createUpsellPage, deleteUpsellPage,
    isCreating: upsellCreating,
  } = useUpsellPages();

  // Product create modal
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'archive' | 'delete' | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('digital');
  const [price, setPrice] = useState('');

  // Upsell create modal
  const [upsellModal, setUpsellModal] = useState(false);
  const [upsellStep, setUpsellStep] = useState<'info' | 'select'>('info');
  const [primaryId, setPrimaryId] = useState('');
  const [secondaryIds, setSecondaryIds] = useState<string[]>([]);
  const [upsellTitle, setUpsellTitle] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createError, setCreateError] = useState('');
  const [upsellError, setUpsellError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Copied link feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Hydration guard — client-only product data must not drive the SSR render
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const showLoading = !mounted || isLoading;
  const showUpsellLoading = !mounted || upsellLoading;

  const publishedCount = products.filter((p) => p.is_published).length;
  const draftCount = products.filter((p) => !p.is_published).length;

  const filtered = products.filter((p) => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusTab === 'all' ? true : statusTab === 'published' ? p.is_published : !p.is_published;
    const matchCategory = categoryFilter === 'all' ? true : p.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map((p) => p.id)));
  const clearSelection = () => setSelectedIds(new Set());

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

  const openUpsellModal = () => {
    setPrimaryId('');
    setSecondaryIds([]);
    setUpsellTitle('');
    setUpsellStep('info');
    setProductSearch('');
    setUpsellError('');
    setUpsellModal(true);
  };

  const handleCreateUpsell = async () => {
    if (!primaryId) return;
    setUpsellError('');
    try {
      const title = upsellTitle.trim() || products.find((p) => p.id === primaryId)?.name || 'Upsell Page';
      const page = await createUpsellPage({
        title,
        primary_product_id: primaryId,
        upsell_product_ids: secondaryIds,
      });
      setUpsellModal(false);
      if (page) router.push(`/dashboard/products/upsells/${page.id}`);
    } catch (err: unknown) {
      setUpsellError(err instanceof Error ? err.message : 'Failed to create upsell page. Please try again.');
    }
  };

  const handleCopyLink = async (slug: string, id: string) => {
    const url = `${window.location.origin}${getUpsellPublicPath(slug)}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteUpsell = async () => {
    if (!deleteId) return;
    setDeleteError('');
    try {
      await deleteUpsellPage(deleteId);
      setDeleteId(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete. Please try again.');
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const addProductButton = (
    <button
      onClick={openModal}
      className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] px-5 py-2.5 rounded-[var(--radius-sm)] font-bold text-sm transition-all active:scale-[0.98] shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] shadow-[var(--shadow-xs)]"
    >
      <Plus className="w-4 h-4" />
      Add Product
    </button>
  );

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Products"
        description={
          showLoading
            ? ' '
            : products.length > 0
              ? `${products.length} product${products.length !== 1 ? 's' : ''} in your catalog`
              : 'No products yet — create your first one.'
        }
        action={addProductButton}
      />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ═══ LEFT: Product Grid ═══ */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Status Tabs with count badges */}
          {!showLoading && products.length > 0 && (
            <div className="flex items-center gap-1 p-1 bg-[var(--surface-muted)] rounded-[var(--radius-lg)] w-fit">
              {([
                { key: 'all',       label: 'All',       count: products.length },
                { key: 'published', label: 'Published', count: publishedCount },
                { key: 'draft',     label: 'Drafts',    count: draftCount },
              ] as { key: StatusTab; label: string; count: number }[]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setStatusTab(tab.key); clearSelection(); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                    statusTab === tab.key
                      ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.label}
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    statusTab === tab.key
                      ? 'bg-[var(--surface-muted)] text-[var(--text-primary)]'
                      : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Search + Category Filter Bar */}
          {!showLoading && products.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-md group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] group-focus-within:text-[var(--brand)] transition-colors" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search products by name..."
                  className="w-full pl-11 pr-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] focus:border-[var(--border-strong)] shadow-[var(--shadow-xs)] transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                <div className="flex gap-1.5 flex-wrap">
                  {([
                    { key: 'all',      label: 'All Types' },
                    { key: 'digital',  label: 'Digital' },
                    { key: 'course',   label: 'Course' },
                    { key: 'template', label: 'Template' },
                    { key: 'other',    label: 'Other' },
                  ] as { key: CategoryFilter; label: string }[]).map(f => (
                    <button
                      key={f.key}
                      onClick={() => setCategoryFilter(f.key)}
                      className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                        categoryFilter === f.key
                          ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                          : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bulk Select Bar */}
          {filtered.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={selectedIds.size === filtered.length ? clearSelection : selectAll}
                className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                {selectedIds.size === filtered.length && filtered.length > 0
                  ? <CheckSquare className="w-4 h-4 text-[var(--brand)]" />
                  : <Square className="w-4 h-4" />
                }
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
              </button>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                  <button
                    onClick={() => setBulkAction('archive')}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]/20 hover:bg-[var(--warning)]/20 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <Archive className="w-3.5 h-3.5" /> Archive
                  </button>
                  <button
                    onClick={() => setBulkAction('delete')}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--danger)]/20 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                  <button onClick={clearSelection} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}


          {/* Loading */}
          {showLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-xs)]">
                  <Skeleton className="w-full aspect-[4/3] mb-5" rounded="lg" />
                  <Skeleton className="h-4 w-3/4 mb-3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!showLoading && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-center bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-[var(--radius-lg)]">
              <div className="w-24 h-24 bg-[var(--brand)]/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Package className="w-10 h-10 text-[var(--brand)]" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">No products yet</h2>
              <p className="text-[var(--text-secondary)] text-base max-w-sm mb-8">Your digital shelf is empty. Create your first product and start earning in minutes.</p>
              <button onClick={openModal} className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] px-6 py-3.5 rounded-[var(--radius-lg)] font-bold text-sm shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <Plus className="w-5 h-5" />
                Create First Product
              </button>
            </div>
          )}

          {/* Product card grid */}
          {!showLoading && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((product) => {
                const isSelected = selectedIds.has(product.id);
                return (
                <div
                  key={product.id}
                  className={`group flex flex-col bg-[var(--surface)] rounded-[var(--radius-lg)] overflow-hidden hover:shadow-[var(--shadow-sm)] transition-all duration-300 border-2 ${
                    isSelected
                      ? 'border-[var(--brand)]'
                      : 'border-[var(--border)] hover:border-[var(--brand)]/50'
                  }`}
                >
                  <div className="relative w-[calc(100%-1rem)] aspect-[4/3] bg-[var(--surface-muted)] overflow-hidden mx-2 mt-2 rounded-[16px]">
                    {product.thumbnail_url ? (
                      <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-tertiary)] bg-[var(--surface-muted)]">
                        <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                        <span className="text-xs font-medium uppercase tracking-widest opacity-50">No Cover</span>
                      </div>
                    )}
                    {/* Selection checkbox */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleSelect(product.id); }}
                      className={`absolute top-3 left-3 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                        isSelected
                          ? 'bg-[var(--brand)] border-[var(--brand)] opacity-100'
                          : 'bg-[var(--surface)]/80 border-[var(--border)] opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--text-on-brand)]" />}
                    </button>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    <div className="absolute top-3 right-3">
                      <div className={`border text-xs font-bold px-3 py-1.5 rounded-full shadow-[var(--shadow-xs)] ${
                        product.is_published
                          ? 'bg-[var(--success-bg)] border-[var(--success)]/20 text-[var(--success)]'
                          : 'bg-[var(--surface-muted)] border-[var(--border)] text-[var(--text-secondary)]'
                      }`}>
                        {product.is_published ? 'Live' : 'Draft'}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-bold text-[var(--text-primary)] text-base leading-tight line-clamp-1 group-hover:text-[var(--brand)] transition-colors">{product.name}</h3>
                      <span className="text-base font-black text-[var(--text-primary)] shrink-0 bg-[var(--surface-muted)] px-2 py-0.5 rounded-lg border border-[var(--border)] shadow-[var(--shadow-xs)]">
                        {(product as { is_free?: boolean }).is_free ? 'Free' : formatINR(product.price || 0)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-3">
                      {product.category === 'digital' && <FileText className="w-3.5 h-3.5" />}
                      {product.category === 'course' && <BookOpen className="w-3.5 h-3.5" />}
                      {product.category === 'template' && <Tag className="w-3.5 h-3.5" />}
                      {product.category === 'other' && <Package className="w-3.5 h-3.5" />}
                      <span>{product.category || 'Digital'}</span>
                    </div>

                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-6 flex-1">
                      {product.description || 'No description provided for this product yet. Add one to boost conversions.'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <button
                        onClick={() => router.push(`/dashboard/products/${product.id}`)}
                        className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] py-2.5 rounded-[var(--radius-sm)] transition-all shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => window.open(`/store/product/${product.id}`, '_blank')}
                        className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] py-2.5 rounded-[var(--radius-sm)] transition-all shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                        title="Preview Product"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );})}

              {/* Add new product skeleton card */}
              <button
                onClick={openModal}
                className="group flex flex-col bg-[var(--surface)] border-2 border-dashed border-[var(--border)] hover:border-[var(--border-strong)] rounded-[var(--radius-lg)] overflow-hidden transition-all duration-200 min-h-[320px] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <div className="w-[calc(100%-1rem)] aspect-[4/3] mx-2 mt-2 rounded-[16px] bg-[var(--surface-muted)] flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-hover)] flex items-center justify-center transition-colors">
                    <Plus className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div className="space-y-2.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-5">
                    <Skeleton className="h-9 rounded-[var(--radius-sm)]" />
                    <Skeleton className="h-9 rounded-[var(--radius-sm)]" />
                  </div>
                </div>
              </button>
            </div>
          )}

          {!showLoading && products.length > 0 && filtered.length === 0 && (
            <EmptyState
              icon={Search}
              title="No products match your filters"
              description="Try adjusting your search or filters."
              action={
                <button
                  onClick={() => { setSearch(''); setStatusTab('all'); setCategoryFilter('all'); }}
                  className="text-[var(--brand)] font-semibold text-sm hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  Clear all filters
                </button>
              }
            />
          )}
        </div>

        {/* ═══ RIGHT: Upsell Panel ═══ */}
        <aside className="lg:w-[400px] xl:w-[440px] shrink-0">
          <div className="sticky top-6 space-y-6">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-1 shadow-[var(--shadow-xs)]">
              <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] p-6 lg:p-7 h-full relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--brand)]/10 rounded-[var(--radius-lg)] flex items-center justify-center shadow-inner">
                      <TrendingUp className="w-5 h-5 text-[var(--brand)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)] text-base">Upsell Pages</h3>
                      <p className="text-xs font-medium text-[var(--text-tertiary)] mt-0.5">Boost order value</p>
                    </div>
                  </div>
                  <button
                    onClick={openUpsellModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] text-xs font-bold transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Upsell Page
                  </button>
                </div>

                {showUpsellLoading && (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-24 w-full" rounded="lg" />
                    ))}
                  </div>
                )}

                {!showUpsellLoading && upsellPages.length === 0 && (
                  <div className="text-center py-12 px-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)]">
                    <div className="w-16 h-16 bg-[var(--surface-hover)] rounded-[20px] flex items-center justify-center mx-auto mb-4 shadow-[var(--shadow-xs)] border border-[var(--border)]">
                      <Link2 className="w-7 h-7 text-[var(--text-tertiary)]" />
                    </div>
                    <h4 className="text-base font-bold text-[var(--text-primary)] mb-1">Create an Upsell</h4>
                    <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">Combine products into a single shareable checkout page to increase sales.</p>
                    <button
                      onClick={openUpsellModal}
                      className="inline-flex items-center justify-center gap-2 w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] py-2.5 rounded-[var(--radius-sm)] font-bold text-sm transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <Plus className="w-4 h-4" />
                      Create Upsell
                    </button>
                  </div>
                )}

                {!showUpsellLoading && upsellPages.length > 0 && (
                  <div className="space-y-4">
                    {upsellPages.map(up => (
                      <div
                        key={up.id}
                        className="group relative isolate p-5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] hover:border-[var(--brand)]/30 transition-all cursor-pointer overflow-hidden shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)]"
                        onClick={() => router.push(`/dashboard/products/upsells/${up.id}`)}
                      >
                        {/* Hover Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -z-10" />

                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-[var(--text-primary)] truncate pr-2 group-hover:text-[var(--brand)] transition-colors">{up.title}</p>
                            <p className="text-xs font-medium text-[var(--text-secondary)] truncate mt-1 bg-[var(--surface-muted)] inline-flex px-2 py-0.5 rounded-md">
                              {up.primary_product?.name || 'Unknown product'}
                              {up.primary_product?.price != null && ` • ${formatINR(up.primary_product.price)}`}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shrink-0 shadow-[var(--shadow-xs)] border ${
                            up.is_published
                              ? 'bg-[var(--success-bg)] border-[var(--success)]/20 text-[var(--success)]'
                              : 'bg-[var(--surface-muted)] border-[var(--border)] text-[var(--text-secondary)]'
                          }`}>
                            {up.is_published ? 'Live' : 'Draft'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 p-2 bg-[var(--surface-muted)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)] mb-4 overflow-hidden">
                          <Link2 className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0 ml-1" />
                          <span className="text-xs text-[var(--text-secondary)] font-medium truncate flex-1">{getUpsellDisplayUrl(up.slug)}</span>
                        </div>

                        <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/dashboard/products/upsells/${up.id}`)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCopyLink(up.slug, up.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                              title="Copy Link"
                            >
                              {copiedId === up.id ? <CheckCircle2 className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <a
                              href={getUpsellPublicPath(up.slug)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                              title="View Page"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>

                          <button
                            onClick={() => { setDeleteError(''); setDeleteId(up.id); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--danger-bg)] text-[var(--text-tertiary)] hover:text-[var(--danger)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add upsell skeleton card */}
                    <button
                      onClick={openUpsellModal}
                      className="group w-full border-2 border-dashed border-[var(--border)] hover:border-[var(--border-strong)] rounded-[var(--radius-lg)] p-4 transition-all duration-200 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--surface-muted)] group-hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors shrink-0">
                          <Plus className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-2/3" />
                          <Skeleton className="h-2.5 w-1/2" />
                        </div>
                      </div>
                      <Skeleton className="h-7 w-full rounded-[var(--radius-sm)] mb-3" />
                      <div className="flex gap-2">
                        <Skeleton className="w-8 h-8 rounded-lg" />
                        <Skeleton className="w-8 h-8 rounded-lg" />
                        <Skeleton className="w-8 h-8 rounded-lg" />
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

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

      {upsellModal && (
        <CreateUpsellModal
          step={upsellStep} setStep={setUpsellStep}
          products={products} filteredProducts={filteredProducts}
          primaryId={primaryId} setPrimaryId={setPrimaryId}
          secondaryIds={secondaryIds} setSecondaryIds={setSecondaryIds}
          title={upsellTitle} setTitle={setUpsellTitle}
          productSearch={productSearch} setProductSearch={setProductSearch}
          isCreating={upsellCreating}
          error={upsellError}
          onCreate={handleCreateUpsell}
          onClose={() => setUpsellModal(false)}
        />
      )}

      {deleteId && (
        <DeleteUpsellConfirm
          error={deleteError}
          onConfirm={handleDeleteUpsell}
          onClose={() => setDeleteId(null)}
        />
      )}

      {bulkAction && (
        <BulkActionConfirm
          action={bulkAction}
          count={selectedIds.size}
          onConfirm={() => { clearSelection(); setBulkAction(null); }}
          onClose={() => setBulkAction(null)}
        />
      )}
    </div>
  );
}
