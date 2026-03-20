'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Store, BarChart2, DollarSign,
  WalletCards, Megaphone, Settings, Menu, X, ExternalLink,
  ChevronRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSites } from '@/hooks/useSites';

// ─── Nav structure ───────────────────────────────────────────
type NavItem = { label: string; href: string; icon: React.ElementType };
type NavGroup = { group: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Main',
    items: [
      { label: 'Overview',  href: '/dashboard',             icon: LayoutDashboard },
      { label: 'Products',  href: '/dashboard/products',    icon: Package         },
      { label: 'My Stores', href: '/dashboard/sites',       icon: Store           },
    ],
  },
  {
    group: 'Insights',
    items: [
      { label: 'Analytics', href: '/dashboard/analytics',   icon: BarChart2    },
      { label: 'Earnings',  href: '/dashboard/earnings',    icon: DollarSign   },
      { label: 'Payouts',   href: '/dashboard/payouts',     icon: WalletCards  },
    ],
  },
  {
    group: 'Growth',
    items: [
      { label: 'Marketing', href: '/dashboard/marketing',   icon: Megaphone  },
    ],
  },
  {
    group: 'Account',
    items: [
      { label: 'Settings',  href: '/dashboard/settings',    icon: Settings   },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();
  const { sites } = useSites();

  // Find the creator's main store for the "Preview Store" link
  const mainSite = sites?.find(s => s.site_type === 'main' && s.is_active) ?? sites?.find(s => s.site_type === 'main');
  const mainStoreHref = mainSite?.slug ? `/${mainSite.slug}` : '/dashboard/sites';

  const close = () => setIsOpen(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-600 dark:text-gray-400 shadow-sm"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={close} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white dark:bg-[#060612]
        border-r border-gray-100 dark:border-gray-900
        w-[240px] z-50 flex flex-col
        transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100 dark:border-gray-900 shrink-0">
          <Link href="/dashboard" onClick={close} className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shadow-lg shadow-indigo-500/30">
              D1
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-white">DigiOne</span>
          </Link>
          <button onClick={close} className="md:hidden text-gray-400 hover:text-gray-700 dark:hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-5">
          {NAV_GROUPS.map(({ group, items }) => (
            <div key={group}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 px-2 mb-1.5">
                {group}
              </p>
              <div className="flex flex-col gap-0.5">
                {items.map(link => {
                  const isActive = link.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname?.startsWith(link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={close}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                        ${isActive
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
                        }
                      `}
                    >
                      <link.icon className={`w-4.5 h-4.5 shrink-0 transition ${
                        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
                      }`} />
                      <span className="flex-1 truncate">{link.label}</span>
                      {isActive && <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer — Preview store CTA */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-900 shrink-0">
          <Link
            href={mainStoreHref}
            target={mainSite ? '_blank' : undefined}
            rel="noopener noreferrer"
            onClick={close}
            className="flex items-center justify-between gap-2 w-full px-3 py-2.5 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10 border border-indigo-100 dark:border-indigo-800/40 rounded-xl text-sm font-semibold text-indigo-700 dark:text-indigo-400 hover:from-indigo-100 hover:to-violet-100 dark:hover:from-indigo-500/20 dark:hover:to-violet-500/20 transition group"
          >
            <span className="truncate">{mainSite ? 'View My Store' : 'Set Up Store'}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100 transition" />
          </Link>
        </div>
      </aside>
    </>
  );
}
