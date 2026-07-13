'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export function useInstaAnalytics(accountId?: string) {
  return useQuery({
    queryKey: ['instaauto', 'analytics', accountId ?? null],
    enabled: !!accountId,
    queryFn: async () => {
      const [{ count: leads }, { count: sent }, { count: failed }] = await Promise.all([
        supabase.from('instaauto_leads').select('id', { count: 'exact', head: true }).eq('account_id', accountId!),
        supabase.from('instaauto_messages').select('id', { count: 'exact', head: true }).eq('account_id', accountId!).eq('status', 'sent'),
        supabase.from('instaauto_messages').select('id', { count: 'exact', head: true }).eq('account_id', accountId!).eq('status', 'failed'),
      ]);
      return { totalLeads: leads ?? 0, totalSent: sent ?? 0, totalFailed: failed ?? 0 };
    },
  });
}
