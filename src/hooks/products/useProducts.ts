// Manages CRUD operations for a creator's products.
// DB tables: products (read/write), users, profiles (read via getCreatorProfileId)
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database.types';
import { revalidateStorefrontPaths } from '@/app/actions/revalidate';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

export function useProducts() {
  const queryClient = useQueryClient();

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products', 'list'],
    queryFn: async () => {
      try {
        const profileId = await getCreatorProfileId();
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('creator_id', profileId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
      } catch (err) {
        console.error('useProducts fetch error:', err);
        throw err;
      }
    }
  });

  const { data: trashedProducts = [], isLoading: isLoadingTrash } = useQuery({
    queryKey: ['products', 'trash'],
    queryFn: async () => {
      const profileId = await getCreatorProfileId();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('creator_id', profileId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newProduct: Omit<ProductInsert, 'creator_id'>) => {
      try {
        const profileId = await getCreatorProfileId();
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
        queryClient.invalidateQueries({ queryKey: ['products', 'detail', data.id] });
        revalidateStorefrontPaths(['/', '/dashboard/products']);
      }
    }
  });

  // Soft delete: keep the row (orders/records reference it) but hide it everywhere.
  // Storefront reads filter on `deleted_at IS NULL` + `is_published`.
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString(), is_published: false })
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      revalidateStorefrontPaths(['/', '/dashboard/products']);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: null })
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      revalidateStorefrontPaths(['/', '/dashboard/products']);
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const profileId = await getCreatorProfileId();

      // Guard: never destroy a product someone has already bought — its row,
      // user_product_access grants, and deliverable files must survive.
      const { count, error: countError } = await supabase
        .from('order_items')
        .select('orders!inner(creator_id, status)', { count: 'exact', head: true })
        .eq('product_id', id)
        .eq('orders.creator_id', profileId)
        .eq('orders.status', 'completed');
      if (countError) throw countError;
      if ((count ?? 0) > 0) {
        throw new Error(
          `${count} customer${count === 1 ? '' : 's'} own this product, so it can't be permanently deleted. It stays archived in Trash so their downloads keep working.`,
        );
      }

      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        if (error.code === '23503') {
          throw new Error('This product powers a Product Site. Detach or delete that Product Site first, then try again.');
        }
        throw error;
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      revalidateStorefrontPaths(['/', '/dashboard/products']);
    },
  });

  return {
    products,
    trashedProducts,
    isLoading,
    isLoadingTrash,
    error,
    createProduct: createMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync,
    deleteProduct: deleteMutation.mutateAsync,
    restoreProduct: restoreMutation.mutateAsync,
    permanentlyDeleteProduct: permanentDeleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRestoring: restoreMutation.isPending,
    isPermanentlyDeleting: permanentDeleteMutation.isPending,
  };
}
