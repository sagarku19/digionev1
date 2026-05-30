// Logged-in buyer's purchased products. Flattens orders → order_items → products
// and dedupes by product id.
// DB tables: orders, order_items, products (read only); auth.users (via supabase.auth)
//   Note: `file_url` is selected for backwards compatibility with the existing page UI
//   but the generated `products` row type doesn't list it; treat the joined product as
//   loose to avoid forcing a `(supabase as any)` cast at the query builder level.
// Query keys: ['library']
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
  file_url: string | null;
}

type RawProduct = {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  file_url?: string | null;
};

type RawItem = {
  price_at_purchase: number;
  products: RawProduct | RawProduct[] | null;
};

export function useLibrary() {
  return useQuery({
    queryKey: ['library'] as const,
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
                id, name, description, thumbnail_url, category, file_url
              )
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'paid')
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
              file_url: p.file_url ?? null,
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
