'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export type KycDocType = 'pan_card' | 'bank_proof' | 'aadhaar';

export function useKycDocuments() {
  const qc = useQueryClient();
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['kyc', 'documents'],
    queryFn: async () => {
      const creatorId = await getCreatorProfileId();
      const { data, error } = await supabase
        .from('kyc_documents')
        .select('id, doc_type, file_id, created_at, storage_files(file_name)')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const upload = useMutation({
    mutationFn: async ({ file, docType }: { file: File; docType: KycDocType }) => {
      const up = await fetch('/api/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, bucket: 'creator-private', kind: 'kyc', category: 'kyc' }),
      });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error ?? 'Upload init failed');
      const put = await fetch(upData.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } });
      if (!put.ok) throw new Error('File upload failed');
      const cf = await fetch('/api/upload/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: 'creator-private', objectKey: upData.objectKey, kind: 'kyc' }),
      });
      const cfData = await cf.json();
      if (!cf.ok) throw new Error(cfData.error ?? 'Confirm failed');
      const link = await fetch('/api/kyc/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: cfData.fileId, docType }),
      });
      const linkData = await link.json();
      if (!link.ok) throw new Error(linkData.error ?? 'Link failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kyc', 'documents'] }),
  });

  const latestByType = (t: KycDocType) => docs.find(d => d.doc_type === t);
  return { docs, latestByType, isLoading, uploadDoc: upload.mutateAsync, isUploading: upload.isPending };
}
