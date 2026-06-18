'use client';
import { GripVertical, Copy, Trash2, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ElementType, ReactNode, HTMLAttributes } from 'react';

type Props = {
  label: string;
  summary: string;
  icon?: ElementType;
  visible: boolean;
  expanded: boolean;
  dragging?: boolean;
  over?: boolean;
  onExpandToggle: () => void;
  onVisibleToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  dragProps: HTMLAttributes<HTMLDivElement> & { draggable: boolean };
  editor: ReactNode;
};

export default function BlockCard({
  label, summary, icon: Icon, visible, expanded, dragging, over,
  onExpandToggle, onVisibleToggle, onDuplicate, onDelete, dragProps, editor,
}: Props) {
  return (
    <div
      {...dragProps}
      className={`group rounded-[var(--radius-xl)] border bg-[var(--surface)] transition-colors ${
        over
          ? 'border-[var(--brand)] shadow-[inset_0_2px_0_0_var(--brand)]'
          : expanded
            ? 'border-[var(--border-strong)] shadow-[var(--shadow-card-lg)]'
            : 'border-[var(--border)] shadow-[var(--shadow-card)] hover:bg-[var(--surface-hover)]'
      } ${dragging ? 'opacity-50' : ''} ${!visible ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-2 py-2.5 pl-1.5 pr-3">
        <span
          aria-hidden
          className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center text-[var(--text-tertiary)] opacity-40 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <button
          onClick={onExpandToggle}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-sm)] text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
            {Icon ? <Icon className="h-4 w-4" /> : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{label}</span>
            <span className="block truncate text-xs text-[var(--text-tertiary)]">{summary}</span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <IconBtn label="Duplicate" onClick={onDuplicate}><Copy className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn label="Delete" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
          </div>
          <Toggle checked={visible} onClick={onVisibleToggle} label={visible ? 'Hide block' : 'Show block'} />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--border)] p-4">{editor}</div>
          </motion.div>
        )}
      </AnimatePresence>
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

function Toggle({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
        checked ? 'bg-[var(--success)]' : 'bg-[var(--surface-muted)] border border-[var(--border)]'
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}
