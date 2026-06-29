'use client';
// Dashboard: My Sites — list view with left-side type filter tabs.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSites, SiteWithMain } from '@/hooks/sites/useSites';
import { getSitePublicPath, getSiteDisplayUrl } from '@/lib/site-urls';
import {
  Plus, ExternalLink, MoreVertical, Store, Layers,
  CreditCard, Link2, Globe, Copy, Check,
  Trash2, EyeOff, Eye, Clock, Pencil, type LucideIcon
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TrashDrawer, TrashItem } from '@/components/dashboard/TrashDrawer';

// ─── Type filter config ─────────────────────────────────────
const FILTER_TABS = [
  { key: 'all',       label: 'All Sites',     icon: Globe },
  { key: 'main',      label: 'Main Store',    icon: Store },
  { key: 'single',    label: 'Product Site',  icon: Layers },
  { key: 'payment',   label: 'Payment Link',  icon: CreditCard },
  { key: 'linkinbio', label: 'Link in Bio',   icon: Link2 },
] as const;

const SITE_TYPE_META: Record<string, { label: string; color: string; bg: string; text: string }> = {
  main:      { label: 'Main Store',    bg: 'bg-[var(--surface-muted)]', text: 'text-[var(--text-secondary)]', color: 'brand' },
  single:    { label: 'Product Site',  bg: 'bg-[var(--surface-muted)]', text: 'text-[var(--text-secondary)]', color: 'info' },
  payment:   { label: 'Payment Link',  bg: 'bg-[var(--success-subtle)]', text: 'text-[var(--success)]', color: 'success' },
  linkinbio: { label: 'Link in Bio',   bg: 'bg-[var(--surface-muted)]', text: 'text-[var(--text-secondary)]', color: 'neutral' },
};

const SITE_TYPE_ICON: Record<string, LucideIcon> = {
  main: Store, single: Layers, payment: CreditCard, linkinbio: Link2,
};

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
  const sp = (site as { site_singlepage?: { title?: string } | { title?: string }[] }).site_singlepage;
  const sl = (site as { linkinbio_pages?: { display_name?: string } | { display_name?: string }[] }).linkinbio_pages;
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
    <div className="group flex items-center gap-4 px-5 py-4 sm:px-6 sm:py-4 bg-[var(--surface)] border border-[var(--border)] rounded-[20px] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-xs)] transition-all duration-200">
      {/* Icon */}
      <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 border border-[var(--border-subtle)] shadow-inner ${meta.bg}`}>
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
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[var(--warning-subtle)] border border-[var(--warning-border)] text-[var(--warning)] uppercase tracking-wider shrink-0">Draft</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-xs font-medium text-[var(--text-tertiary)] truncate max-w-[180px]">{displayUrl}</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-tertiary)] hover:text-[var(--brand)] transition-colors shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            title="Copy link"
          >
            {copied ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Right side: badge + date + actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Type badge */}
        <span className={`hidden lg:inline-flex text-[11px] font-bold px-2.5 py-1 rounded-lg ${meta.bg} ${meta.text} border border-[var(--border-subtle)]`}>
          {meta.label}
        </span>

        {/* Date */}
        <span className="hidden xl:flex items-center gap-1 text-[11px] font-semibold text-[var(--text-tertiary)] tabular-nums px-2">
          <Clock className="w-3 h-3" />
          {createdDate}
        </span>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-[var(--border-subtle)] mx-1" />

        {/* Edit */}
        <button
          onClick={handleEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] rounded-[var(--radius-sm)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>

        {/* View */}
        <a
          href={publicPath}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-[var(--radius-sm)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View
        </a>

        {/* More menu */}
        <div className="relative z-20">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            data-state={menuOpen ? 'open' : 'closed'}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-sm)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={() => { handleCopy(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <Copy className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                  Copy link
                </button>
                <button
                  onClick={() => { onToggle(site.id, !site.is_active); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  {site.is_active
                    ? <EyeOff className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                    : <Eye className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />}
                  {site.is_active ? 'Unpublish' : 'Publish'}
                </button>
                <div className="mx-3 border-t border-[var(--border-subtle)]" />
                <button
                  onClick={() => { onRequestDelete(site.id, title); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
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
function SitesEmptyState({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-[32px] shadow-[var(--shadow-xs)]">
      <div className="w-24 h-24 bg-[var(--surface-muted)] rounded-[24px] flex items-center justify-center mb-6 border border-[var(--border-subtle)] shadow-inner">
        <Globe className="w-10 h-10 text-[var(--text-secondary)]" />
      </div>
      <h2 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">{label}</h2>
      <p className="text-base font-medium text-[var(--text-secondary)] max-w-sm mb-8">
        Your digital real estate starts here. Build a beautiful site, store, or landing page in minutes.
      </p>
      <button
        onClick={onClick}
        className="group relative inline-flex items-center justify-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-8 py-4 rounded-2xl font-bold text-base shadow-[var(--shadow-xs)] transition-all active:scale-[0.98] overflow-hidden focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
        <Plus className="w-5 h-5 relative z-10" />
        <span className="relative z-10">Create Your First Site</span>
      </button>
    </div>
  );
}

function siteTitle(site: SiteWithMain): string {
  const sm = Array.isArray(site.site_main) ? site.site_main[0] : site.site_main;
  const sp = Array.isArray(site.site_singlepage) ? site.site_singlepage[0] : site.site_singlepage;
  const sl = Array.isArray(site.linkinbio_pages) ? site.linkinbio_pages[0] : site.linkinbio_pages;
  return sm?.title ?? sp?.title ?? sl?.display_name ?? site.slug ?? 'Untitled';
}

// ─── Page ────────────────────────────────────────────────────
export default function SitesPage() {
  const router = useRouter();
  const {
    sites, trashedSites, isLoading, isLoadingTrash,
    deleteSite, restoreSite, permanentlyDeleteSite, toggleActive,
  } = useSites();
  const [activeFilter, setActiveFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);

  const trashItems: TrashItem[] = trashedSites.map((s) => ({
    id: s.id,
    title: siteTitle(s),
    subtitle: s.site_type,
    deletedAt: (s as { deleted_at?: string | null }).deleted_at ?? null,
    icon: SITE_TYPE_ICON[s.site_type] ?? Store,
  }));

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
      <div className="space-y-6 pb-12">
        <PageHeader
          title="My Sites"
          description={
            sites.length > 0
              ? `Managing ${sites.length} site${sites.length !== 1 ? 's' : ''}`
              : 'No sites yet — create your first one.'
          }
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTrashOpen(true)}
                className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <Trash2 className="w-4 h-4" />
                Trash
                {trashedSites.length > 0 && (
                  <span className="rounded-full bg-[var(--surface-hover)] px-1.5 py-0.5 text-xs font-bold text-[var(--text-secondary)]">
                    {trashedSites.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => router.push('/dashboard/sites/new')}
                className="inline-flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-3 py-2 rounded-[var(--radius-sm)] font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <Plus className="w-4 h-4" />
                Create New Site
              </button>
            </div>
          }
        />

        {/* Layout: left tabs + right list */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sub-sidebar */}
          <div className="hidden md:flex flex-col w-[220px] shrink-0">
            <div className="sticky top-20 flex flex-col gap-3">

              {/* Summary card */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow-xs)]">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Overview</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-[var(--text-primary)] leading-none">{sites.length}</span>
                  <span className="text-sm font-semibold text-[var(--text-secondary)] mb-0.5">total sites</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {FILTER_TABS.filter(t => t.key !== 'all').map(tab => {
                    const count = typeCounts[tab.key] || 0;
                    if (!count) return null;
                    return (
                      <span key={tab.key} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                        {count} {tab.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Filter nav */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-2 shadow-[var(--shadow-xs)] flex flex-col gap-0.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] px-3 pt-1.5 pb-2">Filter by type</p>
                {FILTER_TABS.map(tab => {
                  const count = typeCounts[tab.key] || 0;
                  const isActive = activeFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveFilter(tab.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                        isActive
                          ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-[var(--shadow-xs)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <tab.icon className={`w-4 h-4 shrink-0 ${isActive ? 'opacity-80' : ''}`} />
                      <span className="flex-1 text-left">{tab.label}</span>
                      {count > 0 && (
                        <span className={`text-[10px] font-extrabold min-w-5 text-center px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-white/20'
                            : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
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
                className="group flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-[var(--border)] text-sm font-bold text-[var(--text-tertiary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all duration-200 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
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
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all shrink-0 border focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                    isActive
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-transparent shadow-[var(--shadow-xs)]'
                      : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)]'
                  }`}
                >
                  <tab.icon className="w-4 h-4 opacity-70" />
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/20' : 'bg-[var(--surface-muted)]'}`}>
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
                  <div key={i} className="flex items-center gap-5 px-6 py-5 bg-[var(--surface)] border border-[var(--border)] rounded-[20px] animate-pulse">
                    <div className="w-14 h-14 rounded-[16px] bg-[var(--surface-muted)]" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-[var(--surface-muted)] rounded-md w-1/3" />
                      <div className="h-3 bg-[var(--surface-muted)] rounded-md w-1/2" />
                    </div>
                    <div className="hidden lg:block h-7 bg-[var(--surface-muted)] rounded-lg w-24" />
                    <div className="h-10 bg-[var(--surface-muted)] rounded-xl w-20" />
                    <div className="h-10 bg-[var(--surface-muted)] rounded-xl w-24" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty */}
            {!isLoading && filtered.length === 0 && (
              <SitesEmptyState
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

      {/* Move-to-trash confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) await deleteSite(deleteTarget.id); }}
        title="Move to Trash?"
        description={`"${deleteTarget?.name ?? ''}" will be moved to Trash. You can restore it from Trash later.`}
        confirmLabel="Move to Trash"
        cancelLabel="Cancel"
      />

      <TrashDrawer
        isOpen={trashOpen}
        onClose={() => setTrashOpen(false)}
        title="Trashed sites"
        items={trashItems}
        isLoading={isLoadingTrash}
        emptyLabel="Trash is empty"
        onRestore={restoreSite}
        onPermanentDelete={permanentlyDeleteSite}
      />
    </>
  );
}
