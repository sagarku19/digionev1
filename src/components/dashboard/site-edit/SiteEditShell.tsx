'use client';
// SiteEditShell — shared layout for all type-specific site edit pages.
// Provides: top bar, tab sidebar, and all common tabs (Navigation, Domain, SEO, Social, Legal, Danger).
// Each type-specific page supplies only the "General" tab content via children.

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import {
  Settings, Globe, Search, Share2, FileText, AlertTriangle,
  Save, Loader2, CheckCircle2, ExternalLink, Copy, RefreshCw,
  Trash2, EyeOff, Navigation, Plus, X, Layers,
} from 'lucide-react';

// ─── Shared sub-components ───────────────────────────────────

export function Card({
  title, subtitle, children, danger,
}: {
  title: string; subtitle?: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-6 space-y-5 shadow-sm ${
      danger
        ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50'
        : 'bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800'
    }`}>
      <div>
        <h2 className={`text-sm font-semibold ${
          danger ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'
        }`}>{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Field({
  label, hint, counter, children,
}: {
  label: string; hint?: string; counter?: { current: number; max: number }; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {counter && (
          <span className={`text-xs tabular-nums ${
            counter.current > counter.max ? 'text-red-500'
              : counter.current > counter.max * 0.85 ? 'text-amber-500' : 'text-gray-400'
          }`}>{counter.current}/{counter.max}</span>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}

export const INPUT =
  'w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none text-gray-900 dark:text-white placeholder-gray-400 transition shadow-sm';

// ─── Tab definitions ─────────────────────────────────────────

const TABS = [
  { id: 'general',    label: 'General',     icon: Settings      },
  { id: 'navigation', label: 'Navigation',  icon: Navigation    },
  { id: 'domain',     label: 'Domain',      icon: Globe         },
  { id: 'seo',        label: 'SEO',         icon: Search        },
  { id: 'social',     label: 'Social',      icon: Share2        },
  { id: 'legal',      label: 'Legal',       icon: FileText      },
  { id: 'danger',     label: 'Danger zone', icon: AlertTriangle },
];

// ─── Types ───────────────────────────────────────────────────

export type SiteEditData = {
  site: any;
  siteMain: any;
  navItems: { label: string; url: string }[];
  metaTitle: string;
  metaDesc: string;
  social: Record<string, string>;
  legal: Record<string, boolean>;
  customDomain: string;
};

type SiteEditShellProps = {
  siteId: string;
  /** Label shown in top bar (e.g. "Main Store", "Blog") */
  typeLabel: string;
  /** Icon shown next to type label */
  typeIcon?: React.ElementType;
  /** Accent color class for type icon (e.g. "text-[var(--text-secondary)]") */
  typeIconColor?: string;
  /** Extra buttons in the top bar (e.g. "Open Builder") */
  topBarExtra?: React.ReactNode;
  /** Render the General tab content */
  children: (data: SiteEditData) => React.ReactNode;
  /** Called during save — lets the type page save its own data */
  onSave?: (data: SiteEditData) => Promise<void>;
};

// ─── Shell component ─────────────────────────────────────────

export default function SiteEditShell({
  siteId, typeLabel, typeIcon: TypeIcon, typeIconColor, topBarExtra, children, onSave,
}: SiteEditShellProps) {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Site data
  const [site, setSite] = useState<any>(null);
  const [siteMain, setSiteMain] = useState<any>(null);

  // Domain
  const [customDomain, setCustomDomain] = useState('');

  // SEO
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');

  // Social
  const [social, setSocial] = useState<Record<string, string>>({
    instagram: '', youtube: '', twitter: '', linkedin: '',
  });

  // Legal
  const [legal, setLegal] = useState<Record<string, boolean>>({
    about: false, terms: false, privacy: false, refund: false,
  });

  // Navigation
  const [navItems, setNavItems] = useState<{ label: string; url: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: s }, { data: sm }, { data: nav }] = await Promise.all([
          supabase.from('sites').select('*').eq('id', siteId).single(),
          supabase.from('site_main').select('*').eq('site_id', siteId).maybeSingle(),
          supabase.from('site_navigation').select('*').eq('site_id', siteId).maybeSingle(),
        ]);
        setSite(s);
        setSiteMain(sm);
        setCustomDomain(s?.custom_domain ?? '');
        setMetaTitle(sm?.meta_keywords ?? '');
        setMetaDesc(sm?.meta_description ?? '');
        setSocial(
          (sm?.social_links as Record<string, string>) ?? {
            instagram: '', youtube: '', twitter: '', linkedin: '',
          }
        );
        setLegal(
          (sm?.legal_pages as Record<string, boolean>) ?? {
            about: false, terms: false, privacy: false, refund: false,
          }
        );
        setNavItems((nav?.nav_items as { label: string; url: string }[]) ?? []);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const editData: SiteEditData = {
    site, siteMain, navItems, metaTitle, metaDesc, social, legal, customDomain,
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Save common data (SEO, social, legal → site_main)
      const smUpdates: Record<string, unknown> = {
        meta_keywords: metaTitle,
        meta_description: metaDesc,
        social_links: social,
        legal_pages: legal,
      };
      if (siteMain) {
        await supabase.from('site_main').update(smUpdates).eq('site_id', siteId);
      }

      // Save domain
      if (customDomain !== site?.custom_domain) {
        await supabase
          .from('sites')
          .update({ custom_domain: customDomain || null })
          .eq('id', siteId);
      }

      // Save navigation
      await supabase
        .from('site_navigation')
        .upsert({ site_id: siteId, nav_items: navItems }, { onConflict: 'site_id' });

      // Let the type-specific page save its own data
      if (onSave) await onSave(editData);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== (site?.slug ?? site?.id)) return;
    setDeleting(true);
    await supabase.from('sites').update({ is_active: false }).eq('id', siteId);
    router.push('/dashboard/sites');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--text-secondary)]" />
        <span className="text-sm text-gray-500">Loading settings...</span>
      </div>
    );
  }

  const isActive = site?.is_active !== false;
  const displayTitle = siteMain?.title ?? site?.slug ?? 'Untitled';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#060610]">

      {/* ── Sticky top bar ── */}
      <header className="sticky top-0 z-30 bg-white dark:bg-[#0A0A1A] border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-4 px-6 h-14">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span
              className={`shrink-0 w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}
              title={isActive ? 'Active' : 'Inactive'}
            />
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px]" title={displayTitle}>
              {displayTitle}
            </h1>
            {TypeIcon && (
              <span className={`hidden sm:flex items-center gap-1.5 text-xs font-medium ${typeIconColor ?? 'text-gray-400'}`}>
                <TypeIcon className="w-3.5 h-3.5" />
                {typeLabel}
              </span>
            )}
            {site && (
              <span className="hidden md:inline-flex text-xs text-gray-400 font-normal truncate">
                {getSiteDisplayUrl(site)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {saved && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}

            <a
              href={site ? getSitePublicPath(site) : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              View Live <ExternalLink className="w-3 h-3" />
            </a>

            {topBarExtra}

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-[var(--accent-fg)] px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </div>
      </header>

      {/* ── Body: sidebar + content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar nav ── */}
        <aside className="hidden md:flex flex-col w-48 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A1A] pt-4 pb-6">
          <nav className="flex flex-col gap-0.5 px-3">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              const isDanger = tab.id === 'danger';
              return (
                <React.Fragment key={tab.id}>
                  {isDanger && <div className="my-2 border-t border-gray-200 dark:border-gray-800" />}
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all w-full text-left ${
                      active
                        ? isDanger
                          ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                        : isDanger
                        ? 'text-red-500 dark:text-red-500/80 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {active && (
                      <span className={`absolute left-0 top-1 bottom-1 w-0.5 rounded-full ${isDanger ? 'bg-red-500' : 'bg-[var(--accent)]'}`} />
                    )}
                    <tab.icon className={`w-4 h-4 shrink-0 ${
                      active
                        ? isDanger ? 'text-red-500' : 'text-[var(--text-secondary)]'
                        : isDanger ? 'text-red-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                    }`} />
                    {tab.label}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
        </aside>

        {/* Mobile tab strip */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-[#0A0A1A] border-t border-gray-200 dark:border-gray-800 px-2 py-2 overflow-x-auto">
          <div className="flex gap-1 min-w-max mx-auto">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              const isDanger = tab.id === 'danger';
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    active
                      ? isDanger
                        ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                      : isDanger
                      ? 'text-red-500 hover:bg-red-50'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 overflow-y-auto px-6 py-6 pb-24 md:pb-6 space-y-5">

          {/* GENERAL — rendered by each type page */}
          {activeTab === 'general' && children(editData)}

          {/* NAVIGATION */}
          {activeTab === 'navigation' && (
            <Card title="Header Navigation" subtitle="Links shown in your storefront header">
              <div className="space-y-2.5">
                {navItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" value={item.label}
                      onChange={e => setNavItems(prev => prev.map((n, idx) => (idx === i ? { ...n, label: e.target.value } : n)))}
                      placeholder="Label (e.g. Products)" className={`${INPUT} flex-1`} />
                    <input type="text" value={item.url}
                      onChange={e => setNavItems(prev => prev.map((n, idx) => (idx === i ? { ...n, url: e.target.value } : n)))}
                      placeholder="URL (e.g. /shop or #products)" className={`${INPUT} flex-1`} />
                    <button onClick={() => setNavItems(prev => prev.filter((_, idx) => idx !== i))}
                      className="p-2 text-gray-400 hover:text-red-500 transition shrink-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {navItems.length === 0 && (
                <p className="text-xs text-gray-400">No nav links yet. Add links like &quot;Home&quot;, &quot;Products &rarr; /shop&quot;, etc.</p>
              )}
              <button onClick={() => setNavItems(prev => [...prev, { label: '', url: '' }])}
                className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--text-primary)] transition mt-1">
                <Plus className="w-4 h-4" /> Add nav link
              </button>
            </Card>
          )}

          {/* DOMAIN */}
          {activeTab === 'domain' && (
            <div className="space-y-5">
              <Card title="Default URL" subtitle="Your automatically assigned DigiOne URL">
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                  <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-[var(--text-primary)] flex-1 truncate">
                    {site ? getSiteDisplayUrl(site) : '\u2014'}
                  </span>
                  <button
                    onClick={() => site && navigator.clipboard.writeText(`https://${getSiteDisplayUrl(site)}`)}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Copy URL">
                    <Copy className="w-4 h-4" />
                  </button>
                  <a href={site ? getSitePublicPath(site) : '#'} target="_blank" rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Open in new tab">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </Card>

              <Card title="Custom Domain" subtitle="Point your own domain to this store">
                <Field label="Custom domain" hint="Enter a subdomain like store.yourdomain.com">
                  <input type="text" value={customDomain} onChange={e => setCustomDomain(e.target.value)}
                    className={INPUT} placeholder="store.yourdomain.com" />
                </Field>

                {customDomain && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">DNS Configuration Required</p>
                    </div>
                    <div className="px-4 py-3 bg-white dark:bg-amber-950/10 space-y-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Add the following <strong>CNAME</strong> record in your domain registrar&apos;s DNS settings:
                      </p>
                      <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-xs">
                        <span className="font-medium text-gray-500">Type</span>
                        <code className="font-mono text-gray-900 dark:text-gray-200">CNAME</code>
                        <span className="font-medium text-gray-500">Name</span>
                        <code className="font-mono text-gray-900 dark:text-gray-200 break-all">
                          {customDomain.split('.').slice(0, -2).join('.') || customDomain}
                        </code>
                        <span className="font-medium text-gray-500">Value</span>
                        <code className="font-mono text-gray-900 dark:text-gray-200">cname.digione.in</code>
                        <span className="font-medium text-gray-500">TTL</span>
                        <code className="font-mono text-gray-900 dark:text-gray-200">Auto</code>
                      </div>
                      <p className="text-xs text-gray-400">DNS changes can take up to 48 hours to propagate globally.</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                    site?.ssl_status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                      : site?.ssl_status === 'pending'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      site?.ssl_status === 'active' ? 'bg-emerald-500'
                        : site?.ssl_status === 'pending' ? 'bg-amber-400' : 'bg-gray-400'
                    }`} />
                    {site?.ssl_status === 'active' ? 'SSL active'
                      : site?.ssl_status === 'pending' ? 'SSL pending' : 'No SSL'}
                  </div>
                  <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh status
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* SEO */}
          {activeTab === 'seo' && (
            <div className="space-y-5">
              <Card title="SEO Settings" subtitle="Control how this site appears in Google">
                <Field label="Meta title" hint="Recommended: 50\u201360 characters"
                  counter={{ current: metaTitle.length, max: 60 }}>
                  <input type="text" value={metaTitle} onChange={e => setMetaTitle(e.target.value)}
                    className={INPUT} placeholder={displayTitle} />
                </Field>
                <Field label="Meta description" hint="Recommended: 150\u2013160 characters"
                  counter={{ current: metaDesc.length, max: 160 }}>
                  <textarea rows={3} value={metaDesc} onChange={e => setMetaDesc(e.target.value)}
                    className={`${INPUT} resize-none`} placeholder="Brief description for search engines" />
                </Field>
              </Card>

              <Card title="Search Preview" subtitle="How this site looks on Google">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[#0D0E1A] space-y-1">
                  <p className="text-xs text-gray-400">{site ? getSiteDisplayUrl(site) : '\u2014'}</p>
                  <p className="text-base font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer leading-snug">
                    {metaTitle || displayTitle}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {metaDesc || 'No description set yet.'}
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* SOCIAL */}
          {activeTab === 'social' && (
            <Card title="Social Links" subtitle="Shown in your site footer and about section">
              {(['instagram', 'youtube', 'twitter', 'linkedin'] as const).map(platform => (
                <Field key={platform} label={platform.charAt(0).toUpperCase() + platform.slice(1)}>
                  <input type="url" value={social[platform] ?? ''}
                    onChange={e => setSocial(prev => ({ ...prev, [platform]: e.target.value }))}
                    className={INPUT} placeholder={`https://${platform}.com/yourhandle`} />
                </Field>
              ))}
            </Card>
          )}

          {/* LEGAL */}
          {activeTab === 'legal' && (
            <Card title="Legal Pages" subtitle="Enable these to show links in your site footer">
              {[
                { key: 'about',   label: 'About us',       desc: 'Story and mission of your brand' },
                { key: 'terms',   label: 'Terms of use',   desc: 'Conditions for using your products' },
                { key: 'privacy', label: 'Privacy policy', desc: 'How you handle buyer data' },
                { key: 'refund',  label: 'Refund policy',  desc: 'Your refund and cancellation policy' },
              ].map(({ key, label, desc }) => (
                <div key={key}
                  className="flex items-center justify-between px-4 py-3.5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                    <input type="checkbox" className="sr-only peer"
                      checked={legal[key] ?? false}
                      onChange={e => setLegal(prev => ({ ...prev, [key]: e.target.checked }))} />
                    <div className="w-10 h-[22px] bg-gray-300 dark:bg-gray-700 peer-checked:bg-[var(--accent)] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:after:translate-x-[18px] shadow-inner" />
                  </label>
                </div>
              ))}
            </Card>
          )}

          {/* DANGER */}
          {activeTab === 'danger' && (
            <div className="space-y-5">
              <div className="rounded-2xl p-6 bg-white dark:bg-[#0A0A1A] border border-amber-200 dark:border-amber-900/40 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Deactivate site</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Hides your site from public view. You can reactivate it at any time from the sites list.
                  </p>
                </div>
                <button
                  onClick={() =>
                    supabase.from('sites').update({ is_active: false }).eq('id', siteId)
                      .then(() => router.push('/dashboard/sites'))
                  }
                  className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 px-4 py-2 rounded-lg transition">
                  <EyeOff className="w-4 h-4" /> Deactivate site
                </button>
              </div>

              <Card title="Delete site permanently" danger>
                <p className="text-sm text-gray-600 dark:text-gray-400 -mt-2">
                  This will permanently delete this site and all its data. This action{' '}
                  <strong className="text-gray-900 dark:text-white">cannot be undone</strong>.
                </p>
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    To confirm, type{' '}
                    <code className="font-mono font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded">
                      {site?.slug ?? site?.id}
                    </code>{' '}below.
                  </p>
                  <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder={`Type "${site?.slug ?? site?.id}" to confirm`}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-red-300 dark:border-red-800 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition shadow-sm" />
                  <button disabled={deleteConfirm !== (site?.slug ?? site?.id) || deleting} onClick={handleDelete}
                    className="flex items-center gap-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg shadow-sm shadow-red-500/20 transition">
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete site permanently
                  </button>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
