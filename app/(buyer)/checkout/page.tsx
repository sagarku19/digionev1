'use client';
// Checkout — single page with contact form, order summary, and pay button.

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { load } from '@cashfreepayments/cashfree-js';
import { useCart, useCartTotal } from '@/hooks/commerce/useCart';
import { useAuthSession } from '@/hooks/auth/useAuthSession';
import { useBuyerAuth } from '@/stores/buyerAuth';
import { getRememberedBuyerEmail, rememberBuyerEmail } from '@/lib/shared/buyer-email';
import { Loader2, ShieldCheck, Package, Trash2, AlertTriangle, Tag } from 'lucide-react';

export default function CheckoutPage() {
  const { items, removeItem } = useCart();
  const total = useCartTotal();
  const router = useRouter();
  const { isLoggedIn, userEmail } = useAuthSession();
  const openBuyerAuth = useBuyerAuth((s) => s.open);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const payable = Math.max(0, total - (appliedCoupon?.discount ?? 0));

  useEffect(() => {
    if (items.length === 0) router.replace('/');
  }, [items, router]);

  // Prefill priority: (1) authenticated user email, (2) remembered buyer email,
  // (3) empty. Never clobber what the buyer is actively typing.
  useEffect(() => {
    if (emailTouched) return;
    setEmail(userEmail || getRememberedBuyerEmail());
  }, [userEmail, emailTouched]);

  // Cart changes invalidate an applied coupon (amount/creator may have changed).
  useEffect(() => {
    setAppliedCoupon(null);
    setCouponError(null);
  }, [items]);

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code || items.length === 0) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cartAmount: total, creatorId: items[0].creatorId }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) throw new Error(data.error || 'Invalid coupon code');
      setAppliedCoupon({ code: code.toUpperCase(), discount: Number(data.discount_amount) || 0 });
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err instanceof Error ? err.message : 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      rememberBuyerEmail(email.trim());
      const referralCode = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('ref')
        : null;
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          contact: { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined },
          referralCode,
          couponCode: appliedCoupon?.code,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create order');

      if (data.status === 'completed') {
        window.location.href = `/payment/status?order_id=${data.orderId}`;
        return;
      }

      const cashfree = await load({
        mode: data.environment === 'production' ? 'production' : 'sandbox',
      });

      cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        returnUrl: `${window.location.origin}/payment/status?order_id=${data.orderId}`,
      });
    } catch (err: unknown) {
      console.error('[checkout]', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
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
          <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 space-y-3">
            {/* Coupon */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value); setCouponError(null); }}
                  placeholder="Coupon code"
                  disabled={!!appliedCoupon}
                  className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm uppercase text-gray-900 dark:text-white placeholder-gray-400 placeholder:normal-case focus:ring-2 focus:ring-indigo-500/40 outline-none transition disabled:opacity-60"
                />
              </div>
              {appliedCoupon ? (
                <button
                  type="button"
                  onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                  className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-red-500 border border-gray-200 dark:border-gray-700 rounded-lg transition"
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-4 py-2 text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition"
                >
                  {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </button>
              )}
            </div>
            {couponError && (
              <p className="text-xs text-red-500 font-medium">{couponError}</p>
            )}
            {appliedCoupon && (
              <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                <span>Coupon {appliedCoupon.code}</span>
                <span>−₹{appliedCoupon.discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            {/* Total */}
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-semibold text-gray-500">Total</span>
              <span className="text-xl font-extrabold text-gray-900 dark:text-white">₹{payable.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Contact Form + Pay */}
        <form onSubmit={handlePay} className="bg-white dark:bg-[#121226] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Contact Details</h2>
            {!isLoggedIn && (
              <button
                type="button"
                onClick={() => openBuyerAuth('login')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition"
              >
                Sign in
              </button>
            )}
          </div>

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
              onChange={e => { setEmail(e.target.value); setEmailTouched(true); }}
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
                Pay ₹{payable.toLocaleString('en-IN')}
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
