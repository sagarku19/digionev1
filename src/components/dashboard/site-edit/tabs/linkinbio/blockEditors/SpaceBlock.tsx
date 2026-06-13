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
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition ${(link.metadata?.height || 'md') === h.id ? CHIP_ON : 'border-gray-200 dark:border-[var(--border)] hover:border-gray-300'
              }`}>
            <span className="text-xs font-semibold">{h.label}</span>
            <span className="text-[10px] text-gray-400">{h.px}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
