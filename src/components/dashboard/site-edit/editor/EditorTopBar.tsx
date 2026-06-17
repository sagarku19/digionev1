'use client';
import { ArrowLeft, Save, Loader2, CheckCircle2, Undo2, Redo2, Moon, Sun } from 'lucide-react';
import type { ElementType } from 'react';

type Props = {
  title: string;
  typeLabel: string;
  typeIcon: ElementType;
  onBack: () => void;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
};

export default function EditorTopBar(props: Props) {
  const { title, typeLabel, typeIcon: TypeIcon, onBack, saving, saved, onSave,
    canUndo, canRedo, onUndo, onRedo, theme, onToggleTheme } = props;
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-primary)] px-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Back to sites" className="-ml-2 rounded-[var(--radius-md)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="max-w-[200px] truncate text-sm font-semibold text-[var(--text-primary)]">{title}</h1>
          <p className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-tertiary)]">
            <TypeIcon className="h-3 w-3" /> {typeLabel}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onToggleTheme} title="Toggle theme" aria-label="Toggle theme" className="rounded-[var(--radius-md)] border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        {(onUndo || onRedo) && (
          <div className="flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--border)] p-1">
            <button onClick={onUndo} disabled={!canUndo} title="Undo" aria-label="Undo" className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-secondary)] enabled:hover:bg-[var(--surface-hover)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"><Undo2 className="h-4 w-4" /></button>
            <button onClick={onRedo} disabled={!canRedo} title="Redo" aria-label="Redo" className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-secondary)] enabled:hover:bg-[var(--surface-hover)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"><Redo2 className="h-4 w-4" /></button>
          </div>
        )}
        <button onClick={onSave} disabled={saving} className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50 ${saved ? 'bg-[var(--success)] text-[var(--text-on-brand)]' : 'bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]'}`}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>
    </div>
  );
}
