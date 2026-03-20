'use client';
// ProductGrid section — displays products in a configurable column grid.
// DB tables: products (via props, no direct fetch)

import React from 'react';
import Link from 'next/link';

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function ProductGrid({ settings, products = [] }: { settings: any; products?: any[] }) {
  const title     = settings?.title     ?? '';
  const columns   = settings?.columns   ?? 3;
  const showPrice = settings?.show_price !== false;
  const maxItems  = settings?.max_items  ?? 12;
  const colClass  = columns === 2
    ? 'sm:grid-cols-2'
    : columns === 4
    ? 'sm:grid-cols-2 lg:grid-cols-4'
    : 'sm:grid-cols-2 lg:grid-cols-3';

  const visible = products.filter((p: any) => p.is_published).slice(0, maxItems);

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto w-full" id="products">
      {title && <h2 className="text-3xl font-bold text-[--creator-text] mb-10 text-center">{title}</h2>}
      {visible.length === 0 ? (
        <p className="text-center text-[--creator-text-muted] py-12">No products available yet.</p>
      ) : (
        <div className={`grid grid-cols-1 ${colClass} gap-6`}>
          {visible.map((p: any) => (
            <Link
              key={p.id}
              href={p.slug ? `#${p.slug}` : '#'}
              className="group flex flex-col bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-xl hover:border-[--creator-primary]/30 transition-all"
            >
              {p.thumbnail_url && (
                <img
                  src={p.thumbnail_url}
                  alt={p.name}
                  className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-semibold text-[--creator-text] line-clamp-2 group-hover:text-[--creator-primary] transition-colors">
                  {p.name}
                </h3>
                {showPrice && (
                  <p className="mt-3 font-bold text-[--creator-primary]">{formatINR(p.price ?? 0)}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
