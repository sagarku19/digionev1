'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export type AdminRefundRequest = {
  id: string;
  order_id: string;
  creator_id: string;
  amount: number;
  net_clawback: number;
  reason: string;
  status: string;
  review_reason: string | null;
  created_at: string;
  order: { customer_email: string | null; total_amount: number; gateway_order_id: string | null } | null;
};

// Super-admin refund-request queue. Reads refund_requests (RLS: super_admin sees all)
// joined to the order for context; approve/reject go through the admin routes.
export function useRefundRequests() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'refunds'],
    queryFn: async (): Promise<AdminRefundRequest[]> => {
      const { data: rows, error } = await supabase
        .from('refund_requests')
        .select(
          'id, order_id, creator_id, amount, net_clawback, reason, status, review_reason, created_at, orders(customer_email, total_amount, gateway_order_id)'
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (rows ?? []).map((r) => {
        const { orders, ...rest } = r as typeof r & { orders: unknown };
        const order = Array.isArray(orders) ? orders[0] : orders;
        return { ...rest, order: (order as AdminRefundRequest['order']) ?? null } as AdminRefundRequest;
      });
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/refunds/${id}/approve`, { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d as { error?: string }).error ?? 'Approve failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'refunds'] }),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const r = await fetch(`/api/admin/refunds/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d as { error?: string }).error ?? 'Reject failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'refunds'] }),
  });

  return { requests: data ?? [], isLoading, approve, reject };
}
