'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store, Check, ChevronRight, ChevronLeft, Loader2,
  CheckCircle2, XCircle, Globe, Zap,
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
    if (!slug) { setStatus('idle'); return; }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 3) {
      setStatus('invalid'); return;
    }
    setStatus('checking');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sites/check-slug?slug=${encodeURIComponent(slug)}&type=main`);
        const json = await res.json();
        setStatus(json.available ? 'available' : 'taken');
      } catch { setStatus('idle'); }
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [slug]);

  return status;
}

const TEMPLATES = [
  { id: 'minimal', name: 'Minimal',   desc: 'Clean & distraction-free',  accent: 'var(--text-primary)', blocks: ['h-3 w-16', 'h-2 w-24', 'h-6 w-full', 'h-4 w-20'] },
  { id: 'bold',    name: 'Bold',      desc: 'Big headlines, high impact', accent: 'var(--brand)',       blocks: ['h-5 w-20', 'h-2 w-28', 'h-8 w-full', 'h-4 w-16'] },
  { id: 'grid',    name: 'Grid Shop', desc: 'Product-first layout',       accent: 'var(--info)',         blocks: ['h-3 w-12', 'h-16 w-full', 'h-3 w-20', 'h-3 w-20'] },
  { id: 'blank',   name: 'Blank',     desc: 'Start from scratch',         accent: 'var(--text-tertiary)',blocks: ['h-3 w-16', 'h-3 w-20', 'h-3 w-28', 'h-3 w-12'] },
];

const INPUT = 'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow';

const STEP_LABELS = ['Template', 'Details', 'Review'];

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

export default function CreateMainStorePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugStatus = useSlugCheck(slug);

  const autoSlug = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!slug || slug === autoSlug(title)) setSlug(autoSlug(v));
  };

  const canNext = () => {
    if (step === 1) return template !== null;
    if (step === 2) return title.trim().length > 0 && slugStatus === 'available';
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/sites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_type: 'main', slug, title, description }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create store');
      router.push(`/dashboard/sites/edit/main/${json.siteId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = ['Pick a starting template', 'Name your store', 'Ready to launch?'];
  const stepDescs = [
    "Don't overthink it — you can swap themes and customize everything later.",
    'This represents your main storefront. You can modify these later.',
    'Confirm your details and create the store.',
  ];

  return (
    <div className="space-y-6 pb-12">
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
            <Store className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span className="text-[11px] font-medium text-[var(--text-primary)] uppercase tracking-wide">Main Store</span>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TEMPLATES.map(t => {
                      const selected = template === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setTemplate(t.id)}
                          className={`group relative border rounded-[var(--radius-lg)] overflow-hidden transition-all text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                            selected
                              ? 'border-[var(--brand)] bg-[var(--surface)]'
                              : 'border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--surface-muted)]'
                          }`}
                        >
                          <div className="h-24 p-3 flex flex-col gap-1.5 relative">
                            {selected && (
                              <span className="absolute top-2 right-2 w-5 h-5 bg-[var(--brand)] rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-[var(--text-on-brand)]" />
                              </span>
                            )}
                            <div className="flex items-center gap-1 mb-1">
                              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: t.accent }} />
                              <div className="h-1.5 rounded-full w-10 bg-[var(--border)]" />
                            </div>
                            {t.blocks.map((cls, i) => (
                              <div
                                key={i}
                                className={`rounded-full ${cls} ${selected ? 'opacity-100' : 'opacity-60'}`}
                                style={{ backgroundColor: i === 2 ? t.accent : 'var(--border)' }}
                              />
                            ))}
                          </div>
                          <div className="p-3 border-t border-[var(--border-subtle)]">
                            <p className={`font-semibold text-sm ${selected ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>{t.name}</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.desc}</p>
                          </div>
                        </button>
                      );
                    })}
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
                        Store name <span className="text-[var(--danger)]">*</span>
                      </label>
                      <input
                        type="text"
                        autoFocus
                        value={title}
                        onChange={e => handleTitleChange(e.target.value)}
                        placeholder="e.g. Arjun's Creative Store"
                        className={INPUT}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                        Your URL <span className="text-[var(--danger)]">*</span>
                      </label>
                      <div className={`flex items-center border rounded-[var(--radius-md)] overflow-hidden transition-colors ${
                          slugStatus === 'available' ? 'border-[var(--success)]' :
                          slugStatus === 'taken' || slugStatus === 'invalid' ? 'border-[var(--danger)]' :
                          'border-[var(--border)] focus-within:border-[var(--border-strong)] focus-within:shadow-[var(--focus-ring)]'
                        } bg-[var(--surface-muted)]`}
                      >
                        <span className="pl-3 pr-2 py-2 text-xs font-medium text-[var(--text-tertiary)] border-r border-[var(--border-subtle)] shrink-0 font-mono">
                          digione.ai/store/
                        </span>
                        <input
                          type="text"
                          value={slug}
                          onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="your-slug"
                          className="flex-1 px-3 py-2 text-sm font-mono bg-transparent outline-none text-[var(--text-primary)] placeholder:font-sans placeholder:text-[var(--text-tertiary)]"
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
                        {slugStatus === 'idle' && slug && <p className="text-xs text-[var(--text-tertiary)]">Checking availability…</p>}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1.5">
                        <label className="text-sm font-medium text-[var(--text-primary)]">Description</label>
                        <span className="text-xs text-[var(--text-tertiary)]">Optional</span>
                      </div>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="A short summary of what you're selling…"
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
                      <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center bg-[var(--surface)] border border-[var(--border-subtle)] shrink-0">
                        <Store className="w-5 h-5 text-[var(--text-secondary)]" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)] line-clamp-2">{title}</h3>
                        <p className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide mt-0.5">Main Store</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface)] rounded-[var(--radius-sm)] px-3 py-2 border border-[var(--border-subtle)] w-fit">
                      <Globe className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                      <span className="font-mono">digione.ai/store/<span className="text-[var(--text-primary)]">{slug}</span></span>
                    </div>

                    {description && <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)] pt-3">{description}</p>}
                  </div>

                  <div className="flex bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden p-4 gap-4">
                    <div className="flex-[0.5] border-r border-[var(--border-subtle)] pr-4">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-0.5">Theme</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{TEMPLATES.find(t => t.id === template)?.name ?? '—'}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-0.5">Type</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Full Creator Platform</p>
                    </div>
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
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Zap className="w-4 h-4" /> Launch Store</>}
                  </button>
                )}
              </div>
            </Card>
          </div>

          {/* Right column: live preview */}
          <div>
            <Card padded="sm">
              <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-3">Preview</div>

              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 mb-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-[var(--border)]" />
                  <div className="w-2 h-2 rounded-full bg-[var(--border)]" />
                  <div className="w-2 h-2 rounded-full bg-[var(--border)]" />
                </div>
                <span className="text-[11px] font-mono text-[var(--text-tertiary)] truncate">
                  digione.ai/store/{slug || '…'}
                </span>
              </div>

              {/* Store name */}
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate mb-3">
                {title || 'Your Store Title'}
              </p>

              {/* Product tiles */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[0, 1].map(i => (
                  <div
                    key={i}
                    className="aspect-square bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]"
                  />
                ))}
              </div>

              {/* Template tag */}
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Template: {TEMPLATES.find(t => t.id === template)?.name ?? '—'}
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
