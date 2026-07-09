// Renders a product's labelled post-purchase access links as a list. Shared by
// the buyer library and the payment status page. Presentational only (no hooks),
// so it works in both server and client components. Engineered-ledger styling.

import { ExternalLink } from 'lucide-react';
import type { AccessLink } from '@/lib/shared/access-links';

export function DeliveryLinks({ links, className = '' }: { links: AccessLink[]; className?: string }) {
  if (!links.length) return null;
  return (
    <div className={`space-y-2 ${className}`}>
      {links.map((link, i) => (
        <a
          key={`${link.url}-${i}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 rounded-lg border border-black/[0.1] px-3.5 py-2.5 text-[13px] font-semibold text-[#16130F] transition-colors hover:border-black/[0.25] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/15"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#E83A2E]" />
          <span className="min-w-0 flex-1 truncate">{link.label}</span>
          <span aria-hidden="true" className="font-ledger text-[10px] uppercase tracking-[0.14em] text-black/35 transition-transform group-hover:translate-x-0.5">
            open
          </span>
        </a>
      ))}
    </div>
  );
}
