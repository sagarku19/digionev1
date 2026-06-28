import React from 'react';
import { Rails, Cross, Kicker } from '@/src/components/marketing/Ledger';

/* Shared engineered-ledger scaffolding for legal/policy pages
   (refunds, privacy, terms). Hero + numbered section ledger. */

export interface LegalSection {
  title: string;
  content: string;
}

function renderContent(content: string) {
  return content.split('\n').map((line, i) => {
    if (line.trim() === '') return <br key={i} />;
    const html = line.replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="text-[#16130F] font-semibold">$1</strong>'
    );
    return (
      <p
        key={i}
        className="text-[14px] text-black/60 font-medium leading-[1.85]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });
}

export default function LegalLedger({
  route,
  title,
  accent,
  sub,
  updated,
  sections,
  toc = false,
  footer,
}: {
  route: string;
  title: string;
  accent: string;
  sub: string;
  updated: string;
  sections: LegalSection[];
  toc?: boolean;
  footer: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
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
        <Rails className="pt-28 sm:pt-36">
          <div className="px-5 sm:px-10 lg:px-14 pb-12 sm:pb-16">
            <div className="max-w-3xl mx-auto">
              <Kicker index="00" route={route} />
              <h1 className="mt-7 sm:mt-9 text-[36px] sm:text-[48px] lg:text-[56px] font-bold tracking-[-0.04em] leading-[1.05] text-[#16130F]">
                {title} <span className="text-[#E83A2E]">{accent}</span>
              </h1>
              <p className="mt-5 text-[15px] sm:text-[16px] font-medium text-black/50 max-w-xl leading-relaxed">
                {sub}
              </p>
              <p className="font-ledger mt-6 text-[10px] tracking-[0.18em] text-black/35 uppercase">
                Last updated {updated}
              </p>
            </div>
          </div>
        </Rails>
      </section>

      {/* Content */}
      <section className="relative bg-white">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <Cross className="-bottom-[5px] -left-[5px]" />
          <Cross className="-bottom-[5px] -right-[5px]" />
          <div className="px-5 sm:px-10 lg:px-14 py-12 sm:py-16">
            <div className="max-w-3xl mx-auto">

              {toc && (
                <div className="mb-12 p-5 rounded-xl bg-[#FAF8F6] border border-black/[0.07]">
                  <p className="font-ledger text-[9px] font-medium text-black/35 uppercase tracking-[0.18em] mb-3">
                    Sections
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {sections.map(({ title: t }) => (
                      <div key={t} className="flex items-center gap-2.5 text-[13px] font-medium text-black/55">
                        <span className="font-ledger text-[#E83A2E] font-semibold text-[10px]">
                          {'>>'}
                        </span>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-12">
                {sections.map(({ title: t, content }) => (
                  <div key={t}>
                    <div className="flex items-center gap-4 font-ledger text-[11px] mb-4">
                      <span className="text-[#E83A2E] font-semibold">
                        {'>>'}
                      </span>
                      <span aria-hidden="true" className="h-px flex-1 bg-black/[0.07]" />
                    </div>
                    <h2 className="text-[19px] font-bold tracking-[-0.02em] text-[#16130F] mb-3">{t}</h2>
                    <div className="space-y-1">{renderContent(content)}</div>
                  </div>
                ))}
              </div>

              {footer}
            </div>
          </div>
        </Rails>
      </section>
    </div>
  );
}
