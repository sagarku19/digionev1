'use client';

// Settings hub — links to all settings sub-sections.
// DB tables: none (navigation hub only)

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight, User, ShieldCheck, Plug, Crown, Library
} from 'lucide-react';

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
        iconBg: 'bg-gray-100 dark:bg-[var(--bg-secondary)]',
        iconColor: 'text-gray-700 dark:text-[var(--text-secondary)]',
      },
      {
        icon: ShieldCheck,
        label: 'Billing & KYC',
        description: 'Submit your PAN and bank account details to enable payouts. Required before withdrawing.',
        href: '/dashboard/settings/billing',
        iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
      },
      {
        icon: Library,
        label: 'My Library',
        description: 'Access all products you have purchased from creators on DigiOne.',
        href: '/dashboard/settings/library',
        iconBg: 'bg-blue-100 dark:bg-blue-500/20',
        iconColor: 'text-blue-600 dark:text-blue-400',
      },
      {
        icon: Crown,
        label: 'Subscription',
        description: 'Manage your plan. Upgrade to Pro to unlock Auto DM, lower fees, and more.',
        href: '/dashboard/settings/subscription',
        iconBg: 'bg-violet-100 dark:bg-violet-500/20',
        iconColor: 'text-violet-600 dark:text-violet-400',
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
        iconBg: 'bg-teal-100 dark:bg-teal-500/20',
        iconColor: 'text-teal-600 dark:text-teal-400',
        badge: 'Soon',
      },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] pt-4">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Manage your account, store, and preferences.
        </p>
      </div>

      {/* Groups */}
      {groups.map((group) => (
        <div key={group.title} className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
            {group.title}
          </h2>
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
            {group.sections.map((section) => {
              const isSoon = section.badge === 'Soon';
              const Wrapper = isSoon ? 'div' : Link;
              const wrapperProps = isSoon
                ? { className: 'flex items-center gap-4 px-6 py-5 opacity-60 cursor-not-allowed' }
                : {
                    href: section.href,
                    className:
                      'flex items-center gap-4 px-6 py-5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group',
                  };

              return (
                <Wrapper key={section.label} {...(wrapperProps as any)}>
                  {/* Icon */}
                  <div className={`w-10 h-10 ${section.iconBg} ${section.iconColor} rounded-xl flex items-center justify-center shrink-0`}>
                    <section.icon size={18} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{section.label}</p>
                      {section.badge && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide ${
                          section.badge === 'Upgrade'
                            ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400'
                            : 'bg-gray-100 dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                        }`}>
                          {section.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">
                      {section.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  {!isSoon && (
                    <ArrowRight
                      size={16}
                      className="shrink-0 text-gray-300 dark:text-zinc-700 group-hover:text-gray-500 dark:group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all"
                    />
                  )}
                </Wrapper>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
