'use client';

// Post-purchase file downloads on the status page. Calls GET /api/deliverables/
// [productId], which is gated by user_product_access (auth + ownership): a
// logged-in buyer who just purchased sees their files; guests (401/403) and
// products without files render nothing — the page's LibraryCta covers guests.
// Each file is its own download link (no multi-popup).

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { formatBytes } from '@/lib/format-bytes';

type DeliverableFile = { name: string; signedUrl: string; bytes: number };

export function StatusFiles({ productId }: { productId: string }) {
  const [files, setFiles] = useState<DeliverableFile[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/deliverables/${productId}`);
        if (!res.ok) { if (!cancelled) setFiles([]); return; }
        const data = await res.json().catch(() => ({}));
        const raw = (data.files ?? []) as Array<{ name?: string; signedUrl?: string; bytes?: number }>;
        const next = raw
          .filter((f) => typeof f.signedUrl === 'string')
          .map((f) => ({ name: f.name || 'File', signedUrl: f.signedUrl as string, bytes: Number(f.bytes) || 0 }));
        if (!cancelled) setFiles(next);
      } catch {
        if (!cancelled) setFiles([]);
      }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  // Quiet until known, and nothing to show for guests / no-file products.
  if (!files || files.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="font-ledger text-[10px] uppercase tracking-[0.16em] text-black/35">Files</p>
      {files.map((f, i) => (
        <a
          key={i}
          href={f.signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-lg border border-black/[0.08] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[#16130F] transition-colors hover:border-black/[0.2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E83A2E]/15"
        >
          <Download className="h-3.5 w-3.5 shrink-0 text-[#E83A2E]" />
          <span className="min-w-0 flex-1 truncate">{f.name}</span>
          {f.bytes > 0 && <span className="font-ledger text-[10px] text-black/35 shrink-0">{formatBytes(f.bytes)}</span>}
        </a>
      ))}
    </div>
  );
}
