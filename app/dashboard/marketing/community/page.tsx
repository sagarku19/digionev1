'use client';
// Community — real DB-backed posts with likes, category filter, compose, delete.
// DB: community_posts, community_reactions (tables from migration)

import React, { useState } from 'react';
import Link from 'next/link';
import { useCreator } from '@/hooks/useCreator';
import { useCommunity, type CommunityPost } from '@/hooks/useCommunity';
import {
  MessageCircle, Send, ThumbsUp, Pin, Share2,
  X, Loader2, AlertCircle, Zap, ChevronRight,
  ExternalLink, Trash2, TrendingUp,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['General', 'Tip', 'Milestone', 'Feedback', 'Event'];
const CATEGORY_STYLES: Record<string, string> = {
  Milestone: 'bg-[var(--success-bg)] text-[var(--success)]',
  Tip:       'bg-[var(--warning-bg)] text-[var(--warning)]',
  Feedback:  'bg-[var(--info-bg)] text-[var(--info)]',
  Event:     'bg-[var(--surface-muted)] text-[var(--brand)]',
  General:   'bg-[var(--surface-muted)] text-[var(--text-secondary)]',
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
    <div className={`${sz} rounded-full bg-[var(--brand)] flex items-center justify-center shrink-0 text-[var(--text-on-brand)] font-bold`}>
      {letter}
    </div>
  );
}

export default function CommunityPage() {
  const { profile } = useCreator();
  const {
    posts: serverPosts,
    creatorId: profileId,
    isLoading: loading,
    createPost,
    deletePost: deleteCommPost,
    toggleReaction,
  } = useCommunity();
  const [optimistic, setOptimistic] = useState<Record<string, { reaction_count: number; my_reaction: boolean }>>({});
  const posts: CommunityPost[] = serverPosts.map(p => optimistic[p.id]
    ? { ...p, ...optimistic[p.id] }
    : p
  );
  const [posting, setPosting]     = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [activeFilter, setActiveFilter] = useState('all');
  const [error, setError]         = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const userName   = profile?.full_name || 'Creator';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const avatarUrl  = (profile as any)?.avatar_url;

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !profileId) return;
    setPosting(true);
    try {
      await createPost({ content: newContent.trim(), category: newCategory });
      setNewContent('');
      setNewCategory('General');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (post: CommunityPost) => {
    if (!profileId) return;
    // Read the latest optimistic snapshot so rapid double-clicks toggle correctly
    // instead of both reading the same stale `post.my_reaction`.
    const cur = optimistic[post.id] ?? { reaction_count: post.reaction_count, my_reaction: post.my_reaction };
    const hadReacted = cur.my_reaction;
    setOptimistic(prev => ({
      ...prev,
      [post.id]: {
        my_reaction: !hadReacted,
        reaction_count: hadReacted ? cur.reaction_count - 1 : cur.reaction_count + 1,
      },
    }));
    try {
      await toggleReaction({ postId: post.id, hasReacted: hadReacted });
    } catch {
      // Roll back on error.
      setOptimistic(prev => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
    }
  };

  const deletePost = async (id: string) => {
    try {
      await deleteCommPost(id);
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = posts.filter(p =>
    activeFilter === 'all' || p.category.toLowerCase() === activeFilter
  );

  const myPosts    = posts.filter(p => p.creator_id === profileId);
  const totalLikes = posts.filter(p => p.creator_id === profileId).reduce((s, p) => s + p.reaction_count, 0);

  return (
    <div className="pb-16 pt-4 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Community</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Connect, share, and grow with fellow creators</p>
        </div>
        <Link href="/community" target="_blank"
          className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] px-4 py-2.5 rounded-[var(--radius-lg)] text-sm font-semibold hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          <ExternalLink className="w-4 h-4" /> Public page
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-[var(--warning-bg)] border border-[var(--warning)]/20 rounded-[var(--radius-lg)] text-sm text-[var(--warning)]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error.includes('does not exist') ? 'Community tables not yet created. Run the DB migration first.' : error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-4">

          {/* Compose */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
            <form onSubmit={handlePost}>
              <div className="flex gap-3">
                <Avatar name={userName} url={avatarUrl} />
                <div className="flex-1">
                  <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
                    placeholder="Share a tip, milestone, or ask the community…" rows={3}
                    className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-lg)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition resize-none" />
                  <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {CATEGORIES.map(cat => (
                        <button key={cat} type="button" onClick={() => setNewCategory(cat)}
                          className={`px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                            newCategory === cat ? 'bg-[var(--brand)] text-[var(--text-on-brand)]' : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                          }`}>{cat}</button>
                      ))}
                    </div>
                    <button type="submit" disabled={!newContent.trim() || posting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-tertiary)] text-[var(--text-on-brand)] rounded-[var(--radius-sm)] text-sm font-semibold transition shadow-[var(--shadow-xs)] disabled:shadow-none focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
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
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold capitalize whitespace-nowrap transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                  activeFilter === f
                    ? 'bg-[var(--brand)] text-[var(--text-on-brand)] shadow-[var(--shadow-xs)]'
                    : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-hover)]'
                }`}>{f === 'all' ? 'All Posts' : f}</button>
            ))}
          </div>

          {/* Feed */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)]">
              <MessageCircle className="w-10 h-10 text-[var(--text-tertiary)] mb-3" />
              <p className="font-semibold text-[var(--text-secondary)]">No posts yet</p>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">Be the first to share something with the community!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(post => (
                <div key={post.id}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 hover:border-[var(--border-strong)] transition group">
                  {post.is_pinned && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--warning)] font-medium mb-3">
                      <Pin className="w-3 h-3" /> Pinned
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Avatar name={post.profiles?.full_name ?? 'Creator'} url={post.profiles?.avatar_url} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {post.profiles?.full_name ?? 'Creator'}
                          {post.creator_id === profileId && <span className="ml-1 text-[10px] text-[var(--brand)] font-bold">You</span>}
                        </span>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${CATEGORY_STYLES[post.category] ?? CATEGORY_STYLES.General}`}>
                          {post.category}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)]">{timeAgo(post.created_at)}</span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3 whitespace-pre-line">{post.content}</p>
                      <div className="flex items-center gap-4">
                        <button onClick={() => toggleLike(post)}
                          className={`flex items-center gap-1.5 text-xs transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                            post.my_reaction ? 'text-[var(--brand)] font-semibold' : 'text-[var(--text-tertiary)] hover:text-[var(--brand)]'
                          }`}>
                          <ThumbsUp className={`w-3.5 h-3.5 ${post.my_reaction ? 'fill-current' : ''}`} />
                          {post.reaction_count > 0 ? post.reaction_count : ''}
                        </button>
                        <button className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        {post.creator_id === profileId && (
                          <button onClick={() => setDeleteTarget(post.id)} className="ml-auto flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--danger)] transition opacity-0 group-hover:opacity-100 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
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
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Your Stats</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Posts', value: myPosts.length },
                { label: 'Likes Received', value: totalLikes },
              ].map(s => (
                <div key={s.label} className="text-center p-3 bg-[var(--surface-muted)] rounded-[var(--radius-lg)]">
                  <p className="text-xl font-extrabold text-[var(--text-primary)]">{s.value}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Categories breakdown */}
          {posts.length > 0 && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[var(--brand)]" /> Post Breakdown
              </h3>
              <div className="space-y-2">
                {CATEGORIES.map(cat => {
                  const count = posts.filter(p => p.category === cat).length;
                  if (!count) return null;
                  const pct = Math.round((count / posts.length) * 100);
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[var(--text-secondary)] font-medium">{cat}</span>
                        <span className="text-[var(--text-tertiary)]">{count}</span>
                      </div>
                      <div className="h-1.5 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--brand)] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Quick Links</h3>
            <div className="space-y-1.5">
              {[
                { label: 'Community Guidelines', icon: MessageCircle },
                { label: 'How to earn points',   icon: Zap           },
                { label: 'Report an issue',       icon: AlertCircle   },
              ].map(link => (
                <button key={link.label}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-sm)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 max-w-sm w-full shadow-[var(--shadow-lg)]">
            <div className="w-12 h-12 rounded-full bg-[var(--danger-bg)] flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-[var(--danger)]" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] mb-1">Delete post?</h3>
            <p className="text-sm text-[var(--text-tertiary)] mb-5">This post and all its reactions will be permanently removed.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-[var(--border)] rounded-[var(--radius-lg)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Cancel</button>
              <button onClick={() => deletePost(deleteTarget)} className="flex-1 py-2.5 bg-[var(--danger)] hover:opacity-90 text-white rounded-[var(--radius-lg)] text-sm font-semibold transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
