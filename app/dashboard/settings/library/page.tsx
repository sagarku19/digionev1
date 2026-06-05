'use client';

import React, { useState } from 'react';
import { Download, Library, ExternalLink, Package, FileText, BookOpen, Tag, Search } from 'lucide-react';
import { useLibrary } from '@/hooks/useLibrary';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

const CATEGORY_ICON: Record<string, React.ElementType> = {
  digital: FileText,
  course: BookOpen,
  template: Tag,
  other: Package,
};

export default function LibraryPage() {
  const { data: products = [], isLoading } = useLibrary();
  const [search, setSearch] = useState('');

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} padded={false}>
              <Skeleton className="w-full aspect-[4/3]" rounded="md" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
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

      {!isLoading && products.length > 0 && filtered.length === 0 && (
        <Card padded={false}>
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
        </Card>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => {
            const CategoryIcon = CATEGORY_ICON[product.category ?? 'other'] ?? Package;
            const purchaseDate = new Date(product.purchased_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

            return (
              <Card key={product.id} padded={false} hoverable className="flex flex-col overflow-hidden">
                <div className="w-full aspect-[4/3] bg-[var(--surface-muted)] overflow-hidden">
                  {product.thumbnail_url ? (
                    <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover object-center" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-tertiary)]">
                      <CategoryIcon className="w-10 h-10 opacity-40" />
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-1 mb-1">{product.name}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-3">
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
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-[var(--radius-sm)] text-xs font-semibold focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    ) : (
                      <span className="flex-1 flex items-center justify-center py-2 bg-[var(--surface-muted)] text-[var(--text-tertiary)] rounded-[var(--radius-sm)] text-xs font-semibold cursor-not-allowed">
                        No file yet
                      </span>
                    )}
                    <a
                      href={`/store/product/${product.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 flex items-center justify-center bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
