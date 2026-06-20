'use client';
// ProductAssigner — controlled product picker.
// Parent manages assigned set; changes propagate immediately. DB save happens on parent Save.

import React from 'react';
import { useProducts } from '@/hooks/useProducts';
import { Package } from 'lucide-react';

export default function ProductAssigner({
  siteId: _siteId,
  assigned,
  onChange,
}: {
  siteId: string;
  assigned: Set<string>;
  onChange: (assigned: Set<string>) => void;
}) {
  const { products, isLoading: loading } = useProducts();

  const toggle = (id: string) => {
    const next = new Set(assigned);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-sm text-[var(--text-tertiary)]">Loading products...</div>;

  return (
    <div className="space-y-4">
      <div className="p-3.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[var(--radius-sm)] flex items-start gap-3">
        <Package className="w-4 h-4 text-[var(--text-primary)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-primary)]">
          Select products for this storefront. Click <strong>Save</strong> to persist.
        </p>
      </div>

      {products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-[var(--border)] rounded-[var(--radius-lg)] text-center">
          <Package className="w-10 h-10 text-[var(--text-tertiary)] mb-3" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">No products yet</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Create products in the Products section first.</p>
        </div>
      )}

      <div className="space-y-2">
        {products.map(product => {
          const isSelected = assigned.has(product.id);
          return (
            <div
              key={product.id}
              onClick={() => toggle(product.id)}
              className={`flex items-center gap-4 p-4 bg-[var(--surface)] border rounded-[var(--radius-md)] cursor-pointer transition-all ${
                isSelected
                  ? 'border-[var(--brand)] bg-[var(--surface-muted)]'
                  : 'border-[var(--border)] hover:border-[var(--border-strong)]'
              }`}
            >
              {product.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.thumbnail_url} alt={product.name} className="w-12 h-12 rounded-[var(--radius-sm)] object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-[var(--text-tertiary)]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{product.name}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  {'\u20B9'}{product.price?.toLocaleString('en-IN')} · {product.is_published ? 'Published' : 'Draft'}
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                isSelected ? 'border-[var(--brand)] bg-[var(--brand)]' : 'border-[var(--border-strong)] bg-[var(--surface)]'
              }`}>
                {isSelected && (
                  <svg className="w-3 h-3 text-[var(--text-on-brand)]" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {products.length > 0 && (
        <p className="text-xs text-[var(--text-tertiary)] text-center">{assigned.size} product{assigned.size !== 1 ? 's' : ''} selected</p>
      )}
    </div>
  );
}
