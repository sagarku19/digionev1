'use client';
// Edit page: Main Store — fully custom split-screen editor.
// 9 tabs: header, main, content, sections, footer, template, appearance, settings, advanced
// Mirrors the singlepage editor pattern: collapsible sidebar, undo/redo, live preview, ISR revalidation.

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import { revalidateStorefrontPaths } from '@/app/actions/revalidate';
import { useTheme } from '@/contexts/DashboardThemeContext';

import SectionManager from '@/components/dashboard/site-edit/SectionManager';
import ProductAssigner from '@/components/dashboard/site-edit/ProductAssigner';
import HeaderEditor, { type HeaderData } from '@/components/dashboard/site-edit/tabs/HeaderEditor';
import FooterEditor, { type FooterData } from '@/components/dashboard/site-edit/tabs/FooterEditor';
import ThemeEditor from '@/components/dashboard/site-edit/tabs/ThemeEditor';
import BioAppearanceEditor, { type BioAppearanceData } from '@/components/dashboard/site-edit/tabs/linkinbio/BioAppearanceEditor';
import { type SettingsData } from '@/components/dashboard/site-edit/tabs/SettingsPanel';
import type { Section } from '@/components/dashboard/site-edit/section-defs';
import ImagePickerModal from '@/components/dashboard/ImagePickerModal';

import {
  ArrowLeft, Save, Loader2, CheckCircle2, ExternalLink,
  Monitor, Tablet, Smartphone, RefreshCw,
  XCircle, Copy, Check, Globe2,
  Undo2, Redo2, Moon, Sun,
  Layers, Package, Store, Navigation as NavIcon,
  Footprints, Paintbrush, Settings, Info,
  Layout, Sparkles, Code2, Image as ImageIcon,
  AlignLeft, Type, ToggleLeft, Plus, Trash2,
} from 'lucide-react';


// ─── Tab definitions ────────────────────────────────────────────────────────

type Tab = 'header' | 'main' | 'content' | 'sections' | 'footer' | 'template' | 'appearance' | 'settings' | 'advanced';

const TABS: {
  id: Tab; label: string; icon: any;
  activeBg: string; activeColor: string; activeBorder: string;
}[] = [
  { id: 'header',     label: 'Header',     icon: NavIcon,    activeBg: 'bg-emerald-50 dark:bg-emerald-500/10',  activeColor: 'text-emerald-600 dark:text-emerald-300',  activeBorder: 'border border-emerald-200 dark:border-emerald-500/30' },
  { id: 'main',       label: 'Main',       icon: Layout,     activeBg: 'bg-sky-50 dark:bg-sky-500/10',          activeColor: 'text-sky-600 dark:text-sky-300',          activeBorder: 'border border-sky-200 dark:border-sky-500/30' },
  { id: 'content',    label: 'Content',    icon: Package,    activeBg: 'bg-blue-50 dark:bg-blue-500/10',        activeColor: 'text-blue-600 dark:text-blue-300',        activeBorder: 'border border-blue-200 dark:border-blue-500/30' },
  { id: 'sections',   label: 'Sections',   icon: Layers,     activeBg: 'bg-gray-100 dark:bg-[var(--bg-secondary)]',    activeColor: 'text-gray-700 dark:text-[var(--text-secondary)]',    activeBorder: 'border border-gray-300 dark:border-gray-600' },
  { id: 'footer',     label: 'Footer',     icon: Footprints, activeBg: 'bg-amber-50 dark:bg-amber-500/10',      activeColor: 'text-amber-600 dark:text-amber-300',      activeBorder: 'border border-amber-200 dark:border-amber-500/30' },
  { id: 'template',   label: 'Template',   icon: Sparkles,   activeBg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10',  activeColor: 'text-fuchsia-600 dark:text-fuchsia-300',  activeBorder: 'border border-fuchsia-200 dark:border-fuchsia-500/30' },
  { id: 'appearance', label: 'Appearance', icon: Paintbrush, activeBg: 'bg-rose-50 dark:bg-rose-500/10',        activeColor: 'text-rose-600 dark:text-rose-300',        activeBorder: 'border border-rose-200 dark:border-rose-500/30' },
  { id: 'settings',   label: 'Settings',   icon: Settings,   activeBg: 'bg-gray-100 dark:bg-[var(--bg-secondary)]',          activeColor: 'text-[var(--text-primary)]',            activeBorder: 'border border-gray-300 dark:border-gray-600' },
  { id: 'advanced',   label: 'Advanced',   icon: Code2,      activeBg: 'bg-orange-50 dark:bg-orange-500/10',    activeColor: 'text-orange-600 dark:text-orange-300',    activeBorder: 'border border-orange-200 dark:border-orange-500/30' },
];

const DEVICES = [
  { id: 'desktop', icon: Monitor,    label: 'Desktop', width: '100%'  },
  { id: 'tablet',  icon: Tablet,     label: 'Tablet',  width: '768px' },
  { id: 'mobile',  icon: Smartphone, label: 'Mobile',  width: '375px' },
] as const;

// ─── Hero / Banner data ──────────────────────────────────────────────────────

type HeroData = {
  enabled: boolean;
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  overlayOpacity: number;
  textAlign: 'left' | 'center' | 'right';
};

// ─── Snapshot type for undo/redo ────────────────────────────────────────────

type Snapshot = {
  sections: Section[];
  assigned: string[];
  title: string;
  description: string;
  headerData: HeaderData;
  footerData: FooterData;
  palette: Record<string, string>;
  heroData: HeroData;
  appearance: BioAppearanceData;
  customCss: string;
  customJs: string;
};

// ─── Template presets ────────────────────────────────────────────────────────

const STORE_TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    desc: 'Clean white store with a timeless look',
    palette: { primary: '#6366f1', background: '#ffffff', text: '#111827', muted: '#6b7280', border: '#e5e7eb' },
  },
  {
    id: 'dark-minimal',
    name: 'Dark Minimal',
    desc: 'Sleek dark theme with bold accents',
    palette: { primary: '#818cf8', background: '#0f0f1a', text: '#f9fafb', muted: '#9ca3af', border: '#1f2937' },
  },
  {
    id: 'warm',
    name: 'Warm Amber',
    desc: 'Cozy earthy tones for lifestyle brands',
    palette: { primary: '#d97706', background: '#fffbeb', text: '#1c1917', muted: '#78716c', border: '#fde68a' },
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    desc: 'Fresh and trustworthy blue palette',
    palette: { primary: '#0ea5e9', background: '#f0f9ff', text: '#0c4a6e', muted: '#0369a1', border: '#bae6fd' },
  },
  {
    id: 'forest',
    name: 'Forest',
    desc: 'Natural greens for eco-friendly brands',
    palette: { primary: '#16a34a', background: '#f0fdf4', text: '#14532d', muted: '#4ade80', border: '#bbf7d0' },
  },
  {
    id: 'bold-red',
    name: 'Bold Red',
    desc: 'High-energy red for high-conversion stores',
    palette: { primary: '#dc2626', background: '#fff5f5', text: '#1a1a1a', muted: '#6b7280', border: '#fecaca' },
  },
];

// ─── Reusable UI ─────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, desc, color = 'pink', children }: {
  icon: React.ElementType; title: string; desc?: string; color?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[var(--bg-secondary)] border border-gray-200/60 dark:border-[var(--border)]/60 rounded-3xl p-6 space-y-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Icon className={`w-4 h-4 text-${color}-500`} /> {title}
        </h3>
        {desc && <p className="text-[13px] text-gray-500 mt-1">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

const INPUT = 'w-full px-4 py-2.5 bg-gray-50/50 dark:bg-[var(--bg-secondary)]/30 border border-[var(--border)] rounded-xl text-[13px] focus:border-gray-500 focus:ring-4 focus:ring-gray-400/20 outline-none text-[var(--text-primary)] placeholder-gray-400 transition-all';
const LABEL = 'block text-[13px] font-medium text-gray-700 dark:text-[var(--text-secondary)] mb-1.5';

// ─── Component ──────────────────────────────────────────────────────────────

export default function EditMainStorePage() {
  const params   = useParams();
  const router   = useRouter();
  const { theme, setTheme } = useTheme();
  const siteId   = params.id as string;
  const supabase = createClient();
  const iframeRef        = useRef<HTMLIFrameElement>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const [previewW, setPreviewW] = useState(0);

  // Measure available preview width for zoom calculation
  useEffect(() => {
    const el = previewWrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setPreviewW(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── UI state ──
  const [activeTab, setActiveTab]           = useState<Tab>('header');
  const [tabSidebarOpen, setTabSidebarOpen] = useState(true);
  const [device, setDevice]                 = useState<string>('desktop');
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [loading, setLoading]               = useState(true);
  const [previewKey, setPreviewKey]         = useState(Date.now());
  const [copied, setCopied]                 = useState(false);
  const [heroBgPicker, setHeroBgPicker]     = useState(false);

  // ── Site data ──
  const [site, setSite]               = useState<any>(null);
  const [isPublished, setIsPublished] = useState(true);

  // ── Slug ──
  const [slug, setSlug]               = useState('');
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);
  const [slugStatus, setSlugStatus]   = useState<'idle'|'checking'|'available'|'taken'|'invalid'>('idle');

  // ── Content state ──
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections]       = useState<Section[]>([]);
  const [assigned, setAssigned]       = useState<Set<string>>(new Set());

  // ── Header / Footer ──
  const [headerData, setHeaderData] = useState<HeaderData>({
    logoUrl: '', logoAlt: '', navItems: [],
    showSearch: false, showCart: true, stickyHeader: true,
  });
  const [footerData, setFooterData] = useState<FooterData>({
    social: { instagram: '', youtube: '', twitter: '', linkedin: '' },
    legal: { about: false, terms: false, privacy: false, refund: false },
    contactEmail: '', contactPhone: '', copyrightText: '',
  });

  // ── Hero / Banner ──
  const [heroData, setHeroData] = useState<HeroData>({
    enabled: false,
    imageUrl: '',
    title: '',
    subtitle: '',
    ctaLabel: 'Shop Now',
    ctaUrl: '',
    overlayOpacity: 40,
    textAlign: 'center',
  });

  // ── Settings ──
  const [settingsData, setSettingsData] = useState<SettingsData>({
    metaTitle: '', metaDesc: '', customDomain: '',
    slug: '', originalSlug: null,
  });

  // ── Appearance ──
  const [appearance, setAppearance] = useState<BioAppearanceData>({
    layoutStyle: 'default',
    buttonStyle: 'rounded',
    backgroundType: 'solid',
    backgroundValue: '#ffffff',
    showWatermark: false,
    showShareButton: true,
    fontFamily: 'system',
    cardStyle: 'solid',
    animation: 'none',
    borderRadius: 'md',
    spacing: 'default',
  });

  // ── Theme / palette ──
  const [palette, setPalette] = useState<Record<string, string>>({});

  // ── Advanced ──
  const [customCss, setCustomCss] = useState('');
  const [customJs, setCustomJs]   = useState('');

  // ─── Undo / Redo ────────────────────────────────────────────────────────

  const historyRef      = useRef<Snapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef  = useRef(false);

  const pushSnapshot = useCallback(() => {
    if (isRestoringRef.current) return;
    const snap: Snapshot = {
      sections:    JSON.parse(JSON.stringify(sections)),
      assigned:    Array.from(assigned),
      title, description,
      headerData:  { ...headerData, navItems: [...headerData.navItems] },
      footerData:  JSON.parse(JSON.stringify(footerData)),
      palette:     { ...palette },
      heroData:    { ...heroData },
      appearance:  { ...appearance },
      customCss, customJs,
    };
    const idx = historyIndexRef.current;
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push(snap);
    if (historyRef.current.length > 50) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
  }, [sections, assigned, title, description, headerData, footerData, palette, heroData, appearance, customCss, customJs]);

  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (loading) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(pushSnapshot, 400);
    return () => { if (pushTimerRef.current) clearTimeout(pushTimerRef.current); };
  }, [sections, assigned, title, description, headerData, footerData, palette, heroData, appearance, customCss, customJs, loading, pushSnapshot]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isRestoringRef.current = true;
    historyIndexRef.current -= 1;
    const snap = historyRef.current[historyIndexRef.current];
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
    requestAnimationFrame(() => { isRestoringRef.current = false; });
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isRestoringRef.current = true;
    historyIndexRef.current += 1;
    const snap = historyRef.current[historyIndexRef.current];
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
    requestAnimationFrame(() => { isRestoringRef.current = false; });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' &&  e.shiftKey) { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y')                 { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  // ─── Load data ────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: s }, { data: sm }, { data: nav }, { data: tokens }, { data: config }, { data: asgn }] = await Promise.all([
          supabase.from('sites').select('*').eq('id', siteId).single(),
          supabase.from('site_main').select('*').eq('site_id', siteId).maybeSingle(),
          supabase.from('site_navigation').select('*').eq('site_id', siteId).maybeSingle(),
          supabase.from('site_design_tokens').select('color_palette').eq('site_id', siteId).maybeSingle(),
          supabase.from('site_sections_config').select('sections').eq('site_id', siteId).maybeSingle(),
          supabase.from('site_product_assignments').select('product_id').eq('site_id', siteId),
        ]);

        setSite(s);
        setIsPublished(s?.is_active ?? true);
        setSlug(s?.slug ?? '');
        setOriginalSlug(s?.slug ?? null);

        setTitle(sm?.title ?? '');
        setDescription(sm?.meta_description ?? '');

        setHeaderData({
          logoUrl: nav?.header_logo_url ?? '',
          logoAlt: nav?.header_logo_alt ?? '',
          navItems: (nav?.nav_items as { label: string; url: string }[]) ?? [],
          showSearch: nav?.show_search ?? false,
          showCart: nav?.show_cart_icon ?? true,
          stickyHeader: nav?.sticky_header ?? true,
        });

        setFooterData({
          social: (sm?.social_links as Record<string, string>) ?? { instagram: '', youtube: '', twitter: '', linkedin: '' },
          legal: (sm?.legal_pages as Record<string, boolean>) ?? { about: false, terms: false, privacy: false, refund: false },
          contactEmail: sm?.contact_email ?? '',
          contactPhone: sm?.contact_mobile ?? '',
          copyrightText: nav?.footer_bottom_text ?? '',
        });

        setSettingsData({
          metaTitle: sm?.meta_keywords ?? '',
          metaDesc: sm?.meta_description ?? '',
          customDomain: s?.custom_domain ?? '',
          slug: s?.slug ?? '',
          originalSlug: s?.slug ?? null,
        });

        // Hero data from site_main metadata
        const meta = sm?.metadata as Record<string, any> ?? {};
        if (meta.hero) {
          setHeroData({ ...heroData, ...meta.hero });
        }

        // Appearance from metadata
        if (meta.appearance) {
          setAppearance((prev) => ({ ...prev, ...meta.appearance }));
        }

        // Advanced
        setCustomCss(meta.customCss ?? '');
        setCustomJs(meta.customJs ?? '');

        if (tokens?.color_palette) setPalette(tokens.color_palette as Record<string, string>);

        const raw = config?.sections as Section[] | null;
        if (raw) setSections([...raw].sort((a, b) => a.sort_order - b.sort_order));

        setAssigned(new Set((asgn ?? []).map((a: any) => a.product_id)));
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  // ─── Slug availability check ─────────────────────────────────────────────

  useEffect(() => {
    if (!slug || slug === originalSlug) { setSlugStatus('idle'); return; }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 3) { setSlugStatus('invalid'); return; }
    setSlugStatus('checking');
    const t = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/sites/check-slug?slug=${encodeURIComponent(slug)}&type=main`);
        const json = await res.json();
        setSlugStatus(json.available ? 'available' : 'taken');
      } catch { setSlugStatus('idle'); }
    }, 400);
    return () => clearTimeout(t);
  }, [slug, originalSlug]);

  // ─── Push theme to iframe in real time ───────────────────────────────────

  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestPaletteRef = useRef(palette);
  latestPaletteRef.current = palette;

  useEffect(() => {
    if (loading) return;
    clearTimeout(sendTimerRef.current);
    sendTimerRef.current = setTimeout(() => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'theme-update', palette: latestPaletteRef.current },
          window.location.origin,
        );
      } catch { /* cross-origin guard */ }
    }, 16);
    return () => clearTimeout(sendTimerRef.current);
  }); // intentionally no deps — debounced per render

  // ─── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (slugStatus === 'taken' || slugStatus === 'invalid' || slugStatus === 'checking') {
      alert('Please fix your URL and try again.');
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      // 1. slug + publish
      if (slug !== originalSlug || isPublished !== site?.is_active) {
        await supabase.from('sites').update({ slug, is_active: isPublished, updated_at: new Date().toISOString() }).eq('id', siteId);
        setOriginalSlug(slug);
        setSite((prev: any) => ({ ...prev, slug, is_active: isPublished }));
      }

      // 2. site_main
      const smPayload = {
        title,
        meta_description: description,
        meta_keywords: settingsData.metaTitle,
        social_links: footerData.social,
        legal_pages: footerData.legal,
        logo_url: headerData.logoUrl || null,
        contact_email: footerData.contactEmail || null,
        contact_mobile: footerData.contactPhone || null,
        metadata: {
          hero: heroData,
          appearance,
          customCss,
          customJs,
        },
      };
      const { data: existingSm } = await supabase.from('site_main').select('site_id').eq('site_id', siteId).maybeSingle();
      if (existingSm) {
        await supabase.from('site_main').update(smPayload).eq('site_id', siteId);
      } else {
        await supabase.from('site_main').insert({ site_id: siteId, ...smPayload } as any);
      }

      // 3. site_navigation
      await supabase.from('site_navigation').upsert({
        site_id: siteId,
        nav_items: headerData.navItems,
        show_search: headerData.showSearch,
        show_cart_icon: headerData.showCart,
        sticky_header: headerData.stickyHeader,
        header_logo_url: headerData.logoUrl || null,
        header_logo_alt: headerData.logoAlt || null,
        footer_bottom_text: footerData.copyrightText || null,
      }, { onConflict: 'site_id' });

      // 4. sections config
      const { data: configExists } = await supabase.from('site_sections_config').select('site_id').eq('site_id', siteId).maybeSingle();
      if (configExists) {
        await supabase.from('site_sections_config').update({ sections: sections as any }).eq('site_id', siteId);
      } else {
        await supabase.from('site_sections_config').insert({ site_id: siteId, site_type: 'main', sections: sections as any });
      }

      // 5. product assignments
      await supabase.from('site_product_assignments').delete().eq('site_id', siteId);
      if (assigned.size > 0) {
        const rows = Array.from(assigned).map((product_id, i) => ({ site_id: siteId, product_id, sort_order: i + 1 }));
        await supabase.from('site_product_assignments').insert(rows);
      }

      // 6. design tokens
      const { data: tkn } = await supabase.from('site_design_tokens').select('id').eq('site_id', siteId).maybeSingle();
      if (tkn) {
        await supabase.from('site_design_tokens').update({ color_palette: palette }).eq('id', tkn.id);
      } else {
        const { data: user } = await supabase.auth.getUser();
        if (user.user?.id) {
          await supabase.from('site_design_tokens').insert({ site_id: siteId, creator_id: user.user.id, color_palette: palette, spacing_scale: {}, typography: {}, border_radius_scale: {} });
        }
      }

      // 7. revalidate ISR
      try { await revalidateStorefrontPaths([`/store/${slug}`, '/']); } catch { /* non-fatal */ }

      setPreviewKey(Date.now());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const displayTitle = site?.slug ?? 'Untitled Store';
  const previewUrl   = site ? `${getSitePublicPath(site)}?preview=1&t=${previewKey}` : null;

  const copyUrl = () => {
    if (!site) return;
    navigator.clipboard.writeText(`https://${getSiteDisplayUrl(site)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="flex-1 flex min-h-0">

        {/* ═══ LEFT PANEL ═══ */}
        <div className="w-1/2 shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--bg-primary)] z-10 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_24px_-10px_rgba(0,0,0,0.5)]">

          {/* Left panel header */}
          <div className="shrink-0 h-14 border-b border-[var(--border)] flex items-center justify-between px-4 bg-[var(--bg-primary)]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard/sites')}
                className="p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[200px]">
                  {displayTitle}
                </h1>
                {!loading && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <Store className="w-3 h-3" /> Main Store
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Publish badge */}
              <button
                onClick={() => setIsPublished(p => !p)}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  isPublished
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-gray-50 dark:bg-[var(--bg-secondary)] text-gray-400 border-gray-200 dark:border-[var(--border)]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                {isPublished ? 'Published' : 'Draft'}
              </button>

              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title="Toggle Theme"
                className="p-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/50 hover:bg-white dark:hover:bg-[var(--bg-secondary)] transition-all shadow-sm"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-gray-500" /> : <Moon className="w-4 h-4 text-gray-500" />}
              </button>

              {/* Undo / Redo */}
              <div className="flex items-center gap-1 border border-[var(--border)] rounded-xl bg-[var(--bg-secondary)]/50 p-1">
                <button onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"
                  className={`p-1.5 rounded-lg transition-all ${canUndo ? 'text-gray-700 dark:text-[var(--text-primary)] hover:bg-white dark:hover:bg-gray-700 shadow-sm' : 'text-gray-300 dark:text-gray-700 opacity-50'}`}>
                  <Undo2 className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-gray-200 dark:bg-[var(--bg-secondary)]" />
                <button onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Y)"
                  className={`p-1.5 rounded-lg transition-all ${canRedo ? 'text-gray-700 dark:text-[var(--text-primary)] hover:bg-white dark:hover:bg-gray-700 shadow-sm' : 'text-gray-300 dark:text-gray-700 opacity-50'}`}>
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving || slugStatus === 'taken' || slugStatus === 'invalid'}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all focus:ring-4 focus:ring-gray-400/20 active:scale-95 disabled:opacity-50 ${
                  saved
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900'
                }`}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>

          {/* Body: vertical tab sidebar + scrollable editor */}
          <div className="flex-1 flex min-h-0 overflow-hidden">

            {/* Vertical Tab Sidebar */}
            <div className={`shrink-0 flex flex-col border-r border-[var(--border)] bg-gray-50/80 dark:bg-[var(--bg-secondary)] transition-all duration-200 ${tabSidebarOpen ? 'w-44' : 'w-14'}`}>
              <button
                onClick={() => setTabSidebarOpen(!tabSidebarOpen)}
                className="h-10 flex items-center justify-end pr-3 text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] transition-colors shrink-0"
                title={tabSidebarOpen ? 'Collapse tabs' : 'Expand tabs'}
              >
                <ArrowLeft className={`w-3.5 h-3.5 transition-transform duration-200 ${tabSidebarOpen ? '' : 'rotate-180'}`} />
              </button>

              <div className="flex flex-col gap-1 px-2 pb-4">
                {TABS.map(tab => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      title={tab.label}
                      className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200 ${
                        active
                          ? `${tab.activeBg} ${tab.activeColor} ${tab.activeBorder} shadow-sm`
                          : 'text-gray-500 hover:text-gray-800 dark:hover:text-[var(--text-primary)] hover:bg-gray-200/50 dark:hover:bg-[var(--bg-secondary)]/50'
                      } ${tabSidebarOpen ? 'justify-start' : 'justify-center'}`}
                    >
                      <tab.icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
                      {tabSidebarOpen && <span className="truncate">{tab.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable editor content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* ── Header ── */}
              {activeTab === 'header' && <HeaderEditor data={headerData} onChange={setHeaderData} />}

              {/* ── Main (Hero/Banner) ── */}
              {activeTab === 'main' && (
                <div className="space-y-5">
                  <div className="p-3 bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 rounded-xl text-xs text-sky-700 dark:text-sky-300 flex items-start gap-2">
                    <Layout className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Configure the hero banner shown at the top of your store homepage.
                  </div>

                  <SectionCard icon={ToggleLeft} title="Hero Banner" desc="Show a full-width banner at the top" color="sky">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-700 dark:text-[var(--text-secondary)]">Enable Hero Banner</span>
                      <button
                        onClick={() => setHeroData(h => ({ ...h, enabled: !h.enabled }))}
                        className={`relative w-10 h-5 rounded-full transition ${heroData.enabled ? 'bg-sky-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${heroData.enabled ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </label>
                  </SectionCard>

                  {heroData.enabled && (
                    <>
                      <SectionCard icon={ImageIcon} title="Banner Image" desc="Full-width background image" color="sky">
                        {heroData.imageUrl ? (
                          <div className="relative rounded-xl overflow-hidden h-32 bg-gray-100 dark:bg-[var(--bg-secondary)]">
                            <img src={heroData.imageUrl} alt="Hero" className="w-full h-full object-cover" />
                            <button
                              onClick={() => setHeroData(h => ({ ...h, imageUrl: '' }))}
                              className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setHeroBgPicker(true)}
                            className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-gray-200 dark:border-[var(--border)] rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-[var(--text-primary)] hover:border-sky-400 transition"
                          >
                            <ImageIcon className="w-5 h-5" />
                            <span className="text-xs font-medium">Click to upload image</span>
                          </button>
                        )}
                        <div>
                          <label className={LABEL}>Overlay opacity: {heroData.overlayOpacity}%</label>
                          <input type="range" min={0} max={90} step={5} value={heroData.overlayOpacity}
                            onChange={e => setHeroData(h => ({ ...h, overlayOpacity: Number(e.target.value) }))}
                            className="w-full accent-sky-500" />
                        </div>
                      </SectionCard>

                      <SectionCard icon={Type} title="Banner Text" desc="Headline and subtitle" color="sky">
                        <div>
                          <label className={LABEL}>Headline</label>
                          <input type="text" value={heroData.title} onChange={e => setHeroData(h => ({ ...h, title: e.target.value }))} className={INPUT} placeholder="Welcome to our store" />
                        </div>
                        <div>
                          <label className={LABEL}>Subtitle</label>
                          <textarea rows={2} value={heroData.subtitle} onChange={e => setHeroData(h => ({ ...h, subtitle: e.target.value }))} className={`${INPUT} resize-none`} placeholder="Discover our amazing products…" />
                        </div>
                        <div>
                          <label className={LABEL}>Text Alignment</label>
                          <div className="flex gap-2">
                            {(['left', 'center', 'right'] as const).map(a => (
                              <button key={a} onClick={() => setHeroData(h => ({ ...h, textAlign: a }))}
                                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition capitalize ${heroData.textAlign === a ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-200 dark:border-sky-500/30' : 'border-gray-200 dark:border-[var(--border)] text-gray-500 hover:border-gray-300'}`}>
                                {a}
                              </button>
                            ))}
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard icon={AlignLeft} title="Call to Action" desc="Button shown in the banner" color="sky">
                        <div>
                          <label className={LABEL}>Button Label</label>
                          <input type="text" value={heroData.ctaLabel} onChange={e => setHeroData(h => ({ ...h, ctaLabel: e.target.value }))} className={INPUT} placeholder="Shop Now" />
                        </div>
                        <div>
                          <label className={LABEL}>Button URL</label>
                          <input type="text" value={heroData.ctaUrl} onChange={e => setHeroData(h => ({ ...h, ctaUrl: e.target.value }))} className={INPUT} placeholder="/products or https://..." />
                        </div>
                      </SectionCard>
                    </>
                  )}

                  <SectionCard icon={Store} title="Store Info" desc="Basic info shown on your store" color="sky">
                    <div>
                      <label className={LABEL}>Store Name</label>
                      <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={INPUT} placeholder="My awesome store" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[13px] font-medium text-gray-700 dark:text-[var(--text-secondary)]">Description</label>
                        <span className={`text-[11px] tabular-nums ${description.length > 200 ? 'text-red-500' : 'text-gray-400'}`}>{description.length}/200</span>
                      </div>
                      <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className={`${INPUT} resize-none`} placeholder="What your store is about…" />
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* ── Content (Products) ── */}
              {activeTab === 'content' && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                    <Package className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Select which products appear on your store front page.
                  </div>
                  <ProductAssigner siteId={siteId} assigned={assigned} onChange={setAssigned} />
                </div>
              )}

              {/* ── Sections ── */}
              {activeTab === 'sections' && (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-100 dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] rounded-xl text-xs text-gray-700 dark:text-[var(--text-secondary)] flex items-start gap-2">
                    <Layers className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Add, reorder, and configure sections for your store homepage.
                  </div>
                  <SectionManager sections={sections} onChange={setSections} />
                </div>
              )}

              {/* ── Footer ── */}
              {activeTab === 'footer' && <FooterEditor data={footerData} onChange={setFooterData} />}

              {/* ── Template ── */}
              {activeTab === 'template' && (
                <div className="space-y-4">
                  <div className="p-3 bg-fuchsia-50 dark:bg-fuchsia-500/10 border border-fuchsia-100 dark:border-fuchsia-500/20 rounded-xl text-xs text-fuchsia-700 dark:text-fuchsia-300 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Choose a template to instantly apply a matching color palette.
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {STORE_TEMPLATES.map(tpl => (
                      <button key={tpl.id} onClick={() => setPalette(tpl.palette)}
                        className="flex items-center gap-4 p-4 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200/60 dark:border-[var(--border)]/60 rounded-2xl hover:border-fuchsia-300 dark:hover:border-fuchsia-500/40 transition-all group text-left">
                        <div className="flex gap-1.5 shrink-0">
                          {Object.values(tpl.palette).slice(0, 3).map((c, i) => (
                            <span key={i} className="w-6 h-6 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-300 transition">{tpl.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{tpl.desc}</p>
                        </div>
                        <span className="text-xs font-medium text-gray-400 group-hover:text-fuchsia-500 shrink-0 transition">Apply →</span>
                      </button>
                    ))}
                  </div>
                  <div className="bg-white dark:bg-[var(--bg-secondary)] border border-gray-200/60 dark:border-[var(--border)]/60 rounded-3xl p-6 space-y-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <Paintbrush className="w-4 h-4 text-fuchsia-500" /> Custom Colors
                    </h3>
                    <ThemeEditor palette={palette} onChange={setPalette} />
                  </div>
                </div>
              )}

              {/* ── Appearance ── */}
              {activeTab === 'appearance' && (
                <BioAppearanceEditor
                  data={appearance}
                  onChange={setAppearance}
                  palette={palette}
                  onPaletteChange={(key, val) => setPalette(p => ({ ...p, [key]: val }))}
                />
              )}

              {/* ── Settings ── */}
              {activeTab === 'settings' && (
                <div className="space-y-5">
                  <div className="bg-white dark:bg-[var(--bg-secondary)] border border-gray-200/60 dark:border-[var(--border)]/60 rounded-3xl p-6 space-y-5 shadow-sm">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <Globe2 className="w-4 h-4 text-pink-500" /> Public URL
                      </h3>
                      <p className="text-[13px] text-gray-500 mt-1">Your store's public address</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 dark:bg-[var(--bg-secondary)]/30 border border-[var(--border)] rounded-xl mb-2 focus-within:border-pink-500 focus-within:ring-4 focus-within:ring-pink-500/10 transition-all">
                        <span className="text-[13px] font-medium text-gray-400 shrink-0 select-none">digione.ai/store/</span>
                        <input type="text" value={slug}
                          onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          className="flex-1 bg-transparent outline-none text-[13px] font-semibold text-[var(--text-primary)] placeholder-gray-400 min-w-0"
                          placeholder="my-store" />
                        {slugStatus === 'checking'  && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 shrink-0" />}
                        {slugStatus === 'available' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        {(slugStatus === 'taken' || slugStatus === 'invalid') && <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 min-h-5">
                        {slugStatus === 'idle' && slug === originalSlug && slug.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Your current URL</span>
                        )}
                        {slugStatus === 'available' && <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Available — save to apply</span>}
                        {slugStatus === 'taken'     && <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="w-3.5 h-3.5" /> Already taken</span>}
                        {slugStatus === 'invalid'   && <span className="text-xs text-red-500">3+ chars, letters, numbers, hyphens only</span>}
                      </div>
                    </div>
                    <button onClick={copyUrl} className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-800 dark:hover:text-[var(--text-primary)] transition">
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy URL'}
                    </button>
                  </div>

                  <div className="bg-white dark:bg-[var(--bg-secondary)] border border-gray-200/60 dark:border-[var(--border)]/60 rounded-3xl p-6 space-y-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">SEO &amp; Meta</h3>
                    <div>
                      <label className={LABEL}>Meta Title</label>
                      <input type="text" value={settingsData.metaTitle}
                        onChange={e => setSettingsData(p => ({ ...p, metaTitle: e.target.value }))}
                        className={INPUT} placeholder="Store title for search engines" />
                    </div>
                    <div>
                      <label className={LABEL}>Meta Description</label>
                      <textarea rows={3} value={settingsData.metaDesc}
                        onChange={e => setSettingsData(p => ({ ...p, metaDesc: e.target.value }))}
                        className={`${INPUT} resize-none`} placeholder="Brief description for search results…" />
                    </div>
                    {settingsData.customDomain !== undefined && (
                      <div>
                        <label className={LABEL}>Custom Domain</label>
                        <input type="text" value={settingsData.customDomain}
                          onChange={e => setSettingsData(p => ({ ...p, customDomain: e.target.value }))}
                          className={INPUT} placeholder="shop.yourdomain.com" />
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-[var(--bg-secondary)] border border-gray-200/60 dark:border-[var(--border)]/60 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Visibility</p>
                        <p className="text-[13px] text-gray-500 mt-0.5">Control whether your store is publicly accessible</p>
                      </div>
                      <button onClick={() => setIsPublished(p => !p)} role="switch" aria-checked={isPublished}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${isPublished ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Advanced ── */}
              {activeTab === 'advanced' && (
                <div className="space-y-5">
                  <div className="p-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-xl text-xs text-orange-700 dark:text-orange-300 flex items-start gap-2">
                    <Code2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Advanced customization. Changes here affect your live store directly.
                  </div>
                  <SectionCard icon={Code2} title="Custom CSS" desc="Injected into your store's &lt;head&gt;" color="orange">
                    <textarea rows={10} value={customCss} onChange={e => setCustomCss(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900 text-green-400 border border-gray-700 rounded-xl text-[12px] font-mono focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none placeholder-gray-600 resize-none transition-all"
                      placeholder={`/* Custom styles */\n.my-element {\n  color: red;\n}`} spellCheck={false} />
                  </SectionCard>
                  <SectionCard icon={Code2} title="Custom JavaScript" desc="Injected before &lt;/body&gt; — use with care" color="orange">
                    <textarea rows={10} value={customJs} onChange={e => setCustomJs(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900 text-yellow-300 border border-gray-700 rounded-xl text-[12px] font-mono focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none placeholder-gray-600 resize-none transition-all"
                      placeholder={`// Custom scripts\nconsole.log('hello');`} spellCheck={false} />
                  </SectionCard>
                </div>
              )}

            </div>{/* end scrollable editor */}
          </div>{/* end body flex */}
        </div>{/* end LEFT PANEL */}

        {/* ═══ RIGHT PANEL — full-height preview ═══ */}
        <div className="flex-1 flex flex-col bg-gray-100 dark:bg-[var(--bg-secondary)]">

          {/* Preview Header */}
          <div className="shrink-0 h-14 border-b border-[var(--border)] flex items-center px-4 gap-3 relative">
            <a
              href={site ? `https://${getSiteDisplayUrl(site)}` : undefined}
              target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-gray-800 dark:hover:text-[var(--text-primary)] bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] hover:border-gray-400 dark:hover:border-gray-500 px-3 py-1.5 rounded-lg transition-all shrink-0 ${!site ? 'opacity-40 pointer-events-none' : ''}`}
              title="Open in browser"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </a>
            <button
              onClick={copyUrl} disabled={!site}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-gray-800 dark:hover:text-[var(--text-primary)] bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] hover:border-gray-400 dark:hover:border-gray-500 px-3 py-1.5 rounded-lg transition-all shrink-0 disabled:opacity-40"
              title="Copy page link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Link'}
            </button>

            {/* Centered label */}
            <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Website Preview
              </span>
            </div>

            <div className="flex-1" />

            {/* Device toggles */}
            <div className="flex items-center gap-1 bg-white dark:bg-[var(--bg-secondary)] p-1 rounded-lg border border-gray-200 dark:border-[var(--border)] shrink-0">
              {[
                { id: 'desktop', icon: Monitor,    label: 'Desktop' },
                { id: 'tablet',  icon: Tablet,     label: 'Tablet'  },
                { id: 'mobile',  icon: Smartphone, label: 'Mobile'  },
              ].map(dev => (
                <button key={dev.id} onClick={() => setDevice(dev.id)}
                  className={`p-1.5 rounded-md transition ${device === dev.id ? 'bg-gray-100 dark:bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                  title={dev.label}>
                  <dev.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Zoom-aware preview iframe */}
          {(() => {
            const DESKTOP_W = 1280;
            const DESKTOP_H = Math.round(DESKTOP_W * 10 / 16); // 16:10 ≈ 800px
            const isDesktop = device === 'desktop';
            const isMobile  = device === 'mobile';
            const devicePx  = isDesktop ? DESKTOP_W : isMobile ? 375 : 768;
            // Zoom the 1280px desktop frame to fit whatever width the right panel has
            const zoom = isDesktop && previewW > 0 ? Math.min(1, (previewW - 48) / DESKTOP_W) : 1;
            const previewUrl = site ? `${getSitePublicPath(site)}?preview=1&t=${previewKey}` : null;

            const BrowserChrome = () => (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-[var(--bg-secondary)] border-b border-gray-200 dark:border-[var(--border)] shrink-0">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 px-3 py-1 bg-white dark:bg-[var(--bg-secondary)] rounded-md border border-gray-200 dark:border-[var(--border)]">
                  <p className="text-[10px] text-gray-400 font-mono truncate">
                    {site ? `https://${getSiteDisplayUrl(site)}` : 'Loading…'}
                  </p>
                </div>
                <button onClick={() => setPreviewKey(Date.now())}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition" title="Refresh">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            );

            return (
              <div
                ref={previewWrapperRef}
                className={`flex-1 flex items-start justify-center px-6 pb-6 overflow-y-auto overflow-x-hidden ${isDesktop ? 'pt-10' : 'pt-6'}`}
              >
                <div
                  className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl shadow-2xl border border-gray-200 dark:border-[var(--border)] overflow-hidden flex flex-col"
                  style={{
                    width: devicePx,
                    maxWidth: '100%',
                    height: isDesktop ? DESKTOP_H : '100%',
                    zoom: isDesktop ? zoom : undefined,
                    transformOrigin: 'top left',
                  }}
                >
                  <BrowserChrome />
                  {previewUrl ? (
                    <iframe ref={iframeRef} key={previewKey} src={previewUrl}
                      className="w-full flex-1 border-0" title="Store Preview" />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                      No preview available
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        </div>{/* end RIGHT PANEL */}

      </div>

      {/* Hero image picker modal */}
      {heroBgPicker && (
        <ImagePickerModal
          open={true}
          onSelect={(url) => { setHeroData(h => ({ ...h, imageUrl: url })); setHeroBgPicker(false); }}
          onClose={() => setHeroBgPicker(false)}
        />
      )}
    </div>
  );
}
