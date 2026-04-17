'use client';
// ProductAssigner — controlled product picker.
// Parent manages assigned set; changes propagate immediately. DB save happens on parent Save.

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Package } from 'lucide-react';

export default function ProductAssigner({
  siteId,
  assigned,
  onChange,
}: {
  siteId: string;
  assigned: Set<string>;
  onChange: (assigned: Set<string>) => void;
}) {
  const supabase = createClient();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: userRow } = await supabase.from('users').select('id').eq('auth_provider_id', user.id).single();
      if (!userRow) { setLoading(false); return; }
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', userRow.id).single();
      if (!profile) { setLoading(false); return; }

      const { data: prods } = await supabase
        .from('products')
        .select('id, name, price, thumbnail_url, is_published')
        .eq('creator_id', profile.id)
        .order('created_at', { ascending: false });

      setProducts(prods ?? []);
      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const toggle = (id: string) => {
    const next = new Set(assigned);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading products...</div>;

  return (
    <div className="space-y-4">
      <div className="p-3.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl flex items-start gap-3">
        <Package className="w-4 h-4 text-[var(--text-primary)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-primary)]">
          Select products for this storefront. Click <strong>Save</strong> to persist.
        </p>
      </div>

      {products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-[var(--border)] rounded-2xl text-center">
          <Package className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm font-medium text-gray-500">No products yet</p>
          <p className="text-xs text-gray-400 mt-1">Create products in the Products section first.</p>
        </div>
      )}

      <div className="space-y-2">
        {products.map(product => {
          const isSelected = assigned.has(product.id);
          return (
            <div
              key={product.id}
              onClick={() => toggle(product.id)}
              className={`flex items-center gap-4 p-4 bg-[var(--bg-primary)] border rounded-xl cursor-pointer transition-all ${
                isSelected
                  ? 'border-[var(--accent)] bg-[var(--bg-tertiary)]/30 dark:bg-[var(--bg-tertiary)]'
                  : 'border-[var(--border)] hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              {product.thumbnail_url ? (
                <img src={product.thumbnail_url} alt={product.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{product.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {'\u20B9'}{product.price?.toLocaleString('en-IN')} · {product.is_published ? 'Published' : 'Draft'}
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-secondary)]'
              }`}>
                {isSelected && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {products.length > 0 && (
        <p className="text-xs text-gray-400 text-center">{assigned.size} product{assigned.size !== 1 ? 's' : ''} selected</p>
      )}
    </div>
  );
}
