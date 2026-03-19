// Provides paginated list of orders for a creator's sites.
// DB tables: orders, order_items, sites, users, profiles (read only)
"use client";

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export function useOrders(limit = 50) {
  const supabase = createClient();

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['orders', limit],
    queryFn: async () => {
      try {
        const profileId = await getCreatorProfileId(supabase);

        const { data: sites, error: sitesError } = await supabase
          .from('sites')
          .select('id')
          .eq('creator_id', profileId);

        if (sitesError) throw sitesError;

        const siteIds = (sites ?? []).map(s => s.id);
        if (siteIds.length === 0) return [];

        const { data, error: ordersError } = await supabase
          .from('orders')
          .select(`*, order_items(quantity, price_at_purchase, product_id)`)
          .in('origin_site_id', siteIds)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (ordersError) throw ordersError;
        return data ?? [];
      } catch (err) {
        console.error('useOrders error:', err);
        throw err;
      }
    }
  });

  return { orders, isLoading, error };
}
