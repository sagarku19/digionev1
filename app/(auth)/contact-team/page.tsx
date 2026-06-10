"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { useAuthSession } from '@/hooks/useAuthSession';

const INPUT =
  'w-full px-4 py-3 rounded-xl border border-black/10 bg-white text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/25 focus:border-[#E83A2E] transition-all shadow-[0_1px_4px_rgba(0,0,0,0.04)]';
const LABEL = 'block text-[13px] font-semibold text-gray-700 mb-1.5';

const TOPICS = ['Question', 'Feedback', 'Billing', 'Partnership', 'Something else'];

export default function ContactTeamPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading, userEmail, profile } = useAuthSession();

  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const name = nameOverride ?? profile?.full_name ?? '';

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace('/login?returnUrl=/contact-team');
    }
  }, [isLoading, isLoggedIn, router]);

  // TODO: wire to a support/contact API route when one exists
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSent(true);
  };

  if (isLoading || !isLoggedIn) {
    return (
      <div className="space-y-4 animate-pulse" aria-hidden="true">
        <div className="h-7 w-2/3 rounded-lg bg-gray-100" />
        <div className="h-4 w-1/2 rounded-lg bg-gray-100" />
        <div className="h-11 w-full rounded-xl bg-gray-100" />
        <div className="h-11 w-full rounded-xl bg-gray-100" />
        <div className="h-24 w-full rounded-xl bg-gray-100" />
        <div className="h-11 w-full rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" strokeWidth={2.2} />
        </div>
        <h2 className="text-[24px] font-black tracking-[-0.02em] text-gray-900 mb-1.5">
          Message sent
        </h2>
        <p className="text-[14px] text-gray-500 font-medium mb-7 max-w-[280px]">
          We&apos;ll get back to you at{' '}
          <span className="font-semibold text-gray-700">{userEmail}</span>.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#E83A2E] text-white font-bold text-[14px] rounded-xl hover:bg-[#cc2e23] transition-all shadow-[0_4px_14px_-2px_rgba(232,58,46,0.35)] hover:shadow-[0_8px_20px_-2px_rgba(232,58,46,0.42)] hover:-translate-y-px active:translate-y-0"
        >
          Back to home
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-7">
        <h2 className="text-[28px] font-black tracking-[-0.02em] text-gray-900 mb-1.5">
          Contact the team
        </h2>
        <p className="text-[14px] text-gray-500 font-medium">
          We usually reply within a day.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={LABEL}>Name</label>
          <input
            type="text"
            placeholder="Your name"
            className={INPUT}
            value={name}
            onChange={(e) => setNameOverride(e.target.value)}
          />
        </div>

        <div>
          <label className={LABEL}>Email</label>
          <div className="relative">
            <input
              type="email"
              readOnly
              className={`${INPUT} bg-gray-50 text-gray-500 pr-11 cursor-default focus:ring-0 focus:border-black/10`}
              value={userEmail ?? ''}
            />
            <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">
            Replies go to your account email.
          </p>
        </div>

        <div>
          <label className={LABEL}>Topic</label>
          <select
            className={`${INPUT} cursor-pointer`}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Message</label>
          <textarea
            required
            rows={5}
            placeholder="How can we help?"
            className={`${INPUT} resize-none`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 bg-[#E83A2E] text-white font-bold text-[14px] rounded-xl hover:bg-[#cc2e23] transition-all shadow-[0_4px_14px_-2px_rgba(232,58,46,0.35)] hover:shadow-[0_8px_20px_-2px_rgba(232,58,46,0.42)] hover:-translate-y-px active:translate-y-0 flex items-center justify-center gap-2 mt-2"
        >
          Send message
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </>
  );
}
