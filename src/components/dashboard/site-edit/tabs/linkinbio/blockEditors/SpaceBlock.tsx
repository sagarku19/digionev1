import React from 'react';
import { FieldLabel, CHIP_ON } from './_shared';
import type { BlockEditorProps } from './types';

export default function SpaceBlock({ link, updateMeta }: BlockEditorProps) {
  return (
    <div>
      <FieldLabel>Height</FieldLabel>
      <div className="flex gap-2">
        {[
          { id: 'sm', label: 'Small', px: '16px' },
          { id: 'md', label: 'Medium', px: '32px' },
          { id: 'lg', label: 'Large', px: '64px' },
          { id: 'xl', label: 'X-Large', px: '96px' },
        ].map(h => (
          <button key={h.id} onClick={() => updateMeta('height', h.id)}
            className={`flex flex-1 flex-col items-center gap-1 rounded-[var(--radius-md)] border py-2.5 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${(link.metadata?.height || 'md') === h.id ? `${CHIP_ON} border-transparent` : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
              }`}>
            <span className="text-xs font-semibold">{h.label}</span>
            <span className="text-[10px] text-[var(--text-tertiary)]">{h.px}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
