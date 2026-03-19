// Manages CRUD operations for a creator's products.
// DB tables: products (read/write), users, profiles (read via getCreatorProfileId)
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database.types';
import { revalidateStorefrontPaths } from '@/app/actions/revalidate';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

export function useProducts() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const profileId = await getCreatorProfileId(supabase);
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('creator_id', profileId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
      } catch (err) {
        console.error('useProducts fetch error:', err);
        throw err;
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newProduct: Omit<ProductInsert, 'creator_id'>) => {
      try {
        const profileId = await getCreatorProfileId(supabase);
        const { data, error } = await supabase
          .from('products')
          .insert({ ...newProduct, creator_id: profileId } as ProductInsert)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('useProducts create error:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: ProductUpdate }) => {
      try {
        const { data, error } = await supabase
          .from('products')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('useProducts update error:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['product', data.id] });
        revalidateStorefrontPaths(['/', '/dashboard/products']);
      }
    }
  });

  return {
    products,
    isLoading,
    error,
    createProduct: createMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
