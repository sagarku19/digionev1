// Provides analytics stats for a creator's orders within a date range.
// DB tables: orders, order_items, products, users, profiles (read only)
// orders.status valid values: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'
// orders has NO creator_id — link via: products.creator_id → order_items.product_id → orders.id
"use client";

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export type ProductStat = {
  product_id: string;
  name: string;
  thumbnail_url: string | null;
  revenue: number;
  sales: number;
};

const EMPTY = { totalRevenue: 0, totalSales: 0, orders: [] as any[], topProducts: [] as ProductStat[], prevRevenue: 0, prevSales: 0 };

export function useAnalytics(dateRange: { start: string, end: string }) {
  const supabase = createClient();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['analytics', dateRange.start, dateRange.end],
    staleTime: 5 * 60 * 1000, // 5 min — don't refetch on every navigation
    queryFn: async () => {
      const profileId = await getCreatorProfileId(supabase);

      // Step 1: get all product IDs owned by this creator
      const { data: creatorProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('creator_id', profileId);

      if (productsError) throw productsError;
      const productIds = (creatorProducts ?? []).map(p => p.id);
      if (productIds.length === 0) return EMPTY;

      // Step 2: get order_ids that contain those products
      const { data: orderItemRows, error: itemsError } = await (supabase as any)
        .from('order_items')
        .select('order_id')
        .in('product_id', productIds);

      if (itemsError) throw itemsError;
      const orderIds = [...new Set((orderItemRows ?? []).map((i: any) => i.order_id as string))];
      if (orderIds.length === 0) return EMPTY;

      // Step 3: fetch those orders within the date range
      const { data: orders, error: ordersError } = await (supabase
        .from('orders')
        .select(`
          id, total_amount, created_at, status,
          order_items(price_at_purchase, product_id, products(id, name, thumbnail_url))
        `) as any)
        .in('id', orderIds)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      const allOrders = (orders ?? []) as any[];

      // Only 'completed' counts as revenue (schema: pending|completed|failed|refunded|cancelled)
      const successfulOrders = allOrders.filter(o => o.status === 'completed');

      const totalRevenue = successfulOrders.reduce((acc: number, o: any) => acc + (Number(o.total_amount) || 0), 0);
      const totalSales = successfulOrders.length;

      // Build top products from completed orders
      const productMap = new Map<string, ProductStat>();
      for (const order of successfulOrders) {
        for (const item of (order.order_items ?? [])) {
          const p = item.products;
          if (!p) continue;
          const existing = productMap.get(p.id) ?? {
            product_id: p.id,
            name: p.name,
            thumbnail_url: p.thumbnail_url ?? null,
            revenue: 0,
            sales: 0,
          };
          existing.revenue += Number(item.price_at_purchase) || 0;
          existing.sales += 1;
          productMap.set(p.id, existing);
        }
      }
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Previous period comparison (best-effort)
      const startMs = new Date(dateRange.start).getTime();
      const endMs   = new Date(dateRange.end).getTime();
      const rangeMs = endMs - startMs;
      const prevStart = new Date(startMs - rangeMs).toISOString();
      const prevEnd   = new Date(startMs).toISOString();

      const { data: prevOrders } = await (supabase
        .from('orders')
        .select('total_amount, status') as any)
        .in('id', orderIds)
        .gte('created_at', prevStart)
        .lte('created_at', prevEnd);

      const prevSuccessful = ((prevOrders ?? []) as any[]).filter((o: any) => o.status === 'completed');
      const prevRevenue = prevSuccessful.reduce((acc: number, o: any) => acc + (Number(o.total_amount) || 0), 0);
      const prevSales   = prevSuccessful.length;

      return { totalRevenue, totalSales, orders: allOrders, topProducts, prevRevenue, prevSales };
    },
  });

  return {
    stats: stats ?? EMPTY,
    isLoading,
    error,
  };
}
