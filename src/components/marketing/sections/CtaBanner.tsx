"use client";

import Link from 'next/link';
import InView from '@/src/components/marketing/InView';
import { ArrowRight } from 'lucide-react';
import { useAuthSession } from '@/hooks/auth/useAuthSession';
import { Rails, Kicker, Cross } from '@/src/components/marketing/Ledger';

export default function CtaBanner() {
  const { isLoggedIn } = useAuthSession();

  return (
    <section className="relative bg-white">
      <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
      <Rails>
        <Cross className="-bottom-[5px] -left-[5px]" />
        <Cross className="-bottom-[5px] -right-[5px]" />

        <div className="px-5 sm:px-10 lg:px-14 py-14 sm:py-20 lg:py-24">
          <InView>
            <div className="iv">
              <Kicker index="06" route="/signup" />

              {/* Platform highlights — ledger strip, four equal rectangles */}
              <div className="mt-7 sm:mt-9 border border-black/[0.08] grid grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Digital Product', sub: 'Sell anything you can make' },
                  { label: 'AI Tools', sub: 'Built into your workflow' },                  
                  { label: 'Automation Flow', sub: 'DMs, emails & Automation' },
                  { label: 'No-Code Website', sub: 'Launch without writing code' },
                ].map((item, i) => (
                  <div
                    key={item.label}
                    className={`px-5 sm:px-7 py-5 sm:py-7 border-black/[0.08] ${i > 0 ? 'border-l' : ''} ${
                      i >= 2 ? 'border-t lg:border-t-0' : ''
                    } ${i === 2 ? 'border-l-0 lg:border-l' : ''}`}
                  >
                    <p className="text-[15px] sm:text-[17px] font-bold tracking-[-0.02em] text-[#16130F] leading-none">
                      {item.label}
                    </p>
                    <p className="mt-2 text-[12px] sm:text-[13px] font-medium text-black/40">{item.sub}</p>
                  </div>
                ))}
              </div>

              <div className="mt-7 sm:mt-9 relative rounded-2xl bg-[#E83A2E] overflow-hidden">
                {/* Stamp texture */}
                <svg aria-hidden="true" className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <filter id="cta-grain">
                    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
                    <feColorMatrix type="saturate" values="0" />
                  </filter>
                  <rect width="100%" height="100%" filter="url(#cta-grain)" />
                </svg>
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse 60% 90% at 85% 10%, rgba(255,255,255,0.14) 0%, transparent 60%)' }}
                />

                <div className="relative p-8 sm:p-14 lg:p-16">
                  <h2 className="text-[32px] sm:text-[44px] lg:text-[52px] font-bold tracking-[-0.035em] leading-[1.05] text-white max-w-xl">
                    Start selling in 30 minutes.
                  </h2>
                  <p className="mt-4 text-[15px] sm:text-[17px] font-medium text-white/75 max-w-md leading-relaxed">
                    No credit card. No setup fee. Just your products, your audience,
                    and your income.
                  </p>

                  <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:items-center gap-3">
                    {isLoggedIn ? (
                      <Link
                        href="/dashboard"
                        className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#16130F] hover:bg-black text-white font-semibold text-[14px] transition-colors duration-200"
                      >
                        Go to your dashboard
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                      </Link>
                    ) : (
                      <>
                        <Link
                          href="/signup"
                          className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#16130F] hover:bg-black text-white font-semibold text-[14px] transition-colors duration-200"
                        >
                          Create your free store
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                        </Link>
                        <Link
                          href="/login"
                          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border border-white/35 hover:border-white/70 text-white font-semibold text-[14px] transition-colors duration-200"
                        >
                          Sign in
                        </Link>
                      </>
                    )}
                  </div>

                  <p className="font-ledger mt-7 text-[10px] sm:text-[11px] tracking-[0.18em] text-white/55 uppercase">
                    Free forever plan · Setup in 2 minutes
                  </p>
                </div>
              </div>
            </div>
          </InView>
        </div>
      </Rails>
    </section>
  );
}
