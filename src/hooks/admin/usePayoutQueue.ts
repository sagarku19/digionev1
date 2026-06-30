'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database.types';

type PayoutRow = Database['public']['Tables']['creator_payouts']['Row'];

export function usePayoutQueue() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'payouts'],
    queryFn: async (): Promise<PayoutRow[]> => {
      const { data: rows, error } = await supabase
        .from('creator_payouts')
        .select('id, creator_id, amount, currency, status, failure_reason, created_at, payout_method_id')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (rows ?? []) as PayoutRow[];
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/payouts/${id}/approve`, { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d as { error?: string }).error ?? 'Approve failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'payouts'] }),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const r = await fetch(`/api/admin/payouts/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d as { error?: string }).error ?? 'Reject failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'payouts'] }),
  });

  const sync = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/admin/payouts/sync', { method: 'POST' });
      if (!r.ok) throw new Error('Sync failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'payouts'] }),
  });

  return { payouts: data ?? [], isLoading, approve, reject, sync };
}
