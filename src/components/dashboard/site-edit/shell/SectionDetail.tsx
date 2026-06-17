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
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)]"
      >
        <ChevronLeft className="h-4 w-4" /> {backLabel}
      </button>
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-[var(--text-secondary)]" /> : null}
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}
