'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { DigiOneLogo, DigiOneLogoDark } from '@/src/components/assets/DigiOneLogo';
import {
  LayoutDashboard, Package, Store, BarChart2, DollarSign,
  Megaphone, Settings, Menu, X,
  ChevronRight, ChevronDown, Users, Bell, Ticket, BookOpen,
  Network, Gift, Plus, Image as ImageIcon, MoreHorizontal, LogOut, MessageCircle, HelpCircle,
  Instagram, Zap, Server, Calendar, ShoppingBag,
} from 'lucide-react';
import { useCreator } from '@/hooks/useCreator';
import { useNotifications } from '@/hooks/useNotifications';
import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────
type NavChild = { label: string; href: string; icon: React.ElementType };
type NavItem = NavChild & { children?: NavChild[] };
type NavGroup = { id: string; group: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    id: 'workspace',
    group: 'Workspace',
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Products', href: '/dashboard/products', icon: Package },
      { label: 'My Sites', href: '/dashboard/sites', icon: Store },
      { label: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
      { label: 'Customers', href: '/dashboard/customers', icon: Users },
      { label: 'Media', href: '/dashboard/media', icon: ImageIcon },
    ],
  },
  {
    id: 'money',
    group: 'Money',
    items: [
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
      { label: 'Earnings', href: '/dashboard/earnings', icon: DollarSign },
    ],
  },
  {
    id: 'grow',
    group: 'Grow',
    items: [
      { label: 'Auto DM', href: '/dashboard/autodm', icon: Instagram },
      { label: 'Automation', href: '/dashboard/automation', icon: Zap },
      { label: 'Community', href: '/dashboard/marketing/community', icon: MessageCircle },

      {
        label: 'Marketing',
        href: '/dashboard/marketing',
        icon: Megaphone,
        children: [
          { label: 'Coupons', href: '/dashboard/marketing/coupons', icon: Ticket },
          { label: 'Leads', href: '/dashboard/marketing/leads', icon: BookOpen },
          { label: 'Affiliates', href: '/dashboard/marketing/affiliates', icon: Network },
          { label: 'Referrals', href: '/dashboard/marketing/referrals', icon: Gift },
          { label: 'Services', href: '/dashboard/marketing/services', icon: Calendar },
        ],
      },
    ],
  },
];

const BOTTOM_NAV = [
  { label: 'Services', href: '/dashboard/services', icon: Server },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  { label: 'Help Center', href: '/dashboard/help', icon: HelpCircle },
];

// ─── Sidebar ─────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const { profile } = useCreator();
  const { unreadCount } = useNotifications();

  // Hide sidebar entirely on full-screen editor pages
  if (pathname?.startsWith('/dashboard/sites/edit')) return null;

  const close = () => setIsOpen(false);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : !!pathname?.startsWith(href);

  const isChildActive = (children?: NavChild[]) =>
    !!children?.some(c => pathname?.startsWith(c.href));

  const accordionOpen = (href: string, children?: NavChild[]) =>
    openAccordions[href] ?? isChildActive(children);

  const toggleAccordion = (href: string) =>
    setOpenAccordions(p => ({ ...p, [href]: !p[href] }));

  const userName = profile?.full_name || 'Creator';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const avatarUrl = (profile as any)?.avatar_url;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  // ── Leaf link ─────────────────────────────────────────────
  const NavLink = ({
    href, label, icon: Icon, active, badge,
  }: { href: string; label: string; icon: React.ElementType; active: boolean; badge?: number }) => (
    <Link
      href={href}
      onClick={close}
      className={`group flex items-center gap-3 px-3 py-[7px] rounded-lg text-[13px] font-medium transition-all ${active
        ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
        }`}
    >
      <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${active
        ? 'text-[var(--text-primary)]'
        : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
        }`} />
      <span className="flex-1 truncate">{label}</span>
      {badge && badge > 0 ? (
        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--danger)] text-white text-[10px] font-bold leading-none">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : active ? (
        <ChevronRight className="w-3 h-3 text-[var(--text-secondary)] shrink-0" />
      ) : null}
    </Link>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-2.5 left-3 p-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-gray-200/80 dark:border-zinc-800/80 rounded-xl text-gray-700 dark:text-gray-300 shadow-sm transition-all active:scale-95"
        style={{ zIndex: 9999 }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md md:hidden transition-opacity duration-300" style={{ zIndex: 99998 }} onClick={close} />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 h-full bg-[var(--bg-primary)]
          border-r border-[var(--border)]
          w-[256px] flex flex-col shadow-2xl md:shadow-none
          transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ zIndex: 99999 }}
      >

        {/* ── Logo ── */}
        <div className="h-14 flex items-center justify-between px-6 shrink-0 border-b border-[var(--border)] mb-1 bg-[var(--bg-primary)]/50">
          <Link href="/dashboard" onClick={close} className="flex items-center gap-2 shrink-0 group">
            {/* Light mode logo */}
            <DigiOneLogo width={26} height={26} className="block dark:hidden group-hover:scale-105 transition-transform" />
            {/* Dark mode logo */}
            <DigiOneLogoDark width={26} height={26} className="hidden dark:block group-hover:scale-105 transition-transform" />
            <span className="text-[16px] font-bold tracking-tight text-[var(--text-primary)]">
              DigiOne<sup className="text-[9px] text-[var(--text-secondary)] font-medium ml-0.5 -top-1.5 relative">.ai</sup>
            </span>
          </Link>
          <button onClick={close} className="md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── CTA Buttons ── */}
        <div className="px-3 pb-3 pt-1 flex gap-2">
          <Link
            href="/dashboard/sites/new"
            onClick={close}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-xl text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Create site
          </Link>

          <Link
            href="/dashboard/products/new"
            onClick={close}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add product
          </Link>
        </div>

        <div className="mx-3 border-t border-[var(--border)]" />

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto pt-3 pb-2 px-3 flex flex-col gap-5 scrollbar-thin">

          {NAV.map(({ id, group, items }) => (
            <div key={id}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] px-3 mb-1.5">
                {group}
              </p>
              <div className="flex flex-col gap-px">
                {items.map(item => {
                  const hasChildren = !!item.children?.length;
                  const childActive = hasChildren && isChildActive(item.children);
                  const open = hasChildren && accordionOpen(item.href, item.children);
                  const active = !hasChildren && isActive(item.href);

                  if (hasChildren) {
                    return (
                      <div key={item.href}>
                        <button
                          onClick={() => toggleAccordion(item.href)}
                          className={`w-full flex items-center gap-3 px-3 py-[7px] rounded-lg text-[13px] font-medium transition-all ${childActive
                            ? 'text-[var(--text-primary)] bg-[var(--bg-tertiary)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                          <item.icon className={`w-[18px] h-[18px] shrink-0 ${childActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`} />
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                        </button>

                        {open && (
                          <div className="mt-0.5 ml-[18px] pl-3 border-l border-[var(--border)] flex flex-col gap-px">
                            {item.children!.map(child => {
                              const ca = pathname?.startsWith(child.href) ?? false;
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={close}
                                  className={`flex items-center gap-2 px-2.5 py-[5px] rounded-md text-xs font-medium transition-all ${ca
                                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                  <child.icon className={`w-3.5 h-3.5 shrink-0 ${ca ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`} />
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={active}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Account links */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] px-3 mb-1.5">
              Account
            </p>
            <div className="flex flex-col gap-px">
              {BOTTOM_NAV.map(link => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  icon={link.icon}
                  active={isActive(link.href)}
                  badge={link.href === '/dashboard/notifications' ? unreadCount : undefined}
                />
              ))}
            </div>
          </div>
        </nav>

        {/* ── Bottom ── */}
        <div className="shrink-0 border-t border-[var(--border)]">

          {/* Upgrade to Pro */}
          {/* <div className="p-3 pb-0">
            <div className="px-3 py-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs">&#9889;</span>
                <p className="text-xs font-bold text-[var(--text-primary)]">Upgrade to Pro</p>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-2.5">
                Less Fees, priority support and more.
              </p>
              <Link
                href="/dashboard/settings/billing"
                onClick={close}
                className="block w-full text-center py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-lg text-xs font-semibold transition"
              >
                View Plans
              </Link>
            </div>
          </div> */}

          {/* User profile */}
          <div className="p-3 relative">
            <button
              onClick={() => setProfileMenuOpen(o => !o)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand)] to-violet-600 flex items-center justify-center shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-[11px] font-bold">{userInitials}</span>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate leading-tight">{userName}</p>
                <p className="text-[10px] text-[var(--text-secondary)] truncate leading-tight mt-px">Free Plan</p>
              </div>
              <MoreHorizontal className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
            </button>

            {/* Profile dropdown */}
            {profileMenuOpen && (
              <div
                className="absolute bottom-full left-3 right-3 mb-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-xl py-1 z-50"
                onMouseLeave={() => setProfileMenuOpen(false)}
              >
                <Link
                  href="/dashboard/settings"
                  onClick={() => { close(); setProfileMenuOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition"
                >
                  <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
                  Settings
                </Link>
                <Link
                  href="/dashboard/settings/billing"
                  onClick={() => { close(); setProfileMenuOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition"
                >
                  <DollarSign className="w-4 h-4 text-[var(--text-secondary)]" />
                  Billing & Plan
                </Link>
                <hr className="my-1 border-[var(--border)]" />
                <button
                  onClick={() => { handleLogout(); setProfileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--danger)] hover:bg-[var(--bg-tertiary)] transition"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
