"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

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
        <h2 className="text-2xl font-bold mb-4 font-display">✅ Check your inbox</h2>
        <p className="text-[var(--auth-text-2)] mb-8">
          We've sent a reset link to {email}.<br/>
          The link expires in 1 hour.
        </p>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <button 
            onClick={handleReset}
            className="py-2.5 px-4 bg-gray-100 text-gray-800 font-medium rounded-md hover:bg-gray-200 transition-colors"
          >
            Resend email
          </button>
          <Link href="/login" className="py-2.5 px-4 text-[var(--brand)] font-medium hover:underline">
            Back to login →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold mb-8 font-display">Reset your password</h2>
      
      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input 
            type="email" 
            required
            className="w-full px-4 py-2 border rounded-md border-[var(--color-border)] focus:outline-none focus:border-[var(--brand)]" 
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {error && <div className="text-red-500 text-sm py-2">{error}</div>}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[var(--brand)] text-white font-medium rounded-md hover:bg-[var(--brand-hover)] transition-colors disabled:opacity-50 mt-6"
        >
          {loading ? 'Sending link...' : 'Send reset link →'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-[var(--color-border)] text-center text-sm">
        <span className="text-[var(--auth-text-2)]">Remember it? </span>
        <Link href="/login" className="text-[var(--brand)] font-medium hover:underline">
          Log in →
        </Link>
      </div>
    </>
  );
}
