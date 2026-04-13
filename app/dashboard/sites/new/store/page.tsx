'use client';
// Dedicated creation flow: Main Store
// 3-step: Template → Details (name + slug) → Review & Launch

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store, Check, ChevronRight, ChevronLeft, Loader2,
  CheckCircle2, XCircle, Globe, Zap, Sparkles,
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
        const res = await fetch(`/api/sites/check-slug?slug=${encodeURIComponent(slug)}&type=main`);
        const json = await res.json();
        setStatus(json.available ? 'available' : 'taken');
      } catch { setStatus('idle'); }
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [slug]);

  return status;
}

// ─── Templates ───────────────────────────────────────────────
const TEMPLATES = [
  { id: 'minimal', name: 'Minimal',   desc: 'Clean & distraction-free',  accent: '#6366F1', blocks: ['h-3 w-16', 'h-2 w-24', 'h-6 w-full', 'h-4 w-20'] },
  { id: 'bold',    name: 'Bold',      desc: 'Big headlines, high impact', accent: '#8B5CF6', blocks: ['h-5 w-20', 'h-2 w-28', 'h-8 w-full', 'h-4 w-16'] },
  { id: 'grid',    name: 'Grid Shop', desc: 'Product-first layout',       accent: '#EC4899', blocks: ['h-3 w-12', 'h-16 w-full', 'h-3 w-20', 'h-3 w-20'] },
  { id: 'blank',   name: 'Blank',     desc: 'Start from scratch',         accent: '#9CA3AF', blocks: ['h-3 w-16', 'h-3 w-20', 'h-3 w-28', 'h-3 w-12'] },
];

const INPUT = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)]/40 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i < step ? 'bg-[var(--accent)]' : 'bg-gray-200 dark:bg-gray-800'
          }`}
        />
      ))}
    </div>
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
            <Store className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Main Store</span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <StepBar step={step} total={3} />

        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 md:p-8 shadow-sm">

          {/* Step 1: Template */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pick a template</h2>
                <p className="text-sm text-gray-500 mt-1">You can customise everything later in the builder.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TEMPLATES.map(t => {
                  const selected = template === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className={`border-2 rounded-2xl overflow-hidden transition-all duration-200 text-left ${
                        selected
                          ? 'border-[var(--accent)]  '
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="h-24 p-3 flex flex-col gap-1.5 relative" style={{ backgroundColor: `${t.accent}15` }}>
                        {selected && (
                          <span className="absolute top-2 right-2 w-5 h-5 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center shadow">
                            <Check className="w-3 h-3 text-white" />
                          </span>
                        )}
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: t.accent }} />
                          <div className="h-1.5 rounded-full w-10 bg-gray-300/60" />
                        </div>
                        {t.blocks.map((cls, i) => (
                          <div key={i} className={`rounded-full ${cls}`} style={{ backgroundColor: i === 2 ? `${t.accent}40` : '#d1d5db60' }} />
                        ))}
                      </div>
                      <div className="p-3 bg-white dark:bg-[#0D0D1A]">
                        <p className="font-bold text-xs text-gray-900 dark:text-white">{t.name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Name your store</h2>
                <p className="text-sm text-gray-500 mt-1">This is your main storefront. You can change these later.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Store name <span className="text-red-400">*</span>
                </label>
                <input type="text" value={title} onChange={e => handleTitleChange(e.target.value)}
                  placeholder="e.g. Arjun's Creative Store" className={INPUT} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Your URL <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 focus-within:ring-2 focus-within:ring-[var(--accent)]/40 transition">
                  <span className="px-3.5 py-2.5 text-sm text-gray-500 border-r border-gray-200 dark:border-gray-700 shrink-0 bg-gray-100 dark:bg-gray-800 font-mono">
                    digione.ai/store/
                  </span>
                  <input type="text" value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="your-slug" className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none text-gray-900 dark:text-white font-mono" />
                  <span className="px-3 shrink-0">
                    {slugStatus === 'checking' && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                    {slugStatus === 'available' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {(slugStatus === 'taken' || slugStatus === 'invalid') && <XCircle className="w-4 h-4 text-red-500" />}
                  </span>
                </div>
                {slugStatus === 'available' && <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Available</p>}
                {slugStatus === 'taken' && <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Already taken</p>}
                {slugStatus === 'invalid' && <p className="text-xs text-red-600 mt-1.5">3-50 chars, lowercase letters, numbers, hyphens</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description for search results..." className={`${INPUT} resize-none`} />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ready to launch?</h2>
                <p className="text-sm text-gray-500 mt-1">Review your store details below.</p>
              </div>

              <div className="rounded-2xl border-2 border-[var(--border)] dark:border-[var(--border)] p-5 bg-[var(--bg-tertiary)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Main Store</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-primary)] bg-white/60 dark:bg-white/5 rounded-xl px-3 py-2">
                  <Globe className="w-4 h-4 shrink-0" />
                  <span className="font-mono text-sm truncate">digione.ai/store/{slug}</span>
                </div>
                {description && <p className="mt-3 text-xs text-gray-500 leading-relaxed">{description}</p>}
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                {[
                  { label: 'Type',     value: 'Main Store' },
                  { label: 'Name',     value: title },
                  { label: 'URL',      value: `digione.ai/store/${slug}` },
                  { label: 'Template', value: TEMPLATES.find(t => t.id === template)?.name ?? '—' },
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
                className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white px-7 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Zap className="w-4 h-4" /> Launch Store</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
