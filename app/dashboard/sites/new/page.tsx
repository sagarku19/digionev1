'use client';
// Site creation hub — choose your site type, then route to the dedicated creation page.

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSites } from '@/hooks/useSites';
import {
  Store, Layers, CreditCard, FileText, Hammer, Link2,
  ChevronRight, Sparkles, ArrowLeft,
} from 'lucide-react';

type SiteTypeOption = {
  id: string;
  label: string;
  desc: string;
  best: string;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  href: string;
};

const SITE_TYPES: SiteTypeOption[] = [
  {
    id: 'main',
    label: 'Main Store',
    desc: 'Your full creator storefront with multiple products, navigation, and sections.',
    best: 'Courses, ebooks, digital assets',
    icon: Store,
    gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent',
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    href: '/dashboard/sites/new/store',
  },
  {
    id: 'single',
    label: 'Single Page',
    desc: 'High-converting landing page for a single product. Countdown, FAQ, testimonials.',
    best: 'Course launches, premium products',
    icon: Layers,
    gradient: 'from-violet-500/10 via-violet-500/5 to-transparent',
    iconBg: 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400',
    href: '/dashboard/sites/new/singlepage',
  },
  {
    id: 'payment',
    label: 'Payment Link',
    desc: 'Accept payments for services, consulting, or custom work. Fixed or flexible amounts.',
    best: 'Mentorship, freelance work',
    icon: CreditCard,
    gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    href: '/dashboard/sites/new/payment',
  },
  {
    id: 'blog',
    label: 'Blog',
    desc: 'A clean, readable blog. Mix free and gated content. Connects to your main store.',
    best: 'Content marketing, gated tutorials',
    icon: FileText,
    gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
    iconBg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
    href: '/dashboard/sites/new/blog',
  },
  {
    id: 'builder',
    label: 'Builder App',
    desc: 'Build a custom page from scratch using our drag-and-drop section builder.',
    best: 'Landing pages, custom apps',
    icon: Hammer,
    gradient: 'from-rose-500/10 via-rose-500/5 to-transparent',
    iconBg: 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400',
    href: '/dashboard/sites/new/builder',
  },
  {
    id: 'linkinbio',
    label: 'Link in Bio',
    desc: 'A single-page profile with all your links, products, and social media. Share one URL everywhere.',
    best: 'Instagram bio, Twitter bio, TikTok',
    icon: Link2,
    gradient: 'from-pink-500/10 via-pink-500/5 to-transparent',
    iconBg: 'bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400',
    href: '/dashboard/sites/new/linkinbio',
  },
];

export default function NewSiteHub() {
  const router = useRouter();
  const { sites } = useSites();

  // Count how many of each type exist (for display, not blocking)
  const typeCounts: Record<string, number> = {};
  (sites ?? []).forEach(s => { typeCounts[s.site_type] = (typeCounts[s.site_type] || 0) + 1; });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#07070f]/80 backdrop-blur-sm border-b border-gray-100 dark:border-white/[0.05]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <button
            onClick={() => router.push('/dashboard/sites')}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sites
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Create Something New</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            What are you building?
          </h1>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Choose the type that best fits your goal. You can create multiple sites of any type.
          </p>
        </div>

        {/* Site type cards */}
        <div className="grid grid-cols-1 gap-3">
          {SITE_TYPES.map(t => {
            const count = typeCounts[t.id] || 0;

            return (
              <button
                key={t.id}
                onClick={() => router.push(t.href)}
                className={`relative text-left p-5 border-2 rounded-2xl transition-all duration-200 bg-gradient-to-r ${t.gradient} group border-gray-200 dark:border-gray-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/5`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${t.iconBg}`}>
                    <t.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-base text-gray-900 dark:text-white">{t.label}</p>
                      {count > 0 && (
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                          {count} created
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-2">{t.desc}</p>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-400 font-medium">Best for: {t.best}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 transition shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
