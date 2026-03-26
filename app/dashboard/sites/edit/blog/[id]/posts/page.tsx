'use client';
// Blog posts list for a site — creators can create, publish, and delete posts.
// DB tables: blog_posts (read/write via useBlogPosts), sites (read)

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import {
  FileText, Plus, X, Eye, EyeOff, Trash2, Edit3, ArrowLeft,
  Globe, Lock, Tag, Calendar, Search, BookOpen
} from 'lucide-react';

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function BlogPostsPage() {
  const params = useParams();
  const siteId = (params.id ?? params.siteId) as string;
  const router = useRouter();
  const { posts, isLoading, createPost, deletePost, updatePost, isCreating } = useBlogPosts(siteId);

  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isFree, setIsFree] = useState(true);

  const filtered = posts.filter((p: any) =>
    p.title?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const post = await createPost({
      site_id: siteId,
      title: newTitle.trim(),
      slug: slugify(newTitle.trim()),
      description: newDescription.trim() || null,
      is_published: false,
      is_free: isFree,
      content: '',
    });
    if (post) {
      setShowCreate(false);
      setNewTitle('');
      setNewDescription('');
      router.push(`/dashboard/sites/edit/blog/${siteId}/posts/${post.id}`);
    }
  };

  const togglePublish = async (post: any) => {
    await updatePost({ id: post.id, updates: { is_published: !post.is_published } });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog post permanently?')) return;
    await deletePost(id);
  };

  return (
    <div className="space-y-6 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/sites/edit/blog/${siteId}`)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blog Posts</h1>
            <p className="text-sm text-gray-500 mt-0.5">{posts.length} post{posts.length !== 1 ? 's' : ''} · Manage your content</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      {/* Search */}
      {posts.length > 3 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 animate-pulse h-24" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-5">
            <BookOpen className="w-10 h-10 text-indigo-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No posts yet</h2>
          <p className="text-gray-500 text-sm max-w-xs mb-6">Write your first blog post to attract and engage your audience.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Write first post
          </button>
        </div>
      )}

      {/* Posts list */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {filtered.map((post: any) => (
            <div key={post.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/40 group transition">
              {/* Thumbnail / Icon */}
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 flex items-center justify-center">
                {post.thumbnail_url
                  ? <img src={post.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  : <FileText className="w-5 h-5 text-indigo-400" />
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate max-w-xs">{post.title}</h3>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    post.is_published
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {post.is_published ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {post.is_published ? 'Published' : 'Draft'}
                  </span>
                  {!post.is_free && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 shrink-0">
                      <Lock className="w-3 h-3" /> Members only
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {post.tags?.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Tag className="w-3 h-3" />
                      {post.tags.slice(0, 3).join(', ')}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {post.view_count > 0 && (
                    <span className="text-xs text-gray-400">{post.view_count} views</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition shrink-0">
                <button
                  onClick={() => router.push(`/dashboard/sites/edit/blog/${siteId}/posts/${post.id}`)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => togglePublish(post)}
                  title={post.is_published ? 'Unpublish' : 'Publish'}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                >
                  {post.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No search results */}
      {!isLoading && posts.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500">No posts match &ldquo;{search}&rdquo;</p>
          <button onClick={() => setSearch('')} className="text-indigo-500 text-sm mt-2 hover:underline">Clear search</button>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D0D1F] rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Blog Post</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Post Title</label>
                <input
                  type="text" required autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. How I made ₹1L in 30 days"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400"
                />
                {newTitle && (
                  <p className="text-xs text-gray-400 mt-1">URL: /{slugify(newTitle)}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Short Description (optional)</label>
                <textarea
                  rows={2} value={newDescription} onChange={e => setNewDescription(e.target.value)}
                  placeholder="Brief summary shown in the blog index..."
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                />
              </div>
              {/* Access */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Free for everyone</p>
                  <p className="text-xs text-gray-500">Toggle off to make members-only</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isFree} onChange={e => setIsFree(e.target.checked)} />
                  <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-checked:bg-indigo-600 rounded-full transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
              <button
                type="submit" disabled={isCreating || !newTitle.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all"
              >
                {isCreating ? 'Creating…' : 'Create & Open Editor →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
