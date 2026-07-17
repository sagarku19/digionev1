"use client";
// Per-order sale economics for the current creator, read from transaction_ledger
// (tx_type='sale', RLS select-own). Returns a map keyed by order_id so a page that
// already has the orders (customer/product/date) can enrich each with its actual
// gross + platform fee. The effective platform cut is derived per order via
// computeOrderEarnings — see src/lib/shared/order-earnings.ts.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export interface OrderFee {
  gross: number;
  fee: number;
  createdAt: string;
}

export function useOrderEarnings(limit = 200) {
  const { data, isLoading, error } = useQuery<Record<string, OrderFee>>({
    queryKey: ['orders', 'earnings'],
    queryFn: async () => {
      const profileId = await getCreatorProfileId();

      const { data: rows, error: err } = await supabase
        .from('transaction_ledger')
        .select('order_id, amount, meta, created_at')
        .eq('creator_id', profileId)
        .eq('tx_type', 'sale')
        .eq('direction', 'credit')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (err) throw err;

      const feeByOrder: Record<string, OrderFee> = {};
      for (const row of rows ?? []) {
        if (!row.order_id) continue;
        const meta = (row.meta ?? {}) as { platform_fee?: number };
        feeByOrder[row.order_id] = {
          gross: Number(row.amount) || 0,
          fee: Number(meta.platform_fee ?? 0),
          createdAt: row.created_at,
        };
      }
      return feeByOrder;
    },
  });

  return { feeByOrder: data ?? {}, isLoading, error };
}
