'use client';
// PricingTable section — plan cards with feature lists.
// No DB tables (plan data from settings)

import React from 'react';
import { Check } from 'lucide-react';

const DEFAULT_PLANS = [
  {
    name: 'Starter', price: 999, period: '/mo', highlight: false,
    description: 'Perfect for getting started',
    features: ['Single product', 'Basic analytics', 'Email support'], cta_text: 'Get started', cta_url: '#',
  },
  {
    name: 'Pro', price: 2999, period: '/mo', highlight: true,
    description: 'For serious creators',
    features: ['Unlimited products', 'Advanced analytics', 'Priority support', 'Custom domain'], cta_text: 'Start Pro', cta_url: '#',
  },
];

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function PricingTable({ settings }: { settings: any }) {
  const title = settings?.title ?? 'Simple pricing';
  const subtitle = settings?.subtitle ?? '';
  const plans = settings?.plans ?? DEFAULT_PLANS;

  return (
    <section className="py-20 px-4 bg-[--creator-surface]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          {title && <h2 className="text-3xl font-bold text-[--creator-text]">{title}</h2>}
          {subtitle && <p className="text-[--creator-text-muted] mt-3">{subtitle}</p>}
        </div>
        <div className={`grid grid-cols-1 gap-6 ${plans.length > 2 ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-3xl mx-auto'}`}>
          {plans.map((plan: any, i: number) => (
            <div
              key={i}
              className={`relative flex flex-col rounded-2xl p-7 border-2 transition-shadow ${
                plan.highlight
                  ? 'border-[--creator-primary] shadow-2xl shadow-[--creator-primary]/20 bg-[--creator-primary]/5'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0A0A1A]'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[--creator-primary] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className={`text-lg font-bold ${plan.highlight ? 'text-[--creator-primary]' : 'text-[--creator-text]'}`}>{plan.name}</h3>
                <p className="text-sm text-[--creator-text-muted] mt-1">{plan.description}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-[--creator-text]">{formatINR(plan.price)}</span>
                  <span className="text-[--creator-text-muted] text-sm mb-1">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {(plan.features ?? []).map((f: string, fi: number) => (
                  <li key={fi} className="flex items-start gap-2.5 text-sm text-[--creator-text]">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={plan.cta_url ?? '#'}
                className={`block text-center py-3.5 rounded-xl font-bold text-sm transition-all ${
                  plan.highlight
                    ? 'bg-[--creator-primary] text-white hover:opacity-90 shadow-lg shadow-[--creator-primary]/30'
                    : 'border-2 border-[--creator-primary] text-[--creator-primary] hover:bg-[--creator-primary]/5'
                }`}
              >
                {plan.cta_text}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
