'use client';

import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Download, X } from 'lucide-react';

export function QRButton({ url, label }: { url: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const download = () => {
    const canvas = wrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${label || 'qr'}.png`;
    a.click();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="QR code"
        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <QrCode className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] p-6 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">QR code</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div ref={wrapRef} className="flex justify-center rounded-[var(--radius-md)] bg-white p-4">
              <QRCodeCanvas value={url} size={200} level="M" includeMargin />
            </div>
            <p className="mt-3 text-center text-xs text-[var(--text-tertiary)] break-all">{url}</p>
            <button
              onClick={download}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <Download className="w-4 h-4" /> Download PNG
            </button>
          </div>
        </div>
      )}
    </>
  );
}
