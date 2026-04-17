'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, Bell, Search, Sun, Moon } from 'lucide-react';
import { useCreator } from '@/hooks/useCreator';
import { useNotifications } from '@/hooks/useNotifications';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/contexts/DashboardThemeContext';

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  const { profile } = useCreator();
  const { unreadCount } = useNotifications();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const fullName = profile?.full_name || 'Creator';
  const avatarUrl = (profile as any)?.avatar_url;
  const initial = fullName.charAt(0).toUpperCase();

  const rawPath = pathname?.split('/dashboard')[1] || '';
  const segment = rawPath.split('/')[1] || '';
  const pageTitle = segment
    ? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    : 'Overview';

  return (
    <header className="h-14 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-gray-200/80 dark:border-zinc-800/80 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 shadow-sm">
      {/* Left: Title */}
      <div className="flex items-center gap-4 pl-[52px] md:pl-0">
        <h1 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight truncate max-w-[140px] sm:max-w-none">{pageTitle}</h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-48 h-9 pl-9 pr-4 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-[13px] font-medium text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400"
          />
        </div>
        <button className="md:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-center text-gray-500 hover:text-indigo-600 transition-colors">
          <Search className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          className="relative px-2 sm:px-3 h-8 sm:h-9 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="text-[13px] font-medium hidden sm:block">Notifications</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--danger)] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[var(--bg-primary)]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Theme Selector */}
        <div className="relative">
          <button
            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            className="flex items-center justify-center sm:justify-start gap-2 w-8 h-8 sm:w-auto sm:h-9 sm:px-3 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-[13px] font-medium text-gray-500 hover:text-indigo-600 transition-colors focus:outline-none"
            title="Dashboard Theme"
          >
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            <span className="hidden sm:block">
              {theme === 'dark' ? 'Dark Theme' : 'Light Theme'}
            </span>
          </button>

          {showThemeDropdown && (
            <div
              className="absolute right-0 mt-2 w-36 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-xl py-1 z-50"
              onMouseLeave={() => setShowThemeDropdown(false)}
            >
              <div className="px-3 py-1.5 border-b border-[var(--border)] mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Dashboard Theme</p>
              </div>
              <button
                className={`w-full px-3 py-2 text-left text-[13px] flex items-center transition ${theme === 'light' ? 'text-[var(--accent)] bg-[var(--accent)]/10 font-semibold' : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                onClick={() => { setTheme('light'); setShowThemeDropdown(false); }}
              >
                <div className="flex items-center gap-2.5">
                  <Sun className="w-4 h-4" />
                  Light
                </div>
              </button>
              <button
                className={`w-full px-3 py-2 text-left text-[13px] flex items-center transition ${theme === 'dark' ? 'text-[var(--accent)] bg-[var(--accent)]/10 font-semibold' : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                onClick={() => { setTheme('dark'); setShowThemeDropdown(false); }}
              >
                <div className="flex items-center gap-2.5">
                  <Moon className="w-4 h-4" />
                  Dark
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative ml-0.5 sm:ml-1 border-l border-gray-200 dark:border-zinc-800 pl-2 sm:pl-3">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 pr-0 sm:pr-1 py-1 rounded-full transition focus:outline-none group"
          >
            <span className="text-[13px] font-bold hidden sm:block pl-1 text-gray-900 dark:text-gray-100 transition-colors">
              {fullName}
            </span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform" style={{ backgroundColor: '#E83A2E' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-[11px]">{initial}</span>
              )}
            </div>
          </button>

          {showDropdown && (
            <div
              className="absolute right-0 mt-2 w-52 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-xl py-1 z-50"
              onMouseLeave={() => setShowDropdown(false)}
            >
              <div className="px-3.5 py-3 border-b border-[var(--border)] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold overflow-hidden shrink-0" style={{ backgroundColor: '#E83A2E' }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xs">{initial}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{fullName}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">Free Plan</p>
                </div>
              </div>

              <button
                className="w-full px-3.5 py-2 text-left text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2.5 transition"
                onClick={() => { setShowDropdown(false); router.push('/dashboard/settings'); }}
              >
                <User className="w-4 h-4 text-[var(--text-secondary)]" />
                Profile Settings
              </button>

              <hr className="my-1 border-[var(--border)]" />

              <button
                className="w-full px-3.5 py-2 text-left text-[13px] text-[var(--danger)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2.5 transition"
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
