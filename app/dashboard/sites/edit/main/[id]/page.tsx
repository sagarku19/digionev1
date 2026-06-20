'use client';
// Edit page: Main Store — premium EditorShell (Header · Main · Content · Sections ·
// Footer · Template · Appearance · Settings · Advanced). Web + mobile preview.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useSiteEditQuery } from '@/hooks/useSiteEdit';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import { revalidateStorefrontPaths } from '@/app/actions/revalidate';

import EditorShell from '@/components/dashboard/site-edit/editor/EditorShell';
import PreviewPane from '@/components/dashboard/site-edit/editor/PreviewPane';
import { type SidebarItem } from '@/components/dashboard/site-edit/editor/EditorSidebar';
import SectionManager from '@/components/dashboard/site-edit/SectionManager';
import ProductAssigner from '@/components/dashboard/site-edit/ProductAssigner';
import HeaderEditor, { type HeaderData } from '@/components/dashboard/site-edit/tabs/HeaderEditor';
import FooterEditor, { type FooterData } from '@/components/dashboard/site-edit/tabs/FooterEditor';
import ThemeEditor from '@/components/dashboard/site-edit/tabs/ThemeEditor';
import BioAppearanceEditor, { type BioAppearanceData } from '@/components/dashboard/site-edit/tabs/linkinbio/BioAppearanceEditor';
import { type SettingsData } from '@/components/dashboard/site-edit/tabs/SettingsPanel';
import type { Section } from '@/components/dashboard/site-edit/section-defs';
import ImagePickerModal from '@/components/dashboard/ImagePickerModal';
import type { Database, Json } from '@/types/database.types';

import {
  Loader2, CheckCircle2, XCircle, Globe2,
  Navigation as NavIcon, Footprints, Paintbrush, Settings, Layers,
  Layout, Sparkles, Code2, Image as ImageIcon, Package, Store,
  AlignLeft, Type, ToggleLeft, Trash2,
} from 'lucide-react';

const NAV: SidebarItem[] = [
  { id: 'header', label: 'Header', icon: NavIcon, group: 'main' },
  { id: 'main', label: 'Main', icon: Layout, group: 'main' },
  { id: 'content', label: 'Content', icon: Package, group: 'main' },
  { id: 'sections', label: 'Sections', icon: Layers, group: 'main' },
  { id: 'footer', label: 'Footer', icon: Footprints, group: 'main' },
  { id: 'template', label: 'Template', icon: Sparkles, group: 'main' },
  { id: 'appearance', label: 'Appearance', icon: Paintbrush, group: 'main' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'main' },
  { id: 'advanced', label: 'Advanced', icon: Code2, group: 'main' },
];

const SECTION_META: Record<string, string> = {
  header: 'Logo, nav, and header behavior.',
  main: 'Hero banner and store info.',
  content: 'Products shown on the storefront.',
  sections: 'Homepage section layout.',
  footer: 'Footer links and contact.',
  template: 'Starting palette presets.',
  appearance: 'Theme, fonts, and style.',
  settings: 'URL, SEO, and visibility.',
  advanced: 'Custom CSS / JS.',
};

const INPUT =
  'w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-shadow focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)]';
const LABEL = 'mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]';
const CARD = 'space-y-5 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]';
const INFO = 'flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-secondary)]';

function SectionCard({ icon: Icon, title, desc, children }: { icon: React.ElementType; title: string; desc?: string; color?: string; children: React.ReactNode }) {
  return (
    <div className={CARD}>
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Icon className="h-4 w-4 text-[var(--brand)]" /> {title}
        </h3>
        {desc && <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

type SiteRow = Database['public']['Tables']['sites']['Row'];

type HeroData = {
  enabled: boolean; imageUrl: string; title: string; subtitle: string;
  ctaLabel: string; ctaUrl: string; overlayOpacity: number; textAlign: 'left' | 'center' | 'right';
};

type Snapshot = {
  sections: Section[]; assigned: string[]; title: string; description: string;
  headerData: HeaderData; footerData: FooterData; palette: Record<string, string>;
  heroData: HeroData; appearance: BioAppearanceData; customCss: string; customJs: string;
};

const STORE_TEMPLATES = [
  { id: 'classic', name: 'Classic', desc: 'Clean white store with a timeless look', palette: { primary: '#6366f1', background: '#ffffff', text: '#111827', muted: '#6b7280', border: '#e5e7eb' } },
  { id: 'dark-minimal', name: 'Dark Minimal', desc: 'Sleek dark theme with bold accents', palette: { primary: '#818cf8', background: '#0f0f1a', text: '#f9fafb', muted: '#9ca3af', border: '#1f2937' } },
  { id: 'warm', name: 'Warm Amber', desc: 'Cozy earthy tones for lifestyle brands', palette: { primary: '#d97706', background: '#fffbeb', text: '#1c1917', muted: '#78716c', border: '#fde68a' } },
  { id: 'ocean', name: 'Ocean Blue', desc: 'Fresh and trustworthy blue palette', palette: { primary: '#0ea5e9', background: '#f0f9ff', text: '#0c4a6e', muted: '#0369a1', border: '#bae6fd' } },
  { id: 'forest', name: 'Forest', desc: 'Natural greens for eco-friendly brands', palette: { primary: '#16a34a', background: '#f0fdf4', text: '#14532d', muted: '#4ade80', border: '#bbf7d0' } },
  { id: 'bold-red', name: 'Bold Red', desc: 'High-energy red for high-conversion stores', palette: { primary: '#dc2626', background: '#fff5f5', text: '#1a1a1a', muted: '#6b7280', border: '#fecaca' } },
];

export default function EditMainStorePage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState<string>('header');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [heroBgPicker, setHeroBgPicker] = useState(false);

  // ── Site data ──
  const [site, setSite] = useState<SiteRow | null>(null);
  const [isPublished, setIsPublished] = useState(true);

  // ── Slug ──
  const [slug, setSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  // ── Content ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());

  const [headerData, setHeaderData] = useState<HeaderData>({ logoUrl: '', logoAlt: '', navItems: [], showSearch: false, showCart: true, stickyHeader: true });
  const [footerData, setFooterData] = useState<FooterData>({ social: { instagram: '', youtube: '', twitter: '', linkedin: '' }, legal: { about: false, terms: false, privacy: false, refund: false }, contactEmail: '', contactPhone: '', copyrightText: '' });
  const [heroData, setHeroData] = useState<HeroData>({ enabled: false, imageUrl: '', title: '', subtitle: '', ctaLabel: 'Shop Now', ctaUrl: '', overlayOpacity: 40, textAlign: 'center' });
  const [settingsData, setSettingsData] = useState<SettingsData>({ metaTitle: '', metaDesc: '', customDomain: '', slug: '', originalSlug: null });
  const [appearance, setAppearance] = useState<BioAppearanceData>({ layoutStyle: 'default', buttonStyle: 'rounded', backgroundType: 'solid', backgroundValue: '#ffffff', showWatermark: false, showShareButton: true, fontFamily: 'system', cardStyle: 'solid', animation: 'none', borderRadius: 'md', spacing: 'default' });
  const [palette, setPalette] = useState<Record<string, string>>({});
  const [customCss, setCustomCss] = useState('');
  const [customJs, setCustomJs] = useState('');

  // ── Undo / Redo ──
  const historyRef = useRef<Snapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const bumpHistoryUi = useCallback(() => setHistoryVersion((v) => v + 1), []);

  const pushSnapshot = useCallback(() => {
    const snap: Snapshot = {
      sections: JSON.parse(JSON.stringify(sections)),
      assigned: Array.from(assigned),
      title, description,
      headerData: { ...headerData, navItems: [...headerData.navItems] },
      footerData: JSON.parse(JSON.stringify(footerData)),
      palette: { ...palette },
      heroData: { ...heroData },
      appearance: { ...appearance },
      customCss, customJs,
    };
    const idx = historyIndexRef.current;
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push(snap);
    if (historyRef.current.length > 50) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    bumpHistoryUi();
  }, [sections, assigned, title, description, headerData, footerData, palette, heroData, appearance, customCss, customJs, bumpHistoryUi]);

  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (loading) return;
    if (isRestoringRef.current) { isRestoringRef.current = false; return; }
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(pushSnapshot, 400);
    return () => { if (pushTimerRef.current) clearTimeout(pushTimerRef.current); };
  }, [sections, assigned, title, description, headerData, footerData, palette, heroData, appearance, customCss, customJs, loading, pushSnapshot]);

  const canUndo = historyVersion >= 0 && historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const restoreSnapshot = useCallback((snap: Snapshot) => {
    isRestoringRef.current = true;
    setSections(snap.sections);
    setAssigned(new Set(snap.assigned));
    setTitle(snap.title);
    setDescription(snap.description);
    setHeaderData(snap.headerData);
    setFooterData(snap.footerData);
    setPalette(snap.palette);
    setHeroData(snap.heroData);
    setAppearance(snap.appearance);
    setCustomCss(snap.customCss);
    setCustomJs(snap.customJs);
    bumpHistoryUi();
  }, [bumpHistoryUi]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    restoreSnapshot(historyRef.current[historyIndexRef.current]);
  }, [restoreSnapshot]);
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    restoreSnapshot(historyRef.current[historyIndexRef.current]);
  }, [restoreSnapshot]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  // ── Load data ──
  const queryClient = useQueryClient();
  const { data: editData, isError } = useSiteEditQuery(siteId, { include: ['main', 'nav', 'tokens', 'sections', 'assignments'] });
  const hydratedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isError) { setLoading(false); return; }
    if (!editData || hydratedRef.current === siteId) return;
    hydratedRef.current = siteId;
    const s = editData.site;
    const sm = editData.main;
    const nav = editData.nav;
    const tokens = editData.tokens;
    const config = editData.sections;
    const asgn = editData.assignments ?? [];

    setSite(s);
    setIsPublished(s?.is_active ?? true);
    setSlug(s?.slug ?? '');
    setOriginalSlug(s?.slug ?? null);
    setTitle(sm?.title ?? '');
    setDescription(sm?.meta_description ?? '');

    setHeaderData({
      logoUrl: nav?.header_logo_url ?? '', logoAlt: nav?.header_logo_alt ?? '',
      navItems: (nav?.nav_items as { label: string; url: string }[]) ?? [],
      showSearch: nav?.show_search ?? false, showCart: nav?.show_cart_icon ?? true, stickyHeader: nav?.sticky_header ?? true,
    });
    setFooterData({
      social: (sm?.social_links as Record<string, string>) ?? { instagram: '', youtube: '', twitter: '', linkedin: '' },
      legal: (sm?.legal_pages as Record<string, boolean>) ?? { about: false, terms: false, privacy: false, refund: false },
      contactEmail: sm?.contact_email ?? '', contactPhone: sm?.contact_mobile ?? '', copyrightText: nav?.footer_bottom_text ?? '',
    });
    setSettingsData({ metaTitle: sm?.meta_keywords ?? '', metaDesc: sm?.meta_description ?? '', customDomain: s?.custom_domain ?? '', slug: s?.slug ?? '', originalSlug: s?.slug ?? null });

    const meta = (sm?.metadata ?? {}) as { hero?: Partial<HeroData>; appearance?: Partial<BioAppearanceData>; customCss?: string; customJs?: string };
    if (meta.hero) setHeroData((prev) => ({ ...prev, ...meta.hero }));
    if (meta.appearance) setAppearance((prev) => ({ ...prev, ...meta.appearance }));
    setCustomCss(meta.customCss ?? '');
    setCustomJs(meta.customJs ?? '');

    if (tokens?.color_palette) setPalette(tokens.color_palette as Record<string, string>);
    const raw = (config?.sections as Section[] | null);
    if (raw) setSections([...raw].sort((a, b) => a.sort_order - b.sort_order));
    setAssigned(new Set(asgn.map((a) => a.product_id)));
    setLoading(false);
  }, [editData, siteId, isError]);

  // ── Mark dirty on edits (skip initial hydrate) ──
  const dirtyInitRef = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (!dirtyInitRef.current) { dirtyInitRef.current = true; return; }
    setDirty(true);
  }, [sections, assigned, title, description, headerData, footerData, palette, heroData, appearance, customCss, customJs, slug, isPublished, settingsData, loading]);

  // ── Slug availability ──
  useEffect(() => {
    if (!slug || slug === originalSlug) { setSlugStatus('idle'); return; }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 3) { setSlugStatus('invalid'); return; }
    setSlugStatus('checking');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sites/check-slug?slug=${encodeURIComponent(slug)}&type=main`);
        const json = await res.json();
        setSlugStatus(json.available ? 'available' : 'taken');
      } catch { setSlugStatus('idle'); }
    }, 400);
    return () => clearTimeout(t);
  }, [slug, originalSlug]);

  // ── Live theme → iframe ──
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestPaletteRef = useRef(palette);
  latestPaletteRef.current = palette;
  useEffect(() => {
    if (loading) return;
    clearTimeout(sendTimerRef.current);
    sendTimerRef.current = setTimeout(() => {
      try {
        iframeRef.current?.contentWindow?.postMessage({ type: 'theme-update', palette: latestPaletteRef.current }, window.location.origin);
      } catch { /* cross-origin guard */ }
    }, 16);
    return () => clearTimeout(sendTimerRef.current);
  });

  // ── Save ──
  const handleSave = useCallback(async () => {
    if (slugStatus === 'taken' || slugStatus === 'invalid' || slugStatus === 'checking') { alert('Please fix your URL and try again.'); return; }
    setSaving(true);
    setSaved(false);
    try {
      if (slug !== originalSlug || isPublished !== site?.is_active) {
        await supabase.from('sites').update({ slug, is_active: isPublished, updated_at: new Date().toISOString() }).eq('id', siteId);
        setOriginalSlug(slug);
        setSite((prev) => (prev ? { ...prev, slug, is_active: isPublished } : prev));
      }
      const smPayload = {
        title, meta_description: description, meta_keywords: settingsData.metaTitle,
        social_links: footerData.social, legal_pages: footerData.legal,
        logo_url: headerData.logoUrl || null, contact_email: footerData.contactEmail || null, contact_mobile: footerData.contactPhone || null,
        metadata: { hero: heroData, appearance, customCss, customJs },
      };
      const { data: existingSm } = await supabase.from('site_main').select('site_id').eq('site_id', siteId).maybeSingle();
      if (existingSm) await supabase.from('site_main').update(smPayload).eq('site_id', siteId);
      else await supabase.from('site_main').insert({ site_id: siteId, ...smPayload } as Database['public']['Tables']['site_main']['Insert']);

      await supabase.from('site_navigation').upsert({
        site_id: siteId, nav_items: headerData.navItems, show_search: headerData.showSearch, show_cart_icon: headerData.showCart,
        sticky_header: headerData.stickyHeader, header_logo_url: headerData.logoUrl || null, header_logo_alt: headerData.logoAlt || null,
        footer_bottom_text: footerData.copyrightText || null,
      }, { onConflict: 'site_id' });

      const { data: configExists } = await supabase.from('site_sections_config').select('site_id').eq('site_id', siteId).maybeSingle();
      if (configExists) await supabase.from('site_sections_config').update({ sections: sections as unknown as Json }).eq('site_id', siteId);
      else await supabase.from('site_sections_config').insert({ site_id: siteId, site_type: 'main', sections: sections as unknown as Json });

      await supabase.from('site_product_assignments').delete().eq('site_id', siteId);
      if (assigned.size > 0) {
        const rows = Array.from(assigned).map((product_id, i) => ({ site_id: siteId, product_id, sort_order: i + 1 }));
        await supabase.from('site_product_assignments').insert(rows);
      }

      const { data: tkn } = await supabase.from('site_design_tokens').select('id').eq('site_id', siteId).maybeSingle();
      if (tkn) await supabase.from('site_design_tokens').update({ color_palette: palette }).eq('id', tkn.id);
      else {
        const { data: user } = await supabase.auth.getUser();
        if (user.user?.id) await supabase.from('site_design_tokens').insert({ site_id: siteId, creator_id: user.user.id, color_palette: palette, spacing_scale: {}, typography: {}, border_radius_scale: {} });
      }

      try { await revalidateStorefrontPaths([`/store/${slug}`, '/']); } catch { /* non-fatal */ }
      queryClient.invalidateQueries({ queryKey: ['sites', 'edit-state', siteId] });

      setPreviewKey(Date.now());
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }, [slugStatus, slug, originalSlug, isPublished, site, title, description, settingsData, footerData, headerData, heroData, appearance, customCss, customJs, sections, assigned, palette, supabase, siteId, queryClient]);

  // ── Leave guard ──
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const guardedNavigate = useCallback((href: string) => { if (dirty) setPendingNav(href); else router.push(href); }, [dirty, router]);
  const discardAndLeave = useCallback(() => { const h = pendingNav; setPendingNav(null); if (h) router.push(h); }, [pendingNav, router]);
  const saveAndLeave = useCallback(async () => { await handleSave(); const h = pendingNav; setPendingNav(null); if (h) router.push(h); }, [handleSave, pendingNav, router]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // ── Derived ──
  const urlInfo = site
    ? { id: site.id, site_type: site.site_type ?? 'main', slug: site.slug, creator_id: site.creator_id, custom_domain: site.custom_domain }
    : null;
  const previewUrl = urlInfo ? `${getSitePublicPath(urlInfo)}?preview=1&t=${previewKey}` : null;
  const displayUrl = urlInfo ? getSiteDisplayUrl(urlInfo) : null;
  const displayTitle = title || site?.slug || 'Untitled Store';

  // ── Section bodies ──
  const sectionNodes: Record<string, React.ReactNode> = {
    header: <HeaderEditor data={headerData} onChange={setHeaderData} />,
    main: (
      <div className="space-y-5">
        <div className={INFO}><Layout className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Configure the hero banner shown at the top of your store homepage.</div>
        <SectionCard icon={ToggleLeft} title="Hero Banner" desc="Show a full-width banner at the top">
          <label className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Enable Hero Banner</span>
            <button type="button" role="switch" aria-checked={heroData.enabled} aria-label="Enable hero banner"
              onClick={() => setHeroData(h => ({ ...h, enabled: !h.enabled }))}
              className={`relative h-5 w-10 rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${heroData.enabled ? 'bg-[var(--brand)]' : 'border border-[var(--border)] bg-[var(--surface-muted)]'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${heroData.enabled ? 'left-5' : 'left-0.5'}`} />
            </button>
          </label>
        </SectionCard>

        {heroData.enabled && (
          <>
            <SectionCard icon={ImageIcon} title="Banner Image" desc="Full-width background image">
              {heroData.imageUrl ? (
                <div className="relative h-32 overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-muted)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroData.imageUrl} alt="Hero" className="h-full w-full object-cover" />
                  <button onClick={() => setHeroData(h => ({ ...h, imageUrl: '' }))}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setHeroBgPicker(true)}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--border)] py-8 text-[var(--text-tertiary)] transition hover:border-[var(--brand)]/40 hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  <ImageIcon className="h-5 w-5" />
                  <span className="text-xs font-medium">Click to upload image</span>
                </button>
              )}
              <div>
                <label className={LABEL}>Overlay opacity: {heroData.overlayOpacity}%</label>
                <input type="range" min={0} max={90} step={5} value={heroData.overlayOpacity}
                  onChange={e => setHeroData(h => ({ ...h, overlayOpacity: Number(e.target.value) }))} className="w-full accent-[var(--brand)]" />
              </div>
            </SectionCard>

            <SectionCard icon={Type} title="Banner Text" desc="Headline and subtitle">
              <div><label className={LABEL}>Headline</label><input type="text" value={heroData.title} onChange={e => setHeroData(h => ({ ...h, title: e.target.value }))} className={INPUT} placeholder="Welcome to our store" /></div>
              <div><label className={LABEL}>Subtitle</label><textarea rows={2} value={heroData.subtitle} onChange={e => setHeroData(h => ({ ...h, subtitle: e.target.value }))} className={`${INPUT} resize-none`} placeholder="Discover our amazing products…" /></div>
              <div>
                <label className={LABEL}>Text Alignment</label>
                <div className="flex gap-2">
                  {(['left', 'center', 'right'] as const).map(a => (
                    <button key={a} onClick={() => setHeroData(h => ({ ...h, textAlign: a }))}
                      className={`flex-1 rounded-[var(--radius-md)] border py-2 text-xs font-semibold capitalize transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${heroData.textAlign === a ? 'border-[var(--brand)] bg-[var(--surface)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={AlignLeft} title="Call to Action" desc="Button shown in the banner">
              <div><label className={LABEL}>Button Label</label><input type="text" value={heroData.ctaLabel} onChange={e => setHeroData(h => ({ ...h, ctaLabel: e.target.value }))} className={INPUT} placeholder="Shop Now" /></div>
              <div><label className={LABEL}>Button URL</label><input type="text" value={heroData.ctaUrl} onChange={e => setHeroData(h => ({ ...h, ctaUrl: e.target.value }))} className={INPUT} placeholder="/products or https://..." /></div>
            </SectionCard>
          </>
        )}

        <SectionCard icon={Store} title="Store Info" desc="Basic info shown on your store">
          <div><label className={LABEL}>Store Name</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className={INPUT} placeholder="My awesome store" /></div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-medium text-[var(--text-secondary)]">Description</label>
              <span className={`text-[11px] tabular-nums ${description.length > 200 ? 'text-[var(--danger)]' : 'text-[var(--text-tertiary)]'}`}>{description.length}/200</span>
            </div>
            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className={`${INPUT} resize-none`} placeholder="What your store is about…" />
          </div>
        </SectionCard>
      </div>
    ),
    content: (
      <div className="space-y-4">
        <div className={INFO}><Package className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Select which products appear on your store front page.</div>
        <ProductAssigner siteId={siteId} assigned={assigned} onChange={setAssigned} />
      </div>
    ),
    sections: (
      <div className="space-y-4">
        <div className={INFO}><Layers className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Add, reorder, and configure sections for your store homepage.</div>
        <SectionManager sections={sections} onChange={setSections} />
      </div>
    ),
    footer: <FooterEditor data={footerData} onChange={setFooterData} />,
    template: (
      <div className="space-y-4">
        <div className={INFO}><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Choose a template to instantly apply a matching colour palette.</div>
        <div className="grid grid-cols-1 gap-3">
          {STORE_TEMPLATES.map(tpl => (
            <button key={tpl.id} onClick={() => setPalette(tpl.palette)}
              className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition hover:border-[var(--brand)]/40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
              <div className="flex shrink-0 gap-1.5">
                {Object.values(tpl.palette).slice(0, 3).map((c, i) => (
                  <span key={i} className="h-6 w-6 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)] transition group-hover:text-[var(--brand)]">{tpl.name}</p>
                <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{tpl.desc}</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-[var(--text-tertiary)] transition group-hover:text-[var(--brand)]">Apply →</span>
            </button>
          ))}
        </div>
        <SectionCard icon={Paintbrush} title="Custom Colors">
          <ThemeEditor palette={palette} onChange={setPalette} />
        </SectionCard>
      </div>
    ),
    appearance: (
      <BioAppearanceEditor data={appearance} onChange={setAppearance} palette={palette} onPaletteChange={(key, val) => setPalette(p => ({ ...p, [key]: val }))} />
    ),
    settings: (
      <div className="space-y-5">
        <div className={CARD}>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"><Globe2 className="h-4 w-4 text-[var(--brand)]" /> Public URL</h3>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Your store&apos;s public address</p>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 transition-shadow focus-within:border-[var(--border-strong)] focus-within:shadow-[var(--focus-ring)]">
              <span className="shrink-0 select-none text-[13px] text-[var(--text-tertiary)]">digione.ai/store/</span>
              <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" placeholder="my-store" />
              {slugStatus === 'checking' && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--text-tertiary)]" />}
              {slugStatus === 'available' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--success)]" />}
              {(slugStatus === 'taken' || slugStatus === 'invalid') && <XCircle className="h-3.5 w-3.5 shrink-0 text-[var(--danger)]" />}
            </div>
            <div className="flex min-h-5 items-center gap-2 text-xs">
              {slugStatus === 'idle' && slug === originalSlug && slug.length > 0 && <span className="flex items-center gap-1 text-[var(--success)]"><CheckCircle2 className="h-3.5 w-3.5" /> Your current URL</span>}
              {slugStatus === 'available' && <span className="flex items-center gap-1 text-[var(--success)]"><CheckCircle2 className="h-3.5 w-3.5" /> Available — save to apply</span>}
              {slugStatus === 'taken' && <span className="flex items-center gap-1 text-[var(--danger)]"><XCircle className="h-3.5 w-3.5" /> Already taken</span>}
              {slugStatus === 'invalid' && <span className="text-[var(--danger)]">3+ chars, letters, numbers, hyphens only</span>}
            </div>
          </div>
        </div>

        <div className={CARD}>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">SEO &amp; Meta</h3>
          <div><label className={LABEL}>Meta Title</label><input type="text" value={settingsData.metaTitle} onChange={e => setSettingsData(p => ({ ...p, metaTitle: e.target.value }))} className={INPUT} placeholder="Store title for search engines" /></div>
          <div><label className={LABEL}>Meta Description</label><textarea rows={3} value={settingsData.metaDesc} onChange={e => setSettingsData(p => ({ ...p, metaDesc: e.target.value }))} className={`${INPUT} resize-none`} placeholder="Brief description for search results…" /></div>
          <div><label className={LABEL}>Custom Domain</label><input type="text" value={settingsData.customDomain} onChange={e => setSettingsData(p => ({ ...p, customDomain: e.target.value }))} className={INPUT} placeholder="shop.yourdomain.com" /></div>
        </div>

        <div className={CARD}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Visibility</p>
              <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">Control whether your store is publicly accessible</p>
            </div>
            <button onClick={() => setIsPublished(p => !p)} role="switch" aria-checked={isPublished} aria-label="Toggle visibility"
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${isPublished ? 'bg-[var(--success)]' : 'border border-[var(--border)] bg-[var(--surface-muted)]'}`}>
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>
    ),
    advanced: (
      <div className="space-y-5">
        <div className={INFO}><Code2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Advanced customization. Changes here affect your live store directly.</div>
        <SectionCard icon={Code2} title="Custom CSS" desc="Injected into your store's <head>">
          <textarea rows={10} value={customCss} onChange={e => setCustomCss(e.target.value)} spellCheck={false}
            className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-tertiary)] px-4 py-3 font-mono text-[12px] text-[var(--text-primary)] outline-none transition-shadow focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)]"
            placeholder={'/* Custom styles */\n.my-element {\n  color: red;\n}'} />
        </SectionCard>
        <SectionCard icon={Code2} title="Custom JavaScript" desc="Injected before </body> — use with care">
          <textarea rows={10} value={customJs} onChange={e => setCustomJs(e.target.value)} spellCheck={false}
            className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-tertiary)] px-4 py-3 font-mono text-[12px] text-[var(--text-primary)] outline-none transition-shadow focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)]"
            placeholder={"// Custom scripts\nconsole.log('hello');"} />
        </SectionCard>
      </div>
    ),
  };

  return (
    <>
      <EditorShell
        siteType="main"
        storageKey="main-editor-sidebar"
        nav={NAV}
        sectionMeta={SECTION_META}
        sections={sectionNodes}
        defaultActive="header"
        active={activeTab}
        onActiveChange={setActiveTab}
        title={displayTitle}
        typeLabel="Main store"
        typeIcon={Store}
        onBack={() => guardedNavigate('/dashboard/sites')}
        onNavigate={guardedNavigate}
        saving={saving}
        saved={saved}
        dirty={dirty}
        onSave={handleSave}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        preview={
          <PreviewPane
            previewUrl={previewUrl} displayUrl={displayUrl} iframeRef={iframeRef}
            previewKey={previewKey} onRefresh={() => setPreviewKey(Date.now())}
            devices={['web', 'mobile']} defaultDevice="mobile"
          />
        }
      />

      {heroBgPicker && (
        <ImagePickerModal open onSelect={(url) => { setHeroData(h => ({ ...h, imageUrl: url })); setHeroBgPicker(false); }} onClose={() => setHeroBgPicker(false)} />
      )}

      {pendingNav && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button aria-label="Stay on page" tabIndex={-1} onClick={() => setPendingNav(null)} className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm" />
          <div role="dialog" aria-modal="true" aria-label="Unsaved changes" className="relative z-10 w-full max-w-sm rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card-lg)]">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Unsaved changes</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Save them before leaving, or discard them.</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => setPendingNav(null)} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Cancel</button>
              <button onClick={discardAndLeave} className="rounded-[var(--radius-sm)] px-3.5 py-2 text-sm font-medium text-[var(--danger)] transition hover:bg-[var(--danger-bg)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Discard</button>
              <button onClick={saveAndLeave} disabled={saving} className="rounded-[var(--radius-sm)] bg-[var(--brand)] px-3.5 py-2 text-sm font-semibold text-[var(--text-on-brand)] transition hover:bg-[var(--brand-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50">{saving ? 'Saving…' : 'Save & leave'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
