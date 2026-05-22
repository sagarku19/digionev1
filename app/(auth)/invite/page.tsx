'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function InvitePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [creates, setCreates] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" strokeWidth={2} />
        </div>
        <h2 className="text-[22px] font-black text-gray-900 tracking-tight mb-2">We'll be in touch!</h2>
        <p className="text-[14px] text-gray-500 font-medium leading-relaxed mb-1">
          Thanks <strong className="text-gray-700">{name}</strong>.
        </p>
        <p className="text-[14px] text-gray-500 font-medium leading-relaxed mb-7">
          We'll reach out to <strong className="text-gray-700">{email}</strong> soon.
        </p>
        <Link
          href="/"
          className="text-[13px] font-semibold text-[#E83A2E] hover:underline"
        >
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-[28px] font-black tracking-[-0.02em] text-gray-900 mb-1.5">
          Request an invite
        </h2>
        <p className="text-[14px] text-gray-500 font-medium">
          We're onboarding creators in batches. Grab your spot.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Full name</label>
          <input
            type="text"
            required
            placeholder="Priya Sharma"
            className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/25 focus:border-[#E83A2E] transition-all shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Email address</label>
          <input
            type="email"
            required
            placeholder="priya@gmail.com"
            className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/25 focus:border-[#E83A2E] transition-all shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">What do you create?</label>
          <input
            type="text"
            required
            placeholder="Courses, templates, presets…"
            className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/25 focus:border-[#E83A2E] transition-all shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
            value={creates}
            onChange={e => setCreates(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 bg-[#E83A2E] text-white font-bold text-[14px] rounded-xl hover:bg-[#cc2e23] transition-all shadow-[0_4px_14px_-2px_rgba(232,58,46,0.35)] hover:shadow-[0_8px_20px_-2px_rgba(232,58,46,0.42)] hover:-translate-y-px active:translate-y-0 flex items-center justify-center gap-2 mt-2"
        >
          Request invite
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="mt-5 text-center">
        <p className="text-[12px] text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-[#E83A2E] font-bold hover:underline">Sign in →</Link>
        </p>
      </div>
    </>
  );
}
