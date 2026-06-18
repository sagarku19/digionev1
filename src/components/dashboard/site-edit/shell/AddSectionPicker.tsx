'use client';
import { X } from 'lucide-react';
import type { SectionRegistry, SectionItem } from './types';

type Props<TItem extends SectionItem> = {
  registry: SectionRegistry<TItem>;
  onPick: (type: string) => void;
  onClose: () => void;
};

export default function AddSectionPicker<TItem extends SectionItem>({ registry, onPick, onClose }: Props<TItem>) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Add a block</h3>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-[var(--radius-sm)] p-1 text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-4">
        {registry.categories.map((cat) => {
          const defs = Object.values(registry.defs).filter((d) => d.categoryId === cat.id);
          if (defs.length === 0) return null;
          return (
            <div key={cat.id}>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                {cat.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {defs.map((d) => (
                  <button
                    key={d.type}
                    onClick={() => onPick(d.type)}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <d.icon className="h-4 w-4 text-[var(--text-secondary)]" />
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
