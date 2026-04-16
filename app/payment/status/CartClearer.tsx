'use client';

import { useEffect } from 'react';
import { useCart } from '@/hooks/useCart';

/** Clears the cart once on mount — used after successful product checkout */
export function CartClearer() {
  const { clearCart } = useCart();
  useEffect(() => { clearCart(); }, [clearCart]);
  return null;
}
