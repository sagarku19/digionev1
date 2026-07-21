"use client";
/* eslint-disable react-hooks/static-components --
   NavLink is a local leaf-link component that closes over `close`; extracting it to
   module scope would thread props through ~15 call sites. Documented exception to the
   React-Compiler rule (this project doesn't use the compiler). */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DigiOneLogo,
  DigiOneLogoDark,
} from "@/src/components/assets/DigiOneLogo";
import {
  LayoutDashboard,
  Package,
  Store,
  BarChart2,
  DollarSign,
  Megaphone,
  Settings,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Users,
  Bell,
  Ticket,
  BookOpen,
  Network,
  Gift,
  Image as ImageIcon,
  MoreHorizontal,
  MessageCircle,
  HelpCircle,
  Instagram,
  Zap,
  Calendar,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  Link2,
} from "lucide-react";
import { useCreator } from "@/hooks/creator/useCreator";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import { useAuthSession } from "@/hooks/auth/useAuthSession";
import HoverPrefetchLink from "@/components/dashboard/HoverPrefetchLink";

// ─── Types ───────────────────────────────────────────────────
type NavChild = { label: string; href: string; icon: React.ElementType };
type NavItem = NavChild & { children?: NavChild[] };
type NavGroup = { id: string; group: string; items: NavItem[] };

// Routes that keep Next's default viewport prefetch. Every other sidebar/menu
// link prefetches only on hover or focus intent (HoverPrefetchLink), so a
// single dashboard load doesn't fan out one prefetch request per link.
const HOT_PREFETCH = new Set([
  "/dashboard",
  "/dashboard/products",
  "/dashboard/sites",
  "/dashboard/orders",
  "/dashboard/customers",
  "/dashboard/media",
  "/dashboard/analytics",
  "/dashboard/earnings",
  "/dashboard/autodm",
  "/dashboard/links",
]);

const NAV: NavGroup[] = [
  {
    id: "workspace",
    group: "Workspace",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Products", href: "/dashboard/products", icon: Package },
      { label: "My Sites", href: "/dashboard/sites", icon: Store },
      { label: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
      { label: "Customers", href: "/dashboard/customers", icon: Users },
      { label: "Media", href: "/dashboard/media", icon: ImageIcon },
    ],
  },
  {
    id: "money",
    group: "Money",
    items: [
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
      { label: "Earnings", href: "/dashboard/earnings", icon: DollarSign },
    ],
  },
  {
    id: "grow",
    group: "Grow",
    items: [
      { label: "Auto DM", href: "/dashboard/autodm", icon: Instagram },
      { label: "Short Links", href: "/dashboard/links", icon: Link2 },
      { label: "Integrations", href: "/dashboard/integrations", icon: Zap },
      {
        label: "Community",
        href: "/dashboard/marketing/community",
        icon: MessageCircle,
      },

      {
        label: "Marketing",
        href: "/dashboard/marketing",
        icon: Megaphone,
        children: [
          {
            label: "Coupons",
            href: "/dashboard/marketing/coupons",
            icon: Ticket,
          },
          {
            label: "Leads",
            href: "/dashboard/marketing/leads",
            icon: BookOpen,
          },
          {
            label: "Affiliates",
            href: "/dashboard/marketing/affiliates",
            icon: Network,
          },
          {
            label: "Referrals",
            href: "/dashboard/marketing/referrals",
            icon: Gift,
          },
          {
            label: "Services",
            href: "/dashboard/marketing/services",
            icon: Calendar,
          },
        ],
      },
    ],
  },
];

const BOTTOM_NAV = [
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Help Center", href: "/dashboard/help", icon: HelpCircle },
];

// Quick-create actions launched from the sidebar hamburger (desktop only)
const QUICK_ACTIONS: {
  label: string;
  desc: string;
  href: string;
  icon: React.ElementType;
}[] = [
  {
    label: "Create site",
    desc: "Launch a new storefront",
    href: "/dashboard/sites/new",
    icon: Store,
  },
  {
    label: "Add product",
    desc: "Upload a digital product",
    href: "/dashboard/products/new",
    icon: Package,
  },
  {
    label: "Upload media",
    desc: "Add images to your library",
    href: "/dashboard/media",
    icon: ImageIcon,
  },
  {
    label: "New coupon",
    desc: "Create a discount code",
    href: "/dashboard/marketing/coupons",
    icon: Ticket,
  },
  {
    label: "Short link",
    desc: "Create a trackable link",
    href: "/dashboard/links",
    icon: Link2,
  },
  {
    label: "New service",
    desc: "Offer a bookable service",
    href: "/dashboard/marketing/services",
    icon: Calendar,
  },
];

// ─── Sidebar ─────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(
    {},
  );
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!quickActionsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQuickActionsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [quickActionsOpen]);

  const handleTransitionEnd = () => {
    if (!isOpen) setVisible(false);
  };

  const { profile, isLoading: profileLoading } = useCreator();
  const { unreadCount } = useNotifications();
  const { userRole } = useAuthSession();

  // Hide sidebar entirely on full-screen editor pages
  if (pathname?.startsWith("/dashboard/sites/edit")) return null;

  const close = () => setIsOpen(false);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : !!pathname?.startsWith(href);

  const isChildActive = (children?: NavChild[]) =>
    !!children?.some((c) => pathname?.startsWith(c.href));

  const accordionOpen = (href: string, children?: NavChild[]) =>
    openAccordions[href] ?? isChildActive(children);

  const toggleAccordion = (href: string) =>
    setOpenAccordions((p) => ({ ...p, [href]: !p[href] }));

  const userName = profile?.full_name || "Creator";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatarUrl = profile?.avatar_url;

  // ── Leaf link ─────────────────────────────────────────────
  const NavLink = ({
    href,
    label,
    icon: Icon,
    active,
    badge,
  }: {
    href: string;
    label: string;
    icon: React.ElementType;
    active: boolean;
    badge?: number;
  }) => {
    const LinkComponent = HOT_PREFETCH.has(href) ? Link : HoverPrefetchLink;
    return (
    <LinkComponent
      href={href}
      onClick={close}
      className={`group relative flex items-center gap-3 pl-3 pr-3 py-[7px] rounded-[var(--radius-sm)] text-[13px] font-medium transition-all ${
        active
          ? "bg-[var(--bg-secondary)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full bg-[var(--brand)]" />
      )}
      <Icon
        className={`w-[18px] h-[18px] shrink-0 transition-colors ${
          active
            ? "text-[var(--brand)]"
            : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
        }`}
      />
      <span className="flex-1 truncate">{label}</span>
      {badge && badge > 0 ? (
        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--danger)] text-white text-[10px] font-bold leading-none">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </LinkComponent>
    );
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-2.5 left-3 p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-95"
        style={{ zIndex: 33 }}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile backdrop */}
      {visible && (
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
          style={{ zIndex: 34 }}
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        onTransitionEnd={handleTransitionEnd}
        className={`
          fixed top-0 left-0 h-full bg-[var(--sidebar-bg)]
          border-r border-[var(--border-strong)]
          w-[256px] flex flex-col shadow-[var(--shadow-lg)] md:shadow-none
          transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{ zIndex: 35 }}
      >
        {/* ── Logo ── */}
        <div className="h-[52px] flex items-center justify-between px-6 shrink-0 border-b border-[var(--border-strong)] mb-1">
          <Link
            href="/dashboard"
            onClick={close}
            className="flex items-center gap-2 shrink-0 group"
          >
            {/* Light mode logo */}
            <DigiOneLogo
              width={26}
              height={26}
              className="block dark:hidden group-hover:scale-105 transition-transform"
            />
            {/* Dark mode logo */}
            <DigiOneLogoDark
              width={26}
              height={26}
              className="hidden dark:block group-hover:scale-105 transition-transform"
            />
            <span className="text-[16px] font-bold tracking-tight text-[var(--text-primary)]">
              DigiOne
              <sup className="text-[9px] text-[var(--text-secondary)] font-medium ml-0.5 -top-1.5 relative">
                .ai
              </sup>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setQuickActionsOpen(true)}
              aria-label="Quick actions"
              className="hidden md:inline-flex p-1.5 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition"
            >
              <span className="flex flex-col gap-[4px] w-[18px]">
                <span className="h-[2px] w-full rounded-full bg-current" />
                <span className="h-[2px] w-full rounded-full bg-current" />
                <span className="h-[2px] w-full rounded-full bg-current" />
              </span>
            </button>
            <button
              onClick={close}
              className="md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto pt-3 pb-2 px-3 flex flex-col gap-5 scrollbar-thin">
          {NAV.map(({ id, group, items }) => (
            <div key={id}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60 px-3 mb-1.5">
                {group}
              </p>
              <div className="flex flex-col gap-px">
                {items.map((item) => {
                  const hasChildren = !!item.children?.length;
                  const childActive =
                    hasChildren && isChildActive(item.children);
                  const open =
                    hasChildren && accordionOpen(item.href, item.children);
                  const active = !hasChildren && isActive(item.href);

                  if (hasChildren) {
                    return (
                      <div key={item.href}>
                        <button
                          onClick={() => toggleAccordion(item.href)}
                          className={`relative w-full flex items-center gap-3 pl-3 pr-3 py-[7px] rounded-[var(--radius-sm)] text-[13px] font-medium transition-all ${
                            childActive
                              ? "text-[var(--text-primary)] bg-[var(--bg-secondary)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {childActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full bg-[var(--brand)]" />
                          )}
                          <item.icon
                            className={`w-[18px] h-[18px] shrink-0 ${childActive ? "text-[var(--brand)]" : "text-[var(--text-secondary)]"}`}
                          />
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                          />
                        </button>

                        {open && (
                          <div className="mt-0.5 ml-[18px] pl-3 border-l border-[var(--border)] flex flex-col gap-px">
                            {item.children!.map((child) => {
                              const ca =
                                pathname?.startsWith(child.href) ?? false;
                              return (
                                <HoverPrefetchLink
                                  key={child.href}
                                  href={child.href}
                                  onClick={close}
                                  className={`flex items-center gap-2 px-2.5 py-[5px] rounded-md text-xs font-medium transition-all ${
                                    ca
                                      ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                                  }`}
                                >
                                  <child.icon
                                    className={`w-3.5 h-3.5 shrink-0 ${ca ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
                                  />
                                  {child.label}
                                </HoverPrefetchLink>
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

          {/* Admin links — super_admin only */}
          {userRole === "super_admin" && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60 px-3 mb-1.5">
                Admin
              </p>
              <div className="flex flex-col gap-px">
                <NavLink
                  href="/dashboard/admin/payouts"
                  label="Payouts · Admin"
                  icon={ShieldCheck}
                  active={isActive("/dashboard/admin/payouts")}
                />
              </div>
            </div>
          )}

          {/* Account links */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60 px-3 mb-1.5">
              Account
            </p>
            <div className="flex flex-col gap-px">
              {BOTTOM_NAV.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  icon={link.icon}
                  active={isActive(link.href)}
                  badge={
                    link.href === "/dashboard/notifications"
                      ? unreadCount
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        </nav>

        {/* ── Bottom ── */}
        <div className="shrink-0 border-t border-[var(--border-strong)]">
          {/* Upgrade to Pro */}
          {/* <div className="p-3 pb-0">
            <div className="px-3 py-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[var(--radius-sm)]">
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
                className="block w-full text-center py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-[var(--radius-sm)] text-xs font-semibold transition"
              >
                View Plans
              </Link>
            </div>
          </div> */}

          {/* User profile */}
          <div className="p-3 relative">
            <button
              onClick={() => setProfileMenuOpen((o) => !o)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--bg-tertiary)] transition"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-[var(--brand)]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : profileLoading ? (
                  <div className="w-full h-full rounded-full bg-[var(--bg-secondary)] animate-pulse" />
                ) : (
                  <span className="text-white text-[11px] font-bold">
                    {userInitials}
                  </span>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0 text-left">
                {profileLoading ? (
                  <div className="h-3 w-24 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] animate-pulse" />
                ) : (
                  <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate leading-tight">
                    {userName}
                  </p>
                )}
                <p className="text-[10px] text-[var(--text-secondary)] truncate leading-tight mt-px">
                  Free Plan
                </p>
              </div>
              <MoreHorizontal className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
            </button>

            {/* Profile dropdown */}
            {profileMenuOpen && (
              <div
                className="absolute bottom-full left-3 right-3 mb-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] shadow-xl py-1 z-50"
                onMouseLeave={() => setProfileMenuOpen(false)}
              >
                <div className="px-2 pt-2 pb-1">
                  <div className="rounded-[var(--radius-sm)] bg-[var(--warning-bg)] border border-[var(--warning)]/20 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3 h-3 text-[var(--warning)]" />
                      <span className="text-[11px] font-bold text-[var(--warning)]">
                        Free Plan
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[var(--text-secondary)] leading-relaxed mb-2">
                      Unlock lower fees, priority support and more.
                    </p>
                    <HoverPrefetchLink
                      href="/dashboard/settings/subscription"
                      onClick={() => {
                        close();
                        setProfileMenuOpen(false);
                      }}
                      className="block w-full text-center py-1 bg-[var(--warning)] hover:opacity-90 text-[var(--text-on-brand)] rounded-md text-[11px] font-semibold transition"
                    >
                      Upgrade to Pro
                    </HoverPrefetchLink>
                  </div>
                </div>
                <hr className="my-1 border-[var(--border)]" />
                <HoverPrefetchLink
                  href="/dashboard/settings/profile"
                  onClick={() => {
                    close();
                    setProfileMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition"
                >
                  <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
                  Profile
                </HoverPrefetchLink>
                {/* <Link
                  href="/dashboard/settings/library"
                  onClick={() => { close(); setProfileMenuOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition"
                >
                  <DollarSign className="w-4 h-4 text-[var(--text-secondary)]" />
                  My Library
                </Link> */}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Quick actions (centered) ── */}
      {quickActionsOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 60 }}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setQuickActionsOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
                  Quick actions
                </h2>
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                  Jump straight into creating something.
                </p>
              </div>
              <button
                onClick={() => setQuickActionsOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <HoverPrefetchLink
                  key={action.label}
                  href={action.href}
                  onClick={() => {
                    close();
                    setQuickActionsOpen(false);
                  }}
                  className="group flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-strong)] transition"
                >
                  <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-center shrink-0 group-hover:border-[var(--brand)] transition">
                    <action.icon className="w-[18px] h-[18px] text-[var(--text-secondary)] group-hover:text-[var(--brand)] transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                      {action.label}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {action.desc}
                    </p>
                  </div>
                </HoverPrefetchLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
