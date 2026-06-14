'use client';
// CustomHtml section — raw HTML passthrough.
// No DB tables (HTML from settings — creator-controlled)

import React from 'react';

interface CustomHtmlSettings {
  html?: string;
}

export default function CustomHtml({ settings }: { settings: Record<string, unknown> }) {
  // reason: section settings is jsonb; narrow once to the typed view
  const s = settings as unknown as CustomHtmlSettings;
  const html = s?.html ?? '';
  if (!html) return null;
  return (
    <section
      className="py-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
