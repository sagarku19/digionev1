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
  isDestructive = false, requiredText
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
            className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-md border border-[var(--color-border)] overflow-hidden"
          >
            <div className="px-6 py-5 flex items-start gap-4">
              <div className={`p-2.5 rounded-full shrink-0 mt-0.5 ${isDestructive ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {description}
                </p>

                {requiredText && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                      Type <strong>{requiredText}</strong> to confirm:
                    </label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-transparent focus:ring-1 focus:ring-[var(--brand)] focus:border-[var(--brand)] outline-none text-sm"
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder={requiredText}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50/50 dark:bg-zinc-800/30 border-t border-[var(--color-border)] flex justify-end gap-3 flex-col-reverse sm:flex-row">
              <button 
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] bg-transparent border border-[var(--color-border)] rounded-md hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                {cancelLabel}
              </button>
              <button 
                onClick={handleConfirm}
                disabled={loading || !isValid}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm disabled:opacity-50 transition-colors ${
                  isDestructive 
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                    : 'bg-[var(--brand)] hover:bg-[var(--brand-hover)] focus:ring-[var(--brand)]'
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
