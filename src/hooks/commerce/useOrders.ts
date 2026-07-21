"use client";
// Fetches all orders for the current creator (by creator_id).
// DB tables: orders, order_items, products (read only)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export type Order = {
  id: string;
  status: string;
  total_amount: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  payment_verified_at: string | null;
  created_at: string;
  order_items: {
    price_at_purchase: number;
    products: { name: string; thumbnail_url: string | null } | null;
  }[];
};

export function useOrders(limit = 100) {
  const { data: orders = [], isLoading, error } = useQuery<Order[]>({
    queryKey: ['orders', 'list'],
    queryFn: async () => {
      const profileId = await getCreatorProfileId();

      // Try creator_id column first (requires migration).
      // Fall back to finding orders via products owned by this creator.
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, total_amount,
          customer_name, customer_email, customer_phone,
          gateway_order_id, gateway_payment_id,
          payment_verified_at, created_at,
          order_items(price_at_purchase, products(name, thumbnail_url, creator_id))
        `)
        .eq('creator_id', profileId)
        .order('created_at', { ascending: false })
        .limit(limit)
        .returns<Order[]>();

      // creator_id column exists and returned results — use them
      if (!error && data && data.length > 0) return data;

      // ── Fallback: join via order_items → products → creator ──
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('creator_id', profileId);

      const productIds = (products ?? []).map(p => p.id);
      if (productIds.length === 0) return [];

      // Get order_ids that contain this creator's products
      const { data: items } = await supabase
        .from('order_items')
        .select('order_id')
        .in('product_id', productIds);

      const orderIds = [...new Set((items ?? []).map((i) => i.order_id))];
      if (orderIds.length === 0) return [];

      const { data: fallbackOrders, error: fallbackError } = await supabase
        .from('orders')
        .select(`
          id, status, total_amount,
          customer_name, customer_email, customer_phone,
          gateway_order_id, gateway_payment_id,
          created_at,
          order_items(price_at_purchase, products(name, thumbnail_url))
        `)
        .in('id', orderIds)
        .order('created_at', { ascending: false })
        .limit(limit)
        .returns<Order[]>();

      if (fallbackError) throw fallbackError;
      return fallbackOrders ?? [];
    },
  });

  return { orders, isLoading, error };
}

export function useRefundOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orderId: string; amount?: number; reason?: string }) => {
      const res = await fetch('/api/refunds/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Refund failed.');
      return data as { success: true; refund: { refundId: string; amount: number; netClawback: number } };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
    },
  });
}

// Data the refund dialog needs for its clawback preview: the order's original
// platform fee (sale ledger row — RLS select-own) and prior refunds on the order.
export function useOrderRefundInfo(orderId: string | null) {
  return useQuery({
    queryKey: ['orders', 'refund-info', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const [ledgerRes, refundsRes] = await Promise.all([
        supabase
          .from('transaction_ledger')
          .select('meta')
          .eq('order_id', orderId!)
          .eq('tx_type', 'sale')
          .eq('direction', 'credit')
          .limit(1),
        supabase
          .from('refunds')
          .select('amount, fee_reversed, status')
          .eq('order_id', orderId!)
          .in('status', ['processing', 'success']),
      ]);
      const meta = (ledgerRes.data?.[0]?.meta ?? {}) as { platform_fee?: number };
      const rows = refundsRes.data ?? [];
      return {
        fee: Number(meta.platform_fee ?? 0),
        hasLedger: (ledgerRes.data ?? []).length > 0,
        priorAmount: rows.reduce((s, r) => s + Number(r.amount), 0),
        priorFeeReversed: rows.reduce((s, r) => s + Number(r.fee_reversed), 0),
        hasProcessing: rows.some((r) => r.status === 'processing'),
      };
    },
  });
}
