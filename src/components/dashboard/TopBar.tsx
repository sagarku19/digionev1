'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, Bell, Search, Sun, Moon, Settings, Sparkles, ExternalLink } from 'lucide-react';
import { useCreator } from '@/hooks/creator/useCreator';
import { useNotifications } from '@/hooks/notifications/useNotifications';
import { useProducts } from '@/hooks/products/useProducts';
import { useSites } from '@/hooks/sites/useSites';
import { getSitePublicPath } from '@/lib/site-urls';
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
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

type Crumb = { label: string; href?: string; external?: boolean };

function PageBreadcrumb({ pathname }: { pathname: string | null }) {
  const { products } = useProducts();
  const { sites } = useSites();

  const segs = (pathname?.split('/dashboard')[1] || '').split('/').filter(Boolean);

  const crumbs: Crumb[] = (() => {
    if (segs.length === 0) return [{ label: 'Overview' }];

    // Site editors → /sites/{siteName ≤10}, name links to the live storefront
    if (segs[0] === 'sites' && segs[1] === 'edit' && segs[3]) {
      const site = sites.find((s) => s.id === segs[3]);
      const name =
        site?.site_main?.title ||
        site?.site_singlepage?.title ||
        site?.linkinbio_pages?.display_name ||
        (site?.slug && site.slug !== site.id ? site.slug : null) ||
        'site';
      const display = cap(name);
      const short = display.length > 10 ? `${display.slice(0, 10)}…` : display;
      const live = site
        ? getSitePublicPath({ id: site.id, site_type: site.site_type, slug: site.slug, creator_id: site.creator_id, custom_domain: site.custom_domain })
        : null;
      return [
        { label: 'Sites', href: '/dashboard/sites' },
        live ? { label: short, href: live, external: true } : { label: short },
      ];
    }

    // Product detail → /products/{name}, name links to the live product page
    if (segs[0] === 'products' && UUID_RE.test(segs[1] ?? '')) {
      const product = products?.find((p) => p.id === segs[1]);
      return [
        { label: 'Products', href: '/dashboard/products' },
        { label: cap(product?.name || 'Product') },
      ];
    }

    // Generic path — each segment links to its cumulative dashboard route
    let acc = '/dashboard';
    return segs.map((seg, i) => {
      acc += `/${seg}`;
      const isLast = i === segs.length - 1;
      const label = UUID_RE.test(seg) ? 'Details' : cap(seg);
      return isLast ? { label } : { label, href: acc };
    });
  })();

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm md:text-[15px] md:pl-6">
      {crumbs.map((c, i) => (
        <React.Fragment key={`${c.label}-${i}`}>
          {i > 0 && <span className="text-[var(--text-tertiary)]" aria-hidden>/</span>}
          <Crumb crumb={c} current={i === crumbs.length - 1 && !c.external} />
        </React.Fragment>
      ))}
    </nav>
  );
}

function Crumb({ crumb, current }: { crumb: Crumb; current: boolean }) {
  const base = 'truncate max-w-[110px] sm:max-w-[160px] rounded-[var(--radius-sm)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

  if (current) {
    return <span className={`${base} font-semibold text-[var(--text-primary)]`} title={crumb.label}>{crumb.label}</span>;
  }
  if (crumb.external && crumb.href) {
    return (
      <a
        href={crumb.href} target="_blank" rel="noopener noreferrer" title={`Open ${crumb.label}`}
        className={`${base} inline-flex items-center gap-0.5 font-semibold text-[var(--text-primary)] hover:text-[var(--brand)]`}
      >
        <span className="truncate">{crumb.label}</span>
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    );
  }
  if (crumb.href) {
    return (
      <Link href={crumb.href} title={crumb.label} className={`${base} text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline`}>
        {crumb.label}
      </Link>
    );
  }
  return <span className={`${base} text-[var(--text-secondary)]`}>{crumb.label}</span>;
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

  // Hover open/close (with a small grace delay so the cursor can travel into the menu)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openMenu = () => { if (closeTimer.current) clearTimeout(closeTimer.current); setShowDropdown(true); };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setShowDropdown(false), 160);
  };
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const confirmSignOut = () => {
    setShowDropdown(false);
    setShowSignOutConfirm(true);
  };

  const fullName = profile?.full_name || 'Creator';
  const avatarUrl = profile?.avatar_url;
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <>
    <header className="h-[52px] w-full flex items-center justify-between px-4 sm:px-5 sticky top-0 z-30 bg-[var(--sidebar-bg)] border-b border-[var(--border-strong)]">

      {/* ── Left: Breadcrumb ── */}
      <div className="flex items-center gap-3 pl-[52px] md:pl-0">
        <PageBreadcrumb pathname={pathname} />
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-1">

        {/* Search — desktop only */}
        <div className={`relative hidden lg:flex items-center mr-1 transition-all duration-200 ${searchFocused ? 'w-52' : 'w-40'}`}>
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full h-8 pl-8 pr-3 rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-transparent focus:border-[var(--border-strong)] text-[12.5px] text-[var(--text-primary)] focus:outline-none focus:shadow-[var(--focus-ring)] transition-all placeholder:text-[var(--text-tertiary)]"
          />
          <kbd className={`absolute right-2.5 text-[10px] text-[var(--text-tertiary)] font-mono transition-opacity ${searchFocused ? 'opacity-0' : 'opacity-100'}`}>
            ⌘K
          </kbd>
        </div>

        {/* Notifications — desktop only */}
        <Link
          href="/dashboard/notifications"
          className="relative h-8 px-3 rounded-[var(--radius-sm)] hidden lg:flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
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
        <div className="hidden lg:block w-px h-4 bg-[var(--border)] mx-1" />

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef} onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-[var(--radius-sm)] transition-colors ${
              showDropdown
                ? 'bg-[var(--surface-hover)]'
                : 'hover:bg-[var(--surface-hover)]'
            }`}
          >
            {/* Avatar */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-black/5 bg-[var(--brand)]"
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                : profileLoading
                  ? <div className="w-full h-full rounded-full bg-[var(--surface-muted)] animate-pulse" />
                  : <span className="text-white text-[10px] font-bold">{initial}</span>
              }
            </div>
            {profileLoading ? (
              <span className="hidden sm:block h-3 w-20 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] animate-pulse" />
            ) : (
              <span className="hidden sm:block text-[13px] font-semibold text-[var(--text-primary)] max-w-[96px] truncate">
                {fullName}
              </span>
            )}
            {/* Caret */}
            <svg
              className={`w-3 h-3 text-[var(--text-tertiary)] transition-transform duration-150 ${showDropdown ? 'rotate-180' : ''}`}
              viewBox="0 0 12 12" fill="none"
            >
              <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 mt-1.5 w-56 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] py-1.5 z-50">

              {/* User header */}
              <div className="px-3 py-3 mb-1">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-[var(--border)]"
                    style={{ background: 'linear-gradient(135deg, var(--brand), #ff6b4a)' }}
                  >
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      : profileLoading
                        ? <div className="w-full h-full rounded-full bg-[var(--surface-muted)] animate-pulse" />
                        : <span className="text-white text-sm font-bold">{initial}</span>
                    }
                  </div>
                  <div className="min-w-0">
                    {profileLoading ? (
                      <div className="h-3.5 w-28 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] animate-pulse" />
                    ) : (
                      <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{fullName}</p>
                    )}
                    <div className="flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-[var(--warning)]" />
                      <span className="text-[10.5px] font-semibold text-[var(--warning)]">
                        Free Plan
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-[var(--border-subtle)] mx-2 mb-1" />

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

              {/* Appearance — Theme toggle */}
              <div className="h-px bg-[var(--border-subtle)] mx-2 my-1" />
              <div className="px-1.5">
                <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-sm)]">
                  <span className="text-[var(--text-tertiary)]">
                    {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  </span>
                  <span className="flex-1 text-[12.5px] font-medium text-[var(--text-secondary)]">Theme</span>
                  <button
                    type="button" role="switch" aria-checked={theme === 'dark'} aria-label="Toggle dark mode"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${theme === 'dark' ? 'bg-[var(--brand)]' : 'border border-[var(--border)] bg-[var(--surface-muted)]'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>

              <div className="h-px bg-[var(--border-subtle)] mx-2 my-1" />

              <div className="px-1.5">
                <button
                  onClick={confirmSignOut}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-sm)] text-[12.5px] font-medium text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
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
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSignOutConfirm(false)} />
        <div className="relative w-full max-w-sm bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] border border-[var(--border)] p-6">
          <div className="w-10 h-10 rounded-full bg-[var(--danger-bg)] flex items-center justify-center mb-4">
            <LogOut className="w-5 h-5 text-[var(--danger)]" />
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">Sign out?</h3>
          <p className="text-[13px] text-[var(--text-secondary)] mb-5">You will be redirected to the login page.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSignOutConfirm(false)}
              className="flex-1 h-9 rounded-[var(--radius-sm)] border border-[var(--border)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 h-9 rounded-[var(--radius-sm)] bg-[var(--danger)] hover:opacity-90 text-[var(--text-on-brand)] text-[13px] font-semibold transition-colors"
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

function DropdownItem({
  icon, label, onClick, badge,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-sm)] text-[12.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
    >
      <span className="text-[var(--text-tertiary)]">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="min-w-4.5 h-4.5 bg-[var(--brand)] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </button>
  );
}
