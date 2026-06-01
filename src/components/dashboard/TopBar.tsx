'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, Bell, Search, Sun, Moon, Settings, Sparkles } from 'lucide-react';
import { useCreator } from '@/hooks/useCreator';
import { useNotifications } from '@/hooks/useNotifications';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/lib/supabase/client';
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
  const { products } = useProducts();
  const raw = pathname?.split('/dashboard')[1] || '';
  const segments = raw.split('/').filter(Boolean);
  const lastSeg = segments[segments.length - 1];
  
  let label = 'Overview';
  if (lastSeg) {
    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(lastSeg);
    const prevSeg = segments.length > 1 ? segments[segments.length - 2] : '';
    
    if (isUUID) {
      if (prevSeg === 'products') {
        const product = products?.find((p: any) => p.id === lastSeg);
        label = product?.name || 'Edit Product';
      } else {
        label = 'Details';
      }
    } else if (lastSeg === 'new' && prevSeg === 'products') {
      label = 'New Product';
    } else {
      label = lastSeg.charAt(0).toUpperCase() + lastSeg.slice(1).replace(/-/g, ' ');
    }
  }

  return (
    <span className="text-[15px] md:text-[20px] font-semibold text-gray-900 dark:text-white tracking-tight md:pl-6 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
      {label}
    </span>
  );
}

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const { profile, isLoading: profileLoading } = useCreator();
  const { unreadCount } = useNotifications();
  const { theme, setTheme } = useTheme();

  const profileRef = useRef<HTMLDivElement>(null);
  useClickOutside(profileRef, () => setShowDropdown(false));

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const confirmSignOut = () => {
    setShowDropdown(false);
    setShowSignOutConfirm(true);
  };

  const fullName = profile?.full_name || 'Creator';
  const avatarUrl = (profile as any)?.avatar_url;
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <>
    <header className="h-[52px] w-full flex items-center justify-between px-4 sm:px-5 sticky top-0 z-30 bg-[var(--bg-primary)] border-b border-[var(--border)]">

      {/* ── Left: Breadcrumb ── */}
      <div className="flex items-center gap-3 pl-[52px] md:pl-0">
        <PageBreadcrumb pathname={pathname} />
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-1">

        {/* Search — desktop only */}
        <div className={`relative hidden lg:flex items-center mr-1 transition-all duration-200 ${searchFocused ? 'w-52' : 'w-40'}`}>
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full h-8 pl-8 pr-3 rounded-[var(--radius-sm)] bg-gray-100/80 dark:bg-white/[0.05] border border-transparent focus:border-gray-200 dark:focus:border-white/10 text-[12.5px] text-gray-800 dark:text-zinc-200 focus:outline-none focus:bg-white dark:focus:bg-white/[0.08] transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
          />
          <kbd className={`absolute right-2.5 text-[10px] text-gray-300 dark:text-zinc-600 font-mono transition-opacity ${searchFocused ? 'opacity-0' : 'opacity-100'}`}>
            ⌘K
          </kbd>
        </div>

        {/* Theme toggle — desktop only */}
        <div className="hidden lg:flex items-center h-8 bg-gray-100 dark:bg-zinc-800 rounded-[var(--radius-sm)] border border-gray-200 dark:border-zinc-700 p-0.75 gap-0.75">
          <ThemeBtn active={theme === 'light'} onClick={() => setTheme('light')} title="Light">
            <Sun className="w-3.5 h-3.5" />
            <span className="text-[12px] font-medium">Light</span>
          </ThemeBtn>
          <ThemeBtn active={theme === 'dark'} onClick={() => setTheme('dark')} title="Dark">
            <Moon className="w-3.5 h-3.5" />
            <span className="text-[12px] font-medium">Dark</span>
          </ThemeBtn>
        </div>

        {/* Notifications — desktop only */}
        <Link
          href="/dashboard/notifications"
          className="relative h-8 px-3 rounded-[var(--radius-sm)] hidden lg:flex items-center gap-2 text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 transition-colors"
        >
          <Bell className="w-[15px] h-[15px] shrink-0" />
          <span className="text-[12px] font-medium">Notifications</span>
          {unreadCount > 0 && (
            <span className="min-w-4.5 h-4.5 bg-[var(--brand)] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Divider — desktop only */}
        <div className="hidden lg:block w-px h-4 bg-gray-200 dark:bg-white/[0.07] mx-1" />

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-[var(--radius-sm)] transition-colors ${
              showDropdown
                ? 'bg-gray-100 dark:bg-white/[0.08]'
                : 'hover:bg-gray-100/80 dark:hover:bg-white/[0.06]'
            }`}
          >
            {/* Avatar */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-black/5 dark:ring-white/10 bg-[var(--brand)]"
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                : profileLoading
                  ? <div className="w-full h-full rounded-full bg-[var(--bg-secondary)] animate-pulse" />
                  : <span className="text-white text-[10px] font-bold">{initial}</span>
              }
            </div>
            {profileLoading ? (
              <span className="hidden sm:block h-3 w-20 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] animate-pulse" />
            ) : (
              <span className="hidden sm:block text-[13px] font-semibold text-gray-800 dark:text-zinc-200 max-w-[96px] truncate">
                {fullName}
              </span>
            )}
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
            <div className="absolute right-0 mt-1.5 w-56 bg-[var(--bg-elevated)] border border-gray-100 dark:border-white/[0.07] rounded-[var(--radius-lg)] shadow-xl shadow-black/[0.08] dark:shadow-black/40 py-1.5 z-50">

              {/* User header */}
              <div className="px-3 py-3 mb-1">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-white dark:ring-[var(--bg-elevated)]"
                    style={{ background: 'linear-gradient(135deg, var(--brand), #ff6b4a)' }}
                  >
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      : profileLoading
                        ? <div className="w-full h-full rounded-full bg-[var(--bg-secondary)] animate-pulse" />
                        : <span className="text-white text-sm font-bold">{initial}</span>
                    }
                  </div>
                  <div className="min-w-0">
                    {profileLoading ? (
                      <div className="h-3.5 w-28 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] animate-pulse" />
                    ) : (
                      <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{fullName}</p>
                    )}
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

              {/* Theme toggle — mobile only */}
              <div className="lg:hidden px-1.5 mt-0.5">
                <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-sm)]">
                  <span className="text-gray-400 dark:text-zinc-500">
                    {theme === 'light' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  </span>
                  <span className="flex-1 text-left text-[12.5px] font-medium text-gray-700 dark:text-zinc-300">Theme</span>
                  <div className="flex items-center h-7 bg-gray-100 dark:bg-zinc-700 rounded-[var(--radius-sm)] border border-gray-200 dark:border-zinc-600 p-0.5 gap-0.5">
                    <button
                      onClick={() => setTheme('light')}
                      className={`h-6 px-2 gap-1 rounded flex items-center justify-center text-[11px] font-medium transition-all duration-150 ${
                        theme === 'light'
                          ? 'bg-white dark:bg-zinc-600 text-gray-800 dark:text-zinc-100 shadow-sm border border-gray-200 dark:border-zinc-500'
                          : 'text-gray-400 dark:text-zinc-500'
                      }`}
                    >
                      <Sun className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`h-6 px-2 gap-1 rounded flex items-center justify-center text-[11px] font-medium transition-all duration-150 ${
                        theme === 'dark'
                          ? 'bg-white dark:bg-zinc-600 text-gray-800 dark:text-zinc-100 shadow-sm border border-gray-200 dark:border-zinc-500'
                          : 'text-gray-400 dark:text-zinc-500'
                      }`}
                    >
                      <Moon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100 dark:bg-white/[0.06] mx-2 my-1" />

              <div className="px-1.5">
                <button
                  onClick={confirmSignOut}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-sm)] text-[12.5px] font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.08] transition-colors"
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

    {/* ── Sign-out confirm modal ── */}
    {showSignOutConfirm && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSignOutConfirm(false)} />
        <div className="relative w-full max-w-sm bg-[var(--bg-elevated)] rounded-[var(--radius-lg)] shadow-2xl border border-gray-100 dark:border-white/[0.08] p-6">
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
            <LogOut className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">Sign out?</h3>
          <p className="text-[13px] text-gray-500 dark:text-zinc-400 mb-5">You will be redirected to the login page.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSignOutConfirm(false)}
              className="flex-1 h-9 rounded-[var(--radius-sm)] border border-gray-200 dark:border-white/[0.08] text-[13px] font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 h-9 rounded-[var(--radius-sm)] bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

/* ── Sub-components ── */

function ThemeBtn({
  active, onClick, title, children,
}: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-6.5 px-3 gap-1.5 rounded-[var(--radius-sm)] flex items-center justify-center transition-all duration-150 ${
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
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-sm)] text-[12.5px] font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100/80 dark:hover:bg-white/[0.06] transition-colors"
    >
      <span className="text-gray-400 dark:text-zinc-500">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="min-w-4.5 h-4.5 bg-[var(--brand)] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </button>
  );
}