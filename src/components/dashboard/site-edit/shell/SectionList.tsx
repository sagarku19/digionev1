'use client';
import { useState, type ReactNode } from 'react';
import { GripVertical, Eye, EyeOff, Copy, Trash2, ChevronRight, Plus, Layers } from 'lucide-react';
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
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      {pinned}

      {items.length > 0 && (
        <div className="flex items-center justify-between px-1 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Blocks</p>
          <span className="text-[11px] font-medium text-[var(--text-tertiary)]">{items.length} · drag to reorder</span>
        </div>
      )}

      {items.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-6 py-10 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--text-tertiary)]">
            <Layers className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-[var(--text-primary)]">No blocks yet</p>
          <p className="text-xs text-[var(--text-tertiary)]">Add your first block to start building your page.</p>
        </div>
      )}

      <div className="space-y-1.5">
        {items.map((item, idx) => {
          const def = registry.defs[typeOf(item)];
          const Icon = def?.icon;
          const hidden = !item.is_visible;
          const isDragging = dragIdx === idx;
          const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;
          return (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => { e.preventDefault(); setOverIdx(idx); }}
              onDragLeave={() => setOverIdx((o) => (o === idx ? null : o))}
              onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) onReorder(dragIdx, idx); setDragIdx(null); setOverIdx(null); }}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              className={`group flex items-center gap-1.5 rounded-[var(--radius-lg)] border bg-[var(--surface)] py-2 pl-1 pr-2 transition-colors ${
                isOver
                  ? 'border-[var(--brand)] shadow-[inset_0_2px_0_0_var(--brand)]'
                  : 'border-[var(--border)] hover:bg-[var(--surface-hover)]'
              } ${isDragging ? 'opacity-50' : ''} ${hidden ? 'opacity-60' : ''}`}
            >
              <span
                aria-hidden
                className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center text-[var(--text-tertiary)] opacity-40 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4" />
              </span>
              <button
                onClick={() => onSelect(item.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-sm)] text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[var(--text-primary)]">{def?.label ?? typeOf(item)}</span>
                  <span className="block truncate text-xs text-[var(--text-tertiary)]">{hidden ? 'Hidden' : def?.summarize(item)}</span>
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-0.5">
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <IconBtn label={hidden ? 'Show' : 'Hide'} onClick={() => onToggleVisible(item.id)}>
                    {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </IconBtn>
                  <IconBtn label="Duplicate" onClick={() => onDuplicate(item.id)}><Copy className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label="Delete" onClick={() => onDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] opacity-60" />
              </div>
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
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
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
