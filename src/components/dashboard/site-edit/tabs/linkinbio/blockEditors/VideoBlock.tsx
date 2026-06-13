import React from 'react';
import { FieldLabel, INPUT, Chip } from './_shared';
import type { BlockEditorProps } from './types';

export default function VideoBlock({ link, updateMeta }: BlockEditorProps) {
  return (
    <>
      <div>
        <FieldLabel>Embed URL</FieldLabel>
        <input type="url" value={link.metadata?.embed_url || ''} onChange={e => updateMeta('embed_url', e.target.value)}
          className={INPUT} placeholder="https://youtube.com/embed/..." />
        <p className="text-[10px] text-gray-400 mt-1">Use the embed URL, not the regular video URL</p>
      </div>
      <div>
        <FieldLabel>Aspect Ratio</FieldLabel>
        <div className="flex gap-2">
          {['16/9', '4/3', '1/1'].map(r => (
            <Chip key={r} active={(link.metadata?.aspect_ratio || '16/9') === r}
              onClick={() => updateMeta('aspect_ratio', r)}>{r}</Chip>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Caption (optional)</FieldLabel>
        <input type="text" value={link.metadata?.caption || ''} onChange={e => updateMeta('caption', e.target.value)}
          className={INPUT} placeholder="Video description" />
      </div>
    </>
  );
}
