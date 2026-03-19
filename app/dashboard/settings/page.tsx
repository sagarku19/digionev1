'use client';

// Settings hub page — links to billing/KYC and store configuration sub-sections.
// DB tables: none (navigation hub only)

import React from 'react';
import Link from 'next/link';
import { CreditCard, Store, ArrowRight, Settings } from 'lucide-react';

const sections = [
  {
    icon: CreditCard,
    label: 'Billing & KYC',
    description: 'Submit your PAN and bank account details to enable payouts. Required before withdrawing funds.',
    href: '/dashboard/settings/billing',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    icon: Store,
    label: 'Store Settings',
    description: 'Manage your store name, branding, domain, and general configuration options.',
    href: '/dashboard/settings/store',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    comingSoon: false,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-500" />
          Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account, billing, and store preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all duration-200 flex flex-col gap-4"
          >
            <div className={`w-12 h-12 ${section.bg} ${section.color} rounded-xl flex items-center justify-center`}>
              <section.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">{section.label}</h2>
              <p className="text-sm text-gray-500 leading-relaxed">{section.description}</p>
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${section.color} group-hover:gap-2 transition-all`}>
              Open <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
