'use client';
import { type ReactNode, type RefObject } from 'react';
import PreviewPane from '../editor/PreviewPane';

// Generic split shell retained for the main/single/payment editors to migrate onto later.
// The header was removed with the link-in-bio redesign; consumers supply their own top
// controls inside `children`.
type Props = {
  previewUrl: string | null;
  displayUrl: string | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  previewKey: number;
  onRefresh: () => void;
  children: ReactNode;
};

export default function SiteEditorShell({ previewUrl, displayUrl, iframeRef, previewKey, onRefresh, children }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="flex min-h-0 flex-1">
        {/* LEFT PANEL */}
        <div className="flex w-1/2 min-w-[420px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-primary)]">
          <div className="min-h-0 flex-1">{children}</div>
        </div>

        {/* RIGHT PREVIEW */}
        <PreviewPane
          previewUrl={previewUrl}
          displayUrl={displayUrl}
          iframeRef={iframeRef}
          previewKey={previewKey}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  );
}
