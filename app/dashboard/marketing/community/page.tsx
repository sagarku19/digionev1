'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users, MessageCircle, TrendingUp, Heart, Eye, Share2,
  PenLine, Image, Send, MoreHorizontal, Pin, Bookmark,
  Award, Zap, Bell, ChevronRight, ExternalLink,
  ThumbsUp, MessageSquare, Plus, Filter, ArrowRight,
} from 'lucide-react';
import { useCreator } from '@/hooks/useCreator';

// ── Types ───────────────────────────────────────────────────────
interface Post {
  id: number;
  content: string;
  author: string;
  avatar: string | null;
  time: string;
  likes: number;
  comments: number;
  views: number;
  pinned?: boolean;
  category: string;
}

// ── Sample Data ─────────────────────────────────────────────────
const SAMPLE_POSTS: Post[] = [
  {
    id: 1,
    content: 'Just crossed ₹1L in total revenue on DigiOne! Started with a simple Notion template pack 3 months ago. Consistency is key. Happy to answer any questions!',
    author: 'You',
    avatar: null,
    time: '2 hours ago',
    likes: 24,
    comments: 8,
    views: 156,
    pinned: true,
    category: 'Milestone',
  },
  {
    id: 2,
    content: 'Pro tip: Bundle your products together and offer a slight discount. My bundles convert 3x better than individual products. Try it!',
    author: 'Meera Joshi',
    avatar: null,
    time: '5 hours ago',
    likes: 45,
    comments: 12,
    views: 320,
    category: 'Tip',
  },
  {
    id: 3,
    content: 'Looking for feedback on my new course landing page. I switched from a long-form page to a minimal design. Thoughts? Link in my profile.',
    author: 'Aditya Kumar',
    avatar: null,
    time: '1 day ago',
    likes: 18,
    comments: 23,
    views: 210,
    category: 'Feedback',
  },
  {
    id: 4,
    content: 'The new analytics dashboard is amazing. Finally can see which traffic sources actually convert. Shoutout to the DigiOne team!',
    author: 'Sneha Patel',
    avatar: null,
    time: '1 day ago',
    likes: 67,
    comments: 5,
    views: 445,
    category: 'General',
  },
  {
    id: 5,
    content: 'Hosting a free workshop on "Building a profitable digital product in 30 days" next Saturday. DM me to get the link!',
    author: 'Rohit Menon',
    avatar: null,
    time: '2 days ago',
    likes: 89,
    comments: 31,
    views: 720,
    category: 'Event',
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Milestone: 'bg-emerald-500/10 text-emerald-400',
  Tip: 'bg-amber-500/10 text-amber-400',
  Feedback: 'bg-blue-500/10 text-blue-400',
  General: 'bg-slate-500/10 text-slate-400',
  Event: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
};

const LEADERBOARD = [
  { name: 'Priya Sharma', points: 2840, badge: 'Top Creator' },
  { name: 'Rahul Verma', points: 2350, badge: 'Rising Star' },
  { name: 'Ananya Reddy', points: 1920, badge: 'Helpful' },
  { name: 'Karthik Nair', points: 1680, badge: 'Active' },
  { name: 'Vikram Singh', points: 1450, badge: 'Contributor' },
];

export default function DashboardCommunityPage() {
  const { profile } = useCreator();
  const [newPost, setNewPost] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [posts] = useState<Post[]>(SAMPLE_POSTS);

  const userName = profile?.full_name || 'Creator';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const avatarUrl = (profile as any)?.avatar_url;

  const filteredPosts = activeFilter === 'all' ? posts : posts.filter(p => p.category.toLowerCase() === activeFilter);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#07070f]">
      {/* Page Header */}
      <div className="border-b border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#07070f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Community</h1>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-md">
                  New
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Connect, share, and grow with fellow creators</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/community"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Public page
              </Link>
              <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all">
                <Bell className="w-3.5 h-3.5" />
                Notifications
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-5">

            {/* Compose */}
            <div className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-5">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-sm font-bold">{userInitials}</span>
                  )}
                </div>
                <div className="flex-1">
                  <textarea
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                    placeholder="Share something with the community..."
                    rows={3}
                    className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20 transition-all resize-none"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 dark:text-slate-500 hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-tertiary)] rounded-lg transition-all">
                        <Image className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 dark:text-slate-500 hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-tertiary)] rounded-lg transition-all">
                        <PenLine className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      disabled={!newPost.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white rounded-lg text-sm font-semibold transition-all shadow-sm disabled:shadow-none"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {['all', 'milestone', 'tip', 'feedback', 'event', 'general'].map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all ${
                    activeFilter === f
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm'
                      : 'bg-white dark:bg-white/[0.03] text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  {f === 'all' ? 'All Posts' : f}
                </button>
              ))}
            </div>

            {/* Posts Feed */}
            <div className="space-y-4">
              {filteredPosts.map(post => (
                <div
                  key={post.id}
                  className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-5 hover:border-gray-300 dark:hover:border-white/10 transition-all"
                >
                  {post.pinned && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400 font-medium mb-3">
                      <Pin className="w-3 h-3" />
                      Pinned post
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">{post.author.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{post.author}</span>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${CATEGORY_COLORS[post.category] || CATEGORY_COLORS.General}`}>
                          {post.category}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-slate-600">{post.time}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed mb-3">{post.content}</p>
                      <div className="flex items-center gap-5">
                        <button className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-secondary)] transition-colors">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {post.likes}
                        </button>
                        <button className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-secondary)] transition-colors">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {post.comments}
                        </button>
                        <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500">
                          <Eye className="w-3.5 h-3.5" />
                          {post.views}
                        </span>
                        <button className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-secondary)] transition-colors ml-auto">
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                        <button className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-secondary)] transition-colors">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-5">

            {/* Your Stats */}
            <div className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Your Community Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl">
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white">12</p>
                  <p className="text-[10px] text-gray-500 dark:text-slate-500 uppercase tracking-wider mt-0.5">Posts</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl">
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white">89</p>
                  <p className="text-[10px] text-gray-500 dark:text-slate-500 uppercase tracking-wider mt-0.5">Likes</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl">
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white">34</p>
                  <p className="text-[10px] text-gray-500 dark:text-slate-500 uppercase tracking-wider mt-0.5">Comments</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl">
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white">#42</p>
                  <p className="text-[10px] text-gray-500 dark:text-slate-500 uppercase tracking-wider mt-0.5">Rank</p>
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  Leaderboard
                </h3>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider">This month</span>
              </div>
              <div className="space-y-2.5">
                {LEADERBOARD.map((user, i) => (
                  <div key={user.name} className="flex items-center gap-3 py-1.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      i === 0 ? 'bg-amber-500/10 text-amber-400' :
                      i === 1 ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400' :
                      i === 2 ? 'bg-orange-500/10 text-orange-400' :
                      'bg-gray-100 dark:bg-white/[0.04] text-gray-400 dark:text-slate-500'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
                      <span className="text-white text-[9px] font-bold">{user.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500">{user.points} pts</p>
                    </div>
                    <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded ${
                      i === 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-100 dark:bg-white/[0.04] text-gray-400 dark:text-slate-500'
                    }`}>
                      {user.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Quick Links</h3>
              <div className="space-y-1.5">
                {[
                  { label: 'Community Guidelines', icon: MessageCircle },
                  { label: 'How to earn points', icon: Zap },
                  { label: 'Report an issue', icon: MoreHorizontal },
                ].map(link => (
                  <button
                    key={link.label}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white transition-all"
                  >
                    <link.icon className="w-3.5 h-3.5" />
                    {link.label}
                    <ChevronRight className="w-3 h-3 ml-auto" />
                  </button>
                ))}
              </div>
            </div>

            {/* Invite CTA */}
            <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-2xl p-5 text-center">
              <Users className="w-8 h-8 text-[var(--text-secondary)] dark:text-[var(--text-secondary)] mx-auto mb-2" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Invite Creators</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                Earn bonus points for every creator you invite!
              </p>
              <button className="w-full py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-lg text-xs font-semibold transition-all shadow-sm">
                Copy Invite Link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
