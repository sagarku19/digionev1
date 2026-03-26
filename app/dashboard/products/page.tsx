'use client';
// Products list page — product grid (left) + upsell panel (right) + create modals.
// DB tables: products (via useProducts), upsell_pages (via useUpsellPages)

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import { useUpsellPages } from '@/hooks/useUpsellPages';
import { getUpsellPublicPath, getUpsellDisplayUrl } from '@/lib/site-urls';
import {
  Plus, X, Package, FileText, Tag, BookOpen, Search, Edit3, Eye,
  Link2, Copy, Trash2, ExternalLink, TrendingUp, CheckCircle2,
  Loader2, Sparkles,
} from 'lucide-react';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)]/40 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';

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
  const router = useRouter();
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
    <div className="pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your digital products, courses, and downloads.</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          New Product
        </button>
      </div>

      <div className="flex gap-6">
        {/* ═══ LEFT: Product Grid ═══ */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Search */}
          {products.length > 0 && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
              />
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 animate-pulse">
                  <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-xl mb-4" />
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mb-5">
                <Package className="w-10 h-10 text-[var(--text-secondary)]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No products yet</h2>
              <p className="text-gray-500 text-sm max-w-xs mb-6">Create your first digital product and start selling in minutes.</p>
              <button onClick={openModal} className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all">
                <Plus className="w-4 h-4" />
                Create your first product
              </button>
            </div>
          )}

          {/* Product card grid */}
          {!isLoading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((product: any) => (
                <div key={product.id} className="group bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-[var(--accent)] dark:hover:border-[var(--accent)] hover:shadow-lg transition-all duration-200">
                  <div className="relative w-full h-36 bg-[var(--bg-tertiary)] overflow-hidden">
                    {product.thumbnail_url ? (
                      <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-[var(--text-secondary)] dark:text-[var(--text-primary)]" />
                      </div>
                    )}
                    <div className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      product.is_published
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {product.is_published ? 'Published' : 'Draft'}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{product.name}</h3>
                        <p className="text-xs text-gray-500 capitalize mt-0.5">{product.category || 'Digital'}</p>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white shrink-0 ml-2">
                        {product.is_free ? 'Free' : formatINR(product.price || 0)}
                      </span>
                    </div>
                    {product.description && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{product.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={() => router.push(`/dashboard/products/${product.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--accent)]/20 py-2 rounded-lg transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button className="flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 py-2 px-3 rounded-lg transition" title="View product">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && products.length > 0 && filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500">No products match &ldquo;{search}&rdquo;</p>
              <button onClick={() => setSearch('')} className="text-[var(--text-secondary)] text-sm mt-2 hover:underline">Clear search</button>
            </div>
          )}
        </div>

        {/* ═══ RIGHT: Upsell Panel (enlarged) ═══ */}
        <aside className="hidden lg:block w-[380px] xl:w-[420px] shrink-0">
          <div className="sticky top-20 space-y-4">
            <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-[var(--text-secondary)]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">Upsell Pages</h3>
                    <p className="text-xs text-gray-400">Shareable checkout links</p>
                  </div>
                </div>
                <button
                  onClick={openUpsellModal}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-3 py-2 rounded-lg transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create
                </button>
              </div>

              {upsellLoading && (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="animate-pulse h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                  ))}
                </div>
              )}

              {!upsellLoading && upsellPages.length === 0 && (
                <div className="text-center py-10">
                  <div className="w-14 h-14 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Link2 className="w-7 h-7 text-[var(--text-secondary)]" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No upsell pages yet</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto">Create a shareable checkout link to boost your sales.</p>
                </div>
              )}

              {!upsellLoading && upsellPages.length > 0 && (
                <div className="space-y-3">
                  {upsellPages.map(up => (
                    <div
                      key={up.id}
                      className="group/item p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                      onClick={() => router.push(`/dashboard/products/upsells/${up.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{up.title}</p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {up.primary_product?.name || 'Unknown product'}
                            {up.primary_product?.price != null && ` \u2022 ${formatINR(up.primary_product.price)}`}
                          </p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          up.is_published
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {up.is_published ? 'Live' : 'Draft'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                        <span>{getUpsellDisplayUrl(up.slug)}</span>
                      </div>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/dashboard/products/upsells/${up.id}`)}
                          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-[var(--text-primary)] dark:hover:text-[var(--text-secondary)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-tertiary)] transition"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleCopyLink(up.slug, up.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-[var(--text-primary)] dark:hover:text-[var(--text-secondary)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-tertiary)] transition"
                        >
                          {copiedId === up.id ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          {copiedId === up.id ? 'Copied!' : 'Copy'}
                        </button>
                        <a
                          href={getUpsellPublicPath(up.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-[var(--text-primary)] dark:hover:text-[var(--text-secondary)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-tertiary)] transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </a>
                        <button
                          onClick={() => setDeleteId(up.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition ml-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ═══ Create Product Modal ═══ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D0D1F] rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Product</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Product Name</label>
                <input type="text" required autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Complete Figma Mastery Course" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)]/40 outline-none text-gray-900 dark:text-white placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                      className={`flex items-center gap-3 p-3 border rounded-xl text-left transition ${category === c.value ? 'border-[var(--accent)] bg-[var(--bg-tertiary)]' : 'border-gray-200 dark:border-gray-700 hover:border-[var(--accent)]'}`}>
                      <c.icon className={`w-5 h-5 shrink-0 ${category === c.value ? 'text-[var(--text-primary)]' : 'text-gray-400'}`} />
                      <div>
                        <div className={`text-xs font-semibold ${category === c.value ? 'text-[var(--text-primary)]' : 'text-gray-700 dark:text-gray-300'}`}>{c.label}</div>
                        <div className="text-xs text-gray-400">{c.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Starting Price (INR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">{'\u20B9'}</span>
                  <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)]/40 outline-none text-gray-900 dark:text-white font-mono" />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">You can change pricing anytime after creation.</p>
              </div>
              <button type="submit" disabled={isCreating || !name.trim()} className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-fg)] py-3 rounded-xl font-bold text-sm shadow-sm transition-all">
                {isCreating ? 'Creating...' : 'Create Product \u2192'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Create Upsell Modal ═══ */}
      {upsellModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D0D1F] rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {upsellStep === 'info' ? 'What are Upsell Pages?' : 'Create Upsell Page'}
              </h2>
              <button onClick={() => setUpsellModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {upsellStep === 'info' ? (
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-xl flex items-center justify-center shrink-0">
                      <Sparkles className="w-6 h-6 text-[var(--text-secondary)]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Standalone Checkout Pages</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        An upsell page is a shareable checkout link for your product. You can add 1-2 optional add-on products that buyers can include with their purchase.
                      </p>
                    </div>
                  </div>
                  <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">How it works:</p>
                    <ul className="text-xs text-[var(--text-primary)] dark:text-[var(--text-secondary)] space-y-1.5">
                      <li className="flex items-start gap-2"><span className="mt-0.5">1.</span> Pick a primary product for your checkout page</li>
                      <li className="flex items-start gap-2"><span className="mt-0.5">2.</span> Optionally add 1-2 upsell products as add-ons</li>
                      <li className="flex items-start gap-2"><span className="mt-0.5">3.</span> Share the link — buyers see a clean checkout with add-on offers</li>
                      <li className="flex items-start gap-2"><span className="mt-0.5">4.</span> Increase average order value by 20-40%</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => setUpsellStep('select')}
                    disabled={products.length === 0}
                    className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-fg)] py-3 rounded-xl font-bold text-sm shadow-sm transition-all"
                  >
                    {products.length === 0 ? 'Create a product first' : 'Get Started \u2192'}
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Page Title</label>
                    <input
                      type="text" value={upsellTitle}
                      onChange={e => setUpsellTitle(e.target.value)}
                      className={INPUT}
                      placeholder={products.find((p: any) => p.id === primaryId)?.name || 'e.g. Special Bundle Offer'}
                    />
                  </div>

                  {/* Primary Product */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Primary Product *</label>
                    <input
                      type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                      placeholder="Search products..."
                      className={`${INPUT} mb-2`}
                    />
                    <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredProducts.map((p: any) => (
                        <button
                          key={p.id} type="button"
                          onClick={() => { setPrimaryId(p.id); setSecondaryIds(ids => ids.filter(id => id !== p.id)); if (!upsellTitle) setUpsellTitle(p.name); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition ${
                            primaryId === p.id ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          {p.thumbnail_url ? (
                            <img src={p.thumbnail_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                              <Package className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                            <p className="text-xs text-gray-500">{formatINR(p.price || 0)}</p>
                          </div>
                          {primaryId === p.id && <CheckCircle2 className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Secondary Products */}
                  {primaryId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Upsell Products <span className="text-gray-400 font-normal">(optional, max 2)</span>
                      </label>
                      <div className="space-y-1.5">
                        {products.filter((p: any) => p.id !== primaryId).map((p: any) => {
                          const selected = secondaryIds.includes(p.id);
                          const disabled = !selected && secondaryIds.length >= 2;
                          return (
                            <button
                              key={p.id} type="button" disabled={disabled}
                              onClick={() => setSecondaryIds(ids => selected ? ids.filter(id => id !== p.id) : [...ids, p.id])}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition ${
                                selected ? 'bg-[var(--bg-tertiary)] border border-[var(--border)] dark:border-[var(--border)]'
                                  : disabled ? 'opacity-40 cursor-not-allowed'
                                  : 'border border-gray-200 dark:border-gray-700 hover:border-[var(--border)]'
                              }`}
                            >
                              <input type="checkbox" checked={selected} readOnly className="accent-[var(--accent)] w-4 h-4 shrink-0" />
                              <p className="text-sm text-gray-900 dark:text-white truncate flex-1">{p.name}</p>
                              <p className="text-xs text-gray-500 shrink-0">{formatINR(p.price || 0)}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleCreateUpsell}
                    disabled={!primaryId || upsellCreating}
                    className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-fg)] py-3 rounded-xl font-bold text-sm shadow-sm transition-all"
                  >
                    {upsellCreating ? 'Creating...' : 'Create Upsell Page'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Delete Confirm ═══ */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D0D1F] rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-800 p-6 text-center">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Upsell Page?</h3>
            <p className="text-sm text-gray-500 mb-6">This will permanently remove the upsell page and its public link.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Cancel
              </button>
              <button onClick={handleDeleteUpsell} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
