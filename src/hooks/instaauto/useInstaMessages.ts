'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

type Message = Database['public']['Tables']['instaauto_messages']['Row'];

export function useInstaMessages(accountId?: string) {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['instaauto', 'messages', accountId ?? null],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await supabase.from('instaauto_messages')
        .select('*, instaauto_automations(name)').eq('account_id', accountId!)
        .order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data as (Message & { instaauto_automations: { name: string } | null })[];
    },
  });
  return { messages, isLoading };
}
