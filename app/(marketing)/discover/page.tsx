'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Rails } from '@/src/components/marketing/Ledger';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { PRODUCT_CATEGORIES } from '@/lib/shared/product-categories';
import { DiscoverCard } from '@/components/marketing/DiscoverCard';

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
}

type SortBy = 'latest' | 'price_low' | 'price_high';

const TABS = [{ value: 'all', short: 'All' }, ...PRODUCT_CATEGORIES];

export default function DiscoverPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortBy>('latest');

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
        .select('id, name, description, price, category, thumbnail_url, images, created_at, creator_id')
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header — compact: title + search + category tab rail */}
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
        <Rails className="pt-24 sm:pt-28">
          <div className="px-5 sm:px-10 lg:px-14">
            <div className="pb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-[30px] sm:text-[40px] font-bold tracking-[-0.04em] leading-[1.05] text-[#16130F]">
                  Discover <span className="text-[#E83A2E]">digital products.</span>
                </h1>
                <p className="mt-2.5 text-[14px] sm:text-[15px] font-medium text-black/50">
                  Made and sold by India&apos;s top creators.
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full lg:w-[340px] shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                <input
                  type="text"
                  placeholder="Search products…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-black/[0.1] rounded-lg text-[13.5px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/35 hover:text-[#16130F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/30 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Category tab rail */}
            <nav
              aria-label="Product categories"
              className="flex items-center gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {TABS.map(tab => {
                const active = activeCategory === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveCategory(tab.value)}
                    className={`shrink-0 whitespace-nowrap pb-3 text-[13px] font-semibold border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/30 rounded-t ${
                      active
                        ? 'border-[#E83A2E] text-[#16130F]'
                        : 'border-transparent text-black/45 hover:text-[#16130F]'
                    }`}
                  >
                    {tab.short}
                  </button>
                );
              })}
            </nav>
          </div>
        </Rails>
      </section>

      {/* Results */}
      <section className="relative bg-white">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <div className="px-5 sm:px-10 lg:px-14 py-8 sm:py-10">
            {/* Count + sort */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <p className="font-ledger text-[11px] text-black/35 uppercase tracking-[0.18em]">
                {loading ? 'Loading' : `${sortedProducts.length} product${sortedProducts.length !== 1 ? 's' : ''}`}
              </p>
              <label className="flex items-center gap-2">
                <span className="sr-only">Sort products</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortBy)}
                  className="bg-white border border-black/[0.1] rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-[#16130F] focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all"
                >
                  <option value="latest">Newest</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </label>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-black/[0.08] animate-pulse">
                    <div className="aspect-[16/10] bg-black/[0.05]" />
                    <div className="p-4 sm:p-5">
                      <div className="h-4 w-3/4 rounded bg-black/[0.05]" />
                      <div className="mt-2.5 h-3 w-full rounded bg-black/[0.04]" />
                      <div className="mt-1.5 h-3 w-2/3 rounded bg-black/[0.04]" />
                      <div className="mt-4 h-5 w-16 rounded bg-black/[0.05]" />
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
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {sortedProducts.map(product => (
                  <DiscoverCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </Rails>
      </section>
    </div>
  );
}
