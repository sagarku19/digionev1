'use client';
// Product editor — edit basic info, pricing, files, marketing, settings for a single product.
// DB tables: products (read/write via useProducts)

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import {
  FileText, DollarSign, HardDrive, Megaphone, Settings,
  ArrowLeft, Save, UploadCloud, Image as ImageIcon,
  CheckCircle2, AlertCircle, Eye, Globe, Lock, Zap,
  Plus, X, Package, Tag,
} from 'lucide-react';

// ─── Shared constants & sub-components ───────────────────────

const INPUT = 'w-full px-4 py-2.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] text-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] focus:border-[var(--border-strong)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition';

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

const TABS = [
  { id: 'basic',     label: 'Basic Info',    icon: FileText   },
  { id: 'pricing',   label: 'Pricing',       icon: DollarSign },
  { id: 'content',   label: 'Content Files', icon: HardDrive  },
  { id: 'marketing', label: 'Marketing',     icon: Megaphone  },
  { id: 'settings',  label: 'Settings',      icon: Settings   },
];

function EditorCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 space-y-5 shadow-[var(--shadow-xs)]">
      <div>
        <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
        {subtitle && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-[var(--text-tertiary)] mt-1.5">{hint}</p>}
    </div>
  );
}

function WhatsIncludedEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const [draft, setDraft] = React.useState('');
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
            <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] bg-[var(--surface-muted)] px-3 py-2 rounded-lg">
              <Package className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
              <span className="flex-1">{item}</span>
              <button onClick={() => remove(i)} className="text-[var(--text-tertiary)] hover:text-[var(--danger)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          type="text" value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="e.g. 12 HD video lessons"
          className={INPUT}
        />
        <button onClick={add} className="flex items-center gap-1.5 px-3 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-[var(--radius-md)] text-sm font-semibold transition shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
    </div>
  );
}

// ─── Product Stats Sidebar ────────────────────────────────────

function ProductStatsSidebar({ product, onTogglePublish }: { product: any; onTogglePublish: () => void }) {
  const created = product.created_at
    ? new Date(product.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <aside className="hidden xl:flex flex-col gap-4 w-56 shrink-0 sticky top-36">
      {/* Status card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 space-y-3 shadow-[var(--shadow-xs)]">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Status</p>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm font-semibold ${
            product.is_published
              ? 'bg-[var(--success-bg)] text-[var(--success)]'
              : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
          }`}
        >
          {product.is_published
            ? <Globe className="w-4 h-4 shrink-0" />
            : <Lock className="w-4 h-4 shrink-0" />}
          {product.is_published ? 'Published' : 'Draft'}
        </div>
        <button
          onClick={onTogglePublish}
          className={`w-full text-xs font-semibold py-1.5 rounded-lg transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
            product.is_published
              ? 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              : 'bg-[var(--success)] hover:bg-[var(--success)]/90 text-white shadow-[var(--shadow-xs)]'
          }`}
        >
          {product.is_published ? 'Unpublish' : 'Publish now'}
        </button>
      </div>

      {/* Product details */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 space-y-3 shadow-[var(--shadow-xs)]">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Details</p>
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[var(--text-secondary)] text-xs">Price</span>
            <span className="font-semibold text-[var(--text-primary)] text-xs">
              {product.is_free ? 'Free' : product.price ? formatINR(product.price) : '—'}
            </span>
          </div>
          {product.compare_at_price && !product.is_free && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--text-secondary)] text-xs">Original</span>
              <span className="font-medium text-[var(--text-tertiary)] line-through text-xs">{formatINR(product.compare_at_price)}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[var(--text-secondary)] text-xs">Category</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-primary)] capitalize">
              <Tag className="w-2.5 h-2.5" />
              {product.category || 'digital'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[var(--text-secondary)] text-xs">Created</span>
            <span className="text-xs text-[var(--text-secondary)]">{created}</span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 space-y-2 shadow-[var(--shadow-xs)]">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Quick Actions</p>
        <a
          href={`/store/product/${product.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <Eye className="w-3.5 h-3.5" />
          Preview product page
        </a>
      </div>
    </aside>
  );
}

// ─── Main Page ─────────────────────────────────────────────────

export default function ProductEditor({ params }: { params: Promise<{ productId: string }> }) {
  const router = useRouter();
  const { products, updateProduct, isLoading } = useProducts();
  const resolvedParams = React.use(params);
  const productId = resolvedParams.productId;

  const [activeTab, setActiveTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // Local edits layered on top of the DB row
  const [edits, setEdits] = useState<Record<string, any>>({});

  // The source product from the query
  const sourceProduct = products.find((x: any) => x.id === productId) ?? null;
  // Merged: source fields + any local edits
  const formData: any = sourceProduct ? { ...sourceProduct, ...edits } : null;

  // Redirect only after query has finished AND product genuinely not found
  useEffect(() => {
    if (!isLoading && !sourceProduct) {
      router.replace(productId === 'new' ? '/dashboard/products?new=1' : '/dashboard/products');
    }
  }, [isLoading, sourceProduct, router, productId]);

  if (isLoading || !formData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
        <p className="text-sm text-[var(--text-secondary)]">Loading editor…</p>
      </div>
    );
  }

  const patch = (updates: any) => setEdits((prev: any) => ({ ...prev, ...updates }));

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // Allowlist only columns that exist in the products DB schema
      const updates = {
        name: formData.name,
        description: formData.description,
        price: formData.is_free ? 0 : (Number(formData.price) || 0),
        category: formData.category,
        thumbnail_url: formData.thumbnail_url ?? null,
        is_published: formData.is_published ?? false,
        is_on_discover_page: formData.is_on_discover_page ?? true,
        product_link: formData.product_link ?? null,
        post_purchase_url: formData.post_purchase_url ?? null,
        post_purchase_instructions: formData.post_purchase_instructions ?? null,
        metadata: formData.metadata ?? null,
        images: formData.images ?? [],
        is_licensable: formData.is_licensable ?? false,
        license_type: formData.license_type ?? null,
        license_terms: formData.license_terms ?? null,
      };

      await updateProduct({ id: productId, updates });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save: ${err?.message ?? 'Please try again.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pt-6 pb-24">
      {/* ── Inline Page Header ── */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/dashboard/products')}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Product Editor</p>
            <h1 className="text-base font-bold text-[var(--text-primary)] truncate">{formData.name}</h1>
          </div>
          <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${formData.is_published
            ? 'bg-[var(--success-bg)] text-[var(--success)]'
            : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
          }`}>
            {formData.is_published ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {formData.is_published ? 'Published' : 'Draft'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {saveSuccess && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[var(--success)]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-[var(--accent-fg)] px-4 py-2 rounded-[var(--radius-md)] text-sm font-semibold shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Layout ── */}
      <div className="flex flex-col md:flex-row gap-6">

        {/* Left tab nav */}
        <aside className="w-full md:w-52 shrink-0">
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0 sticky top-36">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${active
                    ? 'bg-[var(--surface-muted)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <tab.icon className={`w-4 h-4 shrink-0 ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Editor pane + right sidebar */}
        <div className="flex flex-1 gap-5 min-w-0 items-start">

          {/* Main editor content */}
          <main className="flex-1 min-w-0 space-y-5">

            {/* ── TAB: BASIC INFO ── */}
            {activeTab === 'basic' && (
              <div className="space-y-5">
                <EditorCard title="Product Details" subtitle="Basic information shown to buyers">
                  <Field label="Product Name">
                    <input
                      type="text" value={formData.name || ''} onChange={e => patch({ name: e.target.value })}
                      className={INPUT} placeholder="e.g. Complete Figma Mastery"
                    />
                  </Field>
                  <Field label="Description" hint="Explain what buyers get. Be specific.">
                    <textarea
                      rows={5} value={formData.description || ''} onChange={e => patch({ description: e.target.value })}
                      placeholder="Tell your buyers exactly what this product includes and who it's for…"
                      className={`${INPUT} resize-none`}
                    />
                  </Field>
                  <Field label="Category">
                    <select value={formData.category || 'digital'} onChange={e => patch({ category: e.target.value })} className={INPUT}>
                      <option value="digital">Digital File</option>
                      <option value="course">Course</option>
                      <option value="template">Template</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                </EditorCard>

                <EditorCard title="Thumbnail" subtitle="First impression matters — use a 16:9 image">
                  <div className="border-2 border-dashed border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden hover:border-[var(--accent)] transition cursor-pointer">
                    {formData.thumbnail_url ? (
                      <div className="relative group">
                        <img src={formData.thumbnail_url} alt="Thumbnail" className="w-full max-h-52 object-contain" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                          <button className="bg-white text-[var(--text-primary)] px-4 py-2 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Change</button>
                          <button onClick={() => patch({ thumbnail_url: null })} className="bg-[var(--danger)] text-white px-4 py-2 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Remove</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="w-12 h-12 bg-[var(--surface-muted)] rounded-[var(--radius-md)] flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-[var(--text-secondary)]" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">Click to upload</p>
                          <p className="text-xs text-[var(--text-tertiary)] mt-1">PNG, JPG, WEBP · 16:9 · Max 5MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                </EditorCard>

                <EditorCard title="What's Included" subtitle="Bullet points shown on the product sales page to highlight value">
                  <WhatsIncludedEditor
                    items={(formData.metadata as any)?.includes ?? []}
                    onChange={(items: string[]) => patch({ metadata: { ...(formData.metadata as any), includes: items } })}
                  />
                </EditorCard>
              </div>
            )}

            {/* ── TAB: PRICING ── */}
            {activeTab === 'pricing' && (
              <div className="space-y-5">
                <EditorCard title="Pricing Strategy" subtitle="Choose how buyers pay for this product">
                  <div className="flex items-center justify-between p-4 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border)]">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Make this product Free</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">Buyers can download without paying. Good for lead magnets.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={formData.is_free || false} onChange={e => patch({ is_free: e.target.checked })} />
                      <div className="w-11 h-6 bg-[var(--border)] peer-checked:bg-[var(--success)] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                    </label>
                  </div>

                  {!formData.is_free && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <Field label="Base Price (INR)">
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-medium text-sm">₹</span>
                          <input type="number" min="0" value={formData.price || 0} onChange={e => patch({ price: parseFloat(e.target.value) || 0 })} className={`${INPUT} pl-8 font-mono`} />
                        </div>
                      </Field>
                      <Field label="Compare-at Price (optional)" hint="Shows as strikethrough original price">
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-medium text-sm">₹</span>
                          <input type="number" min="0" value={formData.compare_at_price || ''} onChange={e => patch({ compare_at_price: parseFloat(e.target.value) || null })} className={`${INPUT} pl-8 font-mono`} placeholder="Optional" />
                        </div>
                      </Field>
                    </div>
                  )}

                  {!formData.is_free && (
                    <div className="mt-4 p-3 bg-[var(--surface-muted)] rounded-[var(--radius-md)] flex items-center gap-3">
                      <Zap className="w-4 h-4 text-[var(--text-primary)] shrink-0" />
                      <p className="text-xs text-[var(--text-primary)]">
                        <strong>Platform fee:</strong> DigiOne charges 10% on Free plan · 7% on Plus · 5% on Pro. You keep the rest.
                      </p>
                    </div>
                  )}
                </EditorCard>
              </div>
            )}

            {/* ── TAB: CONTENT FILES ── */}
            {activeTab === 'content' && (
              <div className="space-y-5">
                <EditorCard title="Product Access Link" subtitle="Where buyers go after a successful purchase">
                  <Field label="Post-Purchase URL" hint="Redirect buyers here after payment — e.g. a Google Drive link, Notion page, Gumroad download, or your own page.">
                    <input
                      type="url"
                      value={formData.post_purchase_url || ''}
                      onChange={e => patch({ post_purchase_url: e.target.value || null })}
                      className={INPUT}
                      placeholder="https://drive.google.com/file/..."
                    />
                  </Field>
                  <Field label="Access Instructions" hint="Optional message shown to buyers on the payment success page.">
                    <textarea
                      rows={3}
                      value={formData.post_purchase_instructions || ''}
                      onChange={e => patch({ post_purchase_instructions: e.target.value || null })}
                      className={`${INPUT} resize-none`}
                      placeholder="e.g. Download from the link above. Password: digione2024"
                    />
                  </Field>
                  <Field label="Preview / Demo Link" hint="Public link shown before purchase (e.g. a sample or demo). Optional.">
                    <input
                      type="url"
                      value={formData.product_link || ''}
                      onChange={e => patch({ product_link: e.target.value || null })}
                      className={INPUT}
                      placeholder="https://..."
                    />
                  </Field>
                </EditorCard>

                <EditorCard title="File Uploads" subtitle="Upload files buyers can download — coming soon">
                  <button className="w-full border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface-muted)]/50 text-[var(--text-tertiary)] py-10 rounded-[var(--radius-md)] flex flex-col items-center justify-center gap-2 transition cursor-not-allowed opacity-60 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                    <UploadCloud className="w-7 h-7" />
                    <span className="font-semibold text-sm">Upload New Asset</span>
                    <span className="text-xs">PDF · ZIP · MP4 · MP3 · Max 2GB per file · Coming soon</span>
                  </button>
                </EditorCard>
              </div>
            )}

            {/* ── TAB: MARKETING ── */}
            {activeTab === 'marketing' && (
              <div className="space-y-5">
                <EditorCard title="SEO &amp; Discoverability" subtitle="Control how your product appears on Google and social platforms">
                  <Field label="SEO Title">
                    <input type="text" className={INPUT} placeholder={formData.name || 'Same as product name by default'} />
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Recommended: 50–60 characters</p>
                  </Field>
                  <Field label="Meta Description">
                    <textarea rows={3} className={`${INPUT} resize-none`} placeholder="Brief summary for search engines (150–160 characters recommended)" />
                  </Field>
                </EditorCard>
              </div>
            )}

            {/* ── TAB: SETTINGS ── */}
            {activeTab === 'settings' && (
              <div className="space-y-5">
                <EditorCard title="Visibility" subtitle="Control whether buyers can see and purchase this product">
                  <div className="flex items-center justify-between p-4 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      {formData.is_published
                        ? <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                        : <AlertCircle className="w-5 h-5 text-[var(--warning)]" />
                      }
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {formData.is_published ? 'Published — live on your store' : 'Draft — hidden from buyers'}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {formData.is_published ? 'Buyers can view and purchase this product.' : 'Toggle on to make this product live.'}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={formData.is_published || false} onChange={e => patch({ is_published: e.target.checked })} />
                      <div className="w-11 h-6 bg-[var(--border)] peer-checked:bg-[var(--success)] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                    </label>
                  </div>
                </EditorCard>

                <EditorCard title="Discoverability" subtitle="Tags and visibility on the Discover page">
                  <Field label="Tags (comma separated)" hint="Help buyers find your product by adding relevant tags">
                    <input
                      type="text"
                      value={(formData as any).tags?.join(', ') || ''}
                      onChange={e => patch({ tags: e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean) } as any)}
                      className={INPUT}
                      placeholder="figma, design, ui, template"
                    />
                  </Field>
                  <div className="flex items-center justify-between p-4 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-[var(--text-secondary)]" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Show on Discover Page</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Make this product visible on the public Discover page</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox" className="sr-only peer"
                        checked={(formData as any).is_on_discover_page ?? true}
                        onChange={e => patch({ is_on_discover_page: e.target.checked } as any)}
                      />
                      <div className="w-11 h-6 bg-[var(--border)] peer-checked:bg-[var(--success)] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                    </label>
                  </div>
                </EditorCard>

                <div className="border border-[var(--danger)]/30 rounded-[var(--radius-lg)] p-6 bg-[var(--surface)] shadow-[var(--shadow-xs)]">
                  <h3 className="text-sm font-bold text-[var(--danger)] mb-1 uppercase tracking-wide">Danger Zone</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    Deleting this product is permanent and immediately removes buyer access. Existing orders are preserved for records.
                  </p>
                  <button className="text-sm font-semibold text-[var(--danger)] border border-[var(--danger)]/30 bg-[var(--danger-bg)] hover:bg-[var(--danger)]/20 px-4 py-2 rounded-[var(--radius-md)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                    Delete Product
                  </button>
                </div>
              </div>
            )}

          </main>

          {/* Right stats sidebar (xl screens only) */}
          <ProductStatsSidebar
            product={formData}
            onTogglePublish={() => patch({ is_published: !formData.is_published })}
          />

        </div>
      </div>
    </div>
  );
}
