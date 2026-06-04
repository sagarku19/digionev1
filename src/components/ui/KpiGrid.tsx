import { ReactNode } from 'react';

export interface KpiGridProps {
  children: ReactNode;
  className?: string;
}

export function KpiGrid({ children, className = '' }: KpiGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}>
      {children}
    </div>
  );
}
