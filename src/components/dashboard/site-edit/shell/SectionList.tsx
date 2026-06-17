'use client';
import { useState, type ReactNode } from 'react';
import { GripVertical, Eye, EyeOff, Copy, Trash2, ChevronRight, Plus } from 'lucide-react';
import type { SectionItem, SectionRegistry } from './types';
import AddSectionPicker from './AddSectionPicker';

type Props<TItem extends SectionItem> = {
  items: TItem[];
  registry: SectionRegistry<TItem>;
  typeOf: (item: TItem) => string;
  onReorder: (from: number, to: number) => void;
  onToggleVisible: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onAdd: (type: string) => void;
  pinned?: ReactNode;
};

export default function SectionList<TItem extends SectionItem>({
  items, registry, typeOf, onReorder, onToggleVisible, onDuplicate, onDelete, onSelect, onAdd, pinned,
}: Props<TItem>) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      {pinned}

      {items.length > 0 && (
        <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
          Blocks · drag to reorder
        </p>
      )}

      <div className="space-y-2">
        {items.map((item, idx) => {
          const def = registry.defs[typeOf(item)];
          const Icon = def?.icon;
          const hidden = !item.is_visible;
          return (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) onReorder(dragIdx, idx); setDragIdx(null); }}
              onDragEnd={() => setDragIdx(null)}
              className={`group flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2.5 transition hover:bg-[var(--surface-hover)] ${dragIdx === idx ? 'opacity-50' : ''} ${hidden ? 'opacity-60' : ''}`}
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[var(--text-tertiary)]" />
              <button
                onClick={() => onSelect(item.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[var(--text-primary)]">{def?.label ?? typeOf(item)}</span>
                  <span className="block truncate text-xs text-[var(--text-tertiary)]">
                    {hidden ? 'Hidden' : def?.summarize(item)}
                  </span>
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <IconBtn label={hidden ? 'Show' : 'Hide'} onClick={() => onToggleVisible(item.id)}>
                  {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </IconBtn>
                <IconBtn label="Duplicate" onClick={() => onDuplicate(item.id)}><Copy className="h-3.5 w-3.5" /></IconBtn>
                <IconBtn label="Delete" onClick={() => onDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
            </div>
          );
        })}
      </div>

      {adding ? (
        <AddSectionPicker
          registry={registry}
          onPick={(type) => { onAdd(type); setAdding(false); }}
          onClose={() => setAdding(false)}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] py-3 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <Plus className="h-4 w-4" /> Add block
        </button>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      {children}
    </button>
  );
}
