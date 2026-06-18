'use client';
import { Instagram, Youtube, Twitter, Facebook, Linkedin, Github, Music2, Globe } from 'lucide-react';
import type { ElementType } from 'react';

type Social = { platform: string; url: string; is_visible?: boolean };

type Props = {
  name: string;
  bio: string;
  avatarUrl: string;
  socialLinks: Social[];
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

export default function ProfilePreviewCard({ name, bio, avatarUrl, socialLinks }: Props) {
  const socials = (socialLinks ?? []).filter((s) => s.url && (s.is_visible ?? true));
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-4">
        <span className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[var(--surface-muted)]">
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-[var(--text-primary)]">{name || 'Your name'}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-[var(--text-secondary)]">
            {bio || 'Add a short bio to introduce yourself.'}
          </p>
        </div>
      </div>
      {socials.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
          {socials.map((s, i) => {
            const Icon = SOCIAL_ICONS[s.platform?.toLowerCase()] ?? Globe;
            return (
              <span
                key={i}
                title={s.platform}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)]"
              >
                <Icon className="h-4 w-4" />
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
