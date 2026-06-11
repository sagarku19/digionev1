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
        <div className="w-14 h-14 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" strokeWidth={2} />
        </div>
        <h2 className="text-[22px] font-bold text-[#16130F] tracking-[-0.03em] mb-2">We&apos;ll be in touch!</h2>
        <p className="text-[14px] text-black/50 font-medium leading-relaxed mb-1">
          Thanks <strong className="text-[#16130F]">{name}</strong>.
        </p>
        <p className="text-[14px] text-black/50 font-medium leading-relaxed mb-7">
          We&apos;ll reach out to <strong className="text-[#16130F]">{email}</strong> soon.
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
        <p className="font-ledger text-[10px] font-medium tracking-[0.18em] text-black/35 uppercase mb-3">
          <span className="text-[#E83A2E]">{'>>'}</span>&nbsp;&nbsp;/invite
        </p>
        <h2 className="text-[26px] font-bold tracking-[-0.03em] text-[#16130F] mb-1.5">
          Request an invite
        </h2>
        <p className="text-[14px] text-black/50 font-medium">
          We&apos;re onboarding creators in batches. Grab your spot.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[13px] font-semibold text-[#16130F] mb-1.5">Full name</label>
          <input
            type="text"
            required
            placeholder="Priya Sharma"
            className="w-full px-4 py-3 rounded-lg border border-black/[0.1] bg-white text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[#16130F] mb-1.5">Email address</label>
          <input
            type="email"
            required
            placeholder="priya@gmail.com"
            className="w-full px-4 py-3 rounded-lg border border-black/[0.1] bg-white text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[#16130F] mb-1.5">What do you create?</label>
          <input
            type="text"
            required
            placeholder="Courses, templates, presets…"
            className="w-full px-4 py-3 rounded-lg border border-black/[0.1] bg-white text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all"
            value={creates}
            onChange={e => setCreates(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mt-2"
        >
          Request invite
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="mt-5 text-center">
        <p className="text-[12px] text-black/50">
          Already have an account?{' '}
          <Link href="/login" className="text-[#E83A2E] font-semibold hover:underline">Sign in →</Link>
        </p>
      </div>
    </>
  );
}
