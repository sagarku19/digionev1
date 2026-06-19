'use client';
// SitePreviewPane — live preview column for full-page site editors (single-page,
// store). A browser-chrome frame with a device-width toggle, on the dotted canvas.
import { useState, type RefObject } from 'react';
import { Copy, Check, ExternalLink, RefreshCw, Monitor, Smartphone } from 'lucide-react';

type Device = 'desktop' | 'mobile';

type Props = {
  previewUrl: string | null;
  displayUrl: string | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  previewKey: number;
  onRefresh: () => void;
};

export default function SitePreviewPane({ previewUrl, displayUrl, iframeRef, previewKey, onRefresh }: Props) {
  const [copied, setCopied] = useState(false);
  const [device, setDevice] = useState<Device>('desktop');

  const fullUrl = displayUrl ? `https://${displayUrl}` : null;
  const copyUrl = () => {
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const frameWidth = device === 'mobile' ? 'max-w-[390px]' : 'max-w-none';

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden bg-[var(--editor-bg)] px-6 pb-6 pt-6"
      style={{
        backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      {/* toolbar: device toggle (left) · refresh/open (right) */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-1">
          {([['desktop', Monitor], ['mobile', Smartphone]] as const).map(([id, Icon]) => (
            <button
              key={id}
              onClick={() => setDevice(id)}
              aria-label={`${id} preview`}
              aria-pressed={device === id}
              className={`rounded-[var(--radius-sm)] p-1.5 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${device === id ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onRefresh}
            title="Refresh preview"
            aria-label="Refresh preview"
            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <a
            href={fullUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            title="Open live page"
            className={`rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${!fullUrl ? 'pointer-events-none opacity-40' : ''}`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* browser-chrome frame */}
      <div className={`mx-auto flex w-full flex-1 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card-lg)] transition-[max-width] duration-300 ${frameWidth}`}>
        {/* chrome bar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1">
            <span className="truncate font-mono text-[11px] text-[var(--text-tertiary)]">{displayUrl ?? 'Live preview'}</span>
          </span>
          <button
            onClick={copyUrl}
            disabled={!fullUrl}
            title="Copy link"
            aria-label="Copy link"
            className="shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        {/* iframe */}
        {previewUrl ? (
          <iframe
            ref={iframeRef}
            key={previewKey}
            src={previewUrl}
            className="w-full flex-1 border-0 bg-white"
            title="Site Preview"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-tertiary)]">No preview available</div>
        )}
      </div>
    </div>
  );
}
