import React from 'react';

export default function TrustBadges({ settings }: { settings: any }) {
  const text = settings?.text || 'Trusted by over 10,000+ creators and professionals worldwide';
  const showPaymentLogos = settings?.show_payment_logos !== false;
  
  return (
    <section className="w-full py-16 bg-[--creator-surface]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        <p className="text-sm md:text-base font-medium text-[--creator-text-muted] uppercase tracking-wider mb-8">
          {text}
        </p>

        {showPaymentLogos && (
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Payment Method Placeholders */}
            <div className="flex items-center gap-2 font-bold text-xl text-[--creator-text]">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
              Stripe
            </div>
            <div className="flex items-center gap-2 font-bold text-xl text-[--creator-text]">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
              UPI
            </div>
            <div className="flex items-center gap-2 font-bold text-xl text-[--creator-text]">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              Visa
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
