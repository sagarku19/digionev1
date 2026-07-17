'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';

// The one product card for the /discover surface — used by the list page and
// the detail page's "More from this creator" / "You might also like" rails.
export interface DiscoverCardProduct {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  thumbnail_url: string | null;
  images?: string[] | null;
}

function formatPrice(price: number) {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
}

export function DiscoverCard({ product }: { product: DiscoverCardProduct }) {
  const imgSrc = product.thumbnail_url || (Array.isArray(product.images) ? product.images[0] : null);

  return (
    <Link
      href={`/discover/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.09] bg-white transition-all duration-300 hover:border-black/[0.18] hover:shadow-[0_22px_50px_-24px_rgba(22,19,15,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/30"
    >
      {/* Cover */}
      <div className="aspect-[16/10] overflow-hidden bg-[#FAF8F6]">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-10 w-10 text-black/20" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="text-[15px] font-bold leading-snug tracking-[-0.01em] text-[#16130F] line-clamp-2 transition-colors duration-200 group-hover:text-[#E83A2E]">
          {product.name}
        </h3>

        <p className="mt-1.5 min-h-[2.5em] text-[13px] font-medium leading-[1.35] text-black/45 line-clamp-2">
          {product.description?.trim() || 'A digital product on DigiOne.'}
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-black/[0.06] pt-3.5">
          <span
            className={`font-ledger text-[16px] font-semibold tracking-tight ${
              product.price === 0 ? 'text-[#E83A2E]' : 'text-[#16130F]'
            }`}
          >
            {formatPrice(product.price)}
          </span>
          <span className="font-ledger text-[10px] font-semibold uppercase tracking-[0.16em] text-black/30 transition-colors group-hover:text-[#E83A2E]">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
