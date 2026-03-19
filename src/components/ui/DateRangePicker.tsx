"use client";

export interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  onChange: (start: string, end: string) => void;
  className?: string;
}

export function DateRangePicker({ startDate, endDate, onChange, className = '' }: DateRangePickerProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <input 
          type="date"
          value={startDate}
          onChange={(e) => onChange(e.target.value, endDate)}
          className="pl-3 pr-2 py-2 text-sm border border-[var(--color-border)] rounded-md bg-[var(--surface-color)] focus:ring-[var(--brand)] focus:border-[var(--brand)] outline-none text-[var(--color-text-primary)] min-w-[130px] shadow-sm"
        />
      </div>
      <span className="text-[var(--color-text-tertiary)] text-sm font-medium">to</span>
      <div className="relative">
        <input 
          type="date"
          value={endDate}
          onChange={(e) => onChange(startDate, e.target.value)}
          className="pl-3 pr-2 py-2 text-sm border border-[var(--color-border)] rounded-md bg-[var(--surface-color)] focus:ring-[var(--brand)] focus:border-[var(--brand)] outline-none text-[var(--color-text-primary)] min-w-[130px] shadow-sm"
        />
      </div>
    </div>
  );
}
