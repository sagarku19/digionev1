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
import { createClient } from '@/lib/supabase/client';
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
const BTN_BASE = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150';
const BTN_PRIMARY = `${BTN_BASE} bg-pink-600 hover:bg-pink-500 text-white shadow-sm shadow-pink-500/20`;
const BTN_GHOST = `${BTN_BASE} text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800`;
const CHIP_ON = 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-500/40';
const CHIP_OFF = 'bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 border-transparent hover:border-gray-300 dark:hover:border-gray-600';

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

  // Stable supabase ref — created once
  const supabaseRef = useRef(createClient());

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
          className="group relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-pink-500 transition-all duration-150"
        >
          <img
            src={img.url}
            alt={img.name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white/90 dark:bg-gray-900/90 rounded-lg shadow-lg">
              <Crop className="w-4 h-4 text-pink-600" />
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
      {/* Overlay — no backdrop-blur (perf) */}
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#0C0C1C] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">

        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-pink-100 dark:bg-pink-500/15 rounded-lg">
              <ImageIcon className="w-4 h-4 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">{cropSrc ? 'Crop Image' : title}</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {cropSrc ? 'Adjust crop area and aspect ratio' : 'Browse library or upload your own'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ═══ Body ═══ */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ── Crop View ── */}
          {cropSrc ? (
            <div className="flex flex-col">
              <div className="relative w-full h-80 bg-gray-900">
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
                  style={{ containerStyle: { background: '#111' } }}
                />
              </div>

              <div className="p-4 space-y-3 border-t border-gray-200 dark:border-gray-800">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Aspect Ratio</label>
                  <div className="flex gap-1.5">
                    {ASPECT_RATIOS.map((r, i) => (
                      <button
                        key={r.label}
                        onClick={() => setAspectIdx(i)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                          aspectIdx === i ? CHIP_ON : CHIP_OFF
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Zoom</label>
                  <div className="flex items-center gap-3">
                    <ZoomOut className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={zoom}
                      onChange={e => setZoom(Number(e.target.value))}
                      className="flex-1 accent-pink-500 h-1.5"
                    />
                    <ZoomIn className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <button
                      onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
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
              <div className="flex gap-1 mx-4 mt-3 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl">
                <button
                  onClick={() => setTab('library')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                    tab === 'library'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Library
                </button>
                <button
                  onClick={() => setTab('upload')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                    tab === 'upload'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      placeholder="Search images..."
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white placeholder-gray-400 transition"
                    />
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold capitalize transition ${
                          category === cat ? CHIP_ON : CHIP_OFF
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
                    </div>
                  ) : images.length === 0 ? (
                    <div className="text-center py-16">
                      <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No images found</p>
                      <p className="text-xs text-gray-400 mt-0.5">Try a different search or category</p>
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
                    className={`relative flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${
                      dragOver
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/5'
                        : 'border-gray-300 dark:border-gray-700 hover:border-pink-400 dark:hover:border-pink-600 bg-gray-50 dark:bg-gray-900/40'
                    }`}
                  >
                    <div className={`p-3 rounded-2xl mb-3 transition-colors ${dragOver ? 'bg-pink-100 dark:bg-pink-500/15' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <Upload className={`w-6 h-6 ${dragOver ? 'text-pink-600' : 'text-gray-400'}`} />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {dragOver ? 'Drop image here' : 'Click or drag an image'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, GIF up to 10MB</p>
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
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">or paste URL</span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div className="flex gap-2">
                      <input
                        ref={urlInputRef}
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white placeholder-gray-400 transition"
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
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 shrink-0">
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
