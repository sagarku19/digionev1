import React from 'react';
import { Trash2, Archive } from 'lucide-react';

type Props = {
  action: 'archive' | 'delete';
  count: number;
  onConfirm: () => void;
  onClose: () => void;
};

export default function BulkActionConfirm({ action, count, onConfirm, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-sm border border-[var(--border)] p-8 text-center">
        <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-6 shadow-inner border ${
          action === 'delete'
            ? 'bg-[var(--danger-bg)] border-[var(--danger)]/20'
            : 'bg-[var(--warning-bg)] border-[var(--warning)]/20'
        }`}>
          {action === 'delete'
            ? <Trash2 className="w-8 h-8 text-[var(--danger)]" />
            : <Archive className="w-8 h-8 text-[var(--warning)]" />
          }
        </div>
        <h3 className="text-xl font-extrabold text-[var(--text-primary)] mb-2">
          {action === 'delete' ? `Delete ${count} product${count !== 1 ? 's' : ''}?` : `Archive ${count} product${count !== 1 ? 's' : ''}?`}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
          {action === 'delete'
            ? 'This action cannot be undone. Products will be permanently removed.'
            : 'Archived products will be unpublished and hidden from your store.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-[var(--radius-sm)] border-2 border-[var(--border)] text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3.5 rounded-[var(--radius-sm)] text-white text-sm font-bold shadow-[var(--shadow-sm)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
              action === 'delete'
                ? 'bg-[var(--danger)] hover:bg-[var(--danger)]/90'
                : 'bg-[var(--warning)] hover:bg-[var(--warning)]/90'
            }`}
          >
            {action === 'delete' ? 'Delete All' : 'Archive All'}
          </button>
        </div>
      </div>
    </div>
  );
}
