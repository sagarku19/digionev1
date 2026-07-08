'use client';

import React from 'react';
import Link from 'next/link';
import { useCart, useCartTotal } from '@/hooks/commerce/useCart';
import { Trash2, ArrowRight, ShieldCheck, ShoppingCart } from 'lucide-react';

export default function CartPage() {
  const { items, removeItem } = useCart();
  const total = useCartTotal();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <ShoppingCart className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your cart is empty</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md text-center">
          Looks like you have not added any digital products to your cart yet.
        </p>
        <Link
          href="/"
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
        >
          Explore Creators
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col md:flex-row gap-8">

      {/* Left: Cart Items */}
      <div className="flex-1 flex flex-col gap-6">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Shopping Cart ({items.length})</h1>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {items.map((item) => (
              <li key={item.id} className="p-6 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  {item.coverImage ? (
                    <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center p-2">No Image</div>
                  )}
                </div>

                <div className="flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">By @{item.creatorId}</p>

                  <div className="mt-auto flex items-center justify-between">
                    <span className="font-extrabold text-lg text-gray-900 dark:text-white">₹{item.price.toLocaleString('en-IN')}</span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-sm font-medium text-red-500 hover:text-red-600 flex items-center gap-1 p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right: Order Summary */}
      <div className="w-full md:w-96 shrink-0 flex flex-col gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 sticky top-24">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Order Summary</h2>

          <div className="flex flex-col gap-4 mb-6 text-gray-600 dark:text-gray-300">
            <div className="flex justify-between items-center">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900 dark:text-white">₹{total.toLocaleString('en-IN')}</span>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center mt-2">
              <span className="font-bold text-gray-900 dark:text-white">Total due</span>
              <span className="text-3xl font-extrabold text-gray-900 dark:text-white">₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <Link href="/checkout" className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
            Proceed to Checkout
            <ArrowRight className="w-5 h-5" />
          </Link>

          <div className="mt-6 flex flex-col items-center gap-3">
             <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
               <ShieldCheck className="w-4 h-4 text-green-500" />
               Secure checkout via Cashfree
             </div>
             {/* Simple visual placeholders for payment methods */}
             <div className="flex items-center gap-3 opacity-60 grayscale mt-2">
                <span className="bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 test-xs font-bold px-2 py-1 rounded">UPI</span>
                <span className="bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 test-xs font-bold px-2 py-1 rounded">Cards</span>
                <span className="bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 test-xs font-bold px-2 py-1 rounded">NetBanking</span>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
}
