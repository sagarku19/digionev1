'use client';
// Dashboard: My Sites — list view with left-side type filter tabs.

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSites, SiteWithMain } from '@/hooks/useSites';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import {
  Plus, ExternalLink, MoreVertical, Store, Layers,
  CreditCard, Link2, Globe, Copy, Check,
  Trash2, EyeOff, Eye, Clock, Pencil, AlertTriangle, X,
} from 'lucide-react';

// ─── Type filter config ─────────────────────────────────────
const FILTER_TABS = [
  { key: 'all',       label: 'All Sites',     icon: Globe },
  { key: 'main',      label: 'Main Store',    icon: Store },
  { key: 'single',    label: 'Product Site',  icon: Layers },
  { key: 'payment',   label: 'Payment Link',  icon: CreditCard },
  { key: 'linkinbio', label: 'Link in Bio',   icon: Link2 },
] as const;

const SITE_TYPE_META: Record<string, { label: string; color: string; dot: string }> = {
  main:      { label: 'Main Store',    color: 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] dark:bg-[var(--accent)]/15 dark:text-[var(--text-secondary)]',  dot: 'bg-[var(--accent)]' },
  single:    { label: 'Product Site',  color: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] dark:bg-[var(--bg-tertiary)] dark:text-[var(--text-secondary)]',  dot: 'bg-[var(--bg-tertiary)]' },
  payment:   { label: 'Payment Link',  color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400', dot: 'bg-emerald-500' },
  linkinbio: { label: 'Link in Bio',   color: 'bg-pink-50 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400',      dot: 'bg-pink-500' },
};

const SITE_TYPE_ICON: Record<string, React.ElementType> = {
  main: Store, single: Layers, payment: CreditCard, linkinbio: Link2,
};

// ─── Delete Confirmation Modal ──────────────────────────────
function DeleteModal({ siteName, onConfirm, onCancel }: {
  siteName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const canDelete = typed === siteName;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#0D0E1A] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete site</h3>
            <p className="text-sm text-gray-500 mt-1">
              This action is permanent and cannot be undone. All data associated with this site will be lost.
            </p>
          </div>
          <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confirmation input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Type <span className="font-bold text-gray-900 dark:text-white">{siteName}</span> to confirm
          </label>
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={siteName}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canDelete}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition ${
              canDelete
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
                : 'bg-red-200 dark:bg-red-900/30 text-red-400 cursor-not-allowed'
            }`}
          >
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Site Row ───────────────────────────────────────────────
function SiteRow({ site, onRequestDelete, onToggle }: {
  site: SiteWithMain;
  onRequestDelete: (id: string, name: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const sm = Array.isArray(site.site_main) ? site.site_main[0] : site.site_main;
  const sp = (site as any).site_singlepage;
  const sl = (site as any).linkinbio_pages;
  const singleTitle = Array.isArray(sp) ? sp[0]?.title : sp?.title;
  const bioName = Array.isArray(sl) ? sl[0]?.display_name : sl?.display_name;

  const title = sm?.title ?? singleTitle ?? bioName ?? 'Untitled';
  const truncatedTitle = title.length > 30 ? title.slice(0, 30) + '...' : title;
  const displayUrl = getSiteDisplayUrl(site);
  const publicPath = getSitePublicPath(site);
  const meta = SITE_TYPE_META[site.site_type] ?? SITE_TYPE_META.main;
  const TypeIcon = SITE_TYPE_ICON[site.site_type] ?? Store;
  const createdDate = new Date(site.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleEdit = () => {
    const typeSlug = site.site_type === 'single' ? 'singlepage' : site.site_type === 'linkinbio' ? 'linkinbio' : site.site_type;
    router.push(`/dashboard/sites/edit/${typeSlug}/${site.id}`);
  };

  const handleCopy = async () => {
    const fullUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${publicPath}`
      : publicPath;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group flex items-center gap-4 px-5 py-4 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-[var(--accent)] dark:hover:border-[var(--accent)] hover:shadow-lg  transition-all duration-200">
      {/* Type Icon */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
        {sm?.logo_url ? (
          <img src={sm.logo_url} alt={title} className="w-full h-full object-cover rounded-xl" />
        ) : (
          <TypeIcon className="w-5 h-5" />
        )}
      </div>

      {/* Title + URL + Copy Link */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white" title={title}>{truncatedTitle}</h3>
          {!site.is_active && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase tracking-wide">Draft</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] truncate max-w-[200px]">{displayUrl}</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-[var(--text-primary)] dark:hover:text-[var(--text-secondary)] transition shrink-0"
            title="Copy link"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Type badge */}
      <span className={`hidden lg:inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${meta.color}`}>
        {meta.label}
      </span>

      {/* Created date */}
      <span className="hidden xl:flex items-center gap-1.5 text-xs text-gray-400 shrink-0 tabular-nums">
        <Clock className="w-3 h-3" />
        {createdDate}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
        <a
          href={publicPath}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--accent)]/20 rounded-lg transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View
        </a>

        {/* More menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#0D0E1A] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl py-1.5 z-50"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                onClick={() => { handleCopy(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <Copy className="w-4 h-4 text-gray-400" />
                Copy link
              </button>
              <button
                onClick={() => { onToggle(site.id, !site.is_active); setMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                {site.is_active ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                {site.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
              <button
                onClick={() => { onRequestDelete(site.id, title); setMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              >
                <Trash2 className="w-4 h-4" />
                Delete site
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────
function EmptyState({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl flex items-center justify-center mb-6">
        <Globe className="w-8 h-8 text-gray-300 dark:text-gray-600" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{label}</h2>
      <p className="text-sm text-gray-500 max-w-xs mb-6">
        Create a new site to get started selling.
      </p>
      <button
        onClick={onClick}
        className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] px-6 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all"
      >
        <Plus className="w-4 h-4" />
        Create site
      </button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────
export default function SitesPage() {
  const router = useRouter();
  const { sites, isLoading, deleteSite, toggleActive } = useSites();
  const [activeFilter, setActiveFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = async (id: string) => {
    try { await deleteSite(id); } catch { /* silent */ }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try { await toggleActive({ siteId: id, isActive: active }); } catch { /* silent */ }
  };

  // Count per type
  const typeCounts: Record<string, number> = { all: sites.length };
  sites.forEach(s => {
    typeCounts[s.site_type] = (typeCounts[s.site_type] || 0) + 1;
  });

  // Filter
  const filtered = activeFilter === 'all' ? sites : sites.filter(s => s.site_type === activeFilter);

  return (
    <>
      <div className="space-y-6 pt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Sites</h1>
            <p className="text-sm text-gray-500 mt-1">
              {sites.length > 0
                ? `${sites.length} site${sites.length !== 1 ? 's' : ''} total`
                : 'Manage all your stores, pages, and apps'}
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/sites/new')}
            className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            New site
          </button>
        </div>

        {/* Layout: left tabs + right list */}
        <div className="flex gap-6">
          {/* Left filter tabs */}
          <div className="hidden md:flex flex-col w-48 shrink-0">
            <div className="sticky top-24 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-2 space-y-0.5">
              {FILTER_TABS.map(tab => {
                const count = typeCounts[tab.key] || 0;
                const isActive = activeFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--text-secondary)]' : 'text-gray-400'}`} />
                    <span className="flex-1 text-left truncate">{tab.label}</span>
                    {count > 0 && (
                      <span className={`text-[11px] font-semibold min-w-[20px] text-center px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile filter - horizontal scroll */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 w-[calc(100%+2rem)]">
            {FILTER_TABS.map(tab => {
              const count = typeCounts[tab.key] || 0;
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-md'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right side: list */}
          <div className="flex-1 min-w-0">
            {/* Skeleton loading */}
            {isLoading && (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl animate-pulse">
                    <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                    </div>
                    <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded-full w-20" />
                    <div className="h-7 bg-gray-100 dark:bg-gray-800 rounded-lg w-16" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty */}
            {!isLoading && filtered.length === 0 && (
              <EmptyState
                label={activeFilter === 'all' ? 'No sites yet' : `No ${FILTER_TABS.find(t => t.key === activeFilter)?.label ?? ''} sites`}
                onClick={() => router.push('/dashboard/sites/new')}
              />
            )}

            {/* List */}
            {!isLoading && filtered.length > 0 && (
              <div className="space-y-2">
                {filtered.map(site => (
                  <SiteRow
                    key={site.id}
                    site={site}
                    onRequestDelete={(id, name) => setDeleteTarget({ id, name })}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          siteName={deleteTarget.name}
          onConfirm={() => { handleDelete(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
