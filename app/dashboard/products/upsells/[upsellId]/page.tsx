'use client';
// Upsell page editor — full-page edit for an upsell checkout page.
// DB tables: upsell_pages (via useUpsellPages), products (via useProducts)

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUpsellPage, useUpsellPages } from '@/hooks/useUpsellPages';
import { useProducts } from '@/hooks/useProducts';
import { getUpsellDisplayUrl, getUpsellPublicPath } from '@/lib/site-urls';
import {
  ArrowLeft, Settings, Package, Mail, Palette, Globe, Shield,
  Loader2, CheckCircle2, X, ExternalLink, Copy, Eye,
} from 'lucide-react';
import { formatINR } from '@/lib/format';

const INPUT = 'w-full px-4 py-2.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] text-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] focus:border-[var(--border-strong)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition';

type Tab = 'config' | 'products' | 'contact' | 'theme' | 'seo';
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'config', label: 'Page', icon: Settings },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'contact', label: 'Contact', icon: Mail },
  { id: 'theme', label: 'Theme', icon: Palette },
  { id: 'seo', label: 'SEO', icon: Globe },
];

export default function UpsellEditPage() {
  const router = useRouter();
  const { upsellId } = useParams<{ upsellId: string }>();
  const { data: page, isLoading: pageLoading } = useUpsellPage(upsellId);
  const { updateUpsellPage, isUpdating } = useUpsellPages();
  const { products } = useProducts();

  const [tab, setTab] = useState<Tab>('config');
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync draft when page loads
  useEffect(() => {
    if (page) {
      setDraft({
        title: page.title,
        slug: page.slug,
        is_published: page.is_published,
        upsell_product_ids: page.upsell_product_ids ?? [],
        config: page.config ?? {},
      });
    }
  }, [page?.id]);

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-[var(--text-secondary)] animate-spin" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Upsell page not found</h2>
        <button onClick={() => router.push('/dashboard/products')} className="text-[var(--text-secondary)] text-sm hover:underline mt-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          Back to products
        </button>
      </div>
    );
  }

  const config = draft.config ?? {};
  const patchConfig = (key: string, value: any) => setDraft(d => ({ ...d, config: { ...d.config, [key]: value } }));
  const patchTheme = (key: string, value: string) => setDraft(d => ({
    ...d, config: { ...d.config, theme: { ...(d.config?.theme ?? {}), [key]: value } },
  }));
  const contactFields = config.contact_fields ?? { show_email: true, show_phone: false, show_name: true };

  const primaryProduct = products.find(p => p.id === page.primary_product_id);
  const upsellProducts = (draft.upsell_product_ids ?? [])
    .map((id: string) => products.find((p: any) => p.id === id))
    .filter(Boolean);
  const availableForUpsell = products.filter(
    (p: any) => p.id !== page.primary_product_id && !(draft.upsell_product_ids ?? []).includes(p.id)
  );

  const handleSave = async () => {
    await updateUpsellPage({ id: page.id, updates: draft });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${getUpsellPublicPath(draft.slug || page.slug)}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="pt-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/products')}
            className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{draft.title || page.title}</h1>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{getUpsellDisplayUrl(draft.slug || page.slug)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] px-3 py-2 rounded-lg transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Copied!' : 'Copy Link'}
          </button>
          <a
            href={getUpsellPublicPath(draft.slug || page.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] px-3 py-2 rounded-lg transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Preview
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-[var(--surface-muted)] p-1 rounded-[var(--radius-md)]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
              tab === t.id
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 sm:p-8 shadow-[var(--shadow-xs)]">
        {/* ── Config Tab ── */}
        {tab === 'config' && (
          <div className="space-y-6 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Page Title</label>
              <input type="text" value={draft.title ?? ''} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} className={INPUT} placeholder="Checkout" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">URL Slug</label>
              <input type="text" value={draft.slug ?? ''} onChange={e => setDraft(d => ({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} className={INPUT} placeholder="my-offer" />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{getUpsellDisplayUrl(draft.slug || 'my-offer')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Logo URL</label>
              <input type="url" value={config.logo_url ?? ''} onChange={e => patchConfig('logo_url', e.target.value)} className={INPUT} placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Buy Now Button Label</label>
              <input type="text" value={config.buy_now_label ?? 'Buy Now'} onChange={e => patchConfig('buy_now_label', e.target.value)} className={INPUT} placeholder="Buy Now" />
            </div>
            <label className="flex items-center justify-between p-4 bg-[var(--surface-muted)] rounded-[var(--radius-md)] cursor-pointer">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--success)]" />
                <span className="text-sm text-[var(--text-secondary)]">Show guarantee badge</span>
              </div>
              <input type="checkbox" checked={config.show_guarantee_badge ?? true} onChange={e => patchConfig('show_guarantee_badge', e.target.checked)} className="accent-[var(--accent)] w-4 h-4 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]" />
            </label>
          </div>
        )}

        {/* ── Products Tab ── */}
        {tab === 'products' && (
          <div className="space-y-6 max-w-lg">
            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-3">Primary Product</p>
              {primaryProduct ? (
                <div className="flex items-center gap-3 p-4 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border)]">
                  {primaryProduct.thumbnail_url ? (
                    <img src={primaryProduct.thumbnail_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-[var(--surface-hover)] rounded-lg flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-[var(--text-secondary)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{primaryProduct.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{formatINR(primaryProduct.price || 0)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-tertiary)]">Product not found</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-3">Upsell Products (max 2)</p>
              <div className="space-y-2">
                {upsellProducts.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-[var(--surface-muted)] rounded-[var(--radius-md)]">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-[var(--surface-hover)] rounded-lg flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-[var(--text-tertiary)]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{formatINR(p.price || 0)}</p>
                    </div>
                    <button
                      onClick={() => setDraft(d => ({ ...d, upsell_product_ids: (d.upsell_product_ids ?? []).filter((id: string) => id !== p.id) }))}
                      className="text-[var(--danger)]/60 hover:text-[var(--danger)] p-1.5 rounded-lg hover:bg-[var(--danger-bg)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(draft.upsell_product_ids ?? []).length < 2 && availableForUpsell.length > 0 && (
                  <select
                    className={INPUT}
                    value=""
                    onChange={e => {
                      if (e.target.value) setDraft(d => ({ ...d, upsell_product_ids: [...(d.upsell_product_ids ?? []), e.target.value] }));
                    }}
                  >
                    <option value="">+ Add upsell product...</option>
                    {availableForUpsell.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} — {formatINR(p.price || 0)}</option>
                    ))}
                  </select>
                )}
                {(draft.upsell_product_ids ?? []).length >= 2 && (
                  <p className="text-xs text-[var(--text-tertiary)]">Maximum 2 upsell products reached.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Contact Tab ── */}
        {tab === 'contact' && (
          <div className="space-y-4 max-w-lg">
            <p className="text-sm text-[var(--text-secondary)] mb-2">Choose which fields to show on the checkout form.</p>
            {[
              { key: 'show_name', label: 'Customer Name' },
              { key: 'show_email', label: 'Email Address' },
              { key: 'show_phone', label: 'Phone Number' },
            ].map(field => (
              <label key={field.key} className="flex items-center justify-between p-4 bg-[var(--surface-muted)] rounded-[var(--radius-md)] cursor-pointer">
                <span className="text-sm text-[var(--text-secondary)]">{field.label}</span>
                <input
                  type="checkbox"
                  checked={contactFields[field.key] ?? false}
                  onChange={e => patchConfig('contact_fields', { ...contactFields, [field.key]: e.target.checked })}
                  className="accent-[var(--accent)] w-4 h-4 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                />
              </label>
            ))}
          </div>
        )}

        {/* ── Theme Tab ── */}
        {tab === 'theme' && (
          <div className="space-y-6 max-w-lg">
            {[
              { key: 'primary_color', label: 'Primary / Button Color', def: '#6366F1' },
              { key: 'bg_color', label: 'Background Color', def: '#FFFFFF' },
              { key: 'text_color', label: 'Text Color', def: '#0F172A' },
            ].map(c => (
              <div key={c.key}>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{c.label}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.theme?.[c.key] || c.def}
                    onChange={e => patchTheme(c.key, e.target.value)}
                    className="w-12 h-12 rounded-[var(--radius-md)] border border-[var(--border)] cursor-pointer p-0.5 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  />
                  <input
                    type="text"
                    value={config.theme?.[c.key] || c.def}
                    onChange={e => patchTheme(c.key, e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] text-sm font-mono text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] focus:border-[var(--border-strong)]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SEO Tab ── */}
        {tab === 'seo' && (
          <div className="space-y-6 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Meta Title</label>
              <input type="text" value={config.meta_title ?? ''} onChange={e => patchConfig('meta_title', e.target.value)} className={INPUT} placeholder="Page title for search engines" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Meta Description</label>
              <textarea rows={3} value={config.meta_description ?? ''} onChange={e => patchConfig('meta_description', e.target.value)} className={`${INPUT} resize-none`} placeholder="Brief description for search results (150-160 chars)" />
            </div>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 bg-[var(--surface)]/80 border-t border-[var(--border)] mt-6 -mx-6 px-6 py-4 flex items-center justify-between rounded-b-[var(--radius-lg)]">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox" className="sr-only peer"
            checked={draft.is_published ?? false}
            onChange={e => setDraft(d => ({ ...d, is_published: e.target.checked }))}
          />
          <div className="w-10 h-5 bg-[var(--border)] peer-checked:bg-[var(--success)] rounded-full transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {draft.is_published ? 'Published' : 'Draft'}
          </span>
        </label>
        <button
          onClick={handleSave}
          disabled={isUpdating}
          className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-fg)] px-6 py-2.5 rounded-[var(--radius-md)] font-semibold text-sm transition shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : null}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
