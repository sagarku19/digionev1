import React from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Distraction-free Checkout Header */}
      <header className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-4 px-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform">
              D
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">
              DigiOne Checkout
            </span>
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <ShoppingBag className="w-4 h-4" />
            Secure Order
          </div>
        </div>
      </header>

      {/* Main Checkout Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:py-12">
        {children}
      </main>
      
      {/* Simple Footer */}
      <footer className="w-full py-8 text-center text-sm font-medium text-gray-400 dark:text-gray-600">
        <p>Secured by Cashfree Payments &copy; {new Date().getFullYear()} DigiOne.</p>
      </footer>
    </div>
  );
}
