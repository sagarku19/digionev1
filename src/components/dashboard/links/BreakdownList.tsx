'use client';

export function BreakdownList({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-xs)]">
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">No data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.slice(0, 8).map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="text-sm text-[var(--text-secondary)] w-28 truncate shrink-0">{r.label}</span>
              <div className="flex-1 h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--brand)] rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
              <span className="text-xs text-[var(--text-tertiary)] w-10 text-right shrink-0">{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
