import { HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

const radiusMap = {
  sm: 'rounded-[var(--radius-sm)]',
  md: 'rounded-[var(--radius-md)]',
  lg: 'rounded-[var(--radius-lg)]',
  full: 'rounded-full',
};

export function Skeleton({ rounded = 'md', className = '', style, ...rest }: SkeletonProps) {
  return (
    <div
      className={`${radiusMap[rounded]} bg-[var(--surface-muted)] ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(90deg, transparent 0%, var(--surface-hover) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.6s linear infinite',
        ...style,
      }}
      {...rest}
    />
  );
}
