"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, Store, ShoppingBag, MailCheck } from 'lucide-react';

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

function getPasswordStrengthScore(p: string) {
  let score = 0;
  if (p.length > 5) score++;
  if (p.length > 8) score++;
  if (/\d/.test(p)) score++;
  if (/[A-Z]/.test(p) && /[^a-zA-Z0-9]/.test(p)) score++;
  return score || 1;
}

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [role, setRole] = useState<'creator' | 'user'>('creator');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const getStr = () => {
    if (password.length === 0) return { label: '', color: 'bg-gray-200' };
    if (password.length < 6) return { label: 'Weak', color: 'bg-red-400' };
    if (password.length < 10 && !/\d/.test(password)) return { label: 'Fair', color: 'bg-amber-400' };
    return { label: 'Strong', color: 'bg-emerald-500' };
  };
  const str = getStr();

  const handleGoogleSignup = async () => {
    setGoogleLoading(true); setError(null);
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback`, queryParams: { access_type: 'offline', prompt: 'consent' } },
    });
    if (e) { setError(e.message); setGoogleLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    if (fullName.length < 2) { setError('Full name must be at least 2 characters'); setLoading(false); return; }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role } },
    });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }

    if (referralCode && data.user) {
      const { data: refData } = await supabase.from('referral_codes').select('id, owner_creator_id').eq('code', referralCode).eq('is_active', true).single();
      if (refData) await supabase.from('user_referrals').insert({ referred_user_id: data.user.id, referrer_creator_id: refData.owner_creator_id, referral_code_id: refData.id });
    }

    if (data.session && data.user) {
      try {
        const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', data.user.id).maybeSingle();
        if (profile?.id) await supabase.from('notifications').insert({ recipient_creator_id: profile.id, title: '👋 Welcome to DigiOne!', message: "You're all set! Start by creating your first product.", type: 'welcome', action_url: '/dashboard/products' } as any);
      } catch { /* non-critical */ }
      router.push('/dashboard');
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  /* Success screen */
  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
          <MailCheck className="w-6 h-6 text-emerald-500" />
        </div>
        <h2 className="text-[22px] font-black tracking-[-0.02em] text-gray-900 mb-2">Check your inbox</h2>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-6 max-w-[280px] mx-auto">
          Verification link sent to <strong className="text-gray-700">{email}</strong>.
        </p>
        <Link href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E83A2E] text-white font-bold text-[13px] hover:bg-[#cc2e23] transition-all">
          Back to login <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  /* Input class — compact py-2 instead of py-3 */
  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/25 focus:border-[#E83A2E] transition-all";

  return (
    <>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-[22px] font-black tracking-[-0.02em] text-gray-900 leading-tight">Create your account</h2>
        <p className="text-[12.5px] text-gray-500 font-medium mt-0.5">Free forever plan · No credit card needed</p>
      </div>

      {/* Role toggle */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {([['creator', 'Creator', Store, 'Sell / Buy products'], ['user', 'Buyer', ShoppingBag, 'Buy products']] as const).map(([val, label, Icon, sub]) => (
          <button
            key={val}
            type="button"
            onClick={() => setRole(val)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
              role === val ? 'border-[#E83A2E] bg-[#E83A2E]/[0.04] text-[#E83A2E]' : 'border-black/8 bg-white text-gray-500 hover:border-black/15'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="leading-tight">
              <span className="block text-[11px] sm:text-[12px] font-bold">{label}</span>
              <span className="block text-[9px] sm:text-[10.5px] opacity-60">{sub}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSignup} className="space-y-2.5">
        {/* Name */}
        <div>
          <label className="block text-[11.5px] font-semibold text-gray-600 mb-1">Full name</label>
          <input type="text" required placeholder="Rahul Sharma" className={inputCls} value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>

        {/* Email */}
        <div>
          <label className="block text-[11.5px] font-semibold text-gray-600 mb-1">Email</label>
          <input type="email" required placeholder="you@example.com" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        {/* Password + Referral stacked */}
        <div>
          <label className="block text-[11.5px] font-semibold text-gray-600 mb-1">Password</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} required placeholder="Min. 6 chars" className={`${inputCls} pr-9`} value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex gap-px flex-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`h-0.5 rounded-full flex-1 transition-all ${i < getPasswordStrengthScore(password) ? str.color : 'bg-gray-100'}`} />
                ))}
              </div>
              <span className="text-[10px] font-bold text-gray-500 shrink-0">{str.label}</span>
            </div>
          )}
        </div>

        {/* Referral */}
        <div>
          <label className="block text-[11.5px] font-semibold text-gray-600 mb-1">Referral <span className="text-gray-400 font-normal">(opt.)</span></label>
          <input type="text" placeholder="FRIEND123" className={`${inputCls} uppercase tracking-widest`} value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} />
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-[12px] text-red-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />{error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full py-2.5 px-4 bg-[#E83A2E] text-white font-bold text-[13px] rounded-xl hover:bg-[#cc2e23] transition-all shadow-[0_4px_12px_-2px_rgba(232,58,46,0.35)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 mt-1"
        >
          {loading ? 'Creating…' : <><span>Create account</span><ArrowRight className="w-3.5 h-3.5" /></>}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 mt-3 mb-3">
        <div className="flex-1 h-px bg-black/8" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-black/8" />
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-black/10 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 hover:border-black/20 transition-all shadow-[0_1px_4px_rgba(0,0,0,0.05)] disabled:opacity-60"
      >
        <GoogleIcon />
        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <div className="mt-4 text-center">
        <p className="text-[12px] text-gray-500 mb-3">
          Already have an account?{' '}
          <Link href="/login" className="text-[#E83A2E] font-bold hover:underline">Log in →</Link>
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
