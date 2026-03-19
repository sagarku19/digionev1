'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, FileVideo, Download } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function OrderSuccessPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center py-12 px-4">
      {/* Confetti / Success Header */}
      <div className="w-24 h-24 bg-green-100 dark:bg-green-900/40 text-green-600 rounded-full flex items-center justify-center mb-8 shadow-inner border-[8px] border-green-50 dark:border-gray-950 animate-bounce">
        <CheckCircle2 className="w-12 h-12" />
      </div>
      
      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 text-center tracking-tight">
        Payment Successful!
      </h1>
      
      <p className="text-lg text-gray-500 dark:text-gray-400 mb-12 text-center max-w-lg">
        Thank you for your purchase. A receipt has been sent to your email. Your digital products are immediately available in your library.
      </p>

      {/* Order Info Strip */}
      <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col text-center md:text-left">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">Order Transaction Number</span>
          <span className="font-mono text-gray-900 dark:text-white font-medium">{orderId || 'ORD-XX-YYYY'}</span>
        </div>
        <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-bold flex items-center gap-1.5 border border-green-200 dark:border-green-800/30">
          <span className="w-2 h-2 rounded-full bg-green-500"></span> PAID
        </div>
      </div>

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Call to Actions */}
        <Link 
          href="/account/library" 
          className="flex flex-col items-center justify-center gap-3 p-8 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 group"
        >
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileVideo className="w-6 h-6 text-white" />
          </div>
          Access My Library
        </Link>
        
        <Link 
          href="/" 
          className="flex flex-col items-center justify-center gap-3 p-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-2xl font-bold hover:bg-gray-50 border border-gray-200 dark:border-gray-800 transition group"
        >
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
             <Download className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </div>
          Download Invoice
        </Link>
      </div>
    </div>
  );
}
