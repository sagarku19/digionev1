'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, Package, BookOpen, Layout, Layers,
  ArrowRight, Sparkles, TrendingUp, Clock, X,
} from 'lucide-react';

interface Creator {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  thumbnail_url: string | null;
  images: any;
  created_at: string | null;
  creator_id: string;
  profiles: Creator | Creator[] | null;
}

const CATEGORIES = [
  { value: 'all', label: 'All Products', icon: Layers },
  { value: 'digital', label: 'Digital Downloads', icon: Package },
  { value: 'course', label: 'Courses', icon: BookOpen },
  { value: 'template', label: 'Templates', icon: Layout },
  { value: 'other', label: 'Other', icon: Sparkles },
];

function getCreator(product: Product): Creator | null {
  if (!product.profiles) return null;
  if (Array.isArray(product.profiles)) return product.profiles[0] ?? null;
  return product.profiles;
}

function formatPrice(price: number) {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
}

export default function DiscoverPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'price_low' | 'price_high'>('latest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('q', search);
        if (activeCategory !== 'all') params.set('category', activeCategory);
        params.set('limit', '100');
        const res = await fetch(`/api/discover?${params}`);
        const data = await res.json();
        setProducts(data.products || []);
      } catch {
        setProducts([]);
      }
      setLoading(false);
    };

    const debounce = setTimeout(fetchProducts, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [search, activeCategory]);

  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    switch (sortBy) {
      case 'price_low': sorted.sort((a, b) => a.price - b.price); break;
      case 'price_high': sorted.sort((a, b) => b.price - a.price); break;
      case 'latest':
      default:
        sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }
    return sorted;
  }, [products, sortBy]);

  // Group products by category for sectioned view
  const groupedByCategory = useMemo(() => {
    if (activeCategory !== 'all') return null;
    const groups: Record<string, Product[]> = {};
    sortedProducts.forEach(p => {
      const cat = p.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [sortedProducts, activeCategory]);

  const featuredProducts = useMemo(() => sortedProducts.slice(0, 6), [sortedProducts]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/8 rounded-full blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-medium mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              Discover amazing digital products
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent mb-4">
              Discover
            </h1>
            <p className="text-lg text-slate-400 max-w-xl mx-auto">
              Explore courses, templates, digital downloads and more from talented creators across India.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="text"
                placeholder="Search products, courses, templates..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-white/[0.04] border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-indigo-500/30 transition-all text-base"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category Pills + Filter Toggle */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const active = activeCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                      : 'bg-white/[0.04] text-slate-400 border border-white/8 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.label}
                </button>
              );
            })}

            <button
              onClick={() => setShowFilters(f => !f)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                showFilters ? 'bg-white/10 text-white border-white/20' : 'bg-white/[0.04] text-slate-400 border-white/8 hover:bg-white/[0.08]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Filter Row */}
          {showFilters && (
            <div className="flex items-center justify-center gap-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Sort by</span>
              {[
                { value: 'latest', label: 'Latest', icon: Clock },
                { value: 'popular', label: 'Trending', icon: TrendingUp },
                { value: 'price_low', label: 'Price: Low', icon: ArrowRight },
                { value: 'price_high', label: 'Price: High', icon: ArrowRight },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sortBy === opt.value
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-500 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-white/[0.05]" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-white/[0.06] rounded-lg w-3/4" />
                  <div className="h-3 bg-white/[0.04] rounded-lg w-1/2" />
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-5 bg-white/[0.06] rounded-lg w-16" />
                    <div className="h-6 w-6 bg-white/[0.05] rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center">
              <Search className="w-7 h-7 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-1">No products found</h3>
            <p className="text-sm text-slate-500">
              {search ? `No results for "${search}". Try a different search term.` : 'No discoverable products yet. Check back soon!'}
            </p>
          </div>
        ) : groupedByCategory ? (
          /* Sectioned View (All categories) */
          <div className="space-y-14">
            {/* Featured / Trending */}
            {featuredProducts.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20">
                    <TrendingUp className="w-4.5 h-4.5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Trending Now</h2>
                    <p className="text-xs text-slate-500">Most popular products this week</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {featuredProducts.map(product => (
                    <ProductCard key={product.id} product={product} featured />
                  ))}
                </div>
              </div>
            )}

            {/* Category Sections */}
            {Object.entries(groupedByCategory).map(([cat, items]) => {
              const catInfo = CATEGORIES.find(c => c.value === cat) || CATEGORIES[4];
              const Icon = catInfo.icon;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <Icon className="w-4.5 h-4.5 text-indigo-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{catInfo.label}</h2>
                        <p className="text-xs text-slate-500">{items.length} product{items.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveCategory(cat)}
                      className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                    >
                      View all <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {items.slice(0, 4).map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Filtered View (single category) */
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-slate-500">{sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''} found</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {sortedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ── Product Card ──────────────────────────────────────────────── */
function ProductCard({ product, featured = false }: { product: Product; featured?: boolean }) {
  const creator = getCreator(product);
  const imgSrc = product.thumbnail_url || (Array.isArray(product.images) ? product.images[0] : null);
  const catLabel = CATEGORIES.find(c => c.value === product.category)?.label || product.category || 'Digital';

  return (
    <Link
      href={`/discover/${product.id}`}
      className={`group flex flex-col bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-indigo-500/30 hover:bg-white/[0.04] transition-all duration-300 ${
        featured ? 'ring-1 ring-amber-500/10' : ''
      }`}
    >
      {/* Image */}
      <div className="aspect-[4/3] relative overflow-hidden bg-white/[0.03]">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-slate-700" />
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg">
            {catLabel}
          </span>
        </div>

        {/* Price badge */}
        <div className="absolute bottom-3 right-3">
          <span className={`px-2.5 py-1 backdrop-blur-md text-sm font-bold rounded-lg ${
            product.price === 0
              ? 'bg-emerald-500/80 text-white'
              : 'bg-black/60 text-white'
          }`}>
            {formatPrice(product.price)}
          </span>
        </div>

        {featured && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 bg-amber-500/90 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Hot
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-[15px] font-semibold text-white line-clamp-2 mb-1 group-hover:text-indigo-300 transition-colors">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3">{product.description}</p>
        )}

        {/* Creator */}
        {creator && (
          <div className="mt-auto pt-3 border-t border-white/[0.05] flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 overflow-hidden">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-[9px] font-bold">
                  {(creator.full_name || 'C').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 truncate">{creator.full_name || 'Creator'}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
