import React from 'react';
import { ExternalLink, Play, Instagram, Twitter, Music2, Music, Github, Linkedin } from 'lucide-react';
import type { BlockRendererProps } from './_shared';
import { getButtonClasses, trackClick } from './_shared';

export default function UrlBlock({ link, bio, palette, siteId, animStyle, cardSt }: BlockRendererProps) {
  const IconComponent = link.icon_type === 'youtube' ? Play
    : link.icon_type === 'instagram' ? Instagram
    : link.icon_type === 'twitter' ? Twitter
    : link.icon_type === 'spotify' ? Music2
    : link.icon_type === 'tiktok' ? Music
    : link.icon_type === 'github' ? Github
    : link.icon_type === 'linkedin' ? Linkedin
    : ExternalLink;

  const isFeatured = link.style_variant === 'featured';
  const linkAnim = link.metadata?.animation || 'none';
  const isHalf = link.metadata?.col_span === 'half';

  return (
    <a href={link.url || '#'} target="_blank" rel="noopener noreferrer"
      onClick={() => trackClick(siteId, link.id, 'link_click')}
      className={`${getButtonClasses(bio.button_style, bio.border_radius)} group ${isFeatured ? 'py-5' : ''} ${isHalf ? 'col-span-1' : 'col-span-2'} ${
        linkAnim === 'pulse' ? 'hover:animate-pulse' :
        linkAnim === 'shine' ? 'bio-shine' :
        linkAnim === 'glow' ? 'bio-glow' : ''
      }`}
      style={{ ...cardSt, ...animStyle }}>
      {link.thumbnail_url ? (
        <img src={link.thumbnail_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${palette.primary || '#EC4899'}15` }}>
          <IconComponent className="w-4 h-4" style={{ color: palette.primary || '#EC4899' }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold truncate ${isFeatured ? 'text-base' : 'text-sm'}`} style={{ color: palette.text || '#0F172A' }}>
          {link.title || 'Link'}
        </p>
        {link.description && (
          <p className="text-xs mt-0.5 truncate" style={{ color: palette.muted || '#64748B' }}>{link.description}</p>
        )}
      </div>
      <ExternalLink className="w-4 h-4 shrink-0 opacity-40 group-hover:opacity-100 transition" style={{ color: palette.text }} />
    </a>
  );
}
