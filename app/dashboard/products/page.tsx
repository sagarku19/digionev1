'use client';
// Products list page — product grid (left) + upsell panel (right) + create modals.
// DB tables: products (via useProducts), upsell_pages (via useUpsellPages)

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import { useUpsellPages } from '@/hooks/useUpsellPages';
import { getUpsellPublicPath, getUpsellDisplayUrl } from '@/lib/site-urls';
import {
  Plus, X, Package, FileText, Tag, BookOpen, Search, Edit3, Eye,
  Link2, Copy, Trash2, ExternalLink, TrendingUp, CheckCircle2,
  ImageIcon, Sparkles, ArrowRight
} from 'lucide-react';

const INPUT = 'w-full px-4 py-3 bg-gray-50/50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-[var(--brand)]/40 focus:border-[var(--brand)] outline-none text-[var(--text-primary)] placeholder-gray-400 transition-all';

const CATEGORIES = [
  { value: 'digital', label: 'Digital File', icon: FileText, desc: 'PDF, ZIP, video, audio' },
  { value: 'course', label: 'Course', icon: BookOpen, desc: 'Structured learning' },
  { value: 'template', label: 'Template', icon: Tag, desc: 'Design or code templates' },
  { value: 'other', label: 'Other', icon: Package, desc: 'Custom digital product' },
];

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

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

  // Copied link feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = products.filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const p = await createProduct({ name: name.trim(), category, price: parseFloat(price) || 0, is_published: false });
      if (p) { setModal(false); router.push(`/dashboard/products/${p.id}`); }
    } catch (err) {
      console.error('Failed to create product', err);
    }
  };

  const openModal = () => { setName(''); setCategory('digital'); setPrice(''); setModal(true); };

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
    setUpsellModal(true);
  };

  const handleCreateUpsell = async () => {
    if (!primaryId) return;
    try {
      const title = upsellTitle.trim() || products.find((p: any) => p.id === primaryId)?.name || 'Upsell Page';
      const page = await createUpsellPage({
        title,
        primary_product_id: primaryId,
        upsell_product_ids: secondaryIds,
      });
      setUpsellModal(false);
      if (page) router.push(`/dashboard/products/upsells/${page.id}`);
    } catch (err) {
      console.error('Failed to create upsell page', err);
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
    try { await deleteUpsellPage(deleteId); } catch { /* silent */ }
    setDeleteId(null);
  };

  const filteredProducts = products.filter((p: any) =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="pt-6 sm:pt-8 pb-16 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Products</h1>
          <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mt-1">
            {products.length > 0
              ? `${products.length} product${products.length !== 1 ? 's' : ''} in your catalog`
              : 'No products yet — create your first one.'}
          </p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 bg-[var(--text-primary)] hover:bg-[var(--text-primary)]/90 text-[var(--bg-primary)] px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ═══ LEFT: Product Grid ═══ */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Action Bar */}
          {products.length > 0 && (
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-full max-w-md group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[var(--brand)] transition-colors" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search products by name..."
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 rounded-2xl text-sm text-[var(--text-primary)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)] shadow-sm transition-all"
                />
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-4 animate-pulse shadow-sm">
                  <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-zinc-900 rounded-2xl mb-5" />
                  <div className="h-4 bg-gray-100 dark:bg-zinc-900 rounded-md w-3/4 mb-3" />
                  <div className="h-3 bg-gray-100 dark:bg-zinc-900 rounded-md w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-center bg-white/50 dark:bg-zinc-950/50 border border-dashed border-gray-300 dark:border-zinc-800 rounded-3xl">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Package className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">No products yet</h2>
              <p className="text-gray-500 text-base max-w-sm mb-8">Your digital shelf is empty. Create your first product and start earning in minutes.</p>
              <button onClick={openModal} className="flex items-center gap-2 bg-[var(--text-primary)] hover:bg-[var(--text-primary)]/90 text-[var(--bg-primary)] px-6 py-3.5 rounded-2xl font-bold text-sm shadow opacity-90 hover:opacity-100 transition-all">
                <Plus className="w-5 h-5" />
                Create First Product
              </button>
            </div>
          )}

          {/* Product card grid */}
          {!isLoading && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((product: any) => (
                <div key={product.id} className="group flex flex-col bg-white dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800 rounded-[24px] overflow-hidden hover:border-indigo-500/50 dark:hover:border-indigo-400/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
                  <div className="relative w-[calc(100%-1rem)] aspect-[4/3] bg-gray-50 dark:bg-zinc-900 overflow-hidden mx-2 mt-2 rounded-[16px]">
                    {product.thumbnail_url ? (
                      <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-zinc-700 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-950 inner-shadow">
                        <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                        <span className="text-xs font-medium uppercase tracking-widest opacity-50">No Cover</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    
                    <div className="absolute top-3 right-3">
                      <div className={`backdrop-blur-md border text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ${
                        product.is_published
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-600 dark:text-zinc-400'
                      }`}>
                        {product.is_published ? 'Live' : 'Draft'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-bold text-[var(--text-primary)] text-base leading-tight line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{product.name}</h3>
                      <span className="text-base font-black text-[var(--text-primary)] shrink-0 bg-gray-100 dark:bg-zinc-900 px-2 py-0.5 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm">
                        {product.is_free ? 'Free' : formatINR(product.price || 0)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
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
                        className="flex items-center justify-center gap-2 text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-zinc-950 hover:bg-gray-800 dark:hover:bg-gray-100 py-2.5 rounded-xl transition-all shadow-sm"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => window.open(`/store/product/${product.id}`, '_blank')}
                        className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 dark:text-[var(--text-secondary)] bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 py-2.5 rounded-xl transition-all shadow-sm"
                        title="Preview Product"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add new product skeleton card */}
              <button
                onClick={openModal}
                className="group flex flex-col bg-white dark:bg-zinc-950 border-2 border-dashed border-gray-200 dark:border-zinc-800 hover:border-gray-400 dark:hover:border-zinc-600 rounded-[24px] overflow-hidden transition-all duration-200 min-h-[320px]"
              >
                <div className="w-[calc(100%-1rem)] aspect-[4/3] mx-2 mt-2 rounded-[16px] bg-gray-50 dark:bg-zinc-900 flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700 flex items-center justify-center transition-colors">
                    <Plus className="w-5 h-5 text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-300 transition-colors" />
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div className="space-y-2.5">
                    <div className="h-3.5 bg-gray-100 dark:bg-zinc-900 rounded-md w-3/4" />
                    <div className="h-3 bg-gray-100 dark:bg-zinc-900 rounded-md w-1/2" />
                    <div className="h-3 bg-gray-100 dark:bg-zinc-900 rounded-md w-full" />
                    <div className="h-3 bg-gray-100 dark:bg-zinc-900 rounded-md w-2/3" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-5">
                    <div className="h-9 bg-gray-100 dark:bg-zinc-900 rounded-xl" />
                    <div className="h-9 bg-gray-100 dark:bg-zinc-900 rounded-xl" />
                  </div>
                </div>
              </button>
            </div>
          )}

          {!isLoading && products.length > 0 && filtered.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-3xl">
              <Search className="w-10 h-10 text-gray-300 dark:text-zinc-700 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No products match &ldquo;{search}&rdquo;</p>
              <button onClick={() => setSearch('')} className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm mt-3 hover:underline">Clear search filters</button>
            </div>
          )}
        </div>

        {/* ═══ RIGHT: Upsell Panel ═══ */}
        <aside className="lg:w-[400px] xl:w-[440px] shrink-0">
          <div className="sticky top-6 space-y-6">
            <div className="relative overflow-hidden bg-gradient-to-b from-white to-gray-50/50 dark:from-zinc-950 dark:to-zinc-950/80 border border-gray-200/80 dark:border-zinc-800 rounded-[28px] p-1 shadow-sm">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />
              
              <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl rounded-[24px] p-6 lg:p-7 h-full relative z-10 border border-white/20 dark:border-white/5">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center shadow-inner">
                      <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)] text-base">Upsell Pages</h3>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">Boost order value</p>
                    </div>
                  </div>
                  <button
                    onClick={openUpsellModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-[var(--text-secondary)] text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Upsell Page
                  </button>
                </div>

                {upsellLoading && (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse h-24 bg-gray-100 dark:bg-zinc-900 rounded-2xl" />
                    ))}
                  </div>
                )}

                {!upsellLoading && upsellPages.length === 0 && (
                  <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/20">
                    <div className="w-16 h-16 bg-gradient-to-tr from-gray-100 to-white dark:from-zinc-800 dark:to-zinc-900 rounded-[20px] flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-200/50 dark:border-zinc-700/50">
                      <Link2 className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h4 className="text-base font-bold text-[var(--text-primary)] mb-1">Create an Upsell</h4>
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">Combine products into a single shareable checkout page to increase sales.</p>
                    <button
                      onClick={openUpsellModal}
                      className="inline-flex items-center justify-center gap-2 w-full bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-zinc-950 py-2.5 rounded-xl font-bold text-sm transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create Upsell
                    </button>
                  </div>
                )}

                {!upsellLoading && upsellPages.length > 0 && (
                  <div className="space-y-4">
                    {upsellPages.map(up => (
                      <div
                        key={up.id}
                        className="group relative isolate p-5 bg-white dark:bg-zinc-900/50 border border-gray-200/80 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/30 dark:hover:border-indigo-400/30 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                        onClick={() => router.push(`/dashboard/products/upsells/${up.id}`)}
                      >
                        {/* Hover Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-500/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity -z-10" />

                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-[var(--text-primary)] truncate pr-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{up.title}</p>
                            <p className="text-xs font-medium text-gray-500 truncate mt-1 bg-gray-100 dark:bg-zinc-800 inline-flex px-2 py-0.5 rounded-md">
                              {up.primary_product?.name || 'Unknown product'}
                              {up.primary_product?.price != null && ` \u2022 ${formatINR(up.primary_product.price)}`}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shrink-0 shadow-sm border ${
                            up.is_published
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
                              : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-[var(--text-secondary)]'
                          }`}>
                            {up.is_published ? 'Live' : 'Draft'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 p-2 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-100 dark:border-zinc-800 mb-4 overflow-hidden">
                          <Link2 className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
                          <span className="text-xs text-gray-500 font-medium truncate flex-1">{getUpsellDisplayUrl(up.slug)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/dashboard/products/upsells/${up.id}`)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-[var(--text-secondary)] transition"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCopyLink(up.slug, up.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-[var(--text-secondary)] transition"
                              title="Copy Link"
                            >
                              {copiedId === up.id ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <a
                              href={getUpsellPublicPath(up.slug)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-[var(--text-secondary)] transition"
                              title="View Page"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                          
                          <button
                            onClick={() => setDeleteId(up.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition"
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
                      className="group w-full border-2 border-dashed border-gray-200 dark:border-zinc-800 hover:border-gray-400 dark:hover:border-zinc-600 rounded-2xl p-4 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700 flex items-center justify-center transition-colors shrink-0">
                          <Plus className="w-4 h-4 text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-300 transition-colors" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-gray-100 dark:bg-zinc-900 rounded w-2/3" />
                          <div className="h-2.5 bg-gray-100 dark:bg-zinc-900 rounded w-1/2" />
                        </div>
                      </div>
                      <div className="h-7 bg-gray-100 dark:bg-zinc-900 rounded-xl mb-3" />
                      <div className="flex gap-2">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-zinc-900 rounded-lg" />
                        <div className="w-8 h-8 bg-gray-100 dark:bg-zinc-900 rounded-lg" />
                        <div className="w-8 h-8 bg-gray-100 dark:bg-zinc-900 rounded-lg" />
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ═══ Create Product Modal ═══ */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 dark:bg-zinc-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 rounded-[32px] shadow-2xl w-full max-w-[480px] border border-gray-200/50 dark:border-zinc-800/80 overflow-hidden transform transition-all scale-in-95 flex flex-col max-h-[90vh]">
            <div className="relative px-6 sm:px-8 pt-8 pb-6 border-b border-gray-100 dark:border-zinc-800/50 shrink-0">
              <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
                <div className="w-32 h-32 bg-[var(--brand)] rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] relative z-10">Create Product</h2>
              <p className="text-sm text-gray-500 mt-1 relative z-10">Add a new offering to your catalog.</p>
              <button onClick={() => setModal(false)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors z-20">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 sm:p-8 space-y-6 bg-gray-50/30 dark:bg-zinc-900/10 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Product Name <span className="text-red-500">*</span></label>
                <input type="text" required autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Masterclass: Advanced UI Design" className={INPUT} />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-[var(--text-primary)] mb-3">Category Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map(c => (
                    <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                      className={`relative flex flex-col items-start p-4 rounded-2xl text-left transition-all duration-200 border-2 overflow-hidden group ${category === c.value ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10' : 'border-gray-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950'}`}>
                      <c.icon className={`w-6 h-6 mb-3 ${category === c.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                      <div className={`text-sm font-bold mb-0.5 ${category === c.value ? 'text-indigo-900 dark:text-indigo-100' : 'text-[var(--text-primary)]'}`}>{c.label}</div>
                      <div className="text-xs text-gray-500 leading-tight">{c.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Base Price (INR)</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium group-focus-within:text-[var(--brand)] transition-colors">{'\u20B9'}</span>
                  <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className={`${INPUT} pl-10 font-mono text-lg tracking-wider placeholder:text-base`} />
                </div>
                <p className="text-xs text-gray-500 mt-2 font-medium">You can configure free products or change pricing later.</p>
              </div>
              
              <div className="pt-2">
                <button type="submit" disabled={isCreating || !name.trim()} className="w-full flex items-center justify-center gap-2 bg-[var(--text-primary)] hover:bg-[var(--text-primary)]/90 disabled:opacity-50 text-[var(--bg-primary)] py-4 rounded-xl font-bold text-base shadow-lg transition-all active:scale-[0.98]">
                  {isCreating ? 'Creating Product...' : 'Create & Continue'}
                  {!isCreating && <ArrowRight className="w-4 h-4 ml-1" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Create Upsell Modal ═══ */}
      {upsellModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 dark:bg-zinc-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 rounded-[32px] shadow-2xl w-full max-w-[540px] border border-gray-200/50 dark:border-zinc-800/80 overflow-hidden transform transition-all scale-in-95 flex flex-col max-h-[90vh]">
            <div className="relative px-6 sm:px-8 pt-8 pb-6 border-b border-gray-100 dark:border-zinc-800/50 shrink-0">
              <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
                <div className="w-32 h-32 bg-indigo-500 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] relative z-10">
                {upsellStep === 'info' ? 'Create Upsell Page' : 'Configure Upsell'}
              </h2>
              <p className="text-sm text-gray-500 mt-1 relative z-10">
                {upsellStep === 'info' ? 'Maximize revenue with smart bundle checkouts.' : 'Select products to bundle together.'}
              </p>
              <button onClick={() => setUpsellModal(false)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors z-20">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 bg-gray-50/30 dark:bg-zinc-900/10 overflow-y-auto custom-scrollbar">
              {upsellStep === 'info' ? (
                <div className="space-y-5">
                  {/* Hero */}
                  <div className="bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl p-5 text-white">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-base font-extrabold mb-1">One link. Multiple products.</h3>
                    <p className="text-sm text-white/70 leading-relaxed">
                      Bundle a main product with optional add-ons buyers can toggle at checkout — no extra clicks, no friction.
                    </p>
                  </div>

                  {/* Steps */}
                  <div className="space-y-2">
                    {[
                      { n: '1', label: 'Pick your primary product' },
                      { n: '2', label: 'Add up to 2 optional add-ons' },
                      { n: '3', label: 'Share the link and watch revenue grow' },
                    ].map(step => (
                      <div key={step.n} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-xl">
                        <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 text-xs font-extrabold flex items-center justify-center shrink-0">{step.n}</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-[var(--text-secondary)]">{step.label}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setUpsellStep('select')}
                    disabled={products.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 text-white dark:text-zinc-950 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                  >
                    {products.length === 0 ? 'Create a product first' : 'Start Building →'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Campaign Internal Name</label>
                    <input
                      type="text" value={upsellTitle}
                      onChange={e => setUpsellTitle(e.target.value)}
                      className={INPUT}
                      placeholder={products.find((p: any) => p.id === primaryId)?.name || 'e.g. Black Friday Mastery Bundle'}
                    />
                  </div>

                  {/* Primary Product */}
                  <div>
                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Select Primary Product <span className="text-red-500">*</span></label>
                    <div className="relative mb-3 group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input
                        type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                        placeholder="Search your inventory..."
                        className={`${INPUT} pl-11 py-2.5 rounded-lg border-gray-300 dark:border-zinc-700`}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-zinc-800 rounded-xl divide-y divide-gray-100 dark:divide-zinc-800/50 bg-white dark:bg-zinc-950 shadow-inner custom-scrollbar">
                      {filteredProducts.map((p: any) => (
                        <button
                          key={p.id} type="button"
                          onClick={() => { setPrimaryId(p.id); setSecondaryIds(ids => ids.filter(id => id !== p.id)); if (!upsellTitle) setUpsellTitle(p.name); }}
                          className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${
                            primaryId === p.id ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-gray-50 dark:hover:bg-zinc-900/50'
                          }`}
                        >
                          {p.thumbnail_url ? (
                            <img src={p.thumbnail_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-black/5 dark:border-white/5" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 border border-gray-200 dark:border-zinc-700">
                              <Package className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${primaryId === p.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-[var(--text-primary)]'}`}>{p.name}</p>
                            <p className="text-xs font-semibold text-gray-500 mt-0.5">{formatINR(p.price || 0)}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${primaryId === p.id ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 dark:border-zinc-600'}`}>
                            {primaryId === p.id && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </button>
                      ))}
                      {filteredProducts.length === 0 && (
                        <div className="py-6 text-center text-sm text-gray-500">No products found.</div>
                      )}
                    </div>
                  </div>

                  {/* Secondary Products */}
                  {primaryId && (
                    <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                      <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">
                        Add Order Bumps <span className="text-gray-400 font-medium text-xs ml-1">(Optional, max 2)</span>
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {products.filter((p: any) => p.id !== primaryId).map((p: any) => {
                          const selected = secondaryIds.includes(p.id);
                          const disabled = !selected && secondaryIds.length >= 2;
                          return (
                            <button
                              key={p.id} type="button" disabled={disabled}
                              onClick={() => setSecondaryIds(ids => selected ? ids.filter(id => id !== p.id) : [...ids, p.id])}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                                selected 
                                  ? 'bg-white dark:bg-zinc-950 border-2 border-indigo-500 shadow-sm'
                                  : disabled 
                                    ? 'opacity-40 cursor-not-allowed bg-white dark:bg-zinc-950 border-2 border-transparent'
                                    : 'bg-white dark:bg-zinc-950 border-2 border-gray-100 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-600'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 dark:border-zinc-600'}`}>
                                {selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${selected ? 'text-indigo-900 dark:text-indigo-100' : 'text-[var(--text-primary)]'}`}>{p.name}</p>
                              </div>
                              <p className="text-xs font-bold text-gray-500 shrink-0 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-md">{formatINR(p.price || 0)}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      onClick={handleCreateUpsell}
                      disabled={!primaryId || upsellCreating}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
                    >
                      {upsellCreating ? 'Building Funnel...' : 'Publish Funnel Page'}
                      {!upsellCreating && <ArrowRight className="w-4 h-4 ml-1" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Delete Confirm ═══ */}
      {deleteId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 rounded-[32px] shadow-2xl w-full max-w-sm border border-gray-200/50 dark:border-zinc-800/80 p-8 text-center transform transition-all scale-in-95">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-[20px] flex items-center justify-center mx-auto mb-6 shadow-inner border border-red-100 dark:border-red-500/20">
              <Trash2 className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-extrabold text-[var(--text-primary)] mb-2">Delete Funnel?</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">This will permanently remove the upsell page. Your base products will not be affected.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 dark:border-zinc-800 text-sm font-bold text-gray-700 dark:text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteUpsell} className="flex-1 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-lg shadow-red-600/20 transition-all active:scale-[0.98]">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
