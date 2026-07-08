"use client";

// Mini-cart drawer — slides in from the right (full-width sheet below sm).
// Mounted once per surface that can carry a cart: the store layout
// (palette="creator", themed by --creator-* vars) and the marketing/account
// layouts (palette="ledger", engineered-ledger palette).

import { useEffect } from 'react';
import Link from 'next/link';
import { X, ShoppingCart, Trash2, ArrowRight } from 'lucide-react';
import { useCart, useCartTotal } from '@/hooks/commerce/useCart';

const PALETTES = {
  creator: {
    panel: 'bg-[var(--creator-bg,#ffffff)] text-[var(--creator-text,#16130F)]',
    muted: 'text-[var(--creator-text-muted,#64748b)]',
    thumb: 'bg-[var(--creator-surface,#f5f5f4)]',
    hairline: 'border-[var(--creator-border,rgba(0,0,0,0.08))]',
    cta: 'bg-[var(--creator-primary,#E83A2E)] hover:opacity-90 text-white',
    secondary: 'border border-[var(--creator-border,rgba(0,0,0,0.12))] hover:bg-[var(--creator-surface,#f5f5f4)]',
    removeHover: 'hover:text-[var(--creator-primary,#E83A2E)]',
  },
  ledger: {
    panel: 'bg-white text-[#16130F]',
    muted: 'text-black/50',
    thumb: 'bg-[#FAF8F6]',
    hairline: 'border-black/[0.08]',
    cta: 'bg-[#E83A2E] hover:bg-[#C92F24] text-white',
    secondary: 'border border-black/[0.1] hover:border-black/[0.25]',
    removeHover: 'hover:text-[#E83A2E]',
  },
} as const;

function formatINR(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

export default function CartDrawer({ palette = 'creator' }: { palette?: keyof typeof PALETTES }) {
  const { items, isDrawerOpen, closeDrawer, removeItem } = useCart();
  const total = useCartTotal();
  const p = PALETTES[palette];

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isDrawerOpen, closeDrawer]);

  return (
    <div
      className={`fixed inset-0 z-[90] ${isDrawerOpen ? 'visible' : 'invisible pointer-events-none'}`}
      aria-hidden={!isDrawerOpen}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={closeDrawer}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Shopping cart"
        className={`absolute right-0 top-0 h-full w-full sm:w-[400px] ${p.panel} shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${p.hairline} shrink-0`}>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-[15px] font-bold tracking-[-0.01em]">
              Your cart{items.length > 0 ? ` (${items.length})` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close cart"
            className={`w-8 h-8 flex items-center justify-center rounded-lg border ${p.hairline} hover:bg-black/[0.04] transition-colors`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <ShoppingCart className={`w-8 h-8 ${p.muted}`} strokeWidth={1.5} />
              <p className={`text-sm font-medium ${p.muted}`}>Your cart is empty</p>
            </div>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id} className={`flex items-center gap-3 px-5 py-4 border-b ${p.hairline}`}>
                  <div className={`w-12 h-12 rounded-lg ${p.thumb} border ${p.hairline} overflow-hidden shrink-0 flex items-center justify-center`}>
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingCart className={`w-4 h-4 ${p.muted}`} strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold truncate">{item.title}</p>
                    <p className={`text-[12px] font-medium ${p.muted}`}>{formatINR(item.price)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.title} from cart`}
                    className={`p-2 rounded-lg ${p.muted} ${p.removeHover} hover:bg-black/[0.03] transition-colors shrink-0`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className={`px-5 py-4 border-t ${p.hairline} shrink-0 space-y-3`}>
            <div className="flex items-center justify-between">
              <span className={`text-[13px] font-semibold ${p.muted}`}>Total</span>
              <span className="text-[17px] font-bold">{formatINR(total)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className={`group flex items-center justify-center gap-2 w-full py-3 rounded-lg text-[14px] font-semibold transition-colors ${p.cta}`}
            >
              Checkout
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
            <Link
              href="/cart"
              onClick={closeDrawer}
              className={`flex items-center justify-center w-full py-2.5 rounded-lg text-[13px] font-semibold transition-colors ${p.secondary}`}
            >
              View cart
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
