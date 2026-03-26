'use client';
// LinkInBioPage — public-facing bio page renderer.
// Desktop: profile pinned left, links right. Mobile: stacked.

import React, { useEffect, useState } from 'react';
import {
  Instagram, Twitter, Youtube, Linkedin, Github, Globe, Music,
  ExternalLink, Share2, Package, Play, Mail,
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
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  github: Github,
  tiktok: Music,
  website: Globe,
};

// ─── Button style classes ────────────────────────────────────
function getButtonClasses(style: string): string {
  const base = 'w-full flex items-center gap-3 px-5 py-3.5 transition-all duration-200 text-left';
  switch (style) {
    case 'pill':
      return `${base} rounded-full border-2 border-[--creator-text]/10 hover:border-[--creator-primary] hover:shadow-lg`;
    case 'sharp':
      return `${base} rounded-none border-2 border-[--creator-text]/10 hover:border-[--creator-primary] hover:shadow-lg`;
    case 'outline':
      return `${base} rounded-xl border-2 border-[--creator-primary]/30 hover:border-[--creator-primary] hover:bg-[--creator-primary]/5`;
    case 'shadow':
      return `${base} rounded-xl border border-[--creator-text]/5 shadow-md hover:shadow-xl hover:translate-y-[-1px]`;
    default:
      return `${base} rounded-xl border-2 border-[--creator-text]/10 hover:border-[--creator-primary] hover:shadow-lg`;
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
      {/* Cover */}
      {bio.cover_image_url && (
        <div className="w-full h-32 lg:h-36 rounded-2xl overflow-hidden mb-[-40px]">
          <img src={bio.cover_image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Avatar */}
      <div
        className={`w-24 h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden border-4 border-white shadow-lg ${bio.cover_image_url ? 'relative z-10' : ''}`}
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

      {/* Name + Bio */}
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

      {/* Social Icons */}
      {socials.length > 0 && (
        <div className="flex items-center gap-2.5 flex-wrap justify-center">
          {socials.map((s, i) => {
            const Icon = SOCIAL_ICONS[s.platform] || Globe;
            return (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center transition hover:scale-110"
                style={{
                  backgroundColor: `${palette.primary || '#EC4899'}15`,
                  color: palette.primary || '#EC4899',
                }}
              >
                <Icon className="w-4 h-4" />
              </a>
            );
          })}
        </div>
      )}

      {/* Share button */}
      {bio.show_share_button && (
        <button
          onClick={onShare}
          className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-full transition hover:opacity-80"
          style={{ color: palette.primary || '#EC4899', backgroundColor: `${palette.primary || '#EC4899'}15` }}
        >
          <Share2 className="w-3.5 h-3.5" /> Share
        </button>
      )}
    </div>
  );
}

// ─── Link Card Renderer ──────────────────────────────────────
function LinkCard({
  link, bio, palette, productsMap, siteId,
}: {
  link: BioLink;
  bio: BioData;
  palette: Record<string, string>;
  productsMap: Record<string, any>;
  siteId: string;
}) {
  // ── Heading ──
  if (link.link_type === 'heading') {
    return (
      <div className="pt-2 w-full col-span-2">
        <p className="text-sm font-bold" style={{ color: palette.text || '#0F172A' }}>
          {link.title}
        </p>
      </div>
    );
  }

  // ── Divider ──
  if (link.link_type === 'divider') {
    return <hr className="border-t w-full col-span-2" style={{ borderColor: `${palette.text || '#0F172A'}15` }} />;
  }

  // ── Image ──
  if (link.link_type === 'image' && link.thumbnail_url) {
    const inner = <img src={link.thumbnail_url} alt={link.metadata?.alt_text || ''} className="w-full object-cover rounded-xl" />;
    return link.metadata?.link_url ? (
      <a href={link.metadata.link_url} target="_blank" rel="noopener noreferrer"
        onClick={() => trackClick(siteId, link.id, 'link_click')}
        className="w-full col-span-2 rounded-xl overflow-hidden hover:opacity-90 transition">{inner}</a>
    ) : (
      <div className="w-full col-span-2 rounded-xl overflow-hidden">{inner}</div>
    );
  }

  // ── Video Embed ──
  if (link.link_type === 'video_embed' && link.metadata?.embed_url) {
    return (
      <div className="w-full col-span-2 rounded-xl overflow-hidden" style={{ aspectRatio: link.metadata.aspect_ratio || '16/9' }}>
        <iframe
          src={link.metadata.embed_url}
          className="w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          title={link.title || 'Video'}
        />
      </div>
    );
  }

  // ── Email Capture ──
  if (link.link_type === 'email_capture') {
    return (
      <div className="w-full col-span-2">
        <div
          className="rounded-xl border-2 p-4"
          style={{ borderColor: `${palette.primary || '#EC4899'}30`, backgroundColor: `${palette.primary || '#EC4899'}08` }}
        >
          {link.title && (
            <p className="text-sm font-semibold mb-2" style={{ color: palette.text || '#0F172A' }}>{link.title}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              placeholder={link.metadata?.placeholder || 'Enter your email'}
              className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: `${palette.text || '#0F172A'}20`, color: palette.text }}
            />
            <button
              className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white shrink-0 transition hover:opacity-90"
              style={{ backgroundColor: palette.primary || '#EC4899' }}
            >
              {link.metadata?.button_text || 'Subscribe'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Product Card ──
  if (link.link_type === 'product' && link.product_id) {
    const product = productsMap[link.product_id];
    if (!product) return null;

    return (
      <a
        href={`/p/product/${product.id}`}
        onClick={() => trackClick(siteId, link.id, 'product_click')}
        className={`${getButtonClasses(bio.button_style)} group`}
        style={{ backgroundColor: `${palette.surface || '#FFFFFF'}` }}
      >
        {product.thumbnail_url ? (
          <img src={product.thumbnail_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${palette.primary}15` }}>
            <Package className="w-5 h-5" style={{ color: palette.primary }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: palette.text || '#0F172A' }}>
            {product.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: palette.muted || '#64748B' }}>
            {link.metadata?.cta_text || 'Buy Now'} &middot; {'\u20B9'}{product.price?.toLocaleString('en-IN')}
          </p>
        </div>
        <ExternalLink className="w-4 h-4 shrink-0 opacity-40 group-hover:opacity-100 transition" style={{ color: palette.text }} />
      </a>
    );
  }

  // ── Default URL Link ──
  if (link.link_type === 'url' || link.url) {
    const IconComponent = link.icon_type === 'youtube' ? Play
      : link.icon_type === 'instagram' ? Instagram
      : link.icon_type === 'twitter' ? Twitter
      : link.icon_type === 'spotify' ? Music
      : link.icon_type === 'tiktok' ? Music
      : ExternalLink;

    const isFeatured = link.style_variant === 'featured';

    return (
      <a
        href={link.url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackClick(siteId, link.id, 'link_click')}
        className={`${getButtonClasses(bio.button_style)} group ${isFeatured ? 'py-5' : ''}`}
        style={{ backgroundColor: `${palette.surface || '#FFFFFF'}` }}
      >
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
            <p className="text-xs mt-0.5 truncate" style={{ color: palette.muted || '#64748B' }}>
              {link.description}
            </p>
          )}
        </div>
        <ExternalLink className="w-4 h-4 shrink-0 opacity-40 group-hover:opacity-100 transition" style={{ color: palette.text }} />
      </a>
    );
  }

  return null;
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

  const socials = (activeBio.social_links ?? []).filter(s => s.url && s.is_visible !== false);

  return (
    <div className="min-h-screen" style={bgStyle}>
      <div className="w-full max-w-6xl mx-auto px-4 py-8 lg:py-12">

        {/* ── Desktop: two-column | Mobile: stacked ── */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

          {/* ── Left: Profile (sticky on desktop) ── */}
          <div className="w-full lg:w-80 lg:shrink-0">
            <div className="lg:sticky lg:top-12">
              <ProfileSection
                bio={activeBio}
                palette={activePalette}
                socials={socials}
                onShare={handleShare}
              />
            </div>
          </div>

          {/* ── Right: Links ── */}
          <div className="flex-1 min-w-0 max-w-lg mx-auto lg:mx-0 w-full">
            <div className={`w-full flex flex-col gap-3 ${activeBio.layout_style === 'grid' ? 'sm:grid sm:grid-cols-2' : ''}`}>
              {activeLinks.map(link => (
                <LinkCard
                  key={link.id}
                  link={link}
                  bio={activeBio}
                  palette={activePalette}
                  productsMap={activeProductsMap}
                  siteId={siteId}
                />
              ))}
            </div>

            {/* ── Watermark ── */}
            {activeBio.show_watermark && (
              <a
                href="https://digione.in"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 flex items-center justify-center lg:justify-start gap-1.5 text-xs font-medium opacity-50 hover:opacity-80 transition"
                style={{ color: activePalette.muted || '#64748B' }}
              >
                <div className="w-4 h-4 bg-gradient-to-br from-indigo-600 to-violet-600 rounded flex items-center justify-center text-white text-[7px] font-extrabold">
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
