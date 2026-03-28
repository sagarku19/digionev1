'use client';
// LinkInBioPage V2 — public-facing bio page renderer.
// Desktop: profile pinned left, links right. Mobile: stacked.
// New: header, text, html_embed, social_icons, spotify, banner blocks.
// New: font family, card style, animation, border radius, spacing.

import React, { useEffect, useState } from 'react';
import {
  Instagram, Twitter, Youtube, Linkedin, Github, Globe, Music,
  ExternalLink, Share2, Package, Play, Music2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────
type SocialLink = { platform: string; url: string; is_visible?: boolean };

type BioData = {
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
  // V2 appearance fields
  font_family?: string;
  card_style?: string;
  animation?: string;
  border_radius?: string;
  spacing?: string;
  avatar_shape?: 'circular' | 'rounded' | 'square';
};

type BioLink = {
  id: string;
  link_type: string;
  title: string | null;
  description: string | null;
  url: string | null;
  thumbnail_url: string | null;
  product_id: string | null;
  icon_type: string | null;
  style_variant: string;
  metadata: any;
};

type Props = {
  siteId: string;
  bio: BioData;
  links: BioLink[];
  productsMap: Record<string, { id: string; name: string; price: number; thumbnail_url: string | null; is_published: boolean }>;
  palette: Record<string, string>;
};

// ─── Social icon map ─────────────────────────────────────────
const SOCIAL_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram, twitter: Twitter, youtube: Youtube,
  linkedin: Linkedin, github: Github, tiktok: Music,
  website: Globe, spotify: Music2,
};

// ─── Font family CSS ─────────────────────────────────────────
function getFontClass(font?: string): string {
  switch (font) {
    case 'inter': return '"Inter", system-ui, sans-serif';
    case 'poppins': return '"Poppins", system-ui, sans-serif';
    case 'space-grotesk': return '"Space Grotesk", system-ui, monospace';
    case 'playfair': return '"Playfair Display", Georgia, serif';
    case 'dm-sans': return '"DM Sans", system-ui, sans-serif';
    default: return 'system-ui, -apple-system, sans-serif';
  }
}

// ─── Google fonts link for non-system fonts ──────────────────
function FontLink({ font }: { font?: string }) {
  if (!font || font === 'system') return null;
  const map: Record<string, string> = {
    inter: 'Inter:wght@400;500;600;700',
    poppins: 'Poppins:wght@400;500;600;700',
    'space-grotesk': 'Space+Grotesk:wght@400;500;600;700',
    playfair: 'Playfair+Display:wght@400;600;700',
    'dm-sans': 'DM+Sans:wght@400;500;600;700',
  };
  const family = map[font];
  if (!family) return null;
  return <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${family}&display=swap`} />;
}

// ─── Border radius map ───────────────────────────────────────
function getRadiusClass(r?: string): string {
  switch (r) {
    case 'none': return 'rounded-none';
    case 'sm': return 'rounded-md';
    case 'lg': return 'rounded-2xl';
    case 'full': return 'rounded-full';
    default: return 'rounded-xl';
  }
}

// ─── Spacing gap map ─────────────────────────────────────────
function getSpacingClass(s?: string): string {
  switch (s) {
    case 'compact': return 'gap-2';
    case 'relaxed': return 'gap-5';
    default: return 'gap-3';
  }
}

// ─── Animation class ─────────────────────────────────────────
function getAnimationStyle(anim?: string, index?: number): React.CSSProperties {
  const delay = `${(index ?? 0) * 60}ms`;
  switch (anim) {
    case 'fade-in': return { opacity: 0, animation: `bioFadeIn 0.4s ease-out ${delay} forwards` };
    case 'slide-up': return { opacity: 0, transform: 'translateY(12px)', animation: `bioSlideUp 0.4s ease-out ${delay} forwards` };
    case 'scale': return { opacity: 0, transform: 'scale(0.95)', animation: `bioScale 0.3s ease-out ${delay} forwards` };
    default: return {};
  }
}

// ─── Card style classes ──────────────────────────────────────
function getCardStyle(style?: string, palette?: Record<string, string>): React.CSSProperties {
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

// ─── Button style classes ────────────────────────────────────
function getButtonClasses(style: string, radius?: string): string {
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

// ─── Click tracking ──────────────────────────────────────────
function trackClick(siteId: string, linkId: string, eventType: string) {
  try {
    const body = JSON.stringify({ site_id: siteId, link_id: linkId, event_type: eventType });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/linkinbio/track', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/linkinbio/track', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
    }
  } catch { /* silent */ }
}

// ─── Profile Section ─────────────────────────────────────────
function ProfileSection({
  bio, palette, socials, onShare,
}: {
  bio: BioData;
  palette: Record<string, string>;
  socials: SocialLink[];
  onShare: () => void;
}) {
  return (
    <div className="flex flex-col items-center lg:items-center gap-4">
      {bio.cover_image_url && (
        <div className="w-full h-32 lg:h-36 rounded-2xl overflow-hidden -mb-10">
          <img src={bio.cover_image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div
        className={`w-24 h-24 lg:w-28 lg:h-28 overflow-hidden border-4 border-white shadow-lg ${bio.cover_image_url ? 'relative z-10' : ''} ${
          bio.avatar_shape === 'square' ? 'rounded-none' : bio.avatar_shape === 'rounded' ? 'rounded-2xl' : 'rounded-full'
        }`}
        style={{ backgroundColor: palette.primary || '#EC4899' }}
      >
        {bio.avatar_url ? (
          <img src={bio.avatar_url} alt={bio.display_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-2xl lg:text-3xl font-bold">
            {bio.display_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="text-center lg:text-center">
        <h1 className="text-xl lg:text-2xl font-bold" style={{ color: palette.text || '#0F172A' }}>
          {bio.display_name}
        </h1>
        {bio.bio_text && (
          <p className="mt-1.5 text-sm lg:text-base max-w-xs mx-auto leading-relaxed" style={{ color: palette.muted || '#64748B' }}>
            {bio.bio_text}
          </p>
        )}
      </div>
      {socials.length > 0 && (
        <div className="flex items-center gap-2.5 flex-wrap justify-center">
          {socials.map((s, i) => {
            const Icon = SOCIAL_ICONS[s.platform] || Globe;
            return (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center transition hover:scale-110"
                style={{ backgroundColor: `${palette.primary || '#EC4899'}15`, color: palette.primary || '#EC4899' }}>
                <Icon className="w-4 h-4" />
              </a>
            );
          })}
        </div>
      )}
      {bio.show_share_button && (
        <button onClick={onShare}
          className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-full transition hover:opacity-80"
          style={{ color: palette.primary || '#EC4899', backgroundColor: `${palette.primary || '#EC4899'}15` }}>
          <Share2 className="w-3.5 h-3.5" /> Share
        </button>
      )}
    </div>
  );
}

// ─── Link Card Renderer ──────────────────────────────────────
function LinkCard({
  link, bio, palette, productsMap, siteId, index,
}: {
  link: BioLink;
  bio: BioData;
  palette: Record<string, string>;
  productsMap: Record<string, any>;
  siteId: string;
  index: number;
}) {
  const animStyle = getAnimationStyle(bio.animation, index);
  const cardSt = getCardStyle(bio.card_style, palette);

  // ── Header (new V2) ──
  if (link.link_type === 'header') {
    const align = link.metadata?.alignment || 'center';
    const sizeMap: Record<string, string> = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl', '2xl': 'text-2xl' };
    const sizeClass = sizeMap[link.metadata?.size || 'xl'] || 'text-xl';
    return (
      <div className="w-full col-span-2" style={{ textAlign: align as any, ...animStyle }}>
        <h2 className={`${sizeClass} font-bold`} style={{ color: palette.text || '#0F172A' }}>{link.title}</h2>
        {link.metadata?.subtitle && (
          <p className="text-sm mt-1" style={{ color: palette.muted || '#64748B' }}>{link.metadata.subtitle}</p>
        )}
        {link.metadata?.show_divider && (
          <div className="mt-3 mx-auto" style={{
            width: align === 'center' ? '48px' : '48px',
            height: '3px',
            borderRadius: '9999px',
            backgroundColor: palette.primary || '#EC4899',
            marginLeft: align === 'left' ? 0 : align === 'right' ? 'auto' : 'auto',
            marginRight: align === 'right' ? 0 : align === 'left' ? 'auto' : 'auto',
          }} />
        )}
      </div>
    );
  }

  // ── Text (new V2) ──
  if (link.link_type === 'text') {
    const align = link.metadata?.alignment || 'left';
    const textSizeMap: Record<string, string> = { sm: 'text-xs', base: 'text-sm', lg: 'text-base' };
    const sizeClass = textSizeMap[link.metadata?.size || 'base'] || 'text-sm';
    return (
      <div className="w-full col-span-2" style={{ textAlign: align as any, ...animStyle }}>
        <p className={`${sizeClass} leading-relaxed whitespace-pre-wrap`} style={{ color: palette.text || '#0F172A' }}>
          {link.metadata?.content}
        </p>
      </div>
    );
  }

  // ── Heading (enhanced) ──
  if (link.link_type === 'heading') {
    const align = link.metadata?.alignment || 'left';
    const headingSizeMap: Record<string, string> = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };
    const sizeClass = headingSizeMap[link.metadata?.size || 'md'] || 'text-sm';
    return (
      <div className="pt-2 w-full col-span-2" style={{ textAlign: align as any, ...animStyle }}>
        <p className={`${sizeClass} font-bold`} style={{ color: palette.text || '#0F172A' }}>{link.title}</p>
        {link.metadata?.subtitle && (
          <p className="text-xs mt-0.5" style={{ color: palette.muted || '#64748B' }}>{link.metadata.subtitle}</p>
        )}
        {link.metadata?.show_divider && (
          <hr className="mt-2 border-t" style={{ borderColor: `${palette.text || '#0F172A'}15` }} />
        )}
      </div>
    );
  }

  // ── Divider ──
  if (link.link_type === 'divider') {
    return <hr className="border-t w-full col-span-2" style={{ borderColor: `${palette.text || '#0F172A'}15`, ...animStyle }} />;
  }

  // ── Social Icons (new V2) ──
  if (link.link_type === 'social_icons') {
    const iconLinks = link.metadata?.links ?? [];
    const style = link.metadata?.style || 'circle';
    const size = link.metadata?.size || 'md';
    const align = link.metadata?.alignment || 'center';
    const sizeMap = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' };
    const iconSizeMap = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' };
    const shapeClass = style === 'square' ? 'rounded-lg' : style === 'pill' ? 'rounded-xl' : 'rounded-full';

    return (
      <div className="w-full col-span-2" style={{ ...animStyle }}>
        <div className={`flex items-center gap-2.5 flex-wrap ${
          align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
        }`}>
          {iconLinks.filter((s: any) => s.url).map((s: any, i: number) => {
            const Icon = SOCIAL_ICONS[s.platform] || Globe;
            return (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                className={`${sizeMap[size as keyof typeof sizeMap] || sizeMap.md} ${shapeClass} flex items-center justify-center transition hover:scale-110`}
                style={{ backgroundColor: `${palette.primary || '#EC4899'}15`, color: palette.primary || '#EC4899' }}>
                <Icon className={iconSizeMap[size as keyof typeof iconSizeMap] || iconSizeMap.md} />
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  // ── HTML Embed (new V2) ──
  if (link.link_type === 'html_embed' && link.metadata?.html) {
    return (
      <div className="w-full col-span-2 overflow-hidden rounded-xl" style={animStyle}>
        <div
          dangerouslySetInnerHTML={{ __html: link.metadata.html }}
          style={{ height: `${link.metadata.height || 300}px` }}
          className="w-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
        />
      </div>
    );
  }

  // ── Spotify (new V2) ──
  if (link.link_type === 'spotify' && link.metadata?.spotify_url) {
    const url = link.metadata.spotify_url as string;
    // Convert open.spotify.com URL to embed URL
    const embedUrl = url.replace('open.spotify.com/', 'open.spotify.com/embed/');
    const isCompact = link.metadata?.embed_type === 'track';
    return (
      <div className="w-full col-span-2 rounded-xl overflow-hidden" style={animStyle}>
        <iframe
          src={embedUrl}
          className="w-full border-0"
          style={{ height: isCompact ? '152px' : '352px', borderRadius: '12px' }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={link.title || 'Spotify'}
        />
      </div>
    );
  }

  // ── Banner CTA (new V2) ──
  if (link.link_type === 'banner') {
    const bgColor = link.metadata?.bg_color || palette.primary || '#EC4899';
    return (
      <div className="w-full col-span-2" style={animStyle}>
        <div className={`${getRadiusClass(bio.border_radius)} p-5 text-center`}
          style={{ backgroundColor: bgColor, color: '#FFFFFF' }}>
          {link.title && <h3 className="text-lg font-bold">{link.title}</h3>}
          {link.metadata?.description && <p className="text-sm mt-1 opacity-90">{link.metadata.description}</p>}
          {link.metadata?.button_url && (
            <a href={link.metadata.button_url} target="_blank" rel="noopener noreferrer"
              onClick={() => trackClick(siteId, link.id, 'link_click')}
              className="inline-block mt-3 px-6 py-2.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-semibold transition">
              {link.metadata?.button_text || 'Learn More'}
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── Image (enhanced — caption, radius, ratio) ──
  if (link.link_type === 'image' && link.thumbnail_url) {
    const radius = link.metadata?.border_radius === 'none' ? 'rounded-none'
      : link.metadata?.border_radius === 'full' ? 'rounded-3xl'
      : 'rounded-xl';
    const ratio = link.metadata?.aspect_ratio && link.metadata.aspect_ratio !== 'auto'
      ? { aspectRatio: link.metadata.aspect_ratio } : {};

    const inner = (
      <>
        <img src={link.thumbnail_url} alt={link.metadata?.alt_text || ''} className={`w-full object-cover ${radius}`} style={ratio} />
        {link.metadata?.caption && (
          <p className="text-xs mt-1.5 text-center" style={{ color: palette.muted || '#64748B' }}>{link.metadata.caption}</p>
        )}
      </>
    );

    return link.metadata?.link_url ? (
      <a href={link.metadata.link_url} target="_blank" rel="noopener noreferrer"
        onClick={() => trackClick(siteId, link.id, 'link_click')}
        className="w-full col-span-2 hover:opacity-90 transition" style={animStyle}>{inner}</a>
    ) : (
      <div className="w-full col-span-2" style={animStyle}>{inner}</div>
    );
  }

  // ── Video Embed (enhanced — caption) ──
  if (link.link_type === 'video_embed' && link.metadata?.embed_url) {
    return (
      <div className="w-full col-span-2" style={animStyle}>
        <div className="rounded-xl overflow-hidden" style={{ aspectRatio: link.metadata.aspect_ratio || '16/9' }}>
          <iframe
            src={link.metadata.embed_url}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={link.title || 'Video'}
          />
        </div>
        {link.metadata?.caption && (
          <p className="text-xs mt-1.5 text-center" style={{ color: palette.muted || '#64748B' }}>{link.metadata.caption}</p>
        )}
      </div>
    );
  }

  // ── Email Capture (enhanced — description) ──
  if (link.link_type === 'email_capture') {
    return (
      <div className="w-full col-span-2" style={animStyle}>
        <div className={`${getRadiusClass(bio.border_radius)} border-2 p-4`}
          style={{ borderColor: `${palette.primary || '#EC4899'}30`, backgroundColor: `${palette.primary || '#EC4899'}08` }}>
          {link.title && (
            <p className="text-sm font-semibold mb-1" style={{ color: palette.text || '#0F172A' }}>{link.title}</p>
          )}
          {link.metadata?.description && (
            <p className="text-xs mb-2" style={{ color: palette.muted || '#64748B' }}>{link.metadata.description}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="email" placeholder={link.metadata?.placeholder || 'Enter your email'}
              className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: `${palette.text || '#0F172A'}20`, color: palette.text }} />
            <button className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white shrink-0 transition hover:opacity-90"
              style={{ backgroundColor: palette.primary || '#EC4899' }}>
              {link.metadata?.button_text || 'Subscribe'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Product Card ──
  if (link.link_type === 'product') {
    const product = link.product_id ? productsMap[link.product_id] : null;
    if (!product && !link.title && !link.thumbnail_url) return null;

    const displayImage = link.thumbnail_url || product?.thumbnail_url || null;
    const displayTitle = link.title || product?.name || 'Product';
    const displayPrice = product?.price;
    const originalPrice = link.metadata?.original_price ?? null;
    const showPrice = link.metadata?.show_price ?? true;
    const pricePos = link.metadata?.price_position || 'below';
    const layout = link.metadata?.layout || 'horizontal';
    const buttonPos = link.metadata?.button_position || 'right';
    const ctaText = link.metadata?.cta_text || 'Buy Now';
    const badge = link.metadata?.badge || null;
    const href = product ? `/p/product/${product.id}` : (link.url || '#');
    const rClass = getRadiusClass(bio.border_radius);
    const pri = palette.primary || '#EC4899';

    // ── Shared price block ──
    const PriceBlock = ({ className = '' }: { className?: string }) => showPrice && displayPrice !== undefined ? (
      <span className={`flex items-center gap-1.5 ${className}`}>
        <span className="font-bold" style={{ color: pri }}>
          {'\u20B9'}{displayPrice.toLocaleString('en-IN')}
        </span>
        {originalPrice !== null && Number(originalPrice) > 0 && (
          <span className="line-through opacity-50 text-[11px]" style={{ color: palette.muted || '#64748B' }}>
            {'\u20B9'}{Number(originalPrice).toLocaleString('en-IN')}
          </span>
        )}
      </span>
    ) : null;

    // ── Vertical card ──
    if (layout === 'vertical') {
      return (
        <a href={href}
          onClick={() => trackClick(siteId, link.id, 'product_click')}
          className={`w-full flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lg ${rClass}`}
          style={{ ...cardSt, ...animStyle }}>
          <div className="relative w-full">
            {displayImage ? (
              <img src={displayImage} alt={displayTitle} className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 flex items-center justify-center" style={{ backgroundColor: `${pri}15` }}>
                <Package className="w-10 h-10" style={{ color: pri }} />
              </div>
            )}
            {badge && (
              <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white leading-tight"
                style={{ backgroundColor: pri }}>
                {badge}
              </span>
            )}
          </div>
          <div className="p-4 flex flex-col gap-1">
            {pricePos === 'inline' ? (
              <div className="flex items-center justify-between gap-2 min-w-0">
                <p className="text-sm font-semibold leading-snug truncate flex-1" style={{ color: palette.text || '#0F172A' }}>{displayTitle}</p>
                <PriceBlock className="text-sm shrink-0" />
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold leading-snug" style={{ color: palette.text || '#0F172A' }}>{displayTitle}</p>
                <PriceBlock className="text-sm" />
              </>
            )}
            {link.description && (
              <p className="text-xs line-clamp-2" style={{ color: palette.muted || '#64748B' }}>{link.description}</p>
            )}
            <div className={`mt-1.5 flex ${buttonPos === 'center' ? 'justify-center' : buttonPos === 'right' ? 'justify-end' : ''}`}>
              <span className={`text-xs font-semibold px-4 py-2 ${rClass} ${buttonPos === 'full' ? 'w-full text-center' : ''}`}
                style={{ backgroundColor: pri, color: '#fff' }}>
                {ctaText}
              </span>
            </div>
          </div>
        </a>
      );
    }

    // ── Split card (large image left, all details right) ──
    if (layout === 'split') {
      return (
        <a href={href}
          onClick={() => trackClick(siteId, link.id, 'product_click')}
          className={`w-full flex flex-row overflow-hidden transition-all duration-200 hover:shadow-lg ${rClass}`}
          style={{ ...cardSt, ...animStyle }}>
          {/* Left: image ~40% width */}
          <div className="relative shrink-0 w-2/5">
            {displayImage ? (
              <img src={displayImage} alt={displayTitle} className="w-full h-full object-cover min-h-27.5" />
            ) : (
              <div className="w-full h-full min-h-27.5 flex items-center justify-center" style={{ backgroundColor: `${pri}15` }}>
                <Package className="w-8 h-8" style={{ color: pri }} />
              </div>
            )}
            {badge && (
              <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white leading-tight"
                style={{ backgroundColor: pri }}>
                {badge}
              </span>
            )}
          </div>
          {/* Right: details */}
          <div className="flex-1 min-w-0 flex flex-col justify-between p-3 gap-1">
            <div className="flex flex-col gap-0.5">
              {pricePos === 'inline' ? (
                <div className="flex items-start justify-between gap-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug flex-1" style={{ color: palette.text || '#0F172A' }}>{displayTitle}</p>
                  <PriceBlock className="text-xs shrink-0 mt-0.5" />
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold leading-snug" style={{ color: palette.text || '#0F172A' }}>{displayTitle}</p>
                  <PriceBlock className="text-xs" />
                </>
              )}
              {link.description && (
                <p className="text-xs line-clamp-2 mt-0.5" style={{ color: palette.muted || '#64748B' }}>{link.description}</p>
              )}
            </div>
            <div className={`mt-2 flex ${buttonPos === 'center' ? 'justify-center' : buttonPos === 'right' ? 'justify-end' : ''}`}>
              <span className={`text-xs font-semibold px-3 py-1.5 ${rClass} ${buttonPos === 'full' ? 'w-full text-center' : ''}`}
                style={{ backgroundColor: pri, color: '#fff' }}>
                {ctaText}
              </span>
            </div>
          </div>
        </a>
      );
    }

    // ── Horizontal card (default) ──
    return (
      <a href={href}
        onClick={() => trackClick(siteId, link.id, 'product_click')}
        className={`${getButtonClasses(bio.button_style, bio.border_radius)} group`}
        style={{ ...cardSt, ...animStyle }}>
        <div className="relative shrink-0">
          {displayImage ? (
            <img src={displayImage} alt={displayTitle} className="w-14 h-14 rounded-lg object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${pri}15` }}>
              <Package className="w-6 h-6" style={{ color: pri }} />
            </div>
          )}
          {badge && (
            <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none"
              style={{ backgroundColor: pri }}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {pricePos === 'inline' ? (
            <div className="flex items-center justify-between gap-1 min-w-0">
              <p className="text-sm font-semibold truncate flex-1" style={{ color: palette.text || '#0F172A' }}>{displayTitle}</p>
              <PriceBlock className="text-xs shrink-0" />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold truncate" style={{ color: palette.text || '#0F172A' }}>{displayTitle}</p>
              <PriceBlock className="text-xs mt-0.5" />
            </>
          )}
          {link.description && (
            <p className="text-xs mt-0.5 truncate" style={{ color: palette.muted || '#64748B' }}>{link.description}</p>
          )}
        </div>
        {buttonPos !== 'full' && (
          <span className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: pri, color: '#fff' }}>
            {ctaText}
          </span>
        )}
      </a>
    );
  }

  // ── Default URL Link (enhanced — animation support via metadata) ──
  if (link.link_type === 'url' || link.url) {
    const IconComponent = link.icon_type === 'youtube' ? Play
      : link.icon_type === 'instagram' ? Instagram
      : link.icon_type === 'twitter' ? Twitter
      : link.icon_type === 'spotify' ? Music2
      : link.icon_type === 'tiktok' ? Music
      : link.icon_type === 'github' ? Github
      : link.icon_type === 'linkedin' ? Linkedin
      : ExternalLink;

    const isFeatured = link.style_variant === 'featured';
    const linkAnim = link.metadata?.animation || 'none';

    return (
      <a href={link.url || '#'} target="_blank" rel="noopener noreferrer"
        onClick={() => trackClick(siteId, link.id, 'link_click')}
        className={`${getButtonClasses(bio.button_style, bio.border_radius)} group ${isFeatured ? 'py-5' : ''} ${
          linkAnim === 'pulse' ? 'hover:animate-pulse' :
          linkAnim === 'shine' ? 'bio-shine' :
          linkAnim === 'glow' ? 'bio-glow' : ''
        }`}
        style={{ ...cardSt, ...animStyle }}>
        {link.thumbnail_url ? (
          <img src={link.thumbnail_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${palette.primary || '#EC4899'}15` }}>
            <IconComponent className="w-4 h-4" style={{ color: palette.primary || '#EC4899' }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold truncate ${isFeatured ? 'text-base' : 'text-sm'}`} style={{ color: palette.text || '#0F172A' }}>
            {link.title || 'Link'}
          </p>
          {link.description && (
            <p className="text-xs mt-0.5 truncate" style={{ color: palette.muted || '#64748B' }}>{link.description}</p>
          )}
        </div>
        <ExternalLink className="w-4 h-4 shrink-0 opacity-40 group-hover:opacity-100 transition" style={{ color: palette.text }} />
      </a>
    );
  }

  return null;
}

// ─── Animation keyframes (injected once) ─────────────────────
function AnimationStyles() {
  return (
    <style>{`
      @keyframes bioFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes bioSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes bioScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      .bio-shine { position: relative; overflow: hidden; }
      .bio-shine::after {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 45%, rgba(255,255,255,0.3) 50%, transparent 55%);
        transform: translateX(-100%); transition: none;
      }
      .bio-shine:hover::after { animation: bioShine 0.6s ease-in-out forwards; }
      @keyframes bioShine { to { transform: translateX(100%); } }
      .bio-glow:hover { box-shadow: 0 0 20px var(--creator-primary, #EC4899)40; }
    `}</style>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function LinkInBioPage({ siteId, bio, links, productsMap, palette }: Props) {
  const [liveBio, setLiveBio] = useState<BioData | null>(null);
  const [liveLinks, setLiveLinks] = useState<BioLink[] | null>(null);
  const [livePalette, setLivePalette] = useState<Record<string, string> | null>(null);
  const [liveProductsMap, setLiveProductsMap] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const msg = e.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'bio-content-update') {
        if (msg.bio) setLiveBio(msg.bio);
        if (msg.links) setLiveLinks(msg.links);
        if (msg.productsMap) setLiveProductsMap(msg.productsMap);
      }
      if (msg.type === 'theme-update' && msg.palette) {
        setLivePalette(msg.palette);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const activeBio = liveBio ?? bio;
  const activeLinks = liveLinks ?? links;
  const activePalette = livePalette ?? palette;
  const activeProductsMap = liveProductsMap ?? productsMap;

  useEffect(() => {
    trackClick(siteId, '', 'page_view');
  }, [siteId]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ url, title: activeBio.display_name }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  // Background style
  const bgStyle: React.CSSProperties = {};
  if (activeBio.background_type === 'gradient' && activeBio.background_value) {
    bgStyle.background = activeBio.background_value;
  } else if (activeBio.background_type === 'image' && activeBio.background_value) {
    bgStyle.backgroundImage = `url(${activeBio.background_value})`;
    bgStyle.backgroundSize = 'cover';
    bgStyle.backgroundPosition = 'center';
  }

  // Font
  bgStyle.fontFamily = getFontClass(activeBio.font_family);

  const socials = (activeBio.social_links ?? []).filter(s => s.url && s.is_visible !== false);
  const spacingClass = getSpacingClass(activeBio.spacing);

  return (
    <div className="min-h-screen" style={bgStyle}>
      <FontLink font={activeBio.font_family} />
      <AnimationStyles />

      <div className="w-full max-w-6xl mx-auto px-4 py-8 lg:py-12">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

          {/* ── Left: Profile (sticky on desktop) ── */}
          <div className="w-full lg:w-80 lg:shrink-0">
            <div className="lg:sticky lg:top-12">
              <ProfileSection bio={activeBio} palette={activePalette} socials={socials} onShare={handleShare} />
            </div>
          </div>

          {/* ── Right: Links ── */}
          <div className="flex-1 min-w-0 max-w-lg mx-auto lg:mx-0 w-full">
            <div className={`w-full flex flex-col ${spacingClass} ${activeBio.layout_style === 'grid' ? 'sm:grid sm:grid-cols-2' : ''}`}>
              {activeLinks.map((link, i) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  bio={activeBio}
                  palette={activePalette}
                  productsMap={activeProductsMap}
                  siteId={siteId}
                  index={i}
                />
              ))}
            </div>

            {activeBio.show_watermark && (
              <a href="https://digione.ai" target="_blank" rel="noopener noreferrer"
                className="mt-8 flex items-center justify-center lg:justify-start gap-1.5 text-xs font-medium opacity-50 hover:opacity-80 transition"
                style={{ color: activePalette.muted || '#64748B' }}>
                <div className="w-4 h-4 bg-linear-to-br from-indigo-600 to-violet-600 rounded flex items-center justify-center text-white text-[7px] font-extrabold">
                  D1
                </div>
                Made with DigiOne
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
