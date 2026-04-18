"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { DigiOneLogo } from '@/src/components/assets/DigiOneLogo';
import { Menu, X, LayoutDashboard, ChevronDown, LogOut, Compass, Users, ArrowRight, User, BookOpen, Sparkles, Receipt, PenLine } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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

export default function MarketingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const supabaseRef = useRef(createClient());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileDropdownOpen]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    const loadProfile = async (user: any) => {
      try {
        const { data } = await supabase
          .from('users')
          .select('id, profiles(full_name, avatar_url)')
          .eq('auth_provider_id', user.id)
          .maybeSingle();

        const rawProfile = Array.isArray(data?.profiles)
          ? (data?.profiles[0] ?? null)
          : ((data?.profiles as unknown) as UserProfile | null) ?? null;

        const pd: UserProfile = {
          full_name: rawProfile?.full_name || null,
          avatar_url: rawProfile?.avatar_url || null,
          email: user.email,
        };
        setUserProfile(pd);
      } catch {
        setUserProfile({ full_name: null, avatar_url: null, email: user.email });
      }
    };

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const loggedIn = !!session?.user;
        setIsLoggedIn(loggedIn);
        if (loggedIn && session?.user) await loadProfile(session.user);
      } catch {
        setIsLoggedIn(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const loggedIn = !!session?.user;
      setIsLoggedIn(loggedIn);
      if (loggedIn && session?.user) {
        await loadProfile(session.user);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabaseRef.current.auth.signOut();
    setIsLoggedIn(false);
    setUserProfile(null);
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const initials = userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'C';

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'pt-2 sm:pt-4 px-2 sm:px-4' : 'pt-4 sm:pt-6 px-4'}`}>
        <div className={`mx-auto max-w-7xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isScrolled 
            ? 'bg-white/80 backdrop-blur-xl border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl md:rounded-full py-1.5 px-3 md:px-5' 
            : 'bg-transparent border-transparent py-2'
        }`}>
          <div className="flex h-12 md:h-14 items-center justify-between">
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <DigiOneLogo width={24} height={24} className="transform group-hover:scale-105 transition-all duration-300" />
              <span className="text-[17px] md:text-[19px] font-bold tracking-tight text-gray-900">
                DigiOne<sup className="text-[9px] md:text-[10px] text-gray-400 font-semibold ml-0.5 -top-2 relative">.ai</sup>
              </span>
            </Link>

            {/* Desktop Links */}
            <div className="hidden lg:flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
              {navLinks.map(({ label, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center gap-1.5 text-[14px] text-gray-500 hover:text-black font-semibold px-4 py-2 rounded-full hover:bg-black/[0.03] transition-all"
                >
                  {Icon && <Icon className="w-3.5 h-3.5 mb-0.5 opacity-70" />}
                  {label}
                </Link>
              ))}
            </div>

            {/* Desktop Auth */}
            <div className="hidden lg:flex items-center gap-3">
              {isLoggedIn ? (
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(o => !o)}
                    className="flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full hover:bg-black/[0.03] transition-all border border-transparent focus:bg-black/[0.03]"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#E83A2E] flex items-center justify-center text-white font-bold text-xs ring-4 ring-white shadow-sm overflow-hidden shrink-0">
                      {userProfile?.avatar_url ? (
                        <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : initials}
                    </div>
                    <span className="text-[14px] font-semibold text-gray-800 max-w-[120px] truncate capitalize">
                      {userProfile?.full_name || 'Creator'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${profileDropdownOpen ? 'rotate-180' : ''} shrink-0`} />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-xl border border-black/5 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] py-2 z-50 transform origin-top-right transition-all">
                      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E83A2E] flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden shrink-0">
                          {userProfile?.avatar_url ? (
                            <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate uppercase tracking-widest">{userProfile?.full_name || 'Creator'}</p>
                          <p className="text-[13px] text-gray-500 truncate" title={userProfile?.email || 'Connected Account'}>
                            {userProfile?.email || 'Connected Account'}
                          </p>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="px-3 mb-1 mt-1 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Account</p>
                        <Link
                          href="/account/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium text-gray-700 hover:text-black hover:bg-gray-100/80 transition-colors rounded-xl"
                        >
                          <User className="w-4 h-4 text-gray-400" />
                          Profile
                        </Link>
                        <Link
                          href="/account/library"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium text-gray-700 hover:text-black hover:bg-gray-100/80 transition-colors rounded-xl"
                        >
                          <BookOpen className="w-4 h-4 text-gray-400" />
                          Library
                        </Link>
                      </div>
                      <div className="p-2 border-t border-gray-100">
                        <Link
                          href="/dashboard"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium text-gray-700 hover:text-black hover:bg-gray-100/80 transition-colors rounded-xl"
                        >
                          <LayoutDashboard className="w-4 h-4 text-gray-400" />
                          Dashboard
                        </Link>
                      </div>
                      <div className="p-2 border-t border-gray-100">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium text-red-600 hover:bg-red-50 transition-colors rounded-xl"
                        >
                          <LogOut className="w-4 h-4 text-red-400" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link href="/login" className="text-[14px] font-semibold text-gray-500 hover:text-black px-4 py-2 rounded-full hover:bg-black/[0.03] transition-all">
                    Log in
                  </Link>
                  <Link href="/signup" className="text-[14px] font-bold bg-black hover:bg-gray-900 text-white px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 shadow-[0_4px_14px_0_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] hover:-translate-y-0.5">
                    Start free <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="text-gray-900 p-2 -mr-2 rounded-full hover:bg-black/[0.04] transition-all"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu — full-screen overlay */}
      <div className={`fixed inset-0 z-[100] transition-all duration-300 ${mobileMenuOpen ? 'visible' : 'invisible pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Sheet — slides up from bottom */}
        <div className={`absolute inset-x-0 bottom-0 bg-white rounded-t-4xl shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] max-h-[92dvh] ${mobileMenuOpen ? 'translate-y-0' : 'translate-y-full'}`}>

          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-3 pb-4 shrink-0">
            <div className="flex items-center gap-2">
              <DigiOneLogo width={22} height={22} />
              <span className="text-[17px] font-bold text-gray-900 tracking-tight">
                DigiOne<sup className="text-[9px] text-gray-400 font-semibold ml-0.5 -top-2 relative">.ai</sup>
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex flex-col flex-1 overflow-y-auto px-5 pb-8">

            {/* Logged-in user info */}
            {isLoggedIn && userProfile && (
              <div className="flex items-center gap-3 p-4 mb-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-[#E83A2E] flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0 shadow-sm">
                  {userProfile.avatar_url ? <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-gray-900 truncate">{userProfile.full_name || 'Creator'}</p>
                  <p className="text-[12px] text-gray-400 truncate">{userProfile.email || 'Verified Account'}</p>
                </div>
              </div>
            )}

            {/* Nav links */}
            <div className="space-y-0.5 mb-4">
              {navLinks.map(({ label, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-[16px] font-semibold text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  {Icon && <Icon className="w-5 h-5 text-gray-400 shrink-0" />}
                  {label}
                </Link>
              ))}
            </div>

            {/* Account links (logged in) */}
            {isLoggedIn && (
              <div className="space-y-0.5 mb-4 pt-4 border-t border-gray-100">
                <p className="px-3 mb-1 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Account</p>
                <Link href="/account/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  <User className="w-4 h-4 text-gray-400 shrink-0" /> Profile
                </Link>
                <Link href="/account/library" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  <BookOpen className="w-4 h-4 text-gray-400 shrink-0" /> Library
                </Link>
              </div>
            )}

            {/* CTA buttons */}
            <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-2.5">
              {isLoggedIn ? (
                <>
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 text-[15px] font-bold bg-black text-white rounded-2xl py-3.5 active:scale-[0.98] transition-all">
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                  <button onClick={handleSignOut} className="w-full text-center text-[14px] font-semibold text-gray-400 py-3 active:scale-[0.98] transition-all">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 text-[15px] font-bold bg-black text-white rounded-2xl py-3.5 active:scale-[0.98] transition-all">
                    Start for free <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center text-[14px] font-semibold text-gray-500 bg-gray-100 rounded-2xl py-3.5 active:scale-[0.98] transition-all">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
