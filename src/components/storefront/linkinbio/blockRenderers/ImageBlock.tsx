import React from 'react';
import type { BlockRendererProps } from './_shared';
import { trackClick } from './_shared';

export default function ImageBlock({ link, palette, siteId, animStyle }: BlockRendererProps) {
  if (!link.thumbnail_url) return null;

  const radius = link.metadata?.border_radius === 'none' ? 'rounded-none'
    : link.metadata?.border_radius === 'full' ? 'rounded-3xl'
    : 'rounded-xl';
  const ratio = link.metadata?.aspect_ratio && link.metadata.aspect_ratio !== 'auto'
    ? { aspectRatio: link.metadata.aspect_ratio as string } : {};

  const inner = (
    <>
      <img src={link.thumbnail_url} alt={link.metadata?.alt_text as string || ''} className={`w-full object-cover ${radius}`} style={ratio} />
      {link.metadata?.caption && (
        <p className="text-xs mt-1.5 text-center" style={{ color: palette.muted || '#64748B' }}>{link.metadata.caption as string}</p>
      )}
    </>
  );

  return link.metadata?.link_url ? (
    <a href={link.metadata.link_url as string} target="_blank" rel="noopener noreferrer"
      onClick={() => trackClick(siteId, link.id, 'link_click')}
      className="w-full col-span-2 hover:opacity-90 transition" style={animStyle}>{inner}</a>
  ) : (
    <div className="w-full col-span-2" style={animStyle}>{inner}</div>
  );
}
