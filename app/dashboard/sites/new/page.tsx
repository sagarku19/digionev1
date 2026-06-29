'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSites } from '@/hooks/sites/useSites';
import {
  Store, Layers, CreditCard, Link2, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

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
        <div className="w-8 h-2.5 rounded-sm bg-[var(--brand)] opacity-90 group-hover/tile:opacity-100 transition-opacity" />
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
      <div className="w-1/2 h-3 rounded-[var(--radius-sm)] bg-[var(--brand)] opacity-90 group-hover/tile:opacity-100 transition-opacity" />
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
      <div className="w-full h-3 rounded-[var(--radius-sm)] bg-[var(--brand)] opacity-90 group-hover/tile:opacity-100 transition-opacity" />
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

function TileSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xs)] overflow-hidden">
      <Skeleton rounded="sm" className="h-32 w-full !rounded-none border-b border-[var(--border-subtle)]" />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <Skeleton rounded="md" className="w-9 h-9 shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton rounded="sm" className="h-3.5 w-28" />
            <Skeleton rounded="sm" className="h-2.5 w-full" />
            <Skeleton rounded="sm" className="h-2.5 w-2/3" />
          </div>
        </div>
        <div className="pt-2.5 border-t border-[var(--border-subtle)]">
          <Skeleton rounded="sm" className="h-2.5 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export default function NewSiteHub() {
  const router = useRouter();
  const { sites, isLoading } = useSites();

  const typeCounts: Record<string, number> = {};
  (sites ?? []).forEach(s => { typeCounts[s.site_type] = (typeCounts[s.site_type] || 0) + 1; });

  return (
    <div className="space-y-6 pb-12">
      <div className="max-w-3xl mx-auto w-full pt-6">
        <button
          onClick={() => router.push('/dashboard/sites')}
          className="group -ml-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Sites
        </button>
      </div>

      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold font-display text-[var(--text-primary)] tracking-tight">
          What are you building?
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Pick a site type to start with. You can always add more later.
        </p>
      </div>

      <div className="max-w-3xl mx-auto w-full">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <TileSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SITE_TYPES.map((t) => {
              const count = typeCounts[t.id] || 0;
              const Icon = t.icon;
              return (
                <Card
                  key={t.id}
                  hoverable
                  padded={false}
                  className="group/tile cursor-pointer overflow-hidden border-transparent ring-1 ring-[var(--border)] hover:ring-[var(--brand)]/40 transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  onClick={() => router.push(t.href)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') router.push(t.href); }}
                >
                  {/* Mockup region */}
                  <div className="relative h-32 w-full bg-[var(--surface-muted)] border-b border-[var(--border-subtle)] rounded-t-[var(--radius-lg)] overflow-hidden p-3">
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-0 group-hover/tile:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ background: 'radial-gradient(circle at 80% 0%, color-mix(in srgb, var(--brand) 14%, transparent) 0%, transparent 60%)' }}
                    />
                    <div className="relative h-full">{TYPE_MOCKUPS[t.id]}</div>
                  </div>

                  {/* Meta region */}
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center shrink-0 transition-colors group-hover/tile:bg-[var(--brand)] group-hover/tile:text-[var(--text-on-brand)]">
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{t.label}</span>
                          {count > 0 && (
                            <span className="ml-auto inline-flex items-center px-2 py-0.5 bg-[var(--brand)]/10 text-[var(--brand)] rounded-[var(--radius-pill)] text-[10px] font-semibold">
                              {count} active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1">{t.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-tertiary)] truncate">Best for: {t.best}</span>
                      <span className="inline-flex items-center gap-1 shrink-0 text-[11px] font-semibold text-[var(--brand)] opacity-0 -translate-x-1 group-hover/tile:opacity-100 group-hover/tile:translate-x-0 transition-all duration-200">
                        Create <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
