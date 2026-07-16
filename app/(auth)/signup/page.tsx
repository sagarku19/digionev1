"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, MailCheck } from 'lucide-react';

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
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const role = 'creator';
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const getStr = () => {
    if (password.length === 0) return { label: '', color: 'bg-black/[0.08]' };
    if (password.length < 6) return { label: 'Weak', color: 'bg-[#E83A2E]' };
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
    const mobileDigits = mobile.replace(/\D/g, '');
    if (mobileDigits.length < 10) { setError('Enter a valid 10-digit mobile number'); setLoading(false); return; }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role, mobile: mobileDigits } },
    });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }

    if (referralCode && data.user) {
      const { data: refData } = await supabase.from('referral_codes').select('id, owner_creator_id').eq('code', referralCode).eq('is_active', true).single();
      if (refData) await supabase.from('user_referrals').insert({ referred_user_id: data.user.id, referrer_creator_id: refData.owner_creator_id, referral_code_id: refData.id });
    }

    if (data.session && data.user) {
      try {
        await supabase.from('profiles').update({ mobile: mobileDigits }).eq('user_id', data.user.id);
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
        <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
          <MailCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-[22px] font-bold tracking-[-0.03em] text-[#16130F] mb-2">Check your inbox</h2>
        <p className="text-[13px] text-black/50 font-medium leading-relaxed mb-6 max-w-[280px] mx-auto">
          Verification link sent to <strong className="text-[#16130F]">{email}</strong>.
        </p>
        <Link href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[13px] transition-colors duration-200">
          Back to login <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  /* Input class — compact py-2 instead of py-3 */
  const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-black/[0.1] bg-white text-[13px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all";

  return (
    <>
      {/* Header */}
      <div className="mb-4">
        <p className="font-ledger text-[10px] font-medium tracking-[0.18em] text-black/35 uppercase mb-2.5">
          <span className="text-[#E83A2E]">{'>>'}</span>&nbsp;&nbsp;/signup
        </p>
        <h2 className="text-[22px] font-bold tracking-[-0.03em] text-[#16130F] leading-tight">Create your account</h2>
        <p className="text-[12.5px] text-black/50 font-medium mt-0.5">Free forever plan · No credit card needed</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSignup} className="space-y-2.5">
        {/* Name */}
        <div>
          <label className="block text-[11.5px] font-semibold text-[#16130F] mb-1">Full name <span className="text-[#E83A2E]">*</span></label>
          <input type="text" required placeholder="Rahul Sharma" className={inputCls} value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>

        {/* Mobile */}
        <div>
          <label className="block text-[11.5px] font-semibold text-[#16130F] mb-1">Mobile number <span className="text-[#E83A2E]">*</span></label>
          <input type="tel" required inputMode="numeric" placeholder="9876543210" className={inputCls} value={mobile} onChange={e => setMobile(e.target.value)} />
        </div>

        {/* Email */}
        <div>
          <label className="block text-[11.5px] font-semibold text-[#16130F] mb-1">Email <span className="text-[#E83A2E]">*</span></label>
          <input type="email" required placeholder="you@example.com" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        {/* Password + Referral stacked */}
        <div>
          <label className="block text-[11.5px] font-semibold text-[#16130F] mb-1">Password <span className="text-[#E83A2E]">*</span></label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} required placeholder="Min. 6 chars" className={`${inputCls} pr-9`} value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-black/35 hover:text-[#16130F] transition-colors" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex gap-px flex-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`h-0.5 rounded-full flex-1 transition-all ${i < getPasswordStrengthScore(password) ? str.color : 'bg-black/[0.06]'}`} />
                ))}
              </div>
              <span className="font-ledger text-[10px] font-medium text-black/45 shrink-0">{str.label}</span>
            </div>
          )}
        </div>

        {/* Referral — commented out; referral code will be attached to the signup link, not entered manually */}
        {/* <div>
          <label className="block text-[11.5px] font-semibold text-[#16130F] mb-1">Referral <span className="text-black/35 font-normal">(opt.)</span></label>
          <input type="text" placeholder="FRIEND123" className={`${inputCls} uppercase tracking-widest`} value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} />
        </div> */}

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#E83A2E]/[0.06] border border-[#E83A2E]/15 text-[12px] text-[#E83A2E] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E] shrink-0" />{error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full py-2.5 px-4 bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[13px] rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
        >
          {loading ? 'Creating…' : <><span>Create account</span><ArrowRight className="w-3.5 h-3.5" /></>}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 mt-3 mb-3">
        <div className="flex-1 h-px bg-black/[0.07]" />
        <span className="font-ledger text-[10px] font-medium text-black/35 uppercase tracking-[0.18em]">or</span>
        <div className="flex-1 h-px bg-black/[0.07]" />
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-black/[0.1] text-[13px] font-semibold text-[#16130F] hover:bg-black/[0.03] hover:border-black/[0.25] transition-colors duration-200 disabled:opacity-60"
      >
        <GoogleIcon />
        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <div className="mt-4 text-center">
        <p className="text-[12px] text-black/50 mb-3">
          Already have an account?{' '}
          <Link href="/login" className="text-[#E83A2E] font-semibold hover:underline">Log in →</Link>
        </p>
        <p className="font-ledger text-[11px] text-black/35 mb-3">
          Just want to buy?{' '}
          <Link href="/user-login" className="text-[#16130F] font-semibold hover:underline transition-colors">Buyer login</Link>
        </p>
        <p className="font-ledger text-[9px] text-black/35">
          By continuing you agree to our{' '}
          <Link href="/terms" className="hover:underline hover:text-[#16130F] transition-colors">Terms of Service</Link>
          {' & '}
          <Link href="/privacy" className="hover:underline hover:text-[#16130F] transition-colors">Privacy Policy</Link>
        </p>
      </div>
    </>
  );
}
