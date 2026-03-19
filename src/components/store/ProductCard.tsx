import Link from 'next/link';
import { PriceDisplay } from './PriceDisplay';
import { StarRating } from './StarRating';

export interface ProductCardProps {
  id: string;
  creatorSlug: string;
  title: string;
  slug: string;
  coverImage: string | null;
  price: number;
  compareAtPrice: number | null;
  averageRating: number;
  reviewCount: number;
  type: 'digital_download' | 'course' | 'community' | 'service';
}

export function ProductCard({
  id, creatorSlug, title, slug, coverImage, price, compareAtPrice, averageRating, reviewCount, type
}: ProductCardProps) {
  return (
    <Link href={`/${creatorSlug}/${slug}`} className="group flex flex-col bg-[var(--surface-color)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="aspect-[4/3] w-full bg-gray-100 dark:bg-zinc-800 relative overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No image
          </div>
        )}
        <div className="absolute top-3 inset-x-3 flex justify-between items-start">
          <span className="bg-white/90 dark:bg-black/80 backdrop-blur-sm text-[var(--color-text-primary)] text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
            {type.replace('_', ' ')}
          </span>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] line-clamp-2 mb-2 group-hover:text-[var(--store-primary)] transition-colors">
          {title}
        </h3>

        {reviewCount > 0 && (
          <div className="flex items-center gap-1.5 mb-4">
            <StarRating rating={averageRating} size="sm" />
            <span className="text-sm text-[var(--color-text-tertiary)]">({reviewCount})</span>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
          <PriceDisplay amount={price} compareAt={compareAtPrice} size="md" />
          <div className="text-[var(--store-primary)] font-medium text-sm group-hover:underline underline-offset-4">
            View details
          </div>
        </div>
      </div>
    </Link>
  );
}
