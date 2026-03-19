// Provides analytics stats for a creator's orders within a date range.
// DB tables: orders, sites, users, profiles (read only)
"use client";

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

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
          return { totalRevenue: 0, totalSales: 0, orders: [] };
        }

        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('total_amount, created_at, status')
          .in('origin_site_id', siteIds)
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);

        if (ordersError) throw ordersError;

        const successfulOrders = (orders ?? []).filter(
          o => o.status === 'success' || o.status === 'completed'
        );

        return {
          totalRevenue: successfulOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0),
          totalSales: successfulOrders.length,
          orders: orders ?? []
        };
      } catch (err) {
        console.error('useAnalytics error:', err);
        throw err;
      }
    }
  });

  return {
    stats: stats || { totalRevenue: 0, totalSales: 0, orders: [] },
    isLoading,
    error
  };
}
