"use client";

import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export interface CartButtonProps {
  itemCount: number;
  className?: string;
}

export function CartButton({ itemCount, className = '' }: CartButtonProps) {
  return (
    <Link 
      href="/checkout/cart" 
      className={`relative p-2 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--store-primary,var(--color-text-primary))] hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${className}`}
    >
      <ShoppingCart className="w-6 h-6" />
      {itemCount > 0 && (
        <span className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 bg-[var(--store-primary,var(--brand))] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-zinc-900 shadow-sm animate-in zoom-in spin-in-1 duration-300">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}
