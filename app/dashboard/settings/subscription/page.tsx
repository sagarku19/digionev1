'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { BackButton } from '@/components/dashboard/BackButton';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/StatusPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatINR } from '@/lib/format';
import { useSubscriptionPlans, useSubscription } from '@/hooks/creator/useSubscription';

const FEATURE_LABELS: Record<string, string> = {
  full_analytics: 'Full analytics',
  unlimited_products: 'Unlimited products',
  priority_support: 'Priority support',
  custom_domain: 'Custom domain',
  api_access: 'API access',
  advanced_marketing: 'Advanced marketing',
};

const BTN_BASE =
  'w-full rounded-[var(--radius-sm)] text-sm font-medium px-3 py-2 transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';
const BTN_SECONDARY =
  'bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)]';

function featureLabel(key: string): string {
  const known = FEATURE_LABELS[key];
  if (known) return known;
  const spaced = key.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function toFeatureList(features: unknown): string[] {
  if (!Array.isArray(features)) return [];
  return features.filter((f): f is string => typeof f === 'string');
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function priceLabel(value: number | string, cycle: 'monthly' | 'yearly'): string {
  const amount = Number(value);
  if (!amount) return 'Free';
  return `${formatINR(amount)}${cycle === 'monthly' ? '/mo' : '/yr'}`;
}

export default function SubscriptionPage() {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { plans, isLoading } = useSubscriptionPlans();
  const { plan: activePlanRaw } = useSubscription();

  const activePlan = pickOne(activePlanRaw);
  const currentPlanType = activePlan?.plan_type ?? 'free';

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        back={<BackButton href="/dashboard/settings" label="Back to settings" />}
        title="Subscription"
        description="Your DigiOne plan — a lower platform fee on higher tiers."
      />

      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-1">
          {(['monthly', 'yearly'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                cycle === c
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              {c === 'monthly' ? 'Monthly' : 'Yearly'}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">Save with yearly billing</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="flex flex-col">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-4 h-8 w-28" />
              <Skeleton className="mt-2 h-4 w-20" />
              <div className="mt-5 space-y-2.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
              <Skeleton className="mt-6 h-9 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.plan_type === currentPlanType;
            const isPro = plan.plan_type === 'pro';
            const features = toFeatureList(plan.features);

            return (
              <Card
                key={plan.id}
                className={`flex flex-col ${isPro ? '!border-[var(--brand)]/30' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    {plan.plan_name}
                  </h2>
                  {isCurrent ? (
                    <StatusPill
                      status="Current plan"
                      className="!bg-[var(--success-bg)] !text-[var(--success)]"
                    />
                  ) : isPro ? (
                    <StatusPill
                      status="Recommended"
                      className="!bg-[var(--brand)]/10 !text-[var(--brand)]"
                    />
                  ) : null}
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-[var(--text-primary)]">
                      {Number(plan.platform_fee_percent)}%
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">platform fee</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {priceLabel(cycle === 'monthly' ? plan.monthly_price : plan.yearly_price, cycle)}
                  </p>
                </div>

                {plan.description && (
                  <p className="mt-3 text-xs text-[var(--text-tertiary)]">{plan.description}</p>
                )}

                {features.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {features.map((key) => (
                      <li
                        key={key}
                        className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
                      >
                        <Check className="w-4 h-4 text-[var(--success)] shrink-0" />
                        {featureLabel(key)}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto pt-6">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className={`${BTN_BASE} bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-tertiary)] cursor-default`}
                    >
                      Current plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      title="Plan changes are activated by the DigiOne team"
                      className={`${BTN_BASE} ${BTN_SECONDARY}`}
                    >
                      Choose {plan.plan_name}
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && (
        <p className="text-xs text-[var(--text-tertiary)]">
          Plan changes are activated by the DigiOne team — self-serve checkout is coming soon.
        </p>
      )}
    </div>
  );
}
