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
  gradient: string;
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
    gradient: 'from-indigo-50/50 to-transparent dark:from-indigo-500/5',
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    href: '/dashboard/sites/new/store',
  },
  {
    id: 'single',
    label: 'Product Site',
    desc: 'High-converting landing page for a single product. Countdown, FAQ, testimonials.',
    best: 'Course launches, premium products',
    icon:Layers,
    gradient: 'from-purple-50/50 to-transparent dark:from-purple-500/5',
    iconBg: 'bg-purple-100 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
    href: '/dashboard/sites/new/singlepage',
  },
  {
    id: 'payment',
    label: 'Payment Link',
    desc: 'Accept payments for services, consulting, or custom work. Fixed or flexible amounts.',
    best: 'Mentorship, freelance work',
    icon: CreditCard,
    gradient: 'from-emerald-50/50 to-transparent dark:from-emerald-500/5',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    href: '/dashboard/sites/new/payment',
  },
  {
    id: 'linkinbio',
    label: 'Link in Bio',
    desc: 'A single-page profile with all your links, products, and social media. Share one URL everywhere.',
    best: 'Instagram bio, Twitter bio, TikTok',
    icon: Link2,
    gradient: 'from-pink-50/50 to-transparent dark:from-pink-500/5',
    iconBg: 'bg-pink-100 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/20',
    iconColor: 'text-pink-600 dark:text-pink-400',
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
      {/* Background Ambience tied to the container */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden rounded-[40px]">
        <div className="absolute top-0 left-[-10%] w-[30%] h-[30%] bg-indigo-500/10 dark:bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] right-[-10%] w-[30%] h-[30%] bg-purple-500/10 dark:bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
        {/* Back Button */}
        <div>
          <button
            onClick={() => router.push('/dashboard/sites')}
            className="group inline-flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md px-4 py-2 rounded-xl border border-gray-200/50 dark:border-zinc-800/80 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
          </button>
        </div>

        {/* Title Section */}
        <div className="text-center mt-6 mb-12 relative flex flex-col items-center">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-full mb-6 shadow-sm">
            <Target className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-700 dark:text-zinc-300">Choose Your Path</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">
            What are you building?
          </h1>
          <p className="text-base text-gray-500 dark:text-gray-400 max-w-2xl text-center leading-relaxed">
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
                className={`group relative text-left p-8 bg-white dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800 rounded-[32px] transition-all duration-300 hover:shadow-xl hover:shadow-${t.iconColor.split('-')[1]}-500/5 hover:-translate-y-1 hover:border-transparent overflow-hidden flex flex-col`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Glowing Hover Border Background */}
                <div className={`absolute inset-0 bg-gradient-to-br from-${t.iconColor.split('-')[1]}-500 to-${t.iconColor.split('-')[1]}-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-20`} />
                
                {/* Card Inner Background */}
                <div className={`absolute inset-[2px] bg-white dark:bg-zinc-950 rounded-[30px] z-[-10]`} />

                {/* Ambient Internal Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${t.gradient} z-0 pointer-events-none rounded-[32px] opacity-100 group-hover:opacity-50 transition-opacity`} />
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-8">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner transition-transform group-hover:scale-110 duration-300 ${t.iconBg} ${t.iconColor}`}>
                      <t.icon className="w-8 h-8" />
                    </div>
                    
                    {count > 0 && (
                      <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-gray-500 shadow-sm">
                        <span className={`w-1.5 h-1.5 rounded-full bg-${t.iconColor.split('-')[1]}-400 animate-pulse`} />
                        {count} Active
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-extrabold text-2xl text-gray-900 dark:text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 dark:group-hover:from-white dark:group-hover:to-gray-400 transition-all">
                      {t.label}
                    </h3>
                    <p className="text-base font-medium text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
                      {t.desc}
                    </p>
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className={`w-4 h-4 ${t.iconColor}`} />
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Best for: <span className="text-gray-700 dark:text-gray-300">{t.best}</span></p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-zinc-900 flex items-center justify-center group-hover:bg-gray-100 dark:group-hover:bg-zinc-800 transition-colors shadow-sm">
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
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
