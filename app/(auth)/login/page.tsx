"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthSession, useLoginMutation } from '@/hooks/useAuthSession';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { isSafeInternalPath } from '@/lib/safe-redirect';

/* ── Google icon SVG ── */
function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const loginMutation = useLoginMutation();
  const loading = loginMutation.isPending || redirecting;

  // If a returning user hits /login while already authenticated (e.g., browser
  // back from /dashboard), bounce them to their landing page and use
  // location.replace so /login is dropped from history.
  const { isLoggedIn, isLoading: sessionLoading } = useAuthSession();
  const autoRedirectFired = useRef(false);

  useEffect(() => {
    if (sessionLoading || !isLoggedIn || autoRedirectFired.current) return;
    autoRedirectFired.current = true;

    (async () => {
      const returnUrl = searchParams.get('returnUrl');
      if (isSafeInternalPath(returnUrl)) {
        window.location.replace(returnUrl);
        return;
      }

      let role = 'user';
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('auth_provider_id', user.id)
            .single();
          role = userData?.role || 'user';
        }
      } catch {
        // Fall through with role='user'.
      }

      window.location.replace(
        role === 'creator' || role === 'super_admin' ? '/dashboard' : '/account/library'
      );
    })();
  }, [sessionLoading, isLoggedIn, searchParams]);

  // Uses window.location.href instead of router.push so the navigation does a
  // full reload. router.push relies on the in-page Next router and can silently
  // fail to navigate if proxy.ts redirects mid-flight while React is still
  // settling auth state.
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    loginMutation.mutate(
      { email, password },
      {
        onSuccess: async (user) => {
          setRedirecting(true);

          const returnUrl = searchParams.get('returnUrl');
          if (isSafeInternalPath(returnUrl)) {
            window.location.href = returnUrl;
            return;
          }

          // Resolve role to decide between /dashboard and /account/library.
          // If the query fails (RLS, missing row), default to the buyer route
          // rather than leaving the form spinning forever.
          let role = 'user';
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('role')
              .eq('auth_provider_id', user.id)
              .single();
            role = userData?.role || 'user';
          } catch {
            // Fall through with role='user'.
          }

          window.location.href = role === 'creator' || role === 'super_admin'
            ? '/dashboard'
            : '/account/library';
        },
        onError: (err) => {
          setError(err.message || 'Login failed. Please try again.');
        },
      }
    );
  };

  /* ── Google OAuth ── */
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  };

  if (sessionLoading || isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="w-7 h-7 rounded-full border-2 border-black/[0.08] border-t-[#E83A2E] animate-spin" />
        <span className="font-ledger text-[12px] text-black/40">
          {isLoggedIn ? 'Taking you to your account…' : 'Checking your session…'}
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <p className="font-ledger text-[10px] font-medium tracking-[0.18em] text-black/35 uppercase mb-3">
          <span className="text-[#E83A2E]">{'>>'}</span>&nbsp;&nbsp;/login
        </p>
        <h2 className="text-[26px] font-bold tracking-[-0.03em] text-[#16130F] mb-1.5">
          Welcome back
        </h2>
        <p className="text-[14px] text-black/50 font-medium">
          Log in to your DigiOne account
        </p>
      </div>

      {/* Email / password form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-[13px] font-semibold text-[#16130F] mb-1.5">Email</label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-lg border border-black/[0.1] bg-white text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-[13px] font-semibold text-[#16130F]">Password</label>
            <Link href="/forgot-password" className="text-[12px] font-semibold text-[#E83A2E] hover:underline transition-all">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-11 rounded-lg border border-black/[0.1] bg-white text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/35 hover:text-[#16130F] transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#E83A2E]/[0.06] border border-[#E83A2E]/15 text-[13px] text-[#E83A2E] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E] shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full py-3 px-4 bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
        >
          {loading ? 'Logging in…' : (
            <>
              Log in
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 mt-3 mb-3">
        <div className="flex-1 h-px bg-black/[0.07]" />
        <span className="font-ledger text-[10px] font-medium text-black/35 uppercase tracking-[0.18em]">or</span>
        <div className="flex-1 h-px bg-black/[0.07]" />
      </div>

      {/* Google button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-black/[0.1] text-[13px] font-semibold text-[#16130F] hover:bg-black/[0.03] hover:border-black/[0.25] transition-colors duration-200 disabled:opacity-60"
      >
        <GoogleIcon />
        {googleLoading ? 'Redirecting...' : 'Continue with Google'}
      </button>

      <div className="mt-4 text-center">
        <p className="text-[12px] text-black/50 mb-3">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#E83A2E] font-semibold hover:underline">Sign up free →</Link>
        </p>
        <p className="font-ledger text-[10px] text-black/35">
          By continuing you agree to our{' '}
          <Link href="/terms" className="hover:underline hover:text-[#16130F] transition-colors">Terms of Service</Link>
          {' & '}
          <Link href="/privacy" className="hover:underline hover:text-[#16130F] transition-colors">Privacy Policy</Link>
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginContent />
    </Suspense>
  );
}
