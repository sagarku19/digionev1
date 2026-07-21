// Community posts + reactions for the dashboard. Loader aggregates per-post reaction count + my-reaction flag.
// DB tables: community_posts, community_reactions
// Query keys: ['community','posts'], invalidated on every mutation
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export type CommunityPost = {
  id: string;
  content: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
  creator_id: string;
  profiles?: { full_name: string; avatar_url: string | null };
  reaction_count: number;
  my_reaction: boolean;
};

type RawPost = Omit<CommunityPost, 'reaction_count' | 'my_reaction'>;
type RawReaction = { post_id: string; creator_id?: string };

export function useCommunity() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['community', 'posts'] as const,
    queryFn: async (): Promise<{ creatorId: string; posts: CommunityPost[] }> => {
      try {
        const creatorId = await getCreatorProfileId();

        const { data: postsData, error: postsErr } = await supabase
          .from('community_posts')
          .select('*, profiles(full_name, avatar_url)')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(50)
          .returns<RawPost[]>();
        if (postsErr) throw postsErr;

        const { data: myReactionRows } = await supabase
          .from('community_reactions')
          .select('post_id')
          .eq('creator_id', creatorId)
          .returns<RawReaction[]>();
        const mySet = new Set<string>((myReactionRows ?? []).map((r) => r.post_id));

        const { data: allReactionRows } = await supabase
          .from('community_reactions')
          .select('post_id')
          .returns<RawReaction[]>();
        const countMap: Record<string, number> = {};
        for (const r of (allReactionRows ?? [])) {
          countMap[r.post_id] = (countMap[r.post_id] || 0) + 1;
        }

        const posts: CommunityPost[] = (postsData ?? []).map((p) => ({
          ...p,
          reaction_count: countMap[p.id] || 0,
          my_reaction: mySet.has(p.id),
        }));

        return { creatorId, posts };
      } catch (err) {
        console.error('useCommunity error:', err);
        throw err;
      }
    },
  });

  const creatorId = query.data?.creatorId;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['community'] });

  const createPost = useMutation({
    mutationFn: async (payload: { content: string; category: string }) => {
      if (!creatorId) throw new Error('creator not loaded');
      const { error } = await supabase.from('community_posts').insert({
        creator_id: creatorId,
        content: payload.content,
        category: payload.category,
        is_pinned: false,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('community_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleReaction = useMutation({
    mutationFn: async ({ postId, hasReacted }: { postId: string; hasReacted: boolean }) => {
      if (!creatorId) throw new Error('creator not loaded');
      if (hasReacted) {
        const { error } = await supabase.from('community_reactions')
          .delete().eq('post_id', postId).eq('creator_id', creatorId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('community_reactions')
          .insert({ post_id: postId, creator_id: creatorId, reaction: 'like' });
        if (error) throw error;
      }
    },
    // No invalidate here — page does optimistic UI; reactions refresh on next load.
  });

  return {
    posts: query.data?.posts ?? [],
    creatorId,
    isLoading: query.isLoading,
    createPost: createPost.mutateAsync,
    deletePost: deletePost.mutateAsync,
    toggleReaction: toggleReaction.mutateAsync,
  };
}
