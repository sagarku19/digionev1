'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, Bell, Search, Sun, Moon, Settings, ChevronRight, Sparkles } from 'lucide-react';
import { useCreator } from '@/hooks/useCreator';
import { useNotifications } from '@/hooks/useNotifications';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/contexts/DashboardThemeContext';

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClose]);
}

/* ── Breadcrumb helper ── */
function PageBreadcrumb({ pathname }: { pathname: string | null }) {
  const raw = pathname?.split('/dashboard')[1] || '';
  const segments = raw.split('/').filter(Boolean);

  if (segments.length === 0) {
    return <span className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">Overview</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[13px] text-gray-400 dark:text-zinc-500 font-medium">Dashboard</span>
      {segments.map((seg, i) => {
        const label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
        const isLast = i === segments.length - 1;
        return (
          <React.Fragment key={seg}>
            <ChevronRight className="w-3 h-3 text-gray-300 dark:text-zinc-700" />
            <span
              className={`text-[13px] font-medium ${
                isLast
                  ? 'text-gray-900 dark:text-white font-semibold'
                  : 'text-gray-400 dark:text-zinc-500'
              }`}
            >
              {label}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const { profile } = useCreator();
  const { unreadCount } = useNotifications();
  const { theme, setTheme } = useTheme();

  const profileRef = useRef<HTMLDivElement>(null);
  useClickOutside(profileRef, () => setShowDropdown(false));

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const fullName = profile?.full_name || 'Creator';
  const avatarUrl = (profile as any)?.avatar_url;
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <header className="h-[52px] w-full flex items-center justify-between px-4 sm:px-5 sticky top-0 z-30 bg-white/75 dark:bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/[0.06]">

      {/* ── Left: Breadcrumb ── */}
      <div className="flex items-center gap-3 pl-[52px] md:pl-0">
        <PageBreadcrumb pathname={pathname} />
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-1">

        {/* Search — desktop */}
        <div className={`relative hidden lg:flex items-center mr-1 transition-all duration-200 ${searchFocused ? 'w-52' : 'w-40'}`}>
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-gray-100/80 dark:bg-white/[0.05] border border-transparent focus:border-gray-200 dark:focus:border-white/10 text-[12.5px] text-gray-800 dark:text-zinc-200 focus:outline-none focus:bg-white dark:focus:bg-white/[0.08] transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
          />
          <kbd className={`absolute right-2.5 text-[10px] text-gray-300 dark:text-zinc-600 font-mono transition-opacity ${searchFocused ? 'opacity-0' : 'opacity-100'}`}>
            ⌘K
          </kbd>
        </div>

        {/* Search icon — mobile */}
        <IconButton className="lg:hidden">
          <Search className="w-[15px] h-[15px]" />
        </IconButton>

        {/* Theme toggle */}
        <div className="flex items-center h-8 bg-gray-100 dark:bg-zinc-800 rounded-md border border-gray-200 dark:border-zinc-700 p-0.75 gap-0.75">
          <ThemeBtn active={theme === 'light'} onClick={() => setTheme('light')} title="Light">
            <Sun className="w-3.5 h-3.5" />
            <span className="text-[12px] font-medium">Light</span>
          </ThemeBtn>
          <ThemeBtn active={theme === 'dark'} onClick={() => setTheme('dark')} title="Dark">
            <Moon className="w-3.5 h-3.5" />
            <span className="text-[12px] font-medium">Dark</span>
          </ThemeBtn>
        </div>

        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          className="relative h-8 px-3 rounded-md flex items-center gap-2 text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 transition-colors"
        >
          <Bell className="w-[15px] h-[15px] shrink-0" />
          <span className="hidden sm:block text-[12px] font-medium">Notifications</span>
          {unreadCount > 0 && (
            <span className="min-w-4.5 h-4.5 bg-[#E83A2E] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Divider */}
        <div className="w-px h-4 bg-gray-200 dark:bg-white/[0.07] mx-1" />

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-lg transition-colors ${
              showDropdown
                ? 'bg-gray-100 dark:bg-white/[0.08]'
                : 'hover:bg-gray-100/80 dark:hover:bg-white/[0.06]'
            }`}
          >
            {/* Avatar */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-black/5 dark:ring-white/10"
              style={{ background: '#E83A2E' }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                : <span className="text-white text-[10px] font-bold">{initial}</span>
              }
            </div>
            <span className="hidden sm:block text-[13px] font-semibold text-gray-800 dark:text-zinc-200 max-w-[96px] truncate">
              {fullName}
            </span>
            {/* Caret */}
            <svg
              className={`w-3 h-3 text-gray-400 dark:text-zinc-500 transition-transform duration-150 ${showDropdown ? 'rotate-180' : ''}`}
              viewBox="0 0 12 12" fill="none"
            >
              <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-[#141415] border border-gray-100 dark:border-white/[0.07] rounded-2xl shadow-xl shadow-black/[0.08] dark:shadow-black/40 py-1.5 z-50">

              {/* User header */}
              <div className="px-3 py-3 mb-1">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-white dark:ring-[#141415]"
                    style={{ background: 'linear-gradient(135deg, #E83A2E, #ff6b4a)' }}
                  >
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      : <span className="text-white text-sm font-bold">{initial}</span>
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{fullName}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      <span className="text-[10.5px] font-semibold text-amber-600 dark:text-amber-400">
                        Free Plan
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100 dark:bg-white/[0.06] mx-2 mb-1" />

              {/* Menu items */}
              <div className="px-1.5 space-y-0.5">
                <DropdownItem
                  icon={<User className="w-3.5 h-3.5" />}
                  label="Profile"
                  onClick={() => { setShowDropdown(false); router.push('/dashboard/settings/profile'); }}
                />
                <DropdownItem
                  icon={<Settings className="w-3.5 h-3.5" />}
                  label="Settings"
                  onClick={() => { setShowDropdown(false); router.push('/dashboard/settings'); }}
                />
                <DropdownItem
                  icon={<Bell className="w-3.5 h-3.5" />}
                  label="Notifications"
                  badge={unreadCount > 0 ? String(unreadCount) : undefined}
                  onClick={() => { setShowDropdown(false); router.push('/dashboard/notifications'); }}
                />
              </div>

              <div className="h-px bg-gray-100 dark:bg-white/[0.06] mx-2 my-1" />

              <div className="px-1.5">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12.5px] font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.08] transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── Sub-components ── */

function IconButton({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <button className={`w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100 hover:bg-gray-100/80 dark:hover:bg-white/[0.07] transition-colors ${className}`}>
      {children}
    </button>
  );
}

function ThemeBtn({
  active, onClick, title, children,
}: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-6.5 px-3 gap-1.5 rounded-md flex items-center justify-center transition-all duration-150 ${
        active
          ? 'bg-white dark:bg-zinc-700 text-gray-800 dark:text-zinc-100 shadow-sm border border-gray-200 dark:border-zinc-600'
          : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'
      }`}
    >
      {children}
    </button>
  );
}

function DropdownItem({
  icon, label, onClick, badge,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12.5px] font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100/80 dark:hover:bg-white/[0.06] transition-colors"
    >
      <span className="text-gray-400 dark:text-zinc-500">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="min-w-4.5 h-4.5 bg-[#E83A2E] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </button>
  );
}