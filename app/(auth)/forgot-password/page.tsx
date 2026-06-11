"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowRight, MailCheck, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-6">
          <MailCheck className="w-7 h-7 text-emerald-600" />
        </div>
        <h2 className="text-[24px] font-bold tracking-[-0.03em] text-[#16130F] mb-3">Check your inbox</h2>
        <p className="text-[14px] text-black/50 font-medium leading-relaxed mb-8 max-w-[320px] mx-auto">
          We sent a password reset link to <strong className="text-[#16130F]">{email}</strong>. The link expires in 1 hour.
        </p>
        <div className="flex flex-col gap-3 max-w-[240px] mx-auto">
          <button
            onClick={handleReset}
            className="py-3 px-4 rounded-lg border border-black/[0.1] bg-white text-[14px] font-semibold text-[#16130F] hover:bg-black/[0.03] hover:border-black/[0.25] transition-colors duration-200"
          >
            Resend email
          </button>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] transition-colors duration-200"
          >
            Back to login <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-black/55 hover:text-[#16130F] mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to login
        </Link>
        <p className="font-ledger text-[10px] font-medium tracking-[0.18em] text-black/35 uppercase mb-3">
          <span className="text-[#E83A2E]">{'>>'}</span>&nbsp;&nbsp;/forgot-password
        </p>
        <h2 className="text-[26px] font-bold tracking-[-0.03em] text-[#16130F] mb-1.5">
          Reset password
        </h2>
        <p className="text-[14px] text-black/50 font-medium">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="block text-[13px] font-semibold text-[#16130F] mb-1.5">Email address</label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-lg border border-black/[0.1] bg-white text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#E83A2E]/[0.06] border border-[#E83A2E]/15 text-[13px] text-[#E83A2E] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E] shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
        >
          {loading ? 'Sending…' : (
            <>
              Send reset link
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-[13px] text-black/50">
        Remember it?{' '}
        <Link href="/login" className="text-[#E83A2E] font-semibold hover:underline">
          Log in →
        </Link>
      </p>
    </>
  );
}
