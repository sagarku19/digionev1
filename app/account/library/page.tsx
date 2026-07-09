'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Library, ArrowRight, Search, Download, ChevronDown, Loader2, Package,
} from 'lucide-react';
import { Rails, Cross, Kicker } from '@/src/components/marketing/Ledger';
import LibraryAccountActions from '@/components/account/LibraryAccountActions';
import { DeliveryLinks } from '@/components/store/DeliveryLinks';
import { useLibrary } from '@/hooks/commerce/useLibrary';
import { formatBytes } from '@/lib/format-bytes';

const INPUT =
  'w-full pl-10 pr-4 py-3 rounded-lg border border-black/[0.1] bg-white text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all';

function formatINR(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

type DeliverableFile = { name: string; signedUrl: string; bytes: number };
type FileState = { loading: boolean; files: DeliverableFile[]; error: string | null };

export default function BuyerLibraryPage() {
  const { data: products = [], isLoading } = useLibrary();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filesById, setFilesById] = useState<Record<string, FileState>>({});

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  // Deliverables live in R2, not on the product row. Fetch signed URLs once per
  // product when its row is expanded, then list each file as its own download
  // link (a single user gesture each — no multi-popup that browsers block).
  const toggleRow = async (productId: string) => {
    if (expandedId === productId) { setExpandedId(null); return; }
    setExpandedId(productId);
    if (filesById[productId]) return; // already loaded
    setFilesById((s) => ({ ...s, [productId]: { loading: true, files: [], error: null } }));
    try {
      const res = await fetch(`/api/deliverables/${productId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load your files.');
      const raw = (data.files ?? []) as Array<{ name?: string; signedUrl?: string; bytes?: number }>;
      const files: DeliverableFile[] = raw
        .filter((f) => typeof f.signedUrl === 'string')
        .map((f) => ({ name: f.name || 'File', signedUrl: f.signedUrl as string, bytes: Number(f.bytes) || 0 }));
      setFilesById((s) => ({ ...s, [productId]: { loading: false, files, error: null } }));
    } catch (err) {
      setFilesById((s) => ({
        ...s,
        [productId]: { loading: false, files: [], error: err instanceof Error ? err.message : 'Failed to load files.' },
      }));
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
                    filtered.map((p, i) => {
                      const isOpen = expandedId === p.id;
                      const fs = filesById[p.id];
                      return (
                        <div key={p.id} className={i > 0 ? 'border-t border-black/[0.07]' : ''}>
                          <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-[#FAF8F6] transition-colors">
                            {/* Thumbnail */}
                            <div className="w-12 h-12 rounded-lg bg-[#FAF8F6] border border-black/[0.07] overflow-hidden flex items-center justify-center shrink-0">
                              {p.thumbnail_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
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

                            {/* Access toggle */}
                            <button
                              type="button"
                              onClick={() => toggleRow(p.id)}
                              aria-expanded={isOpen}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#16130F] hover:bg-black text-white text-[12.5px] font-semibold transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/30"
                            >
                              Access
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                          </div>

                          {/* Expanded delivery panel — files + links */}
                          {isOpen && (
                            <div className="px-4 sm:px-5 pb-4">
                              <div className="rounded-lg border border-black/[0.07] bg-[#FAF8F6] p-3.5 space-y-3.5">
                                {fs?.loading && (
                                  <div className="flex items-center gap-2 text-black/45">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span className="font-ledger text-[10px] uppercase tracking-[0.14em]">Loading files…</span>
                                  </div>
                                )}

                                {fs && !fs.loading && fs.files.length > 0 && (
                                  <div className="space-y-1.5">
                                    <p className="font-ledger text-[10px] uppercase tracking-[0.16em] text-black/35">Files</p>
                                    {fs.files.map((f, idx) => (
                                      <a
                                        key={idx}
                                        href={f.signedUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2.5 rounded-lg border border-black/[0.08] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[#16130F] transition-colors hover:border-black/[0.2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/15"
                                      >
                                        <Download className="w-3.5 h-3.5 shrink-0 text-[#E83A2E]" />
                                        <span className="min-w-0 flex-1 truncate">{f.name}</span>
                                        {f.bytes > 0 && <span className="font-ledger text-[10px] text-black/35 shrink-0">{formatBytes(f.bytes)}</span>}
                                      </a>
                                    ))}
                                  </div>
                                )}

                                {p.links.length > 0 && (
                                  <div className="space-y-1.5">
                                    <p className="font-ledger text-[10px] uppercase tracking-[0.16em] text-black/35">Links</p>
                                    <DeliveryLinks links={p.links} />
                                  </div>
                                )}

                                {fs && !fs.loading && fs.files.length === 0 && p.links.length === 0 && !fs.error && (
                                  <p className="text-[12.5px] font-medium text-black/50">
                                    No downloadable files or links have been added to this product yet.
                                  </p>
                                )}

                                {fs?.error && <p className="text-[12.5px] font-medium text-[#E83A2E]">{fs.error}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
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
