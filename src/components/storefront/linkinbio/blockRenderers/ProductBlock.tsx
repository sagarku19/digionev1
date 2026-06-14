import React from 'react';
import { Package } from 'lucide-react';
import type { BlockRendererProps } from './_shared';
import { getRadiusClass, getButtonClasses, trackClick } from './_shared';

export default function ProductBlock({ link, bio, palette, productsMap, siteId, animStyle, cardSt }: BlockRendererProps) {
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
  const href = product ? `/store/product/${product.id}` : (link.url || '#');
  const rClass = getRadiusClass(bio.border_radius);
  const pri = palette.primary || '#EC4899';

  // ── Shared price block ──
  const PriceBlock = ({ className = '' }: { className?: string }) => showPrice && displayPrice !== undefined ? (
    <span className={`flex items-center gap-1.5 ${className}`}>
      <span className="font-bold" style={{ color: pri }}>
        {'₹'}{displayPrice.toLocaleString('en-IN')}
      </span>
      {originalPrice !== null && Number(originalPrice) > 0 && (
        <span className="line-through opacity-50 text-[11px]" style={{ color: palette.muted || '#64748B' }}>
          {'₹'}{Number(originalPrice).toLocaleString('en-IN')}
        </span>
      )}
    </span>
  ) : null;

  // ── Vertical card ──
  if (layout === 'vertical') {
    return (
      <a href={href}
        onClick={() => trackClick(siteId, link.id, 'product_click')}
        className={`w-full col-span-2 flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lg ${rClass}`}
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
        className={`w-full col-span-2 flex flex-row overflow-hidden transition-all duration-200 hover:shadow-lg ${rClass}`}
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
      className={`${getButtonClasses(bio.button_style, bio.border_radius)} group col-span-2`}
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
