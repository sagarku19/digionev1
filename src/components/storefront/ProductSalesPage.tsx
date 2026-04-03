'use client';
// ProductSalesPage — single product sales page (site_type: single).
// DB tables: site_singlepage, products (read via props)

import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, Shield, Star, ChevronDown,
  Quote, CheckCircle2, Clock, Sparkles,
  Play, BarChart2, Zap, Rocket, Heart, Gift,
  BookOpen, Code, Globe, Layers, Lightbulb, TrendingUp, Users,
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

function getEmbedUrl(url: string): string {
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
}

const FEATURE_ICONS: Record<string, React.ElementType> = {
  zap: Zap, rocket: Rocket, shield: Shield, heart: Heart, gift: Gift, star: Star,
  book: BookOpen, code: Code, globe: Globe, layers: Layers, lightbulb: Lightbulb,
  trending: TrendingUp, users: Users, check: CheckCircle2,
};

export default function ProductSalesPage({ siteId, singlePage, palette }: { siteId: string; singlePage: any; palette?: any }) {
  const product = Array.isArray(singlePage?.products) ? singlePage.products[0] : singlePage?.products;
  const title = singlePage?.title ?? product?.name ?? 'Product';
  const price = product?.price ?? 0;

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  // ── Extract DB values ──
  const faqs: any[] = singlePage?.faq_items ?? [];
  const guaranteeBadges: string[] = singlePage?.guarantee_badges ?? ['Instant access', 'Secure payment', '7-day refund'];
  const testimonials: any[] = singlePage?.testimonials ?? [];
  const heroImage: string = singlePage?.hero_image_url ?? product?.thumbnail_url ?? '';
  const description: string = singlePage?.description ?? product?.description ?? '';

  // ── Extract metadata JSONB fields ──
  const pageMeta = (singlePage?.metadata as any) ?? {};
  const videoUrl: string = pageMeta?.video_url ?? '';
  const stats: { label: string; value: string }[] = pageMeta?.stats ?? [];
  const features: { title: string; description: string; icon: string }[] = pageMeta?.features ?? [];
  const creatorProfile: { name: string; avatarUrl: string; bio: string } = pageMeta?.creator_profile ?? { name: '', avatarUrl: '', bio: '' };

  const showBuyNow = singlePage?.show_buy_now ?? true;
  const showAddToCart = singlePage?.show_add_to_cart ?? false;
  const countdownEnd = singlePage?.countdown_end_at;

  const themeSettings = (singlePage?.theme as any) || {};
  const layoutStyle = themeSettings.layoutStyle || 'classic';
  const buttonStyle = themeSettings.buttonStyle || 'rounded';
  const backgroundType = themeSettings.backgroundType || 'solid';
  const backgroundValue = themeSettings.backgroundValue || '#f9fafb';
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

  const customStyle: React.CSSProperties = { ...getCSSVariables(palette), minHeight: '100vh', position: 'relative' };
  if (backgroundType === 'solid') customStyle.backgroundColor = backgroundValue || 'var(--bg-primary)';
  else if (backgroundType === 'gradient') customStyle.backgroundImage = backgroundValue;
  else if (backgroundType === 'image') { customStyle.backgroundImage = `url(${backgroundValue})`; customStyle.backgroundSize = 'cover'; customStyle.backgroundPosition = 'center'; }

  return (
    <div style={customStyle} className="min-h-screen font-sans text-[var(--text-primary)] antialiased transition-colors duration-300 relative">
      {backgroundType === 'image' && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0" />}

      <div className="relative z-10 py-16 px-5 sm:px-8 max-w-5xl mx-auto space-y-20 pb-32">

        {/* ─── HERO SECTION ─── */}
        <div className="space-y-8">
          <div className="space-y-5">
            <h1 className="font-extrabold tracking-tight leading-[1.1] text-4xl md:text-5xl lg:text-6xl text-transparent bg-clip-text bg-gradient-to-br from-[var(--text-primary)] to-[var(--text-secondary)]">
              {title}
            </h1>
            {description && (
              <p className="text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl">
                {description}
              </p>
            )}
          </div>

          {/* Stats Strip */}
          {stats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.map((stat, i) => (
                <div key={i} className="flex flex-col items-center justify-center py-5 px-4 rounded-2xl bg-[var(--bg-secondary)]/60 border border-[var(--border-color)] backdrop-blur-sm text-center">
                  <span className="text-2xl md:text-3xl font-extrabold text-[var(--brand-primary)] tracking-tight">{stat.value}</span>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] mt-1 uppercase tracking-wider">{stat.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Hero Image */}
          {heroImage && !videoUrl && (
            <div className="w-full relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] rounded-[2rem] blur-xl opacity-20 group-hover:opacity-30 transition duration-1000" />
              <img src={heroImage} alt={title} className="relative w-full object-cover shadow-2xl border border-[var(--border-color)]/30 rounded-3xl" />
            </div>
          )}

          {/* Sales Video Embed */}
          {videoUrl && (
            <div className="relative w-full rounded-3xl overflow-hidden border border-[var(--border-color)] shadow-2xl bg-black aspect-video">
              <iframe
                src={getEmbedUrl(videoUrl)}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>

        {/* ─── PURCHASE BOX (inline for mobile) ─── */}
        <div className="bg-[var(--bg-primary)]/80 backdrop-blur-2xl border border-[var(--border-color)] shadow-2xl p-8 rounded-3xl flex flex-col gap-6">
          <div className="space-y-1">
            <div className="text-[var(--text-secondary)] text-sm font-semibold uppercase tracking-wider">Total Price</div>
            <div className="text-5xl font-extrabold text-[var(--text-primary)] tracking-tight">{price === 0 ? 'Free' : formatINR(price)}</div>
          </div>

          {/* Countdown */}
          {countdownEnd && timeLeft && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col items-center">
              <div className="text-red-500 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Special Offer Ends In
              </div>
              <div className="flex items-center gap-4 text-center">
                {([['d', 'Days'], ['h', 'Hours'], ['m', 'Mins'], ['s', 'Secs']] as const).map(([key, label], i) => (
                  <React.Fragment key={key}>
                    {i > 0 && <div className="text-xl font-bold text-red-500/30">:</div>}
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-red-500">
                        {String((timeLeft as any)[key]).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] text-red-400 font-bold uppercase">{label}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {showBuyNow && (
              <a
                href={product?.id ? `/api/checkout?productId=${product.id}` : '#'}
                className={cn(
                  'flex items-center justify-center gap-2 w-full bg-[var(--brand-primary)] hover:opacity-90 text-[var(--brand-foreground)] font-bold py-4 transition-all shadow-[0_8px_20px_-8px_var(--brand-primary)] transform hover:-translate-y-0.5 active:translate-y-0 text-lg',
                  getButtonRadius()
                )}
              >
                <ShoppingCart className="w-5 h-5" />
                Buy now — {price === 0 ? 'Free' : formatINR(price)}
              </a>
            )}
            {showAddToCart && (
              <button className={cn(
                'flex items-center justify-center gap-2 w-full bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold py-4 transition-all text-base',
                getButtonRadius()
              )}>
                Add to Cart
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-[var(--border-color)] flex justify-center flex-wrap gap-4">
            {['Guaranteed Safe', 'SSL Secure', 'Verified'].map(badge => (
              <span key={badge} className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-[var(--text-secondary)]/50" /> {badge}
              </span>
            ))}
          </div>
        </div>

        {/* ─── FEATURES / BENEFITS ─── */}
        {features.length > 0 && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold text-[var(--text-primary)]">Everything You Get</h2>
              <p className="text-[var(--text-secondary)]">A complete package designed to get you real results.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((feat, i) => {
                const FeatureIcon = FEATURE_ICONS[feat.icon] ?? Zap;
                return (
                  <div key={i} className="flex gap-4 p-5 rounded-2xl bg-[var(--bg-secondary)]/60 border border-[var(--border-color)] backdrop-blur-sm hover:border-[var(--brand-primary)]/30 transition-all duration-300 group">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--brand-primary)]/20 transition-colors">
                      <FeatureIcon className="w-5 h-5 text-[var(--brand-primary)]" />
                    </div>
                    <div>
                      <div className="font-bold text-[var(--text-primary)] text-sm mb-1">{feat.title}</div>
                      <div className="text-[var(--text-secondary)] text-xs leading-relaxed">{feat.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── WHAT'S INCLUDED ─── */}
        {guaranteeBadges.length > 0 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--brand-primary)]" /> What's Included
            </h2>
            <div className="flex flex-wrap gap-3">
              {guaranteeBadges.map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── ABOUT THE CREATOR ─── */}
        {(creatorProfile.name || creatorProfile.bio) && (
          <div className="bg-gradient-to-br from-[var(--brand-primary)]/5 to-[var(--brand-secondary)]/5 border border-[var(--border-color)] rounded-3xl p-8">
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
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold text-[var(--text-primary)]">What Students Are Saying</h2>
            </div>
            <div className={cn('grid gap-5', testimonials.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto')}>
              {testimonials.map((t: any, i: number) => (
                <div key={i} className="bg-[var(--bg-secondary)]/60 backdrop-blur-md rounded-2xl p-6 border border-[var(--border-color)] shadow-sm">
                  <div className="flex gap-0.5 mb-4">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                  </div>
                  <Quote className="w-6 h-6 text-[var(--brand-primary)]/30 mb-2" />
                  <p className="text-[var(--text-primary)] italic mb-5 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-3">
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
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-[var(--text-primary)]">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqs.map((f: any, i: number) => (
                <div key={i} className="border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 backdrop-blur-md rounded-2xl overflow-hidden transition-all duration-200">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/30 transition-colors"
                  >
                    {f.question || f.q}
                    <div className={cn('w-8 h-8 rounded-full bg-[var(--bg-primary)] flex items-center justify-center shrink-0 border border-[var(--border-color)] transition-transform duration-300', openFaq === i && 'bg-[var(--brand-primary)] border-[var(--brand-primary)] rotate-180')}>
                      <ChevronDown className={cn('w-4 h-4', openFaq === i ? 'text-white' : 'text-[var(--text-secondary)]')} />
                    </div>
                  </button>
                  <div className={cn('grid transition-all duration-300 ease-in-out', openFaq === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                    <div className="overflow-hidden">
                      <div className="px-6 pb-6 pt-2 text-base text-[var(--text-secondary)] leading-relaxed">{f.answer || f.a}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── FINAL CTA ─── */}
        <div className="text-center space-y-6 py-12">
          <h2 className="text-3xl font-extrabold text-[var(--text-primary)]">Ready to get started?</h2>
          <a
            href={product?.id ? `/api/checkout?productId=${product.id}` : '#'}
            className={cn(
              'inline-flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:opacity-90 text-[var(--brand-foreground)] font-bold px-10 py-5 text-lg transition-all shadow-[0_12px_28px_-8px_var(--brand-primary)] transform hover:-translate-y-0.5 active:translate-y-0',
              getButtonRadius()
            )}
          >
            <ShoppingCart className="w-5 h-5" />
            {price === 0 ? 'Get it Free' : `Buy Now — ${formatINR(price)}`}
          </a>
        </div>

      </div>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--bg-primary)]/90 backdrop-blur-xl border-t border-[var(--border-color)] lg:hidden z-50">
        <a
          href={product?.id ? `/api/checkout?productId=${product.id}` : '#'}
          className={cn(
            'flex items-center justify-center gap-2 w-full bg-[var(--brand-primary)] text-[var(--brand-foreground)] font-bold py-3.5 text-base shadow-[0_8px_24px_-8px_var(--brand-primary)]',
            getButtonRadius()
          )}
        >
          <ShoppingCart className="w-5 h-5" />
          Buy now — {price === 0 ? 'Free' : formatINR(price)}
        </a>
      </div>

      {/* Watermark */}
      {showWatermark && (
        <a href="https://digione.ai" target="_blank" rel="noreferrer" className="fixed bottom-6 right-6 lg:flex hidden opacity-30 hover:opacity-100 transition duration-300 font-semibold text-[10px] tracking-widest uppercase text-[var(--text-primary)] z-40 bg-[var(--bg-primary)]/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-[var(--border-color)] items-center gap-1">
          Made with <span className="font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">DigiOne</span>
        </a>
      )}
    </div>
  );
}
