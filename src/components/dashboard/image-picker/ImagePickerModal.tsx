'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Area } from 'react-easy-crop';
import { X, FolderOpen, Upload, ImageIcon, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import CropStage from './CropStage';
import StockPanel from './StockPanel';
import MyUploadsPanel from './MyUploadsPanel';
import UploadPanel from './UploadPanel';

export type ImagePickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
  bucket?: 'creator-public' | 'public-asset';
  kind?: string;
  currentUrl?: string;
};

type Tab = 'upload' | 'stock' | 'mine';
type Source = { kind: 'file'; file: File } | { kind: 'fileId'; id: string } | { kind: 'url'; url: string };

const RAIL_BTN = (active: boolean) =>
  `w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-md)] text-xs font-semibold text-left transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
    active ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
  }`;

export default function ImagePickerModal({ open, onClose, onSelect, title = 'Select Image', bucket = 'creator-public', kind = 'other', currentUrl }: ImagePickerProps) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('upload');
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set<Tab>(['upload']));
  const selectTab = useCallback((t: Tab) => {
    setTab(t);
    setVisited((prev) => (prev.has(t) ? prev : new Set(prev).add(t)));
  }, []);
  const [source, setSource] = useState<Source | null>(null);   // identity for the network call
  const [imageSrc, setImageSrc] = useState<string | null>(null); // what CropStage renders
  const [replacesFileId, setReplacesFileId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
  }, []);

  // Pick a local file: revoke the previous object URL BEFORE creating the next.
  // NOTE: do NOT clear replacesFileId here — when the picker was opened on an
  // existing placement (currentUrl -> a derivative), choosing ANY new image must
  // still replace + delete the old one. Only reset()/handleClose clears it.
  const handleLocalFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    revokeObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setSource({ kind: 'file', file });
    setImageSrc(url);
  }, [revokeObjectUrl]);

  const handleMyUpload = useCallback((sel: { fileId: string; url: string }) => {
    revokeObjectUrl(); setSource({ kind: 'fileId', id: sel.fileId }); setImageSrc(sel.url);
  }, [revokeObjectUrl]);

  const handleStock = useCallback((url: string) => {
    revokeObjectUrl(); setSource({ kind: 'url', url }); setImageSrc(url);
  }, [revokeObjectUrl]);

  const reset = useCallback(() => {
    revokeObjectUrl(); setSource(null); setImageSrc(null); setReplacesFileId(null); setTab('upload'); setVisited(new Set<Tab>(['upload'])); setBusy(false);
  }, [revokeObjectUrl]);

  // Unsaved-changes guard: confirm if a crop/source is staged.
  const requestClose = useCallback(() => {
    if (busy) return; // never close mid-upload silently
    if (imageSrc && !window.confirm('Discard this image?')) return;
    reset(); onClose();
  }, [busy, imageSrc, reset, onClose]);

  // beforeunload warning while busy.
  useEffect(() => {
    if (!busy) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [busy]);

  // Esc closes (CropStage handles its own Esc→back when staged).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !imageSrc) requestClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, imageSrc, requestClose]);

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Paste-from-clipboard while open.
  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (file) { setTab('upload'); handleLocalFile(file); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [open, handleLocalFile]);

  // Re-crop: load original + saved crop when currentUrl is a derivative.
  useEffect(() => {
    if (!open || !currentUrl) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/media/resolve?url=${encodeURIComponent(currentUrl)}`);
      const data = await res.json().catch(() => null);
      if (!cancelled && data?.originalUrl) { setSource({ kind: 'url', url: data.originalUrl }); setReplacesFileId(data.derivativeFileId ?? null); setImageSrc(data.originalUrl); }
    })();
    return () => { cancelled = true; };
  }, [open, currentUrl]);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  // ── Network actions ──
  const uploadOriginal = useCallback(async (file: File): Promise<{ fileId: string; publicUrl: string }> => {
    const fd = new FormData(); fd.append('file', file); fd.append('bucket', bucket); fd.append('kind', kind);
    const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
    const data = await res.json(); if (!res.ok) throw new Error(data.error ?? 'Upload failed');
    return data;
  }, [bucket, kind]);

  const derive = useCallback(async (body: Record<string, unknown>): Promise<string> => {
    const res = await fetch('/api/media/derive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, kind, replacesFileId }) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error ?? 'Crop failed');
    return data.publicUrl as string;
  }, [kind, replacesFileId]);

  const finish = useCallback((url: string) => { qc.invalidateQueries({ queryKey: ['media', 'list'] }); onSelect(url); reset(); onClose(); }, [qc, onSelect, reset, onClose]);

  const handleConfirm = useCallback(async (area: Area) => {
    if (!source) return;
    setBusy(true);
    try {
      let url: string;
      if (source.kind === 'file') { const up = await uploadOriginal(source.file); url = await derive({ sourceFileId: up.fileId, crop: area }); }
      else if (source.kind === 'fileId') url = await derive({ sourceFileId: source.id, crop: area });
      else url = await derive({ sourceUrl: source.url, crop: area });
      finish(url);
    } catch (err) { console.error(err); setBusy(false); }
  }, [source, uploadOriginal, derive, finish]);

  const handleUseOriginal = useCallback(async () => {
    if (!source) return;
    setBusy(true);
    try {
      if (source.kind === 'file') { const up = await uploadOriginal(source.file); finish(up.publicUrl); }
      else if (source.kind === 'url') finish(source.url);
      else { finish(imageSrc!); } // fileId path: imageSrc IS the original url
    } catch (err) { console.error(err); setBusy(false); }
  }, [source, uploadOriginal, finish, imageSrc]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true"
      onDragOver={(e) => { e.preventDefault(); if (!imageSrc) setDragging(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) { setTab('upload'); handleLocalFile(f); } }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={requestClose} />

      {/* Fixed-size modal — header pinned, body scrolls internally so the box never resizes on load or tab switch */}
      <div className="relative w-full max-w-3xl h-[600px] max-h-[88vh] bg-[var(--surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-card-lg)] border border-[var(--border)] flex flex-col overflow-hidden">
        {/* Header (fixed) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[var(--surface-muted)] rounded-[var(--radius-md)]"><ImageIcon className="w-4 h-4 text-[var(--text-secondary)]" /></div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">{imageSrc ? 'Crop Image' : title}</h2>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{imageSrc ? 'Adjust crop, aspect & zoom' : 'Upload, browse stock, or reuse'}</p>
            </div>
          </div>
          <button onClick={requestClose} className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"><X className="w-4 h-4" /></button>
        </div>

        {/* Body (fixed height) */}
        {imageSrc ? (
          <div className="flex-1 min-h-0">
            <CropStage imageSrc={imageSrc} busy={busy} onConfirm={handleConfirm} onUseOriginal={handleUseOriginal} onBack={() => { revokeObjectUrl(); setImageSrc(null); setSource(null); }} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex">
            {/* Left rail: Upload → Stock → Uploaded */}
            <div className="w-44 shrink-0 border-r border-[var(--border)] p-2 space-y-1 bg-[var(--surface-muted)]/30">
              <button onClick={() => selectTab('upload')} className={RAIL_BTN(tab === 'upload')}><Upload className="w-4 h-4 shrink-0" />New Upload</button>
              <button onClick={() => selectTab('stock')} className={RAIL_BTN(tab === 'stock')}><Sparkles className="w-4 h-4 shrink-0" />DigiOne Stock</button>
              <button onClick={() => selectTab('mine')} className={RAIL_BTN(tab === 'mine')}><FolderOpen className="w-4 h-4 shrink-0" />My Uploads</button>
            </div>
            {/* Content — each panel stays mounted once visited, so switching tabs is instant (no remount/refetch) */}
            <div className="flex-1 min-w-0 overflow-y-auto">
              <div className={tab === 'upload' ? '' : 'hidden'}><UploadPanel onFile={handleLocalFile} /></div>
              {visited.has('stock') && <div className={tab === 'stock' ? '' : 'hidden'}><StockPanel onPick={handleStock} /></div>}
              {visited.has('mine') && <div className={tab === 'mine' ? '' : 'hidden'}><MyUploadsPanel onPick={handleMyUpload} /></div>}
            </div>
          </div>
        )}
      </div>

      {/* Drag-anywhere overlay */}
      {dragging && !imageSrc && (
        <div className="absolute inset-4 z-10 rounded-[var(--radius-xl)] border-2 border-dashed border-[var(--brand)] bg-[var(--brand)]/10 flex items-center justify-center pointer-events-none">
          <p className="text-sm font-semibold text-[var(--brand)]">Drop image to upload</p>
        </div>
      )}
    </div>,
    document.body,
  );
}
