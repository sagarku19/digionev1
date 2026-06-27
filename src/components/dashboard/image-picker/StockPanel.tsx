'use client';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Search, ImageIcon, Loader2, Crop } from 'lucide-react';

type PublicImage = { id: string; url: string; name: string; category: string; tags: string[] };
const CATEGORIES = ['all', 'abstract', 'nature', 'gradient', 'pattern', 'texture', 'minimal', 'dark', 'other'] as const;
const PAGE_SIZE = 24;
const CACHE_KEY = 'public_images_cache_v2'; // bumped after stock images moved to R2
const CACHE_TTL = 1000 * 60 * 30;
const CHIP_ON = 'bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/30';
const CHIP_OFF = 'bg-[var(--surface-muted)] text-[var(--text-secondary)] border-transparent hover:border-[var(--border)]';

function readCache(k: string): PublicImage[] | null {
  try { const raw = localStorage.getItem(CACHE_KEY); if (!raw) return null; const c = JSON.parse(raw); if (!c[k] || Date.now() - c[k].ts > CACHE_TTL) return null; return c[k].data; } catch { return null; }
}
function writeCache(k: string, data: PublicImage[]) {
  try { const raw = localStorage.getItem(CACHE_KEY); const c = raw ? JSON.parse(raw) : {}; c[k] = { data, ts: Date.now() }; localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* full */ }
}

function StockPanel({ onPick }: { onPick: (url: string) => void }) {
  const [searchInput, setSearchInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('all');
  const [images, setImages] = useState<PublicImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const sb = useRef(supabase);

  useEffect(() => { const t = setTimeout(() => setDebounced(searchInput.trim()), 300); return () => clearTimeout(t); }, [searchInput]);

  const fetchImages = useCallback(async (reset: boolean, pageArg: number) => {
    const offset = reset ? 0 : pageArg * PAGE_SIZE;
    const key = `${category}|${debounced}|${offset}`;
    if (reset) { const cached = readCache(key); if (cached) { setImages(cached); setHasMore(cached.length === PAGE_SIZE); return; } }
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      let query = sb.current.from('public_images').select('id, url, name, category, tags').order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
      if (category !== 'all') query = query.eq('category', category);
      if (debounced) query = query.ilike('name', `%${debounced}%`);
      const { data } = await query;
      const fetched = (data ?? []) as PublicImage[];
      setImages((prev) => (reset ? fetched : [...prev, ...fetched]));
      writeCache(key, reset ? fetched : [...images, ...fetched]);
      setHasMore(fetched.length === PAGE_SIZE);
    } finally { setLoading(false); setLoadingMore(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, debounced]);

  useEffect(() => { setPage(0); fetchImages(true, 0); }, [category, debounced, fetchImages]);

  const grid = useMemo(() => (
    <div className="grid grid-cols-3 gap-2">
      {images.map((img) => (
        <button key={img.id} onClick={() => onPick(img.url)} className="group relative aspect-square rounded-[var(--radius-lg)] overflow-hidden border-2 border-transparent hover:border-[var(--brand)] transition-all duration-150 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          <img src={img.url} alt={img.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-[var(--surface)]/90 rounded-[var(--radius-md)]"><Crop className="w-4 h-4 text-[var(--brand)]" /></div>
          </div>
        </button>
      ))}
    </div>
  ), [images, onPick]);

  return (
    <div className="p-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search images..." className="w-full pl-9 pr-3 py-2 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] text-sm outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-shadow" />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)} className={`px-2.5 py-1 rounded-[var(--radius-md)] border text-[11px] font-semibold capitalize transition ${category === cat ? CHIP_ON : CHIP_OFF}`}>{cat}</button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-[var(--brand)]" /></div>
        : images.length === 0 ? <div className="text-center py-16"><ImageIcon className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" /><p className="text-sm text-[var(--text-secondary)]">No images found</p></div>
        : <>{grid}{hasMore && <div className="flex justify-center pt-2"><button onClick={() => { const np = page + 1; setPage(np); fetchImages(false, np); }} disabled={loadingMore} className="px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] flex items-center gap-1.5 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">{loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Load more</button></div>}</>}
    </div>
  );
}
export default memo(StockPanel);
