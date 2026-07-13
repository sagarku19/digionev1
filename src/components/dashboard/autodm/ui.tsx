// Small shared UI bits used across the Auto DM workspaces.
'use client';

import React from 'react';

export function Badge({ children, color = 'default' }: {
  children: React.ReactNode;
  color?: 'green' | 'red' | 'yellow' | 'pink' | 'blue' | 'default';
}) {
  const colors = {
    green:   'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20',
    red:     'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]/20',
    yellow:  'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/20',
    pink:    'bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/20',
    blue:    'bg-[var(--info-bg)] text-[var(--info)] border-[var(--info)]/20',
    default: 'bg-[var(--surface-muted)] text-[var(--text-secondary)] border-[var(--border)]',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[color]}`}>
      {children}
    </span>
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
        checked ? 'bg-[var(--brand)]' : 'bg-[var(--border)]'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-200 shadow ring-0 transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// Two-pane list+detail shell shared by Automations / Leads / Inbox workspaces.
export function SplitWorkspace({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 items-start">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] overflow-hidden lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-120px)] flex flex-col">
        {left}
      </div>
      <div className="min-w-0">
        {right}
      </div>
    </div>
  );
}

// The DM bubble used both in the wizard live-preview and in list-row previews.
export function DmPreviewBubble({ text, placeholder = 'Your message will appear here…' }: { text: string; placeholder?: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 shrink-0" />
      <div className="bg-[var(--surface-muted)] rounded-[var(--radius-lg)] rounded-tl-sm px-4 py-3 max-w-xs">
        <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{text.replace('{name}', 'Alex') || placeholder}</p>
      </div>
    </div>
  );
}
