import React from 'react';
import type { BlockRendererProps } from './_shared';

export default function HeadingBlock({ link, palette, animStyle }: BlockRendererProps) {
  const align = link.metadata?.alignment || 'left';
  const headingSizeMap: Record<string, string> = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };
  const sizeClass = headingSizeMap[link.metadata?.size || 'md'] || 'text-sm';
  return (
    <div className="pt-2 w-full col-span-2" style={{ textAlign: align as React.CSSProperties['textAlign'], ...animStyle }}>
      <p className={`${sizeClass} font-bold`} style={{ color: palette.text || '#0F172A' }}>{link.title}</p>
      {link.metadata?.subtitle && (
        <p className="text-xs mt-0.5" style={{ color: palette.muted || '#64748B' }}>{link.metadata.subtitle}</p>
      )}
      {link.metadata?.show_divider && (
        <hr className="mt-2 border-t" style={{ borderColor: `${palette.text || '#0F172A'}15` }} />
      )}
    </div>
  );
}
