import React from 'react';
import type { BlockRendererProps } from './_shared';

export default function HtmlEmbedBlock({ link, animStyle }: BlockRendererProps) {
  if (!link.metadata?.html) return null;
  return (
    <div className="w-full col-span-2 overflow-hidden rounded-xl" style={animStyle}>
      <div
        dangerouslySetInnerHTML={{ __html: link.metadata.html as string }}
        className="w-full [&>iframe]:w-full [&>iframe]:border-0"
      />
    </div>
  );
}
