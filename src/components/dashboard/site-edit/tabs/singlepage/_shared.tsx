// Shared primitives for the single-page tab editors — token-based, brand accent.
import React from 'react';
import { editorInput, EDITOR_ACCENTS } from '../../_shared/editorStyles';

export { FieldLabel } from '../../_shared/editorStyles';

export const INPUT = editorInput(EDITOR_ACCENTS.brand);

// Section panel used across every single-page tab. `color` is accepted for
// call-site compatibility but the icon always uses the brand accent.
export function SectionCard({ icon: Icon, title, desc, children }: {
  icon: React.ElementType;
  title: string;
  desc?: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Icon className="h-4 w-4 text-[var(--brand)]" /> {title}
        </h3>
        {desc && <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{desc}</p>}
      </div>
      {children}
    </div>
  );
}
