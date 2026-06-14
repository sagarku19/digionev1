import React from 'react';
import { getRadiusClass, trackClick } from './_shared';
import type { BlockRendererProps } from './_shared';

export default function BannerBlock({ link, bio, palette, siteId, animStyle }: BlockRendererProps) {
  const bgColor = link.metadata?.bg_color || palette.primary || '#EC4899';
  return (
    <div className="w-full col-span-2" style={animStyle}>
      <div className={`${getRadiusClass(bio.border_radius)} p-5 text-center`}
        style={{ backgroundColor: bgColor as string, color: '#FFFFFF' }}>
        {link.title && <h3 className="text-lg font-bold">{link.title}</h3>}
        {link.metadata?.description && <p className="text-sm mt-1 opacity-90">{link.metadata.description}</p>}
        {link.metadata?.button_url && (
          <a href={link.metadata.button_url as string} target="_blank" rel="noopener noreferrer"
            onClick={() => trackClick(siteId, link.id, 'link_click')}
            className="inline-block mt-3 px-6 py-2.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-semibold transition">
            {link.metadata?.button_text || 'Learn More'}
          </a>
        )}
      </div>
    </div>
  );
}
