'use client';
// EmailCapture section — collects email via guest_leads table through API.
// DB tables: guest_leads (write via /api/leads)

import React, { useState } from 'react';
import { Loader2, CheckCircle2, Mail } from 'lucide-react';

export default function EmailCapture({ settings, siteId }: { settings: any; siteId?: string }) {
  const title       = settings?.title       ?? 'Get exclusive updates';
  const subtitle    = settings?.subtitle    ?? 'Join the newsletter and never miss a new product or launch.';
  const placeholder = settings?.placeholder ?? 'Your email address';
  const buttonText  = settings?.button_text ?? 'Subscribe free';
  const successMsg  = settings?.success_message ?? 'You\'re in! Check your inbox.';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, siteId }),
      });
      if (!res.ok) throw new Error('Could not subscribe right now. Try again.');
      setDone(true);
      setEmail('');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 bg-[--creator-primary]">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-3">{title}</h2>
        <p className="text-white/70 mb-8">{subtitle}</p>

        {done ? (
          <div className="flex items-center justify-center gap-2 text-white font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            {successMsg}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-5 py-3 rounded-xl bg-white text-gray-900 placeholder-gray-400 text-sm outline-none focus:ring-2 focus:ring-white/50"
            />
            <button
              type="submit" disabled={loading}
              className="flex items-center gap-2 justify-center bg-white/15 border border-white/30 hover:bg-white/25 text-white font-semibold px-6 py-3 rounded-xl text-sm transition shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : buttonText}
            </button>
          </form>
        )}
        {err && <p className="text-red-200 text-sm mt-3">{err}</p>}
      </div>
    </section>
  );
}
