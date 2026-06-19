'use client';
// Shared QR popup for the site-editor preview panes: the page link on top, a
// scannable QR, and copy / open / share actions.
import { QRCodeSVG } from 'qrcode.react';
import { X, Check, Copy, ExternalLink, Share2 } from 'lucide-react';

type Props = {
  url: string;
  displayUrl: string;
  copied: boolean;
  onCopy: () => void;
  onShare: () => void;
  onClose: () => void;
};

export default function QRModal({ url, displayUrl, copied, onCopy, onShare, onClose }: Props) {
  const ACTION =
    'flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xs rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          title="Close"
          aria-label="Close"
          className="absolute right-3 top-3 rounded-[var(--radius-sm)] p-1.5 text-[var(--text-tertiary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <X className="h-4 w-4" />
        </button>

        {/* link shown at the top of the QR */}
        <div className="mb-4 mt-1 flex items-center justify-center">
          <span className="max-w-full truncate font-mono text-[11px] text-[var(--text-tertiary)]">{displayUrl}</span>
        </div>

        {/* QR — fixed light surface so it always scans, regardless of editor theme */}
        <div className="mx-auto flex w-fit items-center justify-center rounded-[var(--radius-lg)] bg-white p-4 shadow-[var(--shadow-xs)]">
          <QRCodeSVG value={url} size={180} level="M" marginSize={0} fgColor="#000000" bgColor="#ffffff" />
        </div>

        {/* copy · open · share */}
        <div className="mt-5 flex items-center gap-2">
          <button onClick={onCopy} className={ACTION}>
            {copied ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" className={ACTION}>
            <ExternalLink className="h-4 w-4" />
            Open
          </a>
          <button onClick={onShare} className={ACTION}>
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
