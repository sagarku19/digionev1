'use client';
// Checkout for the discover product page (engineered-ledger palette).
import { useState } from 'react';
import { ShoppingCart, Loader2, User, Mail, Phone, ArrowRight } from 'lucide-react';
import { load } from '@cashfreepayments/cashfree-js';

type Props = { productId: string; price: number; label: string };

const FIELD =
  'w-full rounded-lg border border-black/[0.1] bg-white py-3 pl-11 pr-4 text-[14px] font-medium text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all';

export function BuyNowButton({ productId, price, label }: Props) {
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const referralCode = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('ref')
        : null;
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: productId }], contact, referralCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed');

      if (data.status === 'completed') {
        window.location.href = `/payment/status?order_id=${data.orderId}`;
        return;
      }
      const cashfree = await load({ mode: data.environment === 'production' ? 'production' : 'sandbox' });
      cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        returnUrl: `${window.location.origin}/payment/status?order_id=${data.orderId}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-3">
      <div className="space-y-3 rounded-xl border border-black/[0.08] bg-[#FAF8F6] p-4">
        <p className="font-ledger text-[10px] uppercase tracking-[0.16em] text-black/40">Your information</p>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
          <input required type="text" placeholder="Full name" value={contact.name} onChange={(e) => setContact((p) => ({ ...p, name: e.target.value }))} className={FIELD} />
        </div>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
          <input required type="email" placeholder="Email address" value={contact.email} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} className={FIELD} />
        </div>
        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
          <input required type="tel" placeholder="Phone number" value={contact.phone} onChange={(e) => setContact((p) => ({ ...p, phone: e.target.value }))} className={FIELD} />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-[#E83A2E]/15 bg-[#E83A2E]/[0.06] px-4 py-3 text-[13px] font-medium text-[#E83A2E]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E83A2E]" /> {error}
        </div>
      )}

      <button
        type="submit" disabled={loading}
        className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[#E83A2E] py-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#C92F24] disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5 shrink-0" />}
        {loading ? 'Processing…' : label}
        {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
      </button>

      <p className="font-ledger text-center text-[10px] uppercase tracking-[0.16em] text-black/35">🔒 Secured by Cashfree{price > 0 ? '' : ''}</p>
    </form>
  );
}
