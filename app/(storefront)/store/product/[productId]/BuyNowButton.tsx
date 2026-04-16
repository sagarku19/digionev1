'use client';

import { useState } from 'react';
import { ShoppingCart, Loader2, User, Mail, Phone } from 'lucide-react';
import { load } from '@cashfreepayments/cashfree-js';

type Props = {
  productId: string;
  price: number;
  label: string;
};

export function BuyNowButton({ productId, price, label }: Props) {
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: productId }], contact }),
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
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="space-y-3 p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/50 border border-[--creator-text]/10 rounded-[24px] shadow-inner text-left">
        <h3 className="text-sm border-b border-[--creator-text]/10 pb-3 mb-4 font-bold text-[--creator-text] flex items-center gap-2">
          Your Information
        </h3>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            required
            type="text"
            placeholder="Full name"
            value={contact.name}
            onChange={e => setContact(p => ({ ...p, name: e.target.value }))}
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-[--creator-text]/10 bg-[--creator-surface] text-sm font-semibold text-[--creator-text] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[--creator-primary]/30 focus:border-[--creator-primary] transition-all shadow-sm"
          />
        </div>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            required
            type="email"
            placeholder="Email address"
            value={contact.email}
            onChange={e => setContact(p => ({ ...p, email: e.target.value }))}
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-[--creator-text]/10 bg-[--creator-surface] text-sm font-semibold text-[--creator-text] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[--creator-primary]/30 focus:border-[--creator-primary] transition-all shadow-sm"
          />
        </div>
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            required
            type="tel"
            placeholder="Phone number"
            value={contact.phone}
            onChange={e => setContact(p => ({ ...p, phone: e.target.value }))}
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-[--creator-text]/10 bg-[--creator-surface] text-sm font-semibold text-[--creator-text] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[--creator-primary]/30 focus:border-[--creator-primary] transition-all shadow-sm"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 px-4 py-3 rounded-xl shadow-sm text-left">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-4 bg-[--creator-primary] hover:opacity-90 disabled:opacity-60 text-[--creator-surface] font-extrabold rounded-[20px] transition shadow-lg shadow-[--creator-primary]/20 text-base"
        style={{ color: 'var(--creator-bg)' }}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5 shrink-0" />}
        <span className="drop-shadow-sm">{loading ? 'Processing Checkout…' : label}</span>
      </button>

      <p className="text-center text-[10px] font-black text-gray-400 tracking-widest pt-2">
        🔒 SECURED BY CASHFREE
      </p>
    </form>
  );
}
