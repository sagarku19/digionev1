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
    <div className={`group relative bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border border-gray-200/80 dark:border-zinc-800/80 rounded-[32px] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden ${className}`}>
      
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0" />
      
      <div className="relative z-10 flex justify-between items-start mb-6">
        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 capitalize tracking-wide">{label}</h3>
        {Icon && (
          <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:border-indigo-100 dark:group-hover:border-indigo-500/20 transition-colors duration-300">
            <Icon className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
          </div>
        )}
      </div>
      
      <div className="relative z-10 flex flex-col justify-end gap-1">
        <div className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{value}</div>
        
        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <div className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-bold leading-none ${trend.isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-100 dark:border-red-500/20'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </div>
          )}
          {subValue && (
            <div className="text-xs font-bold text-gray-400 dark:text-gray-500 truncate">{subValue}</div>
          )}
        </div>
      </div>
    </div>
  );
}
