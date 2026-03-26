'use client';
// Blog post editor — full rich text editing with publish controls.
// DB tables: blog_posts (read/write via useBlogPosts)

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBlogPost, useBlogPosts } from '@/hooks/useBlogPosts';
import {
  ArrowLeft, Save, Globe, Lock, Eye, EyeOff, Tag, X,
  CheckCircle2, Image as ImageIcon, Bold, Italic, List,
  Heading2, Link as LinkIcon, Code, Quote, Loader2
} from 'lucide-react';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';

export default function BlogPostEditor() {
  const params = useParams();
  const siteId = (params.id ?? params.siteId) as string;
  const postId = params.postId as string;
  const router = useRouter();
  const { data: post, isLoading } = useBlogPost(postId);
  const { updatePost, isUpdating } = useBlogPosts(siteId);

  const [form, setForm] = useState<any>(null);
  const [tagInput, setTagInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'seo'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (post && !form) setForm(post);
  }, [post, form]);

  if (isLoading || !form) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm text-gray-500">Loading editor…</p>
      </div>
    );
  }

  const patch = (updates: any) => setForm((prev: any) => ({ ...prev, ...updates }));

  const handleSave = async () => {
    const { id, created_at, creator_id, ...updates } = form;
    await updatePost({ id: postId, updates });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;
    const tags = form.tags ?? [];
    if (!tags.includes(tag)) patch({ tags: [...tags, tag] });
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    patch({ tags: (form.tags ?? []).filter((t: string) => t !== tag) });
  };

  // Simple toolbar insert
  const insert = (before: string, after = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = form.content?.slice(start, end) || 'text';
    const newContent = (form.content || '').slice(0, start) + before + selected + after + (form.content || '').slice(end);
    patch({ content: newContent });
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + selected.length); }, 0);
  };

  return (
    <div className="pb-24">
      {/* Fixed header */}
      <div className="fixed top-16 left-0 md:left-[240px] right-0 z-20 px-4 md:px-6 py-3 bg-white/95 dark:bg-[#060612]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push(`/dashboard/sites/edit/blog/${siteId}/posts`)}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Blog Editor</p>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-xs">{form.title}</h1>
            </div>
            <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
              form.is_published
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {form.is_published ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {form.is_published ? 'Published' : 'Draft'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saveSuccess && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <button
              onClick={() => patch({ is_published: !form.is_published })}
              className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                form.is_published
                  ? 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  : 'border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100'
              }`}
            >
              {form.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {form.is_published ? 'Unpublish' : 'Publish'}
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Save className="w-4 h-4" />
              {isUpdating ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
      <div className="h-[57px]" />

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab toggle */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl w-fit">
            {(['write', 'seo'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition capitalize ${
                  activeTab === tab
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'write' ? 'Write' : 'SEO'}
              </button>
            ))}
          </div>

          {activeTab === 'write' && (
            <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-wrap">
                {[
                  { icon: Bold, action: () => insert('**', '**'), title: 'Bold' },
                  { icon: Italic, action: () => insert('_', '_'), title: 'Italic' },
                  { icon: Heading2, action: () => insert('## '), title: 'Heading' },
                  { icon: List, action: () => insert('- '), title: 'List' },
                  { icon: Quote, action: () => insert('> '), title: 'Quote' },
                  { icon: Code, action: () => insert('`', '`'), title: 'Code' },
                  { icon: LinkIcon, action: () => insert('[', '](url)'), title: 'Link' },
                ].map(({ icon: Icon, action, title }) => (
                  <button key={title} onClick={action} title={title}
                    className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition"
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>

              {/* Title input */}
              <div className="px-6 pt-5">
                <textarea
                  value={form.title || ''}
                  onChange={e => patch({ title: e.target.value })}
                  placeholder="Post title…"
                  rows={1}
                  className="w-full text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none resize-none placeholder-gray-300 dark:placeholder-gray-700"
                />
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                <textarea
                  ref={textareaRef}
                  value={form.content || ''}
                  onChange={e => patch({ content: e.target.value })}
                  placeholder="Start writing your post… (Markdown supported)"
                  rows={24}
                  className="w-full text-sm text-gray-800 dark:text-gray-200 bg-transparent border-none outline-none resize-none placeholder-gray-300 dark:placeholder-gray-700 leading-relaxed font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">SEO & Discoverability</h2>
                <p className="text-xs text-gray-500">How this post appears on Google and social media.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">SEO Title</label>
                <input type="text" value={form.title || ''} onChange={e => patch({ title: e.target.value })} className={INPUT} placeholder="Post title" />
                <p className="text-xs text-gray-400 mt-1">{(form.title || '').length}/60 chars</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Meta Description</label>
                <textarea rows={3} value={form.description || ''} onChange={e => patch({ description: e.target.value })} className={`${INPUT} resize-none`} placeholder="Brief summary for search engines (150–160 chars)" />
                <p className="text-xs text-gray-400 mt-1">{(form.description || '').length}/160 chars</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">URL Slug</label>
                <input type="text" value={form.slug || ''} onChange={e => patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} className={INPUT} placeholder="post-url-slug" />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar controls */}
        <div className="space-y-4">
          {/* Publish settings */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Post Settings</h3>

            {/* Publish toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Published</p>
                <p className="text-xs text-gray-500">Visible to readers</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={form.is_published || false} onChange={e => patch({ is_published: e.target.checked })} />
                <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-checked:bg-emerald-500 rounded-full transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>

            {/* Free toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Free for all</p>
                <p className="text-xs text-gray-500">Off = members only</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={form.is_free !== false} onChange={e => patch({ is_free: e.target.checked })} />
                <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-checked:bg-indigo-600 rounded-full transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Tags</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Add tag…"
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400"
              />
              <button onClick={addTag} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500 transition">
                <Tag className="w-4 h-4" />
              </button>
            </div>
            {(form.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(form.tags || []).map((tag: string) => (
                  <span key={tag} className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-medium px-2.5 py-1 rounded-full">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-red-500 transition">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail URL */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Cover Image</h3>
            {form.thumbnail_url && (
              <img src={form.thumbnail_url} alt="" className="w-full h-32 object-cover rounded-xl" />
            )}
            <input
              type="url"
              value={form.thumbnail_url || ''}
              onChange={e => patch({ thumbnail_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400"
            />
            <p className="text-xs text-gray-400">Paste image URL (upload coming soon)</p>
          </div>

          {/* Video embed */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Video (optional)</h3>
            <input
              type="url"
              value={form.video_embed_url || ''}
              onChange={e => patch({ video_embed_url: e.target.value })}
              placeholder="YouTube or Vimeo embed URL"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
