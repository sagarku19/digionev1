import React from 'react';
import type { BlockRendererProps } from './_shared';

export default function SpaceBlock({ link }: BlockRendererProps) {
  const heightMap: Record<string, string> = { sm: '16px', md: '32px', lg: '64px', xl: '96px' };
  const h = heightMap[link.metadata?.height || 'md'];
  return <div className="w-full col-span-2" style={{ height: h }} />;
}
