import React from 'react';
import CheckoutChrome from '@/components/store/CheckoutChrome';

// Buyer commerce shell (cart + checkout). Paper canvas with a subtle
// engineered graph-paper wash + the minimal CheckoutChrome header — NO
// marketing nav/footer, keeping the payment flow focused.
export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#FAF8F6] text-[#16130F]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(22,19,15,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(22,19,15,0.025) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          WebkitMaskImage: 'radial-gradient(ellipse 100% 55% at 50% 0%, #000 0%, transparent 88%)',
          maskImage: 'radial-gradient(ellipse 100% 55% at 50% 0%, #000 0%, transparent 88%)',
        }}
      />
      <CheckoutChrome />
      <main className="relative flex-1">{children}</main>
    </div>
  );
}
