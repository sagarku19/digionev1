import React from 'react';
import { FieldLabel, INPUT, Chip, AlignPicker, SEG } from './_shared';
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
          <div className={SEG}>
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
          className="h-4 w-4 rounded border-[var(--border)] accent-[var(--brand)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]" />
        <span className="text-xs text-[var(--text-secondary)]">Show line below</span>
      </label>
    </>
  );
}
