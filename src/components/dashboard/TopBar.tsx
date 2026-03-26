'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, Bell, Search } from 'lucide-react';
import { useCreator } from '@/hooks/useCreator';
import { useNotifications } from '@/hooks/useNotifications';
import { createClient } from '@/lib/supabase/client';

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

  const { profile } = useCreator();
  const { unreadCount } = useNotifications();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const fullName = profile?.full_name || 'Creator';
  const avatarUrl = (profile as any)?.avatar_url;
  const initial = fullName.charAt(0).toUpperCase();

  // Page title from URL
  const rawPath = pathname?.split('/dashboard')[1] || '';
  const segment = rawPath.split('/')[1] || '';
  const pageTitle = segment
    ? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    : 'Overview';

  return (
    <header className="h-14 w-full bg-white/80 dark:bg-[#060612]/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left: Title */}
      <div className="flex items-center gap-4 pl-10 md:pl-0">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{pageTitle}</h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/60 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
          <Search className="w-3.5 h-3.5" />
        </button>

        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          className="relative w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/60 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Profile */}
        <div className="relative ml-1">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg border border-gray-200/80 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition focus:outline-none"
          >
            <span className="text-[13px] font-medium hidden sm:block pl-1 text-gray-700 dark:text-gray-300">
              {fullName}
            </span>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold overflow-hidden shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-[11px]">{initial}</span>
              )}
            </div>
          </button>

          {showDropdown && (
            <div
              className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#0D0E1A] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1 z-50"
              onMouseLeave={() => setShowDropdown(false)}
            >
              <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{fullName}</p>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">Free Plan</p>
              </div>

              <button
                className="w-full px-3.5 py-2 text-left text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 transition"
                onClick={() => { setShowDropdown(false); router.push('/dashboard/settings'); }}
              >
                <User className="w-4 h-4 text-gray-400" />
                Profile Settings
              </button>

              <hr className="my-1 border-gray-100 dark:border-gray-800" />

              <button
                className="w-full px-3.5 py-2 text-left text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
