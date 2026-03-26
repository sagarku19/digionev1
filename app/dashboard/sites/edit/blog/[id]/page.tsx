'use client';
// Edit page: Blog — visual editor with live preview.

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SiteVisualEditor from '@/components/dashboard/site-edit/SiteVisualEditor';
import { FileText, Globe, BookOpen, ChevronRight, ImageIcon } from 'lucide-react';

const INPUT = 'w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition shadow-sm';

export default function EditBlogPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerImage, setBannerImage] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: sb } = await supabase
        .from('site_blog')
        .select('title, description, banner_url')
        .eq('site_id', siteId)
        .maybeSingle();
      setTitle(sb?.title ?? '');
      setDescription(sb?.description ?? '');
      setBannerImage(sb?.banner_url ?? '');
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const handleTypeSave = async () => {
    const { data: existing } = await supabase.from('site_blog').select('site_id').eq('site_id', siteId).maybeSingle();
    const payload = { title, description, banner_url: bannerImage || null };
    if (existing) {
      await supabase.from('site_blog').update(payload).eq('site_id', siteId);
    } else {
      await supabase.from('site_blog').insert({ site_id: siteId, ...payload });
    }
  };

  return (
    <SiteVisualEditor
      siteId={siteId}
      typeLabel="Blog"
      typeIcon={FileText}
      typeIconColor="text-amber-500"
      onTypeSave={handleTypeSave}
      showSlug={false}
    >
      {() => (
        <div className="space-y-5">
          {/* Blog Info */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Blog Info</h3>
              <p className="text-xs text-gray-500 mt-0.5">Basic details about your blog</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Blog Name</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className={INPUT} placeholder="e.g. The Design Journal" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
                <span className={`text-xs tabular-nums ${description.length > 300 ? 'text-red-500' : 'text-gray-400'}`}>{description.length}/300</span>
              </div>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                className={`${INPUT} resize-none`}
                placeholder="What topics will you write about? Who is your audience?" />
            </div>
          </div>

          {/* Banner Image */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Banner Image</h3>
            </div>
            <input type="url" value={bannerImage} onChange={e => setBannerImage(e.target.value)}
              className={INPUT} placeholder="https://..." />
            {bannerImage && (
              <img src={bannerImage} alt="Banner preview" className="w-full h-32 rounded-xl object-cover border border-gray-200 dark:border-gray-700" />
            )}
          </div>

          {/* Blog URL */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Blog URL</h3>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-800/40">
              <Globe className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-sm font-mono text-amber-600 dark:text-amber-400 truncate">
                digione.in/blog/{siteId.substring(0, 8)}...
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Readers access your blog at this link. Individual posts get their own slugs.
            </p>
          </div>

          {/* Blog Posts Shortcut */}
          <button
            onClick={() => router.push(`/dashboard/sites/edit/blog/${siteId}/posts`)}
            className="w-full p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border-2 border-amber-200 dark:border-amber-800/50 text-left hover:shadow-lg hover:shadow-amber-500/5 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Blog Posts</p>
                <p className="text-xs text-gray-500 mt-0.5">Create, edit, and publish blog posts</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0" />
            </div>
          </button>
        </div>
      )}
    </SiteVisualEditor>
  );
}
