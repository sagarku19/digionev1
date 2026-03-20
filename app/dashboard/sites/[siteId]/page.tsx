'use client';
// Site settings page — 6-tab settings (General, Domain, SEO, Social, Legal, Danger).
// DB tables: sites, site_main (read/update), profiles (read)

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Settings, Globe, Search, Share2, FileText, AlertTriangle,
  Save, Loader2, CheckCircle2, ExternalLink, Copy, RefreshCw,
  Trash2, EyeOff, Layers
} from 'lucide-react';

const TABS = [
  { id: 'general', label: 'General',     icon: Settings   },
  { id: 'domain',  label: 'Domain',      icon: Globe      },
  { id: 'seo',     label: 'SEO',         icon: Search     },
  { id: 'social',  label: 'Social',      icon: Share2     },
  { id: 'legal',   label: 'Legal',       icon: FileText   },
  { id: 'danger',  label: 'Danger zone', icon: AlertTriangle },
];

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

export default function SiteSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
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

  // General fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Domain fields
  const [customDomain, setCustomDomain] = useState('');

  // SEO fields
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');

  // Social fields
  const [social, setSocial] = useState<Record<string, string>>({ instagram: '', youtube: '', twitter: '', linkedin: '' });

  // Legal toggles
  const [legal, setLegal] = useState<Record<string, boolean>>({ about: false, terms: false, privacy: false, refund: false });

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: s }, { data: sm }] = await Promise.all([
          supabase.from('sites').select('*').eq('id', siteId).single(),
          supabase.from('site_main').select('*').eq('site_id', siteId).maybeSingle(),
        ]);
        setSite(s);
        setSiteMain(sm);
        setTitle(sm?.title ?? '');
        setDescription(sm?.meta_description ?? '');
        setCustomDomain(s?.custom_domain ?? '');
        setMetaTitle(sm?.meta_keywords ?? '');
        setMetaDesc(sm?.meta_description ?? '');
        setSocial((sm?.social_links as Record<string, string>) ?? { instagram: '', youtube: '', twitter: '', linkedin: '' });
        setLegal((sm?.legal_pages as Record<string, boolean>) ?? { about: false, terms: false, privacy: false, refund: false });
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updates: Record<string, unknown> = {
        title,
        meta_description: description,
        meta_keywords: metaTitle,
        social_links: social,
        legal_pages: legal,
      };
      if (siteMain) {
        await supabase.from('site_main').update(updates).eq('site_id', siteId);
      } else {
        await supabase.from('site_main').insert({ site_id: siteId, title, ...updates });
      }
      if (customDomain !== site?.custom_domain) {
        await supabase.from('sites').update({ custom_domain: customDomain || null }).eq('id', siteId);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== site?.slug) return;
    setDeleting(true);
    await supabase.from('sites').update({ is_active: false }).eq('id', siteId);
    router.push('/dashboard/sites');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-sm text-gray-500">Loading settings…</span>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Site Settings</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title || site?.slug}</h1>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <a href={`/${site?.slug}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <ExternalLink className="w-3.5 h-3.5" /> View live
          </a>
          <button
            onClick={() => router.push(`/dashboard/sites/${siteId}/builder`)}
            className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            <Layers className="w-4 h-4" /> Open Builder
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tab nav */}
        <aside className="w-full md:w-48 shrink-0">
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    active
                      ? tab.id === 'danger'
                        ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                        : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}>
                  <tab.icon className={`w-4 h-4 shrink-0 ${active ? (tab.id === 'danger' ? 'text-red-500' : 'text-indigo-500') : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Tab content */}
        <main className="flex-1 min-w-0 space-y-5">

          {/* GENERAL */}
          {activeTab === 'general' && (
            <Card title="Store Info" subtitle="Basic information shown to visitors">
              <Field label="Store name">
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={INPUT} placeholder="My awesome store" />
              </Field>
              <Field label="Description" hint="Shown in search results and social shares">
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className={`${INPUT} resize-none`} />
              </Field>
              <Field label="Contact email">
                <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className={INPUT} placeholder="you@example.com" />
              </Field>
            </Card>
          )}

          {/* DOMAIN */}
          {activeTab === 'domain' && (
            <div className="space-y-5">
              <Card title="Current URL" subtitle="Your default DigiOne URL">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                  <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 flex-1">digione.in/{site?.slug}</span>
                  <button onClick={() => navigator.clipboard.writeText(`https://digione.in/${site?.slug}`)}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </Card>

              <Card title="Custom Domain" subtitle="Point your own domain to this store">
                <Field label="Custom domain">
                  <input type="text" value={customDomain} onChange={e => setCustomDomain(e.target.value)} className={INPUT} placeholder="store.yourdomain.com" />
                </Field>
                {customDomain && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-2">DNS Configuration Required</p>
                    <p className="text-xs text-amber-700 dark:text-amber-500">
                      Add a <strong>CNAME</strong> record in your domain registrar:
                    </p>
                    <code className="block mt-2 text-xs bg-amber-100 dark:bg-amber-900/30 px-3 py-2 rounded-lg text-amber-800 dark:text-amber-300">
                      {customDomain} → cname.digione.in
                    </code>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full ${
                    site?.ssl_status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' :
                    site?.ssl_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${site?.ssl_status === 'active' ? 'bg-emerald-500' : site?.ssl_status === 'pending' ? 'bg-amber-400' : 'bg-gray-400'}`} />
                    {site?.ssl_status === 'active' ? 'SSL active' : site?.ssl_status === 'pending' ? 'SSL pending' : 'No SSL'}
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
              <Card title="SEO Settings" subtitle="Control how this store appears in Google">
                <Field label="Meta title" hint="Recommended: 50–60 characters">
                  <input type="text" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} className={INPUT} placeholder={title || 'Store name'} />
                </Field>
                <Field label="Meta description" hint="Recommended: 150–160 characters">
                  <textarea rows={3} value={metaDesc} onChange={e => setMetaDesc(e.target.value)} className={`${INPUT} resize-none`} placeholder="Brief description for search engines" />
                </Field>
              </Card>

              {/* SERP Preview */}
              <Card title="Search Preview" subtitle="How this store looks on Google">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[#0D0E1A]">
                  <p className="text-xs text-gray-400 mb-1">digione.in/{site?.slug}</p>
                  <p className="text-base font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer">
                    {metaTitle || title || 'Store name'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                    {metaDesc || description || 'No description set yet.'}
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* SOCIAL */}
          {activeTab === 'social' && (
            <Card title="Social Links" subtitle="Shown in your store footer and about section">
              {(['instagram', 'youtube', 'twitter', 'linkedin'] as const).map(platform => (
                <Field key={platform} label={platform.charAt(0).toUpperCase() + platform.slice(1)}>
                  <input
                    type="url"
                    value={social[platform] ?? ''}
                    onChange={e => setSocial(prev => ({ ...prev, [platform]: e.target.value }))}
                    className={INPUT}
                    placeholder={`https://${platform}.com/yourhandle`}
                  />
                </Field>
              ))}
            </Card>
          )}

          {/* LEGAL */}
          {activeTab === 'legal' && (
            <Card title="Legal Pages" subtitle="Enable these to show links in your store footer">
              {[
                { key: 'about',   label: 'About us',       desc: 'Story and mission of your brand' },
                { key: 'terms',   label: 'Terms of use',   desc: 'Conditions for using your products' },
                { key: 'privacy', label: 'Privacy policy', desc: 'How you handle buyer data' },
                { key: 'refund',  label: 'Refund policy',  desc: 'Your refund and cancellation policy' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox" className="sr-only peer"
                      checked={legal[key] ?? false}
                      onChange={e => setLegal(prev => ({ ...prev, [key]: e.target.checked }))}
                    />
                    <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-checked:bg-indigo-600 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>
              ))}
            </Card>
          )}

          {/* DANGER */}
          {activeTab === 'danger' && (
            <div className="space-y-5">
              <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6 bg-white dark:bg-[#0A0A1A]">
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Deactivate store</h3>
                <p className="text-sm text-gray-500 mb-4">Hides your store from public view. You can reactivate it at any time.</p>
                <button
                  onClick={() => supabase.from('sites').update({ is_active: false }).eq('id', siteId).then(() => router.push('/dashboard/sites'))}
                  className="flex items-center gap-2 text-sm font-semibold text-amber-700 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 px-4 py-2 rounded-xl transition"
                >
                  <EyeOff className="w-4 h-4" /> Deactivate store
                </button>
              </div>

              <div className="border border-red-200 dark:border-red-900/40 rounded-2xl p-6 bg-white dark:bg-[#0A0A1A]">
                <h3 className="font-bold text-red-600 dark:text-red-400 mb-1 uppercase text-sm tracking-wide">Danger Zone</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Deleting this store permanently removes it and all its data. This action cannot be undone.<br />
                  Type <strong className="text-gray-900 dark:text-white">{site?.slug}</strong> to confirm.
                </p>
                <input
                  type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder={`Type "${site?.slug}" to confirm`}
                  className={`${INPUT} mb-4`}
                />
                <button
                  disabled={deleteConfirm !== site?.slug || deleting}
                  onClick={handleDelete}
                  className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 disabled:opacity-50 px-4 py-2 rounded-xl transition"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete store permanently
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
