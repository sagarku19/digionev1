"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // Product ID
  title: string;
  price: number;
  creatorId: string;
  coverImage: string | null;
  slug: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const currentItems = get().items;
        if (!currentItems.find(i => i.id === item.id)) {
          set({ items: [...currentItems, item] });
        }
      },
      removeItem: (id) => {
        set({ items: get().items.filter(i => i.id !== id) });
      },
      clearCart: () => set({ items: [] }),
    }),
    { name: 'digione-cart' }
  )
);

/** Derived total — use this instead of store.total */
export function useCartTotal() {
  const items = useCart(s => s.items);
  return items.reduce((sum, item) => sum + item.price, 0);
}
