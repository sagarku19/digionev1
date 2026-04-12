"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { DigiOneLogo } from '@/src/components/assets/DigiOneLogo';
import { Menu, X, LayoutDashboard, ChevronDown, LogOut, Compass, Users, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
}

const navLinks = [
  { label: 'Discover', href: '/discover', icon: Compass },
  { label: 'Community', href: '/community', icon: Users },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Creators', href: '#creators' },
  { label: 'Blog', href: '/blog' },
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
    const onScroll = () => setIsScrolled(window.scrollY > 50);
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

    const loadProfile = async (userId: string) => {
      try {
        const { data } = await supabase
          .from('users')
          .select('id, profiles(full_name, avatar_url)')
          .eq('auth_provider_id', userId)
          .maybeSingle();

        const pd: UserProfile | null = Array.isArray(data?.profiles)
          ? (data?.profiles[0] ?? null)
          : ((data?.profiles as unknown) as UserProfile | null) ?? null;
        setUserProfile(pd);
      } catch {
        setUserProfile(null);
      }
    };

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const loggedIn = !!session?.user;
        setIsLoggedIn(loggedIn);
        if (loggedIn && session?.user) await loadProfile(session.user.id);
      } catch {
        setIsLoggedIn(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const loggedIn = !!session?.user;
      setIsLoggedIn(loggedIn);
      if (loggedIn && session?.user) {
        await loadProfile(session.user.id);
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

  const initials = userProfile?.full_name
    ? userProfile.full_name.charAt(0).toUpperCase()
    : 'C';

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 sm:px-6 pt-3 sm:pt-4">
        <div
          className={`w-full max-w-6xl rounded-2xl sm:rounded-full border transition-all duration-500 ${isScrolled
              ? 'bg-white/85 backdrop-blur-2xl border-gray-200/70 shadow-lg shadow-black/[0.06]'
              : 'bg-white/50 backdrop-blur-lg border-gray-200/30 shadow-sm shadow-black/[0.02]'
            }`}
        >
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <DigiOneLogo width={25} height={25} className="group-hover:scale-105 transition-transform" />
              <span className="text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
                DigiOne<sup className="text-[10px] text-[var(--text-secondary)] font-medium ml-0.5 -top-2 relative">.ai</sup>
              </span>
            </Link>

            {/* Desktop nav links — centered */}
            <div className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              {navLinks.map(({ label, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900 hover:bg-gray-100/80 transition-all font-medium px-3.5 py-2 rounded-full"
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {label}
                </Link>
              ))}
            </div>

            {/* Desktop right */}
            <div className="hidden lg:flex items-center gap-2.5">
              {isLoggedIn ? (
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(o => !o)}
                    className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full transition-all duration-200 ${profileDropdownOpen
                        ? 'bg-gray-100 shadow-inner'
                        : 'hover:bg-gray-100/70'
                      }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--brand)] to-violet-600 flex items-center justify-center text-white font-bold text-xs overflow-hidden ring-2 ring-white">
                      {userProfile?.avatar_url ? (
                        <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : initials}
                    </div>
                    <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">
                      {userProfile?.full_name || 'Creator'}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-white/90 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-xl shadow-black/[0.08] py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {userProfile?.full_name || 'Creator'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">DigiOne Creator</p>
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-lg mx-1"
                      >
                        <LayoutDashboard className="w-4 h-4 text-gray-400" />
                        Dashboard
                      </Link>
                      <div className="border-t border-gray-100 mt-1 pt-1 mx-1">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-lg"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-[13px] font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-full hover:bg-gray-100/70 transition-all"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="text-[13px] font-semibold bg-gray-900 hover:bg-gray-800 text-white pl-5 pr-4 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md"
                  >
                    Start free
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <div className="lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100/70 transition-all"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu — slide-in overlay */}
      <div
        className={`fixed inset-0 z-[60] transition-all duration-300 ${mobileMenuOpen ? 'visible' : 'invisible'
          }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'
            }`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Panel */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <DigiOneLogo width={24} height={24} />
              <span className="text-lg font-bold text-gray-900">
                DigiOne<sup className="text-[9px] text-gray-400 font-medium ml-0.5 -top-1.5 relative">.ai</sup>
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-400 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-all"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User card */}
          {isLoggedIn && userProfile && (
            <div className="mx-5 mt-5 flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand)] to-violet-600 flex items-center justify-center text-white font-bold overflow-hidden shrink-0 ring-2 ring-white">
                {userProfile.avatar_url
                  ? <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  : initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{userProfile.full_name || 'Creator'}</p>
                <p className="text-xs text-gray-500">DigiOne Creator</p>
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex flex-col flex-1 overflow-y-auto px-3 py-4">
            {navLinks.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 text-[15px] font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 py-3.5 px-4 rounded-xl transition-all"
              >
                {Icon && <Icon className="w-4 h-4 text-gray-400" />}
                {!Icon && <div className="w-4" />}
                {label}
              </Link>
            ))}
          </div>

          {/* Bottom CTAs */}
          <div className="p-5 border-t border-gray-100 space-y-3">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 text-[15px] font-bold bg-gray-900 hover:bg-gray-800 text-white rounded-xl py-3.5 transition-all shadow-sm"
                >
                  <LayoutDashboard className="w-4.5 h-4.5" />
                  Go to Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 text-[15px] font-medium text-red-600 border border-gray-200 rounded-xl py-3.5 hover:bg-red-50 transition-all"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 text-[15px] font-bold bg-gray-900 hover:bg-gray-800 text-white rounded-xl py-3.5 transition-all shadow-sm"
                >
                  Start free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center text-[15px] font-medium text-gray-700 border border-gray-200 rounded-xl py-3.5 hover:bg-gray-50 transition-all"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
