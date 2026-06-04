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
    <div
      className={`group relative bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] hover:bg-[var(--surface-hover)] transition-all duration-200 overflow-hidden ${className}`}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</h3>
        {Icon && (
          <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-semibold leading-none ${
                trend.isPositive
                  ? 'bg-[var(--success-bg)] text-[var(--success)]'
                  : 'bg-[var(--danger-bg)] text-[var(--danger)]'
              }`}
            >
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
          {subValue && (
            <span className="text-xs font-medium text-[var(--text-tertiary)] truncate">{subValue}</span>
          )}
        </div>
      </div>
    </div>
  );
}
