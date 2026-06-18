'use client';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { SectionRegistry, SectionItem } from './types';

type Props<TItem extends SectionItem> = {
  registry: SectionRegistry<TItem>;
  onPick: (type: string) => void;
  onClose: () => void;
};

export default function AddSectionPicker<TItem extends SectionItem>({ registry, onPick, onClose }: Props<TItem>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        aria-label="Add a block"
        className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card-lg)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] p-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Add a block</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-[var(--radius-sm)] p-1 text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto p-4">
          {registry.categories.map((cat) => {
            const defs = Object.values(registry.defs).filter((d) => d.categoryId === cat.id);
            if (defs.length === 0) return null;
            return (
              <div key={cat.id}>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">{cat.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {defs.map((d) => (
                    <button
                      key={d.type}
                      onClick={() => onPick(d.type)}
                      className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <d.icon className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                      <span className="truncate">{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
