"use client";
// Fetches unique buyers who purchased from the creator's products.
// Queries orders directly by creator_id — no longer needs origin_site_id.

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export type Customer = {
  email: string;
  name: string | null;
  phone: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string;
  first_order_at: string;
};

export function useCustomers() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['customers'],
    queryFn: async (): Promise<Customer[]> => {
      const profileId = await getCreatorProfileId(supabase);

      // Primary: query by creator_id (fast path for new orders)
      let { data: orders, error } = await supabase
        .from('orders')
        .select('customer_email, customer_name, customer_phone, total_amount, created_at')
        .eq('creator_id' as any, profileId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fallback: find orders via products owned by this creator (handles null creator_id orders)
      if (!orders || orders.length === 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .eq('creator_id', profileId);

        const productIds = (products ?? []).map(p => p.id);
        if (productIds.length > 0) {
          const { data: items } = await (supabase as any)
            .from('order_items')
            .select('order_id')
            .in('product_id', productIds);

          const orderIds = [...new Set((items ?? []).map((i: any) => i.order_id))] as string[];
          if (orderIds.length > 0) {
            const { data: fallbackOrders, error: fbErr } = await supabase
              .from('orders')
              .select('customer_email, customer_name, customer_phone, total_amount, created_at')
              .in('id', orderIds)
              .eq('status', 'completed')
              .order('created_at', { ascending: false });

            if (!fbErr) orders = fallbackOrders;
          }
        }
      }

      // Aggregate by email
      const map = new Map<string, Customer>();
      for (const o of orders ?? []) {
        const email = o.customer_email?.toLowerCase();
        if (!email) continue;
        if (map.has(email)) {
          const c = map.get(email)!;
          c.total_orders += 1;
          c.total_spent += Number(o.total_amount) || 0;
          if (o.created_at < c.first_order_at) c.first_order_at = o.created_at;
          if (o.created_at > c.last_order_at) c.last_order_at = o.created_at;
        } else {
          map.set(email, {
            email,
            name: o.customer_name,
            phone: o.customer_phone,
            total_orders: 1,
            total_spent: Number(o.total_amount) || 0,
            last_order_at: o.created_at,
            first_order_at: o.created_at,
          });
        }
      }

      return Array.from(map.values()).sort((a, b) => b.total_spent - a.total_spent);
    },
  });
}
