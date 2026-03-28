'use client';
// Creation wizard: Link in Bio
// 2-step: Pick username → Bio details → Review & Launch

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Link2, Check, ChevronRight, ChevronLeft, Loader2,
  CheckCircle2, XCircle, Globe, Zap, User, AtSign,
} from 'lucide-react';

// ─── Slug check ──────────────────────────────────────────────
function useSlugCheck(slug: string) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!slug) { setStatus('idle'); return; }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 3) {
      setStatus('invalid'); return;
    }
    setStatus('checking');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sites/check-slug?slug=${encodeURIComponent(slug)}&type=linkinbio`);
        const json = await res.json();
        setStatus(json.available ? 'available' : 'taken');
      } catch { setStatus('idle'); }
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [slug]);

  return status;
}

const INPUT = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)]/40 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i < step ? 'bg-pink-500' : 'bg-gray-200 dark:bg-gray-800'
          }`}
        />
      ))}
    </div>
  );
}

export default function CreateLinkInBioPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugStatus = useSlugCheck(username);

  const canNext = () => {
    if (step === 1) return username.length >= 3 && slugStatus === 'available';
    if (step === 2) return displayName.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/sites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_type: 'linkinbio',
          slug: username,
          title: displayName,
          description: bio,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create Link in Bio');
      router.push(`/dashboard/sites/edit/linkinbio/${json.siteId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#07070f]/80 backdrop-blur-sm border-b border-gray-100 dark:border-white/[0.05]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard/sites/new')}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
            {step > 1 ? 'Back' : 'All Types'}
          </button>
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-pink-500" />
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Link in Bio</span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <StepBar step={step} total={3} />

        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 md:p-8 shadow-sm">

          {/* Step 1: Username */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Claim your username</h2>
                <p className="text-sm text-gray-500 mt-1">This becomes your link — share it everywhere.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Username <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 focus-within:ring-2 focus-within:ring-pink-500 transition">
                  <span className="px-3.5 py-2.5 text-sm text-gray-500 border-r border-gray-200 dark:border-gray-700 shrink-0 bg-gray-100 dark:bg-gray-800 font-mono">
                    digione.ai/link/
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="yourname"
                    className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none text-gray-900 dark:text-white font-mono"
                    autoFocus
                  />
                  <span className="px-3 shrink-0">
                    {slugStatus === 'checking' && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                    {slugStatus === 'available' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {(slugStatus === 'taken' || slugStatus === 'invalid') && <XCircle className="w-4 h-4 text-red-500" />}
                  </span>
                </div>
                {slugStatus === 'available' && (
                  <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Available — it&apos;s yours!
                  </p>
                )}
                {slugStatus === 'taken' && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Already taken — try another
                  </p>
                )}
                {slugStatus === 'invalid' && (
                  <p className="text-xs text-red-600 mt-1.5">3-50 chars, lowercase letters, numbers, and hyphens only</p>
                )}
              </div>

              {/* Preview card */}
              {slugStatus === 'available' && (
                <div className="p-4 bg-gradient-to-r from-pink-500/10 via-pink-500/5 to-transparent border border-pink-200 dark:border-pink-800/40 rounded-xl">
                  <div className="flex items-center gap-2 text-sm text-pink-600 dark:text-pink-400">
                    <Globe className="w-4 h-4 shrink-0" />
                    <span className="font-mono truncate">digione.ai/link/{username}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Bio details */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Set up your profile</h2>
                <p className="text-sm text-gray-500 mt-1">This is what visitors see when they open your link.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Display Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Sagar Aryal"
                  className={INPUT}
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Bio <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <span className={`text-xs tabular-nums ${bio.length > 200 ? 'text-red-500' : 'text-gray-400'}`}>
                    {bio.length}/200
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Creator, developer, designer..."
                  className={`${INPUT} resize-none`}
                />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ready to go live?</h2>
                <p className="text-sm text-gray-500 mt-1">Review your Link in Bio details.</p>
              </div>

              <div className="rounded-2xl border-2 border-pink-200 dark:border-pink-800/50 p-5 bg-gradient-to-br from-pink-500/10 via-pink-500/5 to-transparent">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-pink-100 dark:bg-pink-500/20 text-pink-600">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{displayName}</p>
                    {bio && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{bio}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-pink-600 dark:text-pink-400 bg-white/60 dark:bg-white/5 rounded-xl px-3 py-2">
                  <AtSign className="w-4 h-4 shrink-0" />
                  <span className="font-mono text-sm truncate">digione.ai/link/{username}</span>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                {[
                  { label: 'Type',     value: 'Link in Bio' },
                  { label: 'Username', value: `@${username}` },
                  { label: 'Name',     value: displayName },
                  { label: 'URL',      value: `digione.ai/link/${username}` },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{row.label}</p>
                      <p className="text-sm text-gray-900 dark:text-white mt-0.5">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{error}</p>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : <span />}

            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-pink-500/20 transition-all">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-60 text-white px-7 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-pink-500/20 transition-all">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Zap className="w-4 h-4" /> Launch Bio</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
