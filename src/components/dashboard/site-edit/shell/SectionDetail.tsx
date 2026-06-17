'use client';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode, ElementType } from 'react';

type Props = {
  title: string;
  icon?: ElementType;
  backLabel?: string;
  onBack: () => void;
  children: ReactNode;
};

export default function SectionDetail({ title, icon: Icon, backLabel = 'Back', onBack, children }: Props) {
  return (
    <div>
      <div className="mb-4 border-b border-[var(--border)] pb-4">
        <button
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1 rounded-[var(--radius-sm)] text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> {backLabel}
        </button>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
            {Icon ? <Icon className="h-4 w-4" /> : null}
          </span>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
