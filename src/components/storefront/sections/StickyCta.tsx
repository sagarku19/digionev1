'use client';
// StickyCta — fixed bottom bar visible on mobile, scroll-triggered.
// No DB tables (CTA link only)

import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

export default function StickyCta({ settings }: { settings: any }) {
  const text    = settings?.text     ?? 'Get instant access';
  const ctaUrl  = settings?.cta_url  ?? '#products';
  const bgColor = settings?.bg_color ?? 'var(--creator-primary)';
  const threshold = settings?.scroll_threshold ?? 400;

  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > threshold);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-4 pb-4 pt-3 bg-gradient-to-t from-white/90 dark:from-black/80 to-transparent">
      <a
        href={ctaUrl}
        style={{ backgroundColor: bgColor }}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-bold text-base shadow-2xl"
      >
        {text} <ArrowRight className="w-5 h-5" />
      </a>
    </div>
  );
}
