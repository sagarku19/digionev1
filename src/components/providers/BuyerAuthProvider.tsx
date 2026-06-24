"use client";

// Mounts the centered buyer auth modal exactly once for the whole app. The modal
// is driven by the global useBuyerAuth store, so any surface can open it without
// rendering its own modal tree. Mounted in app/providers.tsx.

import BuyerAuthModal from '@/components/auth/BuyerAuthModal';

export function BuyerAuthProvider() {
  return <BuyerAuthModal />;
}
