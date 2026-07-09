'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Library, ArrowRight, Search, Download, ExternalLink, Loader2, Package,
} from 'lucide-react';
import { Rails, Cross, Kicker } from '@/src/components/marketing/Ledger';
import LibraryAccountActions from '@/components/account/LibraryAccountActions';
import { useLibrary } from '@/hooks/commerce/useLibrary';

const INPUT =
  'w-full pl-10 pr-4 py-3 rounded-lg border border-black/[0.1] bg-white text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all';

function formatINR(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BuyerLibraryPage() {
  const { data: products = [], isLoading } = useLibrary();
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [rowNotice, setRowNotice] = useState<{ id: string; message: string } | null>(null);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  // Deliverables live in R2, not on the product row. Mint signed URLs on demand.
  const handleFiles = async (productId: string) => {
    setDownloadingId(productId);
    setRowNotice(null);
    try {
      const res = await fetch(`/api/deliverables/${productId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not prepare your download.');
      if (!data.files?.length) {
        // Link-only products deliver via the access link, not files — point there
        // instead of implying something is missing.
        const product = products.find((p) => p.id === productId);
        setRowNotice({
          id: productId,
          message: product?.access_url
            ? 'This product is delivered via a link — use "Open link" to access it.'
            : 'No downloadable files have been added to this product yet.',
        });
        return;
      }
      for (const file of data.files) {
        window.open(file.signedUrl, '_blank', 'noopener');
      }
    } catch (err) {
      setRowNotice({
        id: productId,
        message: err instanceof Error ? err.message : 'Download failed. Please try again.',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex flex-col w-full overflow-hidden bg-white">

      {/* Header */}
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
        <Rails className="pt-28 sm:pt-32">
          <div className="px-5 sm:px-10 lg:px-14 pb-10 sm:pb-12">
            <div className="max-w-3xl mx-auto">
              <Kicker route="/account/library" />
              <h1 className="mt-7 text-[30px] sm:text-[40px] font-bold tracking-[-0.04em] leading-[1.05] text-[#16130F]">
                My digital <span className="text-[#E83A2E]">library.</span>
              </h1>
              <p className="mt-4 text-[14px] sm:text-[15px] font-medium text-black/50 max-w-xl leading-relaxed">
                Access all of your purchased content, courses, and downloads across DigiOne.
              </p>
            </div>
          </div>
        </Rails>
      </section>

      {/* Content */}
      <section className="relative bg-white">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <Cross className="-bottom-[5px] -left-[5px]" />
          <Cross className="-bottom-[5px] -right-[5px]" />
          <div className="px-5 sm:px-10 lg:px-14 py-10 sm:py-14">

            {/* Loading */}
            {isLoading && (
              <div className="max-w-3xl mx-auto flex items-center justify-center gap-3 py-16">
                <span className="w-6 h-6 rounded-full border-2 border-black/[0.08] border-t-[#E83A2E] animate-spin" />
                <span className="font-ledger text-[11px] text-black/40 uppercase tracking-[0.18em]">Loading library…</span>
              </div>
            )}

            {/* Empty state — only when the query returns zero rows */}
            {!isLoading && products.length === 0 && (
              <div className="max-w-3xl mx-auto bg-white border border-black/[0.07] rounded-xl p-10 sm:p-14 text-center">
                <div className="w-14 h-14 rounded-lg bg-[#FAF8F6] border border-black/[0.07] flex items-center justify-center mx-auto mb-5">
                  <Library className="w-6 h-6 text-[#E83A2E]" strokeWidth={1.8} />
                </div>
                <p className="font-ledger text-[10px] uppercase tracking-[0.18em] text-black/35 mb-3">
                  0 items · No purchases yet
                </p>
                <h2 className="text-[19px] font-bold tracking-[-0.02em] text-[#16130F] mb-2">
                  Your library is currently empty
                </h2>
                <p className="text-[13.5px] font-medium text-black/50 max-w-sm mx-auto mb-7 leading-relaxed">
                  When you purchase templates, assets, or software from creators, they will appear here forever.
                </p>
                <Link
                  href="/discover"
                  className="group inline-flex items-center gap-2 bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Discover top products
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                </Link>
              </div>
            )}

            {/* Ledger table */}
            {!isLoading && products.length > 0 && (
              <div className="max-w-3xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
                  <p className="font-ledger text-[10px] uppercase tracking-[0.18em] text-black/35 shrink-0">
                    {products.length} item{products.length === 1 ? '' : 's'}
                  </p>
                  <div className="relative flex-1 max-w-sm sm:ml-auto">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search your library…"
                      className={INPUT}
                      aria-label="Search your library"
                    />
                  </div>
                </div>

                <div className="bg-white border border-black/[0.07] rounded-xl overflow-hidden">
                  {filtered.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <p className="text-[13.5px] font-medium text-black/50">
                        No products match &ldquo;{search}&rdquo;.
                      </p>
                    </div>
                  ) : (
                    filtered.map((p, i) => (
                      <div key={p.id} className={i > 0 ? 'border-t border-black/[0.07]' : ''}>
                        <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-[#FAF8F6] transition-colors">
                          {/* Thumbnail */}
                          <div className="w-12 h-12 rounded-lg bg-[#FAF8F6] border border-black/[0.07] overflow-hidden flex items-center justify-center shrink-0">
                            {p.thumbnail_url ? (
                              <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-black/25" strokeWidth={1.8} />
                            )}
                          </div>

                          {/* Name + mono meta */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-bold tracking-[-0.01em] text-[#16130F] truncate">{p.name}</p>
                            <p className="font-ledger text-[10px] uppercase tracking-[0.14em] text-black/35 mt-1">
                              {(p.category ?? 'digital')} · {formatDate(p.purchased_at)}
                            </p>
                          </div>

                          {/* Price */}
                          <span className="hidden sm:block font-ledger text-[13px] font-semibold text-[#16130F] shrink-0">
                            {formatINR(p.price_at_purchase)}
                          </span>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleFiles(p.id)}
                              disabled={downloadingId === p.id}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#16130F] hover:bg-black disabled:opacity-50 text-white text-[12.5px] font-semibold transition-colors"
                            >
                              {downloadingId === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              Files
                            </button>
                            {p.access_url && (
                              <a
                                href={p.access_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black/[0.1] hover:border-black/[0.25] text-[#16130F] text-[12.5px] font-semibold transition-colors"
                              >
                                Open link
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Per-row notice (empty deliverables / download error) */}
                        {rowNotice?.id === p.id && (
                          <div className="px-4 sm:px-5 pb-3.5 -mt-1">
                            <p className="text-[12.5px] font-medium text-[#E83A2E]">{rowNotice.message}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <LibraryAccountActions />
          </div>
        </Rails>
      </section>
    </div>
  );
}
