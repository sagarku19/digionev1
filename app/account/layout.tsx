import React from 'react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#16130F]">
      <MarketingNav />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
