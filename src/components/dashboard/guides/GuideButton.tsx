'use client';

import { BookOpen } from 'lucide-react';
import { useGuide } from './GuideProvider';
import type { GuideKey } from './content';

export function GuideButton({ guideKey, className = '' }: { guideKey: GuideKey; className?: string }) {
  const { openGuide } = useGuide();
  return (
    <button
      type="button"
      onClick={() => openGuide(guideKey)}
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${className}`}
    >
      <BookOpen className="w-4 h-4" /> Guide
    </button>
  );
}
