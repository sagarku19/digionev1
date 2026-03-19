import { Star } from 'lucide-react';

export interface StarRatingProps {
  rating: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showEmpty?: boolean;
}

export function StarRating({ rating, max = 5, size = 'md', className = '', showEmpty = true }: StarRatingProps) {
  const sizeClass = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }[size];

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[...Array(max)].map((_, i) => {
        const starValue = i + 1;
        if (rating >= starValue) {
          return <Star key={i} className={`${sizeClass} fill-amber-400 text-amber-400`} />;
        } else if (rating >= starValue - 0.5) {
          return (
            <div key={i} className="relative">
              {showEmpty && <Star className={`${sizeClass} text-gray-300 dark:text-zinc-700 fill-transparent`} />}
              <div className="absolute top-0 left-0 overflow-hidden w-1/2">
                <Star className={`${sizeClass} fill-amber-400 text-amber-400`} />
              </div>
            </div>
          );
        } else if (showEmpty) {
          return <Star key={i} className={`${sizeClass} text-gray-300 dark:text-zinc-700 fill-transparent`} />;
        }
        return null;
      })}
    </div>
  );
}
