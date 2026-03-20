"use client";
// Fetches unique buyers who purchased from the creator's sites.
// DB tables: orders, sites, profiles (read only)

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

      // Get all site IDs for this creator
      const { data: sites } = await supabase
        .from('sites')
        .select('id')
        .eq('creator_id', profileId);

      const siteIds = (sites ?? []).map(s => s.id);
      if (siteIds.length === 0) return [];

      // Fetch all successful orders with buyer info
      const { data: orders, error } = await supabase
        .from('orders')
        .select('customer_email, customer_name, customer_phone, total_amount, created_at, status')
        .in('origin_site_id', siteIds)
        .eq('status', 'success')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Aggregate by email
      const map = new Map<string, Customer>();
      for (const o of orders ?? []) {
        const email = o.customer_email?.toLowerCase();
        if (!email) continue;
        if (map.has(email)) {
          const c = map.get(email)!;
          c.total_orders += 1;
          c.total_spent += o.total_amount ?? 0;
          if (o.created_at < c.first_order_at) c.first_order_at = o.created_at;
        } else {
          map.set(email, {
            email,
            name: o.customer_name,
            phone: o.customer_phone,
            total_orders: 1,
            total_spent: o.total_amount ?? 0,
            last_order_at: o.created_at,
            first_order_at: o.created_at,
          });
        }
      }
      return Array.from(map.values()).sort((a, b) => b.total_spent - a.total_spent);
    }
  });
}
