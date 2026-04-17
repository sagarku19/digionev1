'use client';

import React from 'react';
import { Timer, Settings2, BarChart2, Lock, Eye, EyeOff } from 'lucide-react';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50/50 dark:bg-[var(--bg-secondary)]/30 border border-[var(--border)] rounded-xl text-[13px] focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none text-[var(--text-primary)] placeholder-gray-400 transition-all duration-300';

export type SinglePageSettingsData = {
  showBuyNow: boolean;
  showAddToCart: boolean;
  enableReviews: boolean;
  countdownEnd: string;
  passwordProtection?: boolean;
  pagePassword?: string;
  analyticsGoogleId?: string;
  analyticsFbPixelId?: string;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-medium text-gray-700 dark:text-[var(--text-secondary)] mb-1.5">{children}</label>;
}

function SectionCard({ icon: Icon, title, desc, color = 'pink', children }: { icon: React.ElementType; title: string; desc?: string; color?: string; children: React.ReactNode }) {
  const colors: Record<string, string> = { pink: 'text-pink-500', amber: 'text-amber-500', blue: 'text-blue-500', red: 'text-red-500' };
  return (
    <div className="bg-[var(--bg-primary)] border border-gray-200/60 dark:border-[var(--border)]/60 rounded-3xl p-6 space-y-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colors[color] ?? 'text-pink-500'}`} /> {title}
        </h3>
        {desc && <p className="text-[13px] text-gray-500 mt-1">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onToggle, label, desc }: { on: boolean; onToggle: () => void; label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 dark:bg-[var(--bg-secondary)]/30 rounded-[1.25rem] border border-[var(--border)]">
      <div>
        <p className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          on ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-700'
        }`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          on ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
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
  const [showPw, setShowPw] = React.useState(false);

  return (
    <div className="space-y-6">

      {/* ── Page Configuration ── */}
      <SectionCard icon={Settings2} title="Page Configuration" desc="Toggle specific sections and behaviors.">
        <div className="space-y-2">
          <Toggle on={data.showBuyNow} onToggle={() => onChange({ ...data, showBuyNow: !data.showBuyNow })}
            label="Buy Now Button" desc="Main call to action skipping the cart." />
          <Toggle on={data.showAddToCart} onToggle={() => onChange({ ...data, showAddToCart: !data.showAddToCart })}
            label="Add to Cart Button" desc="Allow adding to a multi-item cart." />
          <Toggle on={data.enableReviews} onToggle={() => onChange({ ...data, enableReviews: !data.enableReviews })}
            label="Customer Reviews" desc="Display product reviews at the bottom." />
        </div>
      </SectionCard>

      {/* ── Urgency Timer ── */}
      <SectionCard icon={Timer} title="Urgency Timer" desc="Add a countdown to drive faster conversions." color="red">
        <div className="p-4 bg-red-50/50 dark:bg-red-500/5 rounded-[1.25rem] border border-red-100 dark:border-red-500/20">
          <label className="block text-[13px] font-semibold text-red-900 dark:text-red-400 mb-2">Offer End Date/Time</label>
          <input type="datetime-local" value={data.countdownEnd} onChange={e => onChange({ ...data, countdownEnd: e.target.value })}
            className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-red-200 dark:border-red-900 rounded-xl text-[13px] focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none text-[var(--text-primary)] placeholder-gray-400 transition-all duration-300" />
          <p className="text-[11px] text-red-500/80 dark:text-red-400/80 mt-2">Leave blank to hide the countdown timer.</p>
        </div>
      </SectionCard>

      {/* ── Password Protection ── */}
      <SectionCard icon={Lock} title="Password Protection" desc="Restrict access to your page with a password." color="amber">
        <Toggle
          on={data.passwordProtection ?? false}
          onToggle={() => onChange({ ...data, passwordProtection: !(data.passwordProtection ?? false) })}
          label="Enable Password"
          desc="Visitors must enter a password to view the page."
        />
        {data.passwordProtection && (
          <div>
            <FieldLabel>Page Password</FieldLabel>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={data.pagePassword || ''}
                onChange={e => onChange({ ...data, pagePassword: e.target.value })}
                className={INPUT}
                placeholder="Enter page password..."
              />
              <button
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Analytics ── */}
      <SectionCard icon={BarChart2} title="Analytics & Tracking" desc="Connect your analytics tools to track page performance." color="blue">
        <div>
          <FieldLabel>Google Analytics ID</FieldLabel>
          <input type="text" value={data.analyticsGoogleId || ''}
            onChange={e => onChange({ ...data, analyticsGoogleId: e.target.value })}
            className={INPUT} placeholder="G-XXXXXXXXXX or UA-XXXXXXXX-X" />
          <p className="text-[10px] text-gray-400 mt-1">Your GA4 or Universal Analytics measurement ID.</p>
        </div>
        <div>
          <FieldLabel>Facebook Pixel ID</FieldLabel>
          <input type="text" value={data.analyticsFbPixelId || ''}
            onChange={e => onChange({ ...data, analyticsFbPixelId: e.target.value })}
            className={INPUT} placeholder="1234567890123456" />
          <p className="text-[10px] text-gray-400 mt-1">Your Meta Pixel ID for tracking conversions.</p>
        </div>
      </SectionCard>

    </div>
  );
}
