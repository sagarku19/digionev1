'use client';
import { Pencil, Instagram, Youtube, Twitter, Facebook, Linkedin, Github, Music2, Globe } from 'lucide-react';
import type { ElementType } from 'react';

type Social = { platform: string; url: string; is_visible?: boolean };

type Props = {
  name: string;
  username: string;
  bio: string;
  avatarUrl: string;
  socialLinks?: Social[];
  onEdit: () => void;
};

const SOCIAL_ICONS: Record<string, ElementType> = {
  instagram: Instagram,
  youtube: Youtube,
  twitter: Twitter,
  x: Twitter,
  facebook: Facebook,
  linkedin: Linkedin,
  github: Github,
  tiktok: Music2,
  spotify: Music2,
};

export default function ProfileCard({ name, username, bio, avatarUrl, socialLinks, onEdit }: Props) {
  const socials = (socialLinks ?? []).filter((s) => s.url && (s.is_visible ?? true));
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{name || 'Your name'}</p>
        <p className="truncate text-xs text-[var(--text-tertiary)]">
          {username ? `@${username}` : 'username'}{bio ? ` · ${bio}` : ''}
        </p>
        {socials.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {socials.map((s, i) => {
              const Icon = SOCIAL_ICONS[s.platform?.toLowerCase()] ?? Globe;
              return (
                <span
                  key={i}
                  title={s.platform}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
              );
            })}
          </div>
        )}
      </div>
      <button
        onClick={onEdit}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <Pencil className="h-3.5 w-3.5" /> Edit
      </button>
    </div>
  );
}
