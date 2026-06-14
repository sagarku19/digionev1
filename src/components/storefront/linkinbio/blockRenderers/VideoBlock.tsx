import React from 'react';
import type { BlockRendererProps } from './_shared';

export default function VideoBlock({ link, palette, animStyle }: BlockRendererProps) {
  if (!link.metadata?.embed_url) return null;

  return (
    <div className="w-full col-span-2" style={animStyle}>
      <div className="rounded-xl overflow-hidden" style={{ aspectRatio: link.metadata.aspect_ratio as string || '16/9' }}>
        <iframe
          src={link.metadata.embed_url as string}
          className="w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          title={link.title || 'Video'}
        />
      </div>
      {link.metadata?.caption && (
        <p className="text-xs mt-1.5 text-center" style={{ color: palette.muted || '#64748B' }}>{link.metadata.caption as string}</p>
      )}
    </div>
  );
}
