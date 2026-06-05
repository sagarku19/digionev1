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

const INPUT = 'w-full px-5 py-3.5 bg-[var(--surface-muted)] border-2 border-[var(--border)] rounded-[var(--radius-md)] text-base font-medium focus:ring-0 focus:border-[var(--border-strong)] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex flex-col gap-2 mb-8">
      <div className="flex items-center justify-between text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest px-1">
        <span>Step {step} of {total}</span>
        <span className="text-[var(--text-primary)]">{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="flex items-center gap-1.5 h-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-full transition-all duration-500 ease-out ${
              i < step ? 'bg-[var(--brand)] scale-y-100' : 'bg-[var(--border)] scale-y-75'
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
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        {/* Back / Type Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard/sites/new')}
            className="group inline-flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors bg-[var(--surface)] px-4 py-2.5 rounded-xl border border-[var(--border)] shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            {step > 1 ? 'Go Back' : 'All Types'}
          </button>

          <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-xs)]">
            <Link2 className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Link in Bio</span>
          </div>
        </div>

        {/* Main Content Box */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[32px] p-8 md:p-10 shadow-[var(--shadow-sm)]">
          <StepBar step={step} total={3} />

          {/* Step 1: Username */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="w-12 h-12 bg-[var(--surface-muted)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--border)] shadow-inner">
                  <AtSign className="w-6 h-6 text-[var(--text-secondary)]" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Claim your username</h2>
                <p className="text-base text-[var(--text-secondary)] max-w-sm mx-auto">This represents your global link — share it everywhere across your socials.</p>
              </div>

              <div className="space-y-5 bg-[var(--surface-muted)] p-6 rounded-[24px] border border-[var(--border)]">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">
                    Username <span className="text-[var(--danger)]">*</span>
                  </label>
                  <div className={`flex items-center border-2 rounded-2xl overflow-hidden transition-colors ${
                      slugStatus === 'available' ? 'border-[var(--success)] ring-4 ring-[var(--success)]/10' :
                      slugStatus === 'taken' || slugStatus === 'invalid' ? 'border-[var(--danger)] ring-4 ring-[var(--danger)]/10' :
                      'border-[var(--border)] focus-within:border-[var(--border-strong)] focus-within:ring-4 focus-within:ring-[var(--border-strong)]/10'
                    } bg-[var(--surface)]`}
                  >
                    <span className="pl-4 pr-3 py-3.5 text-sm font-bold text-[var(--text-tertiary)] border-r border-[var(--border-subtle)] shrink-0 bg-[var(--surface-muted)] font-mono">
                      digione.ai/link/
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="yourname"
                      className="flex-1 px-4 py-3.5 text-base font-bold tracking-wide bg-transparent outline-none text-[var(--text-primary)] font-mono placeholder:font-sans placeholder:font-medium placeholder:text-sm focus-visible:outline-none"
                      autoFocus
                    />
                    <span className="pr-4 shrink-0 flex items-center justify-center">
                      {slugStatus === 'checking' && <Loader2 className="w-5 h-5 text-[var(--text-tertiary)] animate-spin" />}
                      {slugStatus === 'available' && <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />}
                      {(slugStatus === 'taken' || slugStatus === 'invalid') && <XCircle className="w-5 h-5 text-[var(--danger)]" />}
                    </span>
                  </div>
                  <div className="mt-2 ml-1 min-h-[20px]">
                    {slugStatus === 'available' && <p className="text-xs font-bold text-[var(--success)] flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Incredible! It&apos;s yours.</p>}
                    {slugStatus === 'taken' && <p className="text-xs font-bold text-[var(--danger)] flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Already taken — try another</p>}
                    {slugStatus === 'invalid' && <p className="text-xs font-semibold text-[var(--danger)]">Must be 3-50 chars, no special characters other than hyphens</p>}
                    {slugStatus === 'idle' && username && <p className="text-xs font-semibold text-[var(--text-tertiary)]">Waiting to check availability...</p>}
                  </div>
                </div>

                {/* Preview card */}
                {slugStatus === 'available' && (
                  <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-[20px] animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)]">
                      <Globe className="w-4 h-4 shrink-0" />
                      <span className="font-mono truncate tracking-wide">digione.ai/link/<span className="text-[var(--brand)]">{username}</span></span>
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
                <div className="w-12 h-12 bg-[var(--surface-muted)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--border)] shadow-inner">
                  <User className="w-6 h-6 text-[var(--text-secondary)]" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Set up your profile</h2>
                <p className="text-base text-[var(--text-secondary)] max-w-sm mx-auto">This is what visitors see when they open your link.</p>
              </div>

              <div className="space-y-5 bg-[var(--surface-muted)] p-6 rounded-[24px] border border-[var(--border)]">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">
                    Display Name <span className="text-[var(--danger)]">*</span>
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
                    <label className="text-sm font-bold text-[var(--text-primary)]">
                      Bio <span className="text-[var(--text-tertiary)] font-medium">Optional</span>
                    </label>
                    <span className={`text-xs font-bold tabular-nums ${bio.length > 200 ? 'text-[var(--danger)]' : 'text-[var(--text-tertiary)]'}`}>
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
                <div className="w-14 h-14 bg-[var(--brand)] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[var(--shadow-xs)]">
                  <Zap className="w-7 h-7 text-[var(--text-on-brand)]" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Ready to go live?</h2>
                <p className="text-base text-[var(--text-secondary)] max-w-sm mx-auto">Review your Link in Bio profile setup.</p>
              </div>

              <div className="rounded-[24px] border-2 border-[var(--border)] p-6 bg-[var(--surface-muted)] relative overflow-hidden">
                <div className="flex items-start gap-4 mb-5 relative z-10">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-xs)] shrink-0">
                    <User className="w-7 h-7 text-[var(--text-secondary)]" />
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-2xl font-extrabold text-[var(--text-primary)] line-clamp-1">{displayName}</h3>
                    <p className="text-xs font-bold text-[var(--brand)] uppercase tracking-widest mt-1">Link In Bio</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm font-bold text-[var(--text-secondary)] bg-[var(--surface)] rounded-xl px-4 py-3 border border-[var(--border)] shadow-[var(--shadow-xs)] relative z-10 w-fit">
                  <AtSign className="w-4 h-4 text-[var(--brand)] shrink-0" />
                  <span className="font-mono truncate tracking-wide">digione.ai/link/<span className="text-[var(--brand)]">{username}</span></span>
                </div>

                {bio && <p className="mt-4 text-sm font-medium text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)] pt-4 relative z-10 max-w-lg">{bio}</p>}
              </div>

            </div>
          )}

          {error && (
            <div className="mt-6 flex items-start gap-3 bg-[var(--danger-subtle)] border-2 border-[var(--danger-border)] px-5 py-4 rounded-xl">
              <XCircle className="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-[var(--danger)]">{error}</p>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-[var(--border-subtle)]">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center justify-center w-12 h-12 bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : <span />}

            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="group flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-on-brand)] px-8 py-3.5 rounded-2xl font-bold text-base shadow-[var(--shadow-xs)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                Proceed to Review <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="group flex items-center justify-center gap-2 w-full sm:w-auto bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-60 text-[var(--text-on-brand)] px-10 py-3.5 rounded-2xl font-extrabold text-base shadow-[var(--shadow-xs)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Igniting...</> : <><Zap className="w-5 h-5" /> Launch Bio</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
