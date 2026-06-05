'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSites } from '@/hooks/useSites';
import {
  Store, Layers, CreditCard, Link2,
  ChevronRight, Sparkles, ArrowLeft,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';

type SiteTypeOption = {
  id: string;
  label: string;
  desc: string;
  best: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  href: string;
};

const SITE_TYPES: SiteTypeOption[] = [
  {
    id: 'main',
    label: 'Main Store',
    desc: 'Your full creator storefront with multiple products, navigation, and sections.',
    best: 'Courses, ebooks, digital assets',
    icon: Store,
    iconBg: 'bg-[var(--surface-muted)]',
    iconColor: 'text-[var(--text-secondary)]',
    href: '/dashboard/sites/new/store',
  },
  {
    id: 'single',
    label: 'Product Site',
    desc: 'High-converting landing page for a single product. Countdown, FAQ, testimonials.',
    best: 'Course launches, premium products',
    icon: Layers,
    iconBg: 'bg-[var(--info-bg)]',
    iconColor: 'text-[var(--info)]',
    href: '/dashboard/sites/new/singlepage',
  },
  {
    id: 'payment',
    label: 'Payment Link',
    desc: 'Accept payments for services, consulting, or custom work. Fixed or flexible amounts.',
    best: 'Mentorship, freelance work',
    icon: CreditCard,
    iconBg: 'bg-[var(--success-bg)]',
    iconColor: 'text-[var(--success)]',
    href: '/dashboard/sites/new/payment',
  },
  {
    id: 'linkinbio',
    label: 'Link in Bio',
    desc: 'A single-page profile with all your links, products, and social media. Share one URL everywhere.',
    best: 'Instagram bio, Twitter bio, TikTok',
    icon: Link2,
    iconBg: 'bg-[var(--surface-muted)]',
    iconColor: 'text-[var(--text-secondary)]',
    href: '/dashboard/sites/new/linkinbio',
  },
];

export default function NewSiteHub() {
  const router = useRouter();
  const { sites } = useSites();

  const typeCounts: Record<string, number> = {};
  (sites ?? []).forEach(s => { typeCounts[s.site_type] = (typeCounts[s.site_type] || 0) + 1; });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="What are you building?"
        description="Pick a site type to start with. You can always add more later."
        action={
          <button
            onClick={() => router.push('/dashboard/sites')}
            className="group inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-3 py-2 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Sites
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SITE_TYPES.map((t) => {
          const count = typeCounts[t.id] || 0;
          return (
            <button
              key={t.id}
              onClick={() => router.push(t.href)}
              className="group text-left bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] p-6 hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-all duration-200 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${t.iconBg} ${t.iconColor}`}>
                  <t.icon className="w-5 h-5" />
                </div>
                {count > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[var(--success-bg)] text-[var(--success)] rounded-[var(--radius-pill)] text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                    {count} active
                  </span>
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  {t.label}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {t.desc}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  <Sparkles className="w-3 h-3" />
                  Best for: <span className="normal-case tracking-normal text-[var(--text-secondary)]">{t.best}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
