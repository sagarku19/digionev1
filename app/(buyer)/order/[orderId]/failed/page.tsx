'use client';

import React from 'react';
import Link from 'next/link';
import { XCircle, RefreshCcw } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function OrderFailedPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center py-16 px-4 text-center">
      
      <div className="w-24 h-24 bg-red-100 dark:bg-red-900/40 text-red-600 rounded-full flex items-center justify-center mb-8 shadow-inner border-[8px] border-red-50 dark:border-gray-950">
        <XCircle className="w-12 h-12" />
      </div>
      
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
        Payment Failed
      </h1>
      
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
        Your transaction for order <span className="font-mono text-gray-900 dark:text-white font-medium">{orderId}</span> could not be completed. Your account has not been charged, or if it was, it will be automatically refunded by your bank within 3-5 business days.
      </p>

      <div className="w-full p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-800 dark:text-red-400 text-sm font-medium mb-10 text-left">
        <strong>Possible reasons:</strong>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Insufficient funds in the selected account.</li>
          <li>Incorrect CVV or expiry date.</li>
          <li>Network timeout or bank server downtime.</li>
          <li>You manually closed the payment window.</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <Link 
          href="/checkout" 
          className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg"
        >
          <RefreshCcw className="w-5 h-5" />
          Try Payment Again
        </Link>
        <Link 
          href="/cart" 
          className="flex-1 py-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-xl font-bold hover:bg-gray-50 transition"
        >
          Return to Cart
        </Link>
      </div>

    </div>
  );
}
