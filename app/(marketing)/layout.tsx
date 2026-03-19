import React from 'react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#03040A] text-white">
      <MarketingNav />
      {/* 
        The top padding here (pt-[72px] or similar) ensures content 
        isn't hidden behind the fixed navbar.
      */}
      <main className="flex-1 flex flex-col pt-[72px]">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
