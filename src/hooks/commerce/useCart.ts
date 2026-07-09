"use client";

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { classifyAdd, type AddItemResult, type CartItem } from './cart-logic';

export type { AddItemResult, CartItem };

interface CartStore {
  items: CartItem[];
  isDrawerOpen: boolean;
  addItem: (item: CartItem) => AddItemResult;
  replaceCartWith: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,
      addItem: (item) => {
        const result = classifyAdd(get().items, item);
        if (result === 'added') set({ items: [...get().items, item] });
        return result;
      },
      replaceCartWith: (item) => set({ items: [item] }),
      removeItem: (id) => {
        set({ items: get().items.filter(i => i.id !== id) });
      },
      clearCart: () => set({ items: [] }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
    }),
    {
      name: 'digione-cart',
      partialize: (s) => ({ items: s.items }),
    }
  )
);

/** Derived total — use this instead of store.total */
export function useCartTotal() {
  const items = useCart(s => s.items);
  return items.reduce((sum, item) => sum + item.price, 0);
}

/**
 * SSR-safe item count: returns 0 on the server and the first client (hydration)
 * render, then the real count. useSyncExternalStore uses the server snapshot (0)
 * for SSR + hydration and switches to the live snapshot afterward, so the count
 * can never cause a hydration mismatch even though zustand persist rehydrates
 * from localStorage before React hydration.
 */
export function useHydratedCartCount() {
  return useSyncExternalStore(
    useCart.subscribe,
    () => useCart.getState().items.length,
    () => 0,
  );
}
