export interface StatusPillProps {
  status: string;
  type?: 'order' | 'kyc' | 'payout' | 'general';
  className?: string;
}

export function StatusPill({ status, className = '' }: StatusPillProps) {
  const s = status.toLowerCase();

  let bg = 'bg-[var(--surface-muted)]';
  let text = 'text-[var(--text-secondary)]';

  if (['success', 'completed', 'paid', 'approved', 'active', 'verified'].includes(s)) {
    bg = 'bg-[var(--success-bg)]';
    text = 'text-[var(--success)]';
  } else if (['pending', 'processing', 'in_review', 'draft', 'requested'].includes(s)) {
    bg = 'bg-[var(--warning-bg)]';
    text = 'text-[var(--warning)]';
  } else if (['failed', 'rejected', 'cancelled', 'refunded', 'inactive'].includes(s)) {
    bg = 'bg-[var(--danger-bg)]';
    text = 'text-[var(--danger)]';
  } else if (['info', 'new'].includes(s)) {
    bg = 'bg-[var(--info-bg)]';
    text = 'text-[var(--info)]';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-pill)] text-[11px] font-medium tracking-wide capitalize ${bg} ${text} ${className}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
