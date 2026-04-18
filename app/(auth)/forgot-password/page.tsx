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
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-6">
          <MailCheck className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-[26px] font-black tracking-[-0.02em] text-gray-900 mb-3">Check your inbox</h2>
        <p className="text-[14px] text-gray-500 leading-relaxed mb-8 max-w-[320px] mx-auto">
          We sent a password reset link to <strong className="text-gray-700">{email}</strong>. The link expires in 1 hour.
        </p>
        <div className="flex flex-col gap-3 max-w-[240px] mx-auto">
          <button
            onClick={handleReset}
            className="py-3 px-4 rounded-xl border border-black/10 bg-white text-[14px] font-semibold text-gray-700 hover:bg-gray-50 hover:border-black/20 transition-all shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
          >
            Resend email
          </button>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#E83A2E] text-white font-bold text-[14px] shadow-[0_4px_14px_-2px_rgba(232,58,46,0.35)] hover:bg-[#cc2e23] transition-all"
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
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to login
        </Link>
        <h2 className="text-[28px] font-black tracking-[-0.02em] text-gray-900 mb-1.5">
          Reset password
        </h2>
        <p className="text-[14px] text-gray-500 font-medium">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Email address</label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/25 focus:border-[#E83A2E] transition-all shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-[13px] text-red-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-[#E83A2E] text-white font-bold text-[14px] rounded-xl hover:bg-[#cc2e23] transition-all shadow-[0_4px_14px_-2px_rgba(232,58,46,0.35)] hover:shadow-[0_8px_20px_-2px_rgba(232,58,46,0.42)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 mt-2"
        >
          {loading ? 'Sending…' : (
            <>
              Send reset link
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-[13px] text-gray-500">
        Remember it?{' '}
        <Link href="/login" className="text-[#E83A2E] font-bold hover:underline">
          Log in →
        </Link>
      </p>
    </>
  );
}
