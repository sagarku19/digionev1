'use client';
import { ChevronsLeft, Undo2, Redo2, ChevronDown, Check } from 'lucide-react';
import { useState, useRef, Fragment, type ElementType } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { DigiOneLogo, DigiOneLogoDark } from '@/src/components/assets/DigiOneLogo';
import { BackButton } from '@/components/dashboard/BackButton';
import { useSites } from '@/hooks/sites/useSites';

export type SidebarItem = {
  id: string;
  label: string;
  icon: ElementType;
  group: string; // 'main' renders headingless; any other group renders a heading
  groupLabel?: string; // heading text for non-'main' groups (defaults: tools→"Tools")
  comingSoon?: boolean;
};

export type EditorSiteType = 'linkinbio' | 'single' | 'payment' | 'main';

// Per-type config for the header page-switcher dropdown.
// A real, custom slug — not the id fallback some sites get when no slug was set.
const cleanSlug = (s: import('@/hooks/sites/useSites').SiteWithMain): string | null =>
  s.slug && s.slug !== s.id ? s.slug : null;

type SwitcherConfig = {
  match: string;
  editBase: string;
  heading: string;
  label: (s: import('@/hooks/sites/useSites').SiteWithMain) => string;
  url: (s: import('@/hooks/sites/useSites').SiteWithMain) => string;
};

const SWITCHER: Record<EditorSiteType, SwitcherConfig> = {
  linkinbio: {
    match: 'linkinbio',
    editBase: 'linkinbio',
    heading: 'Your link-in-bio pages',
    label: (s) => s.linkinbio_pages?.display_name || cleanSlug(s) || 'Untitled',
    url: (s) => (cleanSlug(s) ? `/link/${cleanSlug(s)}` : 'No URL set'),
  },
  single: {
    match: 'single',
    editBase: 'singlepage',
    heading: 'Your single pages',
    label: (s) => s.site_singlepage?.title || cleanSlug(s) || 'Untitled',
    url: (s) => (cleanSlug(s) ? `/site/${cleanSlug(s)}` : 'No URL set'),
  },
  payment: {
    match: 'payment',
    editBase: 'payment',
    heading: 'Your payment links',
    label: (s) => s.site_main?.title || 'Untitled',
    url: (s) => `/pay/${s.id.slice(0, 8)}…`,
  },
  main: {
    match: 'main',
    editBase: 'main',
    heading: 'Your stores',
    label: (s) => s.site_main?.title || cleanSlug(s) || 'Untitled',
    url: (s) => (cleanSlug(s) ? `/store/${cleanSlug(s)}` : 'No URL set'),
  },
};

type Props = {
  items: SidebarItem[];
  active: string;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  title: string;
  typeLabel: string;
  typeIcon: ElementType;
  onBack: () => void;
  onNavigate?: (href: string) => void;
  siteType?: EditorSiteType;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
};

export default function EditorSidebar({
  items, active, onSelect, collapsed, onToggleCollapse, title, typeLabel, typeIcon: TypeIcon, onBack,
  onNavigate, siteType = 'linkinbio', canUndo, canRedo, onUndo, onRedo,
}: Props) {
  const width = collapsed ? 'w-[64px]' : 'w-[210px]';

  const switcher = SWITCHER[siteType];
  const router = useRouter();
  const params = useParams();
  const currentId = params?.id as string | undefined;
  const { sites } = useSites();
  const pages = sites.filter((s) => s.site_type === switcher.match);

  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openMenu = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setMenuOpen(true);
  };
  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setMenuOpen(false), 140);
  };

  const goToPage = (id: string) => {
    setMenuOpen(false);
    if (id === currentId) return;
    const href = `/dashboard/sites/edit/${switcher.editBase}/${id}`;
    if (onNavigate) onNavigate(href);
    else router.push(href);
  };

  const Row = (it: SidebarItem) => {
    const isActive = active === it.id;
    return (
      <button
        key={it.id}
        onClick={() => onSelect(it.id)}
        title={it.label}
        className={`flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${collapsed ? 'justify-center' : ''} ${
          isActive
            ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        <it.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[var(--brand)]' : ''}`} />
        {!collapsed && <span className="flex-1 truncate text-left">{it.label}</span>}
        {!collapsed && it.comingSoon && (
          <span className="rounded-full bg-[var(--surface-muted)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">soon</span>
        )}
      </button>
    );
  };

  return (
    <div className={`${width} hidden shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] transition-all duration-200 lg:flex`}>
      {/* brand bar: back-to-sites + DigiOne logo (mirrors the dashboard sidebar) */}
      <div className={`flex shrink-0 items-center gap-2 border-b border-[var(--border)] ${collapsed ? 'flex-col px-2 py-3' : 'h-[52px] px-2'}`}>
        <BackButton onClick={onBack} label="Back to sites" />
        <Link
          href="/dashboard"
          aria-label="DigiOne dashboard"
          title="DigiOne dashboard"
          className="group flex min-w-0 items-center gap-2 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <DigiOneLogo width={26} height={26} className="block shrink-0 transition-transform group-hover:scale-105 dark:hidden" />
          <DigiOneLogoDark width={26} height={26} className="hidden shrink-0 transition-transform group-hover:scale-105 dark:block" />
          {!collapsed && (
            <span className="truncate text-[16px] font-bold tracking-tight text-[var(--text-primary)]">
              DigiOne
              <sup className="relative -top-1.5 ml-0.5 text-[9px] font-medium text-[var(--text-secondary)]">.ai</sup>
            </span>
          )}
        </Link>
      </div>

      {/* page switcher (expanded only) */}
      {!collapsed && (
        <div className="flex shrink-0 items-center border-b border-[var(--border)] px-2 py-2.5">
          <div
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
            className="relative min-w-0 flex-1"
          >
            <button
              onClick={() => setMenuOpen((o) => !o)}
              title="Switch page"
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              className="flex w-full items-center gap-2 rounded-[var(--radius-md)] py-1 pr-1.5 text-left transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                <TypeIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-[var(--text-primary)]">{title}</p>
                <p className="truncate text-[11px] font-medium text-[var(--text-tertiary)]">{typeLabel}</p>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div
                role="listbox"
                className="absolute left-full top-3 z-30 ml-3 max-h-80 w-60 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-lg)]"
              >
                <p className="mb-1 border-b border-[var(--border-subtle)] px-2 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{switcher.heading}</p>
                {pages.length === 0 && (
                  <p className="px-2 py-2 text-xs text-[var(--text-tertiary)]">No pages found</p>
                )}
                {pages.map((p) => {
                  const isCurrent = p.id === currentId;
                  return (
                    <button
                      key={p.id}
                      role="option"
                      aria-selected={isCurrent}
                      onClick={() => goToPage(p.id)}
                      className={`flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${isCurrent ? 'bg-[var(--surface-hover)]' : 'hover:bg-[var(--surface-hover)]'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{switcher.label(p)}</p>
                        <p className="truncate text-[11px] text-[var(--text-tertiary)]">{switcher.url(p)}</p>
                      </div>
                      {isCurrent && <Check className="h-4 w-4 shrink-0 text-[var(--brand)]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2.5">
        {(() => {
          return items.map((it, idx) => {
            const prevGroup = idx > 0 ? items[idx - 1].group : 'main';
            const newGroup = it.group !== 'main' && it.group !== prevGroup;
            const heading = it.groupLabel ?? (it.group === 'tools' ? 'Tools' : it.group);
            return (
              <Fragment key={it.id}>
                {newGroup && !collapsed && <p className="px-2.5 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{heading}</p>}
                {newGroup && collapsed && <div className="my-2 h-px bg-[var(--border)]" />}
                {Row(it)}
              </Fragment>
            );
          });
        })()}
      </div>
      <div className="p-2.5">
        <div className={`flex gap-1.5 ${collapsed ? 'flex-col items-stretch' : ''}`}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
            aria-label="Undo"
            className={`flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors enabled:hover:bg-[var(--surface-hover)] enabled:hover:text-[var(--text-primary)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${collapsed ? 'w-full' : 'flex-1'}`}
          >
            <Undo2 className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Undo</span>}
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
            aria-label="Redo"
            className={`flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors enabled:hover:bg-[var(--surface-hover)] enabled:hover:text-[var(--text-primary)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${collapsed ? 'w-full' : 'flex-1'}`}
          >
            <Redo2 className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Redo</span>}
          </button>
        </div>
        <div className="my-2 h-px bg-[var(--border)]" />
        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
          className={`flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${collapsed ? 'justify-center' : ''}`}
        >
          <ChevronsLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );
}
