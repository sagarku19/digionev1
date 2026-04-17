'use client';
// Dashboard: Media Library — real Supabase Storage integration.
// Bucket: "uploads"  Path: uploads/creators/{profile_id}/{folder}/filename
// Folder routing: images/ · files/pdf/ · files/zip/ · files/other/ · documents/ · profile/

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import {
  Upload, Search, Grid3X3, List, Trash2, Copy, Check,
  X, Loader2, ImageIcon, Music, Video, Archive, FileText,
  File, FolderOpen, ChevronRight, Link2, Download,
  RefreshCw, AlertCircle, Eye,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

type Folder = 'images' | 'files/pdf' | 'files/zip' | 'files/other' | 'documents' | 'profile';
type FileKind = 'image' | 'video' | 'audio' | 'pdf' | 'zip' | 'document' | 'other';

type MediaFile = {
  id: string;           // storage path (unique)
  name: string;
  folder: Folder;
  kind: FileKind;
  size: number;
  url: string;          // public / signed URL
  created_at: string;
};

// ─── Constants ────────────────────────────────────────────────

const BUCKET = 'uploads';

const FOLDERS: { id: Folder; label: string; icon: React.ElementType; accept: string }[] = [
  { id: 'images',      label: 'Images',      icon: ImageIcon, accept: 'image/*' },
  { id: 'files/pdf',   label: 'PDFs',        icon: FileText,  accept: '.pdf' },
  { id: 'files/zip',   label: 'ZIPs',        icon: Archive,   accept: '.zip,.rar,.7z' },
  { id: 'files/other', label: 'Other Files', icon: File,      accept: '*' },
  { id: 'documents',   label: 'Documents',   icon: FileText,  accept: '.pdf,.doc,.docx,.xls,.xlsx' },
  { id: 'profile',     label: 'Profile',     icon: ImageIcon, accept: 'image/*' },
];

const KIND_COLORS: Record<FileKind, string> = {
  image:    'text-blue-500',
  video:    'text-gray-600',
  audio:    'text-rose-500',
  pdf:      'text-amber-500',
  zip:      'text-emerald-500',
  document: 'text-orange-500',
  other:    'text-gray-400',
};

// ─── Helpers ──────────────────────────────────────────────────

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function getKind(name: string, mime?: string): FileKind {
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

function folderFromKind(kind: FileKind): Folder {
  if (kind === 'image') return 'images';
  if (kind === 'video' || kind === 'audio') return 'files/other';
  if (kind === 'pdf') return 'files/pdf';
  if (kind === 'zip') return 'files/zip';
  if (kind === 'document') return 'documents';
  return 'files/other';
}

function folderFromPath(path: string): Folder {
  // path = uploads/creators/{id}/{folder}/filename
  const parts = path.split('/');
  // parts[0]=uploads parts[1]=creators parts[2]=profileId parts[3]= folder or "files"
  if (parts.length >= 6 && parts[3] === 'files') return `files/${parts[4]}` as Folder;
  return (parts[3] ?? 'images') as Folder;
}

function KindIcon({ kind, className }: { kind: FileKind; className?: string }) {
  const cls = `${className ?? 'w-6 h-6'} ${KIND_COLORS[kind]}`;
  if (kind === 'image') return <ImageIcon className={cls} />;
  if (kind === 'video') return <Video className={cls} />;
  if (kind === 'audio') return <Music className={cls} />;
  if (kind === 'pdf' || kind === 'document') return <FileText className={cls} />;
  if (kind === 'zip') return <Archive className={cls} />;
  return <File className={cls} />;
}

// ─── Upload progress item ──────────────────────────────────────

type UploadTask = { name: string; progress: number; error?: string };

// ─── Main page ────────────────────────────────────────────────

export default function MediaPage() {
  const supabase = createClient();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [activeFolder, setActiveFolder] = useState<Folder | 'all'>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [toast, setToast] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);

  const dropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Load profile + files ──────────────────────────────────────

  const loadFiles = useCallback(async (pid: string) => {
    setLoading(true);
    setLoadError('');
    try {
      const basePath = `creators/${pid}`;
      const subFolders: Folder[] = ['images', 'files/pdf', 'files/zip', 'files/other', 'documents', 'profile'];

      const all: MediaFile[] = [];

      await Promise.all(subFolders.map(async (folder) => {
        const storagePath = `${basePath}/${folder}`;
        const { data, error } = await supabase.storage.from(BUCKET).list(storagePath, {
          limit: 200, offset: 0, sortBy: { column: 'created_at', order: 'desc' },
        });
        if (error || !data) return;

        for (const item of data) {
          if (item.name === '.emptyFolderPlaceholder') continue;
          const fullPath = `${storagePath}/${item.name}`;
          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fullPath);
          all.push({
            id: fullPath,
            name: item.name,
            folder,
            kind: getKind(item.name, item.metadata?.mimetype),
            size: item.metadata?.size ?? 0,
            url: urlData.publicUrl,
            created_at: item.created_at ?? new Date().toISOString(),
          });
        }
      }));

      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setFiles(all);
    } catch (e: any) {
      setLoadError(e.message ?? 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    getCreatorProfileId(supabase).then(pid => {
      setProfileId(pid);
      loadFiles(pid);
    }).catch(e => {
      setLoadError(e.message);
      setLoading(false);
    });
  }, []);

  // ── Upload ────────────────────────────────────────────────────

  const handleFiles = useCallback(async (rawFiles: File[]) => {
    if (!profileId) return;
    const tasks: UploadTask[] = rawFiles.map(f => ({ name: f.name, progress: 0 }));
    setUploads(tasks);

    await Promise.all(rawFiles.map(async (file, i) => {
      const kind = getKind(file.name, file.type);
      const folder = folderFromKind(kind);
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const path = `creators/${profileId}/${folder}/${safeName}`;

      setUploads(prev => prev.map((t, idx) => idx === i ? { ...t, progress: 30 } : t));

      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600', upsert: false,
      });

      if (error) {
        setUploads(prev => prev.map((t, idx) => idx === i ? { ...t, error: error.message, progress: 0 } : t));
        return;
      }

      setUploads(prev => prev.map((t, idx) => idx === i ? { ...t, progress: 100 } : t));

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const newFile: MediaFile = {
        id: path,
        name: safeName,
        folder,
        kind: getKind(file.name, file.type),
        size: file.size,
        url: urlData.publicUrl,
        created_at: new Date().toISOString(),
      };
      setFiles(prev => [newFile, ...prev]);
    }));

    setTimeout(() => setUploads([]), 1500);
    showToast(`${rawFiles.length} file${rawFiles.length > 1 ? 's' : ''} uploaded`);
  }, [profileId, supabase]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) handleFiles(dropped);
  }, [handleFiles]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length) handleFiles(picked);
    e.target.value = '';
  };

  // ── Delete ────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.storage.from(BUCKET).remove([deleteTarget.id]);
    if (error) { showToast(`Delete failed: ${error.message}`); }
    else {
      setFiles(prev => prev.filter(f => f.id !== deleteTarget.id));
      showToast('File deleted');
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  // ── Copy URL ──────────────────────────────────────────────────

  const copyUrl = (file: MediaFile) => {
    navigator.clipboard.writeText(file.url);
    setCopiedId(file.id);
    showToast('URL copied');
    setTimeout(() => setCopiedId(''), 2000);
  };

  // ── Filter ────────────────────────────────────────────────────

  const filtered = files.filter(f => {
    const matchFolder = activeFolder === 'all' || f.folder === activeFolder;
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
    return matchFolder && matchSearch;
  });

  const totalSize = files.reduce((s, f) => s + f.size, 0);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="pt-6 pb-16 space-y-6 min-h-screen">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Media Library</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${files.length} files · ${formatBytes(totalSize)} used`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => profileId && loadFiles(profileId)}
            className="p-2 rounded-xl border border-[var(--border)] text-gray-400 hover:text-gray-600 dark:hover:text-[var(--text-primary)] hover:bg-gray-50 dark:hover:bg-[var(--bg-secondary)] transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Upload zone ── */}
      <div
        ref={dropRef}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all ${
          isDragging
            ? 'border-gray-900 dark:border-white bg-gray-100/50 dark:bg-gray-1000/5'
            : 'border-[var(--border)] hover:border-gray-400 dark:hover:border-indigo-600 bg-[var(--bg-primary)]'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
            <Upload className="w-7 h-7 text-gray-600 dark:text-[var(--text-secondary)]" />
          </div>

          {/* Text */}
          <div className="flex-1 text-center sm:text-left">
            <p className="font-bold text-[var(--text-primary)] text-sm">
              Drop files here or{' '}
              <button onClick={() => inputRef.current?.click()} className="text-gray-600 dark:text-[var(--text-secondary)] hover:underline">
                browse
              </button>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Images, PDFs, ZIPs, documents — up to 1 GB per file
            </p>
          </div>

          {/* Upload button */}
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold px-4 py-2 rounded-xl transition shadow-md shadow-indigo-500/20 shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
        </div>

        <input ref={inputRef} type="file" multiple accept="*" className="hidden" onChange={onInputChange} />
      </div>

      {/* ── Upload progress ── */}
      {uploads.length > 0 && (
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4 space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Uploading</p>
          {uploads.map((t, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-700 dark:text-[var(--text-secondary)] font-medium truncate max-w-[260px]">{t.name}</span>
                {t.error
                  ? <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{t.error}</span>
                  : <span className="text-gray-400">{t.progress}%</span>
                }
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${t.error ? 'bg-red-500' : t.progress === 100 ? 'bg-emerald-500' : 'bg-gray-1000'}`}
                  style={{ width: `${t.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {loadError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {loadError}
        </div>
      )}

      {/* ── Folder sidebar + content ── */}
      <div className="flex gap-5 items-start">

        {/* Folder nav */}
        <aside className="hidden md:flex flex-col w-44 shrink-0 bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-2 sticky top-4">
          <button
            onClick={() => setActiveFolder('all')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1 ${
              activeFolder === 'all'
                ? 'bg-gray-100 dark:bg-[var(--bg-secondary)] text-gray-700 dark:text-[var(--text-secondary)]'
                : 'text-gray-600 dark:text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            <span className="flex-1">All Files</span>
            <span className="text-[10px] font-bold text-gray-400">{files.length}</span>
          </button>
          <div className="h-px bg-gray-100 dark:bg-[var(--bg-secondary)] my-1" />
          {FOLDERS.map(f => {
            const count = files.filter(file => file.folder === f.id).length;
            const active = activeFolder === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFolder(f.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-gray-100 dark:bg-[var(--bg-secondary)] text-gray-700 dark:text-[var(--text-secondary)]'
                    : 'text-gray-600 dark:text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <f.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate text-left">{f.label}</span>
                {count > 0 && <span className="text-[10px] font-bold text-gray-400">{count}</span>}
              </button>
            );
          })}

          {/* Storage bar */}
          <div className="mt-4 px-2 pb-1">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
              <span>Storage</span>
              <span>{formatBytes(totalSize)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-1000 rounded-full"
                style={{ width: `${Math.min((totalSize / (1024 ** 3)) * 100, 100).toFixed(1)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">of 1 GB</p>
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search files…"
                className="w-full pl-9 pr-9 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-gray-400 text-[var(--text-primary)] placeholder-gray-400 transition"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-[var(--text-primary)]">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile folder pills */}
            <div className="md:hidden flex gap-1 overflow-x-auto">
              {FOLDERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFolder(activeFolder === f.id ? 'all' : f.id)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeFolder === f.id
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-[var(--bg-secondary)] text-gray-600 dark:text-[var(--text-secondary)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center bg-gray-100 dark:bg-[var(--bg-secondary)] p-1 rounded-xl shrink-0">
              <button
                onClick={() => setView('grid')}
                className={`p-1.5 rounded-lg transition ${view === 'grid' ? 'bg-white dark:bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-gray-400'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-1.5 rounded-lg transition ${view === 'list' ? 'bg-white dark:bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-gray-400'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="font-medium text-[var(--text-secondary)]">Media</span>
            {activeFolder !== 'all' && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="font-semibold text-gray-700 dark:text-[var(--text-primary)]">
                  {FOLDERS.find(f => f.id === activeFolder)?.label}
                </span>
              </>
            )}
            <span className="ml-auto text-gray-400">{filtered.length} files</span>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 dark:bg-[var(--bg-secondary)] rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-gray-300 dark:text-gray-700" />
              </div>
              <p className="font-bold text-gray-700 dark:text-[var(--text-secondary)] mb-1">
                {search ? `No files matching "${search}"` : 'No files yet'}
              </p>
              <p className="text-sm text-gray-400">
                {search ? 'Try a different search' : 'Upload your first file using the zone above'}
              </p>
            </div>
          )}

          {/* Grid view */}
          {!loading && filtered.length > 0 && view === 'grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map(file => (
                <div
                  key={file.id}
                  className="group relative bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-gray-400 dark:hover:border-indigo-600 hover:shadow-lg transition-all"
                >
                  {/* Preview */}
                  <div className="relative aspect-square bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden">
                    {file.kind === 'image' ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <KindIcon kind={file.kind} className="w-10 h-10" />
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button onClick={() => setPreviewFile(file)} className="p-2 bg-white/90 rounded-lg text-gray-800 hover:bg-white shadow transition" title="Preview">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => copyUrl(file)} className="p-2 bg-white/90 rounded-lg text-gray-800 hover:bg-white shadow transition" title="Copy URL">
                        {copiedId === file.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a href={file.url} target="_blank" rel="noreferrer" className="p-2 bg-white/90 rounded-lg text-gray-800 hover:bg-white shadow transition" title="Open">
                        <Link2 className="w-3.5 h-3.5" />
                      </a>
                      <button onClick={() => setDeleteTarget(file)} className="p-2 bg-white/90 rounded-lg text-red-600 hover:bg-white shadow transition" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-gray-800 dark:text-[var(--text-primary)] truncate" title={file.name}>{file.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatBytes(file.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List view */}
          {!loading && filtered.length > 0 && view === 'list' && (
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
              {filtered.map(file => (
                <div key={file.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center shrink-0 overflow-hidden border border-[var(--border)]">
                    {file.kind === 'image'
                      ? <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                      : <KindIcon kind={file.kind} className="w-4.5 h-4.5" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-[var(--text-primary)] truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatBytes(file.size)} · {FOLDERS.find(f => f.id === file.folder)?.label} · {new Date(file.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button onClick={() => setPreviewFile(file)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] transition">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => copyUrl(file)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] transition">
                      {copiedId === file.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a href={file.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] transition">
                      <Download className="w-4 h-4" />
                    </a>
                    <button onClick={() => setDeleteTarget(file)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
          <div className="relative max-w-3xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewFile(null)} className="absolute -top-10 right-0 text-white/70 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            {previewFile.kind === 'image' ? (
              <img src={previewFile.url} alt={previewFile.name} className="w-full max-h-[80vh] object-contain rounded-2xl" />
            ) : (
              <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-2xl p-12 flex flex-col items-center gap-4">
                <KindIcon kind={previewFile.kind} className="w-16 h-16" />
                <p className="font-bold text-[var(--text-primary)]">{previewFile.name}</p>
                <p className="text-sm text-gray-500">{formatBytes(previewFile.size)}</p>
                <a href={previewFile.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 px-5 py-2.5 rounded-xl text-sm font-semibold transition">
                  <Download className="w-4 h-4" /> Download
                </a>
              </div>
            )}
            <div className="mt-3 text-center text-white/60 text-xs">{previewFile.name} · {formatBytes(previewFile.size)}</div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] mb-1">Delete file?</h3>
            <p className="text-sm text-gray-500 mb-5 break-all">
              <span className="font-medium text-gray-700 dark:text-[var(--text-secondary)]">{deleteTarget.name}</span> will be permanently removed from storage.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-[var(--border)] rounded-xl text-sm font-semibold text-gray-600 dark:text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-[var(--bg-secondary)] transition">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleting} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold rounded-xl shadow-2xl">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
}
