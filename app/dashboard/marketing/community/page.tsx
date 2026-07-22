'use client';
// Community — DB-backed posts (compose, edit, delete, category filter). Likes are
// collected on the public community page; here we show read-only like counts.
// DB: community_posts (like_count). Query keys: ['community', ...]

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { GuideButton } from '@/components/dashboard/guides/GuideButton';
import { useCreator } from '@/hooks/creator/useCreator';
import { useCommunity, useMyCommunity, type CommunityPost, type Social } from '@/hooks/marketing/useCommunity';
import {
  MessageCircle, Send, ThumbsUp, Pin,
  Loader2, AlertCircle,
  ExternalLink, Trash2, TrendingUp, Pencil, X,
  Image as ImageIcon, UserRound, Plus,
  Instagram, Youtube, Twitter, Facebook, Linkedin, Github, Globe, Link2,
  type LucideIcon,
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

const INPUT_BASE = 'px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow';
const INPUT = `w-full ${INPUT_BASE}`;

const SOCIAL_PLATFORMS = ['instagram', 'youtube', 'twitter', 'facebook', 'linkedin', 'github', 'website'] as const;
const MAX_SOCIALS = 4;

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  instagram: Instagram, youtube: Youtube, twitter: Twitter, x: Twitter,
  facebook: Facebook, linkedin: Linkedin, github: Github, website: Globe,
};
const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram', youtube: 'YouTube', twitter: 'Twitter', x: 'X',
  facebook: 'Facebook', linkedin: 'LinkedIn', github: 'GitHub', website: 'Website',
};
const normalizeUrl = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

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
  // eslint-disable-next-line @next/next/no-img-element
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
    posts,
    creatorId: profileId,
    isLoading: loading,
    createPost,
    updatePost,
    deletePost: deleteCommPost,
  } = useCommunity();
  const { community, updateCommunity, isUpdating } = useMyCommunity();
  const [posting, setPosting]     = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [activeFilter, setActiveFilter] = useState('all');
  const [error, setError]         = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingCommunity, setEditingCommunity] = useState(false);
  const [cName, setCName]         = useState('');
  const [cUsername, setCUsername] = useState('');
  const [cBio, setCBio]           = useState('');
  const [cShowAvatar, setCShowAvatar] = useState(true);
  const [cSocials, setCSocials]   = useState<Social[]>([]);
  const [cError, setCError]       = useState('');
  const [editPost, setEditPost]   = useState<CommunityPost | null>(null);
  const [epContent, setEpContent] = useState('');
  const [epCategory, setEpCategory] = useState('General');
  const [epSaving, setEpSaving]   = useState(false);
  const [epError, setEpError]     = useState('');

  const userName   = profile?.full_name || 'Creator';
  const avatarUrl  = profile?.avatar_url;

  const openEditCommunity = () => {
    if (!community) return;
    setCName(community.name);
    setCUsername(community.username);
    setCBio(community.bio ?? '');
    setCShowAvatar(community.show_avatar);
    setCSocials(community.socials);
    setCError('');
    setEditingCommunity(true);
  };

  const addSocial = () => setCSocials(prev => prev.length >= MAX_SOCIALS ? prev : [...prev, { platform: 'instagram', url: '' }]);
  const updateSocial = (i: number, patch: Partial<Social>) => setCSocials(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const removeSocial = (i: number) => setCSocials(prev => prev.filter((_, idx) => idx !== i));

  const saveCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCError('');
    try {
      await updateCommunity({ name: cName, username: cUsername, bio: cBio, showAvatar: cShowAvatar, socials: cSocials });
      setEditingCommunity(false);
    } catch (err) {
      setCError(err instanceof Error ? err.message : 'Failed to save.');
    }
  };

  const openEditPost = (post: CommunityPost) => {
    setEditPost(post);
    setEpContent(post.content);
    setEpCategory(post.category);
    setEpError('');
  };

  const saveEditPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPost || !epContent.trim()) return;
    setEpSaving(true);
    setEpError('');
    try {
      await updatePost({ id: editPost.id, content: epContent, category: epCategory });
      setEditPost(null);
    } catch (err) {
      setEpError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setEpSaving(false);
    }
  };

  // Lock background scroll while any modal is open.
  useEffect(() => {
    if (!editingCommunity && !deleteTarget && !editPost) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [editingCommunity, deleteTarget, editPost]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !profileId) return;
    setPosting(true);
    try {
      await createPost({ content: newContent.trim(), category: newCategory });
      setNewContent('');
      setNewCategory('General');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post.');
    } finally {
      setPosting(false);
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
  const totalLikes = posts.filter(p => p.creator_id === profileId).reduce((s, p) => s + p.like_count, 0);

  return (
    <div className="pb-16 pt-4 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Community</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Connect, share, and grow with fellow creators</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <GuideButton guideKey="community" />
          <button onClick={openEditCommunity} disabled={!community}
            className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] px-4 py-2.5 rounded-[var(--radius-lg)] text-sm font-semibold hover:bg-[var(--surface-hover)] transition disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            <Pencil className="w-4 h-4" /> Edit
          </button>
          {community ? (
            <Link href={`/community/${community.username}`} target="_blank"
              className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] px-4 py-2.5 rounded-[var(--radius-lg)] text-sm font-semibold hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
              <ExternalLink className="w-4 h-4" /> My community page
            </Link>
          ) : (
            <span aria-disabled="true"
              className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-tertiary)] px-4 py-2.5 rounded-[var(--radius-lg)] text-sm font-semibold opacity-50 cursor-not-allowed">
              <ExternalLink className="w-4 h-4" /> My community page
            </span>
          )}
        </div>
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
                    <Link href={`/community/${post.creator_id}`} target="_blank"
                      className="shrink-0 rounded-full focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                      <Avatar name={post.profiles?.full_name ?? 'Creator'} url={post.profiles?.avatar_url} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link href={`/community/${post.creator_id}`} target="_blank"
                          className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--brand)] transition rounded focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                          {post.profiles?.full_name ?? 'Creator'}
                        </Link>
                        {post.creator_id === profileId && <span className="text-[10px] text-[var(--brand)] font-bold">You</span>}
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${CATEGORY_STYLES[post.category] ?? CATEGORY_STYLES.General}`}>
                          {post.category}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)]">{timeAgo(post.created_at)}</span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3 whitespace-pre-line">{post.content}</p>
                      <div className="flex items-center gap-3 min-h-[20px]">
                        {post.like_count > 0 && (
                          <span className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                            <ThumbsUp className="w-3.5 h-3.5" /> {post.like_count}
                          </span>
                        )}
                        {post.creator_id === profileId && (
                          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => openEditPost(post)} aria-label="Edit post"
                              className="flex items-center p-1 rounded text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteTarget(post.id)} aria-label="Delete post"
                              className="flex items-center p-1 rounded text-xs text-[var(--text-tertiary)] hover:text-[var(--danger)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

          {/* My community page preview */}
          {community && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">My community page</h3>
                <button onClick={openEditCommunity} aria-label="Edit community"
                  className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                {community.show_avatar ? (
                  <Avatar name={community.name} url={avatarUrl} />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--text-primary)] flex items-center justify-center shrink-0">
                    <UserRound className="w-5 h-5 text-[var(--bg-primary)]" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">{community.name}</p>
                  <p className="text-xs font-medium text-[var(--brand)] truncate">@{community.username}</p>
                </div>
              </div>
              {community.bio && (
                <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-line line-clamp-3">{community.bio}</p>
              )}
              {community.socials.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {community.socials.map((s, i) => {
                    const Icon = SOCIAL_ICONS[s.platform.toLowerCase()] ?? Link2;
                    return (
                      <a key={i} href={normalizeUrl(s.url)} target="_blank" rel="noopener noreferrer" title={s.platform}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                        <Icon className="w-3 h-3" /> {SOCIAL_LABELS[s.platform.toLowerCase()] ?? s.platform}
                      </a>
                    );
                  })}
                </div>
              )}
              <Link href={`/community/${community.username}`} target="_blank"
                className="mt-4 flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <ExternalLink className="w-3.5 h-3.5" /> View public page
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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

      {/* Edit post */}
      {editPost && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 max-w-md w-full shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[var(--text-primary)]">Edit post</h3>
              <button onClick={() => setEditPost(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition rounded focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={saveEditPost} className="space-y-4">
              <textarea value={epContent} onChange={e => setEpContent(e.target.value)} rows={4} autoFocus
                placeholder="Share a tip, milestone, or ask the community…" className={`${INPUT} resize-none`} />
              <div className="flex items-center gap-1.5 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button key={cat} type="button" onClick={() => setEpCategory(cat)}
                    className={`px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                      epCategory === cat ? 'bg-[var(--brand)] text-[var(--text-on-brand)]' : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                    }`}>{cat}</button>
                ))}
              </div>
              {epError && <p className="text-xs text-[var(--danger)]">{epError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditPost(null)} className="flex-1 py-2.5 border border-[var(--border)] rounded-[var(--radius-lg)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Cancel</button>
                <button type="submit" disabled={epSaving || !epContent.trim()} className="flex-1 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-60 text-[var(--text-on-brand)] rounded-[var(--radius-lg)] text-sm font-semibold transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  {epSaving && <Loader2 className="w-4 h-4 animate-spin" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit community */}
      {editingCommunity && community && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[var(--text-primary)]">Edit community</h3>
              <button onClick={() => setEditingCommunity(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition rounded focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={saveCommunity} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Community name</label>
                <input value={cName} onChange={e => setCName(e.target.value)} placeholder="My Community" maxLength={80} className={INPUT} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Username</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-[var(--text-tertiary)] shrink-0">/community/</span>
                  <input value={cUsername} onChange={e => setCUsername(e.target.value.toLowerCase())} placeholder="my-community" maxLength={50} className={`${INPUT_BASE} min-w-0 flex-1`} />
                </div>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">Lowercase letters, numbers and hyphens. 3–50 characters.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Profile display</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setCShowAvatar(true)}
                    className={`flex items-center justify-center gap-2 py-2 rounded-[var(--radius-md)] text-sm font-medium border transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${cShowAvatar ? 'border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>
                    <ImageIcon className="w-4 h-4" /> Profile image
                  </button>
                  <button type="button" onClick={() => setCShowAvatar(false)}
                    className={`flex items-center justify-center gap-2 py-2 rounded-[var(--radius-md)] text-sm font-medium border transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${!cShowAvatar ? 'border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>
                    <UserRound className="w-4 h-4" /> Icon
                  </button>
                </div>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">Show your uploaded avatar, or a generic profile icon.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Bio</label>
                <textarea value={cBio} onChange={e => setCBio(e.target.value)} rows={3} maxLength={280}
                  placeholder="Tell visitors what your community is about…" className={`${INPUT} resize-none`} />
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">{cBio.length}/280</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-[var(--text-primary)]">Social links</label>
                  <span className="text-xs text-[var(--text-tertiary)]">{cSocials.length}/{MAX_SOCIALS}</span>
                </div>
                <div className="space-y-2">
                  {cSocials.map((s, i) => (
                    <div key={i} className="flex w-full min-w-0 items-center gap-2">
                      <select value={s.platform} onChange={e => updateSocial(i, { platform: e.target.value })}
                        className={`${INPUT_BASE} w-[118px] shrink-0 capitalize`}>
                        {SOCIAL_PLATFORMS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                      </select>
                      <input value={s.url} onChange={e => updateSocial(i, { url: e.target.value })} placeholder="https://…" className={`${INPUT_BASE} min-w-0 flex-1`} />
                      <button type="button" onClick={() => removeSocial(i)} aria-label="Remove link"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {cSocials.length < MAX_SOCIALS ? (
                  <button type="button" onClick={addSocial}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                    <Plus className="w-4 h-4" /> Add link
                  </button>
                ) : (
                  <p className="mt-2 text-xs text-[var(--text-tertiary)]">Maximum {MAX_SOCIALS} links reached.</p>
                )}
              </div>

              {cError && <p className="text-xs text-[var(--danger)]">{cError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditingCommunity(false)} className="flex-1 py-2.5 border border-[var(--border)] rounded-[var(--radius-lg)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Cancel</button>
                <button type="submit" disabled={isUpdating} className="flex-1 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-60 text-[var(--text-on-brand)] rounded-[var(--radius-lg)] text-sm font-semibold transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
