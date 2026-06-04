"use client";

export interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  className?: string;
}

export function DateRangePicker({ startDate, endDate, onChange, className = '' }: DateRangePickerProps) {
  const inputClasses =
    'pl-3 pr-2 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] min-w-[130px] transition-shadow';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onChange(e.target.value, endDate)}
        className={inputClasses}
      />
      <span className="text-[var(--text-tertiary)] text-sm font-medium">to</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onChange(startDate, e.target.value)}
        className={inputClasses}
      />
    </div>
  );
}
