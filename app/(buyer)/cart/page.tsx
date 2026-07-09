'use client';

import React from 'react';
import Link from 'next/link';
import { useCart, useCartTotal } from '@/hooks/commerce/useCart';
import { Trash2, ArrowRight, ShieldCheck, ShoppingBag, Package } from 'lucide-react';

function formatINR(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

export default function CartPage() {
  const { items, removeItem } = useCart();
  const total = useCartTotal();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-md rounded-2xl border border-black/[0.07] bg-white p-10 text-center shadow-[0_16px_50px_-30px_rgba(22,19,15,0.25)] sm:p-12">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-black/[0.07] bg-[#FAF8F6]">
            <ShoppingBag className="h-6 w-6 text-[#E83A2E]" strokeWidth={1.8} />
          </div>
          <p className="mb-3 font-ledger text-[10px] uppercase tracking-[0.18em] text-black/35">0 items · empty cart</p>
          <h1 className="mb-2 text-[22px] font-bold tracking-[-0.02em] text-[#16130F]">Your cart is empty</h1>
          <p className="mx-auto mb-7 max-w-sm text-[13.5px] font-medium leading-relaxed text-black/50">
            Browse creators and add digital products — they&apos;ll show up here, ready to check out.
          </p>
          <Link
            href="/discover"
            className="group inline-flex items-center gap-2 rounded-lg bg-[#E83A2E] px-6 py-3 text-[14px] font-semibold text-white transition-colors duration-200 hover:bg-[#C92F24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/30"
          >
            Discover products
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      {/* Kicker + heading */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3 font-ledger text-[11px]">
          <span className="font-semibold text-[#E83A2E]">{'>>'}</span>
          <span className="uppercase tracking-[0.18em] text-black/35">/cart</span>
          <span aria-hidden="true" className="h-px flex-1 bg-black/[0.07]" />
        </div>
        <h1 className="text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-[#16130F] sm:text-[34px]">
          Your cart <span className="align-middle font-ledger text-[18px] text-black/30">({items.length})</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Items */}
        <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`flex items-start gap-4 p-4 transition-colors hover:bg-[#FAF8F6] sm:p-5 ${i > 0 ? 'border-t border-black/[0.06]' : ''}`}
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-black/[0.07] bg-[#FAF8F6]">
                {item.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-6 w-6 text-black/20" strokeWidth={1.8} />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col self-stretch">
                <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-[-0.01em] text-[#16130F]">{item.title}</h3>
                <p className="mt-1 font-ledger text-[10px] uppercase tracking-[0.14em] text-black/35">digital product</p>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="font-ledger text-[16px] font-semibold text-[#16130F]">{formatINR(item.price)}</span>
                  <button
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.title} from cart`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-black/45 transition-colors hover:bg-[#E83A2E]/[0.06] hover:text-[#E83A2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/15"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <aside className="h-max rounded-2xl border border-black/[0.07] bg-white p-6 shadow-[0_16px_50px_-34px_rgba(22,19,15,0.25)] lg:sticky lg:top-20">
          <p className="mb-5 font-ledger text-[10px] uppercase tracking-[0.18em] text-black/35">Order summary</p>
          <div className="flex items-center justify-between text-[14px]">
            <span className="font-medium text-black/55">Subtotal</span>
            <span className="font-ledger font-semibold text-[#16130F]">{formatINR(total)}</span>
          </div>
          <div className="my-5 h-px bg-black/[0.07]" />
          <div className="flex items-end justify-between">
            <span className="text-[15px] font-bold text-[#16130F]">Total</span>
            <span className="font-ledger text-[28px] font-semibold leading-none tracking-tight text-[#16130F]">{formatINR(total)}</span>
          </div>
          <Link
            href="/checkout"
            className="group mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#E83A2E] py-3.5 text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-[#C92F24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/30"
          >
            Proceed to checkout
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <div className="mt-5 flex flex-col items-center gap-3">
            <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-black/50">
              <ShieldCheck className="h-4 w-4 text-emerald-600" strokeWidth={1.8} /> Secure checkout via Cashfree
            </div>
            <div className="flex items-center gap-1.5">
              {['UPI', 'Cards', 'NetBanking'].map((m) => (
                <span
                  key={m}
                  className="rounded-md border border-black/[0.08] bg-[#FAF8F6] px-2 py-1 font-ledger text-[9px] uppercase tracking-[0.12em] text-black/45"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
