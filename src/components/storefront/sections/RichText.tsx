'use client';
// RichText section — renders HTML content in a typographic prose container.
// No DB tables (content from settings)

import React from 'react';

export default function RichText({ settings }: { settings: any }) {
  const content  = settings?.content ?? '';
  const maxWidth = settings?.max_width ?? '768px';
  const align    = settings?.text_align ?? 'left';

  return (
    <section className="py-12 px-4">
      <div
        className="mx-auto prose prose-gray dark:prose-invert max-w-none"
        style={{ maxWidth, textAlign: align as React.CSSProperties['textAlign'] }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </section>
  );
}
