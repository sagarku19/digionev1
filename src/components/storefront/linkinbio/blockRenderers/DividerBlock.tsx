import React from 'react';
import type { BlockRendererProps } from './_shared';

export default function DividerBlock({ palette, animStyle }: BlockRendererProps) {
  return <hr className="border-t w-full col-span-2" style={{ borderColor: `${palette.text || '#0F172A'}15`, ...animStyle }} />;
}
