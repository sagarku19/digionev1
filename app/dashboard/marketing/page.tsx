'use client';

import React from 'react';
import Link from 'next/link';
import { GuideButton } from '@/components/dashboard/guides/GuideButton';
import { useMarketingStats } from '@/hooks/marketing/useMarketingStats';
import {
  Ticket, Users, Share2, Calendar, Megaphone,
  TrendingUp, ArrowUpRight, Zap,
  MessageCircle, BarChart3, Target, Sparkles,
} from 'lucide-react';

export default function MarketingPage() {
  const { stats, isLoading: loading } = useMarketingStats();

  const tools = [
    {
      icon: Ticket,
      label: 'Discount Coupons',
      description: 'Create percentage or fixed-amount promo codes. Set expiry dates, max uses, and minimum order values.',
      href: '/dashboard/marketing/coupons',
      color: 'brand',
      stat: loading ? '—' : `${stats.activeCoupons} active`,
      statTotal: loading ? '' : `of ${stats.coupons} total`,
    },
    {
      icon: Users,
      label: 'Leads',
      description: 'View captured leads from your link-in-bio forms. Export to CSV and broadcast emails to your list.',
      href: '/dashboard/marketing/leads',
      color: 'brand',
      stat: loading ? '—' : `${stats.leads}`,
      statTotal: 'total leads',
    },
    {
      icon: Share2,
      label: 'Affiliates',
      description: 'Recruit partners to promote your products. Set custom commission rates and track performance.',
      href: '/dashboard/marketing/affiliates',
      color: 'success',
      stat: loading ? '—' : `${stats.affiliates}`,
      statTotal: 'partners',
    },
    {
      icon: Target,
      label: 'Referral Program',
      description: 'Let buyers earn rewards by referring new customers. Grow your store through word-of-mouth.',
      href: '/dashboard/marketing/referrals',
      color: 'warning',
      stat: loading ? '—' : `${stats.referrals}`,
      statTotal: `via ${stats.referralCodes} codes`,
    },
    {
      icon: MessageCircle,
      label: 'Community',
      description: 'Build a community of creators. Share tips, milestones, and connect with your audience.',
      href: '/dashboard/marketing/community',
      color: 'info',
      stat: 'Active',
      statTotal: 'feed',
    },
    {
      icon: Calendar,
      label: 'Services',
      description: 'Manage 1:1 calls, consulting retainers, and custom audits. Monetize your time and expertise.',
      href: '/dashboard/marketing/services',
      color: 'danger',
      stat: 'New',
      statTotal: 'feature',
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; pill: string }> = {
    brand:   { bg: 'bg-[var(--surface-muted)]', text: 'text-[var(--brand)]',   pill: 'bg-[var(--surface-muted)] text-[var(--brand)]' },
    success: { bg: 'bg-[var(--success-bg)]',    text: 'text-[var(--success)]', pill: 'bg-[var(--success-bg)] text-[var(--success)]' },
    warning: { bg: 'bg-[var(--warning-bg)]',    text: 'text-[var(--warning)]', pill: 'bg-[var(--warning-bg)] text-[var(--warning)]' },
    info:    { bg: 'bg-[var(--info-bg)]',       text: 'text-[var(--info)]',    pill: 'bg-[var(--info-bg)] text-[var(--info)]' },
    danger:  { bg: 'bg-[var(--danger-bg)]',     text: 'text-[var(--danger)]',  pill: 'bg-[var(--danger-bg)] text-[var(--danger)]' },
  };

  return (
    <div className="pt-6 pb-16 space-y-8 w-full">

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[var(--brand)]/10 via-[var(--brand)]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-muted)] border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] mb-4">
              <Megaphone className="w-3.5 h-3.5" /> Growth Engine
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">Marketing Tools</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md">
              Grow your audience, launch promotions, and monetize your expertise — all in one place.
            </p>
          </div>
          {/* Live summary pills */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <GuideButton guideKey="marketing" />
            {!loading && [
              { label: 'Leads', value: stats.leads },
              { label: 'Active Coupons', value: stats.activeCoupons },
              { label: 'Affiliates', value: stats.affiliates },
            ].map(p => (
              <div key={p.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-xs font-bold text-[var(--text-secondary)]">
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
              className="group relative bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] transition-all duration-300 flex flex-col overflow-hidden focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-[var(--radius-sm)] flex items-center justify-center border border-[var(--border)] ${c.bg}`}>
                  <tool.icon className={`w-5 h-5 ${c.text}`} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">{tool.label}</h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed flex-1">{tool.description}</p>
              <div className={`mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-bold ${c.pill} w-fit`}>
                <Sparkles className="w-3 h-3" />
                <span>{tool.stat}</span>
                {tool.statTotal && <span className="opacity-60 font-medium">{tool.statTotal}</span>}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick tip */}
      <div className="flex items-start gap-3 p-4 bg-[var(--warning-bg)] border border-[var(--warning)]/20 rounded-[var(--radius-lg)]">
        <Zap className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--warning)]">
          <strong>Pro tip:</strong> Combine Coupons + Referrals for a viral growth loop — buyers save money AND earn rewards for bringing new customers.
        </p>
      </div>
    </div>
  );
}
