'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

export default function ProcessingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [error, setError] = useState<string | null>(null);
  const { clearCart } = useCart();

  useEffect(() => {
    if (!orderId) {
      setError('Invalid return payload from payment gateway. Missing Order ID.');
      return;
    }

    let intervalId: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`);
        if (!res.ok) throw new Error('Failed to verify order status');

        const { status } = await res.json();
        
        if (status === 'completed' || status === 'success') {
          clearInterval(intervalId);
          clearCart();
          router.push(`/order/${orderId}/success`);
        } else if (status === 'failed' || status === 'cancelled') {
          clearInterval(intervalId);
          router.push(`/order/${orderId}/failed`);
        }
        // If pending, keep polling
      } catch (err: any) {
        console.error('Polling error', err);
        setError('Connection interrupted while verifying payment. Please check your email for receipts before retrying.');
        clearInterval(intervalId);
      }
    };

    // Poll every 3 seconds
    intervalId = setInterval(pollStatus, 3000);
    // Initial exact attempt
    pollStatus();

    // Safely clear interval if component unmounts
    return () => clearInterval(intervalId);
  }, [orderId, router, clearCart]);

  if (error) {
    return (
      <div className="w-full max-w-lg mx-auto p-8 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900 rounded-3xl shadow-xl text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 flex items-center justify-center mb-6 text-3xl font-extrabold pb-1">!</div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Verification Error</h1>
        <p className="text-gray-500 mb-8">{error}</p>
        <button onClick={() => router.push('/checkout')} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
          Return to Checkout
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto p-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl text-center flex flex-col items-center">
      <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-8" />
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-3">Verifying your payment...</h1>
      <p className="text-gray-500 dark:text-gray-400 font-medium">
        We're securely talking to your bank. Please do not close or refresh this window as it may interrupt the transaction.
      </p>
    </div>
  );
}
