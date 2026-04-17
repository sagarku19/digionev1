'use client';
// Dedicated creation flow: Product Site (Product Landing)
// 3-step: Slug → Details (name, product link) → Review & Launch

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import {
  Layers, ChevronRight, ChevronLeft, Loader2, Zap, Globe,
  Search, Sparkles, CheckCircle2, XCircle, Tag
} from 'lucide-react';

const INPUT = 'w-full px-5 py-3.5 bg-gray-50/50 dark:bg-zinc-900/50 border-2 border-gray-200 dark:border-zinc-800 rounded-2xl text-base font-medium focus:ring-0 focus:border-purple-500 outline-none text-[var(--text-primary)] placeholder-gray-400 transition-colors';

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
              i < step ? 'bg-purple-600 dark:bg-purple-500 scale-y-100' : 'bg-gray-200 dark:bg-zinc-800 scale-y-75'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function CreateSinglePagePage() {
  const router = useRouter();
  const { products } = useProducts();

  const [step, setStep] = useState(1);
  const [slug, setSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced slug availability check
  useEffect(() => {
    if (!slug || slug.length < 3) { setSlugAvailable(null); return; }
    const timer = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const res = await fetch(`/api/sites/check-slug?slug=${encodeURIComponent(slug)}&type=single`);
        const json = await res.json();
        setSlugAvailable(json.available === true);
      } catch { setSlugAvailable(null); }
      finally { setSlugChecking(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug]);

  const validSlug = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug);
  const canNext1 = validSlug && slugAvailable === true;
  const canNext2 = title.trim().length > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/sites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_type: 'single', slug, title, description, product_id: productId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create');
      router.push(`/dashboard/sites/edit/singlepage/${json.siteId}`);
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
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[40%] bg-purple-500/20 dark:bg-purple-500/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute top-[20%] right-[20%] w-[20%] h-[30%] bg-gray-1000/20 dark:bg-gray-1000/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        {/* Back / Type Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard/sites/new')}
            className="group inline-flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-[var(--text-secondary)] hover:text-purple-600 dark:hover:text-purple-400 transition-colors bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-gray-200/50 dark:border-zinc-800/80 shadow-sm">
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            {step > 1 ? 'Go Back' : 'All Types'}
          </button>
          
          <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-xl shadow-sm">
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-bold text-purple-900 dark:text-purple-100 uppercase tracking-widest">Product Site</span>
          </div>
        </div>

        {/* Main Content Box */}
        <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border border-white/20 dark:border-zinc-800/50 rounded-[32px] p-8 md:p-10 shadow-2xl shadow-purple-500/5">
          <StepBar step={step} total={3} />

          {/* Step 1: Choose slug */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100 dark:border-purple-500/20 shadow-inner">
                  <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Claim your page URL</h2>
                <p className="text-base text-[var(--text-secondary)] max-w-sm mx-auto">Pick a custom slug for your single product landing page.</p>
              </div>

              <div className="space-y-5 bg-gray-50/50 dark:bg-zinc-900/30 p-6 rounded-[24px] border border-gray-100 dark:border-zinc-800/80">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">
                    Page Slug <span className="text-red-500">*</span>
                  </label>
                  <div className={`flex items-center border-2 rounded-2xl overflow-hidden transition-colors ${
                      (!slugChecking && slugAvailable === true && validSlug) ? 'border-emerald-500/50 dark:border-emerald-500/50 ring-4 ring-emerald-500/10' :
                      (!slugChecking && (slugAvailable === false || (!validSlug && slug.length > 0))) ? 'border-red-500/50 dark:border-red-500/50 ring-4 ring-red-500/10' :
                      'border-gray-200 dark:border-zinc-800 focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-500/10'
                    } bg-white dark:bg-zinc-950`}
                  >
                    <span className="pl-4 pr-3 py-3.5 text-sm font-bold text-gray-400 border-r border-gray-100 dark:border-zinc-800 shrink-0 bg-gray-50 dark:bg-zinc-900 font-mono">
                      digione.ai/site/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="e.g. design-course-launch"
                      className="flex-1 px-4 py-3.5 text-base font-bold tracking-wide bg-transparent outline-none text-[var(--text-primary)] font-mono placeholder:font-sans placeholder:font-medium placeholder:text-sm"
                      autoFocus
                    />
                    <span className="pr-4 shrink-0 flex items-center justify-center">
                      {slugChecking && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
                      {!slugChecking && slugAvailable === true && validSlug && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      {!slugChecking && (slugAvailable === false || (!validSlug && slug.length > 0)) && <XCircle className="w-5 h-5 text-red-500" />}
                    </span>
                  </div>
                  <div className="mt-2 ml-1 min-h-[20px]">
                    {!slugChecking && slugAvailable === true && validSlug && <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> This unique URL is available!</p>}
                    {!slugChecking && slugAvailable === false && validSlug && <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Already taken</p>}
                    {slug.length > 0 && !validSlug && <p className="text-xs font-semibold text-red-500">Must be 3-50 chars, no special characters other than hyphens</p>}
                  </div>
                </div>

                {/* Preview card */}
                {slugAvailable === true && validSlug && (
                  <div className="p-5 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border border-purple-200 dark:border-purple-800/40 rounded-[20px] animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2 text-sm font-bold text-purple-600 dark:text-purple-400">
                      <Globe className="w-4 h-4 shrink-0" />
                      <span className="font-mono truncate tracking-wide">digione.ai/site/<span className="text-purple-600">{slug}</span></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100 dark:border-purple-500/20 shadow-inner">
                  <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Create your landing page</h2>
                <p className="text-base text-[var(--text-secondary)] max-w-sm mx-auto">A high-converting promotional engine for a single product.</p>
              </div>

              <div className="space-y-5 bg-gray-50/50 dark:bg-zinc-900/30 p-6 rounded-[24px] border border-gray-100 dark:border-zinc-800/80">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">
                    Page Title <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Launch: Ultimate Design Course" className={INPUT} autoFocus />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1 flex justify-between">
                    Description <span className="text-gray-400 font-medium">Optional</span>
                  </label>
                  <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Short pitch or hook for your product..." className={`${INPUT} resize-none leading-relaxed`} />
                </div>

                {/* Product picker */}
                <div className="pt-2 border-t border-gray-200 dark:border-zinc-800/50">
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-3 ml-1 flex justify-between items-center">
                    Link to a Product <span className="text-gray-400 font-medium text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">Optional</span>
                  </label>
                  <div className="relative mb-3 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                    <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                      placeholder="Search to bind a product checkout..." className={`${INPUT} pl-11 py-3 bg-white dark:bg-zinc-950`} />
                  </div>
                  <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden max-h-48 overflow-y-auto bg-white dark:bg-zinc-950 custom-scrollbar shadow-inner">
                    {products.filter((p: any) => p.name?.toLowerCase().includes(productSearch.toLowerCase())).map((p: any) => (
                      <button key={p.id} onClick={() => setProductId(productId === p.id ? null : p.id)}
                        className={`w-full text-left flex items-center gap-4 px-4 py-3 transition-colors ${
                          productId === p.id ? 'bg-purple-50 dark:bg-purple-500/10' : 'hover:bg-gray-50 dark:hover:bg-zinc-900/50'
                        } border-b border-gray-100 dark:border-zinc-800/50 last:border-0`}>
                        <div className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center shrink-0 transition-colors ${productId === p.id ? 'border-purple-500 bg-purple-500' : 'border-gray-300 dark:border-zinc-600'}`}>
                           {productId === p.id && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-bold truncate ${productId === p.id ? 'text-purple-900 dark:text-purple-100' : 'text-[var(--text-primary)]'}`}>{p.name}</span>
                        </div>
                        {p.price > 0 && <span className="ml-auto text-xs font-bold text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-md">{'\u20B9'}{p.price}</span>}
                      </button>
                    ))}
                    {products.length === 0 && <p className="text-sm font-medium text-gray-500 p-6 text-center">No products found in catalog</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Ready to launch?</h2>
                <p className="text-base text-[var(--text-secondary)] max-w-sm mx-auto">Your single product page structure is confirmed.</p>
              </div>
              <div className="rounded-[24px] border-2 border-purple-100 dark:border-purple-500/20 p-6 bg-purple-50/50 dark:bg-purple-500/5 relative overflow-hidden">
                <div className="absolute top-[-30%] right-[-5%] w-48 h-48 bg-purple-500/10 blur-3xl rounded-full" />
                
                <div className="flex items-start gap-4 mb-5 relative z-10">
                  <div className="w-12 h-12 rounded-[16px] flex items-center justify-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm shrink-0">
                    <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="pt-1">
                    <h3 className="text-xl font-extrabold text-[var(--text-primary)] line-clamp-2">{title}</h3>
                    <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mt-1">Product Landing Page</p>
                  </div>
                </div>

                <div className="grid gap-3 relative z-10">
                  <div className="flex items-center gap-3 text-sm font-bold text-gray-700 dark:text-[var(--text-secondary)] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-xl px-4 py-3 border border-white/50 dark:border-white/5 shadow-sm w-fit">
                    <Globe className="w-4 h-4 text-purple-500 shrink-0" />
                    <span className="font-mono truncate tracking-wide">digione.ai/site/<span className="text-purple-600">{slug}</span></span>
                  </div>

                  {productId && (
                    <div className="flex items-center gap-3 text-sm font-bold text-purple-700 dark:text-purple-300 bg-purple-100/50 dark:bg-purple-500/10 rounded-xl px-4 py-3 border border-purple-200 dark:border-purple-500/20 shadow-sm w-fit">
                      <Tag className="w-4 h-4 text-purple-500 shrink-0" />
                      <span className="truncate tracking-wide">Selling: {products.find((p: any) => p.id === productId)?.name ?? 'Product'}</span>
                    </div>
                  )}
                </div>

                {description && <p className="mt-5 text-sm font-medium text-gray-600 dark:text-[var(--text-secondary)] leading-relaxed border-t border-purple-100 dark:border-zinc-800/80 pt-4 relative z-10">{description}</p>}
                
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20 px-5 py-4 rounded-xl">
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100 dark:border-zinc-800/80">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} className="flex items-center justify-center w-12 h-12 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 hover:text-purple-600 text-gray-500 rounded-full transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : <span />}

            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={step === 1 ? !canNext1 : !canNext2}
                className="group flex items-center gap-2 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-2xl font-bold text-base shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98]">
                Proceed to {step === 1 ? 'Details' : 'Review'} <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="group flex items-center justify-center gap-2 w-full sm:w-auto bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-60 text-white px-10 py-3.5 rounded-2xl font-extrabold text-base shadow-xl shadow-purple-500/20 transition-all active:scale-[0.98]">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Igniting...</> : <><Zap className="w-5 h-5" /> Launch Page</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
