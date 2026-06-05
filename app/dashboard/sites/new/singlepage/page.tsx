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
              i < step ? 'bg-[var(--info)] scale-y-100' : 'bg-[var(--border)] scale-y-75'
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
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        {/* Back / Type Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard/sites/new')}
            className="group inline-flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--info)] transition-colors bg-[var(--surface)] px-4 py-2.5 rounded-xl border border-[var(--border)] shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            {step > 1 ? 'Go Back' : 'All Types'}
          </button>

          <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--info-subtle)] border border-[var(--info-border)] rounded-xl shadow-[var(--shadow-xs)]">
            <Layers className="w-4 h-4 text-[var(--info)]" />
            <span className="text-sm font-bold text-[var(--info)] uppercase tracking-widest">Product Site</span>
          </div>
        </div>

        {/* Main Content Box */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[32px] p-8 md:p-10 shadow-[var(--shadow-sm)]">
          <StepBar step={step} total={3} />

          {/* Step 1: Choose slug */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="w-12 h-12 bg-[var(--info-subtle)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--info-border)] shadow-inner">
                  <Globe className="w-6 h-6 text-[var(--info)]" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Claim your page URL</h2>
                <p className="text-base text-[var(--text-secondary)] max-w-sm mx-auto">Pick a custom slug for your single product landing page.</p>
              </div>

              <div className="space-y-5 bg-[var(--surface-muted)] p-6 rounded-[24px] border border-[var(--border)]">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">
                    Page Slug <span className="text-[var(--danger)]">*</span>
                  </label>
                  <div className={`flex items-center border-2 rounded-2xl overflow-hidden transition-colors ${
                      (!slugChecking && slugAvailable === true && validSlug) ? 'border-[var(--success)] ring-4 ring-[var(--success)]/10' :
                      (!slugChecking && (slugAvailable === false || (!validSlug && slug.length > 0))) ? 'border-[var(--danger)] ring-4 ring-[var(--danger)]/10' :
                      'border-[var(--border)] focus-within:border-[var(--border-strong)] focus-within:ring-4 focus-within:ring-[var(--border-strong)]/10'
                    } bg-[var(--surface)]`}
                  >
                    <span className="pl-4 pr-3 py-3.5 text-sm font-bold text-[var(--text-tertiary)] border-r border-[var(--border-subtle)] shrink-0 bg-[var(--surface-muted)] font-mono">
                      digione.ai/site/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="e.g. design-course-launch"
                      className="flex-1 px-4 py-3.5 text-base font-bold tracking-wide bg-transparent outline-none text-[var(--text-primary)] font-mono placeholder:font-sans placeholder:font-medium placeholder:text-sm focus-visible:outline-none"
                      autoFocus
                    />
                    <span className="pr-4 shrink-0 flex items-center justify-center">
                      {slugChecking && <Loader2 className="w-5 h-5 text-[var(--text-tertiary)] animate-spin" />}
                      {!slugChecking && slugAvailable === true && validSlug && <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />}
                      {!slugChecking && (slugAvailable === false || (!validSlug && slug.length > 0)) && <XCircle className="w-5 h-5 text-[var(--danger)]" />}
                    </span>
                  </div>
                  <div className="mt-2 ml-1 min-h-[20px]">
                    {!slugChecking && slugAvailable === true && validSlug && <p className="text-xs font-bold text-[var(--success)] flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> This unique URL is available!</p>}
                    {!slugChecking && slugAvailable === false && validSlug && <p className="text-xs font-bold text-[var(--danger)] flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Already taken</p>}
                    {slug.length > 0 && !validSlug && <p className="text-xs font-semibold text-[var(--danger)]">Must be 3-50 chars, no special characters other than hyphens</p>}
                  </div>
                </div>

                {/* Preview card */}
                {slugAvailable === true && validSlug && (
                  <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-[20px] animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2 text-sm font-bold text-[var(--info)]">
                      <Globe className="w-4 h-4 shrink-0" />
                      <span className="font-mono truncate tracking-wide">digione.ai/site/<span className="text-[var(--info)]">{slug}</span></span>
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
                <div className="w-12 h-12 bg-[var(--info-subtle)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--info-border)] shadow-inner">
                  <Layers className="w-6 h-6 text-[var(--info)]" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Create your landing page</h2>
                <p className="text-base text-[var(--text-secondary)] max-w-sm mx-auto">A high-converting promotional engine for a single product.</p>
              </div>

              <div className="space-y-5 bg-[var(--surface-muted)] p-6 rounded-[24px] border border-[var(--border)]">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">
                    Page Title <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Launch: Ultimate Design Course" className={INPUT} autoFocus />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1 flex justify-between">
                    Description <span className="text-[var(--text-tertiary)] font-medium">Optional</span>
                  </label>
                  <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Short pitch or hook for your product..." className={`${INPUT} resize-none leading-relaxed`} />
                </div>

                {/* Product picker */}
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-3 ml-1 flex justify-between items-center">
                    Link to a Product <span className="text-[var(--text-tertiary)] font-medium text-xs bg-[var(--surface-muted)] px-2 py-0.5 rounded-md">Optional</span>
                  </label>
                  <div className="relative mb-3 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] group-focus-within:text-[var(--info)] transition-colors" />
                    <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                      placeholder="Search to bind a product checkout..." className={`${INPUT} pl-11 py-3 bg-[var(--surface)]`} />
                  </div>
                  <div className="border border-[var(--border)] rounded-2xl overflow-hidden max-h-48 overflow-y-auto bg-[var(--surface)] custom-scrollbar shadow-inner">
                    {products.filter((p: any) => p.name?.toLowerCase().includes(productSearch.toLowerCase())).map((p: any) => (
                      <button key={p.id} onClick={() => setProductId(productId === p.id ? null : p.id)}
                        className={`w-full text-left flex items-center gap-4 px-4 py-3 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                          productId === p.id ? 'bg-[var(--info-subtle)]' : 'hover:bg-[var(--surface-hover)]'
                        } border-b border-[var(--border-subtle)] last:border-0`}>
                        <div className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center shrink-0 transition-colors ${productId === p.id ? 'border-[var(--info)] bg-[var(--info)]' : 'border-[var(--border)]'}`}>
                           {productId === p.id && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-bold truncate ${productId === p.id ? 'text-[var(--info)]' : 'text-[var(--text-primary)]'}`}>{p.name}</span>
                        </div>
                        {p.price > 0 && <span className="ml-auto text-xs font-bold text-[var(--text-secondary)] bg-[var(--surface-muted)] px-2 py-1 rounded-md">{'₹'}{p.price}</span>}
                      </button>
                    ))}
                    {products.length === 0 && <p className="text-sm font-medium text-[var(--text-secondary)] p-6 text-center">No products found in catalog</p>}
                  </div>
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
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Ready to launch?</h2>
                <p className="text-base text-[var(--text-secondary)] max-w-sm mx-auto">Your single product page structure is confirmed.</p>
              </div>
              <div className="rounded-[24px] border-2 border-[var(--border)] p-6 bg-[var(--surface-muted)] relative overflow-hidden">
                <div className="flex items-start gap-4 mb-5 relative z-10">
                  <div className="w-12 h-12 rounded-[16px] flex items-center justify-center bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-xs)] shrink-0">
                    <Layers className="w-6 h-6 text-[var(--info)]" />
                  </div>
                  <div className="pt-1">
                    <h3 className="text-xl font-extrabold text-[var(--text-primary)] line-clamp-2">{title}</h3>
                    <p className="text-xs font-bold text-[var(--info)] uppercase tracking-widest mt-1">Product Landing Page</p>
                  </div>
                </div>

                <div className="grid gap-3 relative z-10">
                  <div className="flex items-center gap-3 text-sm font-bold text-[var(--text-secondary)] bg-[var(--surface)] rounded-xl px-4 py-3 border border-[var(--border)] shadow-[var(--shadow-xs)] w-fit">
                    <Globe className="w-4 h-4 text-[var(--info)] shrink-0" />
                    <span className="font-mono truncate tracking-wide">digione.ai/site/<span className="text-[var(--info)]">{slug}</span></span>
                  </div>

                  {productId && (
                    <div className="flex items-center gap-3 text-sm font-bold text-[var(--info)] bg-[var(--info-subtle)] rounded-xl px-4 py-3 border border-[var(--info-border)] shadow-[var(--shadow-xs)] w-fit">
                      <Tag className="w-4 h-4 text-[var(--info)] shrink-0" />
                      <span className="truncate tracking-wide">Selling: {products.find((p: any) => p.id === productId)?.name ?? 'Product'}</span>
                    </div>
                  )}
                </div>

                {description && <p className="mt-5 text-sm font-medium text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)] pt-4 relative z-10">{description}</p>}

              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-start gap-3 bg-[var(--danger-subtle)] border-2 border-[var(--danger-border)] px-5 py-4 rounded-xl">
              <XCircle className="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-[var(--danger)]">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-10 pt-6 border-t border-[var(--border-subtle)]">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} className="flex items-center justify-center w-12 h-12 bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : <span />}

            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={step === 1 ? !canNext1 : !canNext2}
                className="group flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--accent-fg)] px-8 py-3.5 rounded-2xl font-bold text-base shadow-[var(--shadow-xs)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                Proceed to {step === 1 ? 'Details' : 'Review'} <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="group flex items-center justify-center gap-2 w-full sm:w-auto bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-60 text-[var(--text-on-brand)] px-10 py-3.5 rounded-2xl font-extrabold text-base shadow-[var(--shadow-xs)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Igniting...</> : <><Zap className="w-5 h-5" /> Launch Page</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
