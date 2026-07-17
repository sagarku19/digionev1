'use client';

import React, { useState } from 'react';
import { Download, Library, ExternalLink, Package, ChevronDown, Search, Loader2, AlertCircle } from 'lucide-react';
import { useLibrary } from '@/hooks/commerce/useLibrary';
import { PageHeader } from '@/components/ui/PageHeader';
import { BackButton } from '@/components/dashboard/BackButton';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatBytes } from '@/lib/format-bytes';

function formatINR(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

type DeliverableFile = { name: string; signedUrl: string; bytes: number };
type FileState = { loading: boolean; files: DeliverableFile[]; error: string | null };

export default function LibraryPage() {
  const { data: products = [], isLoading } = useLibrary();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filesById, setFilesById] = useState<Record<string, FileState>>({});

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  // Deliverables live in R2, not on the product row. Fetch signed URLs once per
  // product when its row is expanded, then list each file as its own download link
  // (a single user gesture each — no multi-popup that browsers block).
  const toggleRow = async (productId: string) => {
    if (expandedId === productId) { setExpandedId(null); return; }
    setExpandedId(productId);
    if (filesById[productId]) return; // already loaded
    setFilesById(s => ({ ...s, [productId]: { loading: true, files: [], error: null } }));
    try {
      const res = await fetch(`/api/deliverables/${productId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load your files.');
      const raw = (data.files ?? []) as Array<{ name?: string; signedUrl?: string; bytes?: number }>;
      const files: DeliverableFile[] = raw
        .filter(f => typeof f.signedUrl === 'string')
        .map(f => ({ name: f.name || 'File', signedUrl: f.signedUrl as string, bytes: Number(f.bytes) || 0 }));
      setFilesById(s => ({ ...s, [productId]: { loading: false, files, error: null } }));
    } catch (err) {
      setFilesById(s => ({
        ...s,
        [productId]: { loading: false, files: [], error: err instanceof Error ? err.message : 'Failed to load files.' },
      }));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        back={<BackButton href="/dashboard/settings" label="Back to settings" />}
        title="My Library"
        description="Products you've purchased across DigiOne."
      />

      {products.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your library..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow"
          />
        </div>
      )}

      {isLoading && (
        <Card padded={false}>
          <div className="divide-y divide-[var(--border-subtle)]">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="w-12 h-12" rounded="md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-8 w-20" rounded="sm" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {!isLoading && products.length === 0 && (
        <Card padded={false}>
          <EmptyState
            icon={Library}
            title="Your library is empty"
            description="Products you purchase from creators will appear here."
          />
        </Card>
      )}

      {!isLoading && products.length > 0 && (
        <Card padded={false}>
          {filtered.length === 0 ? (
            <EmptyState
              title={`No products match "${search}"`}
              action={
                <button
                  onClick={() => setSearch('')}
                  className="text-sm font-medium text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-3 py-1.5 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
                >
                  Clear search
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {filtered.map(product => {
                const isOpen = expandedId === product.id;
                const fs = filesById[product.id];

                return (
                  <div key={product.id}>
                    <div className="flex items-center gap-3 sm:gap-4 p-4 hover:bg-[var(--surface-hover)] transition-colors">
                      <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border)] overflow-hidden flex items-center justify-center shrink-0">
                        {product.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-[var(--text-tertiary)]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{product.name}</p>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mt-0.5">
                          {(product.category ?? 'Digital')} · {formatDate(product.purchased_at)}
                        </p>
                      </div>

                      <span className="hidden sm:block text-[13px] font-semibold text-[var(--text-primary)] shrink-0">
                        {formatINR(product.price_at_purchase)}
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleRow(product.id)}
                        aria-expanded={isOpen}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] text-xs font-semibold transition-colors shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                      >
                        Access
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {isOpen && (
                      <div className="px-4 pb-4">
                        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 space-y-3.5">
                          {fs?.loading && (
                            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span className="text-[11px] uppercase tracking-wide font-medium">Loading files…</span>
                            </div>
                          )}

                          {fs && !fs.loading && fs.files.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[11px] uppercase tracking-wide font-medium text-[var(--text-tertiary)]">Files</p>
                              {fs.files.map((f, idx) => (
                                <a
                                  key={idx}
                                  href={f.signedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                                >
                                  <Download className="w-3.5 h-3.5 shrink-0 text-[var(--brand)]" />
                                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                                  {f.bytes > 0 && <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">{formatBytes(f.bytes)}</span>}
                                </a>
                              ))}
                            </div>
                          )}

                          {product.links.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[11px] uppercase tracking-wide font-medium text-[var(--text-tertiary)]">Links</p>
                              {product.links.map((link, i) => (
                                <a
                                  key={`${link.url}-${i}`}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[var(--brand)]" />
                                  <span className="min-w-0 flex-1 truncate">{link.label}</span>
                                  <span aria-hidden="true" className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5">
                                    open
                                  </span>
                                </a>
                              ))}
                            </div>
                          )}

                          {fs && !fs.loading && fs.files.length === 0 && product.links.length === 0 && !fs.error && (
                            <p className="text-[13px] font-medium text-[var(--text-secondary)]">
                              No downloadable files or links have been added to this product yet.
                            </p>
                          )}

                          {fs?.error && (
                            <p className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--danger)]">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              {fs.error}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
