'use client';
// Checkout — single page with contact form, order summary, and pay button.

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, useCartTotal } from '@/hooks/useCart';
import { Loader2, ShieldCheck, Package, Trash2, AlertTriangle } from 'lucide-react';

export default function CheckoutPage() {
  const { items, removeItem } = useCart();
  const total = useCartTotal();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) router.replace('/');
  }, [items, router]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          contact: { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create order');

      // @ts-ignore
      const { load } = await import('@cashfreepayments/cashfree-js');
      const cashfree = await load({
        mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production' ? 'production' : 'sandbox',
      });

      cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        returnUrl: `${window.location.origin}/payment/status?order_id=${data.orderId}`,
      });
    } catch (err: any) {
      console.error('[checkout]', err);
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A1A]">
      <div className="max-w-lg mx-auto px-4 py-10 md:py-16">

        {/* Order Summary */}
        <div className="bg-white dark:bg-[#121226] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Order Summary</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                  {item.coverImage ? (
                    <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</p>
                  <p className="text-xs text-gray-500">₹{item.price.toLocaleString('en-IN')}</p>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-500">Total</span>
            <span className="text-xl font-extrabold text-gray-900 dark:text-white">₹{total.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Contact Form + Pay */}
        <form onSubmit={handlePay} className="bg-white dark:bg-[#121226] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Contact Details</h2>

          <div className="space-y-3">
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/40 outline-none transition"
            />
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/40 outline-none transition"
            />
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone number (optional)"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/40 outline-none transition"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !name.trim() || !email.trim()}
            className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/20 text-base"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Pay ₹{total.toLocaleString('en-IN')}
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center pt-1">
            Secured by Cashfree · UPI, Cards, NetBanking
          </p>
        </form>

      </div>
    </div>
  );
}
