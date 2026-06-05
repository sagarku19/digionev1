'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import {
  Layers, ChevronRight, ChevronLeft, Loader2, Zap, Globe,
  Search, CheckCircle2, XCircle, Tag,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

const INPUT = 'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow';

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex flex-col gap-2 mb-6">
      <div className="flex items-center justify-between text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide px-1">
        <span>Step {step} of {total}</span>
        <span className="text-[var(--text-secondary)]">{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="flex items-center gap-1.5 h-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-full transition-all duration-500 ease-out ${
              i < step ? 'bg-[var(--info)]' : 'bg-[var(--border)]'
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
    <div className="space-y-6 pb-12">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard/sites/new')}
            className="group inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-3 py-2 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            {step > 1 ? 'Go Back' : 'All Types'}
          </button>

          <div className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-[var(--info-bg)] border border-[var(--info)]/20 rounded-[var(--radius-sm)]">
            <Layers className="w-3.5 h-3.5 text-[var(--info)]" />
            <span className="text-[11px] font-medium text-[var(--info)] uppercase tracking-wide">Product Site</span>
          </div>
        </div>

        <Card>
          <StepBar step={step} total={3} />

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-10 h-10 bg-[var(--info-bg)] rounded-[var(--radius-md)] flex items-center justify-center mx-auto mb-3 border border-[var(--info)]/20">
                  <Globe className="w-5 h-5 text-[var(--info)]" />
                </div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Claim your page URL</h2>
                <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">Pick a custom slug for your single-product landing page.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Page Slug <span className="text-[var(--danger)]">*</span>
                  </label>
                  <div className={`flex items-center border rounded-[var(--radius-md)] overflow-hidden transition-colors ${
                      (!slugChecking && slugAvailable === true && validSlug) ? 'border-[var(--success)]' :
                      (!slugChecking && (slugAvailable === false || (!validSlug && slug.length > 0))) ? 'border-[var(--danger)]' :
                      'border-[var(--border)] focus-within:border-[var(--border-strong)] focus-within:shadow-[var(--focus-ring)]'
                    } bg-[var(--surface-muted)]`}
                  >
                    <span className="pl-3 pr-2 py-2 text-xs font-medium text-[var(--text-tertiary)] border-r border-[var(--border-subtle)] shrink-0 font-mono">
                      digione.ai/site/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="e.g. design-course-launch"
                      className="flex-1 px-3 py-2 text-sm font-mono bg-transparent outline-none text-[var(--text-primary)] placeholder:font-sans placeholder:text-[var(--text-tertiary)]"
                      autoFocus
                    />
                    <span className="pr-3 shrink-0 flex items-center justify-center">
                      {slugChecking && <Loader2 className="w-4 h-4 text-[var(--text-tertiary)] animate-spin" />}
                      {!slugChecking && slugAvailable === true && validSlug && <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />}
                      {!slugChecking && (slugAvailable === false || (!validSlug && slug.length > 0)) && <XCircle className="w-4 h-4 text-[var(--danger)]" />}
                    </span>
                  </div>
                  <div className="mt-1.5 min-h-[18px]">
                    {!slugChecking && slugAvailable === true && validSlug && <p className="text-xs font-medium text-[var(--success)] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Available</p>}
                    {!slugChecking && slugAvailable === false && validSlug && <p className="text-xs font-medium text-[var(--danger)] flex items-center gap-1"><XCircle className="w-3 h-3" /> Already taken</p>}
                    {slug.length > 0 && !validSlug && <p className="text-xs text-[var(--danger)]">Must be 3–50 chars, hyphens only.</p>}
                  </div>
                </div>

                {slugAvailable === true && validSlug && (
                  <div className="p-3 bg-[var(--info-bg)] border border-[var(--info)]/20 rounded-[var(--radius-md)]">
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--info)]">
                      <Globe className="w-4 h-4 shrink-0" />
                      <span className="font-mono">digione.ai/site/{slug}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-10 h-10 bg-[var(--info-bg)] rounded-[var(--radius-md)] flex items-center justify-center mx-auto mb-3 border border-[var(--info)]/20">
                  <Layers className="w-5 h-5 text-[var(--info)]" />
                </div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Create your landing page</h2>
                <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">A high-converting promotional engine for a single product.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Page Title <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Launch: Ultimate Design Course"
                    className={INPUT}
                    autoFocus
                  />
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
                    placeholder="Short pitch or hook for your product…"
                    className={`${INPUT} resize-none leading-relaxed`}
                  />
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium text-[var(--text-primary)]">Link to a product</label>
                    <span className="text-xs text-[var(--text-tertiary)]">Optional</span>
                  </div>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Search products…"
                      className={`${INPUT} pl-9`}
                    />
                  </div>
                  <div className="border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden max-h-48 overflow-y-auto bg-[var(--surface)]">
                    {products.filter((p: any) => p.name?.toLowerCase().includes(productSearch.toLowerCase())).map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => setProductId(productId === p.id ? null : p.id)}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2.5 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors ${
                          productId === p.id ? 'bg-[var(--info-bg)]' : 'hover:bg-[var(--surface-hover)]'
                        } border-b border-[var(--border-subtle)] last:border-0`}
                      >
                        <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 transition-colors ${productId === p.id ? 'border-[var(--info)] bg-[var(--info)]' : 'border-[var(--border)]'}`}>
                          {productId === p.id && <CheckCircle2 className="w-3 h-3 text-[var(--text-on-brand)]" />}
                        </div>
                        <span className={`flex-1 text-sm font-medium truncate ${productId === p.id ? 'text-[var(--info)]' : 'text-[var(--text-primary)]'}`}>{p.name}</span>
                        {p.price > 0 && <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-[var(--radius-sm)]">₹{p.price}</span>}
                      </button>
                    ))}
                    {products.length === 0 && <p className="text-sm text-[var(--text-secondary)] p-4 text-center">No products in catalog</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-10 h-10 bg-[var(--brand)] rounded-[var(--radius-md)] flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-5 h-5 text-[var(--text-on-brand)]" />
                </div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Ready to launch?</h2>
                <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">Your single-product page structure is confirmed.</p>
              </div>

              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 bg-[var(--surface-muted)]">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center bg-[var(--surface)] border border-[var(--border-subtle)] shrink-0">
                    <Layers className="w-5 h-5 text-[var(--info)]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)] line-clamp-2">{title}</h3>
                    <p className="text-[11px] font-medium text-[var(--info)] uppercase tracking-wide mt-0.5">Product Landing Page</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface)] rounded-[var(--radius-sm)] px-3 py-2 border border-[var(--border-subtle)] w-fit">
                    <Globe className="w-3.5 h-3.5 text-[var(--info)] shrink-0" />
                    <span className="font-mono">digione.ai/site/<span className="text-[var(--text-primary)]">{slug}</span></span>
                  </div>
                  {productId && (
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--info)] bg-[var(--info-bg)] rounded-[var(--radius-sm)] px-3 py-2 border border-[var(--info)]/20 w-fit">
                      <Tag className="w-3.5 h-3.5 shrink-0" />
                      <span>Selling: {products.find((p: any) => p.id === productId)?.name ?? 'Product'}</span>
                    </div>
                  )}
                </div>

                {description && <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)] pt-3">{description}</p>}
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
                disabled={step === 1 ? !canNext1 : !canNext2}
                className="group flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--accent-fg)] px-3 py-2 rounded-[var(--radius-sm)] font-semibold text-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
              >
                Continue <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="group flex items-center justify-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-60 text-[var(--text-on-brand)] px-4 py-2 rounded-[var(--radius-sm)] font-semibold text-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Zap className="w-4 h-4" /> Launch Page</>}
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
