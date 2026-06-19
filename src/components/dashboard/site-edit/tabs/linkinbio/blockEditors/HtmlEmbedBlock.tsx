import React from 'react';
import { FieldLabel, INPUT } from './_shared';
import type { BlockEditorProps } from './types';

export default function HtmlEmbedBlock({ link, updateMeta }: BlockEditorProps) {
  return (
    <div>
      <FieldLabel>HTML / Iframe Code</FieldLabel>
      <textarea rows={6} value={link.metadata?.html || ''} onChange={e => updateMeta('html', e.target.value)}
        className={`${INPUT} resize-none font-mono text-xs`}
        placeholder={'<iframe src="https://..." width="100%" height="300"></iframe>'} />
      <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">Paste any embed code — iframes, widgets, maps, forms, etc.</p>
    </div>
  );
}
