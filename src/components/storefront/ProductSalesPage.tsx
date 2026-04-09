'use client';
// ProductSalesPage — single product sales page (site_type: single).
// DB tables: site_singlepage, products (read via props)

import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, Shield, Star, ChevronDown,
  Quote, CheckCircle2, Clock, Sparkles,
  Zap, Rocket, Heart, Gift,
  BookOpen, Code, Globe, Layers, Lightbulb, TrendingUp, Users,
  MessageCircle,
} from 'lucide-react';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const getCSSVariables = (palette: any) => {
  if (!palette) return {};
  return {
    '--brand-primary': palette.primary || '#EC4899',
    '--brand-secondary': palette.secondary || '#8B5CF6',
    '--brand-foreground': '#FFFFFF',
    '--bg-primary': palette.surface || '#FFFFFF',
    '--bg-secondary': palette.surface ? `${palette.surface}f2` : '#F9FAFB',
    '--bg-tertiary': palette.surface ? `${palette.surface}e0` : '#F3F4F6',
    '--text-primary': palette.text || '#0F172A',
    '--text-secondary': palette.muted || '#64748B',
    '--border-color': palette.border || '#E2E8F0',
  } as React.CSSProperties;
};

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}


const FEATURE_ICONS: Record<string, React.ElementType> = {
  zap: Zap, rocket: Rocket, shield: Shield, heart: Heart, gift: Gift, star: Star,
  book: BookOpen, code: Code, globe: Globe, layers: Layers, lightbulb: Lightbulb,
  trending: TrendingUp, users: Users, check: CheckCircle2,
};

export default function ProductSalesPage({ singlePage, palette }: { siteId?: string; singlePage: any; palette?: any }) {
  const product = Array.isArray(singlePage?.products) ? singlePage.products[0] : singlePage?.products;

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  // ── Live preview state (populated via postMessage from editor) ──
  const [liveContent, setLiveContent] = useState<any>(null);
  const [liveAppearance, setLiveAppearance] = useState<any>(null);
  const [livePalette, setLivePalette] = useState<any>(null);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const msg = e.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'sp-content-update') {
        if (msg.content) setLiveContent(msg.content);
        if (msg.appearance) setLiveAppearance(msg.appearance);
        if (msg.palette) setLivePalette(msg.palette);
      }
      if (msg.type === 'theme-update' && msg.palette) {
        setLivePalette(msg.palette);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Merge live data over server-rendered props
  const activePalette = livePalette ?? palette ?? {};
  const c = liveContent; // shorthand for live content

  // ── Extract values (live content takes priority over DB) ──
  const price = product?.price ?? 0;
  const heroImage: string = c?.heroImage || singlePage?.hero_image_url || product?.thumbnail_url || '';
  const features: { title: string; description: string; icon: string }[] = c?.features ?? (singlePage?.metadata as any)?.features ?? [];
  const creatorProfile = c?.creatorProfile ?? (singlePage?.metadata as any)?.creator_profile ?? { name: '', avatarUrl: '', bio: '' };
  const faqs: any[] = c?.faqs ?? singlePage?.faq_items ?? [];
  const testimonials: any[] = c?.testimonials ?? singlePage?.testimonials ?? [];
  const guaranteeBadges: string[] = c?.whatsIncluded ?? singlePage?.guarantee_badges ?? [];

  const showBuyNow = singlePage?.show_buy_now ?? true;
  const showAddToCart = singlePage?.show_add_to_cart ?? false;
  const countdownEnd = singlePage?.countdown_end_at;

  const themeSettings = liveAppearance ?? (singlePage?.theme as any) ?? {};
  const buttonStyle = themeSettings.buttonStyle || 'rounded';
  const backgroundType = themeSettings.backgroundType || 'solid';
  const backgroundValue = themeSettings.backgroundValue || '';
  const showWatermark = themeSettings.showWatermark ?? true;

  // ── Countdown ──
  useEffect(() => {
    if (!countdownEnd) return;
    const end = new Date(countdownEnd).getTime();
    const interval = setInterval(() => {
      const distance = end - Date.now();
      if (distance < 0) { clearInterval(interval); setTimeLeft({ d: 0, h: 0, m: 0, s: 0 }); return; }
      setTimeLeft({
        d: Math.floor(distance / 86400000),
        h: Math.floor((distance % 86400000) / 3600000),
        m: Math.floor((distance % 3600000) / 60000),
        s: Math.floor((distance % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownEnd]);

  // ── Styles ──
  const getButtonRadius = () => ({ pill: 'rounded-full', sharp: 'rounded-none' } as Record<string, string>)[buttonStyle] ?? 'rounded-2xl';

  const customStyle: React.CSSProperties = { ...getCSSVariables(activePalette), minHeight: '100vh', position: 'relative' };
  if (backgroundType === 'solid') customStyle.backgroundColor = backgroundValue || 'var(--bg-primary)';
  else if (backgroundType === 'gradient') customStyle.backgroundImage = backgroundValue;
  else if (backgroundType === 'image') { customStyle.backgroundImage = `url(${backgroundValue})`; customStyle.backgroundSize = 'cover'; customStyle.backgroundPosition = 'center'; }

  return (
    <div style={customStyle} className="min-h-screen font-sans text-[var(--text-primary)] antialiased transition-colors duration-300 relative">
      {backgroundType === 'image' && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0" />}

      {/* ─── LOGO / HEADER ─── */}
      {(() => {
        const logoUrl: string = c?.logoUrl || (singlePage?.metadata as any)?.logo_url || '';
        const headerText: string = c?.headerText || (singlePage?.metadata as any)?.header_text || '';
        const showLogo: boolean = c?.showLogo ?? (singlePage?.metadata as any)?.show_logo ?? true;
        const placement: string = c?.logoPlacement || (singlePage?.metadata as any)?.logo_placement || 'top-bar';
        const alignment: string = c?.headerAlignment || (singlePage?.metadata as any)?.header_alignment || 'center';
        const logoShape: string = c?.logoShape || (singlePage?.metadata as any)?.logo_shape || 'free';
        const gap: string = c?.logoHeaderGap || (singlePage?.metadata as any)?.logo_header_gap || 'md';
        const divider: boolean = c?.headerDivider ?? (singlePage?.metadata as any)?.header_divider ?? false;
        const headerWidth: string = c?.headerWidth || (singlePage?.metadata as any)?.header_width || 'full';

        if ((!logoUrl || !showLogo) && !headerText) return null;
        if (placement === 'inline-hero') return null; // rendered inside hero

        const alignClass = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';
        const gapPx = gap === 'none' ? 'gap-0' : gap === 'sm' ? 'gap-2' : gap === 'lg' ? 'gap-6' : 'gap-4';
        const maxW = headerWidth === 'sm' ? 'max-w-[640px]' : headerWidth === 'md' ? 'max-w-[768px]' : headerWidth === 'lg' ? 'max-w-[1024px]' : 'max-w-full';
        const shapeClass = logoShape === 'circle' ? 'rounded-full' : logoShape === 'square' ? 'rounded-lg' : '';
        const isFree = logoShape === 'free';
        const logoSizeClass = isFree ? 'h-10 max-w-[160px] object-contain' : 'w-10 h-10 object-cover';
        const isTopBar = placement === 'top-bar';

        return (
          <div className={`relative z-10 w-full px-5 sm:px-8 ${isTopBar ? 'pt-4 pb-0' : ''}`}>
            <div className={`mx-auto ${maxW}`}>
              <div className={`flex items-center ${gapPx} ${alignClass}`}>
                {logoUrl && showLogo && (
                  <img src={logoUrl} alt="Logo" className={`${logoSizeClass} ${shapeClass} drop-shadow-sm hover:opacity-90 transition-opacity`} />
                )}
                {headerText && (
                  <span className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-primary)]/80 hover:opacity-80 transition-opacity">{headerText}</span>
                )}
              </div>
              {divider && <hr className="mt-2 border-[var(--border-color)]/50" />}
            </div>
          </div>
        );
      })()}

      <div className="relative z-10 py-6 px-5 sm:px-8 max-w-5xl mx-auto space-y-6 pb-32">

        {/* ─── HERO IMAGE ─── */}
        {heroImage && (
          <div className="w-full relative group">
            {/* Inline-hero logo overlay */}
            {(() => {
              const logoUrl: string = c?.logoUrl || (singlePage?.metadata as any)?.logo_url || '';
              const headerText: string = c?.headerText || (singlePage?.metadata as any)?.header_text || '';
              const showLogo: boolean = c?.showLogo ?? (singlePage?.metadata as any)?.show_logo ?? true;
              const placement: string = c?.logoPlacement || (singlePage?.metadata as any)?.logo_placement || 'top-bar';
              const alignment: string = c?.headerAlignment || (singlePage?.metadata as any)?.header_alignment || 'center';
              const logoShape: string = c?.logoShape || (singlePage?.metadata as any)?.logo_shape || 'free';
              const gap: string = c?.logoHeaderGap || (singlePage?.metadata as any)?.logo_header_gap || 'md';

              if (placement !== 'inline-hero') return null;
              if ((!logoUrl || !showLogo) && !headerText) return null;

              const alignClass = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';
              const gapPx = gap === 'none' ? 'gap-0' : gap === 'sm' ? 'gap-1' : gap === 'lg' ? 'gap-4' : 'gap-2';
              const shapeClass = logoShape === 'circle' ? 'rounded-full' : logoShape === 'square' ? 'rounded-md' : '';
              const isFree = logoShape === 'free';
              const logoSizeClass = isFree ? 'h-9 max-w-[140px] object-contain' : 'w-9 h-9 object-cover';

              return (
                <div className={`absolute top-4 left-4 right-4 z-10 flex items-center ${gapPx} ${alignClass}`}>
                  {logoUrl && showLogo && (
                    <img src={logoUrl} alt="Logo" className={`${logoSizeClass} ${shapeClass} drop-shadow-lg`} />
                  )}
                  {headerText && (
                    <span className="text-base font-bold text-white drop-shadow-lg">{headerText}</span>
                  )}
                </div>
              );
            })()}
            <div className="absolute -inset-2 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] rounded-[2rem] blur-xl opacity-20 group-hover:opacity-30 transition duration-1000" />
            <img src={heroImage} alt="Hero" className="relative w-full object-cover shadow-2xl border border-[var(--border-color)]/30 rounded-3xl" />
          </div>
        )}

        {/* ─── PRICE SECTION ─── */}
        {(() => {
          const fakePrice: number = c?.fakePrice || 0;
          return (
            <div className="space-y-4 py-3 px-5 sm:px-0 border-b border-[var(--border-color)]">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)]">{price === 0 ? 'Free' : formatINR(price)}</span>
                {fakePrice > price && (
                  <span className="text-lg sm:text-xl text-[var(--text-secondary)] line-through">{formatINR(fakePrice)}</span>
                )}
              </div>
              {fakePrice > price && (
                <p className="text-sm text-green-600 dark:text-green-400 font-semibold">
                  Save {formatINR(fakePrice - price)}
                </p>
              )}

              {/* Countdown Timer */}
              {countdownEnd && timeLeft && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex flex-col">
                  <div className="text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Limited Time Offer
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {([['d', 'D'], ['h', 'H'], ['m', 'M'], ['s', 'S']] as const).map(([key, label], i) => (
                      <React.Fragment key={key}>
                        {i > 0 && <span className="text-red-500/30">:</span>}
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-red-600 dark:text-red-400">
                            {String((timeLeft as any)[key]).padStart(2, '0')}
                          </span>
                          <span className="text-[10px] text-red-500/70">{label}</span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── CONTENT BLOCKS ─── */}
        {(() => {
          const blocks: any[] = c?.contentBlocks ?? (singlePage?.metadata as any)?.content_blocks ?? [];
          if (!blocks.length) return null;

          const getVideoEmbed = (url: string) => {
            try {
              const u = new URL(url);
              if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
                const id = u.searchParams.get('v') || u.pathname.split('/').pop() || '';
                return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
              }
              if (u.hostname.includes('vimeo.com')) {
                const id = u.pathname.split('/').pop() || '';
                return `https://player.vimeo.com/video/${id}`;
              }
            } catch {}
            return url;
          };

          return (
            <div className="space-y-6">
              {blocks.map((block: any) => {
                const meta = block.metadata || {};

                if (block.type === 'heading') {
                  const size = meta.size || 'h2';
                  const cls = size === 'h1' ? 'text-3xl md:text-4xl lg:text-5xl' : size === 'h3' ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl';
                  return (
                    <h2 key={block.id} className={`${cls} font-extrabold text-[var(--text-primary)] leading-tight`}>
                      {block.content}
                    </h2>
                  );
                }
                if (block.type === 'text') {
                  return (
                    <p key={block.id} className="text-base text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                      {block.content}
                    </p>
                  );
                }
                if (block.type === 'image' && block.content) {
                  return (
                    <div key={block.id} className="w-full">
                      <img src={block.content} alt={meta.alt || ''} className="w-full rounded-2xl object-cover border border-[var(--border-color)]" />
                    </div>
                  );
                }
                if (block.type === 'video' && block.content) {
                  return (
                    <div key={block.id} className="relative w-full rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-lg bg-black aspect-video">
                      <iframe
                        src={getVideoEmbed(block.content)}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  );
                }
                if (block.type === 'button' && block.content) {
                  const btnSize = meta.size === 'sm' ? 'px-5 py-2.5 text-sm' : meta.size === 'lg' ? 'px-8 py-4 text-lg' : 'px-6 py-3 text-base';
                  const btnStyle = meta.style === 'outline'
                    ? 'bg-transparent border-2 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10'
                    : meta.style === 'ghost'
                      ? 'bg-transparent text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10'
                      : 'bg-[var(--brand-primary)] text-[var(--brand-foreground)] hover:opacity-90 shadow-lg';
                  return (
                    <div key={block.id} className="flex justify-center">
                      <a href={meta.url || '#'} target={meta.url?.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                        className={cn('inline-flex items-center justify-center font-bold transition-all', btnSize, btnStyle, getButtonRadius())}>
                        {block.content}
                      </a>
                    </div>
                  );
                }
                if (block.type === 'quote') {
                  return (
                    <blockquote key={block.id} className="border-l-4 border-[var(--brand-primary)] pl-6 py-2">
                      <p className="text-lg italic text-[var(--text-primary)] leading-relaxed">&ldquo;{block.content}&rdquo;</p>
                      {meta.author && <cite className="block mt-2 text-sm text-[var(--text-secondary)] not-italic">— {meta.author}</cite>}
                    </blockquote>
                  );
                }
                if (block.type === 'iframe' && block.content) {
                  return (
                    <div key={block.id} className="w-full rounded-2xl overflow-hidden border border-[var(--border-color)]"
                      dangerouslySetInnerHTML={{ __html: block.content }} />
                  );
                }
                if (block.type === 'html' && block.content) {
                  return <div key={block.id} dangerouslySetInnerHTML={{ __html: block.content }} />;
                }
                if (block.type === 'divider') {
                  return <hr key={block.id} className="border-[var(--border-color)]" />;
                }
                if (block.type === 'spacer') {
                  const h = ({ sm: '16px', md: '32px', lg: '64px', xl: '96px' } as Record<string, string>)[meta.size || 'md'] || '32px';
                  return <div key={block.id} style={{ height: h }} />;
                }
                return null;
              })}
            </div>
          );
        })()}

        {/* ─── FEATURES / BENEFITS ─── */}
        {features.length > 0 && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">What's Included</h2>
              <p className="text-sm text-[var(--text-secondary)]">Everything you get with this package</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feat, i) => {
                const FeatureIcon = FEATURE_ICONS[feat.icon] ?? Zap;
                return (
                  <div key={i} className="flex gap-3 p-4 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-color)] backdrop-blur-sm hover:border-[var(--brand-primary)]/30 transition-all duration-300 group">
                    <div className="w-9 h-9 rounded-lg bg-[var(--brand-primary)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--brand-primary)]/20 transition-colors">
                      <FeatureIcon className="w-4 h-4 text-[var(--brand-primary)]" />
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--text-primary)] text-xs mb-0.5">{feat.title}</div>
                      <div className="text-[var(--text-secondary)] text-[11px] leading-snug">{feat.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── WHAT'S INCLUDED ─── */}
        {guaranteeBadges.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> What You Get
            </h2>
            <div className="flex flex-wrap gap-2">
              {guaranteeBadges.map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-xs font-medium text-[var(--text-primary)]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── ABOUT THE CREATOR ─── */}
        {(creatorProfile.name || creatorProfile.bio) && (
          <div className="bg-gradient-to-br from-[var(--brand-primary)]/5 to-[var(--brand-secondary)]/5 border border-[var(--border-color)] rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {creatorProfile.avatarUrl ? (
                <img
                  src={creatorProfile.avatarUrl}
                  alt={creatorProfile.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-[var(--bg-primary)] shadow-xl shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shrink-0">
                  {creatorProfile.name?.charAt(0) ?? '?'}
                </div>
              )}
              <div>
                <div className="text-xs font-bold text-[var(--brand-primary)] uppercase tracking-widest mb-1">About the Creator</div>
                <h3 className="text-2xl font-extrabold text-[var(--text-primary)] mb-3">{creatorProfile.name}</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">{creatorProfile.bio}</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── TESTIMONIALS ─── */}
        {testimonials.length > 0 && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Loved by Users</h2>
            </div>
            <div className={cn('grid gap-4', testimonials.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto')}>
              {testimonials.map((t: any, i: number) => (
                <div key={i} className="bg-[var(--bg-secondary)]/60 backdrop-blur-md rounded-xl p-4 border border-[var(--border-color)] shadow-sm">
                  <div className="flex gap-0.5 mb-3">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                  </div>
                  <Quote className="w-5 h-5 text-[var(--brand-primary)]/30 mb-2" />
                  <p className="text-[var(--text-primary)] italic mb-4 leading-relaxed text-sm">"{t.text}"</p>
                  <div className="flex items-center gap-2">
                    {t.avatarUrl ? (
                      <img src={t.avatarUrl} alt={t.name} className="w-10 h-10 rounded-full object-cover border-2 border-[var(--border-color)]" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center text-white font-bold text-sm">
                        {t.name?.charAt(0) ?? 'A'}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-[var(--text-primary)] text-sm">{t.name}</div>
                      <div className="text-[var(--text-secondary)] text-xs">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── FAQ ─── */}
        {faqs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">FAQ</h2>
            <div className="space-y-2">
              {faqs.map((f: any, i: number) => (
                <div key={i} className="border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 backdrop-blur-md rounded-lg overflow-hidden transition-all duration-200">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left font-medium text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/30 transition-colors"
                  >
                    {f.question || f.q}
                    <div className={cn('w-7 h-7 rounded-full bg-[var(--bg-primary)] flex items-center justify-center shrink-0 border border-[var(--border-color)] transition-transform duration-300', openFaq === i && 'bg-[var(--brand-primary)] border-[var(--brand-primary)] rotate-180')}>
                      <ChevronDown className={cn('w-3.5 h-3.5', openFaq === i ? 'text-white' : 'text-[var(--text-secondary)]')} />
                    </div>
                  </button>
                  <div className={cn('grid transition-all duration-300 ease-in-out', openFaq === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                    <div className="overflow-hidden">
                      <div className="px-5 pb-4 pt-1 text-sm text-[var(--text-secondary)] leading-relaxed">{f.answer || f.a}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ─── Social Links Footer ─── */}
      {(() => {
        const socialLinks: { platform: string; url: string }[] = c?.socialLinks ?? (singlePage?.metadata as any)?.social_links ?? [];
        const position: string = c?.socialPosition ?? (singlePage?.metadata as any)?.social_position ?? 'footer';
        const displayStyle: string = c?.socialDisplayStyle ?? (singlePage?.metadata as any)?.social_display_style ?? 'icons-only';
        if (!socialLinks.length || position === 'header') return null;

        const PLATFORM_LABELS: Record<string, string> = {
          instagram: 'Instagram', twitter: 'Twitter', youtube: 'YouTube', linkedin: 'LinkedIn',
          github: 'GitHub', tiktok: 'TikTok', whatsapp: 'WhatsApp', telegram: 'Telegram',
          threads: 'Threads', website: 'Website',
        };

        return (
          <div className="relative z-10 pb-8 flex justify-center">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {socialLinks.filter((l: any) => l.url).map((link: any, i: number) => (
                <a key={i} href={link.url} target="_blank" rel="noreferrer"
                  className={cn(
                    'flex items-center gap-2 transition-all hover:opacity-80',
                    displayStyle === 'pills'
                      ? 'px-4 py-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold'
                      : displayStyle === 'icons-labels'
                        ? 'text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        : 'w-10 h-10 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)]'
                  )}>
                  <Globe className="w-4 h-4" />
                  {displayStyle !== 'icons-only' && <span>{PLATFORM_LABELS[link.platform] || link.platform}</span>}
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ─── Mobile Bottom CTA ─── */}
      {showBuyNow && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden p-3 bg-[var(--bg-primary)]/95 backdrop-blur-lg border-t border-[var(--border-color)] z-40 shadow-2xl">
          <a
            href={product?.id ? `/api/checkout?productId=${product.id}` : '#'}
            className={cn(
              'flex items-center justify-center gap-2 w-full bg-[var(--brand-primary)] hover:opacity-90 text-[var(--brand-foreground)] font-bold py-3 text-base transition-all shadow-[0_4px_12px_-4px_var(--brand-primary)]',
              getButtonRadius()
            )}
          >
            <ShoppingCart className="w-4 h-4" />
            Buy Now
          </a>
        </div>
      )}

      {/* ─── Desktop Right CTA ─── */}
      {showBuyNow && (
        <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-40">
          <a
            href={product?.id ? `/api/checkout?productId=${product.id}` : '#'}
            className={cn(
              'flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:opacity-90 text-[var(--brand-foreground)] font-bold px-6 py-4 transition-all shadow-[0_8px_20px_-8px_var(--brand-primary)] hover:shadow-[0_12px_28px_-8px_var(--brand-primary)]',
              getButtonRadius()
            )}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="whitespace-nowrap">Buy Now</span>
          </a>
        </div>
      )}

      {/* ─── Floating WhatsApp Button ─── */}
      {(() => {
        const waNumber: string = c?.contactWhatsApp ?? (singlePage?.metadata as any)?.contact_whatsapp ?? '';
        if (!waNumber) return null;
        const clean = waNumber.replace(/[^0-9]/g, '');
        return (
          <a href={`https://wa.me/${clean}`} target="_blank" rel="noreferrer"
            className="fixed bottom-20 right-6 lg:bottom-6 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
            title="Chat on WhatsApp">
            <MessageCircle className="w-6 h-6" />
          </a>
        );
      })()}

      {/* Watermark */}
      {showWatermark && (
        <a href="https://digione.ai" target="_blank" rel="noreferrer" className="fixed bottom-6 right-6 lg:flex hidden opacity-30 hover:opacity-100 transition duration-300 font-semibold text-[10px] tracking-widest uppercase text-[var(--text-primary)] z-40 bg-[var(--bg-primary)]/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-[var(--border-color)] items-center gap-1">
          Made with <span className="font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">DigiOne</span>
        </a>
      )}
    </div>
  );
}
