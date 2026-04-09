'use client';

import React from 'react';
import { ShoppingCart, AlignLeft, AlignCenter, AlignRight, Shield, CreditCard, Plus, X } from 'lucide-react';
import type { SinglePageContentData } from './singlepage-types';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl text-[13px] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-300';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">{children}</label>;
}

function SectionCard({ icon: Icon, title, desc, color = 'orange', children }: { icon: React.ElementType; title: string; desc?: string; color?: string; children: React.ReactNode }) {
  const colors: Record<string, string> = { orange: 'text-orange-500', emerald: 'text-emerald-500', blue: 'text-blue-500' };
  return (
    <div className="bg-white dark:bg-[#151525] border border-gray-200/60 dark:border-gray-800/60 rounded-3xl p-6 space-y-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colors[color] ?? 'text-orange-500'}`} /> {title}
        </h3>
        {desc && <p className="text-[13px] text-gray-500 mt-1">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

const DEFAULT_TRUST_BADGES = [
  'Guaranteed Safe',
  'SSL Secure',
  'Verified Seller',
  'Money Back Guarantee',
  'Instant Access',
  '24/7 Support',
];

export default function SinglePageCheckoutEditor({
  data,
  onChange,
}: {
  data: SinglePageContentData;
  onChange: (d: SinglePageContentData) => void;
}) {
  const trustBadges = data.trustBadges || [];

  return (
    <div className="space-y-6">

      {/* ── Checkout Style ── */}
      <SectionCard icon={ShoppingCart} title="Checkout Layout" desc="Configure how the checkout experience works.">
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

      {/* ── CTA Button ── */}
      <SectionCard icon={ShoppingCart} title="Call to Action Button" desc="Customize the buy button text and style.">
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

        <div>
          <FieldLabel>Button Style</FieldLabel>
          <div className="grid grid-cols-4 gap-2">
            {(['solid', 'gradient', 'outline', 'glow'] as const).map(s => {
              const active = (data.ctaButtonStyle || 'solid') === s;
              return (
                <button key={s} onClick={() => onChange({ ...data, ctaButtonStyle: s })}
                  className={`py-2 rounded-xl text-[11px] font-semibold border-2 transition-all capitalize ${
                    active ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600' : 'border-gray-200 dark:border-gray-700 text-gray-500'
                  }`}>
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel>Button Size</FieldLabel>
          <div className="flex gap-2">
            {(['sm', 'md', 'lg', 'xl'] as const).map(s => {
              const active = (data.ctaButtonSize || 'lg') === s;
              const labels: Record<string, string> = { sm: 'Small', md: 'Medium', lg: 'Large', xl: 'Full Width' };
              return (
                <button key={s} onClick={() => onChange({ ...data, ctaButtonSize: s })}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-semibold border-2 transition-all ${
                    active ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600' : 'border-gray-200 dark:border-gray-700 text-gray-500'
                  }`}>
                  {labels[s]}
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* ── Trust Badges ── */}
      <SectionCard icon={Shield} title="Trust Badges" desc="Reassure buyers with trust signals below the checkout." color="emerald">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={data.showTrustBadges !== false}
            onChange={e => onChange({ ...data, showTrustBadges: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">Show trust badges below checkout</span>
        </label>

        {data.showTrustBadges !== false && (
          <>
            <div className="space-y-2">
              {trustBadges.map((badge, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <input type="text" value={badge}
                    onChange={e => onChange({ ...data, trustBadges: trustBadges.map((b, idx) => idx === i ? e.target.value : b) })}
                    className={`${INPUT} flex-1`} placeholder="Trust badge text..." />
                  <button onClick={() => onChange({ ...data, trustBadges: trustBadges.filter((_, idx) => idx !== i) })}
                    className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick add presets */}
            <div>
              <p className="text-[11px] font-medium text-gray-500 mb-2">Quick Add:</p>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_TRUST_BADGES.filter(b => !trustBadges.includes(b)).map(badge => (
                  <button key={badge}
                    onClick={() => onChange({ ...data, trustBadges: [...trustBadges, badge] })}
                    className="flex items-center gap-1 px-2.5 py-1.5 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-[10px] font-medium text-gray-500 hover:text-emerald-500 hover:border-emerald-300 transition-all">
                    <Plus className="w-2.5 h-2.5" />
                    {badge}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => onChange({ ...data, trustBadges: [...trustBadges, ''] })}
              className="flex items-center justify-center w-full gap-2 py-2.5 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-[13px] font-semibold text-gray-500 hover:text-emerald-500 hover:border-emerald-300 transition-all">
              <Plus className="w-4 h-4" /> Add Custom Badge
            </button>
          </>
        )}
      </SectionCard>

      {/* ── Payment Icons ── */}
      <SectionCard icon={CreditCard} title="Payment Icons" desc="Show accepted payment methods for confidence." color="blue">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={data.showPaymentIcons ?? true}
            onChange={e => onChange({ ...data, showPaymentIcons: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">Show payment method icons (UPI, Cards, Wallet)</span>
        </label>
        <p className="text-[11px] text-gray-400">Icons for UPI, Visa, Mastercard, and wallet will appear near checkout when enabled.</p>
      </SectionCard>

    </div>
  );
}
