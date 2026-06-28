'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface MediaItem {
  id: string;
  name: string;
  kind: string;
  size: number;
  url: string | null;
  createdAt: string;
}

async function fetchMyMedia(): Promise<MediaItem[]> {
  const res = await fetch('/api/media/list', { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to load media');
  return data.images as MediaItem[];
}

export function useMyMedia(enabled = true) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['media', 'list'], queryFn: fetchMyMedia, enabled });
  const del = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await fetch('/api/media/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Delete failed');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['media', 'list'] });
      qc.invalidateQueries({ queryKey: ['media', 'library'] });
    },
  });
  return { images: q.data ?? [], isLoading: q.isLoading, error: q.error, deleteImage: del.mutate };
}
