import React from 'react';
import { Globe, Plus, Trash2 } from 'lucide-react';
import { FieldLabel, Chip, AlignPicker, SOCIAL_PLATFORMS } from './_shared';
import type { BlockEditorProps } from './types';

type SocialLink = { platform: string; url: string };

export default function SocialIconsBlock({ link, updateMeta }: BlockEditorProps) {
  const links: SocialLink[] = link.metadata?.links ?? [];

  const updateSocial = (idx: number, field: keyof SocialLink, value: string) => {
    const next = [...links];
    next[idx] = { ...next[idx], [field]: value };
    updateMeta('links', next);
  };
  const removeSocial = (idx: number) => {
    const next = [...links];
    next.splice(idx, 1);
    updateMeta('links', next);
  };
  const addSocial = (platform: string) => updateMeta('links', [...links, { platform, url: '' }]);

  const used = new Set(links.map(s => s.platform));
  const avail = SOCIAL_PLATFORMS.filter(p => !used.has(p.id));

  return (
    <>
      <div className="space-y-2">
        {links.map((s, i) => {
          const platform = SOCIAL_PLATFORMS.find(p => p.id === s.platform);
          const Icon = platform?.icon || Globe;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <input type="url" value={s.url}
                onChange={e => updateSocial(i, 'url', e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] rounded-lg text-xs outline-none focus:ring-2 focus:ring-pink-500 text-[var(--text-primary)] placeholder-gray-400"
                placeholder={platform?.placeholder || 'URL'} />
              <button onClick={() => removeSocial(i)}
                className="p-1.5 text-gray-400 hover:text-red-500 transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {avail.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {avail.map(p => (
            <button key={p.id} onClick={() => addSocial(p.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 dark:bg-[var(--bg-secondary)] hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-[11px] font-medium text-gray-600 dark:text-[var(--text-secondary)] transition">
              <Plus className="w-3 h-3" /> {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div>
          <FieldLabel>Shape</FieldLabel>
          <div className="flex gap-1.5">
            {['circle', 'square', 'pill'].map(s => (
              <Chip key={s} active={(link.metadata?.style || 'circle') === s}
                onClick={() => updateMeta('style', s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Size</FieldLabel>
          <div className="flex gap-1.5">
            {['sm', 'md', 'lg'].map(s => (
              <Chip key={s} active={(link.metadata?.size || 'md') === s}
                onClick={() => updateMeta('size', s)}>
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
    </>
  );
}
