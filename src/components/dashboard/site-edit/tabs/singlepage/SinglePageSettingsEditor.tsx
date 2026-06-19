'use client';

import React from 'react';
import { Timer, Settings2, BarChart2, Lock, Eye, EyeOff } from 'lucide-react';
import { INPUT, FieldLabel, SectionCard } from './_shared';

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


function Toggle({ on, onToggle, label, desc }: { on: boolean; onToggle: () => void; label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
      <div>
        <p className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
          on ? 'bg-[var(--brand)]' : 'border border-[var(--border)] bg-[var(--surface-muted)]'
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
        <div className="p-4 bg-[var(--danger-bg)] rounded-[var(--radius-md)] border border-[var(--danger)]/20">
          <label className="block text-[13px] font-semibold text-[var(--danger)] mb-2">Offer End Date/Time</label>
          <input type="datetime-local" value={data.countdownEnd} onChange={e => onChange({ ...data, countdownEnd: e.target.value })}
            className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--danger)]/30 rounded-xl text-[13px] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--danger)]/20 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all duration-300" />
          <p className="text-[11px] text-[var(--danger)] mt-2">Leave blank to hide the countdown timer.</p>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition"
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
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Your GA4 or Universal Analytics measurement ID.</p>
        </div>
        <div>
          <FieldLabel>Facebook Pixel ID</FieldLabel>
          <input type="text" value={data.analyticsFbPixelId || ''}
            onChange={e => onChange({ ...data, analyticsFbPixelId: e.target.value })}
            className={INPUT} placeholder="1234567890123456" />
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Your Meta Pixel ID for tracking conversions.</p>
        </div>
      </SectionCard>

    </div>
  );
}
