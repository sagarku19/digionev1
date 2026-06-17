'use client';
import { useEffect, useRef, useState, type ReactNode, type RefObject, type ElementType } from 'react';
import {
  ArrowLeft, Save, Loader2, CheckCircle2, ExternalLink, Monitor, Tablet, Smartphone,
  RefreshCw, Copy, Check, Undo2, Redo2, Moon, Sun,
} from 'lucide-react';

type Props = {
  // header
  title: string;
  typeLabel: string;
  typeIcon: ElementType;
  onBack: () => void;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  // preview
  previewUrl: string | null;
  displayUrl: string | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  previewKey: number;
  onRefresh: () => void;
  device: string;
  onDeviceChange: (d: string) => void;
  // left panel body (EditorPanel)
  children: ReactNode;
};

const DEVICES = [
  { id: 'desktop', icon: Monitor, label: 'Desktop' },
  { id: 'tablet', icon: Tablet, label: 'Tablet' },
  { id: 'mobile', icon: Smartphone, label: 'Mobile' },
];

export default function SiteEditorShell(props: Props) {
  const { title, typeLabel, typeIcon: TypeIcon, onBack, saving, saved, onSave,
    canUndo, canRedo, onUndo, onRedo, theme, onToggleTheme,
    previewUrl, displayUrl, iframeRef, previewKey, onRefresh, device, onDeviceChange, children } = props;

  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const [previewW, setPreviewW] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = previewWrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => { for (const e of entries) setPreviewW(e.contentRect.width); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const copyUrl = () => {
    if (!displayUrl) return;
    navigator.clipboard.writeText(`https://${displayUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const DESKTOP_W = 1280;
  const DESKTOP_H = Math.round((DESKTOP_W * 10) / 16);
  const isDesktop = device === 'desktop';
  const isMobile = device === 'mobile';
  const devicePx = isDesktop ? DESKTOP_W : isMobile ? 375 : 768;
  const zoom = isDesktop && previewW > 0 ? Math.min(1, (previewW - 48) / DESKTOP_W) : 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="flex min-h-0 flex-1">

        {/* LEFT PANEL */}
        <div className="flex w-[440px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-primary)]">
          {/* header */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] px-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="-ml-2 rounded-[var(--radius-md)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="max-w-[180px] truncate text-sm font-semibold text-[var(--text-primary)]">{title}</h1>
                <p className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-tertiary)]">
                  <TypeIcon className="h-3 w-3" /> {typeLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onToggleTheme} title="Toggle theme" className="rounded-[var(--radius-md)] border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              {(onUndo || onRedo) && (
                <div className="flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--border)] p-1">
                  <button onClick={onUndo} disabled={!canUndo} title="Undo" className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-secondary)] enabled:hover:bg-[var(--surface-hover)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"><Undo2 className="h-4 w-4" /></button>
                  <button onClick={onRedo} disabled={!canRedo} title="Redo" className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-secondary)] enabled:hover:bg-[var(--surface-hover)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"><Redo2 className="h-4 w-4" /></button>
                </div>
              )}
              <button onClick={onSave} disabled={saving}
                className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50 ${saved ? 'bg-[var(--success)] text-[var(--text-on-brand)]' : 'bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]'}`}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>
          {/* body slot */}
          <div className="min-h-0 flex-1">{children}</div>
        </div>

        {/* RIGHT PREVIEW */}
        <div className="flex flex-1 flex-col bg-[var(--bg-tertiary)]">
          <div className="relative flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] px-4">
            <a href={displayUrl ? `https://${displayUrl}` : undefined} target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${!displayUrl ? 'pointer-events-none opacity-40' : ''}`}>
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
            <button onClick={copyUrl} disabled={!displayUrl}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
              {copied ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Link'}
            </button>
            <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Website Preview</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-1">
              {DEVICES.map((d) => (
                <button key={d.id} onClick={() => onDeviceChange(d.id)} title={d.label}
                  className={`rounded-[var(--radius-sm)] p-1.5 transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${device === d.id ? 'bg-[var(--surface-muted)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}>
                  <d.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div ref={previewWrapperRef} className={`flex flex-1 items-start justify-center overflow-y-auto overflow-x-hidden px-6 pb-6 ${isDesktop ? 'pt-10' : 'pt-6'}`}>
            <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]"
              style={{ width: devicePx, maxWidth: '100%', height: isDesktop ? DESKTOP_H : '100%', zoom: isDesktop ? zoom : undefined, transformOrigin: 'top left' }}>
              <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[var(--danger)]" />
                  <span className="h-3 w-3 rounded-full bg-[var(--warning)]" />
                  <span className="h-3 w-3 rounded-full bg-[var(--success)]" />
                </div>
                <div className="flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
                  <p className="truncate font-mono text-[10px] text-[var(--text-tertiary)]">{displayUrl ? `https://${displayUrl}` : 'Loading…'}</p>
                </div>
                <button onClick={onRefresh} title="Refresh" className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
              {previewUrl ? (
                <iframe ref={iframeRef} key={previewKey} src={previewUrl} className="w-full flex-1 border-0" title="Site Preview" />
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-tertiary)]">No preview available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
