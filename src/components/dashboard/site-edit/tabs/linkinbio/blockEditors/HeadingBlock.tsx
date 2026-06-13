import React from 'react';
import { FieldLabel, INPUT, Chip, AlignPicker } from './_shared';
import type { BlockEditorProps } from './types';

export default function HeadingBlock({ link, updateMeta }: BlockEditorProps) {
  return (
    <>
      <div>
        <FieldLabel>Subtitle (optional)</FieldLabel>
        <input type="text" value={link.metadata?.subtitle || ''} onChange={e => updateMeta('subtitle', e.target.value)}
          className={INPUT} placeholder="Short description" />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <FieldLabel>Size</FieldLabel>
          <div className="flex gap-1.5 p-1 bg-gray-100/80 dark:bg-[var(--bg-secondary)]/50 rounded-xl items-center">
            {['sm', 'md', 'lg'].map(s => (
              <Chip key={s} active={(link.metadata?.size || 'md') === s} onClick={() => updateMeta('size', s)}>
                {s.toUpperCase()}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Align</FieldLabel>
          <AlignPicker value={link.metadata?.alignment || 'left'} onChange={v => updateMeta('alignment', v)} />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={link.metadata?.show_divider ?? false}
          onChange={e => updateMeta('show_divider', e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500" />
        <span className="text-xs text-gray-600 dark:text-[var(--text-secondary)]">Show line below</span>
      </label>
    </>
  );
}
