import { formatINR } from '@/lib/tokens';

export interface PriceDisplayProps {
  amount: number;
  compareAt?: number | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function PriceDisplay({ amount, compareAt, size = 'md', className = '' }: PriceDisplayProps) {
  const sizeConfig = {
    sm: { current: 'text-sm', original: 'text-xs' },
    md: { current: 'text-base', original: 'text-sm' },
    lg: { current: 'text-xl', original: 'text-base' },
    xl: { current: 'text-3xl font-display tracking-tight', original: 'text-lg' }
  }[size];

  const hasDiscount = compareAt != null && compareAt > amount;

  return (
    <div className={`flex items-baseline gap-2 flex-wrap ${className}`}>
      <span className={`font-bold text-[var(--color-text-primary)] ${sizeConfig.current}`}>
        {amount === 0 ? 'Free' : formatINR(amount)}
      </span>
      {hasDiscount && (
        <span className={`font-medium line-through text-[var(--color-text-tertiary)] ${sizeConfig.original}`}>
          {formatINR(compareAt)}
        </span>
      )}
    </div>
  );
}
