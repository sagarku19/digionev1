"use client";
// Hook for CRUD operations on blog_posts for a given site.
// DB tables: blog_posts (read/write), profiles (read via getCreatorProfileId)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database.types';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

type BlogPost = Database['public']['Tables']['blog_posts']['Row'];
type BlogPostInsert = Database['public']['Tables']['blog_posts']['Insert'];
type BlogPostUpdate = Database['public']['Tables']['blog_posts']['Update'];

export function useBlogPosts(siteId?: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ['blog-posts', siteId],
    enabled: !!siteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('site_id', siteId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (post: Omit<BlogPostInsert, 'creator_id'>) => {
      const profileId = await getCreatorProfileId(supabase);
      const { data, error } = await supabase
        .from('blog_posts')
        .insert({ ...post, creator_id: profileId } as BlogPostInsert)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts', siteId] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: BlogPostUpdate }) => {
      const { data, error } = await supabase
        .from('blog_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts', siteId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts', siteId] });
    }
  });

  return {
    posts,
    isLoading,
    error,
    createPost: createMutation.mutateAsync,
    updatePost: updateMutation.mutateAsync,
    deletePost: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook for single post by id
export function useBlogPost(postId?: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['blog-post', postId],
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId!)
        .single();
      if (error) throw error;
      return data;
    }
  });
}
