'use client';
// Dashboard: Media Library — browse, upload, and manage uploaded files.
// DB tables: storage (Supabase Storage via signed URLs), products (read thumbnail_url)

import React, { useState, useCallback, useRef } from 'react';
import {
  Upload, Image, FileText, File, Search, Grid, List,
  Trash2, Copy, Check, Download, X, Loader2, ImageIcon,
  Music, Video, Archive, Link as LinkIcon,
} from 'lucide-react';

// ─── Mock data — replace with real Supabase storage fetch ─────
const DEMO_FILES = [
  {
    id: '1',
    name: 'hero-banner.jpg',
    type: 'image',
    size: 1240000,
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
    created_at: '2026-03-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'product-thumbnail.png',
    type: 'image',
    size: 430000,
    url: 'https://images.unsplash.com/photo-1546961342-ea5f62d5a27b?w=400&q=80',
    created_at: '2026-03-14T09:30:00Z',
  },
  {
    id: '3',
    name: 'course-intro.mp4',
    type: 'video',
    size: 52000000,
    url: '#',
    created_at: '2026-03-13T08:00:00Z',
  },
  {
    id: '4',
    name: 'ebook-template.pdf',
    type: 'document',
    size: 2100000,
    url: '#',
    created_at: '2026-03-12T14:00:00Z',
  },
  {
    id: '5',
    name: 'digital-assets.zip',
    type: 'archive',
    size: 18500000,
    url: '#',
    created_at: '2026-03-11T11:00:00Z',
  },
  {
    id: '6',
    name: 'podcast-ep01.mp3',
    type: 'audio',
    size: 34000000,
    url: '#',
    created_at: '2026-03-10T16:00:00Z',
  },
  {
    id: '7',
    name: 'store-logo.svg',
    type: 'image',
    size: 12000,
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
    created_at: '2026-03-09T10:30:00Z',
  },
  {
    id: '8',
    name: 'brand-kit.zip',
    type: 'archive',
    size: 5400000,
    url: '#',
    created_at: '2026-03-08T09:00:00Z',
  },
];

type FileItem = (typeof DEMO_FILES)[number];

type FilterType = 'all' | 'image' | 'video' | 'audio' | 'document' | 'archive';

// ─── Helpers ──────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function FileIcon({ type, className }: { type: string; className?: string }) {
  const cls = className ?? 'w-8 h-8';
  if (type === 'image') return <Image className={`${cls} text-[var(--text-secondary)]`} />;
  if (type === 'video') return <Video className={`${cls} text-[var(--text-secondary)]`} />;
  if (type === 'audio') return <Music className={`${cls} text-rose-500`} />;
  if (type === 'document') return <FileText className={`${cls} text-amber-500`} />;
  if (type === 'archive') return <Archive className={`${cls} text-emerald-500`} />;
  return <File className={`${cls} text-gray-400`} />;
}

function FilterTab({
  id,
  label,
  icon: Icon,
  active,
  count,
  onClick,
}: {
  id: FilterType;
  label: string;
  icon: React.ElementType;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {count > 0 && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            active
              ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
              : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-500'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Upload zone ──────────────────────────────────────────────
function UploadZone({ onUpload }: { onUpload: (files: File[]) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onUpload(files);
    },
    [onUpload]
  );

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer border-2 border-dashed rounded-2xl px-6 py-8 flex flex-col items-center justify-center gap-3 transition-all ${
        isDragging
          ? 'border-[var(--accent)] bg-[var(--bg-tertiary)]'
          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A1A] hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)]'
      }`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
        <Upload className="w-7 h-7 text-[var(--text-secondary)]" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-gray-800 dark:text-white">
          Drop files here, or <span className="text-[var(--text-primary)]">browse</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Images, PDFs, videos, ZIPs — up to 1 GB per file
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={e => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) onUpload(files);
        }}
      />
    </div>
  );
}

// ─── File card (grid) ─────────────────────────────────────────
function FileCard({
  file,
  onDelete,
}: {
  file: FileItem;
  onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(file.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-[var(--accent)] dark:hover:border-[var(--accent)] hover:shadow-lg  transition-all duration-200">
      {/* Preview */}
      <div className="relative aspect-video bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
        {file.type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.url}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileIcon type={file.type} className="w-12 h-12" />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
          <button
            onClick={copy}
            title="Copy URL"
            className="p-2 bg-white/90 rounded-lg text-gray-800 hover:bg-white transition shadow"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open"
            className="p-2 bg-white/90 rounded-lg text-gray-800 hover:bg-white transition shadow"
          >
            <LinkIcon className="w-4 h-4" />
          </a>
          <button
            onClick={() => onDelete(file.id)}
            title="Delete"
            className="p-2 bg-white/90 rounded-lg text-red-600 hover:bg-white transition shadow"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">{formatBytes(file.size)}</p>
      </div>
    </div>
  );
}

// ─── File row (list) ──────────────────────────────────────────
function FileRow({
  file,
  onDelete,
}: {
  file: FileItem;
  onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(file.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group flex items-center gap-4 px-4 py-3 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl hover:border-[var(--accent)] dark:hover:border-[var(--accent)] transition-all">
      {/* Preview thumb */}
      <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center shrink-0 overflow-hidden border border-gray-100 dark:border-gray-800">
        {file.type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <FileIcon type={file.type} className="w-5 h-5" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatBytes(file.size)} · {new Date(file.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
        <button
          onClick={copy}
          title="Copy URL"
          className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--text-primary)] dark:hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-tertiary)] transition"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <Download className="w-4 h-4" />
        </a>
        <button
          onClick={() => onDelete(file.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function MediaPage() {
  const [files, setFiles] = useState(DEMO_FILES);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpload = async (rawFiles: File[]) => {
    setUploading(true);
    // Simulate upload delay
    await new Promise(r => setTimeout(r, 1200));

    const newItems = rawFiles.map((f, i) => ({
      id: `new-${Date.now()}-${i}`,
      name: f.name,
      type: f.type.startsWith('image/')
        ? 'image'
        : f.type.startsWith('video/')
        ? 'video'
        : f.type.startsWith('audio/')
        ? 'audio'
        : f.name.endsWith('.zip') || f.name.endsWith('.rar')
        ? 'archive'
        : 'document',
      size: f.size,
      url: f.type.startsWith('image/') ? URL.createObjectURL(f) : '#',
      created_at: new Date().toISOString(),
    }));

    setFiles(prev => [...newItems, ...prev]);
    setUploading(false);
    showToast(`${rawFiles.length} file${rawFiles.length > 1 ? 's' : ''} uploaded`);
  };

  const handleDelete = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    showToast('File deleted');
  };

  const FILTERS: { id: FilterType; label: string; icon: React.ElementType }[] = [
    { id: 'all',      label: 'All',       icon: Grid     },
    { id: 'image',    label: 'Images',    icon: ImageIcon },
    { id: 'video',    label: 'Videos',    icon: Video     },
    { id: 'audio',    label: 'Audio',     icon: Music     },
    { id: 'document', label: 'Documents', icon: FileText  },
    { id: 'archive',  label: 'Archives',  icon: Archive   },
  ];

  const filtered = files.filter(
    f =>
      (filter === 'all' || f.type === filter) &&
      (search === '' || f.name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="pb-16 pt-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Media</h1>
          <p className="text-sm text-gray-500 mt-1">
            {files.length} files · {formatBytes(totalSize)} used of 1 GB
          </p>
        </div>

        {/* Storage bar */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="w-32 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full"
              style={{ width: `${Math.min((totalSize / (1024 * 1024 * 1024)) * 100, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {formatBytes(totalSize)} / 1 GB
          </span>
        </div>
      </div>

      {/* Upload zone */}
      <UploadZone onUpload={handleUpload} />

      {uploading && (
        <div className="flex items-center gap-3 p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] dark:border-[var(--border)] rounded-xl">
          <Loader2 className="w-4 h-4 text-[var(--text-secondary)] animate-spin shrink-0" />
          <p className="text-sm text-[var(--text-primary)] font-medium">Uploading…</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by filename…"
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/40 text-gray-900 dark:text-white placeholder-gray-400 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setView('grid')}
            className={`p-2 rounded-lg transition ${
              view === 'grid'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2 rounded-lg transition ${
              view === 'list'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {FILTERS.map(f => (
          <FilterTab
            key={f.id}
            id={f.id}
            label={f.label}
            icon={f.icon}
            active={filter === f.id}
            count={f.id === 'all' ? files.length : files.filter(file => file.type === f.id).length}
            onClick={() => setFilter(f.id)}
          />
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-800">
            <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-700" />
          </div>
          <p className="text-base font-bold text-gray-700 dark:text-gray-300 mb-1">
            {search ? `No files matching "${search}"` : 'No files yet'}
          </p>
          <p className="text-sm text-gray-400">
            {search ? 'Try a different search term' : 'Upload your first file using the zone above'}
          </p>
        </div>
      )}

      {/* File grid */}
      {filtered.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(file => (
            <FileCard key={file.id} file={file} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* File list */}
      {filtered.length > 0 && view === 'list' && (
        <div className="space-y-2">
          {filtered.map(file => (
            <FileRow key={file.id} file={file} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
}
