'use client';
import { type ReactNode, type RefObject, type ElementType } from 'react';
import EditorTopBar from '../editor/EditorTopBar';
import PreviewPane from '../editor/PreviewPane';

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
  // left panel body (EditorPanel)
  children: ReactNode;
};

export default function SiteEditorShell(props: Props) {
  const {
    title, typeLabel, typeIcon, onBack, saving, saved, onSave,
    canUndo, canRedo, onUndo, onRedo, theme, onToggleTheme,
    previewUrl, displayUrl, iframeRef, previewKey, onRefresh,
    children,
  } = props;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="flex min-h-0 flex-1">

        {/* LEFT PANEL */}
        <div className="flex w-1/2 min-w-[420px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-primary)]">
          <EditorTopBar
            title={title}
            typeLabel={typeLabel}
            typeIcon={typeIcon}
            onBack={onBack}
            saving={saving}
            saved={saved}
            onSave={onSave}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
            theme={theme}
            onToggleTheme={onToggleTheme}
            displayUrl={displayUrl}
          />
          {/* body slot */}
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
