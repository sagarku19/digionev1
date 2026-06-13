'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check, Zap, Crown, Instagram, ArrowRight, Star,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { formatINR } from '@/lib/format';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    icon: Star,
    monthlyPrice: 0,
    yearlyPrice: 0,
    platformFee: '10%',
    accent: 'neutral' as const,
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
    accent: 'brand' as const,
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
    accent: 'accent' as const,
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

type Accent = 'neutral' | 'brand' | 'accent';

const ACCENT_MAP: Record<Accent, {
  badge: string;
  button: string;
  iconBg: string;
  iconColor: string;
  checkColor: string;
}> = {
  neutral: {
    badge: 'bg-[var(--surface-muted)] text-[var(--text-secondary)]',
    button: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)]',
    iconBg: 'bg-[var(--surface-muted)]',
    iconColor: 'text-[var(--text-secondary)]',
    checkColor: 'text-[var(--text-secondary)]',
  },
  brand: {
    badge: 'bg-[var(--brand)] text-[var(--text-on-brand)]',
    button: 'bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)]',
    iconBg: 'bg-[var(--surface-muted)]',
    iconColor: 'text-[var(--brand)]',
    checkColor: 'text-[var(--brand)]',
  },
  accent: {
    badge: 'bg-[var(--accent)] text-[var(--accent-fg)]',
    button: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)]',
    iconBg: 'bg-[var(--surface-muted)]',
    iconColor: 'text-[var(--text-primary)]',
    checkColor: 'text-[var(--text-primary)]',
  },
};

export default function SubscriptionPage() {
  const router = useRouter();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const currentPlan = 'free';

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Subscription"
        description="Choose a plan that fits your creator business."
      />

      <Card className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] flex items-center justify-center shrink-0">
          <Star className="w-4 h-4 text-[var(--text-secondary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">You&apos;re on the Free plan</p>
          <p className="text-xs text-[var(--text-tertiary)]">Upgrade to unlock Auto DM, lower fees, and more.</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-[var(--surface-muted)] text-[var(--text-secondary)] rounded-[var(--radius-sm)]">Free</span>
      </Card>

      <div className="flex items-center justify-center">
        <div className="inline-flex items-center bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] p-1 gap-1">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-4 py-1.5 rounded-[var(--radius-sm)] text-sm font-semibold focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-all ${
              billing === 'monthly'
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`px-4 py-1.5 rounded-[var(--radius-sm)] text-sm font-semibold focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-all flex items-center gap-1.5 ${
              billing === 'yearly'
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Yearly
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--success-bg)] text-[var(--success)]">–20%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map(plan => {
          const c = ACCENT_MAP[plan.accent];
          const price = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
          const isCurrent = plan.key === currentPlan;
          const PlanIcon = plan.icon;

          return (
            <div
              key={plan.key}
              className={`relative flex flex-col bg-[var(--surface)] border rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-xs)] transition-all ${
                plan.accent === 'brand' ? 'border-[var(--brand)]' : 'border-[var(--border)]'
              }`}
            >
              {plan.badge && (
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-[var(--radius-pill)] ${c.badge}`}>
                  {plan.badge}
                </span>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center ${c.iconBg}`}>
                  <PlanIcon className={`w-4 h-4 ${c.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{plan.name}</p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">{plan.description}</p>
                </div>
              </div>

              <div className="mb-5">
                {price === 0 ? (
                  <p className="text-3xl font-bold text-[var(--text-primary)]">Free</p>
                ) : (
                  <div className="flex items-end gap-1">
                    <p className="text-3xl font-bold text-[var(--text-primary)]">{formatINR(price)}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mb-1.5">/mo</p>
                  </div>
                )}
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{plan.platformFee} platform fee</p>
              </div>

              {isCurrent ? (
                <div className="w-full py-2 rounded-[var(--radius-md)] text-center text-xs font-semibold text-[var(--text-tertiary)] border border-dashed border-[var(--border)] mb-5">
                  Current plan
                </div>
              ) : (
                <button className={`w-full py-2.5 rounded-[var(--radius-md)] text-sm font-semibold mb-5 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-all active:scale-[0.98] ${c.button}`}>
                  Upgrade to {plan.name}
                </button>
              )}

              <ul className="space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs font-medium text-[var(--text-secondary)]">
                    <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${c.checkColor}`} />
                    {f}
                  </li>
                ))}
                {plan.dimFeatures.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs font-medium text-[var(--text-tertiary)] line-through">
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--text-tertiary)]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="relative overflow-hidden bg-[var(--brand)] rounded-[var(--radius-lg)] p-6 text-[var(--text-on-brand)]">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-12 h-12 bg-white/20 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0">
            <Instagram className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-base mb-1">Auto DM requires Plus</p>
            <p className="text-sm opacity-80 leading-relaxed max-w-md">
              Automate Instagram DMs, comment replies, and story triggers. Upgrade to Plus and connect your Instagram to start.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/autodm')}
            className="flex items-center gap-2 bg-[var(--text-on-brand)] text-[var(--brand)] font-semibold text-sm px-5 py-2.5 rounded-[var(--radius-md)] hover:opacity-90 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-all shrink-0 active:scale-[0.98]"
          >
            Go to Auto DM <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
