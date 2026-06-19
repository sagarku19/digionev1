import React from 'react';
import { ImagePlus } from 'lucide-react';
import { FieldLabel, INPUT, Chip, ACCENT_BTN } from './_shared';
import type { BlockEditorProps } from './types';

export default function ImageBlock({ link, update, updateMeta, openImagePicker }: BlockEditorProps) {
  return (
    <>
      <div>
        <FieldLabel>Image</FieldLabel>
        <div className="flex gap-2">
          <input type="url" value={link.thumbnail_url} onChange={e => update({ thumbnail_url: e.target.value })}
            className={`${INPUT} flex-1`} placeholder="https://..." />
          <button type="button" onClick={() => openImagePicker('thumbnail_url')} className={ACCENT_BTN}>
            <ImagePlus className="h-3.5 w-3.5" /> Add Image
          </button>
        </div>
        {link.thumbnail_url && (
          <div className="mt-2 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
            <img src={link.thumbnail_url} alt="" className="w-full h-24 object-cover" />
          </div>
        )}
      </div>
      <div>
        <FieldLabel>Link URL (optional)</FieldLabel>
        <input type="url" value={link.metadata?.link_url || ''} onChange={e => updateMeta('link_url', e.target.value)}
          className={INPUT} placeholder="https://..." />
      </div>
      <div>
        <FieldLabel>Caption (optional)</FieldLabel>
        <input type="text" value={link.metadata?.caption || ''} onChange={e => updateMeta('caption', e.target.value)}
          className={INPUT} placeholder="Image description" />
      </div>
      <div>
        <FieldLabel>Alt Text</FieldLabel>
        <input type="text" value={link.metadata?.alt_text || ''} onChange={e => updateMeta('alt_text', e.target.value)}
          className={INPUT} placeholder="Describe this image" />
      </div>
      <div className="flex items-center gap-4">
        <div>
          <FieldLabel>Corners</FieldLabel>
          <div className="flex gap-1.5">
            {[{ id: 'none', l: 'Sharp' }, { id: 'lg', l: 'Rounded' }, { id: 'full', l: 'Pill' }].map(o => (
              <Chip key={o.id} active={(link.metadata?.border_radius || 'lg') === o.id}
                onClick={() => updateMeta('border_radius', o.id)}>{o.l}</Chip>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Aspect</FieldLabel>
          <div className="flex gap-1.5">
            {[{ id: 'auto', l: 'Auto' }, { id: '16/9', l: '16:9' }, { id: '1/1', l: '1:1' }, { id: '4/5', l: '4:5' }].map(o => (
              <Chip key={o.id} active={(link.metadata?.aspect_ratio || 'auto') === o.id}
                onClick={() => updateMeta('aspect_ratio', o.id)}>{o.l}</Chip>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
