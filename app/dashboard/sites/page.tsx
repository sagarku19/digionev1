'use client';
// Dashboard: My Stores — list all creator sites.
// DB tables: sites, site_main (read via useSites)

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSites, SiteWithMain } from '@/hooks/useSites';
import {
  Plus, ExternalLink, Settings, MoreVertical, Store, Package,
  CreditCard, FileText, Globe, Shield, ShieldAlert, ShieldX, Clock,
  Trash2, EyeOff, Eye
} from 'lucide-react';

// ─── Badge helpers ──────────────────────────────────────────
const SITE_TYPE_META: Record<string, { label: string; color: string }> = {
  main:    { label: 'Main store',    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400' },
  single:  { label: 'Product page',  color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' },
  payment: { label: 'Payment link',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  blog:    { label: 'Blog',          color: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400' },
};

const SSL_META: Record<string, { label: string; dot: string }> = {
  active:  { label: 'SSL active',  dot: 'bg-emerald-500' },
  pending: { label: 'Pending',     dot: 'bg-amber-400' },
  none:    { label: 'No SSL',      dot: 'bg-gray-400' },
  failed:  { label: 'SSL failed',  dot: 'bg-red-500' },
};

function SiteTypeBadge({ type }: { type: string }) {
  const m = SITE_TYPE_META[type] ?? SITE_TYPE_META.main;
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m.color}`}>{m.label}</span>;
}

function SslBadge({ status }: { status: string | null }) {
  const key = status ?? 'none';
  const m = SSL_META[key] ?? SSL_META.none;
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.dot}`} />
      {m.label}
    </span>
  );
}

// ─── Site Card ──────────────────────────────────────────────
function SiteCard({ site, onDelete, onToggle }: {
  site: SiteWithMain;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const sm = Array.isArray(site.site_main) ? site.site_main[0] : site.site_main;
  
  const title = sm?.title ?? site.slug ?? site.child_slug ?? 'Untitled';
  
  let urlPath = site.slug;
  if (!urlPath && site.child_slug) {
    const parent = Array.isArray(site.parent_site) ? site.parent_site[0] : site.parent_site;
    urlPath = parent?.slug ? `${parent.slug}/${site.child_slug}` : site.child_slug;
  }
  
  const displayUrl = site.custom_domain ?? `digione.in/${urlPath}`;

  return (
    <div className="group bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-200">
      {/* Banner */}
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-indigo-500/20 to-violet-500/20">
        {sm?.banner_url ? (
          <img src={sm.banner_url} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500/30 to-violet-600/30 flex items-center justify-center">
            <Store className="w-10 h-10 text-indigo-400/60" />
          </div>
        )}
        {!site.is_active && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-xs font-bold text-white bg-black/60 px-3 py-1 rounded-full">Inactive</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <SiteTypeBadge type={site.site_type} />
          <SslBadge status={site.ssl_status} />
        </div>

        {/* Title + URL */}
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{title}</h3>
        <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5 truncate">{displayUrl}</p>

        {/* Actions row */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => router.push(`/dashboard/sites/${site.id}`)}
            className="flex-1 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 py-2 rounded-lg transition flex items-center justify-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
          <a
            href={`/${urlPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 py-2 px-3 rounded-lg transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View
          </a>

          {/* ··· dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 bottom-full mb-1 w-44 bg-white dark:bg-[#0D0E1A] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1 z-50"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  onClick={() => { onToggle(site.id, !site.is_active); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  {site.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {site.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${title}"? This cannot be undone.`)) onDelete(site.id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete site
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────
function EmptyState({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl flex items-center justify-center mb-6">
        <Store className="w-10 h-10 text-gray-300 dark:text-gray-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No stores yet</h2>
      <p className="text-sm text-gray-500 max-w-xs mb-6">
        Build your first storefront in 5 minutes and start selling digital products.
      </p>
      <button
        onClick={onClick}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all"
      >
        <Plus className="w-4 h-4" />
        Create your first store →
      </button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────
export default function SitesPage() {
  const router = useRouter();
  const { sites, isLoading, deleteSite, toggleActive } = useSites();

  const handleDelete = async (id: string) => {
    try { await deleteSite(id); } catch { /* silent */ }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try { await toggleActive({ siteId: id, isActive: active }); } catch { /* silent */ }
  };

  return (
    <div className="space-y-6 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Stores</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all your storefronts and pages</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/sites/new')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          New site
        </button>
      </div>

      {/* Skeleton loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-100 dark:bg-gray-800" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sites.length === 0 && (
        <EmptyState onClick={() => router.push('/dashboard/sites/new')} />
      )}

      {/* Grid */}
      {!isLoading && sites.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map(site => (
            <SiteCard
              key={site.id}
              site={site}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
