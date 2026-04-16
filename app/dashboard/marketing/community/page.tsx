'use client';
// Community — real DB-backed posts with likes, category filter, compose, delete.
// DB: community_posts, community_reactions (tables from migration)

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import { useCreator } from '@/hooks/useCreator';
import {
  MessageCircle, Send, ThumbsUp, Pin, Share2,
  X, Loader2, AlertCircle, Zap, ChevronRight,
  ExternalLink, Trash2, TrendingUp,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['General', 'Tip', 'Milestone', 'Feedback', 'Event'];
const CATEGORY_STYLES: Record<string, string> = {
  Milestone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Tip:       'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Feedback:  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Event:     'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  General:   'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
};

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Avatar({ name, url, size = 'md' }: { name: string; url?: string | null; size?: 'sm' | 'md' }) {
  const letter = name[0].toUpperCase();
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  if (url) return <img src={url} alt={name} className={`${sz} rounded-full object-cover shrink-0`} />;
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 text-white font-bold`}>
      {letter}
    </div>
  );
}

type Post = {
  id: string; content: string; category: string; is_pinned: boolean;
  created_at: string; creator_id: string;
  profiles?: { full_name: string; avatar_url: string | null };
  reaction_count: number; my_reaction: boolean;
};

export default function CommunityPage() {
  const supabase = createClient();
  const { profile } = useCreator();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [posting, setPosting]     = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [activeFilter, setActiveFilter] = useState('all');
  const [error, setError]         = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const userName   = profile?.full_name || 'Creator';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const avatarUrl  = (profile as any)?.avatar_url;

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const pid = await getCreatorProfileId(supabase);
      setProfileId(pid);

      // Load posts with author profile
      const { data: postsData, error: postsErr } = await (supabase as any)
        .from('community_posts')
        .select('*, profiles(full_name, avatar_url)')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsErr) throw postsErr;

      // Load my reactions
      const { data: myReactions } = await (supabase as any)
        .from('community_reactions')
        .select('post_id')
        .eq('creator_id', pid);

      const mySet = new Set((myReactions as any[])?.map((r: any) => r.post_id) ?? []);

      // Count reactions per post
      const { data: reactionCounts } = await (supabase as any)
        .from('community_reactions')
        .select('post_id');

      const countMap: Record<string, number> = {};
      (reactionCounts as any[])?.forEach((r: any) => { countMap[r.post_id] = (countMap[r.post_id] || 0) + 1; });

      setPosts((postsData ?? []).map((p: any) => ({
        ...p,
        reaction_count: countMap[p.id] || 0,
        my_reaction: mySet.has(p.id),
      })));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !profileId) return;
    setPosting(true);
    try {
      const { error } = await (supabase as any).from('community_posts').insert({
        creator_id: profileId,
        content: newContent.trim(),
        category: newCategory,
        is_pinned: false,
      });
      if (error) throw error;
      setNewContent('');
      setNewCategory('General');
      await loadPosts();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (post: Post) => {
    if (!profileId) return;
    if (post.my_reaction) {
      await (supabase as any).from('community_reactions').delete()
        .eq('post_id', post.id).eq('creator_id', profileId);
    } else {
      await (supabase as any).from('community_reactions').insert({
        post_id: post.id, creator_id: profileId, reaction: 'like',
      });
    }
    // Optimistic update
    setPosts(prev => prev.map(p => p.id === post.id ? {
      ...p,
      my_reaction: !p.my_reaction,
      reaction_count: p.my_reaction ? p.reaction_count - 1 : p.reaction_count + 1,
    } : p));
  };

  const deletePost = async (id: string) => {
    await (supabase as any).from('community_posts').delete().eq('id', id);
    setPosts(prev => prev.filter(p => p.id !== id));
    setDeleteTarget(null);
  };

  const filtered = posts.filter(p =>
    activeFilter === 'all' || p.category.toLowerCase() === activeFilter
  );

  const myPosts    = posts.filter(p => p.creator_id === profileId);
  const myLikes    = posts.reduce((s, p) => s + (p.my_reaction ? 0 : 0) + p.reaction_count, 0);
  const totalLikes = posts.filter(p => p.creator_id === profileId).reduce((s, p) => s + p.reaction_count, 0);

  return (
    <div className="pb-16 pt-4 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Community</h1>
          <p className="text-sm text-gray-500 mt-0.5">Connect, share, and grow with fellow creators</p>
        </div>
        <Link href="/community" target="_blank"
          className="flex items-center gap-2 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl text-sm font-semibold hover:border-indigo-400 transition">
          <ExternalLink className="w-4 h-4" /> Public page
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error.includes('does not exist') ? 'Community tables not yet created. Run the DB migration first.' : error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-4">

          {/* Compose */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <form onSubmit={handlePost}>
              <div className="flex gap-3">
                <Avatar name={userName} url={avatarUrl} />
                <div className="flex-1">
                  <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
                    placeholder="Share a tip, milestone, or ask the community…" rows={3}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition resize-none" />
                  <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {CATEGORIES.map(cat => (
                        <button key={cat} type="button" onClick={() => setNewCategory(cat)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            newCategory === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}>{cat}</button>
                      ))}
                    </div>
                    <button type="submit" disabled={!newContent.trim() || posting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white rounded-lg text-sm font-semibold transition shadow-sm disabled:shadow-none">
                      {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['all', ...CATEGORIES.map(c => c.toLowerCase())].map(f => (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition ${
                  activeFilter === f
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-[#0A0A1A] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}>{f === 'all' ? 'All Posts' : f}</button>
            ))}
          </div>

          {/* Feed */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl">
              <MessageCircle className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="font-semibold text-gray-700 dark:text-gray-300">No posts yet</p>
              <p className="text-sm text-gray-500 mt-1">Be the first to share something with the community!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(post => (
                <div key={post.id}
                  className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition group">
                  {post.is_pinned && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400 font-medium mb-3">
                      <Pin className="w-3 h-3" /> Pinned
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Avatar name={post.profiles?.full_name ?? 'Creator'} url={post.profiles?.avatar_url} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {post.profiles?.full_name ?? 'Creator'}
                          {post.creator_id === profileId && <span className="ml-1 text-[10px] text-indigo-500 font-bold">You</span>}
                        </span>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${CATEGORY_STYLES[post.category] ?? CATEGORY_STYLES.General}`}>
                          {post.category}
                        </span>
                        <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3 whitespace-pre-line">{post.content}</p>
                      <div className="flex items-center gap-4">
                        <button onClick={() => toggleLike(post)}
                          className={`flex items-center gap-1.5 text-xs transition ${
                            post.my_reaction ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                          }`}>
                          <ThumbsUp className={`w-3.5 h-3.5 ${post.my_reaction ? 'fill-current' : ''}`} />
                          {post.reaction_count > 0 ? post.reaction_count : ''}
                        </button>
                        <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        {post.creator_id === profileId && (
                          <button onClick={() => setDeleteTarget(post.id)} className="ml-auto flex items-center gap-1 text-xs text-gray-300 dark:text-gray-700 hover:text-red-500 dark:hover:text-red-400 transition opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* My stats */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Your Stats</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Posts', value: myPosts.length },
                { label: 'Likes Received', value: totalLikes },
              ].map(s => (
                <div key={s.label} className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white">{s.value}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Categories breakdown */}
          {posts.length > 0 && (
            <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-500" /> Post Breakdown
              </h3>
              <div className="space-y-2">
                {CATEGORIES.map(cat => {
                  const count = posts.filter(p => p.category === cat).length;
                  if (!count) return null;
                  const pct = Math.round((count / posts.length) * 100);
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{cat}</span>
                        <span className="text-gray-400">{count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Quick Links</h3>
            <div className="space-y-1.5">
              {[
                { label: 'Community Guidelines', icon: MessageCircle },
                { label: 'How to earn points',   icon: Zap           },
                { label: 'Report an issue',       icon: AlertCircle   },
              ].map(link => (
                <button key={link.label}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white transition">
                  <link.icon className="w-3.5 h-3.5" />
                  {link.label}
                  <ChevronRight className="w-3 h-3 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0D0E1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Delete post?</h3>
            <p className="text-sm text-gray-500 mb-5">This post and all its reactions will be permanently removed.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
              <button onClick={() => deletePost(deleteTarget)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
