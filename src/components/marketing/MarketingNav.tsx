"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { DigiOneLogo } from '@/src/components/assets/DigiOneLogo';
import { Menu, X, LayoutDashboard, LogOut, Compass, Users, ArrowRight, User, BookOpen, Sparkles, Receipt, PenLine, Store, Link2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/current-user';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '@/hooks/auth/useAuthSession';
import { CartButton } from '@/components/store/CartButton';
import { useHydratedCartCount } from '@/hooks/commerce/useCart';

interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
  email?: string | null;
}

const navLinks = [
  { label: 'Discover', href: '/discover', icon: Compass },
  { label: 'Community', href: '/community', icon: Users },
  { label: 'Features', href: '/features', icon: Sparkles },
  { label: 'Pricing', href: '/pricing', icon: Receipt },
  { label: 'Blog', href: '/blog', icon: PenLine },
];

// linkln.me — the short-link product, rendered in its own brand script face
// (Succulent). It's an external destination (the branded short-link site), so
// it navigates out to the real domain, not an internal route.
const BRAND_FONT = "'Succulent', cursive";
const SHORTLINK_DOMAIN = process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN || 'linkln.me';
const LINKLN_URL = `https://${SHORTLINK_DOMAIN}`;

export default function MarketingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  // Discover is a marketplace surface: the center nav rail is dropped and the
  // cart is always reachable (even when empty).
  const isDiscover = pathname === '/discover' || !!pathname?.startsWith('/discover/');

  // Sliding hover highlight for desktop links
  const linksRef = useRef<HTMLDivElement>(null);
  const [hoverPill, setHoverPill] = useState({ left: 0, width: 0, opacity: 0 });

  const moveHoverPill = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rail = linksRef.current;
    if (!rail) return;
    const link = e.currentTarget.getBoundingClientRect();
    const parent = rail.getBoundingClientRect();
    setHoverPill({ left: link.left - parent.left, width: link.width, opacity: 1 });
  };

  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoggedIn, userEmail, profile, isLoading: isAuthLoading } = useAuthSession();
  const userProfile: UserProfile | null = profile ? { full_name: profile.full_name, avatar_url: profile.avatar_url, email: userEmail } : null;
  const openCartDrawer = () => router.push('/cart');
  const cartCount = useHydratedCartCount();

  // Resolve role so logged-in buyers (not creators) are offered the upgrade.
  const [isBuyer, setIsBuyer] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isLoggedIn) { if (!cancelled) setIsBuyer(false); return; }
      const user = await getCurrentUser();
      if (!user || cancelled) return;
      const { data } = await supabase.from('users').select('role').eq('auth_provider_id', user.id).maybeSingle();
      if (!cancelled) setIsBuyer(!(data?.role === 'creator' || data?.role === 'super_admin'));
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // Hide on scroll down, reveal on scroll up (modern auto-hiding nav)
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 20);

      const delta = y - lastScrollY.current;
      if (y < 80) {
        setNavHidden(false);
      } else if (delta > 6) {
        setNavHidden(true);
      } else if (delta < -6) {
        setNavHidden(false);
      }
      lastScrollY.current = y;
    };
    const raf = requestAnimationFrame(onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileDropdownOpen]);

  // Source of truth: TanStack Query. This subscription only triggers invalidation.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // A stalled request or busy auth lock must never leave the menu stuck —
      // clear the local session regardless.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
    setShowSignOutConfirm(false);
    // onAuthStateChange will invalidate the session query automatically.
  };

  // Hover-open with a close delay so the cursor can cross the gap into the panel.
  const dropdownCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openProfileDropdown = () => {
    if (dropdownCloseTimer.current) clearTimeout(dropdownCloseTimer.current);
    setProfileDropdownOpen(true);
  };
  const scheduleProfileDropdownClose = () => {
    if (dropdownCloseTimer.current) clearTimeout(dropdownCloseTimer.current);
    dropdownCloseTimer.current = setTimeout(() => setProfileDropdownOpen(false), 180);
  };
  useEffect(() => () => {
    if (dropdownCloseTimer.current) clearTimeout(dropdownCloseTimer.current);
  }, []);

  const initials = userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'C';

  return (
    <>
      {/* linkln.me brand script face (Succulent). `precedence` makes React 19
          float this stylesheet into <head>; without it the <link> lingers in
          the body and mobile browsers render the fallback cursive instead. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Succulent&display=swap" rel="stylesheet" precedence="default" />

      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          navHidden && !profileDropdownOpen ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        {/* Bar + section-separator hairline below */}
        <div
          className={`border-b border-black/[0.07] transition-colors duration-300 ${
            isScrolled ? 'bg-white/85 backdrop-blur-xl' : 'bg-transparent'
          }`}
        >
          <div className="mx-auto max-w-6xl px-5 sm:px-10 lg:px-14">
            <div
              className={`relative flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isScrolled ? 'h-12 md:h-14' : 'h-14 md:h-16'
              }`}
            >

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <DigiOneLogo width={22} height={22} className="transform group-hover:scale-105 transition-all duration-300" />
              <span className="text-[16px] md:text-[17px] font-bold tracking-tight text-[#16130F]">
                DigiOne<span className="font-ledger text-[9px] text-[#E83A2E] font-semibold ml-0.5 align-super">.ai</span>
              </span>
            </Link>

            {/* Desktop Links — hidden on the discover marketplace surface */}
            {!isDiscover && (
            <div
              ref={linksRef}
              onMouseLeave={() => setHoverPill(p => ({ ...p, opacity: 0 }))}
              className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2"
            >
              {/* Sliding hover highlight */}
              <span
                aria-hidden="true"
                className="absolute top-1/2 -translate-y-1/2 h-8 rounded-lg bg-black/[0.05] pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ left: hoverPill.left, width: hoverPill.width, opacity: hoverPill.opacity }}
              />
              {navLinks.map(({ label, href }) => {
                const isActive = pathname === href || pathname?.startsWith(`${href}/`);
                return (
                  <Link
                    key={label}
                    href={href}
                    onMouseEnter={moveHoverPill}
                    className={`relative px-3 py-2 text-[13.5px] font-medium transition-colors duration-200 ${
                      isActive ? 'text-[#16130F]' : 'text-black/55 hover:text-[#16130F]'
                    }`}
                  >
                    {label}
                    {/* Active route tick */}
                    <span
                      aria-hidden="true"
                      className={`absolute -bottom-px left-1/2 -translate-x-1/2 h-[2px] rounded-full bg-[#E83A2E] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        isActive ? 'w-4 opacity-100' : 'w-0 opacity-0'
                      }`}
                    />
                  </Link>
                );
              })}

              {/* linkln.me — external, in its brand script face */}
              <a
                href={LINKLN_URL}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={moveHoverPill}
                aria-label="linkln.me — the link shortener"
                style={{ fontFamily: BRAND_FONT }}
                className="relative px-3 py-2 leading-none text-[18px] text-[#16130F]/80 hover:text-[#16130F] transition-colors duration-200"
              >
                linkln<span className="text-[#E83A2E]">.me</span>
              </a>
            </div>
            )}

            {/* Desktop Auth */}
            <div className="hidden lg:flex items-center gap-4">
              {(isDiscover || cartCount > 0) && (
                <CartButton
                  itemCount={cartCount}
                  onClick={openCartDrawer}
                  className="text-[#16130F] hover:bg-black/[0.04] !rounded-lg"
                  badgeClassName="bg-[#E83A2E] text-white"
                />
              )}
              {isAuthLoading ? null : isLoggedIn ? (
                <>
                  <Link
                    href={isBuyer ? '/account/library' : '/dashboard'}
                    className="flex items-center gap-1.5 text-[12.5px] font-semibold bg-[#E83A2E] hover:bg-[#C92F24] text-white px-3 py-1.5 rounded-md transition-colors duration-200"
                  >
                    {isBuyer ? <BookOpen className="w-3 h-3" /> : <LayoutDashboard className="w-3 h-3" />}
                    {isBuyer ? 'Library' : 'Dashboard'}
                  </Link>
                  <div
                    ref={dropdownRef}
                    className="relative"
                    onMouseEnter={openProfileDropdown}
                    onMouseLeave={scheduleProfileDropdownClose}
                  >
                    <button
                      onClick={() => setProfileDropdownOpen(o => !o)}
                      aria-label="Account menu"
                      className="w-9 h-9 rounded-full bg-[#E83A2E] flex items-center justify-center text-white font-bold text-[12px] overflow-hidden shrink-0 ring-1 ring-black/[0.06] hover:ring-black/[0.12] transition-all"
                    >
                      {userProfile?.avatar_url ? (
                        <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : initials}
                    </button>

                    {profileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white border border-black/[0.1] rounded-xl shadow-[0_16px_50px_-20px_rgba(22,19,15,0.25)] py-1 z-50">
                        <div className="px-4 py-3.5 border-b border-black/[0.06] flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#E83A2E] flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
                            {userProfile?.avatar_url ? (
                              <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-[#16130F] truncate capitalize">{userProfile?.full_name || 'Creator'}</p>
                            <p className="font-ledger text-[11px] text-black/40 truncate" title={userProfile?.email || 'Connected Account'}>
                              {userProfile?.email || 'Connected Account'}
                            </p>
                          </div>
                        </div>
                        <div className="p-1.5">
                          <p className="font-ledger px-2.5 mb-1 mt-1 text-[9px] font-medium text-black/35 uppercase tracking-[0.18em]">Account</p>
                          <Link
                            href="/account/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-2.5 py-2 text-[13.5px] font-medium text-black/65 hover:text-[#16130F] hover:bg-black/[0.04] transition-colors rounded-lg"
                          >
                            <User className="w-4 h-4 text-black/35" />
                            Profile
                          </Link>
                          {!isBuyer && (
                            <Link
                              href="/account/library"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-3 px-2.5 py-2 text-[13.5px] font-medium text-black/65 hover:text-[#16130F] hover:bg-black/[0.04] transition-colors rounded-lg"
                            >
                              <BookOpen className="w-4 h-4 text-black/35" />
                              Library
                            </Link>
                          )}
                          {isBuyer && (
                            <Link
                              href="/account/library"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-3 px-2.5 py-2 text-[13.5px] font-semibold text-[#E83A2E] hover:bg-[#E83A2E]/[0.06] transition-colors rounded-lg"
                            >
                              <Store className="w-4 h-4" />
                              Become a creator
                            </Link>
                          )}
                        </div>
                        <div className="p-1.5 border-t border-black/[0.06]">
                          <button
                            onClick={() => { setProfileDropdownOpen(false); setShowSignOutConfirm(true); }}
                            className="w-full flex items-center gap-3 px-2.5 py-2 text-[13.5px] font-semibold text-[#E83A2E] hover:bg-[#E83A2E]/[0.06] transition-colors rounded-lg"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-[13.5px] font-medium text-black/55 hover:text-[#16130F] transition-colors duration-200">
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="text-[13.5px] font-semibold bg-[#E83A2E] hover:bg-[#C92F24] text-white px-4.5 py-2.5 rounded-lg transition-colors duration-200 flex items-center gap-1.5"
                  >
                    Start free <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <div className="lg:hidden flex items-center">
              {(isDiscover || cartCount > 0) && (
                <CartButton
                  itemCount={cartCount}
                  onClick={openCartDrawer}
                  className="text-[#16130F] hover:bg-black/[0.04] !rounded-lg mr-1"
                  badgeClassName="bg-[#E83A2E] text-white"
                />
              )}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="text-[#16130F] p-2 -mr-2 rounded-lg hover:bg-black/[0.04] transition-colors"
                aria-label="Open menu"
              >
                <Menu className="h-5.5 w-5.5" />
              </button>
            </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu — full-screen overlay */}
      <div className={`fixed inset-0 z-[100] transition-all duration-300 ${mobileMenuOpen ? 'visible' : 'invisible pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-[#16130F]/40 backdrop-blur-sm transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Sheet — slides up from bottom */}
        <div className={`absolute inset-x-0 bottom-0 bg-white rounded-t-2xl border-t border-black/[0.08] shadow-2xl flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] max-h-[92dvh] ${mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>

          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-black/[0.12]" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-3 pb-4 shrink-0 border-b border-black/[0.06]">
            <div className="flex items-center gap-2">
              <DigiOneLogo width={20} height={20} />
              <span className="text-[16px] font-bold text-[#16130F] tracking-tight">
                DigiOne<span className="font-ledger text-[9px] text-[#E83A2E] font-semibold ml-0.5 align-super">.ai</span>
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-8 h-8 flex items-center justify-center border border-black/[0.08] hover:bg-black/[0.04] rounded-lg transition-colors"
            >
              <X className="h-4 w-4 text-black/45" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex flex-col flex-1 overflow-y-auto px-5 pb-8 pt-4">

            {/* Logged-in user info */}
            {!isAuthLoading && isLoggedIn && userProfile && (
              <div className="flex items-center gap-3 p-4 mb-4 bg-[#FAF8F6] rounded-xl border border-black/[0.06]">
                <div className="w-10 h-10 rounded-md bg-[#E83A2E] flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
                  {userProfile.avatar_url ? <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[#16130F] truncate capitalize">{userProfile.full_name || 'Creator'}</p>
                  <p className="font-ledger text-[11px] text-black/40 truncate">{userProfile.email || 'Verified Account'}</p>
                </div>
              </div>
            )}

            {/* Account + Dashboard — placed above Explore */}
            {!isAuthLoading && isLoggedIn && (
              <div className="mb-4">
                {isBuyer ? (
                  <Link href="/account/library" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 text-[14px] font-semibold bg-[#E83A2E] text-white rounded-lg py-3.5 active:scale-[0.98] transition-all">
                    <Store className="w-4 h-4" /> Become a creator
                  </Link>
                ) : (
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 text-[14px] font-semibold bg-[#E83A2E] hover:bg-[#C92F24] text-white rounded-lg py-3.5 active:scale-[0.98] transition-all">
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                )}
                <p className="font-ledger px-3 mb-1.5 mt-4 text-[9px] font-medium text-black/35 uppercase tracking-[0.18em]">Account</p>
                <div className="space-y-0.5">
                  <Link href="/account/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-[14px] font-semibold text-black/65 hover:bg-black/[0.03] transition-colors">
                    <User className="w-4 h-4 text-black/35 shrink-0" /> Profile
                  </Link>
                  <Link href="/account/library" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-[14px] font-semibold text-black/65 hover:bg-black/[0.03] transition-colors">
                    <BookOpen className="w-4 h-4 text-black/35 shrink-0" /> Library
                  </Link>
                </div>
              </div>
            )}

            {/* Nav links */}
            <p className="font-ledger px-3 mb-1.5 text-[9px] font-medium text-black/35 uppercase tracking-[0.18em]">Explore</p>
            <div className="space-y-0.5 mb-4">
              {navLinks.map(({ label, href, icon: Icon }, i) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-[15px] font-semibold text-[#16130F] hover:bg-black/[0.03] active:bg-black/[0.05] transition-all duration-300"
                  style={{
                    opacity: mobileMenuOpen ? 1 : 0,
                    transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(12px)',
                    transition: `opacity 0.35s ease ${120 + i * 55}ms, transform 0.35s cubic-bezier(0.16,1,0.3,1) ${120 + i * 55}ms`,
                  }}
                >
                  {Icon && <Icon className="w-4.5 h-4.5 text-black/35 shrink-0" strokeWidth={1.8} />}
                  {label}
                  <span className="font-ledger ml-auto text-[10px] text-black/25">{String(i + 1).padStart(2, '0')}</span>
                </Link>
              ))}

              {/* linkln.me — external, in its brand script face */}
              <a
                href={LINKLN_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-black/[0.03] active:bg-black/[0.05] transition-all duration-300"
                style={{
                  opacity: mobileMenuOpen ? 1 : 0,
                  transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(12px)',
                  transition: `opacity 0.35s ease ${120 + navLinks.length * 55}ms, transform 0.35s cubic-bezier(0.16,1,0.3,1) ${120 + navLinks.length * 55}ms`,
                }}
              >
                <Link2 className="w-4.5 h-4.5 text-black/35 shrink-0" strokeWidth={1.8} />
                <span className="text-[22px] leading-none text-[#16130F]" style={{ fontFamily: BRAND_FONT }}>
                  linkln<span className="text-[#E83A2E]">.me</span>
                </span>
                <span className="font-ledger ml-auto text-[10px] text-black/25">{String(navLinks.length + 1).padStart(2, '0')}</span>
              </a>
            </div>

            {/* CTA buttons */}
            <div
              className="mt-auto pt-4 border-t border-black/[0.06] flex flex-col gap-2.5"
              style={{
                opacity: mobileMenuOpen ? 1 : 0,
                transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(12px)',
                transition: `opacity 0.35s ease 400ms, transform 0.35s cubic-bezier(0.16,1,0.3,1) 400ms`,
              }}
            >
              {isAuthLoading ? null : isLoggedIn ? (
                <>
                  <button onClick={() => setShowSignOutConfirm(true)} className="w-full flex items-center justify-center gap-2 text-[14px] font-semibold text-[#E83A2E] py-3 active:scale-[0.98] transition-all">
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 text-[14px] font-semibold bg-[#E83A2E] text-white rounded-lg py-3.5 active:scale-[0.98] transition-all">
                    Start for free <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center text-[14px] font-semibold text-[#16130F] border border-black/[0.1] rounded-lg py-3.5 active:scale-[0.98] transition-all">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sign-out confirm dialog */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-200 flex items-center justify-center px-5">
          <div
            className="absolute inset-0 bg-[#16130F]/50 backdrop-blur-sm"
            onClick={() => setShowSignOutConfirm(false)}
          />
          <div className="relative bg-white border border-black/[0.08] rounded-xl shadow-2xl w-full max-w-sm p-7 flex flex-col items-center text-center animate-[fadeScaleIn_0.2s_cubic-bezier(0.16,1,0.3,1)_both]">
            <div className="w-12 h-12 rounded-lg bg-[#E83A2E]/[0.07] border border-[#E83A2E]/15 flex items-center justify-center mb-4">
              <LogOut className="w-5 h-5 text-[#E83A2E]" />
            </div>
            <h3 className="text-[17px] font-bold text-[#16130F] mb-1.5">Sign out?</h3>
            <p className="text-[13.5px] text-black/50 font-medium mb-7">You&apos;ll need to sign in again to access your account.</p>
            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={handleSignOut}
                className="w-full py-3 rounded-lg bg-[#E83A2E] hover:bg-[#C92F24] text-white text-[14px] font-semibold transition-colors"
              >
                Yes, sign out
              </button>
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="w-full py-3 rounded-lg border border-black/[0.1] hover:bg-black/[0.03] text-[#16130F] text-[14px] font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
