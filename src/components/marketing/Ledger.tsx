import React from 'react';
import InView from '@/src/components/marketing/InView';

/* ==========================================================================
   Engineered-ledger scaffolding for marketing sections.
   Every section shares: a full-bleed background, a max-w-6xl container with
   visible vertical rules, corner crosses at the joints, and a mono kicker
   row of `>>` + dashboard route. Keeps the page reading as one
   continuous technical document.
   ========================================================================== */

export const INK = '#16130F';
export const VERMILION = '#E83A2E';

type Tone = 'white' | 'paper' | 'ink';

const TONE_BG: Record<Tone, string> = {
  white: 'bg-white',
  paper: 'bg-[#FAF8F6]',
  ink: 'bg-[#16130F]',
};

export function Cross({ dark = false, className = '' }: { dark?: boolean; className?: string }) {
  const stroke = dark ? 'bg-white/25' : 'bg-black/[0.22]';
  return (
    <span aria-hidden="true" className={`absolute w-[9px] h-[9px] z-10 ${className}`}>
      <span className={`absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 ${stroke}`} />
      <span className={`absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 ${stroke}`} />
    </span>
  );
}

export function Rails({
  tone = 'white',
  children,
  className = '',
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const dark = tone === 'ink';
  const rail = dark ? 'border-white/[0.09]' : 'border-black/[0.08]';
  return (
    <div className={`relative max-w-6xl mx-auto border-x ${rail} ${className}`}>
      <Cross dark={dark} className="-top-[5px] -left-[5px]" />
      <Cross dark={dark} className="-top-[5px] -right-[5px]" />
      {children}
    </div>
  );
}

export function Kicker({
  route,
  dark = false,
}: {
  /** Kept for callsite compatibility — kickers now render `>>` instead of an index. */
  index?: string;
  route: string;
  dark?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 font-ledger text-[11px] sm:text-[12px] tracking-[0.04em]">
      <span className={dark ? 'text-[#FF6B5C] font-semibold' : 'text-[#E83A2E] font-semibold'}>
        {'>>'}
      </span>
      <span aria-hidden="true" className={`h-px flex-1 ${dark ? 'bg-white/[0.09]' : 'bg-black/[0.07]'}`} />
      <span className={dark ? 'text-white/35' : 'text-black/35'}>{route}</span>
    </div>
  );
}

export function SectionShell({
  id,
  index,
  route,
  title,
  sub,
  tone = 'white',
  children,
}: {
  id?: string;
  index: string;
  route: string;
  title: React.ReactNode;
  sub?: string;
  tone?: Tone;
  children: React.ReactNode;
}) {
  const dark = tone === 'ink';
  return (
    <section id={id} className={`relative ${TONE_BG[tone]}`}>
      <div aria-hidden="true" className={`h-px w-full ${dark ? 'bg-white/[0.09]' : 'bg-black/[0.07]'}`} />
      <Rails tone={tone}>
        <div className="px-5 sm:px-10 lg:px-14 py-14 sm:py-20 lg:py-24">
          <InView>
            <div className="iv">
              <Kicker index={index} route={route} dark={dark} />
              <div className="mt-7 sm:mt-9 max-w-2xl">
                <h2
                  className={`text-[28px] sm:text-[38px] lg:text-[44px] font-bold tracking-[-0.03em] leading-[1.08] ${
                    dark ? 'text-white' : 'text-[#16130F]'
                  }`}
                >
                  {title}
                </h2>
                {sub && (
                  <p className={`mt-4 text-[15px] sm:text-[16px] leading-relaxed font-medium ${dark ? 'text-white/55' : 'text-black/50'}`}>
                    {sub}
                  </p>
                )}
              </div>
            </div>
          </InView>
          {children}
        </div>
      </Rails>
    </section>
  );
}
