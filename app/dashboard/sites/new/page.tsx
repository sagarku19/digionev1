'use client';
// Dashboard: Create Site — 4-step wizard.
// DB tables: products (read for product selector), sites+sub-tables (write via API)

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import { useSites } from '@/hooks/useSites';
import {
  Store, Package, CreditCard, FileText, Check,
  ChevronRight, ChevronLeft, Loader2, CheckCircle2, XCircle, Search
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
type SiteType = 'main' | 'single' | 'payment' | 'blog';

const SITE_TYPES: {
  id: SiteType;
  label: string;
  icon: React.ElementType;
  desc: string;
  best: string;
}[] = [
  {
    id: 'main',
    label: 'Main Store',
    icon: Store,
    desc: 'Your main creator storefront. Add multiple products, sections, and a full navigation.',
    best: 'Courses, ebooks, digital assets',
  },
  {
    id: 'single',
    label: 'Product Page',
    icon: Package,
    desc: 'A dedicated high-converting page for one product. Countdown, testimonials, FAQ, guarantee badges.',
    best: 'Course launches, premium products',
  },
  {
    id: 'payment',
    label: 'Payment Link',
    icon: CreditCard,
    desc: 'Accept payments for services, consulting, or custom work. Fixed or flexible amounts.',
    best: 'Mentorship, freelance work',
  },
  {
    id: 'blog',
    label: 'Blog',
    icon: FileText,
    desc: 'A clean, readable blog. Free and gated content. Connects to your main store.',
    best: 'Content marketing, gated tutorials',
  },
];

// ─── Slug availability hook ────────────────────────────────────
function useSlugCheck(slug: string, siteType: SiteType | null) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!slug || !siteType) { setStatus('idle'); return; }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 3) {
      setStatus('invalid');
      return;
    }
    setStatus('checking');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sites/check-slug?slug=${encodeURIComponent(slug)}&type=${siteType}`);
        const json = await res.json();
        setStatus(json.available ? 'available' : 'taken');
      } catch {
        setStatus('idle');
      }
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [slug, siteType]);

  return status;
}

// ─── Step pill ────────────────────────────────────────────────
function StepPill({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
        done    ? 'bg-indigo-600 text-white' :
        active  ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-400'
      }`}>
        {done ? <Check className="w-3.5 h-3.5" /> : step}
      </div>
      <span className={`text-xs font-medium hidden sm:block ${active ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}

// ─── Step 1 — Type selector ────────────────────────────────────
function StepType({ value, onChange }: { value: SiteType | null; onChange: (t: SiteType) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">What kind of site do you want?</h2>
        <p className="text-sm text-gray-500 mt-1">Choose a type to get started with the right template.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SITE_TYPES.map(t => {
          const selected = value === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`relative text-left p-5 border-2 rounded-2xl transition-all ${
                selected
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/5'
                  : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
              }`}
            >
              {selected && (
                <span className="absolute top-3 right-3 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </span>
              )}
              <t.icon className={`w-6 h-6 mb-3 ${selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
              <p className={`font-semibold text-sm mb-1 ${selected ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
                {t.label}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">{t.desc}</p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-2 font-medium">Best for: {t.best}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2 — Template picker (simplified) ─────────────────────
const TEMPLATES: Record<SiteType, { id: string; name: string; desc: string; color: string }[]> = {
  main:    [{ id: 'minimal',  name: 'Minimal',  desc: 'Clean and distraction-free', color: 'from-slate-400 to-slate-600' }, { id: 'bold', name: 'Bold', desc: 'High impact with big headlines', color: 'from-indigo-400 to-violet-600' }],
  single:  [{ id: 'launch',  name: 'Launch',   desc: 'Built for course launches',  color: 'from-violet-400 to-purple-600' }],
  payment: [{ id: 'simple',  name: 'Simple',   desc: 'Clean payment card',          color: 'from-emerald-400 to-teal-600' }],
  blog:    [{ id: 'editorial', name: 'Editorial', desc: 'Readable, typographic',    color: 'from-amber-400 to-orange-600' }],
};

function StepTemplate({ siteType, value, onChange }: { siteType: SiteType; value: string | null; onChange: (t: string) => void }) {
  const templates = [...(TEMPLATES[siteType] ?? []), { id: 'blank', name: 'Start blank', desc: 'Empty canvas, add sections yourself', color: 'from-gray-300 to-gray-400' }];
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pick a template</h2>
        <p className="text-sm text-gray-500 mt-1">You can customise everything later.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {templates.map(t => {
          const selected = value === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`border-2 rounded-2xl overflow-hidden transition-all text-left ${
                selected ? 'border-indigo-600 ring-2 ring-indigo-500/20' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
              }`}
            >
              <div className={`h-24 bg-gradient-to-br ${t.color} flex items-center justify-center`}>
                {selected && <Check className="w-6 h-6 text-white" />}
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{t.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3 — Details ─────────────────────────────────────────
function StepDetails({
  siteType, title, setTitle, slug, setSlug, description, setDescription,
  productId, setProductId, slugStatus, mainSiteSlug,
}: {
  siteType: SiteType;
  title: string; setTitle: (v: string) => void;
  slug: string;  setSlug:  (v: string) => void;
  description: string; setDescription: (v: string) => void;
  productId: string | null; setProductId: (v: string | null) => void;
  slugStatus: ReturnType<typeof useSlugCheck>;
  mainSiteSlug?: string;
}) {
  const { products } = useProducts();
  const [productSearch, setProductSearch] = useState('');

  const autoSlug = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!slug || slug === autoSlug(title)) setSlug(autoSlug(v));
  };

  const SlugIcon = () => {
    if (slugStatus === 'checking') return <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />;
    if (slugStatus === 'available') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (slugStatus === 'taken' || slugStatus === 'invalid') return <XCircle className="w-4 h-4 text-red-500" />;
    return null;
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Basic details</h2>
        <p className="text-sm text-gray-500 mt-1">You can change these later in site settings.</p>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {siteType === 'blog' ? 'Blog name' : 'Store name'}
        </label>
        <input
          type="text"
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder={siteType === 'blog' ? "e.g. Arjun's Design Blog" : "e.g. Arjun's Creative Store"}
          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">URL</label>
        <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 focus-within:ring-2 focus-within:ring-indigo-500">
          <span className="px-3.5 py-2.5 text-sm text-gray-500 border-r border-gray-200 dark:border-gray-700 shrink-0 bg-gray-100 dark:bg-gray-800">
            digione.in/{siteType !== 'main' && mainSiteSlug ? `${mainSiteSlug}/` : ''}
          </span>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="your-slug"
            className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none text-gray-900 dark:text-white"
          />
          <span className="px-3">
            <SlugIcon />
          </span>
        </div>
        {slugStatus === 'available' && <p className="text-xs text-emerald-600 mt-1.5">✓ This URL is available</p>}
        {slugStatus === 'taken'     && <p className="text-xs text-red-600 mt-1.5">✗ This URL is already taken</p>}
        {slugStatus === 'invalid'   && <p className="text-xs text-red-600 mt-1.5">✗ 3–50 chars, lowercase letters, numbers, hyphens only</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description (optional)</label>
        <textarea
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Brief description shown in search results..."
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white resize-none placeholder-gray-400"
        />
      </div>

      {/* Product selector — only for single type */}
      {siteType === 'single' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Link a product</label>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              placeholder="Search your products..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            {products
              .filter((p: any) => p.name?.toLowerCase().includes(productSearch.toLowerCase()))
              .map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => setProductId(productId === p.id ? null : p.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 transition ${
                    productId === p.id
                      ? 'bg-indigo-50 dark:bg-indigo-500/10'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  } border-b border-gray-100 dark:border-gray-800 last:border-0`}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${productId === p.id ? 'bg-indigo-600' : 'bg-gray-300'}`} />
                  <span className="text-sm text-gray-900 dark:text-white">{p.name}</span>
                </button>
              ))}
            {products.length === 0 && <p className="text-sm text-gray-500 p-4">No published products yet</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 4 — Review ──────────────────────────────────────────
function StepReview({ siteType, title, slug, description, onEdit, mainSiteSlug }: {
  siteType: SiteType; title: string; slug: string;
  description: string; onEdit: (step: number) => void;
  mainSiteSlug?: string;
}) {
  const siteTypeMeta = SITE_TYPES.find(t => t.id === siteType)!;
  const rows = [
    { label: 'Type', value: siteTypeMeta.label, step: 1 },
    { label: 'Name', value: title || '—', step: 3 },
    { label: 'URL',  value: `digione.in/${siteType !== 'main' && mainSiteSlug ? `${mainSiteSlug}/` : ''}${slug}`, step: 3 },
    ...(description ? [{ label: 'Description', value: description, step: 3 }] : []),
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Review & create</h2>
        <p className="text-sm text-gray-500 mt-1">Everything look good? You can edit anything later.</p>
      </div>
      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{row.label}</p>
              <p className="text-sm text-gray-900 dark:text-white mt-0.5">{row.value}</p>
            </div>
            <button
              onClick={() => onEdit(row.step)}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────
export default function NewSitePage() {
  const router = useRouter();
  const { sites } = useSites();
  const mainSiteSlug = sites?.find(s => s.site_type === 'main' && s.is_active)?.slug || sites?.find(s => s.site_type === 'main')?.slug || undefined;

  const [step, setStep] = useState(1);
  const [siteType, setSiteType] = useState<SiteType | null>(null);
  const [template, setTemplate] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const slugStatus = useSlugCheck(slug, siteType);

  const canNext = () => {
    if (step === 1) return siteType !== null;
    if (step === 2) return template !== null;
    if (step === 3) return title.trim().length > 0 && slugStatus === 'available';
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/sites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_type: siteType, slug, title, description, product_id: productId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create site');
      router.push(`/dashboard/sites/${json.siteId}`);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  const STEP_LABELS = ['Choose type', 'Template', 'Details', 'Review'];

  return (
    <div className="pt-6 pb-24">
      {/* Back */}
      <button
        onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard/sites')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      {/* Progress steps */}
      <div className="flex items-center gap-3 mb-8">
        {STEP_LABELS.map((label, i) => (
          <React.Fragment key={i}>
            <StepPill step={i + 1} current={step} label={label} />
            {i < STEP_LABELS.length - 1 && <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />}
          </React.Fragment>
        ))}
      </div>

      {/* Content card */}
      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 md:p-8 max-w-2xl">
        {step === 1 && <StepType value={siteType} onChange={t => { setSiteType(t); setTemplate(null); }} />}
        {step === 2 && <StepTemplate siteType={siteType!} value={template} onChange={setTemplate} />}
        {step === 3 && (
          <StepDetails
            siteType={siteType!}
            title={title} setTitle={setTitle}
            slug={slug}   setSlug={setSlug}
            description={description} setDescription={setDescription}
            productId={productId} setProductId={setProductId}
            slugStatus={slugStatus}
            mainSiteSlug={mainSiteSlug}
          />
        )}
        {step === 4 && (
          <StepReview
            siteType={siteType!} title={title} slug={slug}
            description={description} onEdit={s => setStep(s)}
            mainSiteSlug={mainSiteSlug}
          />
        )}

        {submitError && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-xl">
            {submitError}
          </p>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-end mt-8">
          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {submitting ? 'Creating…' : 'Create store →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
