'use client';
// Edit page: Link in Bio — custom split-screen editor.
// Mini sidebar + Left panel (header + tabs + editor) + Right panel (preview).

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import BioProfileEditor, { type BioProfileData, type SocialLink } from '@/components/dashboard/site-edit/tabs/BioProfileEditor';
import BioLinksEditor, { type BioLink } from '@/components/dashboard/site-edit/tabs/BioLinksEditor';
import BioAppearanceEditor, { type BioAppearanceData } from '@/components/dashboard/site-edit/tabs/BioAppearanceEditor';
import {
  Link2, User, LinkIcon, Sparkles, Paintbrush,
  ArrowLeft, Save, Loader2, CheckCircle2, ExternalLink,
  Settings, Monitor, Tablet, Smartphone, RefreshCw,
  XCircle, LayoutDashboard, Package, Store, BarChart2,
  Copy, Check,
} from 'lucide-react';

// ─── Device presets ──────────────────────────────────────────
const DEVICES = [
  { id: 'desktop',  icon: Monitor,    width: '100%',  label: 'Desktop' },
  { id: 'tablet',   icon: Tablet,     width: '768px', label: 'Tablet'  },
  { id: 'mobile',   icon: Smartphone, width: '375px', label: 'Mobile'  },
] as const;

// ─── Mini sidebar nav ────────────────────────────────────────
const MINI_NAV = [
  { href: '/dashboard',           icon: LayoutDashboard, label: 'Overview'  },
  { href: '/dashboard/products',  icon: Package,         label: 'Products'  },
  { href: '/dashboard/sites',     icon: Store,           label: 'Sites'     },
  { href: '/dashboard/settings',  icon: Settings,        label: 'Settings'  },
];

// ─── Tabs ────────────────────────────────────────────────────
type Tab = 'profile' | 'templates' | 'section' | 'appearance' | 'settings';
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile',    label: 'Profile',    icon: User },
  { id: 'templates',  label: 'Templates',  icon: Paintbrush },
  { id: 'section',    label: 'Section',    icon: LinkIcon },
  { id: 'appearance', label: 'Appearance', icon: Sparkles },
  { id: 'settings',   label: 'Settings',   icon: Settings },
];

// ─── Templates ──────────────────────────────────────────────
type BioTemplate = {
  name: string;
  preview: { bg: string; accent: string; text: string; card: string };
  palette: Record<string, string>;
  layoutStyle: string;
  buttonStyle: string;
  backgroundType: string;
  backgroundValue: string;
};

const TEMPLATES: BioTemplate[] = [
  {
    name: 'Minimal Light',
    preview: { bg: '#FFFFFF', accent: '#0F172A', text: '#0F172A', card: '#F8FAFC' },
    palette: { primary: '#0F172A', text: '#0F172A', surface: '#F8FAFC', muted: '#64748B', background: '#FFFFFF' },
    layoutStyle: 'classic', buttonStyle: 'rounded',
    backgroundType: 'solid', backgroundValue: '#FFFFFF',
  },
  {
    name: 'Rose Pink',
    preview: { bg: '#FFF1F2', accent: '#EC4899', text: '#0F172A', card: '#FFFFFF' },
    palette: { primary: '#EC4899', text: '#0F172A', surface: '#FFFFFF', muted: '#64748B', background: '#FFF1F2' },
    layoutStyle: 'classic', buttonStyle: 'pill',
    backgroundType: 'solid', backgroundValue: '#FFF1F2',
  },
  {
    name: 'Ocean Blue',
    preview: { bg: '#F0F9FF', accent: '#0EA5E9', text: '#0C4A6E', card: '#FFFFFF' },
    palette: { primary: '#0EA5E9', text: '#0C4A6E', surface: '#FFFFFF', muted: '#64748B', background: '#F0F9FF' },
    layoutStyle: 'classic', buttonStyle: 'rounded',
    backgroundType: 'solid', backgroundValue: '#F0F9FF',
  },
  {
    name: 'Neon Purple',
    preview: { bg: '#F5F3FF', accent: '#8B5CF6', text: '#1E1B4B', card: '#FFFFFF' },
    palette: { primary: '#8B5CF6', text: '#1E1B4B', surface: '#FFFFFF', muted: '#6B7280', background: '#F5F3FF' },
    layoutStyle: 'classic', buttonStyle: 'shadow',
    backgroundType: 'solid', backgroundValue: '#F5F3FF',
  },
  {
    name: 'Forest Grid',
    preview: { bg: '#ECFDF5', accent: '#10B981', text: '#064E3B', card: '#FFFFFF' },
    palette: { primary: '#10B981', text: '#064E3B', surface: '#FFFFFF', muted: '#6B7280', background: '#ECFDF5' },
    layoutStyle: 'grid', buttonStyle: 'rounded',
    backgroundType: 'solid', backgroundValue: '#ECFDF5',
  },
  {
    name: 'Sunset Warm',
    preview: { bg: '#FFFBEB', accent: '#F59E0B', text: '#78350F', card: '#FFFFFF' },
    palette: { primary: '#F59E0B', text: '#78350F', surface: '#FFFFFF', muted: '#6B7280', background: '#FFFBEB' },
    layoutStyle: 'classic', buttonStyle: 'outline',
    backgroundType: 'solid', backgroundValue: '#FFFBEB',
  },
  {
    name: 'Dark Mode',
    preview: { bg: '#0F172A', accent: '#EC4899', text: '#F8FAFC', card: '#1E293B' },
    palette: { primary: '#EC4899', text: '#F8FAFC', surface: '#1E293B', muted: '#94A3B8', background: '#0F172A' },
    layoutStyle: 'classic', buttonStyle: 'rounded',
    backgroundType: 'solid', backgroundValue: '#0F172A',
  },
  {
    name: 'Midnight Purple',
    preview: { bg: '#1a1a2e', accent: '#e94560', text: '#eaeaea', card: '#16213e' },
    palette: { primary: '#e94560', text: '#eaeaea', surface: '#16213e', muted: '#8b8b9e', background: '#1a1a2e' },
    layoutStyle: 'classic', buttonStyle: 'pill',
    backgroundType: 'solid', backgroundValue: '#1a1a2e',
  },
  {
    name: 'Gradient Glow',
    preview: { bg: '#667eea', accent: '#FFFFFF', text: '#FFFFFF', card: 'rgba(255,255,255,0.15)' },
    palette: { primary: '#FFFFFF', text: '#FFFFFF', surface: 'rgba(255,255,255,0.12)', muted: 'rgba(255,255,255,0.7)', background: '#667eea' },
    layoutStyle: 'classic', buttonStyle: 'pill',
    backgroundType: 'gradient', backgroundValue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    name: 'Coral Gradient',
    preview: { bg: '#f093fb', accent: '#FFFFFF', text: '#FFFFFF', card: 'rgba(255,255,255,0.15)' },
    palette: { primary: '#FFFFFF', text: '#FFFFFF', surface: 'rgba(255,255,255,0.12)', muted: 'rgba(255,255,255,0.7)', background: '#f093fb' },
    layoutStyle: 'classic', buttonStyle: 'shadow',
    backgroundType: 'gradient', backgroundValue: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    name: 'Sharp Pro',
    preview: { bg: '#FFFFFF', accent: '#6366F1', text: '#111827', card: '#F9FAFB' },
    palette: { primary: '#6366F1', text: '#111827', surface: '#F9FAFB', muted: '#6B7280', background: '#FFFFFF' },
    layoutStyle: 'classic', buttonStyle: 'sharp',
    backgroundType: 'solid', backgroundValue: '#FFFFFF',
  },
  {
    name: 'Bento Grid',
    preview: { bg: '#F3F4F6', accent: '#EF4444', text: '#111827', card: '#FFFFFF' },
    palette: { primary: '#EF4444', text: '#111827', surface: '#FFFFFF', muted: '#6B7280', background: '#F3F4F6' },
    layoutStyle: 'grid', buttonStyle: 'shadow',
    backgroundType: 'solid', backgroundValue: '#F3F4F6',
  },
];

export default function EditLinkInBioPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [device, setDevice] = useState<string>('mobile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [copied, setCopied] = useState(false);

  // ── Site data ──
  const [site, setSite] = useState<any>(null);

  // ── Slug ──
  const [slug, setSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  // ── Theme ──
  const [palette, setPalette] = useState<Record<string, string>>({});

  // ── Profile state ──
  const [profile, setProfile] = useState<BioProfileData>({
    displayName: '',
    bioText: '',
    avatarUrl: '',
    coverImageUrl: '',
    socialLinks: [],
  });

  // ── Links state ──
  const [links, setLinks] = useState<BioLink[]>([]);

  // ── Appearance state ──
  const [appearance, setAppearance] = useState<BioAppearanceData>({
    layoutStyle: 'classic',
    buttonStyle: 'rounded',
    backgroundType: 'solid',
    backgroundValue: '',
    showWatermark: true,
    showShareButton: true,
  });

  // ── Products ──
  const [products, setProducts] = useState<{ id: string; name: string; price: number; thumbnail_url: string | null }[]>([]);

  // ── Load data ──
  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: s }, { data: tokens }] = await Promise.all([
          supabase.from('sites').select('*').eq('id', siteId).single(),
          supabase.from('site_design_tokens').select('color_palette').eq('site_id', siteId).maybeSingle(),
        ]);

        setSite(s);
        if (tokens?.color_palette) setPalette(tokens.color_palette as Record<string, string>);

        setSlug(s?.slug ?? '');
        setOriginalSlug(s?.slug ?? null);

        const { data: bio } = await (supabase.from('site_linkinbio' as any) as any)
          .select('*')
          .eq('site_id', siteId)
          .maybeSingle();

        if (bio) {
          setProfile({
            displayName: bio.display_name ?? '',
            bioText: bio.bio_text ?? '',
            avatarUrl: bio.avatar_url ?? '',
            coverImageUrl: bio.cover_image_url ?? '',
            socialLinks: (bio.social_links as SocialLink[]) ?? [],
          });
          setAppearance({
            layoutStyle: bio.layout_style ?? 'classic',
            buttonStyle: bio.button_style ?? 'rounded',
            backgroundType: bio.background_type ?? 'solid',
            backgroundValue: bio.background_value ?? '',
            showWatermark: bio.show_watermark ?? true,
            showShareButton: bio.show_share_button ?? true,
          });
        }

        const { data: rawLinks } = await (supabase.from('linkinbio_links' as any) as any)
          .select('*')
          .eq('site_id', siteId)
          .order('sort_order', { ascending: true });

        if (rawLinks) {
          setLinks(rawLinks.map((l: any) => ({
            id: l.id,
            link_type: l.link_type,
            title: l.title ?? '',
            description: l.description ?? '',
            url: l.url ?? '',
            thumbnail_url: l.thumbnail_url ?? '',
            product_id: l.product_id ?? '',
            icon_type: l.icon_type ?? 'external',
            style_variant: l.style_variant ?? 'default',
            is_visible: l.is_visible ?? true,
            sort_order: l.sort_order ?? 0,
            metadata: l.metadata ?? {},
          })));
        }

        // Load ALL products (not just published) so creator can link any product
        if (s?.creator_id) {
          const { data: prods } = await supabase
            .from('products')
            .select('id, name, price, thumbnail_url, is_published')
            .eq('creator_id', s.creator_id)
            .order('created_at', { ascending: false });
          setProducts(prods ?? []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  // ── Slug availability check ──
  useEffect(() => {
    if (!slug || slug === originalSlug) { setSlugStatus('idle'); return; }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 3) {
      setSlugStatus('invalid'); return;
    }
    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sites/check-slug?slug=${encodeURIComponent(slug)}&type=linkinbio`);
        const json = await res.json();
        setSlugStatus(json.available ? 'available' : 'taken');
      } catch { setSlugStatus('idle'); }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, originalSlug]);

  // ── Update palette (single key) and push to iframe ──
  const updatePalette = useCallback((key: string, value: string) => {
    setPalette(prev => {
      const next = { ...prev, [key]: value };
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'theme-update', palette: next },
          window.location.origin,
        );
      } catch { /* cross-origin guard */ }
      return next;
    });
  }, []);

  // ── Apply a full template (palette + layout + button + background) ──
  const applyTemplate = useCallback((tpl: BioTemplate) => {
    // Apply palette
    setPalette(tpl.palette);
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'theme-update', palette: tpl.palette },
        window.location.origin,
      );
    } catch { /* cross-origin guard */ }

    // Apply appearance
    setAppearance(prev => ({
      ...prev,
      layoutStyle: tpl.layoutStyle,
      buttonStyle: tpl.buttonStyle,
      backgroundType: tpl.backgroundType,
      backgroundValue: tpl.backgroundValue,
    }));
  }, []);

  // ── Push content to iframe (debounced, no dep array to avoid React Compiler size mismatch) ──
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestRef = useRef({ profile, links, appearance, products, palette });
  latestRef.current = { profile, links, appearance, products, palette };

  useEffect(() => {
    clearTimeout(sendTimerRef.current);
    sendTimerRef.current = setTimeout(() => {
      const { profile, links, appearance, products, palette } = latestRef.current;
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;

      const bioData = {
        display_name: profile.displayName,
        bio_text: profile.bioText || null,
        avatar_url: profile.avatarUrl || null,
        cover_image_url: profile.coverImageUrl || null,
        layout_style: appearance.layoutStyle,
        button_style: appearance.buttonStyle,
        background_type: appearance.backgroundType,
        background_value: appearance.backgroundValue || null,
        social_links: profile.socialLinks,
        show_watermark: appearance.showWatermark,
        show_share_button: appearance.showShareButton,
      };

      const previewLinks = links.filter(l => l.is_visible).map(l => ({
        id: l.id,
        link_type: l.link_type,
        title: l.title || null,
        description: l.description || null,
        url: l.url || null,
        thumbnail_url: l.thumbnail_url || null,
        product_id: l.product_id || null,
        icon_type: l.icon_type || null,
        style_variant: l.style_variant || 'default',
        metadata: l.metadata || {},
      }));

      const previewProductsMap: Record<string, any> = {};
      for (const p of products) {
        previewProductsMap[p.id] = p;
      }

      try {
        iframe.contentWindow.postMessage(
          { type: 'bio-content-update', bio: bioData, links: previewLinks, productsMap: previewProductsMap },
          window.location.origin,
        );
        iframe.contentWindow.postMessage(
          { type: 'theme-update', palette },
          window.location.origin,
        );
      } catch { /* cross-origin guard */ }
    }, 16);

    return () => clearTimeout(sendTimerRef.current);
  }); // intentionally no deps — runs every render, debounced to ~1 frame

  // ── Save all ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Design tokens
      if (Object.keys(palette).length > 0) {
        await supabase
          .from('site_design_tokens')
          .upsert({ site_id: siteId, color_palette: palette } as any, { onConflict: 'site_id' });
      }

      // Slug
      if (slug && slug !== originalSlug) {
        await supabase.from('sites').update({ slug }).eq('id', siteId);
        setOriginalSlug(slug);
      }

      // Bio profile
      const bioPayload = {
        display_name: profile.displayName,
        bio_text: profile.bioText || null,
        avatar_url: profile.avatarUrl || null,
        cover_image_url: profile.coverImageUrl || null,
        social_links: profile.socialLinks,
        layout_style: appearance.layoutStyle,
        button_style: appearance.buttonStyle,
        background_type: appearance.backgroundType,
        background_value: appearance.backgroundValue || null,
        show_watermark: appearance.showWatermark,
        show_share_button: appearance.showShareButton,
      };

      const { data: existing } = await (supabase.from('site_linkinbio' as any) as any)
        .select('site_id')
        .eq('site_id', siteId)
        .maybeSingle();

      if (existing) {
        await (supabase.from('site_linkinbio' as any) as any).update(bioPayload).eq('site_id', siteId);
      } else {
        await (supabase.from('site_linkinbio' as any) as any).insert({ site_id: siteId, ...bioPayload });
      }

      // Links
      await (supabase.from('linkinbio_links' as any) as any).delete().eq('site_id', siteId);

      if (links.length > 0) {
        const linkRows = links.map((l, i) => ({
          site_id: siteId,
          link_type: l.link_type,
          title: l.title || null,
          description: l.description || null,
          url: l.url || null,
          thumbnail_url: l.thumbnail_url || null,
          product_id: l.product_id || null,
          icon_type: l.icon_type || null,
          style_variant: l.style_variant || 'default',
          is_visible: l.is_visible,
          sort_order: i + 1,
          metadata: l.metadata || {},
        }));
        await (supabase.from('linkinbio_links' as any) as any).insert(linkRows);
      }

      setSaved(true);
      setPreviewKey(Date.now());
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }, [supabase, siteId, palette, slug, originalSlug, profile, appearance, links]);

  // ── Derived ──
  const previewUrl = site ? `${getSitePublicPath(site)}?preview=1&t=${previewKey}` : null;
  const displayTitle = profile.displayName || site?.slug || 'Untitled';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
        <span className="text-sm text-gray-500">Loading editor...</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-[#060610]">

      {/* ═══ BODY — full height, panels own their headers ═══ */}
      <div className="flex-1 flex min-h-0">

        {/* ═══ MINI SIDEBAR ═══ */}
        <div className="w-14 shrink-0 relative">
          <div className="group/sidebar absolute inset-y-0 left-0 w-14 hover:w-48 bg-white dark:bg-[#0A0A1A] border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-200 overflow-hidden z-30 hover:shadow-xl hover:shadow-black/10">
            {/* Back button — h-14 aligns with panel headers */}
            <div className="h-14 shrink-0 border-b border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover/sidebar:justify-start group-hover/sidebar:px-4 gap-3">
              <button
                onClick={() => router.push('/dashboard/sites')}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="hidden group-hover/sidebar:inline text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Dashboard</span>
            </div>
            {/* Nav links */}
            <div className="flex flex-col py-3 gap-2">
              {MINI_NAV.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="mx-2.5 group-hover/sidebar:mx-2 h-9 rounded-lg flex items-center gap-3 justify-center group-hover/sidebar:justify-start px-2.5 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 shrink-0"
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="hidden group-hover/sidebar:inline text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ LEFT PANEL ═══ */}
        <div className="flex flex-col flex-1 min-w-80 max-w-[50%] border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A1A]">

        {/* ── Editor Header ── */}
        <div className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 flex items-center px-3 gap-2">
          {/* Site name — centered */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            <div className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-pink-500 shrink-0" />
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[180px]">
                {displayTitle}
              </h1>
            </div>
          </div>
          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs font-semibold bg-pink-600 hover:bg-pink-500 disabled:opacity-60 text-white px-3.5 py-2 rounded-lg shadow-sm shadow-pink-500/20 transition-all shrink-0"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>

        {/* ── Tab Bar ── */}
        <div className="shrink-0 border-b border-gray-200 dark:border-gray-800 px-2 py-2 flex items-center gap-0.5 overflow-x-auto">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  active
                    ? 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Editor Content (scrollable) ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── Profile Tab ── */}
          {activeTab === 'profile' && (
            <BioProfileEditor data={profile} onChange={setProfile} />
          )}

          {/* ── Templates Tab ── */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Pick a template to apply its design — layout, button style, colors and background all at once.</p>
              <div className="grid grid-cols-2 gap-3">
                {TEMPLATES.map(tpl => (
                  <button
                    key={tpl.name}
                    onClick={() => applyTemplate(tpl)}
                    className="group rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-pink-400 dark:hover:border-pink-600 overflow-hidden transition-all hover:shadow-lg text-left"
                  >
                    {/* Mini preview */}
                    <div className="h-28 p-3 flex flex-col items-center justify-center gap-1.5" style={{ background: tpl.backgroundType === 'gradient' ? tpl.backgroundValue : tpl.preview.bg }}>
                      {/* Avatar placeholder */}
                      <div className="w-8 h-8 rounded-full" style={{ backgroundColor: tpl.preview.accent }} />
                      {/* Name placeholder */}
                      <div className="w-16 h-2 rounded-full" style={{ backgroundColor: tpl.preview.text, opacity: 0.7 }} />
                      {/* Button placeholders */}
                      <div className="w-24 h-4 mt-1" style={{
                        backgroundColor: tpl.preview.card,
                        borderRadius: tpl.buttonStyle === 'pill' ? '9999px' : tpl.buttonStyle === 'sharp' ? '0' : '8px',
                        border: tpl.buttonStyle === 'outline' ? `1.5px solid ${tpl.preview.accent}` : 'none',
                        boxShadow: tpl.buttonStyle === 'shadow' ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                      }} />
                      <div className="w-24 h-4" style={{
                        backgroundColor: tpl.preview.card,
                        borderRadius: tpl.buttonStyle === 'pill' ? '9999px' : tpl.buttonStyle === 'sharp' ? '0' : '8px',
                        border: tpl.buttonStyle === 'outline' ? `1.5px solid ${tpl.preview.accent}` : 'none',
                        boxShadow: tpl.buttonStyle === 'shadow' ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                      }} />
                    </div>
                    {/* Label */}
                    <div className="px-3 py-2.5 bg-white dark:bg-[#0A0A1A] border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">{tpl.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{tpl.layoutStyle} &middot; {tpl.buttonStyle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Section Tab (formerly Links) ── */}
          {activeTab === 'section' && (
            <BioLinksEditor links={links} onChange={setLinks} products={products} />
          )}

          {/* ── Appearance Tab ── */}
          {activeTab === 'appearance' && (
            <BioAppearanceEditor
              data={appearance}
              onChange={setAppearance}
              palette={palette}
              onPaletteChange={updatePalette}
            />
          )}

          {/* ── Settings Tab ── */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Settings className="w-4 h-4 text-pink-500" /> URL Slug
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Customize your public URL</p>
                </div>
                <div>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition shadow-sm"
                    placeholder="my-bio-page"
                  />
                  <div className="flex items-center gap-2 mt-2 min-h-5">
                    {slugStatus === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                    {slugStatus === 'idle' && slug === originalSlug && slug.length > 0 && (
                      <span className="text-xs text-gray-400">digione.in/link/{slug}</span>
                    )}
                    {slugStatus === 'available' && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Available</span>
                    )}
                    {slugStatus === 'taken' && (
                      <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="w-3.5 h-3.5" /> Already taken</span>
                    )}
                    {slugStatus === 'invalid' && (
                      <span className="text-xs text-red-500">3+ chars, lowercase letters, numbers, hyphens</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT PANEL — full-height preview ═══ */}
      <div className="flex-1 flex flex-col bg-gray-100 dark:bg-[#080818]">

        {/* ── Preview Header ── */}
        <div className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3">
          {/* Copy link */}
          <button
            onClick={() => {
              if (site) {
                navigator.clipboard.writeText(`https://${getSiteDisplayUrl(site)}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
            disabled={!site}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-pink-400 dark:hover:border-pink-600 px-3 py-1.5 rounded-lg transition-all shrink-0 disabled:opacity-40"
            title="Copy page link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          {/* Preview Page label — centered */}
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Website Preview
            </span>
          </div>
          {/* Device toggles */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0">
            {DEVICES.map(d => (
              <button
                key={d.id}
                onClick={() => setDevice(d.id)}
                className={`p-1.5 rounded-md transition ${
                  device === d.id
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                title={d.label}
              >
                <d.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Preview iframe */}
        <div className="flex-1 flex items-start justify-center px-6 pb-6 overflow-auto">
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 flex flex-col"
            style={{
              width: DEVICES.find(d => d.id === device)?.width ?? '100%',
              maxWidth: '100%',
              height: '100%',
            }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 px-3 py-1 bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                <p className="text-[10px] text-gray-400 font-mono truncate">
                  {site ? `https://${getSiteDisplayUrl(site)}` : 'Loading...'}
                </p>
              </div>
              <button
                onClick={() => setPreviewKey(Date.now())}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* iframe */}
            {previewUrl ? (
              <iframe
                ref={iframeRef}
                key={previewKey}
                src={previewUrl}
                className="w-full flex-1 border-0"
                title="Bio Preview"
              />
            ) : (
              <div className="flex items-center justify-center flex-1 text-sm text-gray-400">
                No preview available
              </div>
            )}
          </div>
        </div>
      </div>
      </div>{/* close flex-1 flex min-h-0 body wrapper */}
    </div>
  );
}
