'use client';

import React from 'react';
import Link from 'next/link';
import { Library, ArrowRight } from 'lucide-react';
import { Rails, Cross, Kicker } from '@/src/components/marketing/Ledger';
import LibraryAccountActions from '@/components/account/LibraryAccountActions';

export default function BuyerLibraryPage() {
  return (
    <div className="flex flex-col w-full overflow-hidden bg-white">

      {/* Header */}
      <section className="relative bg-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(22,19,15,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(22,19,15,0.035) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
          }}
        />
        <Rails className="pt-28 sm:pt-32">
          <div className="px-5 sm:px-10 lg:px-14 pb-10 sm:pb-12">
            <Kicker index="00" route="/account/library" />
            <h1 className="mt-7 text-[30px] sm:text-[40px] font-bold tracking-[-0.04em] leading-[1.05] text-[#16130F]">
              My digital <span className="text-[#E83A2E]">library.</span>
            </h1>
            <p className="mt-4 text-[14px] sm:text-[15px] font-medium text-black/50 max-w-xl leading-relaxed">
              Access all of your purchased content, courses, and downloads across DigiOne.
            </p>
          </div>
        </Rails>
      </section>

      {/* Empty state */}
      <section className="relative bg-white">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <Cross className="-bottom-[5px] -left-[5px]" />
          <Cross className="-bottom-[5px] -right-[5px]" />
          <div className="px-5 sm:px-10 lg:px-14 py-10 sm:py-14">
            <div className="max-w-3xl bg-white border border-black/[0.07] rounded-xl p-10 sm:p-14 text-center">
              <div className="w-14 h-14 rounded-lg bg-[#FAF8F6] border border-black/[0.07] flex items-center justify-center mx-auto mb-5">
                <Library className="w-6 h-6 text-[#E83A2E]" strokeWidth={1.8} />
              </div>
              <p className="font-ledger text-[10px] uppercase tracking-[0.18em] text-black/35 mb-3">
                0 items · No purchases yet
              </p>
              <h2 className="text-[19px] font-bold tracking-[-0.02em] text-[#16130F] mb-2">
                Your library is currently empty
              </h2>
              <p className="text-[13.5px] font-medium text-black/50 max-w-sm mx-auto mb-7 leading-relaxed">
                When you purchase templates, assets, or software from creators, they will appear here forever.
              </p>
              <Link
                href="/discover"
                className="group inline-flex items-center gap-2 bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Discover top products
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </div>

            <LibraryAccountActions />
          </div>
        </Rails>
      </section>
    </div>
  );
}
