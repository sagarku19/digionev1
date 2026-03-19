'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports for performance (lazy load storefront sections)
const HeroBanner = dynamic<{ settings: any }>(() => import('./sections/HeroBanner'), { ssr: true });
const FeaturedProducts = dynamic<{ settings: any }>(() => import('./sections/FeaturedProducts'), { ssr: true });
const TestimonialsCarousel = dynamic<{ settings: any }>(() => import('./sections/TestimonialsCarousel'), { ssr: true });
const FaqAccordion = dynamic<{ settings: any }>(() => import('./sections/FaqAccordion'), { ssr: true });
const TrustBadges = dynamic<{ settings: any }>(() => import('./sections/TrustBadges'), { ssr: true });
const AboutCreator = dynamic<{ settings: any }>(() => import('./sections/AboutCreator'), { ssr: true });

export interface StorefrontSection {
  id: string;
  type: string;
  settings: any;
}

export default function SectionRenderer({ sections }: { sections: StorefrontSection[] }) {
  if (!sections || !Array.isArray(sections)) return null;

  return (
    <div className="flex flex-col w-full">
      {sections.map((section, index) => {
        // Map section types to React components
        switch (section.type) {
          case 'hero_banner':
            return <HeroBanner key={section.id || index} settings={section.settings} />;

          case 'featured_products':
            return <FeaturedProducts key={section.id || index} settings={section.settings} />;

          case 'testimonials':
            return <TestimonialsCarousel key={section.id || index} settings={section.settings} />;

          case 'faq_accordion':
            return <FaqAccordion key={section.id || index} settings={section.settings} />;

          case 'trust_badges':
            return <TrustBadges key={section.id || index} settings={section.settings} />;

          case 'about_creator':
            return <AboutCreator key={section.id || index} settings={section.settings} />;

          default:
            // Fallback for unknown sections
            console.warn(`Unknown section type: ${section.type}`);
            return null;
        }
      })}
    </div>
  );
}
