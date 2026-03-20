'use client';
// SectionRenderer — maps section type strings to React components.
// Accepts products and siteMain for product-aware sections.
// DB tables: none directly (sections data comes from parent page via props)

import React from 'react';
import dynamic from 'next/dynamic';

// Existing sections
const HeroBanner         = dynamic(() => import('./sections/HeroBanner'),         { ssr: true });
const FeaturedProducts   = dynamic(() => import('./sections/FeaturedProducts'),   { ssr: true });
const TestimonialsCarousel = dynamic(() => import('./sections/TestimonialsCarousel'), { ssr: true });
const FaqAccordion       = dynamic(() => import('./sections/FaqAccordion'),       { ssr: true });
const TrustBadges        = dynamic(() => import('./sections/TrustBadges'),        { ssr: true });
const AboutCreator       = dynamic(() => import('./sections/AboutCreator'),       { ssr: true });

// New sections
const ProductGrid        = dynamic(() => import('./sections/ProductGrid'),        { ssr: true });
const SocialProof        = dynamic(() => import('./sections/SocialProof'),        { ssr: false }); // count-up uses IntersectionObserver
const CountdownTimerSection = dynamic(() => import('./sections/CountdownTimerSection'), { ssr: false });
const EmailCapture       = dynamic(() => import('./sections/EmailCapture'),       { ssr: true });
const AnnouncementBar    = dynamic(() => import('./sections/AnnouncementBar'),    { ssr: false }); // uses localStorage
const StickyCta          = dynamic(() => import('./sections/StickyCta'),          { ssr: false });
const VideoShowcase      = dynamic(() => import('./sections/VideoShowcase'),      { ssr: true });
const ImageGallery       = dynamic(() => import('./sections/ImageGallery'),       { ssr: true });
const RichText           = dynamic(() => import('./sections/RichText'),           { ssr: true });
const CustomHtml         = dynamic(() => import('./sections/CustomHtml'),         { ssr: true });
const ProductComparison  = dynamic(() => import('./sections/ProductComparison'),  { ssr: true });
const PricingTable       = dynamic(() => import('./sections/PricingTable'),       { ssr: true });

export interface StorefrontSection {
  id: string;
  type: string;
  is_visible?: boolean;
  sort_order?: number;
  settings: Record<string, unknown>;
}

export interface SectionRendererProps {
  sections: StorefrontSection[];
  products?: any[];
  siteMain?: any;
  siteId?: string;
}

export default function SectionRenderer({ sections, products = [], siteMain, siteId }: SectionRendererProps) {
  if (!sections || !Array.isArray(sections)) return null;

  return (
    <div className="flex flex-col w-full">
      {sections.map((section, index) => {
        const props = { settings: section.settings ?? {}, products, siteMain };
        const key = section.id ?? index;

        switch (section.type) {
          case 'hero_banner':         return <HeroBanner           key={key} {...props} />;
          case 'featured_products':   return <FeaturedProducts     key={key} {...props} />;
          case 'testimonials':        return <TestimonialsCarousel key={key} {...props} />;
          case 'faq_accordion':       return <FaqAccordion         key={key} {...props} />;
          case 'trust_badges':        return <TrustBadges          key={key} {...props} />;
          case 'about_creator':       return <AboutCreator         key={key} {...props} />;
          case 'product_grid':        return <ProductGrid          key={key} {...props} />;
          case 'social_proof':        return <SocialProof          key={key} {...props} />;
          case 'countdown_timer':     return <CountdownTimerSection key={key} {...props} />;
          case 'email_capture':       return <EmailCapture         key={key} {...props} siteId={siteId} />;
          case 'announcement_bar':    return <AnnouncementBar      key={key} {...props} />;
          case 'sticky_cta':          return <StickyCta            key={key} {...props} />;
          case 'video_showcase':      return <VideoShowcase        key={key} {...props} />;
          case 'image_gallery':       return <ImageGallery         key={key} {...props} />;
          case 'rich_text':           return <RichText             key={key} {...props} />;
          case 'custom_html':         return <CustomHtml           key={key} {...props} />;
          case 'product_comparison':  return <ProductComparison    key={key} {...props} />;
          case 'pricing_table':       return <PricingTable         key={key} {...props} />;
          default:
            console.warn(`[SectionRenderer] Unknown section type: ${section.type}`);
            return null;
        }
      })}
    </div>
  );
}
