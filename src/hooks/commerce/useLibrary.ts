// Logged-in buyer's purchased products. Single read model: user_product_access
// (RLS SELECT-own), joined to products for live thumbnail/category/description.
// Snapshot columns (product_name/product_price/product_link) keep deleted or
// unpublished products accessible. Download URLs are NOT stored on products —
// they are minted on demand via GET /api/deliverables/[productId] (signed R2 URLs).
// DB tables: user_product_access, products (read only); auth.users (via supabase.auth)
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
  access_url: string | null;
}

type JoinedProduct = {
  name: string | null;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  post_purchase_url: string | null;
};

type AccessRow = {
  product_id: string;
  product_name: string;
  product_price: number;
  product_link: string;
  created_at: string | null;
  products: JoinedProduct | JoinedProduct[] | null;
};

export function useLibrary() {
  return useQuery({
    queryKey: ['library', 'list'] as const,
    queryFn: async (): Promise<PurchasedProduct[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_product_access')
        .select(`
          product_id, product_name, product_price, product_link, created_at,
          products ( name, description, thumbnail_url, category, post_purchase_url )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const seen = new Set<string>();
      const result: PurchasedProduct[] = [];
      // reason: the embedded relation is typed object-or-array by supabase-js; narrow once
      for (const row of (data ?? []) as unknown as AccessRow[]) {
        if (seen.has(row.product_id)) continue;
        seen.add(row.product_id);
        const p = Array.isArray(row.products) ? row.products[0] : row.products;
        result.push({
          id: row.product_id,
          name: p?.name ?? row.product_name,
          description: p?.description ?? null,
          thumbnail_url: p?.thumbnail_url ?? null,
          category: p?.category ?? null,
          price_at_purchase: Number(row.product_price) || 0,
          purchased_at: row.created_at ?? '',
          access_url: p?.post_purchase_url || row.product_link || null,
        });
      }
      return result;
    },
  });
}
