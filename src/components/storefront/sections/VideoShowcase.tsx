'use client';
// VideoShowcase — YouTube/Vimeo embed with thumbnail poster.
// No DB tables (embed data from settings)

import React, { useState } from 'react';
import { Play } from 'lucide-react';

function getEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const id = u.searchParams.get('v') ?? u.pathname.split('/').pop() ?? '';
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').pop() ?? '';
      return `https://player.vimeo.com/video/${id}?autoplay=1`;
    }
  } catch { /* invalid URL */ }
  return url;
}

export default function VideoShowcase({ settings }: { settings: any }) {
  const title    = settings?.title       ?? '';
  const subtitle = settings?.subtitle    ?? '';
  const videoUrl = settings?.video_url   ?? '';
  const poster   = settings?.poster_url  ?? '';
  const [playing, setPlaying] = useState(false);

  return (
    <section className="py-16 bg-[--creator-surface]">
      <div className="max-w-4xl mx-auto px-4">
        {title && <h2 className="text-3xl font-bold text-center text-[--creator-text] mb-3">{title}</h2>}
        {subtitle && <p className="text-center text-[--creator-text-muted] mb-8">{subtitle}</p>}
        <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black">
          {playing && videoUrl ? (
            <iframe
              src={getEmbedUrl(videoUrl)}
              className="w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          ) : (
            <>
              {poster && <img src={poster} alt="Video thumbnail" className="w-full h-full object-cover" />}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <button
                  onClick={() => setPlaying(true)}
                  className="w-20 h-20 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110"
                  aria-label="Play video"
                >
                  <Play className="w-8 h-8 text-[--creator-primary] ml-1" fill="currentColor" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
