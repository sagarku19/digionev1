"use client";

// Global opener for the centered buyer auth modal. The modal itself is mounted
// once via BuyerAuthProvider; any surface (storefront, checkout, account) opens
// it with useBuyerAuth.getState().open('login') or const open = useBuyerAuth(s => s.open).

import { create } from 'zustand';

export type BuyerAuthView = 'login' | 'signup' | 'forgot' | 'reset';

interface BuyerAuthStore {
  isOpen: boolean;
  view: BuyerAuthView;
  // Where to send the buyer after a successful login/signup. null = stay in place.
  redirectTo: string | null;
  open: (view?: BuyerAuthView, redirectTo?: string | null) => void;
  setView: (view: BuyerAuthView) => void;
  close: () => void;
}

export const useBuyerAuth = create<BuyerAuthStore>((set) => ({
  isOpen: false,
  view: 'login',
  redirectTo: null,
  open: (view = 'login', redirectTo = null) => set({ isOpen: true, view, redirectTo }),
  setView: (view) => set({ view }),
  close: () => set({ isOpen: false }),
}));
