'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Download, Library, ExternalLink, Package, FileText, BookOpen, Tag, Search } from 'lucide-react';

interface PurchasedProduct {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  price_at_purchase: number;
  purchased_at: string;
  file_url: string | null;
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  digital: FileText,
  course: BookOpen,
  template: Tag,
  other: Package,
};

export default function LibraryPage() {
  const [products, setProducts] = useState<PurchasedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          order_items (
            price_at_purchase,
            products (
              id, name, description, thumbnail_url, category, file_url
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      if (data) {
        const flat: PurchasedProduct[] = [];
        for (const order of data) {
          for (const item of (order.order_items as any[]) ?? []) {
            const p = item.products;
            if (!p) continue;
            flat.push({
              id: p.id,
              name: p.name,
              description: p.description,
              thumbnail_url: p.thumbnail_url,
              category: p.category,
              file_url: p.file_url,
              price_at_purchase: item.price_at_purchase,
              purchased_at: order.created_at,
            });
          }
        }
        // dedupe by product id (keep first / latest)
        const seen = new Set<string>();
        setProducts(flat.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; }));
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pb-16 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">My Library</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Products you&apos;ve purchased across DigiOne.
        </p>
      </div>

      {/* Search */}
      {products.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your library..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-[var(--text-primary)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10 transition-all"
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 animate-pulse">
              <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-zinc-900 rounded-xl mb-4" />
              <div className="h-4 bg-gray-100 dark:bg-zinc-900 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-zinc-900 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
          <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center mb-4">
            <Library className="w-8 h-8 text-gray-400 dark:text-zinc-500" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Your library is empty</h2>
          <p className="text-sm text-gray-400 dark:text-zinc-500 max-w-xs">
            Products you purchase from creators will appear here.
          </p>
        </div>
      )}

      {/* No search results */}
      {!isLoading && products.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16 border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
          <p className="text-sm text-gray-400">No products match &ldquo;{search}&rdquo;</p>
          <button onClick={() => setSearch('')} className="text-sm font-semibold text-gray-700 dark:text-[var(--text-secondary)] mt-2 hover:underline">Clear search</button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => {
            const CategoryIcon = CATEGORY_ICON[product.category ?? 'other'] ?? Package;
            const purchaseDate = new Date(product.purchased_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

            return (
              <div key={product.id} className="flex flex-col bg-white dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden hover:border-gray-300 dark:hover:border-zinc-700 transition-all">
                {/* Thumbnail */}
                <div className="w-full aspect-[4/3] bg-gray-50 dark:bg-zinc-900 overflow-hidden">
                  {product.thumbnail_url ? (
                    <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover object-center" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-zinc-700">
                      <CategoryIcon className="w-10 h-10 opacity-40" />
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-sm text-[var(--text-primary)] line-clamp-1 mb-1">{product.name}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-3">
                    <CategoryIcon className="w-3 h-3" />
                    <span>{product.category ?? 'Digital'}</span>
                    <span className="mx-1">·</span>
                    <span>{purchaseDate}</span>
                  </div>

                  <div className="mt-auto flex items-center gap-2">
                    {product.file_url ? (
                      <a
                        href={product.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-gray-700 dark:hover:bg-gray-100 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    ) : (
                      <span className="flex-1 flex items-center justify-center py-2 bg-gray-100 dark:bg-zinc-900 text-gray-400 dark:text-zinc-600 rounded-lg text-xs font-bold cursor-not-allowed">
                        No file yet
                      </span>
                    )}
                    <a
                      href={`/store/product/${product.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-zinc-900 hover:bg-gray-200 dark:hover:bg-zinc-800 text-[var(--text-secondary)] rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
