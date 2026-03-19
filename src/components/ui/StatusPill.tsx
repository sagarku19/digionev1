export interface StatusPillProps {
  status: string;
  type?: 'order' | 'kyc' | 'payout' | 'general';
  className?: string;
}

export function StatusPill({ status, type = 'general', className = '' }: StatusPillProps) {
  let colorClass = 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:border-zinc-700';
  
  const s = status.toLowerCase();
  
  if (s === 'success' || s === 'completed' || s === 'paid' || s === 'approved' || s === 'active') {
    colorClass = 'bg-[var(--color-success-subtle)] text-[var(--color-success)] border-[var(--color-success)]/20';
  } else if (s === 'pending' || s === 'processing' || s === 'in_review' || s === 'draft') {
    colorClass = 'bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[var(--color-warning)]/20';
  } else if (s === 'failed' || s === 'rejected' || s === 'cancelled' || s === 'refunded' || s === 'inactive') {
    colorClass = 'bg-[var(--color-danger-subtle)] text-[var(--color-danger)] border-[var(--color-danger)]/20';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${colorClass} capitalize ${className}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
