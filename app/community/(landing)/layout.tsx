import React from 'react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';

// Keeps the /community landing page inside the marketing chrome. The sibling
// /community/[handle] profile page lives outside this group, so it renders
// full-bleed with no nav/footer.
export default function CommunityLandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#16130F]">
      <MarketingNav />
      <main className="flex-1 flex flex-col">{children}</main>
      <MarketingFooter />
    </div>
  );
}
