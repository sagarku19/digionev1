import React from 'react';
import type { BlockRendererProps } from './_shared';

export default function SpotifyBlock({ link, animStyle }: BlockRendererProps) {
  if (!link.metadata?.spotify_url) return null;
  const url = link.metadata.spotify_url as string;
  // Convert open.spotify.com URL to embed URL
  const embedUrl = url.replace('open.spotify.com/', 'open.spotify.com/embed/');
  const isCompact = link.metadata?.embed_type === 'track';
  return (
    <div className="w-full col-span-2 rounded-xl overflow-hidden" style={animStyle}>
      <iframe
        src={embedUrl}
        className="w-full border-0"
        style={{ height: isCompact ? '152px' : '352px', borderRadius: '12px' }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title={link.title || 'Spotify'}
      />
    </div>
  );
}
