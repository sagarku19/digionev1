'use client';
// LinkInBioPage V2 — public-facing bio page renderer.
// Desktop: profile pinned left, links right. Mobile: stacked.
// New: header, text, html_embed, social_icons, spotify, banner blocks.
// New: font family, card style, animation, border radius, spacing.

import React, { useEffect, useState } from 'react';
import { Globe, Share2 } from 'lucide-react';
import {
  type BioData, type BioLink, type SocialLink, type ProductLite,
  SOCIAL_ICONS, trackClick,
} from './linkinbio/blockRenderers/_shared';
import { BlockRenderer } from './linkinbio/blockRenderers/registry';

type Props = {
  siteId: string;
  username?: string;
  bio: BioData;
  links: BioLink[];
  productsMap: Record<string, ProductLite>;
  palette: Record<string, string>;
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

// ─── Spacing gap map ─────────────────────────────────────────
function getSpacingClass(s?: string): string {
  switch (s) {
    case 'compact': return 'gap-2';
    case 'relaxed': return 'gap-5';
    default: return 'gap-3';
  }
}

// ─── Profile Section ─────────────────────────────────────────
function ProfileSection({
  bio, palette, socials, onShare, username,
}: {
  bio: BioData;
  palette: Record<string, string>;
  socials: SocialLink[];
  onShare: () => void;
  username?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-5 text-center w-full">
      {bio.cover_image_url && (
        <div className="w-full h-32 rounded-2xl overflow-hidden -mb-12">
          <img src={bio.cover_image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div
        className={`w-24 h-24 overflow-hidden shadow-lg shrink-0 ${bio.avatar_border !== false ? 'border-4' : ''} ${bio.cover_image_url ? 'relative z-10' : ''} ${
          bio.avatar_shape === 'square' ? 'rounded-none' : bio.avatar_shape === 'rounded' ? 'rounded-2xl' : 'rounded-full'
        }`}
        style={{ backgroundColor: palette.primary || '#EC4899', ...(bio.avatar_border !== false ? { borderColor: palette.border || palette.background || '#fff' } : {}) }}
      >
        {bio.avatar_url ? (
          <img src={bio.avatar_url} alt={bio.display_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
            {bio.display_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-bold leading-tight" style={{ color: palette.text || '#0F172A' }}>
          {bio.display_name}
        </h1>
        {username && (
          <p className="text-sm font-medium" style={{ color: palette.muted || '#64748B' }}>
            @{username}
          </p>
        )}
        {bio.bio_text && (
          <p className="mt-2 text-sm leading-relaxed max-w-65" style={{ color: palette.muted || '#64748B' }}>
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
                style={{ backgroundColor: `${palette.primary || '#EC4899'}18`, color: palette.primary || '#EC4899' }}>
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
export default function LinkInBioPage({ siteId, username, bio, links, productsMap, palette }: Props) {
  const [liveBio, setLiveBio] = useState<BioData | null>(null);
  const [liveLinks, setLiveLinks] = useState<BioLink[] | null>(null);
  const [livePalette, setLivePalette] = useState<Record<string, string> | null>(null);
  const [liveProductsMap, setLiveProductsMap] = useState<Record<string, ProductLite> | null>(null);

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
  if (activeBio.background_type === 'solid') {
    bgStyle.backgroundColor = activePalette.background || '#FFFFFF';
  } else if (activeBio.background_type === 'gradient' && activeBio.background_value) {
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

  // Inject CSS custom properties so Tailwind arbitrary-value classes like
  // border-[--creator-primary] resolve to actual palette colours.
  const cssVars: Record<string, string> = {
    '--creator-primary': activePalette.primary || '#EC4899',
    '--creator-text': activePalette.text || '#0F172A',
    '--creator-muted': activePalette.muted || '#64748B',
    '--creator-surface': activePalette.surface || '#FFFFFF',
    '--creator-background': activePalette.background || '#FFFFFF',
    '--creator-border': activePalette.border || activePalette.background || '#FFFFFF',
  };

  return (
    <div className="min-h-screen" style={{ ...bgStyle, ...cssVars } as React.CSSProperties}>
      <FontLink font={activeBio.font_family} />
      <AnimationStyles />

      {/* ── Centered max-width container — flex split on desktop ── */}
      <div className="max-w-5xl mx-auto min-h-screen flex flex-col lg:flex-row lg:gap-4">

        {/* ── Left Panel: profile ── */}
        <div className="w-full lg:w-2/5 lg:shrink-0">
          {/* Mobile */}
          <div className="lg:hidden px-8 py-10">
            <ProfileSection bio={activeBio} palette={activePalette} socials={socials} onShare={handleShare} username={username} />
          </div>
          {/* Desktop: sticky, full-height, vertically centered */}
          <div className="hidden lg:flex flex-col items-center justify-center pl-2 pr-30" style={{ height: '100vh', position: 'sticky', top: 0 }}>
            <ProfileSection bio={activeBio} palette={activePalette} socials={socials} onShare={handleShare} username={username} />
          </div>
        </div>

        {/* ── Right Panel: scrollable links ── */}
        <div className="flex-1 min-w-0 px-4 lg:px-10 py-6 lg:py-12">
          <div className={activeBio.layout_style === 'grid' ? `w-full grid grid-cols-2 ${spacingClass}` : `w-full flex flex-col ${spacingClass}`}>
            {activeLinks.map((link, i) => (
              <BlockRenderer
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
              className="mt-8 flex items-center justify-center gap-1.5 text-xs font-medium opacity-50 hover:opacity-80 transition"
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
  );
}
