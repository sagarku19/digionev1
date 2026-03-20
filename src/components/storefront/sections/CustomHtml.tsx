'use client';
// CustomHtml section — raw HTML passthrough.
// No DB tables (HTML from settings — creator-controlled)

import React from 'react';

export default function CustomHtml({ settings }: { settings: any }) {
  const html = settings?.html ?? '';
  if (!html) return null;
  return (
    <section
      className="py-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
