// Provides analytics stats for a creator's orders within a date range.
// DB tables: orders, order_items, products, sites, users, profiles (read only)
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

export function useAnalytics(dateRange: { start: string, end: string }) {
  const supabase = createClient();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['analytics', dateRange.start, dateRange.end],
    queryFn: async () => {
      try {
        const profileId = await getCreatorProfileId(supabase);

        const { data: sites, error: sitesError } = await supabase
          .from('sites')
          .select('id')
          .eq('creator_id', profileId);

        if (sitesError) throw sitesError;

        const siteIds = (sites ?? []).map(s => s.id);
        if (siteIds.length === 0) {
          return { totalRevenue: 0, totalSales: 0, orders: [], topProducts: [], prevRevenue: 0, prevSales: 0 };
        }

        // Fetch current period orders with items + product info
        const { data: orders, error: ordersError } = await (supabase
          .from('orders')
          .select(`
            id, total_amount, created_at, status,
            order_items(price_at_purchase, product_id, products(id, name, thumbnail_url))
          `) as any)
          .in('origin_site_id', siteIds)
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);

        if (ordersError) throw ordersError;

        const allOrders = (orders ?? []) as any[];
        const successfulOrders = allOrders.filter(
          o => o.status === 'success' || o.status === 'completed'
        );

        const totalRevenue = successfulOrders.reduce((acc: number, o: any) => acc + (o.total_amount || 0), 0);
        const totalSales = successfulOrders.length;

        // Build top products breakdown
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
            existing.revenue += item.price_at_purchase || 0;
            existing.sales += 1;
            productMap.set(p.id, existing);
          }
        }
        const topProducts = Array.from(productMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        // Fetch previous period for comparison
        const startMs = new Date(dateRange.start).getTime();
        const endMs = new Date(dateRange.end).getTime();
        const rangeMs = endMs - startMs;
        const prevStart = new Date(startMs - rangeMs).toISOString();
        const prevEnd = new Date(startMs).toISOString();

        const { data: prevOrders } = await (supabase
          .from('orders')
          .select('total_amount, status') as any)
          .in('origin_site_id', siteIds)
          .gte('created_at', prevStart)
          .lte('created_at', prevEnd);

        const prevSuccessful = ((prevOrders ?? []) as any[]).filter(
          (o: any) => o.status === 'success' || o.status === 'completed'
        );
        const prevRevenue = prevSuccessful.reduce((acc: number, o: any) => acc + (o.total_amount || 0), 0);
        const prevSales = prevSuccessful.length;

        return {
          totalRevenue,
          totalSales,
          orders: allOrders,
          topProducts,
          prevRevenue,
          prevSales,
        };
      } catch (err) {
        console.error('useAnalytics error:', err);
        throw err;
      }
    }
  });

  return {
    stats: stats || { totalRevenue: 0, totalSales: 0, orders: [], topProducts: [], prevRevenue: 0, prevSales: 0 },
    isLoading,
    error
  };
}
