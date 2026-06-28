'use client';
import { useCallback, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ProductFile {
  id: string;
  name: string;
  size: number;
  mimeType: string | null;
  createdAt: string;
}
interface ListResponse { files: ProductFile[]; usedBytes: number; quotaBytes: number }
export interface UploadTask { id: string; name: string; progress: number; error?: string }

const OCTET = 'application/octet-stream';

async function getList(productId: string): Promise<ListResponse> {
  const res = await fetch(`/api/products/${productId}/files`, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to load files');
  return data as ListResponse;
}

// Presigned PUT with real upload progress (fetch has none) + abort support.
function putWithProgress(url: string, file: File, onProgress: (pct: number) => void, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', OCTET); // must match the signed content-type
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`PUT failed ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('PUT network error'));
    xhr.onabort = () => reject(new DOMException('aborted', 'AbortError'));
    signal.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

export function useProductFiles(productId: string) {
  const qc = useQueryClient();
  const key = ['products', 'files', productId];
  const q = useQuery({ queryKey: key, queryFn: () => getList(productId), enabled: Boolean(productId) });

  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const setTask = (id: string, patch: Partial<UploadTask>) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const uploadOne = useCallback(async (file: File, signal: AbortSignal): Promise<void> => {
    const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setTasks((prev) => [...prev, { id, name: file.name, progress: 0 }]);
    try {
      const presign = await fetch('/api/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
        body: JSON.stringify({ filename: file.name, bucket: 'creator-content', productId }),
      });
      const pres = await presign.json();
      if (!presign.ok) throw new Error(pres.error ?? 'Could not start upload');
      setTask(id, { progress: 5 });
      await putWithProgress(pres.uploadUrl, file, (pct) => setTask(id, { progress: Math.max(5, pct) }), signal);
      const confirm = await fetch('/api/upload/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
        body: JSON.stringify({ bucket: 'creator-content', objectKey: pres.objectKey, productId, kind: 'deliverable', mimeType: file.type || null, fileName: file.name }),
      });
      const conf = await confirm.json();
      if (!confirm.ok) throw new Error(conf.error ?? 'Could not finalize upload');
      setTask(id, { progress: 100 });
      setTimeout(() => setTasks((prev) => prev.filter((t) => t.id !== id)), 1200);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') { setTasks((prev) => prev.filter((t) => t.id !== id)); return; }
      setTask(id, { error: e instanceof Error ? e.message : 'Upload failed' });
    }
  }, [productId]);

  const uploadFiles = useCallback(async (files: File[]) => {
    const ac = new AbortController();
    abortRef.current = ac;
    try { for (const f of files) await uploadOne(f, ac.signal); }
    finally { abortRef.current = null; qc.invalidateQueries({ queryKey: key }); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadOne, qc, productId]);

  const retryTask = useCallback((task: UploadTask, file: File) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    const ac = new AbortController();
    void uploadOne(file, ac.signal).finally(() => qc.invalidateQueries({ queryKey: key }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadOne, qc, productId]);

  const removeTask = useCallback((id: string) => setTasks((prev) => prev.filter((t) => t.id !== id)), []);
  const abortUploads = useCallback(() => abortRef.current?.abort(), []);

  const del = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await fetch(`/api/products/${productId}/files`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Delete failed');
    },
    onMutate: async (fileId: string) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ListResponse>(key);
      if (prev) {
        const gone = prev.files.find((f) => f.id === fileId);
        qc.setQueryData<ListResponse>(key, {
          ...prev,
          files: prev.files.filter((f) => f.id !== fileId),
          usedBytes: Math.max(0, prev.usedBytes - (gone?.size ?? 0)),
        });
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    files: q.data?.files ?? [],
    usedBytes: q.data?.usedBytes ?? 0,
    quotaBytes: q.data?.quotaBytes ?? 0,
    isLoading: q.isLoading,
    tasks, uploadFiles, retryTask, removeTask, abortUploads,
    deleteFile: del.mutate, isDeleting: del.isPending,
  };
}
