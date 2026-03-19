"use client";

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useLibrary() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['library'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // A buyer's library is essentially their successful orders containing products
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          order_items (
            product_id,
            products (
              id,
              title,
              slug,
              cover_image,
              _type,
              profiles!inner (
                full_name
              )
            )
          )
        `)
        .eq('buyer_id', user.id)
        .in('status', ['success', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Flatten items into a single library array
      const libraryItems = [];
      if (orders) {
        for (const order of orders) {
          for (const item of order.order_items) {
            if (item.products) {
              libraryItems.push({
                orderId: order.id,
                purchasedAt: order.created_at,
                product: item.products
              });
            }
          }
        }
      }

      return libraryItems;
    }
  });
}
