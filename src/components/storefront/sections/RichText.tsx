'use client';
// RichText section — renders HTML content in a typographic prose container.
// No DB tables (content from settings)

import React from 'react';

interface RichTextSettings {
  content?: string;
  max_width?: string;
  text_align?: string;
}

export default function RichText({ settings }: { settings: Record<string, unknown> }) {
  // reason: section settings is jsonb; narrow once to the typed view
  const s = settings as unknown as RichTextSettings;
  const content  = s?.content ?? '';
  const maxWidth = s?.max_width ?? '768px';
  const align    = s?.text_align ?? 'left';

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
