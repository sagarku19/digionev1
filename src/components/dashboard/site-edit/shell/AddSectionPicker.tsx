'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { SectionRegistry, SectionItem } from './types';

type Props<TItem extends SectionItem> = {
  registry: SectionRegistry<TItem>;
  items: TItem[];
  typeOf: (item: TItem) => string;
  onPick: (type: string) => string;
  onCancelAdded: (id: string) => void;
  renderEditor: (item: TItem) => ReactNode;
  onClose: () => void;
};

export default function AddSectionPicker<TItem extends SectionItem>({
  registry, items, typeOf, onPick, onCancelAdded, renderEditor, onClose,
}: Props<TItem>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingItem = editingId ? items.find((i) => i.id === editingId) ?? null : null;
  const inEdit = editingItem !== null;
  const editingDef = editingItem ? registry.defs[typeOf(editingItem)] : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handlePick = (type: string) => setEditingId(onPick(type));
  const handleCancel = () => {
    if (editingId) onCancelAdded(editingId);
    setEditingId(null);
  };
  const handleSkip = () => onClose();
  const handleContinue = () => setEditingId(null);

  const EditIcon = editingDef?.icon;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={inEdit ? 'Configure block' : 'Add a block'}
        className={`relative z-10 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card-lg)] ${
          inEdit ? 'max-w-md sm:max-w-xl' : 'max-w-md sm:max-w-2xl lg:max-w-4xl'
        }`}
      >
        {/* header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] p-5">
          <div className="flex min-w-0 items-center gap-3">
            {inEdit && EditIcon && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                <EditIcon className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-[var(--text-primary)]">
                {inEdit ? editingDef?.label ?? 'Configure block' : 'Add a block'}
              </h3>
              <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                {inEdit ? 'Fill in the content, then continue or add it later.' : 'Choose a block to add to your page.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* body */}
        {inEdit && editingItem ? (
          <div className="overflow-y-auto p-5">{renderEditor(editingItem)}</div>
        ) : (
          <div className="space-y-6 overflow-y-auto p-5">
            {registry.categories.map((cat) => {
              const defs = Object.values(registry.defs).filter((d) => d.categoryId === cat.id);
              if (defs.length === 0) return null;
              return (
                <div key={cat.id}>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{cat.label}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {defs.map((d) => (
                      <button
                        key={d.type}
                        onClick={() => handlePick(d.type)}
                        className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-left transition hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                      >
                        {/* content overview / skeleton */}
                        <div className="flex h-24 items-center justify-center border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5">
                          <BlockSkeleton type={d.type} />
                        </div>
                        {/* meta */}
                        <div className="flex items-start gap-2 p-3">
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface-muted)] text-[var(--text-secondary)] transition group-hover:text-[var(--brand)]">
                            <d.icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--text-primary)]">{d.label}</p>
                            {d.description && <p className="truncate text-xs text-[var(--text-tertiary)]">{d.description}</p>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* footer (configure phase) */}
        {inEdit && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border)] p-4">
            <button
              onClick={handleCancel}
              className="rounded-[var(--radius-sm)] px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSkip}
                className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                Add later
              </button>
              <button
                onClick={handleContinue}
                className="rounded-[var(--radius-sm)] bg-[var(--brand)] px-3.5 py-2 text-sm font-semibold text-[var(--text-on-brand)] transition hover:bg-[var(--brand-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Flat token-only skeletons — a quick visual overview of what each block renders.
// No icons, no images (per the picker-tile convention).
function BlockSkeleton({ type }: { type: string }) {
  const W = 'w-full max-w-[150px]';
  switch (type) {
    case 'url':
      return (
        <div className={`flex ${W} items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 shadow-[var(--shadow-xs)]`}>
          <div className="h-4 w-4 shrink-0 rounded-full bg-[var(--brand)]/30" />
          <div className="h-1.5 flex-1 rounded-full bg-[var(--border)]" />
          <div className="h-2.5 w-2.5 shrink-0 rotate-45 border-r border-t border-[var(--text-tertiary)]" />
        </div>
      );
    case 'header':
      return (
        <div className={`flex ${W} flex-col items-center gap-1.5`}>
          <div className="h-7 w-7 rounded-full bg-[var(--border)]" />
          <div className="h-2 w-20 rounded-full bg-[var(--text-tertiary)]/50" />
          <div className="h-1.5 w-28 rounded-full bg-[var(--border-subtle)]" />
        </div>
      );
    case 'text':
      return (
        <div className={`flex ${W} flex-col gap-1.5`}>
          <div className="h-1.5 w-full rounded-full bg-[var(--border)]" />
          <div className="h-1.5 w-full rounded-full bg-[var(--border)]" />
          <div className="h-1.5 w-5/6 rounded-full bg-[var(--border)]" />
          <div className="h-1.5 w-2/3 rounded-full bg-[var(--border-subtle)]" />
        </div>
      );
    case 'heading':
      return (
        <div className={`flex ${W} flex-col gap-2`}>
          <div className="h-2.5 w-20 rounded-full bg-[var(--text-tertiary)]/50" />
          <div className="h-px w-full bg-[var(--border)]" />
        </div>
      );
    case 'divider':
      return (
        <div className={`flex ${W} items-center justify-center`}>
          <div className="h-px w-full bg-[var(--border)]" />
        </div>
      );
    case 'space':
      return (
        <div className={`flex ${W} h-12 items-center justify-center rounded-md border border-dashed border-[var(--border)]`}>
          <div className="h-5 w-px bg-[var(--border)]" />
        </div>
      );
    case 'product':
      return (
        <div className={`flex ${W} items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-xs)]`}>
          <div className="h-10 w-10 shrink-0 rounded-md bg-[var(--border)]" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-1.5 w-full rounded-full bg-[var(--border)]" />
            <div className="h-1.5 w-1/2 rounded-full bg-[var(--text-tertiary)]/50" />
            <div className="mt-0.5 h-4 w-12 rounded bg-[var(--brand)]" />
          </div>
        </div>
      );
    case 'lead_form':
      return (
        <div className={`flex ${W} flex-col gap-1.5`}>
          <div className="h-1.5 w-12 rounded-full bg-[var(--text-tertiary)]/50" />
          <div className="h-3.5 w-full rounded border border-[var(--border)] bg-[var(--surface)]" />
          <div className="h-3.5 w-full rounded border border-[var(--border)] bg-[var(--surface)]" />
          <div className="h-3.5 w-full rounded bg-[var(--brand)]" />
        </div>
      );
    case 'social_icons':
      return (
        <div className={`flex ${W} items-center justify-center gap-2.5`}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-6 w-6 rounded-full border border-[var(--border)] bg-[var(--surface)]" />
          ))}
        </div>
      );
    case 'banner':
      return (
        <div className={`flex ${W} flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--brand)]/20 bg-[var(--brand)]/10 p-2.5`}>
          <div className="h-1.5 w-3/4 rounded-full bg-[var(--brand)]/60" />
          <div className="h-1.5 w-1/2 rounded-full bg-[var(--brand)]/30" />
          <div className="mt-0.5 h-4 w-14 rounded bg-[var(--brand)]" />
        </div>
      );
    case 'image':
      return (
        <div className={`relative ${W} h-14 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]`}>
          <div className="absolute right-3 top-2 h-3 w-3 rounded-full bg-[var(--border)]" />
          <div className="absolute -bottom-3 left-0 h-8 w-1/2 rotate-12 bg-[var(--border)]" />
          <div className="absolute -bottom-4 right-2 h-9 w-1/2 -rotate-6 bg-[var(--border-subtle)]" />
        </div>
      );
    case 'html_embed':
      return (
        <div className={`flex ${W} flex-col gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2.5`}>
          <div className="h-1.5 w-1/3 rounded-full bg-[var(--brand)]/50" />
          <div className="h-1.5 w-3/4 rounded-full bg-[var(--border)]" />
          <div className="ml-2 h-1.5 w-1/2 rounded-full bg-[var(--border)]" />
          <div className="h-1.5 w-1/4 rounded-full bg-[var(--brand)]/50" />
        </div>
      );
    default:
      return (
        <div className={`flex ${W} flex-col gap-1.5`}>
          <div className="h-1.5 w-full rounded-full bg-[var(--border)]" />
          <div className="h-1.5 w-2/3 rounded-full bg-[var(--border-subtle)]" />
        </div>
      );
  }
}
