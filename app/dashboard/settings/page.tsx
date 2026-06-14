'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight, User, ShieldCheck, Plug, Crown, Library,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

type Section = {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  iconBg: string;
  iconColor: string;
  badge?: string;
};

const groups: { title: string; sections: Section[] }[] = [
  {
    title: 'Account',
    sections: [
      {
        icon: User,
        label: 'Profile',
        description: 'Your name, photo, bio, and social links shown on your public store page.',
        href: '/dashboard/settings/profile',
        iconBg: 'bg-[var(--surface-muted)]',
        iconColor: 'text-[var(--text-secondary)]',
      },
      {
        icon: ShieldCheck,
        label: 'Billing & KYC',
        description: 'Submit your PAN and bank account details to enable payouts. Required before withdrawing.',
        href: '/dashboard/settings/billing',
        iconBg: 'bg-[var(--success-bg)]',
        iconColor: 'text-[var(--success)]',
      },
      {
        icon: Library,
        label: 'My Library',
        description: 'Access all products you have purchased from creators on DigiOne.',
        href: '/dashboard/settings/library',
        iconBg: 'bg-[var(--info-bg)]',
        iconColor: 'text-[var(--info)]',
      },
      {
        icon: Crown,
        label: 'Subscription',
        description: 'Manage your plan. Upgrade to Pro to unlock Auto DM, lower fees, and more.',
        href: '/dashboard/settings/subscription',
        iconBg: 'bg-[var(--warning-bg)]',
        iconColor: 'text-[var(--warning)]',
        badge: 'Upgrade',
      },
    ],
  },
  {
    title: 'Preferences',
    sections: [
      {
        icon: Plug,
        label: 'Integrations',
        description: 'Connect third-party tools like Zapier, Razorpay, and email providers.',
        href: '/dashboard/settings/profile',
        iconBg: 'bg-[var(--surface-muted)]',
        iconColor: 'text-[var(--text-secondary)]',
        badge: 'Soon',
      },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Settings"
        description="Manage your account, store, and preferences."
      />

      {groups.map((group) => (
        <div key={group.title} className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] px-1">
            {group.title}
          </h2>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] overflow-hidden divide-y divide-[var(--border-subtle)]">
            {group.sections.map((section) => {
              const isSoon = section.badge === 'Soon';
              const inner = (
                <>
                  <div className={`w-10 h-10 ${section.iconBg} ${section.iconColor} rounded-[var(--radius-sm)] flex items-center justify-center shrink-0`}>
                    <section.icon size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{section.label}</p>
                      {section.badge && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--radius-sm)] uppercase tracking-wide ${
                          section.badge === 'Upgrade'
                            ? 'bg-[var(--warning-bg)] text-[var(--warning)]'
                            : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
                        }`}>
                          {section.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
                      {section.description}
                    </p>
                  </div>

                  {!isSoon && (
                    <ArrowRight
                      size={16}
                      className="shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-all"
                    />
                  )}
                </>
              );

              return isSoon ? (
                <div key={section.label} className="flex items-center gap-4 px-6 py-5 opacity-60 cursor-not-allowed">
                  {inner}
                </div>
              ) : (
                <Link key={section.label} href={section.href} className="flex items-center gap-4 px-6 py-5 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors group">
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
