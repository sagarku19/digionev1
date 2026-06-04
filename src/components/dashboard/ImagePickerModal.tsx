'use client';
/**
 * ImagePickerModal — full-featured image picker with:
 *  • Library tab: browse & search public stock images
 *  • Upload tab: drag-drop or file picker for user uploads
 *  • Crop step: react-easy-crop with preset ratios (9:16, 1:1, 16:9, free)
 *  • Uploads cropped/original to Supabase storage, returns final URL
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { getCroppedImg } from '@/lib/crop-image';
import { supabase } from '@/lib/supabase/client';
import {
  X, Search, Upload, ImageIcon, Loader2, ZoomIn, ZoomOut,
  RotateCcw, Check, Crop, FolderOpen,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────
export type ImagePickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
  bucket?: string;
};

type PublicImage = {
  id: string;
  url: string;
  name: string;
  category: string;
  tags: string[];
};

type Tab = 'library' | 'upload';

const ASPECT_RATIOS = [
  { label: '9:16', value: 9 / 16 },
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '4:5', value: 4 / 5 },
  { label: 'Free', value: 0 },
] as const;

const CATEGORIES = ['all', 'abstract', 'nature', 'gradient', 'pattern', 'texture', 'minimal', 'dark', 'other'] as const;

// ─── Styles ─────────────────────────────────────────────────
const BTN_BASE = 'px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold transition-all duration-150';
const BTN_PRIMARY = `${BTN_BASE} bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)]`;
const BTN_GHOST = `${BTN_BASE} text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]`;
const CHIP_ON = 'bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/30';
const CHIP_OFF = 'bg-[var(--surface-muted)] text-[var(--text-secondary)] border-transparent hover:border-[var(--border)]';

const PAGE_SIZE = 24;
const CACHE_KEY = 'public_images_cache';
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

// ─── Cache helpers (outside component — zero GC) ────────────
function getCachedImages(cacheKey: string): PublicImage[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (!cache[cacheKey]) return null;
    if (Date.now() - cache[cacheKey].ts > CACHE_TTL) return null;
    return cache[cacheKey].data;
  } catch { return null; }
}

function setCachedImages(cacheKey: string, data: PublicImage[]) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[cacheKey] = { data, ts: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage full */ }
}

// ─── Component ──────────────────────────────────────────────
export default function ImagePickerModal({
  open,
  onClose,
  onSelect,
  title = 'Select Image',
  bucket = 'public-asset',
}: ImagePickerProps) {
  // ── State ──
  const [tab, setTab] = useState<Tab>('library');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [images, setImages] = useState<PublicImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectIdx, setAspectIdx] = useState(1); // default 1:1
  const croppedAreaRef = useRef<Area | null>(null);
  const [cropping, setCropping] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload state
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const supabaseRef = useRef(supabase);

  // ── Debounce search (300ms) ──
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Fetch public images (with cache) ──
  const fetchImages = useCallback(async (reset = false) => {
    const offset = reset ? 0 : page * PAGE_SIZE;
    if (reset) { setPage(0); setHasMore(true); }

    const cacheKey = `${category}|${debouncedSearch}|${offset}`;

    if (reset) {
      const cached = getCachedImages(cacheKey);
      if (cached) {
        setImages(cached);
        setHasMore(cached.length === PAGE_SIZE);
        return;
      }
    }

    reset ? setLoading(true) : setLoadingMore(true);

    try {
      let query = (supabaseRef.current.from('public_images' as any) as any)
        .select('id, url, name, category, tags')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (category !== 'all') query = query.eq('category', category);
      if (debouncedSearch) query = query.ilike('name', `%${debouncedSearch}%`);

      const { data } = await query;
      const fetched = (data ?? []) as PublicImage[];

      if (reset) {
        setImages(fetched);
        setCachedImages(cacheKey, fetched);
      } else {
        setImages(prev => {
          const merged = [...prev, ...fetched];
          setCachedImages(cacheKey, merged);
          return merged;
        });
      }
      setHasMore(fetched.length === PAGE_SIZE);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, debouncedSearch, page]);

  // Trigger fetch on open / filter change
  useEffect(() => {
    if (open && tab === 'library') fetchImages(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category, debouncedSearch, tab]);

  const loadMore = () => {
    setPage(p => p + 1);
    fetchImages(false);
  };

  // ── File handling ──
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Select public image → go to crop ──
  const selectImage = useCallback((url: string) => {
    setCropSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  // ── Crop complete — store in ref (no re-render) ──
  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    croppedAreaRef.current = croppedPixels;
  }, []);

  // ── Upload helper ──
  const uploadBlob = useCallback(async (blob: Blob, ext = 'jpg'): Promise<string> => {
    const filename = `crop_${Date.now()}.${ext}`;
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, bucket }),
    });
    const { signedUrl, publicUrl } = await res.json();

    await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': blob.type },
      body: blob,
    });

    return publicUrl;
  }, [bucket]);

  // ── Crop & upload → return URL ──
  const handleCropAndAdd = useCallback(async () => {
    if (!cropSrc || !croppedAreaRef.current) return;
    setCropping(true);
    try {
      const blob = await getCroppedImg(cropSrc, croppedAreaRef.current);
      setUploading(true);
      const url = await uploadBlob(blob);
      onSelect(url);
      handleClose();
    } catch (err) {
      console.error('Crop/upload failed:', err);
    } finally {
      setCropping(false);
      setUploading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropSrc, uploadBlob, onSelect]);

  // ── Use original (skip crop) ──
  const handleUseOriginal = useCallback(async () => {
    if (!cropSrc) return;
    if (cropSrc.startsWith('data:')) {
      setUploading(true);
      try {
        const res = await fetch(cropSrc);
        const blob = await res.blob();
        const url = await uploadBlob(blob);
        onSelect(url);
        handleClose();
      } finally {
        setUploading(false);
      }
    } else {
      onSelect(cropSrc);
      handleClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropSrc, uploadBlob, onSelect]);

  // ── Close + reset ──
  const handleClose = useCallback(() => {
    setCropSrc(null);
    setSearchInput('');
    setDebouncedSearch('');
    setCategory('all');
    setTab('library');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAspectIdx(1);
    croppedAreaRef.current = null;
    onClose();
  }, [onClose]);

  const currentAspect = ASPECT_RATIOS[aspectIdx];

  // ── Memoized image grid ──
  const imageGrid = useMemo(() => (
    <div className="grid grid-cols-3 gap-2">
      {images.map(img => (
        <button
          key={img.id}
          onClick={() => selectImage(img.url)}
          className="group relative aspect-square rounded-[var(--radius-lg)] overflow-hidden border-2 border-transparent hover:border-[var(--brand)] transition-all duration-150"
        >
          <img
            src={img.url}
            alt={img.name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-[var(--surface)]/90 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)]">
              <Crop className="w-4 h-4 text-[var(--brand)]" />
            </div>
          </div>
          {img.name && (
            <div className="absolute bottom-0 inset-x-0 px-2 py-1 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] text-white font-medium truncate">{img.name}</p>
            </div>
          )}
        </button>
      ))}
    </div>
  ), [images, selectImage]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] border border-[var(--border)] flex flex-col overflow-hidden">

        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[var(--surface-muted)] rounded-[var(--radius-md)]">
              <ImageIcon className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">{cropSrc ? 'Crop Image' : title}</h2>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                {cropSrc ? 'Adjust crop area and aspect ratio' : 'Browse library or upload your own'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-[var(--radius-md)] transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ═══ Body ═══ */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ── Crop View ── */}
          {cropSrc ? (
            <div className="flex flex-col">
              <div className="relative w-full h-80 bg-[var(--surface-muted)]">
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={currentAspect.value || undefined}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  cropShape="rect"
                  showGrid
                  style={{ containerStyle: { background: 'var(--bg-tertiary)' } }}
                />
              </div>

              <div className="p-4 space-y-3 border-t border-[var(--border)]">
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Aspect Ratio</label>
                  <div className="flex gap-1.5">
                    {ASPECT_RATIOS.map((r, i) => (
                      <button
                        key={r.label}
                        onClick={() => setAspectIdx(i)}
                        className={`px-3 py-1.5 rounded-[var(--radius-md)] border text-xs font-semibold transition ${
                          aspectIdx === i ? CHIP_ON : CHIP_OFF
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Zoom</label>
                  <div className="flex items-center gap-3">
                    <ZoomOut className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={zoom}
                      onChange={e => setZoom(Number(e.target.value))}
                      className="flex-1 accent-[var(--brand)] h-1.5"
                    />
                    <ZoomIn className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                    <button
                      onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }}
                      className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-[var(--radius-md)] transition"
                      title="Reset"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ── Tab bar ── */}
              <div className="flex gap-1 mx-4 mt-3 p-1 bg-[var(--surface-muted)] rounded-[var(--radius-lg)]">
                <button
                  onClick={() => setTab('library')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-md)] text-xs font-semibold transition ${
                    tab === 'library'
                      ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Library
                </button>
                <button
                  onClick={() => setTab('upload')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-md)] text-xs font-semibold transition ${
                    tab === 'upload'
                      ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </button>
              </div>

              {/* ── Library Tab ── */}
              {tab === 'library' && (
                <div className="p-4 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      placeholder="Search images..."
                      className="w-full pl-9 pr-3 py-2 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] text-sm outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-shadow"
                    />
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-2.5 py-1 rounded-[var(--radius-md)] border text-[11px] font-semibold capitalize transition ${
                          category === cat ? CHIP_ON : CHIP_OFF
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-5 h-5 animate-spin text-[var(--brand)]" />
                    </div>
                  ) : images.length === 0 ? (
                    <div className="text-center py-16">
                      <ImageIcon className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                      <p className="text-sm text-[var(--text-secondary)]">No images found</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Try a different search or category</p>
                    </div>
                  ) : (
                    <>
                      {imageGrid}
                      {hasMore && (
                        <div className="flex justify-center pt-2">
                          <button
                            onClick={loadMore}
                            disabled={loadingMore}
                            className={`${BTN_GHOST} flex items-center gap-1.5`}
                          >
                            {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            Load more
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Upload Tab ── */}
              {tab === 'upload' && (
                <div className="p-4">
                  <div
                    onDrop={onDrop}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed rounded-[var(--radius-lg)] cursor-pointer transition-all duration-200 ${
                      dragOver
                        ? 'border-[var(--brand)] bg-[var(--brand)]/5'
                        : 'border-[var(--border)] hover:border-[var(--brand)]/50 bg-[var(--surface-muted)]'
                    }`}
                  >
                    <div className={`p-3 rounded-[var(--radius-lg)] mb-3 transition-colors ${dragOver ? 'bg-[var(--brand)]/10' : 'bg-[var(--surface-hover)]'}`}>
                      <Upload className={`w-6 h-6 ${dragOver ? 'text-[var(--brand)]' : 'text-[var(--text-tertiary)]'}`} />
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-secondary)]">
                      {dragOver ? 'Drop image here' : 'Click or drag an image'}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">JPG, PNG, WebP, GIF up to 10MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={onFileChange}
                      className="hidden"
                    />
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-px bg-[var(--border)]" />
                      <span className="text-[10px] text-[var(--text-tertiary)] font-semibold uppercase tracking-wider">or paste URL</span>
                      <div className="flex-1 h-px bg-[var(--border)]" />
                    </div>
                    <div className="flex gap-2">
                      <input
                        ref={urlInputRef}
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        className="flex-1 px-3 py-2 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] text-sm outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-shadow"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val) selectImage(val);
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const val = urlInputRef.current?.value.trim();
                          if (val) selectImage(val);
                        }}
                        className={BTN_PRIMARY}
                      >
                        Go
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══ Footer ═══ */}
        {cropSrc && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-muted)] shrink-0">
            <button
              onClick={() => { setCropSrc(null); setCrop({ x: 0, y: 0 }); setZoom(1); }}
              className={BTN_GHOST}
            >
              Back
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleUseOriginal}
                disabled={uploading}
                className={`${BTN_GHOST} flex items-center gap-1.5`}
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Use Original
              </button>
              <button
                onClick={handleCropAndAdd}
                disabled={cropping || uploading}
                className={`${BTN_PRIMARY} flex items-center gap-1.5`}
              >
                {(cropping || uploading) ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Crop & Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
