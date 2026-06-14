import React from 'react';
import type { BlockRendererProps } from './_shared';

export default function HeaderBlock({ link, palette, animStyle }: BlockRendererProps) {
  const align = link.metadata?.alignment || 'center';
  const sizeMap: Record<string, string> = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl', '2xl': 'text-2xl' };
  const sizeClass = sizeMap[link.metadata?.size || 'xl'] || 'text-xl';
  return (
    <div className="w-full col-span-2" style={{ textAlign: align as React.CSSProperties['textAlign'], ...animStyle }}>
      <h2 className={`${sizeClass} font-bold`} style={{ color: palette.text || '#0F172A' }}>{link.title}</h2>
      {link.metadata?.subtitle && (
        <p className="text-sm mt-1" style={{ color: palette.muted || '#64748B' }}>{link.metadata.subtitle}</p>
      )}
      {link.metadata?.show_divider && (
        <div className="mt-3 mx-auto" style={{
          width: align === 'center' ? '48px' : '48px',
          height: '3px',
          borderRadius: '9999px',
          backgroundColor: palette.primary || '#EC4899',
          marginLeft: align === 'left' ? 0 : align === 'right' ? 'auto' : 'auto',
          marginRight: align === 'right' ? 0 : align === 'left' ? 'auto' : 'auto',
        }} />
      )}
    </div>
  );
}
