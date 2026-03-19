'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, Package, BarChart2, DollarSign, WalletCards, 
  Megaphone, Settings, Store, Menu, X, ExternalLink
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();

  const navLinks = [
    { label: 'Overview', href: '/dashboard', icon: Home },
    { label: 'Products', href: '/dashboard/products', icon: Package },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
    { label: 'Earnings', href: '/dashboard/earnings', icon: DollarSign },
    { label: 'Payouts', href: '/dashboard/payouts', icon: WalletCards },
    { label: 'Marketing Tools', href: '/dashboard/marketing', icon: Megaphone },
    { label: 'Store Settings', href: '/dashboard/settings/store', icon: Store },
    { label: 'Account Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Toggle & Header in layout, Sidebar just holds the drawer logic vs fixed left */}
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-600 dark:text-gray-300 shadow-sm"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white dark:bg-[#060612] border-r border-gray-200 dark:border-gray-800
        w-[240px] z-50 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl tracking-tight text-gray-900 dark:text-white">
            <div className="w-8 h-8 flex relative items-center justify-center bg-indigo-600 text-white rounded-lg text-sm font-extrabold">
              D1
            </div>
            DigiOne
          </Link>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Map */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1">
          {navLinks.map((link) => {
            // Precise active logic: exact match for /dashboard, startsWith for others
            const isActive = link.href === '/dashboard' 
              ? pathname === '/dashboard' 
              : pathname?.startsWith(link.href);

            return (
              <Link 
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors
                  ${isActive 
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
              >
                <link.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <Link 
            href="/my-store" // Requires dynamic resolution or just mapping correctly
            target="_blank"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Preview Store
            <ExternalLink className="w-4 h-4 text-gray-500" />
          </Link>
        </div>
      </aside>
    </>
  );
}
