"use client";
// Marketing navigation bar — shows auth-aware CTA (Dashboard or Login/Signup).
// Shows user profile avatar + name when logged in.
// DB tables: profiles, users (read via getSession + profiles select)
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X, LayoutDashboard, ChevronDown, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
}

export default function MarketingNav() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const supabaseRef = useRef(createClient());

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  useEffect(() => {
    const supabase = supabaseRef.current;

    const loadProfile = async (userId: string) => {
      try {
        const { data } = await supabase
          .from('users')
          .select('id, profiles(full_name, avatar_url)')
          .eq('auth_provider_id', userId)
          .maybeSingle();

        const pd = Array.isArray(data?.profiles)
          ? data?.profiles[0]
          : (data?.profiles as UserProfile | null);
        setUserProfile(pd ?? null);
      } catch {
        setUserProfile(null);
      }
    };

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const loggedIn = !!session?.user;
        setIsLoggedIn(loggedIn);
        if (loggedIn && session?.user) {
          await loadProfile(session.user.id);
        }
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
  };

  const initials = userProfile?.full_name
    ? userProfile.full_name.charAt(0).toUpperCase()
    : 'C';

  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${isScrolled ? 'bg-[#03040A]/80 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
          }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white font-bold text-lg">
                  D
                </div>
                <span className="text-xl font-bold tracking-tight text-white">DigiOne</span>
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-8 ml-10">
              <Link href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</Link>
              <Link href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</Link>
              <Link href="#creators" className="text-sm text-slate-400 hover:text-white transition-colors">Creators</Link>
              <Link href="/blog" className="text-sm text-slate-400 hover:text-white transition-colors">Blog</Link>
            </div>

            <div className="hidden md:flex items-center gap-4">
              {isLoggedIn ? (
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                      {userProfile?.avatar_url ? (
                        <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : initials}
                    </div>
                    <span className="text-sm font-medium text-white">
                      {userProfile?.full_name || 'Creator'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-[#0D0E1A] border border-white/10 rounded-xl shadow-xl py-2 z-50">
                      <div className="px-4 py-2.5 border-b border-white/10 mb-1">
                        <p className="text-sm font-semibold text-white truncate">
                          {userProfile?.full_name || 'Creator'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">DigiOne Creator</p>
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link href="/login" className="text-sm text-white hover:text-slate-200 px-4 py-2 border border-white/20 rounded-lg transition-colors whitespace-nowrap">
                    Log in
                  </Link>
                  <Link href="/signup" className="text-sm font-semibold bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-lg transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)] whitespace-nowrap">
                    Start free →
                  </Link>
                </>
              )}
            </div>

            <div className="md:hidden">
              <button onClick={() => setMobileMenuOpen(true)} className="text-slate-400 hover:text-white">
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-[#03040A] p-4 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white font-bold">D</div>
              <span className="text-xl font-bold text-white">DigiOne</span>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Mobile Profile Info */}
          {isLoggedIn && userProfile && (
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl mb-6">
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold overflow-hidden">
                {userProfile.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{userProfile.full_name || 'Creator'}</p>
                <p className="text-xs text-slate-400">DigiOne Creator</p>
              </div>
            </div>
          )}

          <div className="flex flex-col space-y-6 overflow-y-auto">
            <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-slate-200">Features</Link>
            <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-slate-200">Pricing</Link>
            <Link href="#creators" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-slate-200">Creators</Link>
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-center bg-indigo-500 text-white rounded-lg py-3 mt-4 flex items-center justify-center gap-2">
                  <LayoutDashboard className="w-5 h-5" />
                  Go to Dashboard
                </Link>
                <button onClick={handleSignOut} className="text-lg font-medium text-red-400 text-center">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-slate-200">Log in</Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-center bg-indigo-500 text-white rounded-lg py-3 mt-4">
                  Start free &rarr;
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
