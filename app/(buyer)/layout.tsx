import React from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">
      {/* Distraction-free Checkout Header */}
      <header className="w-full bg-[var(--bg-primary)] border-b border-[var(--border)] py-4 px-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand)] to-violet-600 text-white flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
              D
            </div>
            <span className="font-bold text-[15px] tracking-tight text-[var(--text-primary)]">
              DigiOne Checkout
            </span>
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
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
      <footer className="w-full py-8 text-center text-sm font-medium text-[var(--text-secondary)]">
        <p>Secured by Cashfree Payments &copy; {new Date().getFullYear()} DigiOne.</p>
      </footer>
    </div>
  );
}
