"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, ArrowRight, X, MailCheck, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useLoginMutation } from '@/hooks/auth/useAuthSession';
import { useBuyerAuth, type BuyerAuthView } from '@/stores/buyerAuth';
import { rememberBuyerEmail, getRememberedBuyerEmail } from '@/lib/shared/buyer-email';

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

const INPUT =
  'w-full px-4 py-3 rounded-lg border border-black/[0.1] bg-white text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all';
const LABEL = 'block text-[13px] font-semibold text-[#16130F] mb-1.5';
const PRIMARY_BTN =
  'w-full py-3 px-4 bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2';

const VIEW_META: Record<BuyerAuthView, { route: string; title: string; sub: string }> = {
  login: { route: '/user-login', title: 'Welcome back', sub: 'Log in to access your library' },
  signup: { route: '/user-signup', title: 'Create your account', sub: 'Save your purchases in one place' },
  forgot: { route: '/forgot-password', title: 'Reset password', sub: "We'll email you a reset link" },
  reset: { route: '/reset-password', title: 'Set new password', sub: 'Choose a strong new password' },
};

export default function BuyerAuthModal() {
  const { isOpen, view, redirectTo, setView, close } = useBuyerAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const cardRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const loginMutation = useLoginMutation();

  // Prefill email from the remembered buyer email when opening.
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSentTo(null);
      setEmail((prev) => prev || getRememberedBuyerEmail());
    }
  }, [isOpen]);

  // Focus the card, not an input — an autofocused input pops the mobile
  // keyboard before the buyer has even read the modal.
  useEffect(() => {
    if (isOpen) cardRef.current?.focus();
  }, [isOpen]);

  // Esc to close + body scroll-lock while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  const meta = VIEW_META[view];

  const switchView = (next: BuyerAuthView) => {
    setError(null);
    setSentTo(null);
    setView(next);
  };

  const afterAuth = async () => {
    rememberBuyerEmail(email);
    await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    // Claim any guest purchases made under this email (retryable + idempotent).
    try {
      await fetch('/api/account/claim-entitlements', { method: 'POST' });
    } catch { /* non-blocking */ }
    close();
    if (redirectTo) {
      window.location.href = redirectTo;
    } else {
      router.refresh();
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    loginMutation.mutate(
      { email: email.trim(), password },
      {
        onSuccess: async () => { await afterAuth(); setBusy(false); },
        onError: (err) => { setError(err.message || 'Login failed'); setBusy(false); },
      }
    );
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/buyer-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, fullName: fullName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create account');

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInErr) throw new Error(signInErr.message);

      await afterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetErr) { setError(resetErr.message); setBusy(false); return; }
    setSentTo(email.trim());
    setBusy(false);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    rememberBuyerEmail(email);
    const next = redirectTo ?? (typeof window !== 'undefined' ? window.location.pathname : '/account/library');
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (oauthErr) { setError(oauthErr.message); setGoogleLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#16130F]/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={meta.title}
        tabIndex={-1}
        className="relative w-full max-w-[420px] max-h-[92dvh] overflow-y-auto bg-white rounded-xl border border-black/[0.1] shadow-[0_24px_70px_-30px_rgba(22,19,15,0.4)] px-6 py-7 sm:px-7 animate-[buyerAuthIn_0.2s_cubic-bezier(0.16,1,0.3,1)_both] outline-none"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg border border-black/[0.08] text-black/45 hover:text-[#16130F] hover:bg-black/[0.03] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-6 pr-8">
          <h2 className="text-[24px] font-bold tracking-[-0.03em] text-[#16130F] mb-1">{meta.title}</h2>
          <p className="text-[13.5px] text-black/50 font-medium">{meta.sub}</p>
        </div>

        {/* Forgot — success state */}
        {view === 'forgot' && sentTo ? (
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
              <MailCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-[13.5px] text-black/55 font-medium mb-6">
              Reset link sent to <strong className="text-[#16130F]">{sentTo}</strong>.
            </p>
            <button onClick={() => switchView('login')} className="text-[13px] font-semibold text-[#E83A2E] hover:underline">
              Back to login
            </button>
          </div>
        ) : (
          <>
            {/* Forms */}
            {view === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <Field label="Email" id="ba-email">
                  <input id="ba-email" type="email" required placeholder="you@example.com" className={INPUT} value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="ba-password" className="block text-[13px] font-semibold text-[#16130F]">Password <span className="text-[#E83A2E]">*</span></label>
                    <button type="button" onClick={() => switchView('forgot')} className="text-[12px] font-semibold text-[#E83A2E] hover:underline">Forgot?</button>
                  </div>
                  <PasswordInput id="ba-password" value={password} onChange={setPassword} show={showPassword} toggle={() => setShowPassword((s) => !s)} />
                </div>
                {error && <ErrorNote message={error} />}
                <button type="submit" disabled={busy || googleLoading} className={PRIMARY_BTN}>
                  {busy ? 'Logging in…' : <>Log in <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            )}

            {view === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <Field label="Full name" id="ba-name">
                  <input id="ba-name" type="text" required placeholder="Rahul Sharma" className={INPUT} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </Field>
                <Field label="Email" id="ba-email-s">
                  <input id="ba-email-s" type="email" required placeholder="you@example.com" className={INPUT} value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label="Password" id="ba-password-s">
                  <PasswordInput id="ba-password-s" value={password} onChange={setPassword} show={showPassword} toggle={() => setShowPassword((s) => !s)} placeholder="Min. 6 characters" />
                </Field>
                {error && <ErrorNote message={error} />}
                <button type="submit" disabled={busy || googleLoading} className={PRIMARY_BTN}>
                  {busy ? 'Creating…' : <>Create account <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            )}

            {view === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <button type="button" onClick={() => switchView('login')} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-black/55 hover:text-[#16130F] transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to login
                </button>
                <Field label="Email address" id="ba-email-f">
                  <input id="ba-email-f" type="email" required placeholder="you@example.com" className={INPUT} value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                {error && <ErrorNote message={error} />}
                <button type="submit" disabled={busy} className={PRIMARY_BTN}>
                  {busy ? 'Sending…' : <>Send reset link <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            )}

            {view === 'reset' && (
              <p className="text-[13.5px] text-black/55 font-medium">
                Open the reset link from your email to set a new password.
              </p>
            )}

            {/* Google + view switch (login/signup only) */}
            {(view === 'login' || view === 'signup') && (
              <>
                <div className="flex items-center gap-3 mt-4 mb-4">
                  <div className="flex-1 h-px bg-black/[0.07]" />
                  <span className="font-ledger text-[10px] font-medium text-black/35 uppercase tracking-[0.18em]">or</span>
                  <div className="flex-1 h-px bg-black/[0.07]" />
                </div>
                <button type="button" onClick={handleGoogle} disabled={googleLoading || busy} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-black/[0.1] text-[13px] font-semibold text-[#16130F] hover:bg-black/[0.03] hover:border-black/[0.25] transition-colors duration-200 disabled:opacity-60">
                  <GoogleIcon />
                  {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                </button>

                <p className="mt-5 text-center text-[12.5px] text-black/50">
                  {view === 'login' ? (
                    <>New here? <button onClick={() => switchView('signup')} className="text-[#E83A2E] font-semibold hover:underline">Create an account →</button></>
                  ) : (
                    <>Already have an account? <button onClick={() => switchView('login')} className="text-[#E83A2E] font-semibold hover:underline">Log in →</button></>
                  )}
                </p>
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes buyerAuthIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ── small sub-components ── */

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>{label} <span className="text-[#E83A2E]">*</span></label>
      {children}
    </div>
  );
}

function PasswordInput({ id, value, onChange, show, toggle, placeholder = '••••••••' }: {
  id: string; value: string; onChange: (v: string) => void; show: boolean; toggle: () => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} required placeholder={placeholder} className={`${INPUT} pr-11`} value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={toggle} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/35 hover:text-[#16130F] transition-colors">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#E83A2E]/[0.06] border border-[#E83A2E]/15 text-[13px] text-[#E83A2E] font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E] shrink-0" />
      {message}
    </div>
  );
}
