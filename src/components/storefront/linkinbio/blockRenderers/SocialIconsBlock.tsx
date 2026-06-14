import React from 'react';
import { Globe } from 'lucide-react';
import { SOCIAL_ICONS } from './_shared';
import type { BlockRendererProps } from './_shared';

export default function SocialIconsBlock({ link, palette, animStyle }: BlockRendererProps) {
  const iconLinks = link.metadata?.links ?? [];
  const style = link.metadata?.style || 'circle';
  const size = link.metadata?.size || 'md';
  const align = link.metadata?.alignment || 'center';
  const sizeMap = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' };
  const iconSizeMap = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' };
  const shapeClass = style === 'square' ? 'rounded-lg' : style === 'pill' ? 'rounded-xl' : 'rounded-full';

  return (
    <div className="w-full col-span-2" style={{ ...animStyle }}>
      <div className={`flex items-center gap-2.5 flex-wrap ${
        align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
      }`}>
        {(iconLinks as Array<{ platform: string; url: string }>).filter((s) => s.url).map((s, i) => {
          const Icon = SOCIAL_ICONS[s.platform] || Globe;
          return (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
              className={`${sizeMap[size as keyof typeof sizeMap] || sizeMap.md} ${shapeClass} flex items-center justify-center transition hover:scale-110`}
              style={{ backgroundColor: `${palette.primary || '#EC4899'}15`, color: palette.primary || '#EC4899' }}>
              <Icon className={iconSizeMap[size as keyof typeof iconSizeMap] || iconSizeMap.md} />
            </a>
          );
        })}
      </div>
    </div>
  );
}
