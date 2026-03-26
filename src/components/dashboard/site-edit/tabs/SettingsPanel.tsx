'use client';
// SettingsPanel — SEO, Domain, Slug, and Danger zone for the visual editor.

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSiteDisplayUrl, getSitePublicPath } from '@/lib/site-urls';
import {
  Globe, Copy, ExternalLink, AlertTriangle, RefreshCw,
  Trash2, EyeOff, Loader2, CheckCircle2, XCircle,
} from 'lucide-react';

const INPUT = 'w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)] outline-none text-gray-900 dark:text-white placeholder-gray-400 transition shadow-sm';

export type SettingsData = {
  metaTitle: string;
  metaDesc: string;
  customDomain: string;
  slug: string;
  originalSlug: string | null;
};

function useSlugCheck(slug: string, currentSlug: string | null, siteType: string) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  React.useEffect(() => {
    if (!slug || slug === currentSlug) { setStatus('idle'); return; }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 3) {
      setStatus('invalid'); return;
    }
    setStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sites/check-slug?slug=${encodeURIComponent(slug)}&type=${siteType}`);
        const json = await res.json();
        setStatus(json.available ? 'available' : 'taken');
      } catch { setStatus('idle'); }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, currentSlug, siteType]);

  return status;
}

export default function SettingsPanel({
  siteId,
  site,
  displayTitle,
  data,
  onChange,
  showSlug = true,
}: {
  siteId: string;
  site: any;
  displayTitle: string;
  data: SettingsData;
  onChange: (data: SettingsData) => void;
  showSlug?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const slugStatus = useSlugCheck(data.slug, data.originalSlug, site?.site_type ?? 'main');
  const isActive = site?.is_active !== false;

  const set = <K extends keyof SettingsData>(key: K, val: SettingsData[K]) =>
    onChange({ ...data, [key]: val });

  const handleDelete = async () => {
    if (deleteConfirm !== (site?.slug ?? site?.id)) return;
    setDeleting(true);
    await supabase.from('sites').update({ is_active: false }).eq('id', siteId);
    router.push('/dashboard/sites');
  };

  return (
    <div className="space-y-6">
      {/* SEO */}
      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">SEO</h3>
          <p className="text-xs text-gray-500 mt-0.5">Control how this site appears in search engines</p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Meta Title</label>
            <span className={`text-xs tabular-nums ${data.metaTitle.length > 60 ? 'text-red-500' : 'text-gray-400'}`}>{data.metaTitle.length}/60</span>
          </div>
          <input type="text" value={data.metaTitle} onChange={e => set('metaTitle', e.target.value)}
            className={INPUT} placeholder={displayTitle} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Meta Description</label>
            <span className={`text-xs tabular-nums ${data.metaDesc.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>{data.metaDesc.length}/160</span>
          </div>
          <textarea rows={3} value={data.metaDesc} onChange={e => set('metaDesc', e.target.value)}
            className={`${INPUT} resize-none`} placeholder="Brief description for search engines" />
        </div>
        {/* SERP Preview */}
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[#0D0E1A] space-y-1">
          <p className="text-xs text-gray-400">{site ? getSiteDisplayUrl(site) : '-'}</p>
          <p className="text-base font-medium text-blue-700 dark:text-blue-400 leading-snug">
            {data.metaTitle || displayTitle}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {data.metaDesc || 'No description set yet.'}
          </p>
        </div>
      </div>

      {/* Slug (optional) */}
      {showSlug && (
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">URL Slug</h3>
            <p className="text-xs text-gray-500 mt-0.5">Customize your public URL</p>
          </div>
          <div>
            <input type="text" value={data.slug}
              onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className={INPUT} placeholder="e.g. my-awesome-store" />
            <div className="flex items-center gap-2 mt-2 min-h-[20px]">
              {slugStatus === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
              {slugStatus === 'idle' && data.slug === data.originalSlug && data.slug.length > 0 && (
                <span className="text-xs text-gray-400">Current slug</span>
              )}
              {slugStatus === 'available' && (
                <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Available</span>
              )}
              {slugStatus === 'taken' && (
                <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="w-3.5 h-3.5" /> Already taken</span>
              )}
              {slugStatus === 'invalid' && (
                <span className="text-xs text-red-500">3-50 chars, lowercase letters, numbers, hyphens</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Domain */}
      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Domain</h3>
          <p className="text-xs text-gray-500 mt-0.5">Your DigiOne URL and custom domain</p>
        </div>
        {/* Default URL */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <Globe className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm font-medium text-[var(--text-primary)] flex-1 truncate">
            {site ? getSiteDisplayUrl(site) : '-'}
          </span>
          <button
            onClick={() => site && navigator.clipboard.writeText(`https://${getSiteDisplayUrl(site)}`)}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition p-1 rounded"
            title="Copy URL">
            <Copy className="w-4 h-4" />
          </button>
          <a href={site ? getSitePublicPath(site) : '#'} target="_blank" rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition p-1 rounded"
            title="Open">
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        {/* Custom domain */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Custom Domain</label>
          <input type="text" value={data.customDomain} onChange={e => set('customDomain', e.target.value)}
            className={INPUT} placeholder="store.yourdomain.com" />
        </div>
        {data.customDomain && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">DNS Required</p>
            </div>
            <div className="px-4 py-3 bg-white dark:bg-amber-950/10 space-y-3">
              <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-xs">
                <span className="font-medium text-gray-500">Type</span>
                <code className="font-mono text-gray-900 dark:text-gray-200">CNAME</code>
                <span className="font-medium text-gray-500">Name</span>
                <code className="font-mono text-gray-900 dark:text-gray-200 break-all">
                  {data.customDomain.split('.').slice(0, -2).join('.') || data.customDomain}
                </code>
                <span className="font-medium text-gray-500">Value</span>
                <code className="font-mono text-gray-900 dark:text-gray-200">cname.digione.in</code>
              </div>
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
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-5">
        <div className="rounded-2xl p-5 bg-white dark:bg-[#0A0A1A] border border-amber-200 dark:border-amber-900/40 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Deactivate site</h3>
            <p className="text-xs text-gray-500 mt-0.5">Hides your site from public view. Reactivate anytime.</p>
          </div>
          <button
            onClick={() =>
              supabase.from('sites').update({ is_active: false }).eq('id', siteId)
                .then(() => router.push('/dashboard/sites'))
            }
            className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 px-4 py-2 rounded-lg transition">
            <EyeOff className="w-4 h-4" /> Deactivate
          </button>
        </div>

        <div className="rounded-2xl p-5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Delete site permanently</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This action <strong className="text-gray-900 dark:text-white">cannot be undone</strong>.
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Type{' '}
              <code className="font-mono font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded">
                {site?.slug ?? site?.id}
              </code>{' '}to confirm.
            </p>
            <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={`Type "${site?.slug ?? site?.id}"`}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-red-300 dark:border-red-800 rounded-lg text-sm focus:ring-2 focus:ring-red-400 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition shadow-sm" />
            <button disabled={deleteConfirm !== (site?.slug ?? site?.id) || deleting} onClick={handleDelete}
              className="flex items-center gap-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg shadow-sm shadow-red-500/20 transition">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
