'use client';
// Product editor — edit basic info, pricing, files, marketing, settings for a single product.
// DB tables: products (read/write via useProducts)

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import {
  FileText, DollarSign, HardDrive, Megaphone, Settings,
  ArrowLeft, Save, UploadCloud, Trash2, Image as ImageIcon,
  CheckCircle2, AlertCircle, Eye, Globe, Lock, Zap
} from 'lucide-react';

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

const TABS = [
  { id: 'basic', label: 'Basic Info', icon: FileText },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'content', label: 'Content Files', icon: HardDrive },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function ProductEditor({ params }: { params: Promise<{ productId: string }> }) {
  const router = useRouter();
  const { products, updateProduct, isLoading } = useProducts();
  const resolvedParams = React.use(params);
  const productId = resolvedParams.productId;

  const [activeTab, setActiveTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && products.length > 0) {
      const p = products.find((x: any) => x.id === productId);
      if (p && !formData) setFormData(p);
    }
  }, [products, isLoading, productId, formData]);

  if (isLoading || !formData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-500">Loading editor…</p>
      </div>
    );
  }

  const patch = (updates: any) => setFormData((prev: any) => ({ ...prev, ...updates }));

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const { id, created_at, updated_at, creator_id, ...updates } = formData;
      await updateProduct({ id: productId, updates });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-24">
      {/* ── Fixed Header — position:fixed avoids sticky-inside-overflow-hidden bug ── */}
      <div className="fixed top-16 left-0 md:left-[240px] right-0 z-20 px-4 md:px-6 py-3.5 bg-white/95 dark:bg-[#060612]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => router.push('/dashboard/products')}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Product Editor</p>
              <h1 className="text-base font-bold text-gray-900 dark:text-white truncate">{formData.name}</h1>
            </div>
            {/* Live status chip */}
            <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${formData.is_published
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
              {formData.is_published ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {formData.is_published ? 'Published' : 'Draft'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {saveSuccess && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
      {/* Spacer — reserves space for the fixed header above */}
      <div className="h-[57px]" />

      {/* ── Layout ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-6 mt-4">

        {/* Tab sidebar */}
        <aside className="w-full md:w-52 shrink-0">
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0 sticky top-36">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${active
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  <tab.icon className={`w-4 h-4 shrink-0 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Editor pane */}
        <main className="flex-1 min-w-0 space-y-5">

          {/* ── TAB 1: BASIC INFO ──────────────────────────────── */}
          {activeTab === 'basic' && (
            <div className="space-y-5">
              <Card title="Product Details" subtitle="Basic information shown to buyers">
                <Field label="Product Name">
                  <input
                    type="text" value={formData.name || ''} onChange={e => patch({ name: e.target.value })}
                    className={INPUT}
                    placeholder="e.g. Complete Figma Mastery"
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
                  <select
                    value={formData.category || 'digital'}
                    onChange={e => patch({ category: e.target.value })}
                    className={INPUT}
                  >
                    <option value="digital">Digital File</option>
                    <option value="course">Course</option>
                    <option value="template">Template</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
              </Card>

              <Card title="Thumbnail" subtitle="First impression matters — use a 16:9 image">
                <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-indigo-400 transition cursor-pointer">
                  {formData.thumbnail_url ? (
                    <div className="relative group">
                      <img src={formData.thumbnail_url} alt="Thumbnail" className="w-full max-h-52 object-contain" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                        <button className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold">Change</button>
                        <button onClick={() => patch({ thumbnail_url: null })} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">Remove</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-indigo-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Click to upload</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP · 16:9 · Max 5MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ── TAB 2: PRICING ─────────────────────────────────── */}
          {activeTab === 'pricing' && (
            <div className="space-y-5">
              <Card title="Pricing Strategy" subtitle="Choose how buyers pay for this product">
                {/* Free toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Make this product Free</p>
                    <p className="text-xs text-gray-500 mt-0.5">Buyers can download without paying. Good for lead magnets.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={formData.is_free || false} onChange={e => patch({ is_free: e.target.checked })} />
                    <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-checked:bg-indigo-600 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>

                {!formData.is_free && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <Field label="Base Price (INR)">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₹</span>
                        <input
                          type="number" min="0" value={formData.price || 0} onChange={e => patch({ price: parseFloat(e.target.value) || 0 })}
                          className={`${INPUT} pl-8 font-mono`}
                        />
                      </div>
                    </Field>
                    <Field label="Compare-at Price (optional)" hint="Shows as strikethrough original price">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₹</span>
                        <input
                          type="number" min="0" value={formData.compare_at_price || ''} onChange={e => patch({ compare_at_price: parseFloat(e.target.value) || null })}
                          className={`${INPUT} pl-8 font-mono`} placeholder="Optional"
                        />
                      </div>
                    </Field>
                  </div>
                )}

                {!formData.is_free && (
                  <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center gap-3">
                    <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <p className="text-xs text-indigo-700 dark:text-indigo-400">
                      <strong>Platform fee:</strong> DigiOne charges 10% on Free plan · 7% on Plus · 5% on Pro. You keep the rest.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ── TAB 3: CONTENT FILES ───────────────────────────── */}
          {activeTab === 'content' && (
            <Card title="Digital Delivery" subtitle="Files buyers receive after purchase — protected by zero-trust access">
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 mb-4">
                {/* Placeholder file row */}
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 group">
                  <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">Sample_Module_1.zip</p>
                    <p className="text-xs text-gray-500">24.5 MB · Uploaded 2 mins ago</p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button className="w-full border-2 border-dashed border-indigo-200 dark:border-indigo-900 hover:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 py-8 rounded-xl flex flex-col items-center justify-center gap-2 transition">
                <UploadCloud className="w-7 h-7" />
                <span className="font-semibold text-sm">Upload New Asset</span>
                <span className="text-xs opacity-70">PDF · ZIP · MP4 · MP3 · Max 2GB per file</span>
              </button>
            </Card>
          )}

          {/* ── TAB 4: MARKETING ───────────────────────────────── */}
          {activeTab === 'marketing' && (
            <div className="space-y-5">
              <Card title="SEO &amp; Discoverability" subtitle="Control how your product appears on Google and social platforms">
                <Field label="SEO Title">
                  <input
                    type="text"
                    className={INPUT}
                    placeholder={formData.name || 'Same as product name by default'}
                  />
                  <p className="text-xs text-gray-400 mt-1">Recommended: 50–60 characters</p>
                </Field>
                <Field label="Meta Description">
                  <textarea
                    rows={3}
                    className={`${INPUT} resize-none`}
                    placeholder="Brief summary for search engines (150–160 characters recommended)"
                  />
                </Field>
                <Field label="Tags (comma separated)">
                  <input
                    type="text"
                    value={formData.tags?.join(', ') || ''}
                    onChange={e => patch({ tags: e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean) })}
                    className={INPUT}
                    placeholder="figma, design, ui, template"
                  />
                </Field>
              </Card>
            </div>
          )}

          {/* ── TAB 5: SETTINGS ────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              {/* Publish toggle */}
              <Card title="Visibility" subtitle="Control whether buyers can see and purchase this product">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    {formData.is_published
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      : <AlertCircle className="w-5 h-5 text-amber-500" />
                    }
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formData.is_published ? 'Published — live on your store' : 'Draft — hidden from buyers'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formData.is_published ? 'Buyers can view and purchase this product.' : 'Toggle on to make this product live.'}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={formData.is_published || false} onChange={e => patch({ is_published: e.target.checked })} />
                    <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-checked:bg-emerald-500 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>
              </Card>

              {/* Danger zone */}
              <div className="border border-red-200 dark:border-red-900/40 rounded-2xl p-6 bg-white dark:bg-[#0A0A1A]">
                <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-1 uppercase tracking-wide">Danger Zone</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Deleting this product is permanent and immediately removes buyer access. Existing orders are preserved for records.
                </p>
                <button className="text-sm font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 px-4 py-2 rounded-xl transition">
                  Delete Product
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────────
const INPUT = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-5">
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}
