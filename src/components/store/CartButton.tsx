"use client";

import { ShoppingCart } from 'lucide-react';

export interface CartButtonProps {
  itemCount: number;
  onClick: () => void;
  className?: string;
  badgeClassName?: string;
}

export function CartButton({ itemCount, onClick, className = '', badgeClassName = '' }: CartButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={itemCount > 0 ? `Open cart, ${itemCount} item${itemCount === 1 ? '' : 's'}` : 'Open cart'}
      className={`relative p-2 rounded-full transition-colors ${className}`}
    >
      <ShoppingCart className="w-5 h-5" />
      {itemCount > 0 && (
        <span
          className={`absolute top-0 right-0 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-bold leading-none ${badgeClassName}`}
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  );
}
