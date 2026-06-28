'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useProductFiles } from '@/hooks/products/useProductFiles';
import { useConfirm } from '@/hooks/useConfirm';
import { formatBytes } from '@/lib/format-bytes';
import { Upload, File as FileIcon, Trash2, Loader2, AlertCircle, RotateCcw, X } from 'lucide-react';

export default function DeliverablesUploader({ productId }: { productId: string }) {
  const { files, usedBytes, quotaBytes, isLoading, tasks, uploadFiles, retryTask, removeTask, abortUploads, deleteFile } = useProductFiles(productId);
  const { confirm, confirmDialog } = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [staged, setStaged] = useState<File[]>([]);
  const retryFiles = useRef<Map<string, File>>(new Map());

  // warn before leaving while uploads are running
  useEffect(() => {
    const active = tasks.some((t) => !t.error && t.progress < 100);
    if (!active) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [tasks]);

  useEffect(() => () => abortUploads(), [abortUploads]);

  // Picking files STAGES them (loads into the editor) — they upload only after
  // an explicit Upload click + confirm.
  const onFiles = (picked: File[]) => setStaged((p) => [...p, ...picked]);

  const startUpload = () => {
    if (staged.length === 0) return;
    staged.forEach((f) => retryFiles.current.set(`${f.name}-${f.size}`, f));
    void uploadFiles(staged);
    setStaged([]);
  };

  const pct = quotaBytes ? Math.min(100, (usedBytes / quotaBytes) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(Array.from(e.dataTransfer.files)); }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center py-10 px-6 border-2 border-dashed rounded-[var(--radius-lg)] cursor-pointer transition-all ${over ? 'border-[var(--brand)] bg-[var(--brand)]/5' : 'border-[var(--border)] hover:border-[var(--brand)]/50 bg-[var(--surface-muted)]'}`}
      >
        <div className="p-3 rounded-[var(--radius-lg)] mb-3 bg-[var(--surface-hover)]"><Upload className="w-6 h-6 text-[var(--text-secondary)]" /></div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">Drop deliverable files or click to select</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">Review them below, then upload — buyers download these after purchase</p>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      </div>

      {/* Ready to upload (staged) */}
      {staged.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Ready to upload</p>
            <button onClick={() => setStaged([])} className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Clear</button>
          </div>
          <div className="space-y-1.5">
            {staged.map((f, i) => (
              <div key={`${f.name}-${f.size}-${i}`} className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2">
                <FileIcon className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{f.name}</p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">{formatBytes(f.size)}</p>
                </div>
                <button onClick={() => setStaged((s) => s.filter((_, idx) => idx !== i))} title="Remove" aria-label="Remove from upload" className="p-1 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--danger)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
          <button onClick={startUpload} className="w-full inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-semibold px-3 py-2 transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            <Upload className="w-4 h-4" /> Upload {staged.length} file{staged.length > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Quota bar */}
      <div>
        <div className="flex justify-between text-[11px] text-[var(--text-tertiary)] mb-1"><span>Storage used</span><span>{formatBytes(usedBytes)} / {formatBytes(quotaBytes)}</span></div>
        <div className="h-1.5 bg-[var(--surface-muted)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${pct >= 100 ? 'bg-[var(--danger)]' : 'bg-[var(--brand)]'}`} style={{ width: `${pct}%` }} /></div>
      </div>

      {/* In-flight tasks */}
      {tasks.length > 0 && (
        <div className="space-y-2">
          {/* eslint-disable-next-line react-hooks/refs */}
          {tasks.map((t) => {
            const file = retryFiles.current.get(`${t.name}-${t.name.length}`) ?? null; // best-effort retry lookup
            return (
              <div key={t.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[var(--text-secondary)] font-medium truncate max-w-[260px]">{t.name}</span>
                  {t.error
                    ? <span className="flex items-center gap-2 text-[var(--danger)]"><AlertCircle className="w-3 h-3" />{t.error}
                        {file && <button onClick={() => retryTask(t, file)} className="inline-flex items-center gap-0.5 hover:underline"><RotateCcw className="w-3 h-3" />Retry</button>}
                        <button onClick={() => removeTask(t.id)} className="inline-flex items-center gap-0.5 hover:underline"><X className="w-3 h-3" />Remove</button>
                      </span>
                    : <span className="text-[var(--text-tertiary)]">{t.progress}%</span>}
                </div>
                {!t.error && <div className="h-1.5 bg-[var(--surface-muted)] rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${t.progress === 100 ? 'bg-[var(--success)]' : 'bg-[var(--brand)]'}`} style={{ width: `${t.progress}%` }} /></div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Existing files */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[var(--brand)]" /></div>
      ) : files.length === 0 ? (
        <p className="text-center text-sm text-[var(--text-tertiary)] py-6">No files yet — select the product&apos;s deliverables above, or use a content link below.</p>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] divide-y divide-[var(--border-subtle)] overflow-hidden">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center shrink-0"><FileIcon className="w-4 h-4 text-[var(--text-secondary)]" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-[var(--text-primary)] truncate">{f.name}</p><p className="text-xs text-[var(--text-tertiary)]">{formatBytes(f.size)} · {new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
              <button
                onClick={async () => { if (await confirm({ title: 'Delete file?', description: `"${f.name}" will be permanently removed. Buyers will no longer be able to download it.`, confirmLabel: 'Delete', isDestructive: true })) deleteFile(f.id); }}
                className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              ><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
