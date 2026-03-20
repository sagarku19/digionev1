'use client';
// ProductSalesPage — single product sales page (site_type: single).
// DB tables: site_singlepage, products (read via props)

import React, { useState } from 'react';
import { ShoppingCart, Shield, Star, ChevronDown, ChevronUp } from 'lucide-react';

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function ProductSalesPage({ siteId, singlePage }: { siteId: string; singlePage: any }) {
  const product = Array.isArray(singlePage?.products) ? singlePage.products[0] : singlePage?.products;
  const title = singlePage?.title ?? product?.name ?? 'Product';
  const price = product?.price ?? 0;
  // NOTE: products table has no compare_at_price column (only product_bundles does).
  // compareAt is intentionally omitted here.
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = singlePage?.faq_items ?? [
    { q: 'Is there a refund policy?', a: 'Yes. If you\'re not satisfied within 7 days, we offer a full refund.' },
    { q: 'How do I access after purchase?', a: 'You\'ll get instant access via email download link and in your DigiOne library.' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="py-16 px-4 bg-gradient-to-b from-[--creator-primary]/5 to-transparent">
        <div className="max-w-6xl mx-auto grid md:grid-cols-5 gap-12 items-start">
          {/* Left — 60% */}
          <div className="md:col-span-3 space-y-6">
            {product?.thumbnail_url && (
              <img src={product.thumbnail_url} alt={title} className="w-full rounded-2xl shadow-xl" />
            )}
            <h1 className="text-3xl md:text-4xl font-extrabold text-[--creator-text]">{title}</h1>
            {product?.description && (
              <p className="text-[--creator-text-muted] leading-relaxed">{product.description}</p>
            )}

            {/* What's included */}
            {singlePage?.includes && (
              <div>
                <h2 className="text-xl font-bold text-[--creator-text] mb-4">What's included</h2>
                <ul className="space-y-2">
                  {(singlePage.includes as string[]).map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[--creator-text]">
                      <span className="text-emerald-500 font-bold">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* FAQ */}
            {faqs.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-[--creator-text] mb-4">FAQ</h2>
                <div className="space-y-2">
                  {faqs.map((f: any, i: number) => (
                    <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left font-medium text-sm text-[--creator-text]"
                      >
                        {f.q}
                        {openFaq === i ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                      </button>
                      {openFaq === i && (
                        <div className="px-5 pb-4 text-sm text-[--creator-text-muted]">{f.a}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — sticky purchase box 40% */}
          <div className="md:col-span-2">
            <div className="sticky top-24 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-7 shadow-xl space-y-5">
              <div>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-extrabold text-[--creator-text]">{formatINR(price)}</span>
                </div>
              </div>

              <a
                href={product?.id ? `/api/checkout?productId=${product.id}` : '#'}
                className="flex items-center justify-center gap-2 w-full bg-[--creator-primary] hover:opacity-90 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-[--creator-primary]/30 text-base"
              >
                <ShoppingCart className="w-5 h-5" />
                Buy now {price === 0 ? '(Free)' : formatINR(price)}
              </a>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-3 pt-2">
                {['Instant access', 'Secure payment', '7-day refund'].map(badge => (
                  <span key={badge} className="flex items-center gap-1.5 text-xs text-[--creator-text-muted]">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" /> {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-[#060612]/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 md:hidden z-50">
        <a
          href={product?.id ? `/api/checkout?productId=${product.id}` : '#'}
          className="flex items-center justify-center gap-2 w-full bg-[--creator-primary] text-white font-bold py-4 rounded-2xl text-base"
        >
          <ShoppingCart className="w-5 h-5" />
          Buy now — {price === 0 ? 'Free' : formatINR(price)}
        </a>
      </div>
    </div>
  );
}
