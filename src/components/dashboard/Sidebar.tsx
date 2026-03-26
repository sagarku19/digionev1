'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, Store, BarChart2, DollarSign,
  Megaphone, Settings, Menu, X,
  ChevronRight, ChevronDown, Users, Bell, Ticket, BookOpen,
  Network, Gift, Plus, Image, MoreHorizontal, LogOut, MessageCircle,
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
      { label: 'Overview',  href: '/dashboard',           icon: LayoutDashboard },
      { label: 'Products',  href: '/dashboard/products',  icon: Package },
      { label: 'My Sites',  href: '/dashboard/sites',     icon: Store },
      { label: 'Customers', href: '/dashboard/customers', icon: Users },
      { label: 'Media',     href: '/dashboard/media',     icon: Image },
    ],
  },
  {
    id: 'money',
    group: 'Money',
    items: [
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
      { label: 'Earnings',  href: '/dashboard/earnings',  icon: DollarSign },
    ],
  },
  {
    id: 'grow',
    group: 'Grow',
    items: [
      { label: 'Community', href: '/dashboard/marketing/community', icon: MessageCircle },
      {
        label: 'Marketing',
        href: '/dashboard/marketing',
        icon: Megaphone,
        children: [
          { label: 'Coupons',    href: '/dashboard/marketing/coupons',    icon: Ticket },
          { label: 'Leads',      href: '/dashboard/marketing/leads',      icon: BookOpen },
          { label: 'Affiliates', href: '/dashboard/marketing/affiliates', icon: Network },
          { label: 'Referrals',  href: '/dashboard/marketing/referrals',  icon: Gift },
        ],
      },
    ],
  },
];

const BOTTOM_NAV = [
  { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { label: 'Settings',      href: '/dashboard/settings',      icon: Settings },
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

  const close = () => setIsOpen(false);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : !!pathname?.startsWith(href);

  const isChildActive = (children?: NavChild[]) =>
    !!children?.some(c => pathname?.startsWith(c.href));

  const accordionOpen = (href: string, children?: NavChild[]) =>
    openAccordions[href] ?? isChildActive(children);

  const toggleAccordion = (href: string) =>
    setOpenAccordions(p => ({ ...p, [href]: !p[href] }));

  // Profile
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
      className={`group flex items-center gap-3 px-3 py-[7px] rounded-lg text-[13px] font-medium transition-all ${
        active
          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'}`} />
      <span className="flex-1 truncate">{label}</span>
      {badge && badge > 0 ? (
        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : active ? (
        <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0" />
      ) : null}
    </Link>
  );

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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" onClick={close} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white dark:bg-[#07070f]
        border-r border-gray-200/80 dark:border-white/[0.06]
        w-[248px] z-50 flex flex-col
        transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* ── Logo ── */}
        <div className="h-14 flex items-center justify-between px-4 shrink-0">
          <Link href="/dashboard" onClick={close} className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shadow-lg shadow-indigo-500/25">
              D1
            </div>
            <span className="font-bold text-[15px] tracking-tight text-gray-900 dark:text-white">DigiOne</span>
          </Link>
          <button onClick={close} className="md:hidden text-gray-400 hover:text-gray-700 dark:hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── CTA Buttons ── */}
        <div className="px-3 pb-3 pt-1 flex gap-2">
          <Link
            href="/dashboard/sites/new"
            onClick={close}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-sm shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Create site
          </Link>
          <Link
            href="/dashboard/products/new"
            onClick={close}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.08] text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add product
          </Link>
        </div>

        <div className="mx-3 border-t border-gray-100 dark:border-white/[0.06]" />

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto pt-3 pb-2 px-3 flex flex-col gap-5 scrollbar-thin">

          {NAV.map(({ id, group, items }) => (
            <div key={id}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-600 px-3 mb-1.5">
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
                          className={`w-full flex items-center gap-3 px-3 py-[7px] rounded-lg text-[13px] font-medium transition-all ${
                            childActive
                              ? 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          <item.icon className={`w-[18px] h-[18px] shrink-0 ${childActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                        </button>

                        {open && (
                          <div className="mt-0.5 ml-[18px] pl-3 border-l border-gray-200 dark:border-gray-800 flex flex-col gap-px">
                            {item.children!.map(child => {
                              const ca = pathname?.startsWith(child.href) ?? false;
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={close}
                                  className={`flex items-center gap-2 px-2.5 py-[5px] rounded-md text-xs font-medium transition-all ${
                                    ca
                                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:text-gray-800 dark:hover:text-gray-200'
                                  }`}
                                >
                                  <child.icon className={`w-3.5 h-3.5 shrink-0 ${ca ? 'text-indigo-500' : 'text-gray-400'}`} />
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-600 px-3 mb-1.5">
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
        <div className="shrink-0 border-t border-gray-100 dark:border-white/[0.06]">

          {/* Upgrade to Pro */}
          <div className="p-3 pb-0">
            <div className="px-3 py-3 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/[0.08] dark:to-violet-500/[0.08] border border-indigo-200/60 dark:border-indigo-500/20 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs">&#9889;</span>
                <p className="text-xs font-bold text-gray-800 dark:text-white">Upgrade to Pro</p>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2.5">
                Less Fees, priority support and more.
              </p>
              <Link
                href="/dashboard/settings/billing"
                onClick={close}
                className="block w-full text-center py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-semibold transition shadow-sm shadow-indigo-500/20"
              >
                View Plans
              </Link>
            </div>
          </div>

          {/* User profile */}
          <div className="p-3 relative">
            <button
              onClick={() => setProfileMenuOpen(o => !o)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.04] transition"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-[11px] font-bold">{userInitials}</span>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate leading-tight">{userName}</p>
                <p className="text-[10px] text-gray-400 truncate leading-tight mt-px">Free Plan</p>
              </div>
              <MoreHorizontal className="w-4 h-4 text-gray-400 shrink-0" />
            </button>

            {/* Profile dropdown */}
            {profileMenuOpen && (
              <div
                className="absolute bottom-full left-3 right-3 mb-1 bg-white dark:bg-[#0D0E1A] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1 z-50"
                onMouseLeave={() => setProfileMenuOpen(false)}
              >
                <Link
                  href="/dashboard/settings"
                  onClick={() => { close(); setProfileMenuOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  Settings
                </Link>
                <Link
                  href="/dashboard/settings/billing"
                  onClick={() => { close(); setProfileMenuOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  Billing & Plan
                </Link>
                <hr className="my-1 border-gray-100 dark:border-gray-800" />
                <button
                  onClick={() => { handleLogout(); setProfileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
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
