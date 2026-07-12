'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import type { Database } from '@/types/database.types';

export type ShortLink = Database['public']['Tables']['linksh_links']['Row'];
export type ClickEvent = Database['public']['Tables']['linksh_click_events']['Row'];

export interface CreateLinkInput {
  destination_url: string;
  code?: string;
  title?: string;
  tags?: string[];
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  expires_at?: string | null;
  expired_redirect_url?: string | null;
  password?: string;
  ios_url?: string | null;
  android_url?: string | null;
  geo?: Record<string, string> | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  max_clicks?: number | null;
}

export type UpdateLinkInput = Partial<CreateLinkInput> & {
  is_active?: boolean;
  archived_at?: string | null;
};

async function callJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

export function useShortLinks() {
  const qc = useQueryClient();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['short-links', 'list'],
    queryFn: async () => {
      const creatorId = await getCreatorProfileId();
      const { data, error } = await supabase
        .from('linksh_links')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ShortLink[];
    },
  });

  const createLink = useMutation({
    mutationFn: (input: CreateLinkInput) => callJson('/api/links', 'POST', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['short-links'] }),
  });

  const updateLink = useMutation({
    mutationFn: ({ id, ...patch }: UpdateLinkInput & { id: string }) =>
      callJson(`/api/links/${id}`, 'PATCH', patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['short-links'] }),
  });

  const deleteLink = useMutation({
    mutationFn: (id: string) => callJson(`/api/links/${id}`, 'DELETE'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['short-links'] }),
  });

  return {
    links,
    isLoading,
    createLink: createLink.mutateAsync,
    isCreating: createLink.isPending,
    updateLink: updateLink.mutateAsync,
    isUpdating: updateLink.isPending,
    deleteLink: deleteLink.mutateAsync,
    isDeleting: deleteLink.isPending,
  };
}

export function useShortLinkAnalytics(linkId: string) {
  return useQuery({
    queryKey: ['short-links', 'analytics', linkId],
    enabled: !!linkId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('linksh_click_events')
        .select('*')
        .eq('link_id', linkId)
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data as ClickEvent[];
    },
  });
}
