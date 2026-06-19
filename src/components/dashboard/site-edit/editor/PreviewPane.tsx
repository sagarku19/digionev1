'use client';
import { useState, type RefObject } from 'react';
import { QrCode } from 'lucide-react';
import QRModal from './QRModal';

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
