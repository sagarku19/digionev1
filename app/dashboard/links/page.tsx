'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, Link2, MousePointerClick, Zap } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiGrid } from '@/components/ui/KpiGrid';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useShortLinks, type ShortLink } from '@/hooks/marketing/useShortLinks';
import { LinkCard } from '@/components/dashboard/links/LinkCard';
import { LinkFormView } from '@/components/dashboard/links/LinkFormView';
import { GuideButton } from '@/components/dashboard/guides/GuideButton';

export default function ShortLinksPage() {
  const { links, isLoading, createLink, isCreating, updateLink, isUpdating, deleteLink } = useShortLinks();
  const [editorTarget, setEditorTarget] = useState<'new' | ShortLink | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShortLink | null>(null);
  const [search, setSearch] = useState('');

  const stats = useMemo(() => ({
    total: links.length,
    clicks: links.reduce((a, l) => a + Number(l.click_count), 0),
    active: links.filter((l) => l.is_active && !l.archived_at).length,
  }), [links]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return links;
    return links.filter((l) =>
      l.code.toLowerCase().includes(q) ||
      l.destination_url.toLowerCase().includes(q) ||
      (l.title ?? '').toLowerCase().includes(q) ||
      (l.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  }, [links, search]);

  const openCreate = () => setEditorTarget('new');
  const openEdit = (l: ShortLink) => setEditorTarget(l);
  const closeEditor = () => setEditorTarget(null);
  const toggle = (l: ShortLink) => updateLink({ id: l.id, is_active: !l.is_active });
  const archive = (l: ShortLink) => updateLink({ id: l.id, archived_at: l.archived_at ? null : new Date().toISOString() });
  const remove = (l: ShortLink) => setDeleteTarget(l);

  if (editorTarget) {
    return (
      <div className="pt-6">
        <LinkFormView
          editing={editorTarget === 'new' ? null : editorTarget}
          onCreate={createLink}
          onUpdate={updateLink}
          onCreated={(link) => setEditorTarget(link)}
          onBack={closeEditor}
          busy={isCreating || isUpdating}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Short Links"
        description="Create branded short links, track clicks, and share anywhere."
        action={
          <>
            <GuideButton guideKey="links" />
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <Plus className="w-4 h-4" /> Create link
            </button>
          </>
        }
      />

      <KpiGrid>
        <StatCard label="Total links" value={stats.total} icon={Link2} />
        <StatCard label="Total clicks" value={stats.clicks.toLocaleString('en-IN')} icon={MousePointerClick} />
        <StatCard label="Active" value={stats.active} icon={Zap} />
      </KpiGrid>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search links…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow"
        />
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-xs)]">
        {isLoading ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="w-8 h-8 shrink-0" rounded="md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" rounded="md" />
                  <Skeleton className="h-3 w-72" rounded="md" />
                </div>
                <Skeleton className="h-5 w-16 shrink-0" rounded="sm" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Link2}
            title={search ? 'No matching links' : 'No short links yet'}
            description={search ? 'Try a different search.' : 'Create your first branded short link to start tracking clicks.'}
            action={
              !search ? (
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <Plus className="w-4 h-4" /> Create link
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {filtered.map((l) => (
              <LinkCard key={l.id} link={l} onEdit={openEdit} onToggle={toggle} onArchive={archive} onDelete={remove} />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) await deleteLink(deleteTarget.id); }}
        title="Delete short link?"
        description={deleteTarget ? `${deleteTarget.code} will be permanently deleted. Anyone who has this link will get a 404. This cannot be undone.` : ''}
        confirmLabel="Delete"
        isDestructive
      />
    </div>
  );
}
