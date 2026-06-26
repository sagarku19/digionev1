'use client';
import { useQuery } from '@tanstack/react-query';

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
  return data.files as MediaItem[];
}

export function useMyMedia(enabled = true) {
  const q = useQuery({ queryKey: ['media', 'list'], queryFn: fetchMyMedia, enabled });
  return { images: q.data ?? [], isLoading: q.isLoading, error: q.error };
}
