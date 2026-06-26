'use client';
// Dashboard: Media Library — backed by /api/media/list + /api/media/delete.
// Lists ORIGINAL images in creator-public (parent_file_id IS NULL), newest first.
// Grouped/filterable by kind. Delete is hard-cascade (original + all derivatives).

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, Search, Grid3X3, List, Trash2, Copy, Check,
  X, Loader2, ImageIcon, FolderOpen, ChevronRight, Link2, Download,
  RefreshCw, AlertCircle, Eye,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

type MediaFile = {
  id: string;
  name: string;
  kind: string;
  size: number;
  url: string | null;
  createdAt: string;
};

type UploadTask = { name: string; progress: number; error?: string };

// ─── Helpers ──────────────────────────────────────────────────

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function getKind(name: string, mime?: string): string {
  const m = mime ?? '';
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf' || m === 'application/pdf') return 'pdf';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'zip';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(ext)) return 'document';
  return 'other';
}

// All items in the media library are images; KindIcon always renders ImageIcon.
// The kind prop is retained for color variation and future extension.
function KindIcon({ kind, className }: { kind: string; className?: string }) {
  const special = ['cover', 'avatar', 'banner', 'linkinbio', 'gallery'].includes(kind);
  return (
    <ImageIcon
      className={`${className ?? 'w-6 h-6'} ${special ? 'text-[var(--info)]' : 'text-[var(--text-secondary)]'}`}
    />
  );
}

// ─── Main page ────────────────────────────────────────────────

export default function MediaPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadTick, setLoadTick] = useState(0);

  const [activeKind, setActiveKind] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [toast, setToast] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  // ── Load ─────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    fetch('/api/media/list')
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.json() as { error?: string };
          if (!cancelled) setLoadError(body.error ?? 'Failed to load files');
          return;
        }
        const data = await res.json() as { files: MediaFile[] };
        if (!cancelled) setFiles(data.files);
      })
      .catch(() => { if (!cancelled) setLoadError('Failed to load files'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadTick]);

  // ── Upload ────────────────────────────────────────────────────

  async function handleFiles(rawFiles: File[]) {
    const tasks: UploadTask[] = rawFiles.map(f => ({ name: f.name, progress: 0 }));
    setUploads(tasks);

    await Promise.all(rawFiles.map(async (file, i) => {
      const fileKind = getKind(file.name, file.type);
      if (fileKind !== 'image') {
        setUploads(prev => prev.map((t, idx) =>
          idx === i ? { ...t, error: `Not an image (${fileKind}) — skipped` } : t
        ));
        return;
      }

      setUploads(prev => prev.map((t, idx) => idx === i ? { ...t, progress: 30 } : t));

      const form = new FormData();
      form.append('file', file);
      form.append('bucket', 'creator-public');
      form.append('kind', 'other');

      try {
        const res = await fetch('/api/media/upload', { method: 'POST', body: form });
        if (!res.ok) {
          const errBody = await res.json() as { error?: string };
          setUploads(prev => prev.map((t, idx) =>
            idx === i ? { ...t, error: errBody.error ?? 'Upload failed', progress: 0 } : t
          ));
          return;
        }
        setUploads(prev => prev.map((t, idx) => idx === i ? { ...t, progress: 100 } : t));
        const data = await res.json() as { fileId: string; publicUrl: string; objectKey: string };
        const newFile: MediaFile = {
          id: data.fileId, name: file.name, kind: 'other',
          size: file.size, url: data.publicUrl, createdAt: new Date().toISOString(),
        };
        setFiles(prev => [newFile, ...prev]);
      } catch {
        setUploads(prev => prev.map((t, idx) =>
          idx === i ? { ...t, error: 'Upload failed', progress: 0 } : t
        ));
      }
    }));

    setTimeout(() => setUploads([]), 1500);
    const imageCount = rawFiles.filter(f => getKind(f.name, f.type) === 'image').length;
    if (imageCount > 0) {
      showToast(`${imageCount} image${imageCount !== 1 ? 's' : ''} uploaded`);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) void handleFiles(dropped);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length) void handleFiles(picked);
    e.target.value = '';
  }

  // ── Delete ────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/media/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: deleteTarget.id }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        showToast(`Delete failed: ${body.error ?? 'Unknown error'}`);
      } else {
        const body = await res.json() as { removed: number };
        setFiles(prev => prev.filter(f => f.id !== deleteTarget.id));
        showToast(`Deleted (${body.removed} file${body.removed !== 1 ? 's' : ''})`);
      }
    } catch {
      showToast('Delete failed');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  // ── Copy URL ──────────────────────────────────────────────────

  function copyUrl(file: MediaFile) {
    if (!file.url) { showToast('No public URL'); return; }
    navigator.clipboard.writeText(file.url).catch(() => { /* ignore clipboard errors */ });
    setCopiedId(file.id);
    showToast('URL copied');
    setTimeout(() => setCopiedId(''), 2000);
  }

  // ── Filter ────────────────────────────────────────────────────

  const distinctKinds = [...new Set(files.map(f => f.kind))].sort();

  const filtered = files.filter(f => {
    const matchKind = activeKind === 'all' || f.kind === activeKind;
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
    return matchKind && matchSearch;
  });

  const totalSize = files.reduce((s, f) => s + f.size, 0);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Media Library</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {loading ? 'Loading…' : `${files.length} file${files.length !== 1 ? 's' : ''} · ${formatBytes(totalSize)} used`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLoadTick(t => t + 1)}
            className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Upload zone ── */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all ${
          isDragging
            ? 'border-[var(--border-strong)] bg-[var(--surface-muted)]'
            : 'border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--surface)]'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-[var(--surface-muted)] flex items-center justify-center shrink-0">
            <Upload className="w-7 h-7 text-[var(--text-secondary)]" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-bold text-[var(--text-primary)] text-sm">
              Drop images here or{' '}
              <button
                onClick={() => inputRef.current?.click()}
                className="text-[var(--brand)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Images only (JPEG, PNG, WebP, GIF) — up to 15 MB per file
            </p>
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] text-xs font-bold px-4 py-2 rounded-xl transition shadow-[var(--shadow-xs)] shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
        </div>
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={onInputChange} />
      </div>

      {/* ── Upload progress ── */}
      {uploads.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)] mb-3">Uploading</p>
          {uploads.map((t, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[var(--text-secondary)] font-medium truncate max-w-[260px]">{t.name}</span>
                {t.error
                  ? <span className="text-[var(--danger)] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{t.error}</span>
                  : <span className="text-[var(--text-tertiary)]">{t.progress}%</span>
                }
              </div>
              {!t.error && (
                <div className="h-1.5 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${t.progress === 100 ? 'bg-[var(--success)]' : 'bg-[var(--brand)]'}`}
                    style={{ width: `${t.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Load error ── */}
      {loadError && (
        <div className="flex items-center gap-3 p-4 bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-xl text-[var(--danger)] text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {loadError}
        </div>
      )}

      {/* ── Kind sidebar + content ── */}
      <div className="flex gap-5 items-start">

        {/* Kind nav */}
        <aside className="hidden md:flex flex-col w-44 shrink-0 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-2 sticky top-4">
          <button
            onClick={() => setActiveKind('all')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
              activeKind === 'all'
                ? 'bg-[var(--surface-muted)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            <span className="flex-1">All Files</span>
            <span className="text-[10px] font-bold text-[var(--text-tertiary)]">{files.length}</span>
          </button>
          {distinctKinds.length > 0 && <div className="h-px bg-[var(--border-subtle)] my-1" />}
          {distinctKinds.map(kind => {
            const count = files.filter(f => f.kind === kind).length;
            const active = activeKind === kind;
            return (
              <button
                key={kind}
                onClick={() => setActiveKind(kind)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                  active
                    ? 'bg-[var(--surface-muted)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <ImageIcon className="w-4 h-4 shrink-0 text-[var(--info)]" />
                <span className="flex-1 truncate text-left capitalize">{kind}</span>
                {count > 0 && <span className="text-[10px] font-bold text-[var(--text-tertiary)]">{count}</span>}
              </button>
            );
          })}

          {/* Storage bar */}
          <div className="mt-4 px-2 pb-1">
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1.5">
              <span>Storage</span>
              <span>{formatBytes(totalSize)}</span>
            </div>
            <div className="h-1.5 bg-[var(--surface-muted)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--brand)] rounded-full"
                style={{ width: `${Math.min((totalSize / (1024 ** 3)) * 100, 100).toFixed(1)}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">of 1 GB</p>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search files…"
                className="w-full pl-9 pr-9 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--border-strong)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile kind pills */}
            <div className="md:hidden flex gap-1 overflow-x-auto">
              {distinctKinds.map(kind => (
                <button
                  key={kind}
                  onClick={() => setActiveKind(activeKind === kind ? 'all' : kind)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                    activeKind === kind
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                      : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
                  }`}
                >
                  {kind}
                </button>
              ))}
            </div>

            <div className="flex items-center bg-[var(--surface-muted)] p-1 rounded-xl shrink-0">
              <button
                onClick={() => setView('grid')}
                className={`p-1.5 rounded-lg transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${view === 'grid' ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-tertiary)]'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-1.5 rounded-lg transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${view === 'list' ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-tertiary)]'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
            <span className="font-medium text-[var(--text-secondary)]">Media</span>
            {activeKind !== 'all' && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="font-semibold text-[var(--text-primary)] capitalize">{activeKind}</span>
              </>
            )}
            <span className="ml-auto text-[var(--text-tertiary)]">{filtered.length} files</span>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square bg-[var(--surface-muted)] rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-[var(--text-tertiary)]" />
              </div>
              <p className="font-bold text-[var(--text-secondary)] mb-1">
                {search ? `No files matching "${search}"` : 'No images yet'}
              </p>
              <p className="text-sm text-[var(--text-tertiary)]">
                {search ? 'Try a different search' : 'Upload your first image using the zone above'}
              </p>
            </div>
          )}

          {/* Grid view */}
          {!loading && filtered.length > 0 && view === 'grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map(file => (
                <div
                  key={file.id}
                  className="group relative bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] transition-all"
                >
                  <div className="relative aspect-square bg-[var(--surface-muted)] flex items-center justify-center overflow-hidden">
                    {file.url ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <KindIcon kind={file.kind} className="w-10 h-10" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="p-2 bg-white/90 rounded-lg text-neutral-800 hover:bg-white shadow transition focus-visible:outline-none"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => copyUrl(file)}
                        className="p-2 bg-white/90 rounded-lg text-neutral-800 hover:bg-white shadow transition focus-visible:outline-none"
                        title="Copy URL"
                      >
                        {copiedId === file.id ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {file.url && (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-white/90 rounded-lg text-neutral-800 hover:bg-white shadow transition"
                          title="Open"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => setDeleteTarget(file)}
                        className="p-2 bg-white/90 rounded-lg text-[var(--danger)] hover:bg-white shadow transition focus-visible:outline-none"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate" title={file.name}>{file.name}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 capitalize">{file.kind} · {formatBytes(file.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List view */}
          {!loading && filtered.length > 0 && view === 'list' && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border-subtle)]">
              {filtered.map(file => (
                <div key={file.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-hover)] transition">
                  <div className="w-9 h-9 rounded-xl bg-[var(--surface-muted)] flex items-center justify-center shrink-0 overflow-hidden border border-[var(--border)]">
                    {file.url
                      ? <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                      : <KindIcon kind={file.kind} className="w-4 h-4" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{file.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)] capitalize">
                      {file.kind} · {formatBytes(file.size)} · {new Date(file.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => copyUrl(file)}
                      className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      {copiedId === file.id ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {file.url && (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => setDeleteTarget(file)}
                      className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Preview modal ── */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white focus-visible:outline-none"
            >
              <X className="w-6 h-6" />
            </button>
            {previewFile.url ? (
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="w-full max-h-[80vh] object-contain rounded-2xl"
              />
            ) : (
              <div className="bg-[var(--surface)] rounded-2xl p-12 flex flex-col items-center gap-4">
                <KindIcon kind={previewFile.kind} className="w-16 h-16" />
                <p className="font-bold text-[var(--text-primary)]">{previewFile.name}</p>
                <p className="text-sm text-[var(--text-secondary)]">{formatBytes(previewFile.size)}</p>
              </div>
            )}
            <div className="mt-3 text-center text-white/60 text-xs">
              {previewFile.name} · {formatBytes(previewFile.size)}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full shadow-[var(--shadow-lg)]">
            <div className="w-12 h-12 rounded-full bg-[var(--danger-bg)] flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-[var(--danger)]" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] mb-1">Delete original?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-5">
              This permanently deletes the original AND every cropped version made from it. Any product cover, avatar, or banner using those crops will break.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                Cancel
              </button>
              <button
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="flex-1 py-2.5 bg-[var(--danger)] hover:opacity-90 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold rounded-xl shadow-[var(--shadow-lg)]">
          <Check className="w-4 h-4 shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
}
