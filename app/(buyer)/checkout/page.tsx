'use client';
// Checkout — single focused page: order summary + coupon, contact form, pay.

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { load } from '@cashfreepayments/cashfree-js';
import { useCart, useCartTotal } from '@/hooks/commerce/useCart';
import { useAuthSession } from '@/hooks/auth/useAuthSession';
import { useBuyerAuth } from '@/stores/buyerAuth';
import { getRememberedBuyerEmail, rememberBuyerEmail } from '@/lib/shared/buyer-email';
import { Loader2, Lock, Package, Trash2, AlertTriangle, Tag } from 'lucide-react';

const INPUT =
  'w-full rounded-lg border border-black/[0.1] bg-white px-4 py-3 text-[14px] font-medium text-[#16130F] placeholder:text-black/30 transition-all focus:border-[#E83A2E] focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15';

function formatINR(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

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
    <div className="mx-auto max-w-md px-5 py-10 sm:py-14">
      {/* Kicker */}
      <div className="mb-6 flex items-center gap-3 font-ledger text-[11px]">
        <span className="font-semibold text-[#E83A2E]">{'>>'}</span>
        <span className="uppercase tracking-[0.18em] text-black/35">/checkout</span>
        <span aria-hidden="true" className="h-px flex-1 bg-black/[0.07]" />
        <Link href="/cart" className="text-[12px] font-semibold text-black/45 transition-colors hover:text-[#16130F]">
          Edit cart
        </Link>
      </div>

      {/* Order summary */}
      <div className="mb-5 overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
        <div className="border-b border-black/[0.06] px-5 py-3.5">
          <p className="font-ledger text-[10px] uppercase tracking-[0.18em] text-black/35">Order summary</p>
        </div>
        <div>
          {items.map((item, i) => (
            <div key={item.id} className={`flex items-center gap-3.5 px-5 py-3.5 ${i > 0 ? 'border-t border-black/[0.05]' : ''}`}>
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-black/[0.07] bg-[#FAF8F6]">
                {item.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-4 w-4 text-black/25" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-[#16130F]">{item.title}</p>
                <p className="font-ledger text-[11px] text-black/45">{formatINR(item.price)}</p>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                aria-label={`Remove ${item.title}`}
                className="rounded-lg p-1.5 text-black/35 transition-colors hover:bg-[#E83A2E]/[0.06] hover:text-[#E83A2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/15"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Coupon + total */}
        <div className="space-y-3 border-t border-black/[0.07] bg-[#FAF8F6] px-5 py-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/30" />
              <input
                type="text"
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value); setCouponError(null); }}
                placeholder="Coupon code"
                disabled={!!appliedCoupon}
                className="w-full rounded-lg border border-black/[0.1] bg-white py-2 pl-8 pr-3 text-[13px] font-medium uppercase text-[#16130F] transition-all placeholder:normal-case placeholder:text-black/30 focus:border-[#E83A2E] focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 disabled:opacity-60"
              />
            </div>
            {appliedCoupon ? (
              <button
                type="button"
                onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                className="rounded-lg border border-black/[0.1] px-3 py-2 text-[12.5px] font-semibold text-black/50 transition-colors hover:border-black/25 hover:text-[#E83A2E]"
              >
                Remove
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="inline-flex items-center rounded-lg bg-[#16130F] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-black disabled:opacity-40"
              >
                {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
              </button>
            )}
          </div>
          {couponError && (
            <div className="flex items-center gap-2 text-[12.5px] font-medium text-[#E83A2E]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E83A2E]" /> {couponError}
            </div>
          )}
          {appliedCoupon && (
            <div className="flex items-center justify-between text-emerald-700">
              <span className="font-ledger text-[11px] uppercase tracking-[0.12em]">Coupon {appliedCoupon.code}</span>
              <span className="font-ledger text-[13px] font-medium">-{formatINR(appliedCoupon.discount)}</span>
            </div>
          )}
          <div className="flex items-end justify-between pt-1">
            <span className="text-[14px] font-bold text-[#16130F]">Total</span>
            <span className="font-ledger text-[24px] font-semibold leading-none tracking-tight text-[#16130F]">{formatINR(payable)}</span>
          </div>
        </div>
      </div>

      {/* Contact form + pay */}
      <form onSubmit={handlePay} className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_16px_50px_-34px_rgba(22,19,15,0.25)] sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-ledger text-[10px] uppercase tracking-[0.18em] text-black/35">Your details</p>
          {!isLoggedIn && (
            <button
              type="button"
              onClick={() => openBuyerAuth('login')}
              className="text-[12.5px] font-semibold text-[#E83A2E] transition-colors hover:text-[#C92F24]"
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
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className={INPUT}
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailTouched(true); }}
            placeholder="Email address"
            className={INPUT}
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number (optional)"
            className={INPUT}
          />
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#E83A2E]/15 bg-[#E83A2E]/[0.06] px-4 py-3 text-[13px] font-medium text-[#E83A2E]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !name.trim() || !email.trim()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#E83A2E] py-4 text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-[#C92F24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/30 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Pay {formatINR(payable)}
            </>
          )}
        </button>

        <p className="mt-3 text-center font-ledger text-[10px] uppercase tracking-[0.14em] text-black/35">
          Secured by Cashfree · UPI · Cards · NetBanking
        </p>
      </form>
    </div>
  );
}
