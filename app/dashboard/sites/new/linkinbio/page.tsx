'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Link2, ChevronRight, ChevronLeft, Loader2,
  CheckCircle2, XCircle, Globe, Zap, User, AtSign, Check,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

const ACCENT = {
  bg: 'bg-[var(--brand)]',
  bgHover: 'hover:bg-[var(--brand-hover)]',
  text: 'text-[var(--brand)]',
  fill: 'var(--brand)',
};

function useSlugCheck(slug: string) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Debounced async slug validation — these status updates are the effect's
    // whole purpose (idle/invalid on input, then async available/taken).
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!slug) { setStatus('idle'); return; }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 3) {
      setStatus('invalid'); return;
    }
    setStatus('checking');
    /* eslint-enable react-hooks/set-state-in-effect */
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

const INPUT = 'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow';

const STEP_LABELS = ['Username', 'Profile', 'Review'];

function Breadcrumb({ step, steps }: { step: number; steps: string[] }) {
  return (
    <ol className="flex items-center gap-2 text-xs font-medium mb-4">
      {steps.map((label, i) => {
        const idx = i + 1;
        const isActive = idx === step;
        const isDone = idx < step;
        return (
          <React.Fragment key={label}>
            <li className={`inline-flex items-center gap-1.5 ${
              isActive ? ACCENT.text :
              isDone ? 'text-[var(--success)]' :
              'text-[var(--text-tertiary)]'
            }`}>
              {isDone
                ? <Check className="w-3.5 h-3.5" />
                : <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold ${
                    isActive ? `${ACCENT.bg} text-[var(--text-on-brand)]` : 'bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-tertiary)]'
                  }`}>{idx}</span>}
              <span className={isActive ? 'font-semibold' : ''}>{label}</span>
            </li>
            {idx < steps.length && (
              <li aria-hidden className="text-[var(--text-tertiary)]">→</li>
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

function getInitials(name: string): string {
  if (!name.trim()) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
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
      router.push(`/dashboard/sites/edit/linkinbio/${json.siteId}?setup=1`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = ['Claim your username', 'Set up your profile', 'Ready to go live?'];
  const stepDescs = [
    'This is your global link — share it everywhere.',
    'This is what visitors see when they open your link.',
    'Review your Link in Bio profile setup.',
  ];

  return (
    <div className="space-y-6 pt-6 pb-12">
      <div className="w-full max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard/sites/new')}
            className="group inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-3 py-2 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            {step > 1 ? 'Go Back' : 'All Types'}
          </button>

          <div className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-sm)]">
            <Link2 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span className="text-[11px] font-medium text-[var(--text-primary)] uppercase tracking-wide">Link in Bio</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Left column: form */}
          <div>
            <Breadcrumb step={step} steps={STEP_LABELS} />

            <Card>
              {step === 1 && (
                <div className="space-y-6">
                  <header className="mb-5">
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">{stepTitles[0]}</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">{stepDescs[0]}</p>
                  </header>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                        Username <span className="text-[var(--danger)]">*</span>
                      </label>
                      <div className={`flex items-center border rounded-[var(--radius-md)] overflow-hidden transition-colors ${
                          slugStatus === 'available' ? 'border-[var(--success)]' :
                          slugStatus === 'taken' || slugStatus === 'invalid' ? 'border-[var(--danger)]' :
                          'border-[var(--border)] focus-within:border-[var(--border-strong)] focus-within:shadow-[var(--focus-ring)]'
                        } bg-[var(--surface-muted)]`}
                      >
                        <span className="pl-3 pr-2 py-2 text-xs font-medium text-[var(--text-tertiary)] border-r border-[var(--border-subtle)] shrink-0 font-mono">
                          digione.ai/link/
                        </span>
                        <input
                          type="text"
                          value={username}
                          onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="yourname"
                          className="flex-1 px-3 py-2 text-sm font-mono bg-transparent outline-none text-[var(--text-primary)] placeholder:font-sans placeholder:text-[var(--text-tertiary)]"
                          autoFocus
                        />
                        <span className="pr-3 shrink-0 flex items-center justify-center">
                          {slugStatus === 'checking' && <Loader2 className="w-4 h-4 text-[var(--text-tertiary)] animate-spin" />}
                          {slugStatus === 'available' && <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />}
                          {(slugStatus === 'taken' || slugStatus === 'invalid') && <XCircle className="w-4 h-4 text-[var(--danger)]" />}
                        </span>
                      </div>
                      <div className="mt-1.5 min-h-[18px]">
                        {slugStatus === 'available' && <p className="text-xs font-medium text-[var(--success)] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Available</p>}
                        {slugStatus === 'taken' && <p className="text-xs font-medium text-[var(--danger)] flex items-center gap-1"><XCircle className="w-3 h-3" /> Already taken</p>}
                        {slugStatus === 'invalid' && <p className="text-xs text-[var(--danger)]">Must be 3–50 chars, hyphens only.</p>}
                        {slugStatus === 'idle' && username && <p className="text-xs text-[var(--text-tertiary)]">Checking availability…</p>}
                      </div>
                    </div>

                    {slugStatus === 'available' && (
                      <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)]">
                        <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                          <Globe className="w-4 h-4 shrink-0" />
                          <span className="font-mono">digione.ai/link/<span className="text-[var(--brand)]">{username}</span></span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <header className="mb-5">
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">{stepTitles[1]}</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">{stepDescs[1]}</p>
                  </header>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
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
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-medium text-[var(--text-primary)]">Bio</label>
                        <span className={`text-xs font-medium tabular-nums ${bio.length > 200 ? 'text-[var(--danger)]' : 'text-[var(--text-tertiary)]'}`}>
                          {bio.length}/200
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        placeholder="Creator, developer, designer…"
                        className={`${INPUT} resize-none leading-relaxed`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <header className="mb-5">
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">{stepTitles[2]}</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">{stepDescs[2]}</p>
                  </header>

                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 bg-[var(--surface-muted)]">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--surface)] border border-[var(--border-subtle)] shrink-0">
                        <User className="w-5 h-5 text-[var(--text-secondary)]" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)] line-clamp-1">{displayName}</h3>
                        <p className="text-[11px] font-medium text-[var(--brand)] uppercase tracking-wide mt-0.5">Link In Bio</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface)] rounded-[var(--radius-sm)] px-3 py-2 border border-[var(--border-subtle)] w-fit">
                      <AtSign className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
                      <span className="font-mono">digione.ai/link/<span className="text-[var(--text-primary)]">{username}</span></span>
                    </div>

                    {bio && <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)] pt-3 max-w-lg">{bio}</p>}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-2 bg-[var(--danger-bg)] border border-[var(--danger)]/20 px-3 py-2.5 rounded-[var(--radius-md)]">
                  <XCircle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border-subtle)]">
                {step > 1 ? (
                  <button
                    onClick={() => setStep(s => s - 1)}
                    className="flex items-center justify-center w-9 h-9 bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] rounded-full focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                ) : <span />}

                {step < 3 ? (
                  <button
                    onClick={() => setStep(s => s + 1)}
                    disabled={!canNext()}
                    className={`group flex items-center gap-2 ${ACCENT.bg} ${ACCENT.bgHover} disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-on-brand)] px-3 py-2 rounded-[var(--radius-sm)] font-semibold text-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors`}
                  >
                    Continue <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="group flex items-center justify-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-60 text-[var(--text-on-brand)] px-4 py-2 rounded-[var(--radius-sm)] font-semibold text-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Zap className="w-4 h-4" /> Launch Bio</>}
                  </button>
                )}
              </div>
            </Card>
          </div>

          {/* Right column: live preview */}
          <div>
            <Card padded="sm">
              <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-3">Preview</div>

              <div className="flex flex-col items-center gap-2">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[var(--brand)] text-[var(--text-on-brand)] font-semibold text-sm flex items-center justify-center shrink-0">
                  {getInitials(displayName)}
                </div>

                {/* Display name */}
                <p className="text-sm font-semibold text-[var(--text-primary)] text-center">
                  {displayName || 'Your Name'}
                </p>

                {/* Handle */}
                <p className="text-[11px] text-[var(--text-tertiary)] text-center font-mono">
                  @{username || 'username'}
                </p>

                {/* Bio */}
                {bio && (
                  <p className="text-[11px] text-[var(--text-secondary)] text-center line-clamp-2 max-w-[240px]">
                    {bio.slice(0, 60)}{bio.length > 60 ? '…' : ''}
                  </p>
                )}

                {/* Link rows */}
                <div className="flex flex-col gap-1.5 w-full mt-1">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="relative h-7 w-full rounded-[var(--radius-sm)] bg-[var(--surface-muted)] border border-[var(--border-subtle)] overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--brand)]" />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
