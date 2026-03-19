"use client";

import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

export function SideDrawer({ isOpen, onClose, title, children, footer, size = 'md' }: SideDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const widthMap = {
    md: 'w-full max-w-md',
    lg: 'w-full max-w-2xl',
    xl: 'w-full max-w-4xl'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed right-0 top-0 bottom-0 ${widthMap[size]} bg-white dark:bg-zinc-900 shadow-2xl border-l border-[var(--color-border)] z-50 flex flex-col`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h2>
              <button 
                onClick={onClose}
                className="p-2 -mr-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>

            {footer && (
              <div className="p-6 border-t border-[var(--color-border)] bg-gray-50/50 dark:bg-zinc-800/30">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
