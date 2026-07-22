// Community posts for the dashboard + the public community page.
// DB: community_posts (like_count denormalised counter); increment_community_post_like
// RPC powers anon likes on the public page. Query keys: ['community', ...].
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
  like_count: number;
  profiles?: { full_name: string; avatar_url: string | null };
};

type RawPost = CommunityPost;

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
        return { creatorId, posts: postsData ?? [] };
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

  const updatePost = useMutation({
    mutationFn: async ({ id, content, category }: { id: string; content: string; category: string }) => {
      const trimmed = content.trim();
      if (!trimmed) throw new Error('Post content is required.');
      const { error } = await supabase
        .from('community_posts')
        .update({ content: trimmed, category, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    posts: query.data?.posts ?? [],
    creatorId,
    isLoading: query.isLoading,
    createPost: createPost.mutateAsync,
    updatePost: updatePost.mutateAsync,
    deletePost: deletePost.mutateAsync,
  };
}

// ─── Community identity (public page at /community/[handle]) ───────────────────
// One community per creator: a public name + a unique url handle. Posts stay
// keyed on creator_id; this table only carries the shareable identity.

export type Social = { platform: string; url: string };

export type Community = {
  id: string;
  creator_id: string;
  name: string;
  username: string;
  bio: string | null;
  show_avatar: boolean;
  socials: Social[];
};

type CommunityRow = {
  id: string;
  creator_id: string;
  name: string;
  username: string;
  bio: string | null;
  show_avatar: boolean;
  socials: unknown;
};

function normSocials(v: unknown): Social[] {
  if (!Array.isArray(v)) return [];
  const out: Social[] = [];
  for (const item of v) {
    if (item && typeof item === 'object') {
      const rec = item as Record<string, unknown>;
      const platform = typeof rec.platform === 'string' ? rec.platform : '';
      const url = typeof rec.url === 'string' ? rec.url : '';
      if (platform && url) out.push({ platform, url });
    }
  }
  return out.slice(0, 4);
}

function toCommunity(r: CommunityRow): Community {
  return {
    id: r.id,
    creator_id: r.creator_id,
    name: r.name,
    username: r.username,
    bio: r.bio,
    show_avatar: r.show_avatar,
    socials: normSocials(r.socials),
  };
}

export type PublicCommunity = {
  community: Community | null;
  profile: { id: string; full_name: string | null; avatar_url: string | null };
  posts: CommunityPost[];
};

const COMMUNITY_SELECT = 'id, creator_id, name, username, bio, show_avatar, socials';
export const USERNAME_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function slugifyUsername(raw: string): string {
  let s = (raw || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  if (s.length < 3) s = s ? `${s}-creator` : 'creator';
  return s;
}

async function ensureCommunity(creatorId: string, fullName: string | null): Promise<Community> {
  const existing = await supabase
    .from('communities').select(COMMUNITY_SELECT).eq('creator_id', creatorId).maybeSingle();
  if (existing.data) return toCommunity(existing.data as CommunityRow);

  const base = slugifyUsername(fullName || 'creator');
  const name = fullName?.trim() || 'My Community';
  for (let attempt = 0; attempt < 6; attempt++) {
    const username = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from('communities')
      .insert({ creator_id: creatorId, name, username })
      .select(COMMUNITY_SELECT)
      .single();
    if (!error && data) return toCommunity(data as CommunityRow);
    if (error?.code === '23505') {
      // creator_id unique → a row already exists (concurrent create); re-read and return it.
      const { data: row } = await supabase
        .from('communities').select(COMMUNITY_SELECT).eq('creator_id', creatorId).maybeSingle();
      if (row) return toCommunity(row as CommunityRow);
      continue; // username collision → retry with a new suffix
    }
    if (error) throw error;
  }
  throw new Error('Could not create community');
}

export function useMyCommunity() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['community', 'mine'] as const,
    queryFn: async (): Promise<Community> => {
      const creatorId = await getCreatorProfileId();
      const { data: prof } = await supabase
        .from('profiles').select('full_name').eq('id', creatorId).maybeSingle();
      return ensureCommunity(creatorId, prof?.full_name ?? null);
    },
  });

  const updateCommunity = useMutation({
    mutationFn: async (payload: {
      name: string;
      username: string;
      bio: string;
      showAvatar: boolean;
      socials: Social[];
    }) => {
      const creatorId = await getCreatorProfileId();
      const name = payload.name.trim();
      const username = payload.username.trim().toLowerCase();
      if (!name) throw new Error('Community name is required.');
      if (!USERNAME_RE.test(username)) {
        throw new Error('Username must be 3–50 characters: lowercase letters, numbers and hyphens.');
      }
      const socials = payload.socials
        .map((s) => ({ platform: s.platform, url: s.url.trim() }))
        .filter((s) => s.platform && s.url)
        .slice(0, 4);
      const { error } = await supabase
        .from('communities')
        .update({
          name,
          username,
          bio: payload.bio.trim() || null,
          show_avatar: payload.showAvatar,
          socials,
          updated_at: new Date().toISOString(),
        })
        .eq('creator_id', creatorId);
      if (error) {
        if (error.code === '23505') throw new Error('That username is already taken.');
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community'] }),
  });

  return {
    community: query.data ?? null,
    isLoading: query.isLoading,
    updateCommunity: updateCommunity.mutateAsync,
    isUpdating: updateCommunity.isPending,
  };
}

// Public reader — resolves a handle that is EITHER a username or a creator profile id.
export function usePublicCommunity(handle: string | undefined) {
  return useQuery({
    queryKey: ['community', 'public', handle] as const,
    enabled: !!handle,
    queryFn: async (): Promise<PublicCommunity | null> => {
      const h = (handle ?? '').trim();
      if (!h) return null;

      let community: Community | null = null;
      let creatorId: string | null = null;

      if (UUID_RE.test(h)) {
        creatorId = h;
        const { data } = await supabase
          .from('communities').select(COMMUNITY_SELECT).eq('creator_id', h).maybeSingle();
        community = data ? toCommunity(data as CommunityRow) : null;
      } else {
        const { data } = await supabase
          .from('communities').select(COMMUNITY_SELECT).eq('username', h.toLowerCase()).maybeSingle();
        community = data ? toCommunity(data as CommunityRow) : null;
        creatorId = community?.creator_id ?? null;
      }
      if (!creatorId) return null;

      const { data: prof } = await supabase
        .from('profiles').select('id, full_name, avatar_url').eq('id', creatorId).maybeSingle();
      if (!prof) return null;

      const { data: postsData } = await supabase
        .from('community_posts')
        .select('*, profiles(full_name, avatar_url)')
        .eq('creator_id', creatorId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50)
        .returns<RawPost[]>();

      return { community, profile: prof as PublicCommunity['profile'], posts: postsData ?? [] };
    },
  });
}

// Public like — anon-safe RPC increment/decrement (client dedupes via localStorage).
export function useLikeCommunityPost() {
  return useMutation({
    mutationFn: async ({ postId, delta }: { postId: string; delta: 1 | -1 }) => {
      const { data, error } = await supabase.rpc('increment_community_post_like', {
        p_post_id: postId,
        p_delta: delta,
      });
      if (error) throw error;
      return (data as number) ?? 0;
    },
  });
}
