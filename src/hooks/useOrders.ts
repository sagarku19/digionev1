"use client";
// Fetches all orders for the current creator (by creator_id).
// DB tables: orders, order_items, products (read only)

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
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
  const supabase = createClient();

  const { data: orders = [], isLoading, error } = useQuery<Order[]>({
    queryKey: ['creator-orders'],
    queryFn: async () => {
      const profileId = await getCreatorProfileId(supabase);

      // Try creator_id column first (requires migration).
      // Fall back to finding orders via products owned by this creator.
      const { data, error } = await (supabase
        .from('orders')
        .select(`
          id, status, total_amount,
          customer_name, customer_email, customer_phone,
          gateway_order_id, gateway_payment_id,
          payment_verified_at, created_at,
          order_items(price_at_purchase, products(name, thumbnail_url, creator_id))
        `) as any)
        .eq('creator_id', profileId)
        .order('created_at', { ascending: false })
        .limit(limit);

      // creator_id column exists and returned results — use them
      if (!error && data && (data as any[]).length > 0) return data as Order[];

      // ── Fallback: join via order_items → products → creator ──
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('creator_id', profileId);

      const productIds = (products ?? []).map(p => p.id);
      if (productIds.length === 0) return [];

      // Get order_ids that contain this creator's products
      const { data: items } = await (supabase as any)
        .from('order_items')
        .select('order_id')
        .in('product_id', productIds);

      const orderIds = [...new Set((items ?? []).map((i: any) => i.order_id))];
      if (orderIds.length === 0) return [];

      const { data: fallbackOrders, error: fallbackError } = await (supabase
        .from('orders')
        .select(`
          id, status, total_amount,
          customer_name, customer_email, customer_phone,
          gateway_order_id, gateway_payment_id,
          created_at,
          order_items(price_at_purchase, products(name, thumbnail_url))
        `) as any)
        .in('id', orderIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fallbackError) throw fallbackError;
      return (fallbackOrders as Order[]) ?? [];
    },
  });

  return { orders, isLoading, error };
}
