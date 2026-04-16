'use client';
// PaymentLinkPage — centered payment card for services / consulting.
// DB tables: none directly (payment initiated via /api/checkout/payment-link)

import React, { useState } from 'react';
import { Loader2, Shield } from 'lucide-react';

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

import { load } from '@cashfreepayments/cashfree-js';

export default function PaymentLinkPage({ siteId, siteMain }: { siteId: string; siteMain: any }) {
  const title       = siteMain?.title ?? 'Pay securely';
  const description = siteMain?.meta_description ?? '';
  const amount      = siteMain?.fixed_amount as number | undefined;
  const isFlexible  = !amount;

  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [phone,   setPhone]   = useState('');
  const [custom,  setCustom]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const INPUT = 'w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[--creator-primary] outline-none text-[--creator-text] placeholder-gray-400';

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payAmount = isFlexible ? Number(custom) : amount;
      if (!payAmount || payAmount < 1) throw new Error('Enter a valid amount');
      if (phone && phone.length < 10) throw new Error('Enter a valid 10-digit phone number');
      
      const res = await fetch('/api/checkout/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, name, email, phone, amount: payAmount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Payment failed');
      
      if (json.payment_session_id) {
        const cashfree = await load({
          mode: json.environment === 'production' ? 'production' : 'sandbox',
        });
        cashfree.checkout({
          paymentSessionId: json.payment_session_id,
          returnUrl: `${window.location.origin}/payment/status?order_id=${json.order_id}&sub=${json.submission_id}`,
        });
      } else {
         throw new Error('No payment session received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[--creator-bg] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-extrabold text-[--creator-text] mb-2">{title}</h1>
        {description && <p className="text-sm text-[--creator-text-muted] mb-6">{description}</p>}

        <form onSubmit={handlePay} className="space-y-4">
          {isFlexible && (
            <div>
              <label className="block text-sm font-medium text-[--creator-text] mb-1.5">Amount (₹)</label>
              <input type="number" min="1" value={custom} onChange={e => setCustom(e.target.value)} required placeholder="Enter amount" className={INPUT} />
            </div>
          )}
          {!isFlexible && (
            <div className="flex items-center gap-2 bg-[--creator-primary]/5 border border-[--creator-primary]/20 rounded-xl px-4 py-3">
              <span className="text-2xl font-extrabold text-[--creator-primary]">{formatINR(amount!)}</span>
              <span className="text-sm text-[--creator-text-muted]">fixed</span>
            </div>
          )}
          <input type="text"  required value={name}  onChange={e => setName(e.target.value)}  placeholder="Full name"  className={INPUT} />
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"      className={INPUT} />
          <input type="tel"           value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (optional)" className={INPUT} />

          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-xl">{error}</p>}

          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-[--creator-primary] hover:opacity-90 disabled:opacity-60 text-white font-bold py-4 rounded-2xl shadow-lg transition-all text-base">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? 'Processing…' : `Pay ${!isFlexible && amount ? formatINR(amount) : custom ? formatINR(Number(custom)) : '→'}`}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-400">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          Secured by DigiOne · Powered by Cashfree
        </div>
      </div>
    </div>
  );
}
