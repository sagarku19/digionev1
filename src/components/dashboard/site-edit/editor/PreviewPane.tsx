'use client';
import { useState, useRef, useEffect, type RefObject } from 'react';
import { QrCode, Monitor, Smartphone } from 'lucide-react';
import QRModal from './QRModal';

// Device bezel: intentionally ALWAYS dark (a phone is black) — not a theme token.
const BEZEL = '#101012';
const DESKTOP_W = 1280;

type Device = 'web' | 'mobile';

type Props = {
  previewUrl: string | null;
  displayUrl: string | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  previewKey: number;
  onRefresh: () => void;
  devices?: Device[];        // which device views are available (default: mobile only)
  defaultDevice?: Device;
};

export default function PreviewPane({ previewUrl, displayUrl, iframeRef, previewKey, devices = ['mobile'], defaultDevice }: Props) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [device, setDevice] = useState<Device>(defaultDevice ?? devices[0] ?? 'mobile');
  const showToggle = devices.length > 1;
  const isWeb = device === 'web';

  // Measure the web wrapper so the 1280px desktop frame can zoom to fit the column.
  const webWrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = webWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setBox({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isWeb]);

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

  const iframe = previewUrl ? (
    <iframe ref={iframeRef} key={previewKey} src={previewUrl} className="w-full flex-1 border-0 bg-white" title="Site Preview" />
  ) : (
    <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-tertiary)]">No preview available</div>
  );

  const zoom = box.w > 0 ? box.w / DESKTOP_W : 0.3;
  const frameH = zoom > 0 && box.h > 0 ? box.h / zoom : 820;

  return (
    <div
      className="flex flex-1 flex-col items-stretch overflow-hidden bg-[var(--editor-bg)] px-6 pb-8 pt-6"
      style={{
        backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      {/* link (left) · Open QR · device toggle (right) */}
      <div className="mb-3 flex w-full items-center gap-2">
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
        {showToggle && (
          <div className="flex shrink-0 items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-0.5">
            {([['web', Monitor], ['mobile', Smartphone]] as const).map(([id, Icon]) => (
              <button
                key={id}
                onClick={() => setDevice(id)}
                aria-label={`${id} preview`}
                aria-pressed={device === id}
                className={`rounded-[var(--radius-sm)] p-1.5 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${device === id ? 'bg-[var(--surface-muted)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        )}
      </div>

      {isWeb ? (
        // ── Web: zoom-to-fit browser frame ──
        <div ref={webWrapRef} className="w-full flex-1 overflow-hidden">
          <div
            className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card-lg)]"
            style={{ width: DESKTOP_W, height: frameH, zoom }}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5">
              <span className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[var(--border-strong)]" />
                <span className="h-3 w-3 rounded-full bg-[var(--border-strong)]" />
                <span className="h-3 w-3 rounded-full bg-[var(--border-strong)]" />
              </span>
              <span className="flex-1 truncate rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1 font-mono text-[11px] text-[var(--text-tertiary)]">{displayUrl ?? 'Live preview'}</span>
            </div>
            {iframe}
          </div>
        </div>
      ) : (
        // ── Mobile: iPhone frame ──
        <div
          className="flex w-[320px] shrink-0 flex-1 flex-col overflow-hidden rounded-[2.5rem] p-1.5 shadow-[var(--shadow-card-lg)]"
          style={{ minHeight: 580, backgroundColor: BEZEL }}
        >
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-[2.1rem] bg-[var(--surface)]">
            <span aria-hidden className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full" style={{ backgroundColor: BEZEL }} />
            {iframe}
          </div>
        </div>
      )}

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
