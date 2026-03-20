'use client';
// ImageGallery — responsive masonry grid with lightbox on click.
// No DB tables (images from settings)

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ImageGallery({ settings }: { settings: any }) {
  const title  = settings?.title  ?? '';
  const images = (settings?.images as { url: string; alt?: string }[]) ?? [];
  const [lightbox, setLightbox] = useState<number | null>(null);

  const prev = () => setLightbox(i => (i !== null ? (i - 1 + images.length) % images.length : null));
  const next = () => setLightbox(i => (i !== null ? (i + 1) % images.length : null));

  if (images.length === 0) return null;

  return (
    <section className="py-16 bg-[--creator-surface]">
      <div className="max-w-6xl mx-auto px-4">
        {title && <h2 className="text-3xl font-bold text-center text-[--creator-text] mb-10">{title}</h2>}

        {/* Masonry grid */}
        <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setLightbox(i)}
              className="break-inside-avoid w-full rounded-xl overflow-hidden block hover:opacity-90 transition-opacity shadow-md hover:shadow-xl"
            >
              <img src={img.url} alt={img.alt ?? `Gallery image ${i + 1}`} className="w-full h-auto object-cover" />
            </button>
          ))}
        </div>

        {/* Lightbox */}
        {lightbox !== null && (
          <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <button onClick={e => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <img
              src={images[lightbox].url}
              alt={images[lightbox].alt ?? ''}
              className="max-h-[85vh] max-w-full rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
            <button onClick={e => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition">
              <ChevronRight className="w-5 h-5" />
            </button>
            <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
