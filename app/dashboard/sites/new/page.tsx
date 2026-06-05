'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSites } from '@/hooks/useSites';
import {
  Store, Layers, CreditCard, Link2, ArrowLeft,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';

type SiteTypeOption = {
  id: string;
  label: string;
  desc: string;
  best: string;
  icon: React.ElementType;
  href: string;
};

const SITE_TYPES: SiteTypeOption[] = [
  {
    id: 'main',
    label: 'Main Store',
    desc: 'Your full creator storefront with multiple products, navigation, and sections.',
    best: 'Courses, ebooks, digital assets',
    icon: Store,
    href: '/dashboard/sites/new/store',
  },
  {
    id: 'single',
    label: 'Product Site',
    desc: 'High-converting landing page for a single product. Countdown, FAQ, testimonials.',
    best: 'Course launches, premium products',
    icon: Layers,
    href: '/dashboard/sites/new/singlepage',
  },
  {
    id: 'payment',
    label: 'Payment Link',
    desc: 'Accept payments for services, consulting, or custom work. Fixed or flexible amounts.',
    best: 'Mentorship, freelance work',
    icon: CreditCard,
    href: '/dashboard/sites/new/payment',
  },
  {
    id: 'linkinbio',
    label: 'Link in Bio',
    desc: 'A single-page profile with all your links, products, and social media. Share one URL everywhere.',
    best: 'Instagram bio, Twitter bio, TikTok',
    icon: Link2,
    href: '/dashboard/sites/new/linkinbio',
  },
];

// Per-type mockup preview compositions
function StoreMockup() {
  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Nav bar */}
      <div className="flex items-center justify-between px-1">
        <div className="w-8 h-2.5 rounded-sm bg-[var(--text-primary)] opacity-80" />
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-6 rounded-full bg-[var(--border)]" />
          <div className="h-1.5 w-6 rounded-full bg-[var(--border)]" />
          <div className="h-1.5 w-6 rounded-full bg-[var(--border)]" />
        </div>
      </div>
      {/* Product grid */}
      <div className="grid grid-cols-3 gap-1.5 flex-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex-1 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border-subtle)] opacity-90 group-hover/tile:opacity-100 transition-opacity aspect-square" />
            <div className="h-1 w-full rounded-full bg-[var(--border)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductSiteMockup() {
  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Hero block */}
      <div className="w-full h-6 rounded-[var(--radius-sm)] bg-[var(--surface)]" />
      <div className="w-3/4 h-1.5 rounded-full bg-[var(--border)]" />
      {/* CTA bar */}
      <div className="w-1/2 h-3 rounded-[var(--radius-sm)] bg-[var(--info)] opacity-90 group-hover/tile:opacity-100 transition-opacity" />
      {/* Feature bullets */}
      <div className="flex flex-col gap-1 mt-auto">
        <div className="h-1 w-3/4 rounded-full bg-[var(--border)]" />
        <div className="h-1 w-2/3 rounded-full bg-[var(--border)]" />
        <div className="h-1 w-1/2 rounded-full bg-[var(--border)]" />
      </div>
    </div>
  );
}

function PaymentMockup() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 h-full">
      <div className="w-2/3 h-1.5 rounded-full bg-[var(--border)]" />
      <div className="w-full h-7 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border-subtle)]" />
      <div className="w-full h-3 rounded-[var(--radius-sm)] bg-[var(--success)] opacity-90 group-hover/tile:opacity-100 transition-opacity" />
    </div>
  );
}

function LinkInBioMockup() {
  return (
    <div className="flex flex-col items-center gap-1.5 h-full pt-1">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-[var(--brand)] opacity-90 group-hover/tile:opacity-100 transition-opacity shrink-0" />
      {/* Link rows */}
      <div className="flex flex-col gap-1.5 w-full mt-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-4 w-full rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border-subtle)]" />
        ))}
      </div>
    </div>
  );
}

const TYPE_MOCKUPS: Record<string, React.ReactNode> = {
  main: <StoreMockup />,
  single: <ProductSiteMockup />,
  payment: <PaymentMockup />,
  linkinbio: <LinkInBioMockup />,
};

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
          const Icon = t.icon;
          return (
            <Card
              key={t.id}
              hoverable
              padded={false}
              className="group/tile cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              onClick={() => router.push(t.href)}
              tabIndex={0}
              role="button"
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') router.push(t.href); }}
            >
              {/* Mockup region */}
              <div className="h-32 w-full bg-[var(--surface-muted)] border-b border-[var(--border-subtle)] rounded-t-[var(--radius-lg)] overflow-hidden p-3">
                {TYPE_MOCKUPS[t.id]}
              </div>

              {/* Meta region */}
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{t.label}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{t.desc}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-[var(--text-tertiary)]">Best for: {t.best}</span>
                  {count > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-[var(--success-bg)] text-[var(--success)] rounded-[var(--radius-pill)] text-[10px] font-medium">
                      {count} active
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
