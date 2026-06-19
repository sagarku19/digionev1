import React from 'react';
import { ImagePlus } from 'lucide-react';
import { FieldLabel, INPUT, Chip, ICON_TYPES, ANIMATIONS, SEG, ACCENT_BTN } from './_shared';
import type { BlockEditorProps } from './types';

export default function UrlBlock({ link, update, updateMeta, openImagePicker }: BlockEditorProps) {
  return (
    <>
      <div>
        <FieldLabel>URL</FieldLabel>
        <input type="url" value={link.url} onChange={e => update({ url: e.target.value })}
          className={INPUT} placeholder="https://..." />
      </div>
      <div>
        <FieldLabel>Description (optional)</FieldLabel>
        <input type="text" value={link.description} onChange={e => update({ description: e.target.value })}
          className={INPUT} placeholder="Short subtitle" />
      </div>
      <div>
        <FieldLabel>Thumbnail (optional)</FieldLabel>
        <div className="flex gap-2">
          <input type="url" value={link.thumbnail_url} onChange={e => update({ thumbnail_url: e.target.value })}
            className={`${INPUT} flex-1`} placeholder="https://... icon image" />
          <button type="button" onClick={() => openImagePicker('thumbnail_url')} aria-label="Pick image" className={ACCENT_BTN}>
            <ImagePlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div>
        <FieldLabel>Icon</FieldLabel>
        <div className={SEG}>
          {ICON_TYPES.map(it => (
            <Chip key={it.id} active={link.icon_type === it.id} onClick={() => update({ icon_type: it.id })}>
              {it.label}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Animation</FieldLabel>
        <div className={SEG}>
          {ANIMATIONS.map(a => (
            <Chip key={a.id} active={(link.metadata?.animation || 'none') === a.id}
              onClick={() => updateMeta('animation', a.id)}>
              {a.label}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Width in Grid</FieldLabel>
        <div className={SEG}>
          <Chip active={(link.metadata?.col_span || 'full') === 'full'} onClick={() => updateMeta('col_span', 'full')}>
            Full Width
          </Chip>
          <Chip active={link.metadata?.col_span === 'half'} onClick={() => updateMeta('col_span', 'half')}>
            Half Width
          </Chip>
        </div>
      </div>
    </>
  );
}
