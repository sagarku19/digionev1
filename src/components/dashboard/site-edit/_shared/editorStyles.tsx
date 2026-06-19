// Shared input styling + label for the site-edit tab editors.
// Base is token-compliant; each editor keeps its own accent focus ring
// (link-in-bio = pink, single-page tabs = purple/emerald/indigo/blue/…).
// To add an editor: pick an accent from EDITOR_ACCENTS and call editorInput(accent).
import React from 'react';

export type EditorAccent = { focusBorder: string; focusRing: string };

export const EDITOR_ACCENTS = {
  brand: { focusBorder: 'focus:border-[var(--brand)]', focusRing: 'focus:ring-[var(--brand)]/10' },
  pink: { focusBorder: 'focus:border-pink-500', focusRing: 'focus:ring-pink-500/10' },
  purple: { focusBorder: 'focus:border-purple-500', focusRing: 'focus:ring-purple-500/10' },
  emerald: { focusBorder: 'focus:border-emerald-500', focusRing: 'focus:ring-emerald-500/10' },
  indigo: { focusBorder: 'focus:border-indigo-500', focusRing: 'focus:ring-indigo-500/10' },
  blue: { focusBorder: 'focus:border-blue-500', focusRing: 'focus:ring-blue-500/10' },
  orange: { focusBorder: 'focus:border-orange-500', focusRing: 'focus:ring-orange-500/10' },
  amber: { focusBorder: 'focus:border-amber-500', focusRing: 'focus:ring-amber-500/10' },
  gray: { focusBorder: 'focus:border-gray-500', focusRing: 'focus:ring-gray-400/20' },
} as const satisfies Record<string, EditorAccent>;

// Rounded-xl / 13px input shared by the single-page and link-in-bio tab editors.
export function editorInput(accent: EditorAccent = EDITOR_ACCENTS.gray): string {
  return `w-full px-4 py-2.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl text-[13px] ${accent.focusBorder} focus:ring-4 ${accent.focusRing} outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all duration-300`;
}

// Rounded-lg / 14px input used by the main-store tab editors (Header, Footer, Settings).
export const panelInput =
  'w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition shadow-sm';

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
      {children}
    </label>
  );
}
