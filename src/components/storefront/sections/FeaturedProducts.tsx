import React from 'react';
import Link from 'next/link';

export default function FeaturedProducts({ settings }: { settings: any }) {
  const title = settings?.title || 'Featured Products';
  const subtitle = settings?.subtitle || 'Explore my top selling digital items.';
  const productIds = settings?.product_ids || [];
  
  // Note: In a real app, we would fetch the specific products using the IDs from Supabase or pass them from the page level.
  // For the storefront renderer demo, we render a placeholder grid if no products are explicitly passed.
  const products = settings?.products || [
    { id: '1', name: 'Digital Course Demo', price: 4999, thumbnail_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=600' },
    { id: '2', name: 'Premium Notion Template', price: 999, thumbnail_url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=600' },
    { id: '3', name: 'Design System Kit', price: 2999, thumbnail_url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=600' },
  ];

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
          {products.map((product: any) => (
            <Link key={product.id} href={`/product/${product.id}`} className="group flex flex-col bg-[--creator-surface] rounded-2xl overflow-hidden border border-[--creator-border] hover:border-[--creator-primary] transition-all duration-300 hover:shadow-xl">
              <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                {product.thumbnail_url ? (
                  <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[--creator-text-muted]">No Image</div>
                )}
              </div>
              <div className="p-6 flex flex-col flex-1 text-left">
                <h3 className="font-bold text-lg text-[--creator-text] mb-2 group-hover:text-[--creator-primary] transition-colors">{product.name}</h3>
                <div className="mt-auto pt-4 flex items-center justify-between">
                  <span className="font-bold text-[--creator-text]">₹{product.price}</span>
                  <span className="text-sm font-medium text-[--creator-primary]">View Details →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
