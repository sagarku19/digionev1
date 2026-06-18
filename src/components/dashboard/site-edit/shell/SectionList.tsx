'use client';
import { useState, type ReactNode } from 'react';
import { Plus, Layers } from 'lucide-react';
import type { SectionItem, SectionRegistry } from './types';
import AddSectionPicker from './AddSectionPicker';
import BlockCard from '../editor/BlockCard';

type Props<TItem extends SectionItem> = {
  items: TItem[];
  registry: SectionRegistry<TItem>;
  typeOf: (item: TItem) => string;
  onReorder: (from: number, to: number) => void;
  onToggleVisible: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (type: string) => void;
  renderEditor: (item: TItem) => ReactNode;
  pinned?: ReactNode;
};

export default function SectionList<TItem extends SectionItem>({
  items, registry, typeOf, onReorder, onToggleVisible, onDuplicate, onDelete, onAdd, renderEditor, pinned,
}: Props<TItem>) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-6 py-10 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--text-tertiary)]">
            <Layers className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-[var(--text-primary)]">No blocks yet</p>
          <p className="text-xs text-[var(--text-tertiary)]">Add your first block to start building your page.</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((item, idx) => {
          const def = registry.defs[typeOf(item)];
          const expanded = expandedId === item.id;
          return (
            <BlockCard
              key={item.id}
              label={def?.label ?? typeOf(item)}
              summary={def?.summarize(item) ?? ''}
              icon={def?.icon}
              visible={item.is_visible}
              expanded={expanded}
              dragging={dragIdx === idx}
              over={overIdx === idx && dragIdx !== null && dragIdx !== idx}
              onExpandToggle={() => setExpandedId((id) => (id === item.id ? null : item.id))}
              onVisibleToggle={() => onToggleVisible(item.id)}
              onDuplicate={() => onDuplicate(item.id)}
              onDelete={() => onDelete(item.id)}
              dragProps={{
                draggable: true,
                onDragStart: () => setDragIdx(idx),
                onDragOver: (e) => { e.preventDefault(); setOverIdx(idx); },
                onDragLeave: () => setOverIdx((o) => (o === idx ? null : o)),
                onDrop: (e) => { e.preventDefault(); if (dragIdx !== null) onReorder(dragIdx, idx); setDragIdx(null); setOverIdx(null); },
                onDragEnd: () => { setDragIdx(null); setOverIdx(null); },
              }}
              editor={expanded ? renderEditor(item) : null}
            />
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
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-xl)] bg-[var(--brand)] py-3 text-sm font-semibold text-[var(--text-on-brand)] transition-colors hover:bg-[var(--brand-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <Plus className="h-4 w-4" /> Add block
        </button>
      )}
    </div>
  );
}
