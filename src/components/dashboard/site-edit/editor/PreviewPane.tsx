'use client';
import type { RefObject } from 'react';

// Device bezel: intentionally ALWAYS dark (a phone is black) — not a theme token.
const BEZEL = '#101012';

type Props = {
  previewUrl: string | null;
  displayUrl: string | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  previewKey: number;
  onRefresh: () => void;
};

export default function PreviewPane({ previewUrl, iframeRef, previewKey }: Props) {
  return (
    <div className="flex flex-1 flex-col items-start overflow-y-auto bg-[var(--bg-primary)] pb-8 pl-8 pr-4 pt-6">
      {/* iPhone skeleton — thin always-dark bezel, fixed width */}
      <div
        className="flex w-[360px] shrink-0 flex-1 flex-col overflow-hidden rounded-[2.5rem] p-1.5 shadow-[var(--shadow-card-lg)]"
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
