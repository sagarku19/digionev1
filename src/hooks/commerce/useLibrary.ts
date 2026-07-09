// Logged-in buyer's purchased products. Single read model: user_product_access
// (RLS SELECT-own), joined to products for live thumbnail/category/description.
// Snapshot columns (product_name/product_price/product_link) + snapshot_metadata
// keep deleted or unpublished products accessible. Download URLs are NOT stored on
// products — they are minted on demand via GET /api/deliverables/[productId].
// DB tables: user_product_access, products (read only); auth.users (via supabase.auth)
// Query keys: ['library','list']
"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { buildAccessLinks, type AccessLink } from '@/lib/shared/access-links';

export interface PurchasedProduct {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  price_at_purchase: number;
  purchased_at: string;
  access_url: string | null;      // back-compat: first access link's url
  links: AccessLink[];            // all labelled post-purchase links
}

type JoinedProduct = {
  name: string | null;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  post_purchase_url: string | null;
  access_links: unknown;
};

type SnapshotMeta = { access_links?: unknown; post_purchase_url?: string | null };

type AccessRow = {
  product_id: string;
  product_name: string;
  product_price: number;
  product_link: string;
  created_at: string | null;
  snapshot_metadata: SnapshotMeta | null;
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
          product_id, product_name, product_price, product_link, created_at, snapshot_metadata,
          products ( name, description, thumbnail_url, category, post_purchase_url, access_links )
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
        const snap = row.snapshot_metadata ?? {};
        // Live product when present (published), else the immutable snapshot.
        const links = p
          ? buildAccessLinks({ postPurchaseUrl: p.post_purchase_url, accessLinks: p.access_links })
          : buildAccessLinks({ postPurchaseUrl: snap.post_purchase_url ?? row.product_link, accessLinks: snap.access_links });
        result.push({
          id: row.product_id,
          name: p?.name ?? row.product_name,
          description: p?.description ?? null,
          thumbnail_url: p?.thumbnail_url ?? null,
          category: p?.category ?? null,
          price_at_purchase: Number(row.product_price) || 0,
          purchased_at: row.created_at ?? '',
          access_url: links[0]?.url ?? null,
          links,
        });
      }
      return result;
    },
  });
}
