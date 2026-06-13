import React from 'react';
import { FieldLabel, INPUT, Chip, AlignPicker } from './_shared';
import type { BlockEditorProps } from './types';

export default function TextBlock({ link, updateMeta }: BlockEditorProps) {
  return (
    <>
      <div>
        <FieldLabel>Content</FieldLabel>
        <textarea rows={4} value={link.metadata?.content || ''}
          onChange={e => updateMeta('content', e.target.value)}
          className={`${INPUT} resize-none`} placeholder="Write your text here..." />
      </div>
      <div className="flex items-center gap-4">
        <div>
          <FieldLabel>Size</FieldLabel>
          <div className="flex gap-1.5 p-1 bg-gray-100/80 dark:bg-[var(--bg-secondary)]/50 rounded-xl items-center">
            {['sm', 'base', 'lg'].map(s => (
              <Chip key={s} active={(link.metadata?.size || 'base') === s} onClick={() => updateMeta('size', s)}>
                {s === 'sm' ? 'Small' : s === 'base' ? 'Normal' : 'Large'}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Align</FieldLabel>
          <AlignPicker value={link.metadata?.alignment || 'left'} onChange={v => updateMeta('alignment', v)} />
        </div>
      </div>
    </>
  );
}
