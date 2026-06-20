'use client';
// Shared "unsaved changes" confirmation modal for the site editors.
// Driven by useUnsavedChanges.

type Props = {
  open: boolean;
  saving: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
};

export default function UnsavedChangesDialog({ open, saving, onCancel, onDiscard, onSave }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button aria-label="Stay on page" tabIndex={-1} onClick={onCancel} className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm" />
      <div role="dialog" aria-modal="true" aria-label="Unsaved changes" className="relative z-10 w-full max-w-sm rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card-lg)]">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Unsaved changes</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Save them before leaving, or discard them.</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Cancel</button>
          <button onClick={onDiscard} className="rounded-[var(--radius-sm)] px-3.5 py-2 text-sm font-medium text-[var(--danger)] transition hover:bg-[var(--danger-bg)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Discard</button>
          <button onClick={onSave} disabled={saving} className="rounded-[var(--radius-sm)] bg-[var(--brand)] px-3.5 py-2 text-sm font-semibold text-[var(--text-on-brand)] transition hover:bg-[var(--brand-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50">{saving ? 'Saving…' : 'Save & leave'}</button>
        </div>
      </div>
    </div>
  );
}
