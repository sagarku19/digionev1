'use client';
// Products list page — shows all creator products in a card grid with a create modal.
// DB tables: products (read/write via useProducts)

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import { Plus, X, Package, FileText, Tag, BookOpen, Search, Edit3, Eye, MoreVertical } from 'lucide-react';

const CATEGORIES = [
  { value: 'digital', label: 'Digital File', icon: FileText, desc: 'PDF, ZIP, video, audio' },
  { value: 'course', label: 'Course', icon: BookOpen, desc: 'Structured learning' },
  { value: 'template', label: 'Template', icon: Tag, desc: 'Design or code templates' },
  { value: 'other', label: 'Other', icon: Package, desc: 'Custom digital product' },
];

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function ProductsPage() {
  const router = useRouter();
  const { products, isLoading, createProduct, isCreating } = useProducts();
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('digital');
  const [price, setPrice] = useState('');

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

  return (
    <div className="space-y-6 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your digital products, courses, and downloads.</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Product
        </button>
      </div>

      {/* Search */}
      {products.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-5">
            <Package className="w-10 h-10 text-indigo-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No products yet</h2>
          <p className="text-gray-500 text-sm max-w-xs mb-6">Create your first digital product and start selling in minutes.</p>
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create your first product
          </button>
        </div>
      )}

      {/* Product card grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product: any) => (
            <div
              key={product.id}
              className="group bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-lg transition-all duration-200"
            >
              {/* Thumbnail */}
              <div className="relative w-full h-36 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 overflow-hidden">
                {product.thumbnail_url ? (
                  <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-indigo-300 dark:text-indigo-700" />
                  </div>
                )}
                {/* Status badge */}
                <div className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full ${product.is_published
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                  {product.is_published ? 'Published' : 'Draft'}
                </div>
              </div>

              {/* Content */}
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

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => router.push(`/dashboard/products/${product.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 py-2 rounded-lg transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    className="flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 py-2 px-3 rounded-lg transition"
                    title="View product"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No search results */}
      {!isLoading && products.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500">No products match &ldquo;{search}&rdquo;</p>
          <button onClick={() => setSearch('')} className="text-indigo-500 text-sm mt-2 hover:underline">Clear search</button>
        </div>
      )}

      {/* Create modal */}
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
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Product Name</label>
                <input
                  type="text" required autoFocus value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Complete Figma Mastery Course"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.value} type="button" onClick={() => setCategory(c.value)}
                      className={`flex items-center gap-3 p-3 border rounded-xl text-left transition ${category === c.value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                        }`}
                    >
                      <c.icon className={`w-5 h-5 shrink-0 ${category === c.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                      <div>
                        <div className={`text-xs font-semibold ${category === c.value ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>{c.label}</div>
                        <div className="text-xs text-gray-400">{c.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Starting Price (INR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number" min="0" value={price} onChange={e => setPrice(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white font-mono"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">You can change pricing anytime after creation.</p>
              </div>

              <button
                type="submit"
                disabled={isCreating || !name.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all"
              >
                {isCreating ? 'Creating…' : 'Create Product →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
