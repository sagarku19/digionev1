'use client';
// SiteVisualEditor — split-screen layout matching the singlepage/main-store editor pattern.
// Left panel (w-1/2): owns header + vertical tab sidebar + scrollable editor.
// Right panel (flex-1): owns preview header + zoom-aware browser-chrome iframe.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import {
  Save, Loader2, CheckCircle2, ExternalLink, Monitor, Tablet, Smartphone,
  RefreshCw, Layers, Paintbrush, Settings, ArrowLeft, Copy, Check,
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

// ─── Tab definitions ─────────────────────────────────────────

const TABS: {
  id: Tab; label: string; icon: React.ElementType;
  activeBg: string; activeColor: string; activeBorder: string;
}[] = [
    { id: 'content', label: 'Content', icon: Layers, activeBg: 'bg-gray-100 dark:bg-[var(--bg-secondary)]', activeColor: 'text-gray-700 dark:text-[var(--text-secondary)]', activeBorder: 'border border-gray-300 dark:border-gray-600' },
    { id: 'header', label: 'Header', icon: NavIcon, activeBg: 'bg-emerald-50 dark:bg-emerald-500/10', activeColor: 'text-emerald-600 dark:text-emerald-300', activeBorder: 'border border-emerald-200 dark:border-emerald-500/30' },
    { id: 'footer', label: 'Footer', icon: Footprints, activeBg: 'bg-amber-50 dark:bg-amber-500/10', activeColor: 'text-amber-600 dark:text-amber-300', activeBorder: 'border border-amber-200 dark:border-amber-500/30' },
    { id: 'theme', label: 'Theme', icon: Paintbrush, activeBg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10', activeColor: 'text-fuchsia-600 dark:text-fuchsia-300', activeBorder: 'border border-fuchsia-200 dark:border-fuchsia-500/30' },
    { id: 'settings', label: 'Settings', icon: Settings, activeBg: 'bg-gray-100 dark:bg-[var(--bg-secondary)]', activeColor: 'text-[var(--text-primary)]', activeBorder: 'border border-gray-300 dark:border-gray-600' },
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
  const previewWrapperRef = useRef<HTMLDivElement>(null);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState<Tab>('content');
  const [tabSidebarOpen, setTabSidebarOpen] = useState(true);
  const [device, setDevice] = useState<string>('desktop');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [previewW, setPreviewW] = useState(0);

  // ── Data state ──
  const [site, setSite] = useState<any>(null);
  const [siteMain, setSiteMain] = useState<any>(null);

  const [headerData, setHeaderData] = useState<HeaderData>({
    logoUrl: '', logoAlt: '', navItems: [],
    showSearch: false, showCart: true, stickyHeader: true,
  });

  const [footerData, setFooterData] = useState<FooterData>({
    social: { instagram: '', youtube: '', twitter: '', linkedin: '' },
    legal: { about: false, terms: false, privacy: false, refund: false },
    contactEmail: '', contactPhone: '', copyrightText: '',
  });

  const [settingsData, setSettingsData] = useState<SettingsData>({
    metaTitle: '', metaDesc: '', customDomain: '',
    slug: '', originalSlug: null,
  });

  const [palette, setPalette] = useState<Record<string, string>>({});

  // ── Measure right panel for zoom ──
  useEffect(() => {
    const el = previewWrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setPreviewW(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

      if (Object.keys(palette).length > 0) {
        await supabase
          .from('site_design_tokens')
          .upsert({ site_id: siteId, color_palette: palette } as any, { onConflict: 'site_id' });
      }

      if (settingsData.customDomain !== site?.custom_domain) {
        await supabase.from('sites').update({ custom_domain: settingsData.customDomain || null }).eq('id', siteId);
      }

      if (showSlug && settingsData.slug && settingsData.slug !== settingsData.originalSlug) {
        await supabase.from('sites').update({ slug: settingsData.slug }).eq('id', siteId);
        setSettingsData(prev => ({ ...prev, originalSlug: prev.slug }));
      }

      if (onTypeSave) await onTypeSave();

      setSaved(true);
      setPreviewKey(Date.now());
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }, [supabase, siteId, siteMain, site, settingsData, footerData, headerData, palette, showSlug, onTypeSave]);

  // ── Helpers ──
  const displayTitle = siteMain?.title ?? site?.slug ?? 'Untitled';
  const previewUrl = site ? `${getSitePublicPath(site)}?preview=1&t=${previewKey}` : null;

  const copyUrl = () => {
    if (!site) return;
    navigator.clipboard.writeText(`https://${getSiteDisplayUrl(site)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-secondary)] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Loading editor…</span>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
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
                <p className={`text-[11px] font-medium flex items-center gap-1 ${typeIconColor ?? 'text-gray-400'}`}>
                  <TypeIcon className="w-3 h-3" /> {typeLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all focus:ring-4 focus:ring-gray-400/20 active:scale-95 disabled:opacity-50 ${saved
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
                      className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200 ${active
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
              {activeTab === 'content' && children({ siteId, site, siteMain })}
              {activeTab === 'header' && <HeaderEditor data={headerData} onChange={setHeaderData} />}
              {activeTab === 'footer' && <FooterEditor data={footerData} onChange={setFooterData} />}
              {activeTab === 'theme' && <ThemeEditor palette={palette} onChange={handlePaletteChange} />}
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
        </div>{/* end LEFT PANEL */}

        {/* ═══ RIGHT PANEL — full-height preview ═══ */}
        <div className="flex-1 flex flex-col bg-gray-100 dark:bg-[#080818]">

          {/* Preview Header */}
          <div className="shrink-0 h-14 border-b border-[var(--border)] flex items-center px-4 gap-3 relative">
            {/* Open in browser */}
            <a
              href={site ? `https://${getSiteDisplayUrl(site)}` : undefined}
              target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-gray-800 dark:hover:text-[var(--text-primary)] bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] hover:border-gray-400 dark:hover:border-gray-500 px-3 py-1.5 rounded-lg transition-all shrink-0 ${!site ? 'opacity-40 pointer-events-none' : ''}`}
              title="Open in browser"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </a>

            {/* Copy link */}
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
                { id: 'desktop', icon: Monitor, label: 'Desktop' },
                { id: 'tablet', icon: Tablet, label: 'Tablet' },
                { id: 'mobile', icon: Smartphone, label: 'Mobile' },
              ].map(dev => (
                <button
                  key={dev.id}
                  onClick={() => setDevice(dev.id)}
                  className={`p-1.5 rounded-md transition ${device === dev.id ? 'bg-gray-100 dark:bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                  title={dev.label}
                >
                  <dev.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Zoom-aware preview iframe */}
          {(() => {
            const DESKTOP_W = 1280;
            const DESKTOP_H = Math.round(DESKTOP_W * 10 / 16); // ≈800px
            const isDesktop = device === 'desktop';
            const isMobile = device === 'mobile';
            const devicePx = isDesktop ? DESKTOP_W : isMobile ? 375 : 768;
            const zoom = isDesktop && previewW > 0 ? Math.min(1, (previewW - 48) / DESKTOP_W) : 1;

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
                    <iframe
                      ref={iframeRef}
                      key={previewKey}
                      src={previewUrl}
                      className="w-full flex-1 border-0"
                      title="Site Preview"
                    />
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
    </div>
  );
}
