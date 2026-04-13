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

const INPUT = 'w-full px-5 py-3.5 bg-gray-50/50 dark:bg-zinc-900/50 border-2 border-gray-200 dark:border-zinc-800 rounded-2xl text-base font-medium focus:ring-0 focus:border-pink-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-colors';

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex flex-col gap-2 mb-8">
      <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
        <span>Step {step} of {total}</span>
        <span className="text-gray-900 dark:text-white">{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="flex items-center gap-1.5 h-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-full transition-all duration-500 ease-out ${
              i < step ? 'bg-pink-500 dark:bg-pink-500 scale-y-100' : 'bg-gray-200 dark:bg-zinc-800 scale-y-75'
            }`}
          />
        ))}
      </div>
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
    <div className="relative pt-6 pb-24 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[calc(100vh-120px)] flex flex-col justify-center">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden rounded-[40px]">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[40%] bg-pink-500/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute top-[20%] right-[20%] w-[20%] h-[30%] bg-rose-500/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        {/* Back / Type Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard/sites/new')}
            className="group inline-flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-gray-200/50 dark:border-zinc-800/80 shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            {step > 1 ? 'Go Back' : 'All Types'}
          </button>
          
          <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-pink-50 dark:bg-pink-500/10 border border-pink-100 dark:border-pink-500/20 rounded-xl shadow-sm">
            <Link2 className="w-4 h-4 text-pink-500 dark:text-pink-400" />
            <span className="text-sm font-bold text-pink-900 dark:text-pink-100 uppercase tracking-widest">Link in Bio</span>
          </div>
        </div>

        {/* Main Content Box */}
        <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border border-white/20 dark:border-zinc-800/50 rounded-[32px] p-8 md:p-10 shadow-2xl shadow-pink-500/5">
          <StepBar step={step} total={3} />

          {/* Step 1: Username */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="w-12 h-12 bg-pink-50 dark:bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-pink-100 dark:border-pink-500/20 shadow-inner">
                  <AtSign className="w-6 h-6 text-pink-500 dark:text-pink-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Claim your username</h2>
                <p className="text-base text-gray-500 dark:text-gray-400 max-w-sm mx-auto">This represents your global link — share it everywhere across your socials.</p>
              </div>

              <div className="space-y-5 bg-gray-50/50 dark:bg-zinc-900/30 p-6 rounded-[24px] border border-gray-100 dark:border-zinc-800/80">
                <div>
                  <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2 ml-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <div className={`flex items-center border-2 rounded-2xl overflow-hidden transition-colors ${
                      slugStatus === 'available' ? 'border-emerald-500/50 dark:border-emerald-500/50 ring-4 ring-emerald-500/10' :
                      slugStatus === 'taken' || slugStatus === 'invalid' ? 'border-red-500/50 dark:border-red-500/50 ring-4 ring-red-500/10' :
                      'border-gray-200 dark:border-zinc-800 focus-within:border-pink-500 focus-within:ring-4 focus-within:ring-pink-500/10'
                    } bg-white dark:bg-zinc-950`}
                  >
                    <span className="pl-4 pr-3 py-3.5 text-sm font-bold text-gray-400 border-r border-gray-100 dark:border-zinc-800 shrink-0 bg-gray-50 dark:bg-zinc-900 font-mono">
                      digione.ai/link/
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="yourname"
                      className="flex-1 px-4 py-3.5 text-base font-bold tracking-wide bg-transparent outline-none text-gray-900 dark:text-white font-mono placeholder:font-sans placeholder:font-medium placeholder:text-sm"
                      autoFocus
                    />
                    <span className="pr-4 shrink-0 flex items-center justify-center">
                      {slugStatus === 'checking' && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
                      {slugStatus === 'available' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      {(slugStatus === 'taken' || slugStatus === 'invalid') && <XCircle className="w-5 h-5 text-red-500" />}
                    </span>
                  </div>
                  <div className="mt-2 ml-1 min-h-[20px]">
                    {slugStatus === 'available' && <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Incredible! It's yours.</p>}
                    {slugStatus === 'taken' && <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Already taken — try another</p>}
                    {slugStatus === 'invalid' && <p className="text-xs font-semibold text-red-500">Must be 3-50 chars, no special characters other than hyphens</p>}
                    {slugStatus === 'idle' && username && <p className="text-xs font-semibold text-gray-400">Waiting to check availability...</p>}
                  </div>
                </div>

                {/* Preview card */}
                {slugStatus === 'available' && (
                  <div className="p-5 bg-gradient-to-r from-pink-500/10 via-pink-500/5 to-transparent border border-pink-200 dark:border-pink-800/40 rounded-[20px] animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2 text-sm font-bold text-pink-600 dark:text-pink-400">
                      <Globe className="w-4 h-4 shrink-0" />
                      <span className="font-mono truncate tracking-wide">digione.ai/link/<span className="text-pink-600">{username}</span></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Bio details */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="w-12 h-12 bg-pink-50 dark:bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-pink-100 dark:border-pink-500/20 shadow-inner">
                  <User className="w-6 h-6 text-pink-500 dark:text-pink-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Set up your profile</h2>
                <p className="text-base text-gray-500 dark:text-gray-400 max-w-sm mx-auto">This is what visitors see when they open your link.</p>
              </div>

              <div className="space-y-5 bg-gray-50/50 dark:bg-zinc-900/30 p-6 rounded-[24px] border border-gray-100 dark:border-zinc-800/80">
                <div>
                  <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2 ml-1">
                    Display Name <span className="text-red-500">*</span>
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
                  <div className="flex items-center justify-between mb-2 ml-1">
                    <label className="text-sm font-bold text-gray-900 dark:text-white">
                      Bio <span className="text-gray-400 font-medium">Optional</span>
                    </label>
                    <span className={`text-xs font-bold tabular-nums ${bio.length > 200 ? 'text-red-500' : 'text-gray-400'}`}>
                      {bio.length}/200
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Creator, developer, designer..."
                    className={`${INPUT} resize-none leading-relaxed`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-500/30">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Ready to go live?</h2>
                <p className="text-base text-gray-500 dark:text-gray-400 max-w-sm mx-auto">Review your Link in Bio profile setup.</p>
              </div>

              <div className="rounded-[24px] border-2 border-pink-100 dark:border-pink-500/20 p-6 bg-pink-50/50 dark:bg-pink-500/5 relative overflow-hidden">
                <div className="absolute top-[-30%] right-[-5%] w-48 h-48 bg-pink-500/10 blur-3xl rounded-full" />
                
                <div className="flex items-start gap-4 mb-5 relative z-10">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm shrink-0">
                    <User className="w-7 h-7 text-pink-500 dark:text-pink-400" />
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white line-clamp-1">{displayName}</h3>
                    <p className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-widest mt-1">Link In Bio</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-xl px-4 py-3 border border-white/50 dark:border-white/5 shadow-sm relative z-10 w-fit">
                  <AtSign className="w-4 h-4 text-pink-500 shrink-0" />
                  <span className="font-mono truncate tracking-wide">digione.ai/link/<span className="text-pink-600">{username}</span></span>
                </div>
                
                {bio && <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed border-t border-pink-100 dark:border-zinc-800/80 pt-4 relative z-10 max-w-lg">{bio}</p>}
              </div>

            </div>
          )}

          {error && (
            <div className="mt-6 flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20 px-5 py-4 rounded-xl">
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100 dark:border-zinc-800/80">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center justify-center w-12 h-12 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 hover:text-pink-600 text-gray-500 rounded-full transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : <span />}

            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="group flex items-center gap-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-2xl font-bold text-base shadow-lg shadow-pink-500/20 transition-all active:scale-[0.98]">
                Proceed to Review <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="group flex items-center justify-center gap-2 w-full sm:w-auto bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 disabled:opacity-60 text-white px-10 py-3.5 rounded-2xl font-extrabold text-base shadow-xl shadow-pink-500/20 transition-all active:scale-[0.98]">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Igniting...</> : <><Zap className="w-5 h-5" /> Launch Bio</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
