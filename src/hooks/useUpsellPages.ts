// Manages CRUD operations for creator's upsell pages.
// DB tables: upsell_pages (read/write), products (read for joins), users, profiles (read via getCreatorProfileId)
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export type UpsellPageRow = {
  id: string;
  creator_id: string;
  slug: string;
  title: string;
  primary_product_id: string;
  upsell_product_ids: string[];
  config: Record<string, any>;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // Joined product data (from query)
  primary_product?: { id: string; name: string; price: number; thumbnail_url: string | null };
};

function generateSlug(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base || 'upsell'}-${suffix}`;
}

export function useUpsellPages() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: upsellPages = [], isLoading, error } = useQuery({
    queryKey: ['upsell-pages'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as UpsellPageRow[];
      try {
        const profileId = await getCreatorProfileId(supabase);
        const { data, error } = await (supabase.from('upsell_pages' as any) as any)
          .select('*, primary_product:products!primary_product_id(id, name, price, thumbnail_url)')
          .eq('creator_id', profileId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []).map((row: any) => ({
          ...row,
          primary_product: Array.isArray(row.primary_product)
            ? row.primary_product[0]
            : row.primary_product,
        })) as UpsellPageRow[];
      } catch (err) {
        console.error('useUpsellPages fetch error:', err);
        throw err;
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: {
      title: string;
      primary_product_id: string;
      upsell_product_ids?: string[];
    }) => {
      try {
        const profileId = await getCreatorProfileId(supabase);
        const slug = generateSlug(input.title);
        const { data, error } = await (supabase.from('upsell_pages' as any) as any)
          .insert({
            creator_id: profileId,
            slug,
            title: input.title,
            primary_product_id: input.primary_product_id,
            upsell_product_ids: input.upsell_product_ids ?? [],
          })
          .select()
          .single();
        if (error) throw error;
        return data as UpsellPageRow;
      } catch (err) {
        console.error('useUpsellPages create error:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upsell-pages'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      try {
        const { data, error } = await (supabase.from('upsell_pages' as any) as any)
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as UpsellPageRow;
      } catch (err) {
        console.error('useUpsellPages update error:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['upsell-pages'] });
      if (data) queryClient.invalidateQueries({ queryKey: ['upsell-page', data.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await (supabase.from('upsell_pages' as any) as any)
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('useUpsellPages delete error:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upsell-pages'] });
    },
  });

  return {
    upsellPages,
    isLoading,
    error,
    createUpsellPage: createMutation.mutateAsync,
    updateUpsellPage: updateMutation.mutateAsync,
    deleteUpsellPage: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useUpsellPage(id: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['upsell-page', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase.from('upsell_pages' as any) as any)
        .select('*, primary_product:products!primary_product_id(id, name, price, thumbnail_url)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return {
        ...data,
        primary_product: Array.isArray(data.primary_product)
          ? data.primary_product[0]
          : data.primary_product,
      } as UpsellPageRow;
    },
  });
}
