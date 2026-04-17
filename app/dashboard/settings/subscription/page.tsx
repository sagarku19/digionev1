'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check, Zap, Crown, Sparkles, Instagram, ArrowRight,
  MessageCircle, BarChart2, Shield, Star,
} from 'lucide-react';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    icon: Star,
    monthlyPrice: 0,
    yearlyPrice: 0,
    platformFee: '10%',
    color: 'gray',
    description: 'Get started with the essentials.',
    features: [
      '1 Main Store site',
      '5 Products',
      '1 Payment Link',
      '10% platform fee',
      'Basic analytics',
    ],
    dimFeatures: [
      'Auto DM',
      'Custom domain',
      'Advanced analytics',
      'Priority support',
    ],
  },
  {
    key: 'plus',
    name: 'Plus',
    icon: Zap,
    monthlyPrice: 999,
    yearlyPrice: 799,
    platformFee: '5%',
    color: 'indigo',
    description: 'For creators ready to scale.',
    badge: 'Popular',
    features: [
      'Unlimited sites',
      'Unlimited products',
      'Unlimited payment links',
      '5% platform fee',
      'Advanced analytics',
      'Custom domain',
      'Auto DM (Instagram)',
      'Priority support',
    ],
    dimFeatures: [],
  },
  {
    key: 'pro',
    name: 'Pro',
    icon: Crown,
    monthlyPrice: 1999,
    yearlyPrice: 1599,
    platformFee: '2%',
    color: 'violet',
    description: 'Everything in Plus, lower fees.',
    features: [
      'Everything in Plus',
      '2% platform fee',
      'AI-powered smart replies',
      'Unlimited automations',
      'Dedicated support',
    ],
    dimFeatures: [],
  },
];

const COLOR_MAP: Record<string, {
  badge: string; button: string; ring: string; iconBg: string; iconColor: string; checkColor: string;
}> = {
  gray: {
    badge: '',
    button: 'bg-gray-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-gray-700 dark:hover:bg-gray-100',
    ring: 'ring-gray-200 dark:ring-zinc-800',
    iconBg: 'bg-gray-100 dark:bg-zinc-800',
    iconColor: 'text-gray-600 dark:text-[var(--text-secondary)]',
    checkColor: 'text-gray-500',
  },
  indigo: {
    badge: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    ring: 'ring-indigo-500',
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/20',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    checkColor: 'text-indigo-500',
  },
  violet: {
    badge: 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400',
    button: 'bg-violet-600 hover:bg-violet-700 text-white',
    ring: 'ring-violet-500',
    iconBg: 'bg-violet-100 dark:bg-violet-500/20',
    iconColor: 'text-violet-600 dark:text-violet-400',
    checkColor: 'text-violet-500',
  },
};

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const currentPlan = 'free'; // TODO: fetch from subscriptions table

  return (
    <div className="pb-16 pt-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Subscription</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Choose a plan that fits your creator business.
        </p>
      </div>

      {/* Current plan banner */}
      <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl">
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
          <Star className="w-4 h-4 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">You&apos;re on the Free plan</p>
          <p className="text-xs text-gray-400 dark:text-zinc-500">Upgrade to unlock Auto DM, lower fees, and more.</p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-[var(--text-secondary)] rounded-lg">Free</span>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center mb-8">
        <div className="inline-flex items-center bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-white dark:bg-zinc-800 text-[var(--text-primary)] shadow-sm' : 'text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${billing === 'yearly' ? 'bg-white dark:bg-zinc-800 text-[var(--text-primary)] shadow-sm' : 'text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Yearly
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">–20%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {PLANS.map(plan => {
          const c = COLOR_MAP[plan.color];
          const price = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
          const isCurrent = plan.key === currentPlan;
          const PlanIcon = plan.icon;

          return (
            <div
              key={plan.key}
              className={`relative flex flex-col bg-white dark:bg-zinc-950 border rounded-2xl p-5 ring-1 transition-all ${isCurrent ? 'border-gray-300 dark:border-zinc-700' : `border-gray-200 dark:border-zinc-800 ${c.ring}`}`}
            >
              {plan.badge && (
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-extrabold px-3 py-1 rounded-full ${c.badge}`}>
                  {plan.badge}
                </span>
              )}

              {/* Icon + name */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.iconBg}`}>
                  <PlanIcon className={`w-4 h-4 ${c.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-[var(--text-primary)]">{plan.name}</p>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500">{plan.description}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-5">
                {price === 0 ? (
                  <p className="text-3xl font-black text-[var(--text-primary)]">Free</p>
                ) : (
                  <div className="flex items-end gap-1">
                    <p className="text-3xl font-black text-[var(--text-primary)]">{formatINR(price)}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1.5">/mo</p>
                  </div>
                )}
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{plan.platformFee} platform fee</p>
              </div>

              {/* CTA */}
              {isCurrent ? (
                <div className="w-full py-2 rounded-xl text-center text-xs font-bold text-gray-400 dark:text-zinc-600 border border-dashed border-gray-200 dark:border-zinc-800 mb-5">
                  Current plan
                </div>
              ) : (
                <button className={`w-full py-2.5 rounded-xl text-sm font-bold mb-5 transition-all active:scale-[0.98] ${c.button}`}>
                  Upgrade to {plan.name}
                </button>
              )}

              {/* Features */}
              <ul className="space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs font-medium text-gray-700 dark:text-[var(--text-secondary)]">
                    <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${c.checkColor}`} />
                    {f}
                  </li>
                ))}
                {plan.dimFeatures.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs font-medium text-gray-300 dark:text-zinc-700 line-through">
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-200 dark:text-zinc-800" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Auto DM Pro gate callout */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-extrabold text-base mb-1">Auto DM requires Plus</p>
            <p className="text-sm text-white/70 leading-relaxed max-w-md">
              Automate Instagram DMs, comment replies, and story triggers. Upgrade to Plus and connect your Instagram to start.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/autodm')}
            className="flex items-center gap-2 bg-white text-violet-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-all shrink-0 active:scale-[0.98]"
          >
            Go to Auto DM <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
