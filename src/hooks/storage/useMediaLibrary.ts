'use client';
// Data for the Media Library page: the creator's own assets (images + deliverable
// files) from /api/media/list, and read-only DigiOne stock from public_images.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface OwnImage {
  id: string; name: string; kind: string; size: number;
  mimeType: string | null; url: string | null; createdAt: string;
}
export interface OwnFile {
  id: string; name: string; size: number; mimeType: string | null;
  signedUrl: string | null;
  productId: string | null; productName: string | null; productCover: string | null;
  createdAt: string;
}
interface Storage { usedBytes: number; quotaBytes: number }
interface OwnAssets { images: OwnImage[]; files: OwnFile[]; storage: Storage }

async function fetchOwn(): Promise<OwnAssets> {
  const res = await fetch('/api/media/list', { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to load assets');
  return {
    images: data.images ?? [],
    files: data.files ?? [],
    storage: { usedBytes: data.storage?.usedBytes ?? 0, quotaBytes: data.storage?.quotaBytes ?? 0 },
  };
}

const OWN_KEY = ['media', 'library'];

export function useOwnAssets() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: OWN_KEY, queryFn: fetchOwn });

  const del = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await fetch('/api/media/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Delete failed');
      return data as { removed: number };
    },
    onMutate: async (fileId: string) => {
      await qc.cancelQueries({ queryKey: OWN_KEY });
      const prev = qc.getQueryData<OwnAssets>(OWN_KEY);
      if (prev) qc.setQueryData<OwnAssets>(OWN_KEY, { ...prev, images: prev.images.filter((i) => i.id !== fileId) });
      return { prev };
    },
    onError: (_e, _id, ctx) => { if (ctx?.prev) qc.setQueryData(OWN_KEY, ctx.prev); },
    onSettled: () => { qc.invalidateQueries({ queryKey: OWN_KEY }); qc.invalidateQueries({ queryKey: ['media', 'list'] }); },
  });

  return {
    images: q.data?.images ?? [],
    files: q.data?.files ?? [],
    usedBytes: q.data?.storage.usedBytes ?? 0,
    quotaBytes: q.data?.storage.quotaBytes ?? 0,
    isLoading: q.isLoading,
    deleteImage: del.mutate,
    isDeleting: del.isPending,
  };
}

export interface StockImage { id: string; url: string; name: string; category: string }

async function fetchStock(): Promise<StockImage[]> {
  const { data } = await supabase
    .from('public_images')
    .select('id, url, name, category')
    .order('created_at', { ascending: false })
    .limit(200);
  return (data ?? []) as StockImage[];
}

export function useDigioneStock(enabled: boolean) {
  const q = useQuery({ queryKey: ['media', 'stock'], queryFn: fetchStock, enabled });
  return { stock: q.data ?? [], isLoading: q.isLoading };
}
