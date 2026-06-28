'use client';
// Product editor — edit basic info, pricing, files, marketing, settings for a single product.
// DB tables: products (read/write via useProducts). Fields without a column
// (is_free, compare_at_price, tags, seo) round-trip through products.metadata.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/hooks/products/useProducts';
import { useProductFiles } from '@/hooks/products/useProductFiles';
import { useCreator } from '@/hooks/creator/useCreator';
import { useUnsavedChanges } from '@/hooks/site-editor/useUnsavedChanges';
import UnsavedChangesDialog from '@/components/dashboard/site-edit/editor/UnsavedChangesDialog';
import ImagePickerModal from '@/components/dashboard/image-picker/ImagePickerModal';
import DeliverablesUploader from '@/components/dashboard/products/DeliverablesUploader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import {
  FileText, IndianRupee, HardDrive, Megaphone, Settings,
  ArrowLeft, Save, ImagePlus, Image as ImageIcon,
  CheckCircle2, AlertCircle, Eye, ExternalLink, Globe, Lock, Zap,
  Plus, X, Package, Tag, Trash2, ShieldCheck, Boxes,
} from 'lucide-react';
import { formatINR } from '@/lib/format';
import type { Database, Json } from '@/types/database.types';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];
type ProductMeta = {
  includes?: string[];
  is_free?: boolean;
  compare_at_price?: number | null;
  tags?: string[];
  seo?: { title?: string; description?: string };
};

// ─── Shared constants & sub-components ───────────────────────

const INPUT =
  'w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-shadow focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)]';

const TABS = [
  { id: 'basic',     label: 'Basic Info',    icon: FileText    },
  { id: 'pricing',   label: 'Pricing',       icon: IndianRupee },
  { id: 'content',   label: 'Content Files', icon: HardDrive   },
  { id: 'marketing', label: 'Marketing',     icon: Megaphone   },
  { id: 'settings',  label: 'Settings',      icon: Settings    },
];

function EditorCard({ icon: Icon, title, subtitle, children }: { icon?: React.ElementType; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
          {Icon && <Icon className="h-4 w-4 text-[var(--brand)]" />}
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; ariaLabel: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${checked ? 'bg-[var(--success)]' : 'border border-[var(--border)] bg-[var(--surface-muted)]'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function TagEditor({ items, placeholder, onChange }: { items: string[]; placeholder: string; onChange: (items: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const parts = draft.split(',').map((t) => t.trim()).filter(Boolean);
    if (parts.length === 0) return;
    onChange([...items, ...parts.filter((p) => !items.includes(p))]);
    setDraft('');
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]">
              <Tag className="h-2.5 w-2.5 text-[var(--text-tertiary)]" />
              {item}
              <button onClick={() => remove(i)} aria-label={`Remove ${item}`} className="text-[var(--text-tertiary)] transition hover:text-[var(--danger)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder} className={INPUT}
        />
        <button onClick={add} className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
    </div>
  );
}

function WhatsIncludedEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onChange([...items, t]);
    setDraft('');
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-secondary)]">
              <Package className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />
              <span className="flex-1">{item}</span>
              <button onClick={() => remove(i)} aria-label="Remove item" className="text-[var(--text-tertiary)] transition hover:text-[var(--danger)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="e.g. 12 HD video lessons" className={INPUT}
        />
        <button onClick={add} className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
    </div>
  );
}

// ─── Live storefront preview ──────────────────────────────────

function ProductPreview({ data }: { data: ProductRow }) {
  const { profile } = useCreator();
  const meta = (data.metadata as ProductMeta | null) ?? {};
  const isFree = meta.is_free ?? data.price === 0;
  const compareAt = meta.compare_at_price ?? null;
  const includes = meta.includes ?? [];
  const priceLabel = isFree ? 'Free' : data.price ? formatINR(data.price) : '₹0';

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Eye className="h-4 w-4 text-[var(--text-secondary)]" /> Live preview
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-tertiary)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
          </span>
          Auto-updating
        </span>
      </div>
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
        <div className="relative flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-[var(--brand)]/10 to-[var(--brand)]/[0.03]">
          {data.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.thumbnail_url} alt={data.name || 'Product'} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-9 w-9 text-[var(--brand)]/40" />
          )}
          {/* Category badge — same as the discover card (top-left over the image) */}
          <div className="absolute left-3 top-3">
            <span className="font-ledger rounded-md bg-[#16130F]/85 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.14em] text-white backdrop-blur-md">
              {data.category || 'digital'}
            </span>
          </div>
        </div>
        <div className="p-5">
          <h2 className="text-xl font-bold leading-tight tracking-tight text-[var(--text-primary)]">{data.name || 'Untitled product'}</h2>
          {data.description && <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">{data.description}</p>}

          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">{priceLabel}</span>
            {!isFree && compareAt ? <span className="text-base text-[var(--text-tertiary)] line-through">{formatINR(compareAt)}</span> : null}
          </div>

          {includes.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-[var(--border-subtle)] pt-4">
              {includes.slice(0, 5).map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
                  <span className="truncate">{item}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Creator — same as the discover card (bottom) */}
          <div className="mt-4 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--brand)]">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[9px] font-bold text-white">{(profile?.full_name || 'C').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="truncate text-[12px] font-medium text-[var(--text-secondary)]">{profile?.full_name || 'Creator'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────

export default function ProductEditor({ params }: { params: Promise<{ productId: string }> }) {
  const router = useRouter();
  const { products, updateProduct, deleteProduct, isLoading, isUpdating } = useProducts();
  const resolvedParams = React.use(params);
  const productId = resolvedParams.productId;

  const [activeTab, setActiveTab] = useState('basic');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [picker, setPicker] = useState<null | 'thumbnail' | 'gallery'>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { confirm, confirmDialog } = useConfirm();
  const { files: deliverableFiles } = useProductFiles(productId);

  // Local edits layered on top of the DB row
  const [edits, setEdits] = useState<Partial<ProductRow>>({});

  const sourceProduct = (products.find((x) => x.id === productId) as ProductRow | undefined) ?? null;
  const formData = useMemo<ProductRow | null>(() => (sourceProduct ? { ...sourceProduct, ...edits } : null), [sourceProduct, edits]);

  // Redirect only after the query finished AND the product genuinely isn't found
  useEffect(() => {
    if (!isLoading && !sourceProduct) {
      router.replace(productId === 'new' ? '/dashboard/products?new=1' : '/dashboard/products');
    }
  }, [isLoading, sourceProduct, router, productId]);

  const patch = useCallback((updates: Partial<ProductRow>) => {
    setEdits((prev) => ({ ...prev, ...updates }));
    setDirty(true);
  }, []);

  // Publish state drives Discover visibility: publishing lists the product on the
  // Discover page, unpublishing removes it.
  const setPublished = useCallback((v: boolean) => {
    patch({ is_published: v, is_on_discover_page: v });
  }, [patch]);

  const handleSave = useCallback(async () => {
    if (!formData) return;
    setSaveSuccess(false);
    const meta = (formData.metadata as ProductMeta | null) ?? {};
    const isFree = meta.is_free ?? formData.price === 0;
    try {
      const updates: ProductUpdate = {
        name: formData.name,
        description: formData.description,
        price: isFree ? 0 : (Number(formData.price) || 0),
        category: formData.category,
        thumbnail_url: formData.thumbnail_url ?? null,
        images: (formData.images ?? []) as Json,
        stock_count: formData.stock_count ?? null,
        is_published: formData.is_published ?? false,
        is_on_discover_page: formData.is_on_discover_page ?? true,
        product_link: formData.product_link ?? null,
        post_purchase_url: formData.post_purchase_url ?? null,
        post_purchase_instructions: formData.post_purchase_instructions ?? null,
        is_licensable: formData.is_licensable ?? false,
        license_type: formData.license_type ?? null,
        license_terms: formData.license_terms ?? null,
        metadata: meta as unknown as Json,
      };
      await updateProduct({ id: productId, updates });
      setDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      alert(`Failed to save: ${err instanceof Error ? err.message : 'Please try again.'}`);
    }
  }, [formData, productId, updateProduct]);

  // ── Leave guard (shared with the site editors) ──
  const { pendingNav, guardedNavigate, cancel, discardAndLeave, saveAndLeave } = useUnsavedChanges(dirty, handleSave);

  const handleDelete = useCallback(async () => {
    await deleteProduct(productId);
    setDirty(false);
    router.push('/dashboard/products');
  }, [deleteProduct, productId, router]);

  if (isLoading || !formData) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
        <p className="text-sm text-[var(--text-secondary)]">Loading editor…</p>
      </div>
    );
  }

  const meta = (formData.metadata as ProductMeta | null) ?? {};
  const isFree = meta.is_free ?? formData.price === 0;
  const canPreview = !!(formData.is_published || formData.is_on_discover_page);
  const images = (formData.images as string[] | null) ?? [];
  const patchMeta = (u: Partial<ProductMeta>) => patch({ metadata: { ...meta, ...u } as unknown as Json });

  // Publish readiness — must-fix (red) + soft suggestions, shown above the preview.
  const mustFix: string[] = [];
  if (!formData.name?.trim()) mustFix.push('Add a product name');
  if (!formData.thumbnail_url) mustFix.push('Add a cover image');
  if (!formData.description?.trim()) mustFix.push('Write a description');
  if (!isFree && (formData.price ?? 0) <= 0) mustFix.push('Set a price, or switch it to Free');
  if (!formData.post_purchase_url?.trim() && deliverableFiles.length === 0) mustFix.push('Add a file or an access link buyers receive');

  const tips: string[] = [];
  if (images.length === 0) tips.push('Add gallery images for a richer page');
  if ((meta.includes ?? []).length === 0) tips.push('List “what’s included” to lift conversions');
  if (!meta.seo?.title && !meta.seo?.description) tips.push('Write an SEO title & description');
  if ((meta.tags ?? []).length === 0) tips.push('Add a few tags so buyers can find it');

  return (
    <div className="mx-auto max-w-6xl pt-6 pb-24">
      {/* ── Inline Page Header ── */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => guardedNavigate('/dashboard/products')}
            aria-label="Back to products"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">Product Editor</p>
            <h1 className="truncate text-base font-semibold text-[var(--text-primary)]">{formData.name || 'Untitled product'}</h1>
          </div>
          <span className={`hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${formData.is_published ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'}`}>
            {formData.is_published ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {formData.is_published ? 'Published' : 'Draft'}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {saveSuccess && (
            <span className="hidden items-center gap-1.5 text-xs font-medium text-[var(--success)] sm:flex">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          {canPreview ? (
            <a
              href={`/discover/${formData.id}`} target="_blank" rel="noopener noreferrer"
              title="Preview product page"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Preview
            </a>
          ) : (
            <button
              type="button" disabled
              title="Publish or list on Discover to preview"
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-medium text-[var(--text-tertiary)] opacity-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Preview
            </button>
          )}
          <button
            type="button" onClick={() => setPublished(!formData.is_published)}
            className="hidden items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] sm:inline-flex"
          >
            {formData.is_published ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
            {formData.is_published ? 'Unpublish' : 'Publish'}
          </button>
          <button
            type="button" onClick={handleSave} disabled={isUpdating || !dirty}
            className={`flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold shadow-[var(--shadow-xs)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${dirty ? 'bg-[var(--brand)] text-[var(--text-on-brand)] hover:bg-[var(--brand-hover)]' : 'cursor-not-allowed border border-[var(--border)] bg-[var(--surface)] text-[var(--text-tertiary)]'} disabled:opacity-60`}
          >
            <Save className="h-4 w-4" />
            {isUpdating ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </button>
        </div>
      </div>

      {/* ── Split: form (left) · live preview (right) ── */}
      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1fr_minmax(340px,400px)]">
        <div className="min-w-0">
          {/* Tab pills */}
          <div className="mb-6 inline-flex flex-wrap gap-1 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] p-1">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-[var(--radius-md)] px-3.5 py-2 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${active ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  <tab.icon className={`h-[15px] w-[15px] shrink-0 ${active ? 'text-[var(--brand)]' : 'text-[var(--text-tertiary)]'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Content ── */}
          <main className="space-y-5">

            {/* ── TAB: BASIC INFO ── */}
            {activeTab === 'basic' && (
              <div className="space-y-5">
                <EditorCard icon={FileText} title="Product Details" subtitle="Basic information shown to buyers">
                  <Field label="Product Name">
                    <input type="text" value={formData.name || ''} onChange={(e) => patch({ name: e.target.value })} className={INPUT} placeholder="e.g. Complete Figma Mastery" />
                  </Field>
                  <Field label="Description" hint="Explain what buyers get. Be specific.">
                    <textarea rows={5} value={formData.description || ''} onChange={(e) => patch({ description: e.target.value })} placeholder="Tell your buyers exactly what this product includes and who it's for…" className={`${INPUT} resize-none`} />
                  </Field>
                  <Field label="Category">
                    <select value={formData.category || 'digital'} onChange={(e) => patch({ category: e.target.value })} className={INPUT}>
                      <option value="digital">Digital File</option>
                      <option value="course">Course</option>
                      <option value="template">Template</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                </EditorCard>

                <EditorCard icon={ImageIcon} title="Thumbnail" subtitle="First impression matters — use a 16:9 image">
                  <div className="overflow-hidden rounded-[var(--radius-md)] border-2 border-dashed border-[var(--border)] transition hover:border-[var(--brand)]/40">
                    {formData.thumbnail_url ? (
                      <div className="group relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={formData.thumbnail_url} alt="Thumbnail" className="max-h-52 w-full object-contain" />
                        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/50 opacity-0 transition group-hover:opacity-100">
                          <button onClick={() => setPicker('thumbnail')} className="rounded-lg bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Change</button>
                          <button onClick={async () => { if (await confirm({ title: 'Remove cover image?', description: 'The cover will be cleared. The image stays in your Media Library.' })) patch({ thumbnail_url: null }); }} className="rounded-lg bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-[var(--text-on-brand)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Remove</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setPicker('thumbnail')} className="flex w-full flex-col items-center justify-center gap-3 py-12 transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)]">
                          <ImagePlus className="h-6 w-6 text-[var(--text-secondary)]" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">Click to upload</p>
                          <p className="mt-1 text-xs text-[var(--text-tertiary)]">PNG, JPG, WEBP · 16:9 · Max 5MB</p>
                        </div>
                      </button>
                    )}
                  </div>
                </EditorCard>

                <EditorCard icon={Package} title="What's Included" subtitle="Bullet points shown on the product sales page to highlight value">
                  <WhatsIncludedEditor
                    items={meta.includes ?? []}
                    onChange={(items) => patchMeta({ includes: items })}
                  />
                </EditorCard>
              </div>
            )}

            {/* ── TAB: PRICING ── */}
            {activeTab === 'pricing' && (
              <div className="space-y-5">
                <EditorCard icon={IndianRupee} title="Pricing Strategy" subtitle="Choose how buyers pay for this product">
                  <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Make this product Free</p>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Buyers can download without paying. Good for lead magnets.</p>
                    </div>
                    <Toggle checked={isFree} ariaLabel="Make product free" onChange={(v) => patchMeta({ is_free: v })} />
                  </div>

                  {!isFree && (
                    <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Base Price (INR)">
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--text-secondary)]">₹</span>
                          <input type="number" min="0" step="any" inputMode="decimal" placeholder="0" value={formData.price || ''} onChange={(e) => patch({ price: parseFloat(e.target.value) || 0 })} className={`${INPUT} pl-8 font-mono`} />
                        </div>
                      </Field>
                      <Field label="Compare-at Price (optional)" hint="Shows as a strikethrough original price">
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--text-secondary)]">₹</span>
                          <input type="number" min="0" value={meta.compare_at_price ?? ''} onChange={(e) => patchMeta({ compare_at_price: e.target.value ? parseFloat(e.target.value) : null })} className={`${INPUT} pl-8 font-mono`} placeholder="Optional" />
                        </div>
                      </Field>
                    </div>
                  )}

                  {!isFree && (
                    <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                      <Zap className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                      <p className="text-xs text-[var(--text-primary)]">
                        <strong>Platform fee:</strong> DigiOne charges 10% on Free plan · 7% on Plus · 5% on Pro. You keep the rest.
                      </p>
                    </div>
                  )}
                </EditorCard>

                <EditorCard icon={Boxes} title="Inventory" subtitle="Limit how many times this product can be sold">
                  <Field label="Stock count" hint="Leave blank for unlimited sales.">
                    <input
                      type="number" min="0"
                      value={formData.stock_count ?? ''}
                      onChange={(e) => patch({ stock_count: e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className={`${INPUT} font-mono`} placeholder="Unlimited"
                    />
                  </Field>
                </EditorCard>
              </div>
            )}

            {/* ── TAB: CONTENT FILES ── */}
            {activeTab === 'content' && (
              <div className="space-y-5">
                <EditorCard icon={HardDrive} title="Deliverable Files" subtitle="Upload the files buyers download after purchase">
                  <DeliverablesUploader productId={productId} />
                </EditorCard>

                <EditorCard icon={HardDrive} title="Product Access Link" subtitle="Where buyers go after a successful purchase">
                  <Field label="Post-Purchase URL" hint="Redirect buyers here after payment — e.g. a Google Drive link, Notion page, or your own page.">
                    <input type="url" value={formData.post_purchase_url || ''} onChange={(e) => patch({ post_purchase_url: e.target.value || null })} className={INPUT} placeholder="https://drive.google.com/file/..." />
                  </Field>
                  <Field label="Access Instructions" hint="Optional message shown to buyers on the payment success page.">
                    <textarea rows={3} value={formData.post_purchase_instructions || ''} onChange={(e) => patch({ post_purchase_instructions: e.target.value || null })} className={`${INPUT} resize-none`} placeholder="e.g. Download from the link above. Password: digione2024" />
                  </Field>
                  <Field label="Preview / Demo Link" hint="Public link shown before purchase (e.g. a sample or demo). Optional.">
                    <input type="url" value={formData.product_link || ''} onChange={(e) => patch({ product_link: e.target.value || null })} className={INPUT} placeholder="https://..." />
                  </Field>
                </EditorCard>

                <EditorCard icon={ImageIcon} title="Gallery Images" subtitle="Extra images shown on the product page alongside the thumbnail">
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {images.map((img, i) => (
                      <div key={i} className="group relative aspect-square overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={`Gallery ${i + 1}`} className="h-full w-full object-cover" />
                        <button
                          onClick={async () => { if (await confirm({ title: 'Remove image?', description: 'This image will be removed from the gallery. It stays in your Media Library.' })) patch({ images: images.filter((_, idx) => idx !== i) as Json }); }}
                          aria-label="Remove image"
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setPicker('gallery')}
                      className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--border)] text-[var(--text-tertiary)] transition hover:border-[var(--brand)]/40 hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-[11px] font-medium">Add image</span>
                    </button>
                  </div>
                </EditorCard>
              </div>
            )}

            {/* ── TAB: MARKETING ── */}
            {activeTab === 'marketing' && (
              <div className="space-y-5">
                <EditorCard icon={Megaphone} title="SEO &amp; Discoverability" subtitle="Control how your product appears on Google and social platforms">
                  <Field label="SEO Title" hint="Recommended: 50–60 characters">
                    <input type="text" value={meta.seo?.title ?? ''} onChange={(e) => patchMeta({ seo: { ...meta.seo, title: e.target.value } })} className={INPUT} placeholder={formData.name || 'Same as product name by default'} />
                  </Field>
                  <Field label="Meta Description" hint="150–160 characters recommended">
                    <textarea rows={3} value={meta.seo?.description ?? ''} onChange={(e) => patchMeta({ seo: { ...meta.seo, description: e.target.value } })} className={`${INPUT} resize-none`} placeholder="Brief summary for search engines" />
                  </Field>
                </EditorCard>

                <EditorCard icon={Tag} title="Tags" subtitle="Keywords that help buyers find this product">
                  <TagEditor items={meta.tags ?? []} placeholder="figma, design, ui (comma separated)" onChange={(tags) => patchMeta({ tags })} />
                </EditorCard>
              </div>
            )}

            {/* ── TAB: SETTINGS ── */}
            {activeTab === 'settings' && (
              <div className="space-y-5">
                <EditorCard icon={Settings} title="Visibility" subtitle="Control whether buyers can see and purchase this product">
                  <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <div className="flex items-center gap-3">
                      {formData.is_published ? <CheckCircle2 className="h-5 w-5 text-[var(--success)]" /> : <AlertCircle className="h-5 w-5 text-[var(--warning)]" />}
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{formData.is_published ? 'Published — live on your store' : 'Draft — hidden from buyers'}</p>
                        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{formData.is_published ? 'Buyers can view and purchase this product.' : 'Toggle on to make this product live.'}</p>
                      </div>
                    </div>
                    <Toggle checked={formData.is_published ?? false} ariaLabel="Toggle published" onChange={setPublished} />
                  </div>
                  <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-[var(--text-secondary)]" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Show on Discover Page</p>
                        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Make this product visible on the public Discover page</p>
                      </div>
                    </div>
                    <Toggle checked={formData.is_on_discover_page ?? true} ariaLabel="Toggle discover visibility" onChange={(v) => patch({ is_on_discover_page: v })} />
                  </div>
                </EditorCard>

                <EditorCard icon={ShieldCheck} title="Licensing" subtitle="Offer this product under a usage license">
                  <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Sell with a license</p>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Attach license terms buyers agree to at purchase.</p>
                    </div>
                    <Toggle checked={formData.is_licensable ?? false} ariaLabel="Toggle licensing" onChange={(v) => patch({ is_licensable: v })} />
                  </div>
                  {formData.is_licensable && (
                    <>
                      <Field label="License Type">
                        <select value={formData.license_type || 'personal'} onChange={(e) => patch({ license_type: e.target.value })} className={INPUT}>
                          <option value="personal">Personal use</option>
                          <option value="commercial">Commercial use</option>
                          <option value="extended">Extended / resale</option>
                        </select>
                      </Field>
                      <Field label="License Terms" hint="Shown to buyers before purchase.">
                        <textarea rows={4} value={formData.license_terms || ''} onChange={(e) => patch({ license_terms: e.target.value || null })} className={`${INPUT} resize-none`} placeholder="Describe what buyers can and cannot do with this product…" />
                      </Field>
                    </>
                  )}
                </EditorCard>

                <div className="rounded-[var(--radius-xl)] border border-[var(--danger)]/30 bg-[var(--surface)] p-6 shadow-[var(--shadow-xs)]">
                  <h3 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--danger)]">
                    <Trash2 className="h-4 w-4" /> Danger Zone
                  </h3>
                  <p className="mb-4 text-sm text-[var(--text-secondary)]">
                    Deleting this product hides it everywhere and removes buyer access. Existing orders are preserved for records.
                  </p>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-[var(--radius-md)] border border-[var(--danger)]/30 bg-[var(--danger-bg)] px-4 py-2 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)]/20 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    Delete Product
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Live preview column */}
        <div className="lg:sticky lg:top-24 space-y-5">
          {/* Publish readiness — plain text, no box */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Before you publish</p>
            {mustFix.length === 0 ? (
              <p className="flex items-center gap-2 text-[13px] font-medium text-[var(--success)]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Looks ready to publish
              </p>
            ) : (
              <ul className="space-y-1.5">
                {mustFix.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-[13px] font-medium text-[var(--danger)]">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
            {tips.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {tips.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-[12.5px] text-[var(--text-tertiary)]">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--text-tertiary)]" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ProductPreview data={formData} />
        </div>
      </div>

      {/* ── Modals ── */}
      {confirmDialog}
      {picker && (
        <ImagePickerModal
          open
          bucket="creator-public"
          kind={picker === 'thumbnail' ? 'cover' : 'gallery'}
          currentUrl={picker === 'thumbnail' ? (formData.thumbnail_url ?? undefined) : undefined}
          onClose={() => setPicker(null)}
          onSelect={(url) => {
            if (picker === 'thumbnail') patch({ thumbnail_url: url });
            else patch({ images: [...images, url] as Json });
            setPicker(null);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete product?"
        description="This hides the product from your store and Discover, and revokes buyer access. Existing orders keep their records. This cannot be undone from here."
        confirmLabel="Delete product"
        isDestructive
      />

      <UnsavedChangesDialog open={!!pendingNav} saving={isUpdating} onCancel={cancel} onDiscard={discardAndLeave} onSave={saveAndLeave} />
    </div>
  );
}
