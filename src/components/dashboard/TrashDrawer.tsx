'use client';

import { useState } from 'react';
import { RotateCcw, Trash2, Package } from 'lucide-react';
import { SideDrawer } from '@/components/ui/SideDrawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

export interface TrashItem {
  id: string;
  title: string;
  subtitle?: string;
  deletedAt: string | null;
}

interface TrashDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: TrashItem[];
  isLoading: boolean;
  emptyLabel: string;
  onRestore: (id: string) => Promise<unknown>;
  onPermanentDelete: (id: string) => Promise<unknown>;
}

export function TrashDrawer({
  isOpen, onClose, title, items, isLoading, emptyLabel, onRestore, onPermanentDelete,
}: TrashDrawerProps) {
  const [confirmTarget, setConfirmTarget] = useState<TrashItem | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const handleRestore = async (id: string) => {
    setError('');
    setBusyId(id);
    try { await onRestore(id); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to restore.'); }
    finally { setBusyId(null); }
  };

  const handlePermanentDelete = async () => {
    if (!confirmTarget) return;
    const id = confirmTarget.id;
    setError('');
    setBusyId(id);
    try { await onPermanentDelete(id); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete.'); }
    finally { setBusyId(null); }
  };

  return (
    <SideDrawer isOpen={isOpen} onClose={onClose} title={title} size="md">
      {error && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--danger)]/20 bg-[var(--danger-bg)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} rounded="lg" className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Trash2} title={emptyLabel} description="Items you move to Trash will show up here." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-tertiary)]">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                <p className="truncate text-xs text-[var(--text-tertiary)]">
                  {item.subtitle ? `${item.subtitle} · ` : ''}Deleted {fmt(item.deletedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => handleRestore(item.id)}
                  disabled={busyId === item.id}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                </button>
                <button
                  onClick={() => { setError(''); setConfirmTarget(item); }}
                  disabled={busyId === item.id}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-bg)] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handlePermanentDelete}
        title="Delete permanently?"
        description={`"${confirmTarget?.title ?? ''}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete permanently"
        cancelLabel="Cancel"
        isDestructive
      />
    </SideDrawer>
  );
}
