'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const CLS =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

/**
 * Standard dashboard back control — a square `<` icon button placed before a
 * page/section title. Pass `href` for link navigation or `onClick` for in-page
 * back. `label` sets the accessible name + tooltip (e.g. "Back to links").
 */
export function BackButton({
  href, onClick, label = 'Back', className = '',
}: {
  href?: string;
  onClick?: () => void;
  label?: string;
  className?: string;
}) {
  const icon = <ChevronLeft className="w-5 h-5" />;
  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={`${CLS} ${className}`}>
        {icon}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={`${CLS} ${className}`}>
      {icon}
    </button>
  );
}
