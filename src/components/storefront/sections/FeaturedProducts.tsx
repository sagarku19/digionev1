// FeaturedProducts section — shows curated products (settings.product_ids)
// resolved against the site's real assigned products; falls back to the first
// 3 published products. Placeholder demo cards render only when the store has
// no real products (display-only, no cart).

import React from 'react';
import Link from 'next/link';
import type { StorefrontProduct } from '../SectionRenderer';
import { AddToCartButton } from '@/components/store/AddToCartButton';

interface FeaturedProductsSettings {
  title?: string;
  subtitle?: string;
  product_ids?: string[];
}

const PLACEHOLDERS = [
  { id: 'demo-1', name: 'Digital Course Demo', price: 4999, thumbnail_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=600' },
  { id: 'demo-2', name: 'Premium Notion Template', price: 999, thumbnail_url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=600' },
  { id: 'demo-3', name: 'Design System Kit', price: 2999, thumbnail_url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=600' },
];

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function FeaturedProducts({
  settings,
  products = [],
  creatorId,
}: {
  settings: Record<string, unknown>;
  products?: StorefrontProduct[];
  creatorId?: string;
}) {
  // reason: section settings is jsonb; narrow once to the typed view
  const s = settings as unknown as FeaturedProductsSettings;
  const title = s?.title || 'Featured Products';
  const subtitle = s?.subtitle || 'Explore my top selling digital items.';
  const productIds = s?.product_ids || [];

  const published = products.filter((p) => p.is_published);
  const byId = new Map(published.map((p) => [p.id, p]));
  const selected = productIds.length
    ? productIds.flatMap((id) => { const p = byId.get(id); return p ? [p] : []; })
    : published.slice(0, 3);

  return (
    <section id="products" className="w-full py-20 bg-[--creator-bg]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-[--creator-text] mb-4">{title}</h2>
          {subtitle && (
            <p className="text-lg text-[--creator-text-muted] max-w-2xl mx-auto">{subtitle}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {selected.length > 0
            ? selected.map((product) => (
                <div
                  key={product.id}
                  className="group flex flex-col bg-[--creator-surface] rounded-2xl overflow-hidden border border-[--creator-border] hover:border-[--creator-primary] transition-all duration-300 hover:shadow-xl"
                >
                  <Link href={`/discover/${product.id}`} className="flex flex-col flex-1">
                    <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {product.thumbnail_url ? (
                        <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[--creator-text-muted]">No Image</div>
                      )}
                    </div>
                    <div className="p-6 pb-0 flex flex-col flex-1 text-left">
                      <h3 className="font-bold text-lg text-[--creator-text] mb-2 group-hover:text-[--creator-primary] transition-colors">{product.name}</h3>
                      <span className="font-bold text-[--creator-text]">{formatINR(product.price ?? 0)}</span>
                    </div>
                  </Link>
                  {creatorId && (
                    <div className="p-6 pt-4">
                      <AddToCartButton
                        item={{
                          id: product.id,
                          title: product.name,
                          price: product.price ?? 0,
                          creatorId,
                          coverImage: product.thumbnail_url,
                          slug: product.id,
                        }}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              ))
            : PLACEHOLDERS.map((product) => (
                <div key={product.id} className="flex flex-col bg-[--creator-surface] rounded-2xl overflow-hidden border border-[--creator-border]">
                  <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6 flex flex-col flex-1 text-left">
                    <h3 className="font-bold text-lg text-[--creator-text] mb-2">{product.name}</h3>
                    <span className="mt-auto pt-4 font-bold text-[--creator-text]">{formatINR(product.price)}</span>
                  </div>
                </div>
              ))}
        </div>

      </div>
    </section>
  );
}
