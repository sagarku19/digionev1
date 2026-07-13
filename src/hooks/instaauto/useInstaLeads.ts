'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

type Lead = Database['public']['Tables']['instaauto_leads']['Row'];

export function useInstaLeads(accountId?: string) {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['instaauto', 'leads', accountId ?? null],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await supabase.from('instaauto_leads')
        .select('*').eq('account_id', accountId!).order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data as Lead[];
    },
  });
  return { leads, isLoading };
}
