'use client';
import { useState, type RefObject } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

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
  const copyUrl = () => {
    if (!displayUrl) return;
    navigator.clipboard.writeText(`https://${displayUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-1 flex-col items-start overflow-y-auto bg-[var(--bg-primary)] pb-8 pl-8 pr-4 pt-6">
      {/* link + copy (top of the mobile view) */}
      <div className="mb-3 flex w-[320px] items-center gap-2">
        <span className="flex min-w-0 flex-1 items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5">
          <span className="truncate font-mono text-[11px] text-[var(--text-tertiary)]">{displayUrl ?? 'Live preview'}</span>
        </span>
        <button
          onClick={copyUrl}
          disabled={!displayUrl}
          title="Copy link"
          aria-label="Copy link"
          className="shrink-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          {copied ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
        </button>
        <a
          href={displayUrl ? `https://${displayUrl}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          title="View live page"
          className={`shrink-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${!displayUrl ? 'pointer-events-none opacity-40' : ''}`}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
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
    </div>
  );
}
