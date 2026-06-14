import React from 'react';
import {
  Instagram, Twitter, Youtube, Linkedin, Github, Globe, Music, Music2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────
export type SocialLink = { platform: string; url: string; is_visible?: boolean };

export type BioData = {
  display_name: string;
  bio_text: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  layout_style: string;
  button_style: string;
  background_type: string;
  background_value: string | null;
  social_links: SocialLink[] | null;
  show_watermark: boolean;
  show_share_button: boolean;
  font_family?: string;
  card_style?: string;
  animation?: string;
  border_radius?: string;
  spacing?: string;
  avatar_shape?: 'circular' | 'rounded' | 'square';
  avatar_border?: boolean;
};

// reason: link.metadata is heterogeneous per-block jsonb; a precise union is out of scope for this refactor
export type BioLink = {
  id: string;
  link_type: string;
  title: string | null;
  description: string | null;
  url: string | null;
  thumbnail_url: string | null;
  product_id: string | null;
  icon_type: string | null;
  style_variant: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
};

export type ProductLite = { id: string; name: string; price: number; thumbnail_url: string | null; is_published: boolean };

export type BlockRendererProps = {
  link: BioLink;
  bio: BioData;
  palette: Record<string, string>;
  productsMap: Record<string, ProductLite>;
  siteId: string;
  index: number;
  animStyle: React.CSSProperties;
  cardSt: React.CSSProperties;
};

// ─── Social icon map ─────────────────────────────────────────
export const SOCIAL_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram, twitter: Twitter, youtube: Youtube,
  linkedin: Linkedin, github: Github, tiktok: Music,
  website: Globe, spotify: Music2,
};

// ─── Border radius / animation / card / button helpers (verbatim) ───
export function getRadiusClass(r?: string): string {
  switch (r) {
    case 'none': return 'rounded-none';
    case 'sm': return 'rounded-md';
    case 'lg': return 'rounded-2xl';
    case 'full': return 'rounded-full';
    default: return 'rounded-xl';
  }
}

export function getAnimationStyle(anim?: string, index?: number): React.CSSProperties {
  const delay = `${(index ?? 0) * 60}ms`;
  switch (anim) {
    case 'fade-in': return { opacity: 0, animation: `bioFadeIn 0.4s ease-out ${delay} forwards` };
    case 'slide-up': return { opacity: 0, transform: 'translateY(12px)', animation: `bioSlideUp 0.4s ease-out ${delay} forwards` };
    case 'scale': return { opacity: 0, transform: 'scale(0.95)', animation: `bioScale 0.3s ease-out ${delay} forwards` };
    default: return {};
  }
}

export function getCardStyle(style?: string, palette?: Record<string, string>): React.CSSProperties {
  switch (style) {
    case 'glass': return {
      backgroundColor: `${palette?.surface || '#FFFFFF'}40`,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    };
    case 'transparent': return { backgroundColor: 'transparent' };
    case 'bordered': return { backgroundColor: 'transparent', border: `2px solid ${palette?.text || '#000'}15` };
    default: return { backgroundColor: palette?.surface || '#FFFFFF' };
  }
}

export function getButtonClasses(style: string, radius?: string): string {
  const r = getRadiusClass(radius);
  const base = `w-full flex items-center gap-3 px-5 py-3.5 transition-all duration-200 text-left ${r}`;
  switch (style) {
    case 'pill':
      return `${base} !rounded-full border-2 border-[--creator-text]/10 hover:border-[--creator-primary] hover:shadow-lg`;
    case 'sharp':
      return `${base} !rounded-none border-2 border-[--creator-text]/10 hover:border-[--creator-primary] hover:shadow-lg`;
    case 'outline':
      return `${base} border-2 border-[--creator-primary]/30 hover:border-[--creator-primary] hover:bg-[--creator-primary]/5`;
    case 'shadow':
      return `${base} border border-[--creator-text]/5 shadow-md hover:shadow-xl hover:translate-y-[-1px]`;
    default:
      return `${base} border-2 border-[--creator-text]/10 hover:border-[--creator-primary] hover:shadow-lg`;
  }
}

// ─── Click tracking (verbatim) ───────────────────────────────
export function trackClick(siteId: string, linkId: string, eventType: string) {
  try {
    const body = JSON.stringify({ site_id: siteId, link_id: linkId, event_type: eventType });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/linkinbio/track', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/linkinbio/track', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
    }
  } catch { /* silent */ }
}
