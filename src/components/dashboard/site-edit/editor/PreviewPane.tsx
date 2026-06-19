'use client';
import { useState, type RefObject } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink, QrCode, Share2, X } from 'lucide-react';

// Device bezel: intentionally ALWAYS dark (a phone is black) — not a theme token.
const BEZEL = '#101012';

type Props = {
  previewUrl: string | null;
  displayUrl: string | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  previewKey: number;
  onRefresh: () => void;
};

export default function PreviewPane({ previewUrl, displayUrl, iframeRef, previewKey }: Props) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const fullUrl = displayUrl ? `https://${displayUrl}` : null;

  const copyUrl = () => {
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shareUrl = () => {
    if (!fullUrl) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: displayUrl ?? 'My page', url: fullUrl }).catch(() => {});
    } else {
      copyUrl();
    }
  };

  return (
    <div
      className="flex flex-1 flex-col items-start overflow-y-auto bg-[var(--editor-bg)] pb-8 pl-8 pr-4 pt-6"
      style={{
        backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      {/* link (left) + QR launcher (right), top of the mobile view */}
      <div className="mb-3 flex w-[320px] items-center gap-2">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[var(--success)]" />
          <span className="truncate font-mono text-[11px] text-[var(--text-tertiary)]">{displayUrl ?? 'Live preview'}</span>
        </span>
        <button
          onClick={() => setShowQR(true)}
          disabled={!displayUrl}
          title="Show QR code"
          className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <QrCode className="h-4 w-4" />
          Open QR
        </button>
      </div>

      {/* iPhone skeleton — thin always-dark bezel, fixed width */}
      <div
        className="flex w-[320px] shrink-0 flex-1 flex-col overflow-hidden rounded-[2.5rem] p-1.5 shadow-[var(--shadow-card-lg)]"
        style={{ minHeight: 580, backgroundColor: BEZEL }}
      >
        <div className="relative flex flex-1 flex-col overflow-hidden rounded-[2.1rem] bg-[var(--surface)]">
          {/* dynamic island floats over the content so the camera area still shows the page */}
          <span
            aria-hidden
            className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full"
            style={{ backgroundColor: BEZEL }}
          />
          {previewUrl ? (
            <iframe
              ref={iframeRef}
              key={previewKey}
              src={previewUrl}
              className="w-full flex-1 border-0"
              title="Site Preview"
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-tertiary)]">No preview available</div>
          )}
        </div>
      </div>

      {showQR && fullUrl && (
        <QRModal
          url={fullUrl}
          displayUrl={displayUrl ?? fullUrl}
          copied={copied}
          onCopy={copyUrl}
          onShare={shareUrl}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
}

function QRModal({
  url,
  displayUrl,
  copied,
  onCopy,
  onShare,
  onClose,
}: {
  url: string;
  displayUrl: string;
  copied: boolean;
  onCopy: () => void;
  onShare: () => void;
  onClose: () => void;
}) {
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
