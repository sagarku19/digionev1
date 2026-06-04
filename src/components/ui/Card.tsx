import { ReactNode, HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean | 'sm';
  hoverable?: boolean;
  children: ReactNode;
}

export function Card({ padded = true, hoverable = false, className = '', children, ...rest }: CardProps) {
  const padding = padded === 'sm' ? 'p-5' : padded ? 'p-6' : '';
  const hover = hoverable
    ? 'hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-sm)] transition-all duration-200'
    : '';

  return (
    <div
      className={`bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] ${padding} ${hover} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
