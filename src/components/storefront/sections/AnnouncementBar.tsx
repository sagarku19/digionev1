'use client';
// AnnouncementBar — top fixed strip, dismissible via localStorage.
// No DB tables (data from settings)

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function AnnouncementBar({ settings }: { settings: any }) {
  const text    = settings?.text    ?? '🎉 New products just dropped! Limited time offer.';
  const ctaText = settings?.cta_text ?? '';
  const ctaUrl  = settings?.cta_url  ?? '';
  const barId   = settings?.bar_id   ?? 'default-bar';

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(`announcement-${barId}`);
    if (!dismissed) setVisible(true);
  }, [barId]);

  const dismiss = () => {
    localStorage.setItem(`announcement-${barId}`, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-[--creator-primary] text-white px-4 py-2.5 flex items-center justify-center gap-4 text-sm font-medium shadow-md">
      <span>{text}</span>
      {ctaText && ctaUrl && (
        <a href={ctaUrl} className="underline underline-offset-2 hover:opacity-80 font-bold shrink-0">{ctaText}</a>
      )}
      <button onClick={dismiss} className="ml-auto shrink-0 hover:opacity-80 transition" aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
