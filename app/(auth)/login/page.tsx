"use client";

import { useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  /* ── Email / password login ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('auth_provider_id', data.user.id)
        .single();

      const role = userData?.role || 'user';
      const returnUrl = searchParams.get('returnUrl');
      if (returnUrl) {
        router.push(returnUrl);
      } else if (role === 'creator' || role === 'super_admin') {
        router.push('/dashboard');
      } else {
        router.push('/account/library');
      }
    }
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

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-[28px] font-black tracking-[-0.02em] text-gray-900 mb-1.5">
          Welcome back
        </h2>
        <p className="text-[14px] text-gray-500 font-medium">
          Log in to your DigiOne account
        </p>
      </div>

      {/* Email / password form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Email</label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/25 focus:border-[#E83A2E] transition-all shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-[13px] font-semibold text-gray-700">Password</label>
            <Link href="/forgot-password" className="text-[12px] font-semibold text-[#E83A2E] hover:underline transition-all">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-11 rounded-xl border border-black/10 bg-white text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/25 focus:border-[#E83A2E] transition-all shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-[13px] text-red-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full py-3 px-4 bg-[#E83A2E] text-white font-bold text-[14px] rounded-xl hover:bg-[#cc2e23] transition-all shadow-[0_4px_14px_-2px_rgba(232,58,46,0.35)] hover:shadow-[0_8px_20px_-2px_rgba(232,58,46,0.42)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 mt-2"
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
        <div className="flex-1 h-px bg-black/8" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-black/8" />
      </div>

      {/* Google button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-black/10 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 hover:border-black/20 transition-all shadow-[0_1px_4px_rgba(0,0,0,0.05)] disabled:opacity-60"
      >
        <GoogleIcon />
        {googleLoading ? 'Redirecting...' : 'Continue with Google'}
      </button>

      <div className="mt-4 text-center">
        <p className="text-[12px] text-gray-500 mb-3">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#E83A2E] font-bold hover:underline">Sign up free →</Link>
        </p>
        <p className="text-[11px] text-gray-400">
          By continuing you agree to our{' '}
          <Link href="/terms" className="hover:underline hover:text-gray-600 transition-colors">Terms of Service</Link>
          {' & '}
          <Link href="/privacy" className="hover:underline hover:text-gray-600 transition-colors">Privacy Policy</Link>
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
