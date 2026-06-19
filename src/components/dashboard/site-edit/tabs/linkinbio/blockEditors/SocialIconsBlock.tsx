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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface-muted)]">
                <Icon className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
              </div>
              <input type="url" value={s.url}
                onChange={e => updateSocial(i, 'url', e.target.value)}
                className="flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--brand)]/20"
                placeholder={platform?.placeholder || 'URL'} />
              <button onClick={() => removeSocial(i)} aria-label="Remove"
                className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-tertiary)] transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
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
              className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
              <Plus className="h-3 w-3" /> {p.label}
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
