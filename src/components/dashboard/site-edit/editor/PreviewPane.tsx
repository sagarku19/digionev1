'use client';
import { RefreshCw } from 'lucide-react';
import type { RefObject } from 'react';

type Props = {
  previewUrl: string | null;
  displayUrl: string | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  previewKey: number;
  onRefresh: () => void;
};

export default function PreviewPane({ previewUrl, displayUrl, iframeRef, previewKey, onRefresh }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto bg-[var(--bg-primary)] px-6 pb-8 pt-6">
      {/* meta row: url chip + refresh */}
      <div className="mb-4 flex w-full max-w-[380px] items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--success)]" />
          <span className="truncate font-mono text-[11px] text-[var(--text-tertiary)]">{displayUrl ?? 'Live preview'}</span>
        </span>
        <button
          onClick={onRefresh}
          title="Refresh preview"
          aria-label="Refresh preview"
          className="shrink-0 rounded-[var(--radius-sm)] p-1.5 text-[var(--text-tertiary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* phone frame — mobile preview only */}
      <div
        className="flex w-full max-w-[380px] flex-1 flex-col overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-card-lg)]"
        style={{ minHeight: 480 }}
      >
        <div className="flex flex-1 flex-col overflow-hidden rounded-[26px] bg-[var(--surface)]">
          <div className="flex shrink-0 items-center justify-center py-2">
            <span className="h-1.5 w-14 rounded-full bg-[var(--border-strong)]" />
          </div>
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
