'use client';
import type { ElementType } from 'react';

export default function ComingSoon({ icon: Icon, title }: { icon?: ElementType; title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--surface-muted)] text-[var(--text-tertiary)]">
        {Icon ? <Icon className="h-6 w-6" /> : null}
      </span>
      <div>
        <p className="text-base font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Coming soon.</p>
      </div>
    </div>
  );
}
