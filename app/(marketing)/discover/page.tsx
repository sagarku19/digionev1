'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, Package, Layout, Layers,
  ArrowRight, Sparkles, TrendingUp, Clock, X,
  GraduationCap, Music, Code2, Camera, Briefcase,
} from 'lucide-react';
import { Rails, Kicker } from '@/src/components/marketing/Ledger';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

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
  images: string[] | null;
  created_at: string | null;
  creator_id: string;
  profiles: Creator | Creator[] | null;
}

const CATEGORIES = [
  { value: 'all', label: 'All Products', icon: Layers },
  { value: 'digital', label: 'Digital Downloads', icon: Package },
  { value: 'course', label: 'Courses & Education', icon: GraduationCap },
  { value: 'template', label: 'Design & Templates', icon: Layout },
  { value: 'music', label: 'Music & Audio', icon: Music },
  { value: 'software', label: 'Code & Software', icon: Code2 },
  { value: 'business', label: 'Business & Finance', icon: Briefcase },
  { value: 'photography', label: 'Photography & Presets', icon: Camera },
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
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'price_low' | 'price_high'>('latest');
  const [showFilters, setShowFilters] = useState(false);

  // debounce the search input (UI logic, not data fetching)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: products = [], isLoading: loading } = useQuery({
    queryKey: ['discover', 'list', debouncedSearch, activeCategory],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase
        .from('products')
        .select(`
          id, name, description, price, category, thumbnail_url, images, created_at,
          creator_id,
          profiles!fk_products_creator ( id, full_name, avatar_url )
        `)
        .eq('is_published', true)
        .eq('is_on_discover_page', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (debouncedSearch) query = query.ilike('name', `%${debouncedSearch}%`);
      if (activeCategory !== 'all') query = query.eq('category', activeCategory);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

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
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(22,19,15,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(22,19,15,0.035) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
          }}
        />
        <Rails className="pt-28 sm:pt-36">
          <div className="px-5 sm:px-10 lg:px-14 pb-10">
            <Kicker index="00" route="/discover" />
            <h1 className="mt-7 sm:mt-9 text-[36px] sm:text-[52px] font-bold tracking-[-0.04em] leading-[1.05] text-[#16130F] max-w-2xl">
              Find the best
              <br />
              <span className="text-[#E83A2E]">digital products.</span>
            </h1>
            <p className="mt-6 text-[15px] sm:text-[17px] font-medium text-black/50 max-w-xl leading-relaxed">
              Browse products made by India&apos;s top creators.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mt-8">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30 transition-colors" />
                <input
                  type="text"
                  placeholder="Search products, courses, templates..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-white border border-black/[0.1] rounded-lg text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-black/35 hover:text-[#16130F] transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Pills + Filter Toggle */}
            <div className="flex flex-wrap items-center gap-2 mt-5">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const active = activeCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setActiveCategory(cat.value)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors duration-200 ${
                      active
                        ? 'bg-[#16130F] text-white'
                        : 'bg-white text-black/55 border border-black/[0.1] hover:border-black/[0.25] hover:text-[#16130F]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                  </button>
                );
              })}

              <button
                onClick={() => setShowFilters(f => !f)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors duration-200 border ${
                  showFilters
                    ? 'bg-[#FAF8F6] text-[#16130F] border-black/[0.25]'
                    : 'bg-white text-black/55 border-black/[0.1] hover:border-black/[0.25] hover:text-[#16130F]'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
            </div>

            {/* Filter Row */}
            {showFilters && (
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="font-ledger text-[10px] text-black/35 uppercase tracking-[0.18em]">Sort by</span>
                {[
                  { value: 'latest', label: 'Latest', icon: Clock },
                  { value: 'popular', label: 'Trending', icon: TrendingUp },
                  { value: 'price_low', label: 'Price: Low', icon: ArrowRight },
                  { value: 'price_high', label: 'Price: High', icon: ArrowRight },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value as 'latest' | 'popular' | 'price_low' | 'price_high')}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors duration-200 ${
                      sortBy === opt.value
                        ? 'bg-[#FAF8F6] text-[#16130F] border border-black/[0.15]'
                        : 'text-black/45 hover:text-[#16130F] hover:bg-black/[0.03]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Rails>
      </section>

      {/* Results */}
      <section className="relative bg-white">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <div className="px-5 sm:px-10 lg:px-14 py-10">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white border border-black/[0.07] rounded-xl overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-black/[0.04]" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-black/[0.04] rounded-lg w-3/4" />
                      <div className="h-3 bg-black/[0.04] rounded-lg w-1/2" />
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-5 bg-black/[0.04] rounded-lg w-16" />
                        <div className="h-6 w-6 bg-black/[0.04] rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="text-center py-24">
                <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-[#FAF8F6] border border-black/[0.07] flex items-center justify-center">
                  <Search className="w-6 h-6 text-black/35" />
                </div>
                <h3 className="text-[17px] font-bold text-[#16130F] mb-1">No products found</h3>
                <p className="text-[13.5px] font-medium text-black/50">
                  {search ? `No results for "${search}". Try a different search term.` : 'No discoverable products yet. Check back soon!'}
                </p>
              </div>
            ) : groupedByCategory ? (
              /* Sectioned View (All categories) */
              <div className="space-y-14">
                {/* Featured / Trending */}
                {featuredProducts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-4 font-ledger text-[11px] mb-6">
                      <span className="text-[#E83A2E] font-semibold">{'>>'}</span>
                      <span className="text-black/35 uppercase tracking-[0.18em]">Trending · Most popular this week</span>
                      <span aria-hidden="true" className="h-px flex-1 bg-black/[0.07]" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {featuredProducts.map(product => (
                        <ProductCard key={product.id} product={product} featured />
                      ))}
                    </div>
                  </div>
                )}

                {/* Category Sections */}
                {Object.entries(groupedByCategory).map(([cat, items]) => {
                  const catInfo = CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-4 font-ledger text-[11px] mb-6">
                        <span className="text-[#E83A2E] font-semibold">{'>>'}</span>
                        <span className="text-black/35 uppercase tracking-[0.18em]">
                          {catInfo.label} · {items.length} product{items.length !== 1 ? 's' : ''}
                        </span>
                        <span aria-hidden="true" className="h-px flex-1 bg-black/[0.07]" />
                        <button
                          onClick={() => setActiveCategory(cat)}
                          className="font-sans text-[12px] text-black/45 hover:text-[#16130F] font-semibold flex items-center gap-1 transition-colors"
                        >
                          View all <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  <p className="font-ledger text-[11px] text-black/35">
                    {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Rails>
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
      className="group flex flex-col bg-white border border-black/[0.07] rounded-xl overflow-hidden hover:border-black/[0.2] transition-colors duration-200"
    >
      {/* Image */}
      <div className="aspect-[4/3] relative overflow-hidden bg-[#FAF8F6] border-b border-black/[0.05]">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-black/20" />
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className="font-ledger px-2.5 py-1 bg-[#16130F]/85 backdrop-blur-md text-white text-[9px] font-medium uppercase tracking-[0.14em] rounded-md">
            {catLabel}
          </span>
        </div>

        {/* Price badge */}
        <div className="absolute bottom-3 right-3">
          <span className={`font-ledger px-2.5 py-1 backdrop-blur-md text-[13px] font-semibold rounded-md ${
            product.price === 0
              ? 'bg-emerald-600/85 text-white'
              : 'bg-[#16130F]/85 text-white'
          }`}>
            {formatPrice(product.price)}
          </span>
        </div>

        {featured && (
          <div className="absolute top-3 right-3">
            <span className="font-ledger px-2 py-1 bg-[#E83A2E]/90 text-white text-[9px] font-semibold uppercase tracking-[0.14em] rounded-md flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Hot
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-[14.5px] font-bold text-[#16130F] line-clamp-2 mb-1 group-hover:text-[#E83A2E] transition-colors duration-200">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-[12px] font-medium text-black/45 line-clamp-2 mb-3">{product.description}</p>
        )}

        {/* Creator */}
        {creator && (
          <div className="mt-auto pt-3 border-t border-black/[0.05] flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#E83A2E] flex items-center justify-center shrink-0 overflow-hidden">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-[9px] font-bold">
                  {(creator.full_name || 'C').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-[12px] font-medium text-black/45 truncate">{creator.full_name || 'Creator'}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
