// Wraps the /api/discover/[id] route. Buyers and visitors only — read-only.
// Query keys: ['discover','product', productId]
"use client";

import { useQuery } from '@tanstack/react-query';

export interface DiscoverCreator {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export interface DiscoverProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  thumbnail_url: string | null;
  images: unknown;
  content: unknown;
  creator_id: string;
  product_link: string | null;
  post_purchase_instructions: string | null;
  created_at: string | null;
  profiles: DiscoverCreator | DiscoverCreator[] | null;
}

export interface DiscoverRelatedProduct {
  id: string;
  name: string;
  price: number;
  category: string | null;
  thumbnail_url: string | null;
  creator_id: string;
  profiles?: DiscoverCreator | DiscoverCreator[] | null;
}

interface DiscoverResponse {
  product: DiscoverProduct | null;
  related?: DiscoverRelatedProduct[];
  creatorProducts?: DiscoverRelatedProduct[];
  error?: string;
}

export function useDiscoverProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ['discover', 'product', productId ?? null] as const,
    enabled: !!productId,
    queryFn: async (): Promise<{
      product: DiscoverProduct | null;
      related: DiscoverRelatedProduct[];
      creatorProducts: DiscoverRelatedProduct[];
    }> => {
      const res = await fetch(`/api/discover/${productId}`);
      const json: DiscoverResponse = await res.json();
      if (json.error) throw new Error(json.error);
      return {
        product: json.product,
        related: json.related ?? [],
        creatorProducts: json.creatorProducts ?? [],
      };
    },
  });
}
