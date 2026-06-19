// Shared primitives + option lists for the Link-in-Bio block editors.
import React from 'react';
import {
  AlignLeft, AlignCenter, AlignRight, ExternalLink, Play, Instagram,
  Twitter, Music2, Music, Github, Linkedin, Youtube, Globe,
} from 'lucide-react';
import { editorInput, EDITOR_ACCENTS } from '../../../_shared/editorStyles';

export { FieldLabel } from '../../../_shared/editorStyles';

export const INPUT = editorInput(EDITOR_ACCENTS.brand);
// Segmented chip-group container (holds <Chip>s).
export const SEG = 'flex flex-wrap items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-1';
// Small brand-tinted "ghost" action button (pick image, add field, …).
export const ACCENT_BTN =
  'inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)]/20 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';
// Helper / hint caption under a field.
export const HELP = 'mt-1 text-[10px] text-[var(--text-tertiary)]';
export const CHIP_ON = 'bg-[var(--surface)] text-[var(--brand)] shadow-[var(--shadow-xs)] ring-1 ring-[var(--brand)]';
export const CHIP_OFF = 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]';

export function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${active ? CHIP_ON : CHIP_OFF}`}
    >
      {children}
    </button>
  );
}

export function AlignPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts = [
    { id: 'left', icon: AlignLeft },
    { id: 'center', icon: AlignCenter },
    { id: 'right', icon: AlignRight },
  ];
  return (
    <div className="flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-1">
      {opts.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)} aria-pressed={value === o.id} aria-label={`Align ${o.id}`}
          className={`flex flex-1 items-center justify-center rounded-[var(--radius-sm)] p-2 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${value === o.id ? CHIP_ON : CHIP_OFF}`}>
          <o.icon className="h-4 w-4" strokeWidth={value === o.id ? 2.5 : 2} />
        </button>
      ))}
    </div>
  );
}

export const STYLE_VARIANTS = [
  { id: 'default', label: 'Default' },
  { id: 'featured', label: 'Featured' },
  { id: 'outline', label: 'Outline' },
  { id: 'highlight', label: 'Highlight' },
];

export const ICON_TYPES = [
  { id: 'external', label: 'Link', icon: ExternalLink },
  { id: 'youtube', label: 'YouTube', icon: Play },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'twitter', label: 'Twitter', icon: Twitter },
  { id: 'spotify', label: 'Spotify', icon: Music2 },
  { id: 'tiktok', label: 'TikTok', icon: Music },
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
];

export const ANIMATIONS = [
  { id: 'none', label: 'None' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'shine', label: 'Shine' },
  { id: 'glow', label: 'Glow' },
];

export const SOCIAL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/you' },
  { id: 'twitter', label: 'Twitter/X', icon: Twitter, placeholder: 'https://x.com/you' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@you' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/you' },
  { id: 'github', label: 'GitHub', icon: Github, placeholder: 'https://github.com/you' },
  { id: 'tiktok', label: 'TikTok', icon: Music, placeholder: 'https://tiktok.com/@you' },
  { id: 'website', label: 'Website', icon: Globe, placeholder: 'https://your-site.com' },
  { id: 'spotify', label: 'Spotify', icon: Music2, placeholder: 'https://open.spotify.com/artist/...' },
];
