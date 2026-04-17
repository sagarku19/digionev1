'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import {
  Ticket, Users, Share2, Calendar, Megaphone,
  ChevronRight, TrendingUp, ArrowUpRight, Zap,
  MessageCircle, BarChart3, Target, Sparkles,
} from 'lucide-react';

type Stats = {
  coupons: number;
  activeCoupons: number;
  leads: number;
  affiliates: number;
  referralCodes: number;
  referrals: number;
};

export default function MarketingPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({ coupons: 0, activeCoupons: 0, leads: 0, affiliates: 0, referralCodes: 0, referrals: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const pid = await getCreatorProfileId(supabase);
        const { data: { user } } = await supabase.auth.getUser();
        const uid = user?.id;

        const [couponsRes, leadsRes, affiliatesRes, refCodesRes] = await Promise.all([
          supabase.from('coupons').select('id, is_active').eq('creator_id', uid ?? ''),
          supabase.from('lead_form').select('id', { count: 'exact', head: true }).in('site_id',
            (await supabase.from('sites').select('id').eq('creator_id', pid)).data?.map(s => s.id) ?? []
          ),
          supabase.from('affiliates').select('id').eq('creator_id', pid),
          supabase.from('referral_codes').select('id').eq('owner_creator_id', pid),
        ]);

        const codeIds = refCodesRes.data?.map(r => r.id) ?? [];
        const refCount = codeIds.length
          ? (await supabase.from('order_referrals').select('id', { count: 'exact', head: true }).in('referral_code_id', codeIds)).count ?? 0
          : 0;

        setStats({
          coupons: couponsRes.data?.length ?? 0,
          activeCoupons: couponsRes.data?.filter(c => c.is_active).length ?? 0,
          leads: leadsRes.count ?? 0,
          affiliates: affiliatesRes.data?.length ?? 0,
          referralCodes: refCodesRes.data?.length ?? 0,
          referrals: refCount,
        });
      } catch {}
      setLoading(false);
    })();
  }, []);

  const tools = [
    {
      icon: Ticket,
      label: 'Discount Coupons',
      description: 'Create percentage or fixed-amount promo codes. Set expiry dates, max uses, and minimum order values.',
      href: '/dashboard/marketing/coupons',
      color: 'indigo',
      stat: loading ? '—' : `${stats.activeCoupons} active`,
      statTotal: loading ? '' : `of ${stats.coupons} total`,
    },
    {
      icon: Users,
      label: 'Leads',
      description: 'View captured leads from your link-in-bio forms. Export to CSV and broadcast emails to your list.',
      href: '/dashboard/marketing/leads',
      color: 'violet',
      stat: loading ? '—' : `${stats.leads}`,
      statTotal: 'total leads',
    },
    {
      icon: Share2,
      label: 'Affiliates',
      description: 'Recruit partners to promote your products. Set custom commission rates and track performance.',
      href: '/dashboard/marketing/affiliates',
      color: 'emerald',
      stat: loading ? '—' : `${stats.affiliates}`,
      statTotal: 'partners',
    },
    {
      icon: Target,
      label: 'Referral Program',
      description: 'Let buyers earn rewards by referring new customers. Grow your store through word-of-mouth.',
      href: '/dashboard/marketing/referrals',
      color: 'amber',
      stat: loading ? '—' : `${stats.referrals}`,
      statTotal: `via ${stats.referralCodes} codes`,
    },
    {
      icon: MessageCircle,
      label: 'Community',
      description: 'Build a community of creators. Share tips, milestones, and connect with your audience.',
      href: '/dashboard/marketing/community',
      color: 'blue',
      stat: 'Active',
      statTotal: 'feed',
    },
    {
      icon: Calendar,
      label: 'Services',
      description: 'Manage 1:1 calls, consulting retainers, and custom audits. Monetize your time and expertise.',
      href: '/dashboard/marketing/services',
      color: 'rose',
      stat: 'New',
      statTotal: 'feature',
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string; glow: string; pill: string }> = {
    indigo: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-indigo-100 dark:border-gray-900 dark:border-white/20', glow: 'group-hover:shadow-indigo-500/10', pill: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
    violet: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-violet-100 dark:border-gray-200 dark:border-gray-700', glow: 'group-hover:shadow-violet-500/10', pill: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-500/20', glow: 'group-hover:shadow-emerald-500/10', pill: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-500/20', glow: 'group-hover:shadow-amber-500/10', pill: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-500/20', glow: 'group-hover:shadow-blue-500/10', pill: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-500/20', glow: 'group-hover:shadow-rose-500/10', pill: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300' },
  };

  return (
    <div className="pt-6 pb-16 space-y-8 max-w-[1200px] mx-auto">

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-primary)] p-6 sm:p-8 shadow-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-violet-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-indigo-200 dark:border-gray-900 dark:border-white/20 text-xs font-bold text-gray-700 dark:text-gray-300 mb-4">
              <Megaphone className="w-3.5 h-3.5" /> Growth Engine
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">Marketing Tools</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md">
              Grow your audience, launch promotions, and monetize your expertise — all in one place.
            </p>
          </div>
          {/* Live summary pills */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {!loading && [
              { label: 'Leads', value: stats.leads, color: 'bg-gray-100 dark:bg-gray-800 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-gray-200 dark:border-gray-700' },
              { label: 'Active Coupons', value: stats.activeCoupons, color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-indigo-200 dark:border-gray-900 dark:border-white/20' },
              { label: 'Affiliates', value: stats.affiliates, color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' },
            ].map(p => (
              <div key={p.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${p.color}`}>
                <TrendingUp className="w-3 h-3" />
                <span className="font-extrabold">{p.value}</span> {p.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map(tool => {
          const c = colorMap[tool.color];
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className={`group relative bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-xl ${c.glow} transition-all duration-300 flex flex-col overflow-hidden`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${c.bg} ${c.border}`}>
                  <tool.icon className={`w-5 h-5 ${c.text}`} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-300 dark:text-gray-700 group-hover:text-gray-500 dark:group-hover:text-gray-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">{tool.label}</h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed flex-1">{tool.description}</p>
              <div className={`mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${c.pill} w-fit`}>
                <Sparkles className="w-3 h-3" />
                <span>{tool.stat}</span>
                {tool.statTotal && <span className="opacity-60 font-medium">{tool.statTotal}</span>}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick tip */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl">
        <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700 dark:text-amber-400">
          <strong>Pro tip:</strong> Combine Coupons + Referrals for a viral growth loop — buyers save money AND earn rewards for bringing new customers.
        </p>
      </div>
    </div>
  );
}
