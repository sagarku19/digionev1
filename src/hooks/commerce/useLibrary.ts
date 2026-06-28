// Logged-in buyer's purchased products. Flattens orders → order_items → products
// and dedupes by product id. Download URLs are NOT stored on products — they are
// minted on demand via GET /api/deliverables/[productId] (signed R2 URLs).
// DB tables: orders, order_items, products (read only); auth.users (via supabase.auth)
// Query keys: ['library','list']
"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface PurchasedProduct {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  price_at_purchase: number;
  purchased_at: string;
}

type RawProduct = {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
};

type RawItem = {
  price_at_purchase: number;
  products: RawProduct | RawProduct[] | null;
};

export function useLibrary() {
  return useQuery({
    queryKey: ['library', 'list'] as const,
    queryFn: async (): Promise<PurchasedProduct[]> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            created_at,
            status,
            order_items (
              price_at_purchase,
              products (
                id, name, description, thumbnail_url, category
              )
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const flat: PurchasedProduct[] = [];
        for (const order of (data ?? []) as unknown as { id: string; created_at: string; order_items: RawItem[] | null }[]) {
          for (const item of order.order_items ?? []) {
            const p = Array.isArray(item.products) ? item.products[0] : item.products;
            if (!p) continue;
            flat.push({
              id: p.id,
              name: p.name,
              description: p.description,
              thumbnail_url: p.thumbnail_url,
              category: p.category,
              price_at_purchase: item.price_at_purchase,
              purchased_at: order.created_at,
            });
          }
        }

        const seen = new Set<string>();
        return flat.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
      } catch (err) {
        console.error('useLibrary error:', err);
        throw err;
      }
    },
  });
}
