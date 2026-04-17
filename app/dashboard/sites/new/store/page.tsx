'use client';
// Dedicated creation flow: Main Store
// 3-step: Template → Details (name + slug) → Review & Launch

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store, Check, ChevronRight, ChevronLeft, Loader2,
  CheckCircle2, XCircle, Globe, Zap, LayoutTemplate
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

const INPUT = 'w-full px-5 py-3.5 bg-gray-50/50 dark:bg-zinc-900/50 border-2 border-gray-200 dark:border-zinc-800 rounded-2xl text-base font-medium focus:ring-0 focus:border-gray-900 dark:border-white outline-none text-[var(--text-primary)] placeholder-gray-400 transition-colors';

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex flex-col gap-2 mb-8">
      <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
        <span>Step {step} of {total}</span>
        <span className="text-[var(--text-primary)]">{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="flex items-center gap-1.5 h-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-full transition-all duration-500 ease-out ${
              i < step ? 'bg-indigo-600 dark:bg-gray-1000 scale-y-100' : 'bg-gray-200 dark:bg-zinc-800 scale-y-75'
            }`}
          />
        ))}
      </div>
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
    <div className="relative pt-6 pb-24 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[calc(100vh-120px)] flex flex-col justify-center">
      {/* Background Ambience tied to the container */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden rounded-[40px]">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[40%] bg-gray-1000/20 dark:bg-gray-1000/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute top-[20%] right-[20%] w-[20%] h-[30%] bg-purple-500/20 dark:bg-purple-500/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        {/* Back / Type Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard/sites/new')}
            className="group inline-flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-[var(--text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-gray-200/50 dark:border-zinc-800/80 shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            {step > 1 ? 'Go Back' : 'All Types'}
          </button>
          
          <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-[var(--bg-secondary)] border border-indigo-100 dark:border-gray-900 dark:border-white/20 rounded-xl shadow-sm">
            <Store className="w-4 h-4 text-gray-700 dark:text-[var(--text-secondary)]" />
            <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Main Store</span>
          </div>
        </div>

        {/* Main Content Box */}
        <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border border-white/20 dark:border-zinc-800/50 rounded-[32px] p-8 md:p-10 shadow-2xl shadow-indigo-500/5">
          <StepBar step={step} total={3} />

          {/* Step 1: Template */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-gray-900 dark:border-white/20 shadow-inner">
                  <LayoutTemplate className="w-6 h-6 text-gray-700 dark:text-[var(--text-secondary)]" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Pick a starting template</h2>
                <p className="text-base text-[var(--text-secondary)] max-w-sm mx-auto">Don't overthink it, you can effortlessly swap themes and customize everything later.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TEMPLATES.map(t => {
                  const selected = template === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className={`group relative border-2 rounded-[24px] overflow-hidden transition-all duration-300 text-left ${
                        selected
                          ? 'border-gray-900 dark:border-white shadow-lg shadow-indigo-500/10 scale-[1.02] bg-white dark:bg-zinc-950'
                          : 'border-gray-200/80 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 bg-white/50 dark:bg-zinc-900/50'
                      }`}
                    >
                      <div className="h-32 p-4 flex flex-col gap-2 relative transition-colors" style={{ backgroundColor: `${t.accent}10` }}>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 dark:to-black/20 pointer-events-none" />
                        {selected && (
                          <span className="absolute top-3 right-3 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-md animate-in zoom-in">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 mb-2 relative z-10">
                          <div className="w-3.5 h-3.5 rounded-[4px] shrink-0" style={{ backgroundColor: t.accent }} />
                          <div className="h-2 rounded-full w-12 bg-black/10 dark:bg-white/20" />
                        </div>
                        {t.blocks.map((cls, i) => (
                          <div key={i} className={`rounded-full relative z-10 transition-all ${cls} ${selected ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} style={{ backgroundColor: i === 2 ? `${t.accent}40` : 'rgba(0,0,0,0.06)' }} />
                        ))}
                      </div>
                      <div className="p-4 border-t border-black/5 dark:border-white/5">
                        <p className={`font-extrabold text-sm ${selected ? 'text-indigo-900 dark:text-indigo-100' : 'text-[var(--text-primary)]'}`}>{t.name}</p>
                        <p className="text-xs font-medium text-gray-500 mt-1">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-gray-900 dark:border-white/20 shadow-inner">
                  <Store className="w-6 h-6 text-gray-700 dark:text-[var(--text-secondary)]" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Name your store</h2>
                <p className="text-base text-[var(--text-secondary)] max-w-sm mx-auto">This represents your main storefront. You can easily modify these settings later.</p>
              </div>

              <div className="space-y-5 bg-gray-50/50 dark:bg-zinc-900/30 p-6 rounded-[24px] border border-gray-100 dark:border-zinc-800/80">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">
                    Store name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" autoFocus value={title} onChange={e => handleTitleChange(e.target.value)}
                    placeholder="e.g. Arjun's Creative Store" className={INPUT} />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">
                    Your URL <span className="text-red-500">*</span>
                  </label>
                  <div className={`flex items-center border-2 rounded-2xl overflow-hidden transition-colors ${
                      slugStatus === 'available' ? 'border-emerald-500/50 dark:border-emerald-500/50 ring-4 ring-emerald-500/10' :
                      slugStatus === 'taken' || slugStatus === 'invalid' ? 'border-red-500/50 dark:border-red-500/50 ring-4 ring-red-500/10' :
                      'border-gray-200 dark:border-zinc-800 focus-within:border-gray-900 dark:border-white focus-within:ring-4 focus-within:ring-gray-400/20'
                    } bg-white dark:bg-zinc-950`}
                  >
                    <span className="pl-4 pr-3 py-3.5 text-sm font-bold text-gray-400 border-r border-gray-100 dark:border-zinc-800 shrink-0 bg-gray-50 dark:bg-zinc-900 font-mono">
                      digione.ai/store/
                    </span>
                    <input type="text" value={slug}
                      onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="your-slug" className="flex-1 px-4 py-3.5 text-base font-bold tracking-wide bg-transparent outline-none text-[var(--text-primary)] font-mono placeholder:font-sans placeholder:font-medium placeholder:text-sm" />
                    <span className="pr-4 shrink-0 flex items-center justify-center">
                      {slugStatus === 'checking' && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
                      {slugStatus === 'available' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      {(slugStatus === 'taken' || slugStatus === 'invalid') && <XCircle className="w-5 h-5 text-red-500" />}
                    </span>
                  </div>
                  <div className="mt-2 ml-1 min-h-[20px]">
                    {slugStatus === 'available' && <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> This unique URL is available!</p>}
                    {slugStatus === 'taken' && <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Another creator claimed this slug</p>}
                    {slugStatus === 'invalid' && <p className="text-xs font-semibold text-red-500">Must be 3-50 chars, no special characters other than hyphens</p>}
                    {slugStatus === 'idle' && slug && <p className="text-xs font-semibold text-gray-400">Waiting to check availability...</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1 flex justify-between">
                    Description <span className="text-gray-400 font-medium">Optional</span>
                  </label>
                  <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Provide a quick summary of what you are selling..." className={`${INPUT} resize-none leading-relaxed`} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Ready to launch?</h2>
                <p className="text-base text-[var(--text-secondary)] max-w-sm mx-auto">Confirm your details and hit the button to ignite the engines.</p>
              </div>

              <div className="rounded-[24px] border-2 border-indigo-100 dark:border-gray-900 dark:border-white/20 p-6 bg-gray-100/50 dark:bg-gray-1000/5 relative overflow-hidden">
                <div className="absolute top-[-30%] right-[-5%] w-48 h-48 bg-gray-1000/10 blur-3xl rounded-full" />
                
                <div className="flex items-start gap-4 mb-5 relative z-10">
                  <div className="w-12 h-12 rounded-[16px] flex items-center justify-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm shrink-0">
                    <Store className="w-6 h-6 text-gray-700 dark:text-[var(--text-secondary)]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-[var(--text-primary)] line-clamp-2">{title}</h3>
                    <p className="text-xs font-bold text-gray-700 dark:text-[var(--text-secondary)] uppercase tracking-widest mt-1">Main Store</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-sm font-bold text-gray-700 dark:text-[var(--text-secondary)] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-xl px-4 py-3 border border-white/50 dark:border-white/5 shadow-sm relative z-10 w-fit">
                  <Globe className="w-4 h-4 text-gray-600 dark:text-[var(--text-secondary)] shrink-0" />
                  <span className="font-mono truncate tracking-wide">digione.ai/store/<span className="text-gray-700 dark:text-[var(--text-secondary)]">{slug}</span></span>
                </div>
                
                {description && <p className="mt-4 text-sm font-medium text-gray-600 dark:text-[var(--text-secondary)] leading-relaxed border-t border-indigo-100 dark:border-zinc-800/80 pt-4 relative z-10">{description}</p>}
              </div>

              <div className="flex bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden p-6 gap-6">
                <div className="flex-[0.5] border-r border-gray-200 dark:border-zinc-800">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Theme Selection</p>
                   <p className="text-base font-bold text-[var(--text-primary)]">{TEMPLATES.find(t => t.id === template)?.name ?? '—'}</p>
                </div>
                <div className="flex-1">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Category Type</p>
                   <p className="text-base font-bold text-[var(--text-primary)]">Full Creator Platform</p>
                </div>
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
                className="flex items-center justify-center w-12 h-12 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 hover:text-indigo-600 text-gray-500 rounded-full transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : <span />}

            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="group flex items-center gap-2 bg-[var(--text-primary)] hover:bg-[var(--text-primary)]/90 disabled:opacity-30 disabled:cursor-not-allowed text-[var(--bg-primary)] px-8 py-3.5 rounded-2xl font-bold text-base shadow-lg transition-all active:scale-[0.98]">
                Proceed to {step === 1 ? 'Details' : 'Review'} <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="group flex items-center justify-center gap-2 w-full sm:w-auto bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-60 text-white px-10 py-3.5 rounded-2xl font-extrabold text-base shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98]">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Igniting Engines...</> : <><Zap className="w-5 h-5" /> Launch Your Store</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
