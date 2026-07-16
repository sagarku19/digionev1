"use client";

import Link from 'next/link';
import InView from '@/src/components/marketing/InView';
import { ArrowRight } from 'lucide-react';
import { useAuthSession } from '@/hooks/auth/useAuthSession';
import { Rails, Kicker, Cross } from '@/src/components/marketing/Ledger';

const AiChip = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 220 220" fill="none" className={className} aria-hidden="true">
    <g stroke="rgba(255,255,255,0.85)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M88 70 V48" />
      <path d="M103 70 V34" />
      <path d="M118 70 V48" />
      <path d="M133 70 V56 L152 37" />
      <path d="M150 88 H176" />
      <path d="M150 103 H190" />
      <path d="M150 118 H172" />
      <path d="M150 133 H162 L180 151" />
      <path d="M88 150 V164 L70 182" />
      <path d="M103 150 V188" />
      <path d="M118 150 V170" />
      <path d="M133 150 V182" />
      <path d="M70 88 H58 L40 70" />
      <path d="M70 103 H30" />
      <path d="M70 118 H50" />
      <path d="M70 133 H38" />
      <circle cx="88" cy="43" r="4.5" />
      <circle cx="103" cy="29" r="4.5" />
      <circle cx="118" cy="43" r="4.5" />
      <circle cx="156" cy="33" r="4.5" />
      <circle cx="181" cy="88" r="4.5" />
      <circle cx="195" cy="103" r="4.5" />
      <circle cx="177" cy="118" r="4.5" />
      <circle cx="184" cy="155" r="4.5" />
      <circle cx="66" cy="186" r="4.5" />
      <circle cx="103" cy="193" r="4.5" />
      <circle cx="118" cy="175" r="4.5" />
      <circle cx="133" cy="187" r="4.5" />
      <circle cx="36" cy="66" r="4.5" />
      <circle cx="25" cy="103" r="4.5" />
      <circle cx="45" cy="118" r="4.5" />
      <circle cx="33" cy="133" r="4.5" />
      <rect x="70" y="70" width="80" height="80" rx="16" fill="rgba(255,255,255,0.1)" />
      <rect x="79" y="79" width="62" height="62" rx="10" />
    </g>
    <text
      x="110"
      y="112"
      textAnchor="middle"
      dominantBaseline="central"
      fill="#FFFFFF"
      fontSize="27"
      fontWeight="700"
      letterSpacing="1"
    >
      AI
    </text>
  </svg>
);

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
              <Kicker index="06" route="/login" />

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

                <div className="relative p-6 sm:p-14 lg:p-16 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 sm:gap-10 lg:gap-14 items-center">
                  <div>
                  <h2 className="text-[32px] sm:text-[44px] lg:text-[52px] font-bold tracking-[-0.035em] leading-[1.05] text-white max-w-xl">
                    Start selling in few minutes.
                  </h2>
                  <p className="mt-4 text-[15px] sm:text-[17px] font-medium text-white/75 max-w-md leading-relaxed">
                    No credit card. No setup fee. Just your products, multiple audience,
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

                  {/* AI chip — right side */}
                  <div className="flex flex-col items-center gap-3 justify-self-center lg:justify-self-end lg:mr-10">
                    <AiChip className="w-[180px] h-[180px] sm:w-[210px] sm:h-[210px]" />
                    <p className="text-[12.5px] font-medium text-white/80 text-center max-w-[230px] leading-snug">
                      Get your site ready in a few clicks with our AI-powered tools.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </InView>
        </div>
      </Rails>
    </section>
  );
}
