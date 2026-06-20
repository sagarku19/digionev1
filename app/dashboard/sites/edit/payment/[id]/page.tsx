'use client';
// Edit page: Payment Link — premium EditorShell (Payment · Product · Theme · Settings).

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import { useSiteEditQuery, useSiteEditMutations } from '@/hooks/sites/useSiteEdit';
import { useProducts } from '@/hooks/products/useProducts';
import { useUnsavedChanges } from '@/hooks/site-editor/useUnsavedChanges';
import { saveDesignTokens } from '@/hooks/site-editor/saveDesignTokens';
import EditorShell from '@/components/dashboard/site-edit/editor/EditorShell';
import PreviewPane from '@/components/dashboard/site-edit/editor/PreviewPane';
import UnsavedChangesDialog from '@/components/dashboard/site-edit/editor/UnsavedChangesDialog';
import ThemeEditor from '@/components/dashboard/site-edit/tabs/ThemeEditor';
import { type SidebarItem } from '@/components/dashboard/site-edit/editor/EditorSidebar';
import {
  CreditCard, Package, Palette, Settings, Globe2, IndianRupee, Search, X, Plus, CheckCircle2, XCircle,
} from 'lucide-react';

const NAV: SidebarItem[] = [
  { id: 'payment', label: 'Payment', icon: CreditCard, group: 'main' },
  { id: 'product', label: 'Product', icon: Package, group: 'main' },
  { id: 'theme', label: 'Theme', icon: Palette, group: 'main' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'main' },
];

const SECTION_META: Record<string, string> = {
  payment: 'Service name, price, and link.',
  product: 'Bind a product shown at the top of the pay page.',
  theme: 'Colours for your payment page.',
  settings: 'Visibility and SEO.',
};

const INPUT =
  'w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-shadow focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)]';
const CARD = 'space-y-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]';
const LABEL = 'mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]';

export default function EditPaymentPage() {
  const params = useParams();
  const siteId = params.id as string;
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { products } = useProducts();

  // ── UI state ──
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [section, setSection] = useState('payment');

  // ── Data state ──
  const [site, setSite] = useState<{ id: string; slug: string | null; site_type: string; is_active?: boolean | null } | null>(null);
  const [isPublished, setIsPublished] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [isFlexible, setIsFlexible] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [seoTitle, setSeoTitle] = useState('');
  const [palette, setPalette] = useState<Record<string, string>>({});
  const [productSearch, setProductSearch] = useState('');

  const { data: editData, isError } = useSiteEditQuery(siteId, { include: ['main', 'tokens'] });
  const { savePaymentConfig } = useSiteEditMutations(siteId);
  const hydratedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isError) { setLoading(false); return; }
    if (!editData || hydratedRef.current === siteId) return;
    hydratedRef.current = siteId;
    const s = editData.site;
    const sm = editData.main;
    const meta = (sm?.metadata as Record<string, unknown>) ?? {};
    setSite(s ? { id: s.id, slug: s.slug, site_type: s.site_type, is_active: s.is_active } : null);
    setIsPublished(s?.is_active ?? true);
    setTitle(sm?.title ?? '');
    setDescription(sm?.meta_description ?? '');
    setAmount(typeof meta.fixed_amount === 'number' ? meta.fixed_amount : '');
    setIsFlexible(typeof meta.is_flexible === 'boolean' ? meta.is_flexible : typeof meta.fixed_amount !== 'number');
    setProductId(typeof meta.product_id === 'string' ? meta.product_id : null);
    setSeoTitle(typeof meta.seo_title === 'string' ? meta.seo_title : '');
    if (editData.tokens?.color_palette) setPalette(editData.tokens.color_palette as Record<string, string>);
    setLoading(false);
  }, [editData, siteId, isError]);

  // mark dirty on edits (skip initial hydrate)
  const dirtyInitRef = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (!dirtyInitRef.current) { dirtyInitRef.current = true; return; }
    setDirty(true);
  }, [title, description, amount, isFlexible, productId, seoTitle, palette, isPublished, loading]);

  // live theme → iframe
  const handlePaletteChange = useCallback((next: Record<string, string>) => {
    setPalette(next);
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: 'theme-update', palette: next }, window.location.origin);
    } catch { /* cross-origin guard */ }
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await savePaymentConfig({
        title,
        meta_description: description,
        metadata: {
          product_id: productId || null,
          fixed_amount: isFlexible ? null : (amount === '' ? null : Number(amount)),
          is_flexible: isFlexible,
          seo_title: seoTitle || null,
        },
      });
      await saveDesignTokens(siteId, palette);
      if (site && isPublished !== site.is_active) {
        await supabase.from('sites').update({ is_active: isPublished }).eq('id', siteId);
        setSite((prev) => (prev ? { ...prev, is_active: isPublished } : prev));
      }
      setSaved(true);
      setDirty(false);
      setPreviewKey(Date.now());
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error('Save failed', e);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }, [savePaymentConfig, title, description, productId, isFlexible, amount, seoTitle, palette, supabase, siteId, site, isPublished]);

  // ── Leave guard ──
  const { pendingNav, guardedNavigate, cancel, discardAndLeave, saveAndLeave } = useUnsavedChanges(dirty, handleSave);

  // ── Derived ──
  const previewSite = { id: siteId, slug: site?.slug ?? null, site_type: 'payment', creator_id: '', custom_domain: null };
  const previewUrl = `${getSitePublicPath(previewSite)}?preview=1&t=${previewKey}`;
  const displayUrl = getSiteDisplayUrl(previewSite);
  const selectedProduct = products.find((p) => p.id === productId);
  const productFiltered = products.filter((p) => p.id !== productId && p.name?.toLowerCase().includes(productSearch.toLowerCase()));

  // ── Sections ──
  const paymentSection = (
    <div className="space-y-5">
      <div className={CARD}>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Payment Info</h3>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Details shown to buyers on the payment page.</p>
        </div>
        <div>
          <label className={LABEL}>Service Name</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} placeholder="e.g. 1-on-1 Mentorship Session" />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[13px] font-medium text-[var(--text-secondary)]">Description</label>
            <span className={`text-xs tabular-nums ${description.length > 300 ? 'text-[var(--danger)]' : 'text-[var(--text-tertiary)]'}`}>{description.length}/300</span>
          </div>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={`${INPUT} resize-none`} placeholder="What does the buyer get? How long is the session?" />
        </div>
      </div>

      <div className={CARD}>
        <div className="flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-[var(--brand)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Pricing</h3>
        </div>
        <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Flexible amount</p>
            <p className="text-xs text-[var(--text-secondary)]">Let the buyer choose how much to pay.</p>
          </div>
          <button
            type="button" role="switch" aria-checked={isFlexible} aria-label="Flexible amount"
            onClick={() => setIsFlexible((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${isFlexible ? 'bg-[var(--brand)]' : 'border border-[var(--border)] bg-[var(--surface-muted)]'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isFlexible ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        {!isFlexible && (
          <div>
            <label className={LABEL}>Fixed Amount (₹)</label>
            <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')} className={INPUT} placeholder="e.g. 999" />
          </div>
        )}
      </div>

      <div className={CARD}>
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-[var(--brand)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Payment URL</h3>
        </div>
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
          <Globe2 className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
          <span className="truncate font-mono text-sm text-[var(--text-secondary)]">{displayUrl}</span>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">Auto-generated and permanent. Share it with clients to collect payments.</p>
      </div>
    </div>
  );

  const productSection = (
    <div className={CARD}>
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Linked Product</h3>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Optionally bind a product — it appears at the top of your pay page.</p>
      </div>

      {selectedProduct ? (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-2.5">
          {selectedProduct.thumbnail_url ? (
            <img src={selectedProduct.thumbnail_url} alt="" className="h-11 w-11 shrink-0 rounded-[var(--radius-sm)] object-cover" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface)]"><Package className="h-4 w-4 text-[var(--text-tertiary)]" /></div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{selectedProduct.name}</p>
            <p className="text-xs text-[var(--brand)]">{'₹'}{selectedProduct.price?.toLocaleString('en-IN')}</p>
          </div>
          <button onClick={() => setProductId(null)} aria-label="Unlink product"
            className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-tertiary)] transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products to link…"
              className={`${INPUT} pl-10`} />
          </div>
          {productSearch && productFiltered.length > 0 && (
            <div className="max-h-44 overflow-y-auto overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
              {productFiltered.slice(0, 6).map((p) => (
                <button key={p.id} onClick={() => { setProductId(p.id); setProductSearch(''); }}
                  className="flex w-full items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 text-left text-[13px] font-medium text-[var(--text-secondary)] transition-colors last:border-0 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  <Plus className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-[11px] tabular-nums opacity-60">{'₹'}{p.price?.toLocaleString('en-IN')}</span>
                </button>
              ))}
            </div>
          )}
          {products.length === 0 && <p className="text-xs text-[var(--text-tertiary)]">No products yet.</p>}
        </>
      )}
    </div>
  );

  const themeSection = <ThemeEditor palette={palette} onChange={handlePaletteChange} />;

  const settingsSection = (
    <div className="space-y-5">
      <div className={CARD}>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">SEO</h3>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">How the link looks when shared.</p>
        </div>
        <div>
          <label className={LABEL}>Page Title</label>
          <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className={INPUT} placeholder={title || 'Pay securely'} />
        </div>
      </div>

      <div className={CARD}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              {isPublished ? <CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> : <XCircle className="h-4 w-4 text-[var(--text-tertiary)]" />}
              {isPublished ? 'Link is Active' : 'Link is Inactive'}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{isPublished ? 'Buyers can pay through this link.' : 'The link is hidden and returns a 404.'}</p>
          </div>
          <button
            role="switch" aria-checked={isPublished} aria-label={isPublished ? 'Deactivate link' : 'Activate link'}
            onClick={() => setIsPublished((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${isPublished ? 'bg-[var(--success)]' : 'border border-[var(--border)] bg-[var(--surface-muted)]'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );

  const sections: Record<string, React.ReactNode> = {
    payment: paymentSection,
    product: productSection,
    theme: themeSection,
    settings: settingsSection,
  };

  return (
    <>
      <EditorShell
        siteType="payment"
        storageKey="payment-editor-sidebar"
        nav={NAV}
        sectionMeta={SECTION_META}
        sections={sections}
        defaultActive="payment"
        active={section}
        onActiveChange={setSection}
        title={title || 'Payment Link'}
        typeLabel="Payment Link"
        typeIcon={CreditCard}
        onBack={() => guardedNavigate('/dashboard/sites')}
        onNavigate={guardedNavigate}
        saving={saving}
        saved={saved}
        dirty={dirty}
        onSave={handleSave}
        preview={
          <PreviewPane
            previewUrl={previewUrl} displayUrl={displayUrl} iframeRef={iframeRef}
            previewKey={previewKey} onRefresh={() => setPreviewKey(Date.now())}
          />
        }
      />

      <UnsavedChangesDialog open={!!pendingNav} saving={saving} onCancel={cancel} onDiscard={discardAndLeave} onSave={saveAndLeave} />
    </>
  );
}
