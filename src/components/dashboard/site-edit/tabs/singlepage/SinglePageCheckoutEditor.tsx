'use client';

import React from 'react';
import { ShoppingCart, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { SinglePageContentData } from './singlepage-types';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl text-[13px] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-300';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">{children}</label>;
}

function SectionCard({ icon: Icon, title, desc, children }: { icon: React.ElementType; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#151525] border border-gray-200/60 dark:border-gray-800/60 rounded-3xl p-6 space-y-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-orange-500" /> {title}
        </h3>
        {desc && <p className="text-[13px] text-gray-500 mt-1">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SinglePageCheckoutEditor({
  data,
  onChange,
}: {
  data: SinglePageContentData;
  onChange: (d: SinglePageContentData) => void;
}) {
  return (
    <div className="space-y-6">

      {/* ── Checkout Style ── */}
      <SectionCard icon={ShoppingCart} title="Checkout Design" desc="Configure how the checkout experience looks.">
        <div>
          <FieldLabel>Checkout Style</FieldLabel>
          <div className="flex gap-2">
            {(['embedded', 'redirect', 'modal'] as const).map(s => {
              const active = (data.checkoutStyle || 'embedded') === s;
              const labels: Record<string, string> = { embedded: 'Embedded', redirect: 'Redirect', modal: 'Popup Modal' };
              const descs: Record<string, string> = { embedded: 'Checkout form on the page', redirect: 'Redirect to checkout page', modal: 'Open in a popup' };
              return (
                <button key={s} onClick={() => onChange({ ...data, checkoutStyle: s })}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all ${
                    active ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                  }`}>
                  <span className="text-xs font-semibold">{labels[s]}</span>
                  <span className="text-[10px] opacity-60">{descs[s]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel>Alignment</FieldLabel>
          <div className="flex gap-1.5">
            {([
              { id: 'left' as const, icon: AlignLeft },
              { id: 'center' as const, icon: AlignCenter },
              { id: 'right' as const, icon: AlignRight },
            ]).map(a => {
              const active = (data.checkoutAlignment || 'center') === a.id;
              return (
                <button key={a.id} onClick={() => onChange({ ...data, checkoutAlignment: a.id })}
                  className={`p-2.5 rounded-xl border-2 transition-all ${
                    active ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                  }`}>
                  <a.icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* ── CTA Buttons ── */}
      <SectionCard icon={ShoppingCart} title="Call to Action" desc="Customize the buy button text.">
        <div>
          <FieldLabel>Button Text</FieldLabel>
          <input type="text" value={data.ctaText || ''} onChange={e => onChange({ ...data, ctaText: e.target.value })}
            className={INPUT} placeholder="Buy Now" />
        </div>
        <div>
          <FieldLabel>Subtext (optional)</FieldLabel>
          <input type="text" value={data.ctaSubtext || ''} onChange={e => onChange({ ...data, ctaSubtext: e.target.value })}
            className={INPUT} placeholder="e.g. 30-day money-back guarantee" />
        </div>
      </SectionCard>

    </div>
  );
}
