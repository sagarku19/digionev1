import React from 'react';
import { Trash2 } from 'lucide-react';

type Props = {
  error: string;
  onConfirm: () => void;
  onClose: () => void;
};

export default function DeleteUpsellConfirm({ error, onConfirm, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-sm border border-[var(--border)] p-8 text-center transform transition-all scale-in-95">
        <div className="w-16 h-16 bg-[var(--danger-bg)] rounded-[20px] flex items-center justify-center mx-auto mb-6 shadow-inner border border-[var(--danger)]/20">
          <Trash2 className="w-8 h-8 text-[var(--danger)]" />
        </div>
        <h3 className="text-xl font-extrabold text-[var(--text-primary)] mb-2">Delete Funnel?</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">This will permanently remove the upsell page. Your base products will not be affected.</p>
        {error && (
          <div className="flex items-center justify-center gap-2 px-3 py-2.5 mb-4 rounded-[var(--radius-sm)] bg-[var(--danger-bg)] text-[var(--danger)] text-sm font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] shrink-0" /> {error}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-[var(--radius-sm)] border-2 border-[var(--border)] text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-3.5 rounded-[var(--radius-sm)] bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white text-sm font-bold shadow-[var(--shadow-sm)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}
