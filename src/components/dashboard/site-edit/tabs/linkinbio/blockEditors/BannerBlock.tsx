import React from 'react';
import { FieldLabel, INPUT } from './_shared';
import type { BlockEditorProps } from './types';

export default function BannerBlock({ link, updateMeta }: BlockEditorProps) {
  return (
    <>
      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea rows={2} value={link.metadata?.description || ''}
          onChange={e => updateMeta('description', e.target.value)}
          className={`${INPUT} resize-none`} placeholder="Tell visitors what to do..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Button Text</FieldLabel>
          <input type="text" value={link.metadata?.button_text || ''}
            onChange={e => updateMeta('button_text', e.target.value)}
            className={INPUT} placeholder="Learn More" />
        </div>
        <div>
          <FieldLabel>Button URL</FieldLabel>
          <input type="url" value={link.metadata?.button_url || ''}
            onChange={e => updateMeta('button_url', e.target.value)}
            className={INPUT} placeholder="https://..." />
        </div>
      </div>
      <div>
        <FieldLabel>Background Color (optional)</FieldLabel>
        <div className="flex items-center gap-2">
          <input type="color" value={link.metadata?.bg_color || '#EC4899'}
            onChange={e => updateMeta('bg_color', e.target.value)}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-[var(--border)] cursor-pointer p-0.5" />
          <input type="text" value={link.metadata?.bg_color || ''}
            onChange={e => updateMeta('bg_color', e.target.value)}
            className="flex-1 px-2.5 py-1.5 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] rounded-lg text-xs font-mono text-gray-700 dark:text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Leave blank for theme color" />
        </div>
      </div>
    </>
  );
}
