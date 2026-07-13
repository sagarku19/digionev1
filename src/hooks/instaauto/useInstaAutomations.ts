'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import type { Database } from '@/types/database.types';

type Automation = Database['public']['Tables']['instaauto_automations']['Row'];
type AutomationInsert = Database['public']['Tables']['instaauto_automations']['Insert'];
type Keyword = { word: string; is_negative: boolean };

export function useInstaAutomations(accountId?: string) {
  const qc = useQueryClient();

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['instaauto', 'automations', accountId ?? null],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instaauto_automations')
        .select('*, instaauto_keywords(id, word, is_negative), instaauto_media_targets(id, ig_media_id, thumbnail_url)')
        .eq('account_id', accountId!).is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (Automation & { instaauto_keywords: (Keyword & { id: string })[] })[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Omit<AutomationInsert, 'creator_id'> & { keywords?: Keyword[] }) => {
      const creatorId = await getCreatorProfileId();
      const { keywords, ...auto } = input;
      const { data, error } = await supabase.from('instaauto_automations')
        .insert({ ...auto, creator_id: creatorId } as AutomationInsert).select().single();
      if (error) throw error;
      if (keywords?.length) {
        const { error: kErr } = await supabase.from('instaauto_keywords')
          .insert(keywords.map((k) => ({ automation_id: data.id, word: k.word, is_negative: k.is_negative })));
        if (kErr) throw kErr;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instaauto'] }),
  });

  const update = useMutation({
    // Optimistic concurrency: guard on version; bump on success.
    mutationFn: async (input: { id: string; version: number; patch: Partial<AutomationInsert>; keywords?: Keyword[] }) => {
      const { data, error } = await supabase.from('instaauto_automations')
        .update({ ...input.patch, version: input.version + 1, updated_at: new Date().toISOString() })
        .eq('id', input.id).eq('version', input.version).select().maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('This automation was changed elsewhere — reload and retry.');
      if (input.keywords) {
        await supabase.from('instaauto_keywords').delete().eq('automation_id', input.id);
        if (input.keywords.length) {
          await supabase.from('instaauto_keywords')
            .insert(input.keywords.map((k) => ({ automation_id: input.id, word: k.word, is_negative: k.is_negative })));
        }
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instaauto'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('instaauto_automations')
        .update({ deleted_at: new Date().toISOString(), status: 'paused' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instaauto'] }),
  });

  return {
    automations, isLoading,
    createAutomation: create.mutateAsync,
    updateAutomation: update.mutateAsync,
    deleteAutomation: remove.mutateAsync,
    isMutating: create.isPending || update.isPending || remove.isPending,
  };
}
