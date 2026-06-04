"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  requiredText?: string;
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  isDestructive = false, requiredText,
}: ConfirmDialogProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = !requiredText || text === requiredText;

  const handleConfirm = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onClose();
      setText('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={!loading ? onClose : undefined}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-md border border-[var(--border)] overflow-hidden"
          >
            <div className="px-6 py-5 flex items-start gap-4">
              <div
                className={`p-2.5 rounded-full shrink-0 mt-0.5 ${
                  isDestructive
                    ? 'bg-[var(--danger-bg)] text-[var(--danger)]'
                    : 'bg-[var(--info-bg)] text-[var(--info)]'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                  {description}
                </p>

                {requiredText && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Type <strong>{requiredText}</strong> to confirm:
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] text-sm"
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder={requiredText}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-[var(--surface-muted)] border-t border-[var(--border-subtle)] flex justify-end gap-3 flex-col-reverse sm:flex-row">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-3 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-[var(--radius-sm)] disabled:opacity-50 transition-colors focus:outline-none focus:shadow-[var(--focus-ring)]"
              >
                {cancelLabel}
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || !isValid}
                className={`px-3 py-2 text-sm font-medium text-[var(--text-on-brand)] rounded-[var(--radius-sm)] disabled:opacity-50 transition-colors focus:outline-none focus:shadow-[var(--focus-ring)] ${
                  isDestructive
                    ? 'bg-[var(--danger)] hover:opacity-90'
                    : 'bg-[var(--brand)] hover:bg-[var(--brand-hover)]'
                }`}
              >
                {loading ? 'Processing...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
