import React from 'react';
import { FieldLabel, INPUT, Chip, AlignPicker } from './_shared';
import type { BlockEditorProps } from './types';

export default function HeaderBlock({ link, update, updateMeta }: BlockEditorProps) {
  return (
    <>
      <div>
        <FieldLabel>Title</FieldLabel>
        <input type="text" value={link.title} onChange={e => update({ title: e.target.value })}
          className={INPUT} placeholder="Your headline" />
      </div>
      <div>
        <FieldLabel>Subtitle</FieldLabel>
        <input type="text" value={link.metadata?.subtitle || ''} onChange={e => updateMeta('subtitle', e.target.value)}
          className={INPUT} placeholder="Optional subtitle text" />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <FieldLabel>Size</FieldLabel>
          <div className="flex gap-1.5 p-1 bg-gray-100/80 dark:bg-[var(--bg-secondary)]/50 rounded-xl items-center">
            {['sm', 'md', 'lg', 'xl', '2xl'].map(s => (
              <Chip key={s} active={(link.metadata?.size || 'xl') === s} onClick={() => updateMeta('size', s)}>
                {s.toUpperCase()}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Align</FieldLabel>
          <AlignPicker value={link.metadata?.alignment || 'center'} onChange={v => updateMeta('alignment', v)} />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={link.metadata?.show_divider ?? false}
          onChange={e => updateMeta('show_divider', e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500" />
        <span className="text-xs text-gray-600 dark:text-[var(--text-secondary)]">Show decorative line</span>
      </label>
    </>
  );
}
