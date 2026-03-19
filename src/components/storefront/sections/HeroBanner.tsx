import React from 'react';
import Link from 'next/link';

export default function HeroBanner({ settings }: { settings: any }) {
  const title = settings?.title || 'Welcome to my store';
  const subtitle = settings?.subtitle || 'Discover premium digital products, courses, and more.';
  const primaryCta = settings?.primary_cta || { text: 'Shop Now', url: '#products' };
  const alignment = settings?.alignment || 'center'; // 'left', 'center', 'right'
  const bgImageUrl = settings?.background_image_url;

  return (
    <section className={`relative w-full py-24 md:py-32 flex items-center justify-center overflow-hidden
      ${bgImageUrl ? 'bg-[#000000]/40 blend-overlay' : 'bg-[--creator-surface]'}
    `}>
      {bgImageUrl && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImageUrl})`, filter: 'brightness(0.6)' }}
        />
      )}
      
      <div className={`relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col 
        ${alignment === 'center' ? 'items-center text-center' : alignment === 'right' ? 'items-end text-right' : 'items-start text-left'}
      `}>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-[--creator-text] mb-6 max-w-3xl">
          {title}
        </h1>
        <p className="text-lg md:text-xl text-[--creator-text-muted] mb-10 max-w-2xl">
          {subtitle}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <a 
            href={primaryCta.url}
            className="inline-flex justify-center items-center px-8 py-3 rounded-full bg-[--creator-primary] text-white font-bold hover:opacity-90 transition-opacity shadow-lg"
          >
            {primaryCta.text}
          </a>
        </div>
      </div>
    </section>
  );
}
