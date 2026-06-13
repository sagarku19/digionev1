// Shared primitives + option lists for the Link-in-Bio block editors.
import React from 'react';
import {
  AlignLeft, AlignCenter, AlignRight, ExternalLink, Play, Instagram,
  Twitter, Music2, Music, Github, Linkedin, Youtube, Globe,
} from 'lucide-react';
import { editorInput, EDITOR_ACCENTS } from '../../../_shared/editorStyles';

export { FieldLabel } from '../../../_shared/editorStyles';

export const INPUT = editorInput(EDITOR_ACCENTS.pink);
export const CHIP_ON = 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-100';
export const CHIP_OFF = 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-[var(--bg-secondary)]/50 scale-95 hover:scale-100';

export function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex-1 px-3 py-1.5 rounded-[10px] text-[11px] font-semibold transition-all duration-300 ${active ? CHIP_ON : CHIP_OFF}`}>
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
    <div className="flex items-center gap-1 p-1 bg-gray-100/80 dark:bg-[var(--bg-secondary)]/50 rounded-xl">
      {opts.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`flex-1 flex items-center justify-center p-2 rounded-[10px] transition-all duration-300 ${value === o.id ? CHIP_ON : CHIP_OFF}`}>
          <o.icon className="w-4 h-4" strokeWidth={value === o.id ? 2.5 : 2} />
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
