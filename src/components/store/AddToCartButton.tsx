'use client';

// Storefront add-to-cart with the replace-cart confirm for cross-creator adds
// (mirrors the one-creator-per-order rule in /api/checkout/create). Used on
// multi-product store sections only (ProductGrid, FeaturedProducts) — single-
// product surfaces keep direct Buy Now.

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCart, type CartItem } from '@/hooks/commerce/useCart';

export function AddToCartButton({ item, className = '' }: { item: CartItem; className?: string }) {
  const { addItem, replaceCartWith, openDrawer } = useCart();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = addItem(item);
    if (result === 'conflict') {
      setShowConfirm(true);
      return;
    }
    openDrawer();
  };

  const handleReplace = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    replaceCartWith(item);
    setShowConfirm(false);
    openDrawer();
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleAdd}
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-[var(--creator-primary,#E83A2E)] text-white hover:opacity-90 transition-opacity ${className}`}
      >
        <ShoppingCart className="w-4 h-4" />
        Add to cart
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center px-5">
          <div className="absolute inset-0 bg-black/40" onClick={handleCancel} />
          <div
            role="dialog"
            aria-label="Replace cart confirmation"
            className="relative bg-[var(--creator-bg,#ffffff)] text-[var(--creator-text,#16130F)] border border-black/[0.08] rounded-xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[16px] font-bold mb-1.5">Replace your cart?</h3>
            <p className="text-[13.5px] font-medium text-[var(--creator-text-muted,#64748b)] mb-5 leading-relaxed">
              Your cart has items from another store. Each order can only contain products from one store.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleReplace}
                className="flex-1 py-2.5 rounded-lg bg-[var(--creator-primary,#E83A2E)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Replace cart
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-2.5 rounded-lg border border-black/[0.12] text-sm font-semibold hover:bg-black/[0.03] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
