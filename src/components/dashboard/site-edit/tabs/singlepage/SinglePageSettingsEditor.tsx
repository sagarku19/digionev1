'use client';

import React from 'react';
import { Timer, ShoppingBag, Settings2 } from 'lucide-react';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl text-[13px] focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-300';

export type SinglePageSettingsData = {
  showBuyNow: boolean;
  showAddToCart: boolean;
  enableReviews: boolean;
  countdownEnd: string;
};

function SectionCard({ icon: Icon, title, desc, children }: { icon: React.ElementType, title: string, desc?: string, children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#151525] border border-gray-200/60 dark:border-gray-800/60 rounded-3xl p-6 space-y-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-pink-500" /> {title}
        </h3>
        {desc && <p className="text-[13px] text-gray-500 mt-1">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SinglePageSettingsEditor({
  data,
  onChange,
}: {
  data: SinglePageSettingsData;
  onChange: (d: SinglePageSettingsData) => void;
}) {
  return (
    <div className="space-y-6">
      
      {/* ── Landing Page Config ── */}
      <SectionCard icon={Settings2} title="Page Configuration" desc="Toggle specific sections and behaviors.">
        <div className="space-y-2">
          {[
            { key: 'showBuyNow', label: 'Buy Now Button', desc: 'Main call to action skipping the cart.', val: data.showBuyNow, set: (v: boolean) => onChange({ ...data, showBuyNow: v }) },
            { key: 'showAddToCart', label: 'Add to Cart Button', desc: 'Allow adding to a multi-item cart.', val: data.showAddToCart, set: (v: boolean) => onChange({ ...data, showAddToCart: v }) },
            { key: 'enableReviews', label: 'Customer Reviews', desc: 'Display product reviews at the bottom.', val: data.enableReviews, set: (v: boolean) => onChange({ ...data, enableReviews: v }) },
          ].map(opt => (
            <div key={opt.key} className="flex items-center justify-between px-4 py-3 bg-gray-50/80 dark:bg-gray-800/30 rounded-[1.25rem] border border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-[13px] font-semibold text-gray-900 dark:text-white">{opt.label}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</p>
              </div>
              <button
                role="switch"
                aria-checked={opt.val}
                onClick={() => opt.set(!opt.val)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  opt.val ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  opt.val ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Urgency Timer ── */}
      <SectionCard icon={Timer} title="Urgency Timer" desc="Add a countdown to drive faster conversions.">
        <div className="p-4 bg-red-50/50 dark:bg-red-500/5 rounded-[1.25rem] border border-red-100 dark:border-red-500/20">
          <label className="block text-[13px] font-semibold text-red-900 dark:text-red-400 mb-2">Offer End Date/Time</label>
          <input type="datetime-local" value={data.countdownEnd} onChange={e => onChange({ ...data, countdownEnd: e.target.value })}
            className={`w-full px-4 py-2.5 bg-white dark:bg-[#1A1A2E] border border-red-200 dark:border-red-900 rounded-xl text-[13px] focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-300`} />
          <p className="text-[11px] text-red-500/80 dark:text-red-400/80 mt-2">Leave blank to hide the countdown timer.</p>
        </div>
      </SectionCard>

    </div>
  );
}
