'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, CheckCircle2, CreditCard, User as UserIcon, Loader2 } from 'lucide-react';

export default function CheckoutPage() {
  const { items, total } = useCart();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [items, router]);

  useEffect(() => {
    // Try to pre-fill authenticated user
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setEmail(session.user.email || '');
        const { data: userRec } = await supabase
          .from('users')
          .select('id, profiles(full_name)')
          .eq('auth_provider_id', session.user.id)
          .single();
        
        // Handle TS array vs object dynamically since Supabase sometimes types joins as arrays
        const profileData = Array.isArray(userRec?.profiles) ? userRec?.profiles[0] : userRec?.profiles;
        if (profileData?.full_name) setName(profileData.full_name || '');
      }
    };
    fetchUser();
  }, [supabase]);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || !phone) {
      setError('Please fill in all details');
      return;
    }
    setError(null);
    setStep(2);
  };

  const initializePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Hit our local API to create the order and get the Cashfree session
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: items,
          customerDetails: { email, phone, name }
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize checkout');
      }

      // 2. Load Cashfree SDK dynamically to avoid Next.js SSR issues
      // @ts-ignore
      const { load } = await import('@cashfreepayments/cashfree-js');
      const cashfree = await load({
        mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production' ? 'production' : 'sandbox',
      });

      // 3. Trigger the checkout modal
      cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        returnUrl: `${window.location.origin}/checkout/processing?order_id=${data.order_id}`,
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred during payment initialization.');
      setStep(2); // Kick back to review if failed
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-8">
      
      {/* Progress Stepper */}
      <div className="flex items-center justify-between relative mb-8">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-800 -z-10"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 -z-10 transition-all duration-500" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
        
        {[
          { num: 1, label: 'Account', icon: UserIcon },
          { num: 2, label: 'Review', icon: CheckCircle2 },
          { num: 3, label: 'Payment', icon: CreditCard }
        ].map((s) => (
          <div key={s.num} className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-gray-950 px-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-2 ${
              step >= s.num 
                ? 'bg-indigo-600 border-indigo-600 text-white' 
                : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-500'
            }`}>
              <s.icon className="w-5 h-5" />
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${step >= s.num ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Step 1: Account Info */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Contact & Billing Details</h2>
          <form onSubmit={handleStep1Submit} className="flex flex-col gap-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                <input 
                  type="text" required
                  value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                  placeholder="John Doe"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address (For receipt & access)</label>
                <input 
                  type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number (For verification)</label>
              <input 
                type="tel" required
                value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                placeholder="+91 9876543210"
              />
            </div>

            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">
              Continue to Review
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Review & Pay */}
      {step === 2 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 md:p-8 flex flex-col gap-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Order Review</h2>
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-200 dark:divide-gray-800">
              {items.map(item => (
                <div key={item.id} className="p-4 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 dark:text-white">{item.title}</span>
                    <span className="text-sm text-gray-500">By @{item.creatorId}</span>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">₹{item.price.toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="p-4 bg-gray-50 dark:bg-gray-950/50 flex justify-between items-center rounded-b-xl border-t border-gray-200 dark:border-gray-800">
                <span className="font-bold text-gray-500">Total Due</span>
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <button 
              onClick={() => setStep(1)}
              className="px-6 py-3 font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
            >
              Back to info
            </button>
            <button 
              onClick={() => {
                setStep(3);
                initializePayment();
              }}
              className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <ShieldCheck className="w-5 h-5" />
              Pay ₹{total.toLocaleString('en-IN')} Securely
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Loading Initialization */}
      {step === 3 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connecting to Cashfree...</h2>
          <p className="text-gray-500 dark:text-gray-400">Please wait while we secure your payment window. Do not refresh this page.</p>
        </div>
      )}

    </div>
  );
}
