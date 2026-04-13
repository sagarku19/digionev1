'use client';
// Dedicated creation flow: Product Site (Product Landing)
// 3-step: Slug → Details (name, product link) → Review & Launch

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import {
  Layers, ChevronRight, ChevronLeft, Loader2, Zap, Globe,
  Search, Sparkles, CheckCircle2, XCircle,
} from 'lucide-react';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)]/40 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#07070f]/80 backdrop-blur-sm border-b border-gray-100 dark:border-white/[0.05]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard/sites/new')}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition">
            <ChevronLeft className="w-4 h-4" /> {step > 1 ? 'Back' : 'All Types'}
          </button>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Product Site</span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Progress */}
        <div className="flex gap-1">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-[var(--bg-tertiary)]' : 'bg-gray-200 dark:bg-gray-800'}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-[var(--bg-tertiary)]' : 'bg-gray-200 dark:bg-gray-800'}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 3 ? 'bg-[var(--bg-tertiary)]' : 'bg-gray-200 dark:bg-gray-800'}`} />
        </div>

        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 md:p-8 shadow-sm">

          {/* Step 1: Choose slug */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Choose your page URL</h2>
                <p className="text-sm text-gray-500 mt-1">Pick a custom slug for your single page. You can change this later.</p>
              </div>

              <div className="p-4 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border)] dark:border-[var(--border)]">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <span className="text-xs font-semibold text-[var(--text-primary)] dark:text-[var(--text-secondary)]">Your URL</span>
                </div>
                <p className="text-sm text-[var(--text-primary)] font-mono">
                  digione.ai/site/<span className="font-bold">{slug || '...'}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Page slug <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="e.g. design-course-launch"
                  className={INPUT}
                />
                <div className="flex items-center gap-2 mt-2 min-h-[20px]">
                  {slugChecking && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                  {!slugChecking && slugAvailable === true && validSlug && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Available</span>
                  )}
                  {!slugChecking && slugAvailable === false && validSlug && (
                    <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="w-3.5 h-3.5" /> Already taken</span>
                  )}
                  {slug.length > 0 && !validSlug && (
                    <span className="text-xs text-gray-400">3-50 chars, lowercase letters, numbers, hyphens</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create your landing page</h2>
                <p className="text-sm text-gray-500 mt-1">A high-converting page for a single product.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Page title <span className="text-red-400">*</span>
                </label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Launch: Ultimate Design Course" className={INPUT} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Short pitch for your product..." className={`${INPUT} resize-none`} />
              </div>

              {/* Product picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Link a product <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search your products..." className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400" />
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                  {products.filter((p: any) => p.name?.toLowerCase().includes(productSearch.toLowerCase())).map((p: any) => (
                    <button key={p.id} onClick={() => setProductId(productId === p.id ? null : p.id)}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 transition ${
                        productId === p.id ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      } border-b border-gray-100 dark:border-gray-800 last:border-0`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${productId === p.id ? 'bg-[var(--bg-tertiary)]' : 'bg-gray-300'}`} />
                      <span className="text-sm text-gray-900 dark:text-white">{p.name}</span>
                      {p.price > 0 && <span className="ml-auto text-xs text-gray-500">{'\u20B9'}{p.price}</span>}
                    </button>
                  ))}
                  {products.length === 0 && <p className="text-sm text-gray-500 p-4 text-center">No products yet</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ready to launch?</h2>
                <p className="text-sm text-gray-500 mt-1">Your single product page is ready.</p>
              </div>
              <div className="rounded-2xl border-2 border-[var(--border)] dark:border-[var(--border)] p-5 bg-[var(--bg-tertiary)]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-tertiary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Product Site</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{title}</p>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-primary)] font-mono mb-2">digione.ai/site/{slug}</p>
                {description && <p className="text-xs text-gray-500 leading-relaxed">{description}</p>}
                {productId && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-primary)]">
                    <Sparkles className="w-3 h-3" />
                    Linked to: {products.find((p: any) => p.id === productId)?.name ?? 'Product'}
                  </div>
                )}
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{error}</p>}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : <span />}

            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={step === 1 ? !canNext1 : !canNext2}
                className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--accent-fg)] px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg  transition-all">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-[var(--accent-fg)] px-7 py-2.5 rounded-xl font-bold text-sm shadow-lg  transition-all">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Zap className="w-4 h-4" /> Launch Page</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
