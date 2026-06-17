'use client';
import type { ReactNode } from 'react';

export type EditorView = 'content' | 'design' | 'settings';

const VIEWS: { id: EditorView; label: string }[] = [
  { id: 'content', label: 'Content' },
  { id: 'design', label: 'Design' },
  { id: 'settings', label: 'Settings' },
];

type Props = {
  view: EditorView;
  onViewChange: (v: EditorView) => void;
  content: ReactNode;
  design: ReactNode;
  settings: ReactNode;
};

export default function EditorPanel({ view, onViewChange, content, design, settings }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-[var(--border)] p-3">
        <div className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-1">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              className={`flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                view === v.id
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {view === 'content' && content}
        {view === 'design' && design}
        {view === 'settings' && settings}
      </div>
    </div>
  );
}
