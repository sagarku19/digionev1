'use client';
// Dashboard: My Sites — list view with left-side type filter tabs.

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSites, SiteWithMain } from '@/hooks/useSites';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import {
  Plus, ExternalLink, MoreVertical, Store, Layers,
  CreditCard, Link2, Globe, Copy, Check,
  Trash2, EyeOff, Eye, Clock, Pencil, AlertTriangle, X
} from 'lucide-react';

// ─── Type filter config ─────────────────────────────────────
const FILTER_TABS = [
  { key: 'all',       label: 'All Sites',     icon: Globe },
  { key: 'main',      label: 'Main Store',    icon: Store },
  { key: 'single',    label: 'Product Site',  icon: Layers },
  { key: 'payment',   label: 'Payment Link',  icon: CreditCard },
  { key: 'linkinbio', label: 'Link in Bio',   icon: Link2 },
] as const;

const SITE_TYPE_META: Record<string, { label: string; color: string; bg: string; text: string }> = {
  main:      { label: 'Main Store',    bg: 'bg-gray-100 dark:bg-[var(--bg-secondary)]', text: 'text-gray-700 dark:text-[var(--text-secondary)]', color: 'indigo' },
  single:    { label: 'Product Site',  bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', color: 'purple' },
  payment:   { label: 'Payment Link',  bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', color: 'emerald' },
  linkinbio: { label: 'Link in Bio',   bg: 'bg-pink-50 dark:bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', color: 'pink' },
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onCancel} />
      <div className="relative bg-white dark:bg-zinc-950 rounded-[32px] shadow-2xl w-full max-w-md border border-gray-200/50 dark:border-zinc-800/80 p-6 sm:p-8 transform transition-all scale-in-95 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start gap-5 mb-6">
          <div className="w-14 h-14 rounded-[20px] bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0 border border-red-100 dark:border-red-500/20 shadow-inner">
            <AlertTriangle className="w-7 h-7 text-red-500 dark:text-red-400" />
          </div>
          <div className="flex-1 pt-1">
            <h3 className="text-xl font-extrabold text-[var(--text-primary)]">Delete site</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              This action is permanent and cannot be undone. All layout and setting data associated with this site will be lost.
            </p>
          </div>
          <button onClick={onCancel} className="p-2 -mr-2 -mt-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confirmation input */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">
            Type <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-[var(--text-primary)] mx-1">{siteName}</span> to confirm
          </label>
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={siteName}
            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-800 rounded-xl bg-gray-50/50 dark:bg-zinc-900/50 text-sm font-medium text-[var(--text-primary)] placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:border-red-500 transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 text-sm font-bold text-gray-700 dark:text-[var(--text-secondary)] border-2 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-xl transition-colors"
          >
            Keep Site
          </button>
          <button
            onClick={onConfirm}
            disabled={!canDelete}
            className={`flex-1 py-3.5 text-sm font-bold rounded-xl transition-all active:scale-[0.98] ${
              canDelete
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20'
                : 'bg-red-100 dark:bg-red-900/20 text-red-300 dark:text-red-800 cursor-not-allowed opacity-70'
            }`}
          >
            Yes, Delete
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
  const truncatedTitle = title.length > 40 ? title.slice(0, 40) + '...' : title;
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
    <div className="group flex items-center gap-4 px-5 py-4 sm:px-6 sm:py-4 bg-white dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800 rounded-[20px] hover:border-gray-300 dark:hover:border-zinc-600 hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)] transition-all duration-200">
      {/* Icon */}
      <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5 shadow-inner ${meta.bg}`}>
        {sm?.logo_url ? (
          <img src={sm.logo_url} alt={title} className="w-full h-full object-cover rounded-[14px]" />
        ) : (
          <TypeIcon className={`w-5 h-5 ${meta.text}`} />
        )}
      </div>

      {/* Title + URL */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm text-[var(--text-primary)] truncate" title={title}>{truncatedTitle}</h3>
          {!site.is_active && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 uppercase tracking-wider shrink-0">Draft</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 truncate max-w-[180px]">{displayUrl}</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] font-bold text-gray-300 dark:text-zinc-600 hover:text-indigo-500 transition-colors shrink-0"
            title="Copy link"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Right side: badge + date + actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Type badge */}
        <span className={`hidden lg:inline-flex text-[11px] font-bold px-2.5 py-1 rounded-lg ${meta.bg} ${meta.text} border border-black/5 dark:border-white/5`}>
          {meta.label}
        </span>

        {/* Date */}
        <span className="hidden xl:flex items-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-zinc-500 tabular-nums px-2">
          <Clock className="w-3 h-3" />
          {createdDate}
        </span>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-gray-100 dark:bg-zinc-800 mx-1" />

        {/* Edit */}
        <button
          onClick={handleEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-[var(--text-secondary)] bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>

        {/* View */}
        <a
          href={publicPath}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gray-900 dark:bg-white dark:text-zinc-950 hover:bg-gray-700 dark:hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View
        </a>

        {/* More menu */}
        <div className="relative z-20">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-[var(--text-primary)] rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            data-state={menuOpen ? 'open' : 'closed'}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={() => { handleCopy(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-gray-700 dark:text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Copy className="w-4 h-4 text-gray-400 shrink-0" />
                  Copy link
                </button>
                <button
                  onClick={() => { onToggle(site.id, !site.is_active); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-gray-700 dark:text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  {site.is_active
                    ? <EyeOff className="w-4 h-4 text-gray-400 shrink-0" />
                    : <Eye className="w-4 h-4 text-gray-400 shrink-0" />}
                  {site.is_active ? 'Unpublish' : 'Publish'}
                </button>
                <div className="mx-3 border-t border-gray-100 dark:border-zinc-800" />
                <button
                  onClick={() => { onRequestDelete(site.id, title); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────
function EmptyState({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center bg-white/50 dark:bg-zinc-950/50 border border-dashed border-gray-300 dark:border-zinc-800 rounded-[32px] shadow-sm">
      <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 rounded-[24px] flex items-center justify-center mb-6 border border-white dark:border-white/5 shadow-inner">
        <Globe className="w-10 h-10 text-gray-600 dark:text-[var(--text-secondary)] dark:text-indigo-400" />
      </div>
      <h2 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">{label}</h2>
      <p className="text-base font-medium text-gray-500 max-w-sm mb-8">
        Your digital real estate starts here. Build a beautiful site, store, or landing page in minutes.
      </p>
      <button
        onClick={onClick}
        className="group relative inline-flex items-center justify-center gap-2 bg-(--text-primary) hover:bg-(--text-primary)/90 text-(--bg-primary) px-8 py-4 rounded-2xl font-bold text-base shadow-lg transition-all active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
        <Plus className="w-5 h-5 relative z-10" />
        <span className="relative z-10">Create Your First Site</span>
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
      <div className="pt-6 sm:pt-8 pb-16 min-h-screen max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">My Sites</h1>
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mt-1">
              {sites.length > 0
                ? `Managing ${sites.length} site${sites.length !== 1 ? 's' : ''}`
                : 'No sites yet — create your first one.'}
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/sites/new')}
            className="inline-flex items-center gap-2 bg-(--text-primary) hover:bg-(--text-primary)/90 text-(--bg-primary) px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create New Site
          </button>
        </div>

        {/* Layout: left tabs + right list */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sub-sidebar */}
          <div className="hidden md:flex flex-col w-[220px] shrink-0">
            <div className="sticky top-20 flex flex-col gap-3">

              {/* Summary card */}
              <div className="bg-white dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-3">Overview</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-[var(--text-primary)] leading-none">{sites.length}</span>
                  <span className="text-sm font-semibold text-gray-400 dark:text-zinc-500 mb-0.5">total sites</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {FILTER_TABS.filter(t => t.key !== 'all').map(tab => {
                    const count = typeCounts[tab.key] || 0;
                    if (!count) return null;
                    const colorMap: Record<string, string> = {
                      main:      'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-[var(--text-secondary)]',
                      single:    'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
                      payment:   'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                      linkinbio: 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400',
                    };
                    return (
                      <span key={tab.key} className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${colorMap[tab.key]}`}>
                        {count} {tab.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Filter nav */}
              <div className="bg-white dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800 rounded-2xl p-2 shadow-sm flex flex-col gap-0.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 px-3 pt-1.5 pb-2">Filter by type</p>
                {FILTER_TABS.map(tab => {
                  const count = typeCounts[tab.key] || 0;
                  const isActive = activeFilter === tab.key;
                  const accentMap: Record<string, string> = {
                    all:       'bg-gray-900 text-white dark:bg-white dark:text-zinc-900',
                    main:      'bg-gray-900 text-white dark:bg-white dark:text-zinc-900',
                    single:    'bg-purple-600 text-white',
                    payment:   'bg-emerald-600 text-white',
                    linkinbio: 'bg-pink-600 text-white',
                  };
                  const iconColorMap: Record<string, string> = {
                    all:       isActive ? '' : 'text-gray-400',
                    main:      isActive ? '' : 'text-gray-400',
                    single:    isActive ? '' : 'text-purple-400',
                    payment:   isActive ? '' : 'text-emerald-400',
                    linkinbio: isActive ? '' : 'text-pink-400',
                  };
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveFilter(tab.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                        isActive
                          ? `${accentMap[tab.key]} shadow-sm`
                          : 'text-gray-600 dark:text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <tab.icon className={`w-4 h-4 shrink-0 ${isActive ? 'opacity-80' : iconColorMap[tab.key]}`} />
                      <span className="flex-1 text-left">{tab.label}</span>
                      {count > 0 && (
                        <span className={`text-[10px] font-extrabold min-w-5 text-center px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-white/20 dark:bg-black/15'
                            : 'bg-gray-100 dark:bg-zinc-800 text-[var(--text-secondary)]'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick create */}
              <button
                onClick={() => router.push('/dashboard/sites/new')}
                className="group flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-800 text-sm font-bold text-gray-400 dark:text-zinc-500 hover:border-gray-900 dark:hover:border-zinc-400 hover:text-gray-900 dark:hover:text-[var(--text-primary)] hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-all duration-200"
              >
                <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
                New Site
              </button>

            </div>
          </div>

          {/* Mobile filter - horizontal scroll */}
          <div className="md:hidden flex gap-3 overflow-x-auto pb-4 pt-1 -mx-4 px-4 w-[calc(100%+2rem)] custom-scrollbar">
            {FILTER_TABS.map(tab => {
              const count = typeCounts[tab.key] || 0;
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all shrink-0 border ${
                    isActive
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-md'
                      : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-[var(--text-secondary)]'
                  }`}
                >
                  <tab.icon className="w-4 h-4 opacity-70" />
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/20 dark:bg-black/10' : 'bg-gray-100 dark:bg-zinc-800'}`}>
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
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-5 px-6 py-5 bg-white dark:bg-zinc-950 border border-gray-200/50 dark:border-zinc-800/50 rounded-[20px] animate-pulse">
                    <div className="w-14 h-14 rounded-[16px] bg-gray-100 dark:bg-zinc-900" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gray-100 dark:bg-zinc-900 rounded-md w-1/3" />
                      <div className="h-3 bg-gray-100 dark:bg-zinc-900 rounded-md w-1/2" />
                    </div>
                    <div className="hidden lg:block h-7 bg-gray-100 dark:bg-zinc-900 rounded-lg w-24" />
                    <div className="h-10 bg-gray-100 dark:bg-zinc-900 rounded-xl w-20" />
                    <div className="h-10 bg-gray-100 dark:bg-zinc-900 rounded-xl w-24" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty */}
            {!isLoading && filtered.length === 0 && (
              <EmptyState
                label={activeFilter === 'all' ? 'No sites found' : `No ${FILTER_TABS.find(t => t.key === activeFilter)?.label ?? ''} sites`}
                onClick={() => router.push('/dashboard/sites/new')}
              />
            )}

            {/* List */}
            {!isLoading && filtered.length > 0 && (
              <div className="space-y-4">
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
