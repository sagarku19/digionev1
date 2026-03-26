'use client';
// SiteVisualEditor — split-screen layout: left editor panel + right iframe preview.
// All state is local. DB writes happen only on Save. Theme changes push to iframe via postMessage.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import {
  Save, Loader2, CheckCircle2, ExternalLink, Monitor, Tablet, Smartphone,
  RefreshCw, Layers, Paintbrush, Settings, PanelLeft, ArrowLeft,
  Navigation as NavIcon, Footprints,
} from 'lucide-react';
import HeaderEditor, { type HeaderData } from './tabs/HeaderEditor';
import FooterEditor, { type FooterData } from './tabs/FooterEditor';
import ThemeEditor from './tabs/ThemeEditor';
import SettingsPanel, { type SettingsData } from './tabs/SettingsPanel';

// ─── Types ────────────────────────────────────────────────────

type Tab = 'content' | 'header' | 'footer' | 'theme' | 'settings';

type SiteVisualEditorProps = {
  siteId: string;
  typeLabel: string;
  typeIcon: React.ElementType;
  typeIconColor?: string;
  children: (helpers: { siteId: string; site: any; siteMain: any }) => React.ReactNode;
  onTypeSave?: () => Promise<void>;
  showSlug?: boolean;
};

// ─── Device presets ───────────────────────────────────────────

const DEVICES = [
  { id: 'desktop',  icon: Monitor,    width: '100%',  label: 'Desktop' },
  { id: 'tablet',   icon: Tablet,     width: '768px', label: 'Tablet'  },
  { id: 'mobile',   icon: Smartphone, width: '375px', label: 'Mobile'  },
] as const;

// ─── Tab definitions ─────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'content',  label: 'Content',  icon: Layers     },
  { id: 'header',   label: 'Header',   icon: NavIcon    },
  { id: 'footer',   label: 'Footer',   icon: Footprints },
  { id: 'theme',    label: 'Theme',    icon: Paintbrush },
  { id: 'settings', label: 'Settings', icon: Settings   },
];

// ─── Component ────────────────────────────────────────────────

export default function SiteVisualEditor({
  siteId,
  typeLabel,
  typeIcon: TypeIcon,
  typeIconColor,
  children,
  onTypeSave,
  showSlug = true,
}: SiteVisualEditorProps) {
  const router = useRouter();
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState<Tab>('content');
  const [device, setDevice] = useState<string>('desktop');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [showPreview, setShowPreview] = useState(true);

  // ── Data state (all local until Save) ──
  const [site, setSite] = useState<any>(null);
  const [siteMain, setSiteMain] = useState<any>(null);

  // Header
  const [headerData, setHeaderData] = useState<HeaderData>({
    logoUrl: '', logoAlt: '', navItems: [],
    showSearch: false, showCart: true, stickyHeader: true,
  });

  // Footer
  const [footerData, setFooterData] = useState<FooterData>({
    social: { instagram: '', youtube: '', twitter: '', linkedin: '' },
    legal: { about: false, terms: false, privacy: false, refund: false },
    contactEmail: '', contactPhone: '', copyrightText: '',
  });

  // Settings
  const [settingsData, setSettingsData] = useState<SettingsData>({
    metaTitle: '', metaDesc: '', customDomain: '',
    slug: '', originalSlug: null,
  });

  // Theme (local palette — pushed to iframe in real time)
  const [palette, setPalette] = useState<Record<string, string>>({});

  // ── Load data ──
  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: s }, { data: sm }, { data: nav }, { data: tokens }] = await Promise.all([
          supabase.from('sites').select('*').eq('id', siteId).single(),
          supabase.from('site_main').select('*').eq('site_id', siteId).maybeSingle(),
          supabase.from('site_navigation').select('*').eq('site_id', siteId).maybeSingle(),
          supabase.from('site_design_tokens').select('color_palette').eq('site_id', siteId).maybeSingle(),
        ]);

        setSite(s);
        setSiteMain(sm);

        // Header
        setHeaderData({
          logoUrl: nav?.header_logo_url ?? '',
          logoAlt: nav?.header_logo_alt ?? '',
          navItems: (nav?.nav_items as { label: string; url: string }[]) ?? [],
          showSearch: nav?.show_search ?? false,
          showCart: nav?.show_cart_icon ?? true,
          stickyHeader: nav?.sticky_header ?? true,
        });

        // Footer
        setFooterData({
          social: (sm?.social_links as Record<string, string>) ?? { instagram: '', youtube: '', twitter: '', linkedin: '' },
          legal: (sm?.legal_pages as Record<string, boolean>) ?? { about: false, terms: false, privacy: false, refund: false },
          contactEmail: sm?.contact_email ?? '',
          contactPhone: sm?.contact_mobile ?? '',
          copyrightText: nav?.footer_bottom_text ?? '',
        });

        // Settings
        setSettingsData({
          metaTitle: sm?.meta_keywords ?? '',
          metaDesc: sm?.meta_description ?? '',
          customDomain: s?.custom_domain ?? '',
          slug: s?.slug ?? '',
          originalSlug: s?.slug ?? null,
        });

        // Theme
        if (tokens?.color_palette) {
          setPalette(tokens.color_palette as Record<string, string>);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  // ── Push theme changes to iframe in real time ──
  const handlePaletteChange = useCallback((next: Record<string, string>) => {
    setPalette(next);
    // postMessage to iframe for instant preview
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'theme-update', palette: next },
        window.location.origin,
      );
    } catch { /* cross-origin guard */ }
  }, []);

  // ── Save all to DB ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      // 1. site_main
      const smUpdates: Record<string, unknown> = {
        meta_keywords: settingsData.metaTitle,
        meta_description: settingsData.metaDesc,
        social_links: footerData.social,
        legal_pages: footerData.legal,
        logo_url: headerData.logoUrl || null,
        contact_email: footerData.contactEmail || null,
        contact_mobile: footerData.contactPhone || null,
      };

      if (siteMain) {
        await supabase.from('site_main').update(smUpdates).eq('site_id', siteId);
      } else {
        await supabase.from('site_main').insert({ site_id: siteId, title: 'Untitled', ...smUpdates } as any);
        const { data: newSm } = await supabase.from('site_main').select('*').eq('site_id', siteId).single();
        setSiteMain(newSm);
      }

      // 2. site_navigation
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

      // 3. site_design_tokens (theme)
      if (Object.keys(palette).length > 0) {
        await supabase
          .from('site_design_tokens')
          .upsert({ site_id: siteId, color_palette: palette } as any, { onConflict: 'site_id' });
      }

      // 4. domain
      if (settingsData.customDomain !== site?.custom_domain) {
        await supabase.from('sites').update({ custom_domain: settingsData.customDomain || null }).eq('id', siteId);
      }

      // 5. slug
      if (showSlug && settingsData.slug && settingsData.slug !== settingsData.originalSlug) {
        await supabase.from('sites').update({ slug: settingsData.slug }).eq('id', siteId);
        setSettingsData(prev => ({ ...prev, originalSlug: prev.slug }));
      }

      // 6. type-specific
      if (onTypeSave) await onTypeSave();

      setSaved(true);
      setPreviewKey(Date.now());
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }, [supabase, siteId, siteMain, site, settingsData, footerData, headerData, palette, showSlug, onTypeSave]);

  // ── Preview URL ──
  const previewUrl = site ? `${getSitePublicPath(site)}?preview=1&t=${previewKey}` : null;
  const displayTitle = siteMain?.title ?? site?.slug ?? 'Untitled';
  const isActive = site?.is_active !== false;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--text-secondary)]" />
        <span className="text-sm text-gray-500">Loading editor...</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-[#060610]">

      {/* ── Top Bar ── */}
      <header className="shrink-0 bg-white dark:bg-[#0A0A1A] border-b border-gray-200 dark:border-gray-800 shadow-sm z-30">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => router.push('/dashboard/sites')}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className={`shrink-0 w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[160px]">{displayTitle}</h1>
          <span className={`hidden sm:flex items-center gap-1 text-xs font-medium ${typeIconColor ?? 'text-gray-400'}`}>
            <TypeIcon className="w-3.5 h-3.5" />
            {typeLabel}
          </span>

          {/* Center: device toggle */}
          <div className="flex-1 flex justify-center">
            <div className="hidden md:flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
              {DEVICES.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDevice(d.id)}
                  className={`p-1.5 rounded-md transition ${
                    device === d.id
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                  title={d.label}
                >
                  <d.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            {saved && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}

            <button
              onClick={() => setShowPreview(p => !p)}
              className="hidden md:flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              title={showPreview ? 'Hide preview' : 'Show preview'}
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setPreviewKey(Date.now())}
              className="hidden md:flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              title="Refresh preview"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {previewUrl && (
              <a
                href={getSitePublicPath(site)}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Live
              </a>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-[var(--accent-fg)] px-4 py-2 rounded-lg shadow-sm transition-all"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </div>
      </header>

      {/* ── Body: editor + preview ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left: Tab bar + editor panel ── */}
        <div className={`flex ${showPreview ? 'w-[420px] min-w-[380px]' : 'flex-1'} shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A1A]`}>

          {/* Vertical tab bar */}
          <div className="hidden md:flex flex-col items-center gap-1 w-14 shrink-0 border-r border-gray-100 dark:border-gray-800 py-3 bg-gray-50 dark:bg-[#060610]">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-10 h-10 flex flex-col items-center justify-center rounded-lg transition-all ${
                    active
                      ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                      : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                  title={tab.label}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-[9px] font-medium mt-0.5 leading-none">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable editor content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Mobile tab bar */}
            <div className="md:hidden flex gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl overflow-x-auto">
              {TABS.map(tab => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                      active
                        ? 'bg-white dark:bg-gray-800 text-[var(--text-primary)] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            {activeTab === 'content' && children({ siteId, site, siteMain })}
            {activeTab === 'header'  && <HeaderEditor data={headerData} onChange={setHeaderData} />}
            {activeTab === 'footer'  && <FooterEditor data={footerData} onChange={setFooterData} />}
            {activeTab === 'theme'   && <ThemeEditor palette={palette} onChange={handlePaletteChange} />}
            {activeTab === 'settings' && (
              <SettingsPanel
                siteId={siteId}
                site={site}
                displayTitle={displayTitle}
                data={settingsData}
                onChange={setSettingsData}
                showSlug={showSlug}
              />
            )}
          </div>
        </div>

        {/* ── Right: iframe preview ── */}
        {showPreview && (
          <div className="hidden md:flex flex-1 flex-col items-center justify-start bg-gray-100 dark:bg-[#080818] p-6 overflow-auto">
            <div
              className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 flex-1"
              style={{
                width: DEVICES.find(d => d.id === device)?.width ?? '100%',
                maxWidth: '100%',
                minHeight: 0,
              }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
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
                  style={{ height: 'calc(100vh - 8rem)' }}
                  title="Site Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-sm text-gray-400">
                  No preview available
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
