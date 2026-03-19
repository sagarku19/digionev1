'use client';

// Marketing Tools page — hub linking to Coupons, Affiliates, and Referrals sections.
// DB tables: none (links to sub-pages)

import React from 'react';
import Link from 'next/link';
import { Ticket, Users, Share2, ArrowRight, Megaphone } from 'lucide-react';

const tools = [
  {
    icon: Ticket,
    label: 'Discount Coupons',
    description: 'Create percentage or fixed-amount promo codes to drive conversions and reward loyal buyers.',
    href: '/dashboard/coupons',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
  },
  {
    icon: Users,
    label: 'Affiliates',
    description: 'Recruit affiliates to market your products. Set custom commission rates and track their performance.',
    href: '/dashboard/affiliates',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
  },
  {
    icon: Share2,
    label: 'Referral Program',
    description: 'Let your buyers earn rewards by referring new customers. Grow your store through word-of-mouth.',
    href: '/dashboard/referrals',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-500/10',
  },
];

export default function MarketingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-indigo-500" />
          Marketing Tools
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Grow your audience and boost sales with promotions, affiliates, and referral programs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all duration-200 flex flex-col gap-4"
          >
            <div className={`w-12 h-12 ${tool.bg} ${tool.color} rounded-xl flex items-center justify-center`}>
              <tool.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">{tool.label}</h2>
              <p className="text-sm text-gray-500 leading-relaxed">{tool.description}</p>
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${tool.color} group-hover:gap-2 transition-all`}>
              Open <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
