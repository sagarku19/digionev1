'use client';
// Site creation hub — choose your site type, then route to the dedicated creation page.

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSites } from '@/hooks/useSites';
import {
  Store, Layers, CreditCard, Link2,
  ChevronRight, Sparkles, ArrowLeft, Target
} from 'lucide-react';

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
    iconBg: 'bg-[var(--surface-muted)] border-[var(--border)]',
    iconColor: 'text-[var(--text-secondary)]',
    href: '/dashboard/sites/new/store',
  },
  {
    id: 'single',
    label: 'Product Site',
    desc: 'High-converting landing page for a single product. Countdown, FAQ, testimonials.',
    best: 'Course launches, premium products',
    icon: Layers,
    iconBg: 'bg-[var(--info-subtle)] border-[var(--info-border)]',
    iconColor: 'text-[var(--info)]',
    href: '/dashboard/sites/new/singlepage',
  },
  {
    id: 'payment',
    label: 'Payment Link',
    desc: 'Accept payments for services, consulting, or custom work. Fixed or flexible amounts.',
    best: 'Mentorship, freelance work',
    icon: CreditCard,
    iconBg: 'bg-[var(--success-subtle)] border-[var(--success-border)]',
    iconColor: 'text-[var(--success)]',
    href: '/dashboard/sites/new/payment',
  },
  {
    id: 'linkinbio',
    label: 'Link in Bio',
    desc: 'A single-page profile with all your links, products, and social media. Share one URL everywhere.',
    best: 'Instagram bio, Twitter bio, TikTok',
    icon: Link2,
    iconBg: 'bg-[var(--surface-muted)] border-[var(--border)]',
    iconColor: 'text-[var(--text-secondary)]',
    href: '/dashboard/sites/new/linkinbio',
  },
];

export default function NewSiteHub() {
  const router = useRouter();
  const { sites } = useSites();

  // Count how many of each type exist
  const typeCounts: Record<string, number> = {};
  (sites ?? []).forEach(s => { typeCounts[s.site_type] = (typeCounts[s.site_type] || 0) + 1; });

  return (
    <div className="relative pt-6 pb-16 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
        {/* Back Button */}
        <div>
          <button
            onClick={() => router.push('/dashboard/sites')}
            className="group inline-flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors bg-[var(--surface)] px-4 py-2 rounded-xl border border-[var(--border)] shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
          </button>
        </div>

        {/* Title Section */}
        <div className="text-center mt-6 mb-12 relative flex flex-col items-center">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-full mb-6 shadow-[var(--shadow-xs)]">
            <Target className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Choose Your Path</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] mb-4">
            What are you building?
          </h1>
          <p className="text-base text-[var(--text-secondary)] max-w-2xl text-center leading-relaxed">
            Select the digital foundation that perfectly matches your goal. You can always build multiple sites of any type later to expand your empire.
          </p>
        </div>

        {/* Site type cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 group/list">
          {SITE_TYPES.map((t, i) => {
            const count = typeCounts[t.id] || 0;
            return (
              <button
                key={t.id}
                onClick={() => router.push(t.href)}
                className="group relative text-left p-8 bg-[var(--surface)] border border-[var(--border)] rounded-[32px] transition-all duration-300 hover:shadow-[var(--shadow-sm)] hover:-translate-y-1 hover:border-[var(--border-strong)] overflow-hidden flex flex-col focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-8">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner transition-transform group-hover:scale-110 duration-300 ${t.iconBg} ${t.iconColor}`}>
                      <t.icon className="w-8 h-8" />
                    </div>

                    {count > 0 && (
                      <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--text-secondary)] shadow-[var(--shadow-xs)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                        {count} Active
                      </span>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-extrabold text-2xl text-[var(--text-primary)] mb-3">
                      {t.label}
                    </h3>
                    <p className="text-base font-medium text-[var(--text-secondary)] leading-relaxed mb-8">
                      {t.desc}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-6 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className={`w-4 h-4 ${t.iconColor}`} />
                      <p className="text-xs font-bold text-[var(--text-secondary)]">Best for: <span className="text-[var(--text-secondary)]">{t.best}</span></p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[var(--surface-muted)] flex items-center justify-center group-hover:bg-[var(--surface-hover)] transition-colors shadow-[var(--shadow-xs)]">
                      <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
