import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: LucideIcon;
  subValue?: string;
  className?: string;
}

export function StatCard({ label, value, trend, icon: Icon, subValue, className = '' }: StatCardProps) {
  return (
    <div className={`bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">{label}</h3>
        {Icon && <Icon className="w-5 h-5 text-[var(--text-secondary)]" />}
      </div>
      <div className="flex items-end gap-3">
        <div className="text-3xl font-display font-bold text-[var(--text-primary)]">{value}</div>
        {trend && (
          <div className={`flex items-center text-sm font-medium mb-1 ${trend.isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>
      {subValue && (
        <div className="mt-2 text-sm text-[var(--text-secondary)] truncate">{subValue}</div>
      )}
    </div>
  );
}
