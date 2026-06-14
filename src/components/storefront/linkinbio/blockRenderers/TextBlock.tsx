import React from 'react';
import type { BlockRendererProps } from './_shared';

export default function TextBlock({ link, palette, animStyle }: BlockRendererProps) {
  const align = link.metadata?.alignment || 'left';
  const textSizeMap: Record<string, string> = { sm: 'text-xs', base: 'text-sm', lg: 'text-base' };
  const sizeClass = textSizeMap[link.metadata?.size || 'base'] || 'text-sm';
  return (
    <div className="w-full col-span-2" style={{ textAlign: align as React.CSSProperties['textAlign'], ...animStyle }}>
      <p className={`${sizeClass} leading-relaxed whitespace-pre-wrap`} style={{ color: palette.text || '#0F172A' }}>
        {link.metadata?.content}
      </p>
    </div>
  );
}
